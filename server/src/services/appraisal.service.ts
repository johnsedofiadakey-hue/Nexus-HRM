import prisma from '../prisma/client';
import { logAction } from './audit.service';
import { notify } from './websocket.service';

/**
 * Appraisal stages in sequential order
 */
const APPRAISAL_STAGES = [
  'SELF_REVIEW',
  'MANAGER_REVIEW',
  'FINAL_REVIEW'
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
    cycle = await prisma.appraisalCycle.findFirst({
      where: { organizationId, title, status: { not: 'ARCHIVED' } }
    });

    if (!cycle) {
      cycle = await prisma.appraisalCycle.create({
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

    return await prisma.$transaction(async (tx) => {
      let packetCount = 0;
      for (const emp of employees) {
        // Check if packet already exists for this employee in this cycle to avoid duplicates
        const existingPacket = await tx.appraisalPacket.findFirst({
          where: { cycleId: cycle.id, employeeId: emp.id, NOT: { status: 'CANCELLED' } }
        });
        if (existingPacket) continue;

        // Resolve reviewers for the packet cache (Hierarchy Fallback)
        const userRank = (emp as any).roleRank || 0;
        const supervisorId = emp.supervisorId;
        const matrixSupervisorId = (emp as any).managedReportingLines?.[0]?.managerId || null;
        let managerId = emp.departmentObj?.managerId || null;
        
        // If employee is high-ranked (Manager+), ensure their supervisor is a Director or higher
        let resolvedSupervisorId = supervisorId;
        if (userRank >= 70 && (!supervisorId || supervisorId === managerId)) {
           const topAuthority = await tx.user.findFirst({
              where: { organizationId, role: { in: ['DIRECTOR', 'MD', 'DEV'] }, id: { not: emp.id }, isArchived: false },
              orderBy: { role: 'desc' }
           });
           if (topAuthority) resolvedSupervisorId = topAuthority.id;
        }

        const hrReviewerId = (await tx.user.findFirst({ 
          where: { organizationId, role: { in: ['DIRECTOR', 'MD', 'HR'] }, id: { not: emp.id }, isArchived: false },
          orderBy: { role: 'asc' } 
        }))?.id || null;
        const finalReviewerId = (await tx.user.findFirst({ 
          where: { organizationId, role: { in: ['MD', 'DEV'] }, id: { not: emp.id }, isArchived: false }
        }))?.id || null;

        await tx.appraisalPacket.create({
          data: {
            organizationId,
            cycleId: cycle.id,
            employeeId: emp.id,
            currentStage: 'SELF_REVIEW',
            status: 'OPEN',
            supervisorId: resolvedSupervisorId,
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
    });
  }

  static async updateCycle(organizationId: string, cycleId: string, data: any) {
    const { title, period, startDate, endDate, status } = data;
    return prisma.appraisalCycle.update({
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
    return await prisma.$transaction(async (tx) => {
      // 1. Find all packet IDs for this cycle
      const packets = await tx.appraisalPacket.findMany({
        where: { cycleId, organizationId },
        select: { id: true }
      });
      const packetIds = packets.map((p: any) => p.id);

      if (packetIds.length > 0) {
        // 2. Delete all reviews for these packets
        await tx.appraisalReview.deleteMany({
          where: { packetId: { in: packetIds } }
        });
        // 3. Delete the packets
        await tx.appraisalPacket.deleteMany({
          where: { id: { in: packetIds }, organizationId }
        });
      }

      // 4. Delete the cycle itself
      return await tx.appraisalCycle.deleteMany({
        where: { id: cycleId, organizationId }
      });
    });
  }


  /**
   * Submit a review for a specific stage
   */
  static async submitReview(packetId: string, userId: string, organizationId: string, reviewData: any) {
    const packet = await prisma.appraisalPacket.findUnique({
      where: { id: packetId, organizationId },
      include: { employee: true }
    });

    if (!packet) throw new Error('Appraisal packet not found');
    
    // Permission check based on stage (Directors and MDs have global review rights)
    const currentStage = packet.currentStage;
    const userRank = reviewData.userRank || 0;
    const userDeptId = reviewData.userDeptId; // Passed from controller
    const isOwner = this.isStageOwner(packet, currentStage, userId, userRank, userDeptId);
    
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
    const review = await prisma.appraisalReview.upsert({
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
    const packet = await prisma.appraisalPacket.findUnique({
      where: { id: packetId, organizationId },
      include: { reviews: true }
    });
    if (!packet) return;

    const selfReview = packet.reviews.find((r: any) => r.reviewStage === 'SELF_REVIEW');
    const managerReview = packet.reviews.find((r: any) => r.reviewStage === 'MANAGER_REVIEW');

    if (selfReview && managerReview) {
      const selfScore = Number(selfReview.overallRating) || 0;
      const managerScore = Number(managerReview.overallRating) || 0;
      const gap = Math.abs(selfScore - managerScore);

      // ── CONSENSUS FAST-TRACK ──────────────────────────────────────────────
      // If there is NO variation (0 gap), "write it off as accepted" (Auto-Complete)
      if (gap === 0 && selfScore > 0) {
        await prisma.appraisalPacket.update({
          where: { id: packetId },
          data: { 
            status: 'COMPLETED', 
            currentStage: 'COMPLETED',
            finalScore: selfScore,
            finalVerdict: 'Consensus Reached: Self-appraisal and supervisor review are identical. Evaluation accepted and finalized.' 
          }
        });
        
        await notify(packet.employeeId, '✅ Appraisal Auto-Accepted', `Your evaluation was auto-accepted as there was no variation between your self-review and the manager's review.`, 'SUCCESS', '/performance/history');
        return; 
      }
      
      // If gap is > 15 points (on 0-100 scale)
      if (gap >= 15) {
        await prisma.appraisalPacket.update({
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
    const packet = await prisma.appraisalPacket.findUnique({
      where: { id: packetId, organizationId }
    });
    if (!packet) throw new Error('Packet not found');
    if (packet.employeeId !== userId) throw new Error('Only the employee can raise a dispute.');

    return prisma.appraisalPacket.update({
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
  static async resolveDispute(packetId: string, userId: string, organizationId: string, resolution: string, finalScore?: number, finalVerdict?: string) {
    return prisma.appraisalPacket.update({
      where: { id: packetId, organizationId },
      data: {
        isDisputed: false,
        disputeResolution: resolution,
        disputeResolvedAt: new Date(),
        resolvedById: userId,
        currentStage: 'COMPLETED',
        status: 'COMPLETED',
        ...(finalScore !== undefined && { finalScore: Number(finalScore) }),
        ...(finalVerdict !== undefined && { finalVerdict: String(finalVerdict) }),
        updatedAt: new Date()
      }
    });
  }

  /**
   * Internal: Move packet to next valid stage
   */
  private static async advancePacket(packetId: string, organizationId: string) {
    const packet = await prisma.appraisalPacket.findUnique({
      where: { id: packetId, organizationId },
      include: { employee: true, cycle: true }
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

    await prisma.appraisalPacket.update({
      where: { id: packetId },
      data: {
        currentStage: nextStage,
        status: nextStage === 'COMPLETED' ? 'COMPLETED' : 'OPEN'
      }
    });

    // ── FINALIZATION LOGIC ──
    if (nextStage === 'COMPLETED') {
      // 1. Notify Employee
      await notify(packet.employeeId, '🏆 Appraisal Cycle Completed', `Your appraisal cycle for "${packet.cycle.title}" has been finalized.`, 'SUCCESS', '/performance/history');
      
      // 2. Log to Employee History
      await prisma.employeeHistory.create({
        data: {
          organizationId,
          employeeId: packet.employeeId,
          title: 'Appraisal Cycle Completed',
          description: `The 2-step appraisal review process was completed and finalized.`,
          type: 'PERFORMANCE',
          severity: 'SUCCESS',
          createdById: 'SYSTEM'
        }
      });
    }

    // Notify next reviewer
    if (nextStageFound) {
      const nextReviewerId = this.getReviewerForStage(packet, nextStage);
      if (nextReviewerId) {
        await notify(nextReviewerId, '📋 Appraisal Review Pending', `You have a pending review for ${packet.employee.fullName}`, 'INFO', '/team/appraisals');
      }
    }
  }

  private static isStageOwner(packet: any, stage: string, userId: string, userRank: number = 0, reviewerDeptId?: number): boolean {
    // Global Oversight: Directors (80) and MDs (90) can review any stage if the packet is open
    if (userRank >= 80 && packet.status === 'OPEN') return true;

    if (stage === 'SELF_REVIEW') return packet.employeeId === userId;
    
    if (stage === 'MANAGER_REVIEW') {
      const isPrimary = packet.supervisorId === userId || packet.managerId === userId || packet.matrixSupervisorId === userId;
      // Departmental Fallback: Allow any Manager (70+) in the same department to review
      const isDeptManager = userRank >= 70 && packet.employee?.departmentId && reviewerDeptId === packet.employee?.departmentId;
      return isPrimary || isDeptManager;
    }

    if (stage === 'FINAL_REVIEW') {
      // Specifically check for assigned final reviewers or senior management (MD/Director/HR = 85+)
      return packet.finalReviewerId === userId || packet.hrReviewerId === userId || userRank >= 85; 
    }
    return false;
  }

  private static getReviewerForStage(packet: any, stage: string): string | null {
    if (stage === 'SELF_REVIEW') return packet.employeeId;
    if (stage === 'MANAGER_REVIEW') return packet.supervisorId || packet.managerId;
    if (stage === 'FINAL_REVIEW') return packet.finalReviewerId || packet.hrReviewerId;
    return null;
  }

  static async getPacketDetail(packetId: string, userId: string, organizationId: string) {
    const packet = await prisma.appraisalPacket.findUnique({
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
       try {
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
       } catch (err) {
         console.error('[AppraisalService] Redaction error:', err);
         // Fail safe: return the original reviews if redaction fails for some reason
       }
    }

    return packet;
  }

  static async getEmployeePackets(employeeId: string, organizationId: string) {
    return prisma.appraisalPacket.findMany({
      where: { employeeId, organizationId },
      include: {
        cycle: true,
        employee: { select: { fullName: true, avatarUrl: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getReviewerPackets(userId: string, organizationId: string, userRank: number = 0) {
    // If Director or MD, they see ALL open packets for their organization (Global Oversight)
    if (userRank >= 80) {
      return prisma.appraisalPacket.findMany({
        where: { 
          organizationId,
          status: { not: 'CANCELLED' }
        },
        include: {
          cycle: true,
          employee: { select: { fullName: true, avatarUrl: true, jobTitle: true } }
        },
        orderBy: { updatedAt: 'desc' }
      });
    }

    return prisma.appraisalPacket.findMany({
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
    return prisma.appraisalPacket.findMany({
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
   * Final Sign-off: Close the packet and set final status with optional MD score override
   */
  static async finalizePacket(packetId: string, userId: string, organizationId: string, finalVerdict?: string, finalScore?: number) {
    const packet = await prisma.appraisalPacket.findUnique({
      where: { id: packetId, organizationId }
    });

    if (!packet) throw new Error('Packet not found');
    if (packet.currentStage !== 'FINAL_REVIEW') throw new Error('Packet is not in the final review stage');

    const updated = await prisma.appraisalPacket.update({
      where: { id: packetId },
      data: {
        currentStage: 'COMPLETED',
        status: 'COMPLETED',
        finalVerdict: finalVerdict || 'Evaluation officially closed by Institutional Authority.',
        ...(finalScore !== undefined && { finalScore: Number(finalScore) }),
        updatedAt: new Date()
      }
    });

    // 📜 Log to Employee History
    await prisma.employeeHistory.create({
      data: {
        organizationId,
        employeeId: packet.employeeId,
        title: 'Appraisal Cycle Completed',
        description: `The appraisal cycle was finalized with verdict: ${finalVerdict || 'Closed'}.`,
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
    
    return prisma.appraisalPacket.update({
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
   * Delete an appraisal packet and ALL associated reviews (hard purge)
   */
  static async deletePacket(organizationId: string, packetId: string) {
    const packet = await prisma.appraisalPacket.findFirst({
      where: { id: packetId, organizationId }
    });
    if (!packet) throw new Error('Appraisal packet not found');

    return await prisma.$transaction(async (tx) => {
      // 1. Wipe all reviews for this packet
      await tx.appraisalReview.deleteMany({ where: { packetId } });
      // 2. Delete the packet itself
      return await tx.appraisalPacket.deleteMany({ 
        where: { id: packetId, organizationId } 
      });
    });
  }


  /**
   * Get all packets for a specific cycle (MD/HR Oversight)
   */
  static async getCyclePackets(organizationId: string, cycleId: string) {
    return prisma.appraisalPacket.findMany({
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
