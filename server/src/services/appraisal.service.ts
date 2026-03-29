import prisma from '../prisma/client';
import { logAction } from './audit.service';
import { notify } from './websocket.service';

/**
 * Appraisal stages in sequential order
 */
const APPRAISAL_STAGES = [
  'SELF_REVIEW',
  'MANAGER_REVIEW'
];

export class AppraisalService {
  /**
   * Initialize a new Appraisal Cycle and generate packets for employees
   */
  static async initCycle(organizationId: string, data: any) {
    let { title, period, startDate, endDate, employeeIds, cycleId } = data;

    // If cycleId provided, look up the cycle from the Cycle table and create an AppraisalCycle from it
    let cycle: any;
    if (cycleId) {
      const existingCycle = await prisma.cycle.findFirst({ where: { id: cycleId, organizationId } });
      if (!existingCycle) throw new Error('Cycle not found');
      title = title || existingCycle.name;
      period = period || `${new Date(existingCycle.startDate).getFullYear()}`;
      startDate = startDate || existingCycle.startDate;
      endDate = endDate || existingCycle.endDate;
    }

    if (!title) throw new Error('title is required');
    if (!startDate || !endDate) throw new Error('startDate and endDate are required');

    // Check if an appraisal cycle already exists for this period
    cycle = await (prisma as any).appraisalCycle.findFirst({
      where: { organizationId, title, status: { not: 'ARCHIVED' } }
    });

    if (!cycle) {
      cycle = await (prisma as any).appraisalCycle.create({
        data: {
          organizationId,
          title,
          period: String(period || new Date().getFullYear()),
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          status: 'ACTIVE'
        }
      });
    }

    // If employeeIds is provided but empty, we select ALL eligible employees
    const employeeFilter = (employeeIds && employeeIds.length > 0) 
      ? { id: { in: employeeIds } } 
      : {};

    const employees = await prisma.user.findMany({
      where: {
        organizationId,
        isArchived: false,
        role: { notIn: ['DEV', 'MD'] }, // MD and DEV don't receive appraisal packets
        ...employeeFilter
      },
      include: {
        supervisor: true,
        departmentObj: { include: { manager: true } },
        managedReportingLines: {
           where: { type: 'DOTTED', effectiveTo: null },
           take: 1
        }
      }
    });

    let packetCount = 0;
    for (const emp of employees) {
      // Check if packet already exists for this employee in this cycle to avoid duplicates
      const existingPacket = await (prisma as any).appraisalPacket.findFirst({
        where: { cycleId: cycle.id, employeeId: emp.id }
      });
      if (existingPacket) continue;

      // Resolve reviewers for the packet cache
      const supervisorId = emp.supervisorId;
      const matrixSupervisorId = (emp as any).managedReportingLines?.[0]?.managerId || null;
      const managerId = emp.departmentObj?.managerId || null;
      
      const hrReviewerId = (await prisma.user.findFirst({ 
        where: { organizationId, role: { in: ['DIRECTOR', 'MD', 'HR'] }, id: { not: emp.id }, isArchived: false },
        orderBy: { role: 'asc' } 
      }))?.id || null;
      const finalReviewerId = (await prisma.user.findFirst({ 
        where: { organizationId, role: { in: ['MD', 'DEV'] }, id: { not: emp.id }, isArchived: false }
      }))?.id || null;

      await (prisma as any).appraisalPacket.create({
        data: {
          organizationId,
          cycleId: cycle.id,
          employeeId: emp.id,
          currentStage: 'SELF_REVIEW',
          status: 'OPEN',
          supervisorId,
          matrixSupervisorId,
          managerId,
          hrReviewerId,
          finalReviewerId
        }
      });
      packetCount++;
      await notify(emp.id, '📈 Appraisal Cycle Started', `The ${title} cycle has begun. Please complete your self-review.`, 'INFO', '/appraisals');
    }

    return { 
      message: `Appraisal cycle initialized for ${packetCount} employees.`, 
      cycle, 
      packetCount 
    };
  }

  static async updateCycle(organizationId: string, cycleId: string, data: any) {
    const { title, period, startDate, endDate, status } = data;
    return (prisma as any).appraisalCycle.update({
      where: { id: cycleId, organizationId },
      data: {
        ...(title && { title }),
        ...(period && { period: String(period) }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(status && { status })
      }
    });
  }

  static async deleteCycle(organizationId: string, cycleId: string) {
    // Cascading delete is handled by Prisma (onDelete: Cascade) in schema for Packets -> Reviews
    return (prisma as any).appraisalCycle.delete({
      where: { id: cycleId, organizationId }
    });
  }


  /**
   * Submit a review for a specific stage
   */
  static async submitReview(packetId: string, userId: string, organizationId: string, reviewData: any) {
    const packet = await (prisma as any).appraisalPacket.findUnique({
      where: { id: packetId, organizationId },
      include: { employee: true }
    });

    if (!packet) throw new Error('Appraisal packet not found');
    
    // Permission check based on stage
    const currentStage = packet.currentStage;
    const isOwner = this.isStageOwner(packet, currentStage, userId);
    
    if (!isOwner) throw new Error(`You are not the authorized reviewer for the ${currentStage} stage.`);

    // Whitelist safe fields only (prevent arbitrary field injection)
    const { overallRating, summary, strengths, weaknesses, achievements, developmentNeeds, responses } = reviewData;
    const safeData = {
      ...(overallRating !== undefined && { overallRating: Number(overallRating) }),
      ...(summary !== undefined && { summary: String(summary) }),
      ...(strengths !== undefined && { strengths: String(strengths) }),
      ...(weaknesses !== undefined && { weaknesses: String(weaknesses) }),
      ...(achievements !== undefined && { achievements: String(achievements) }),
      ...(developmentNeeds !== undefined && { developmentNeeds: String(developmentNeeds) }),
      ...(responses !== undefined && { responses: typeof responses === 'string' ? responses : JSON.stringify(responses) }),
    };

    // Create or Update the review layer
    const review = await (prisma as any).appraisalReview.upsert({
      where: {
        packetId_reviewStage: {
          packetId,
          reviewStage: currentStage
        }
      },
      update: {
        ...safeData,
        status: 'SUBMITTED',
        submittedAt: new Date()
      },
      create: {
        organizationId,
        packetId,
        reviewerId: userId,
        reviewStage: currentStage,
        ...safeData,
        status: 'SUBMITTED',
        submittedAt: new Date()
      }
    });

    // 📜 Log to Employee History
    await prisma.employeeHistory.create({
      data: {
        organizationId,
        employeeId: packet.employeeId,
        title: 'Appraisal Review Submitted',
        description: `A ${currentStage.replace('_', ' ')} review was submitted by ${userId}.`,
        type: 'PERFORMANCE',
        severity: 'INFO',
        createdById: userId
      }
    });

    // Advance to next stage logic
    await this.advancePacket(packetId, organizationId);

    // If Manager Review, Check for Gaps (>15% / 1 point)
    if (currentStage === 'MANAGER_REVIEW') {
      await this.checkForDisputeGaps(packetId, organizationId);
    }

    return review;
  }

  /**
   * Check for significant gaps between Self and Supervisor ratings
   */
  private static async checkForDisputeGaps(packetId: string, organizationId: string) {
    const packet = await (prisma as any).appraisalPacket.findUnique({
      where: { id: packetId, organizationId },
      include: { reviews: true }
    });
    if (!packet) return;

    const selfReview = packet.reviews.find((r: any) => r.reviewStage === 'SELF_REVIEW');
    const managerReview = packet.reviews.find((r: any) => r.reviewStage === 'MANAGER_REVIEW');

    if (selfReview && managerReview) {
      const selfScore = selfReview.overallRating || 0;
      const managerScore = managerReview.overallRating || 0;
      
      // If gap is > 15 points (on 0-100 scale)
      if (Math.abs(selfScore - managerScore) >= 15) {
        await (prisma as any).appraisalPacket.update({
          where: { id: packetId },
          data: { 
            gapDetected: true, 
            disputeReason: 'Significant variance (>15%) between self-appraisal and supervisor review.' 
          }
        });
        
        // Notify HR
        if (packet.hrReviewerId) {
          await notify(packet.hrReviewerId, '⚖️ Appraisal Gap Flagged', `A significant rating gap was detected in ${packetId}. No formal dispute raised yet.`, 'INFO', `/reviews/packet/${packetId}`);
        }
      }
    }
  }

  /**
   * Raise a formal dispute
   */
  static async raiseDispute(packetId: string, userId: string, organizationId: string, reason: string) {
    const packet = await (prisma as any).appraisalPacket.findUnique({
      where: { id: packetId, organizationId }
    });
    if (!packet) throw new Error('Packet not found');
    if (packet.employeeId !== userId) throw new Error('Only the employee can raise a dispute.');

    return (prisma as any).appraisalPacket.update({
      where: { id: packetId },
      data: {
        isDisputed: true,
        disputeReason: reason,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Resolve a dispute (HR/MD)
   */
  static async resolveDispute(packetId: string, userId: string, organizationId: string, resolution: string) {
     return (prisma as any).appraisalPacket.update({
      where: { id: packetId, organizationId },
      data: {
        isDisputed: false,
        disputeResolution: resolution,
        disputeResolvedAt: new Date(),
        resolvedById: userId,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Internal: Move packet to next valid stage
   */
  private static async advancePacket(packetId: string, organizationId: string) {
    const packet = await (prisma as any).appraisalPacket.findUnique({
      where: { id: packetId, organizationId },
      include: { employee: true }
    });

    if (!packet) return;

    const currentIndex = APPRAISAL_STAGES.indexOf(packet.currentStage);
    let nextIndex = currentIndex + 1;
    let nextStageFound = false;
    let nextStage = 'COMPLETED';

    while (nextIndex < APPRAISAL_STAGES.length) {
      const candidateStage = APPRAISAL_STAGES[nextIndex];
      const reviewerId = this.getReviewerForStage(packet, candidateStage);

      // Rule: Skip if no valid reviewer
      if (!reviewerId) {
        nextIndex++;
        continue;
      }

      // Rule: Collapse duplicates (if next reviewer is same as current)
      const currentReviewer = this.getReviewerForStage(packet, packet.currentStage);
      if (reviewerId === currentReviewer) {
        nextIndex++;
        continue;
      }

      nextStage = candidateStage;
      nextStageFound = true;
      break;
    }

    await (prisma as any).appraisalPacket.update({
      where: { id: packetId },
      data: {
        currentStage: nextStage,
        status: nextStage === 'COMPLETED' ? 'COMPLETED' : 'OPEN'
      }
    });

    // Notify next reviewer
    if (nextStageFound) {
      const nextReviewerId = this.getReviewerForStage(packet, nextStage);
      if (nextReviewerId) {
        await notify(nextReviewerId, '📋 Appraisal Review Pending', `You have a pending review for ${packet.employee.fullName}`, 'INFO', '/team/appraisals');
      }
    }
  }

  private static isStageOwner(packet: any, stage: string, userId: string): boolean {
    if (stage === 'SELF_REVIEW') return packet.employeeId === userId;
    if (stage === 'MANAGER_REVIEW') return packet.supervisorId === userId || packet.managerId === userId;
    return false;
  }

  private static getReviewerForStage(packet: any, stage: string): string | null {
    if (stage === 'SELF_REVIEW') return packet.employeeId;
    if (stage === 'MANAGER_REVIEW') return packet.supervisorId || packet.managerId;
    return null;
  }

  static async getPacketDetail(packetId: string, userId: string, organizationId: string) {
    const packet = await (prisma as any).appraisalPacket.findUnique({
      where: { id: packetId, organizationId },
      include: {
        employee: { select: { id: true, fullName: true, avatarUrl: true, jobTitle: true, departmentId: true } },
        cycle: true,
        reviews: {
          include: { reviewer: { select: { fullName: true, avatarUrl: true } } },
          orderBy: { submittedAt: 'asc' }
        }
      }
    });

    if (!packet) return null;

    // BLIND REVIEW LOGIC:
    // If the solicitor is the Supervisor and they haven't submitted their review yet,
    // redact the content of the Self Review.
    const isManager = packet.supervisorId === userId || packet.managerId === userId;
    const hasManagerSubmitted = packet.reviews.some((r: any) => r.reviewerId === userId && r.reviewStage === 'MANAGER_REVIEW');

    if (isManager && !hasManagerSubmitted) {
       packet.reviews = packet.reviews.map((r: any) => {
         if (r.reviewStage === 'SELF_REVIEW') {
           return {
             ...r,
             overallRating: null,
             summary: '[Content Hidden until your review is submitted]',
             strengths: null,
             weaknesses: null,
             achievements: null,
             developmentNeeds: null,
             responses: '{}'
           };
         }
         return r;
       });
    }

    return packet;
  }

  static async getEmployeePackets(employeeId: string, organizationId: string) {
    return (prisma as any).appraisalPacket.findMany({
      where: { employeeId, organizationId },
      include: {
        cycle: true,
        employee: { select: { fullName: true, avatarUrl: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getReviewerPackets(userId: string, organizationId: string) {
    return (prisma as any).appraisalPacket.findMany({
      where: {
        organizationId,
        OR: [
          { supervisorId: userId },
          { matrixSupervisorId: userId },
          { managerId: userId },
          { hrReviewerId: userId },
          { finalReviewerId: userId }
        ]
      },
      include: {
        cycle: true,
        employee: { select: { fullName: true, avatarUrl: true, jobTitle: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  /**
   * Get packets awaiting final institutional sign-off (for MD/Director)
   */
  static async getFinalVerdictList(organizationId: string) {
    return (prisma as any).appraisalPacket.findMany({
      where: {
        organizationId,
        currentStage: 'FINAL_REVIEW',
        status: 'OPEN'
      },
      include: {
        employee: { select: { id: true, fullName: true, jobTitle: true, avatarUrl: true } },
        cycle: true,
        reviews: {
          include: { reviewer: { select: { fullName: true } } }
        }
      },
      orderBy: { updatedAt: 'asc' }
    });
  }

  /**
   * Final Sign-off: Close the packet and set final status
   */
  static async finalizePacket(packetId: string, userId: string, organizationId: string) {
    const packet = await (prisma as any).appraisalPacket.findUnique({
      where: { id: packetId, organizationId }
    });

    if (!packet) throw new Error('Packet not found');
    if (packet.currentStage !== 'FINAL_REVIEW') throw new Error('Packet is not in the final review stage');

    const updated = await (prisma as any).appraisalPacket.update({
      where: { id: packetId },
      data: {
        currentStage: 'COMPLETED',
        status: 'COMPLETED',
        updatedAt: new Date()
      }
    });

    // 📜 Log to Employee History
    await prisma.employeeHistory.create({
      data: {
        organizationId,
        employeeId: packet.employeeId,
        title: 'Appraisal Cycle Completed',
        description: `The appraisal cycle was finalized and closed on the dossier.`,
        type: 'PERFORMANCE',
        severity: 'SUCCESS',
        createdById: userId
      }
    });

    return updated;
  }

  /**
   * Update an appraisal packet (admin/MD only)
   */
  static async updatePacket(organizationId: string, packetId: string, data: any) {
    const { supervisorId, managerId, matrixSupervisorId, hrReviewerId, finalReviewerId, currentStage, status, gapDetected } = data;
    
    return (prisma as any).appraisalPacket.update({
      where: { id: packetId, organizationId },
      data: {
        ...(supervisorId !== undefined && { supervisorId }),
        ...(managerId !== undefined && { managerId }),
        ...(matrixSupervisorId !== undefined && { matrixSupervisorId }),
        ...(hrReviewerId !== undefined && { hrReviewerId }),
        ...(finalReviewerId !== undefined && { finalReviewerId }),
        ...(currentStage !== undefined && { currentStage }),
        ...(status !== undefined && { status }),
        ...(gapDetected !== undefined && { gapDetected }),
        updatedAt: new Date()
      }
    });
  }
  /**
   * Delete an appraisal packet (admin/MD only)
   */
  static async deletePacket(organizationId: string, packetId: string) {
    return (prisma as any).appraisalPacket.delete({
      where: { id: packetId, organizationId }
    });
  }

  /**
   * Get all packets for a specific cycle (MD/HR Oversight)
   */
  static async getCyclePackets(organizationId: string, cycleId: string) {
    return (prisma as any).appraisalPacket.findMany({
      where: { organizationId, cycleId },
      include: {
        employee: { select: { id: true, fullName: true, jobTitle: true, avatarUrl: true } },
        reviews: {
          select: { reviewStage: true, status: true }
        }
      },
      orderBy: { employee: { fullName: 'asc' } }
    });
  }
}
