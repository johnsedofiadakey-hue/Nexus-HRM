import prisma from '../prisma/client';
import { logAction } from './audit.service';
import { notify } from './websocket.service';

/**
 * Appraisal stages in sequential order
 */
const APPRAISAL_STAGES = [
  'SELF_REVIEW',
  'SUPERVISOR_REVIEW',
  'MANAGER_REVIEW',
  'HR_REVIEW',
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
    const existingAppraisalCycle = await (prisma as any).appraisalCycle.findFirst({
      where: { organizationId, title, status: { not: 'ARCHIVED' } }
    });
    if (existingAppraisalCycle) {
      throw new Error(`An appraisal cycle named "${title}" already exists and is active. Archive it first.`);
    }

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

    const employees = await prisma.user.findMany({
      where: {
        organizationId,
        isArchived: false,
        role: { not: 'DEV' }, // MDs might get self-reviews, but DEV never
        ...(employeeIds ? { id: { in: employeeIds } } : {})
      },
      include: {
        supervisor: true,
        departmentObj: { include: { manager: true } }
      }
    });

    for (const emp of employees) {
      // Resolve reviewers for the packet cache
      const supervisorId = emp.supervisorId;
      const managerId = emp.departmentObj?.managerId || null;
      // HR and Final are usually global or MD
      // HR reviewer = highest-rank user who is not the employee (DIRECTOR+ serves as HR in absence of dedicated HR role)
      const hrReviewerId = (await prisma.user.findFirst({ 
        where: { organizationId, role: { in: ['DIRECTOR', 'MD'] }, id: { not: emp.id }, isArchived: false },
        orderBy: { role: 'asc' } // DIRECTOR before MD
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
          managerId,
          hrReviewerId,
          finalReviewerId
        }
      });

      await notify(emp.id, '📈 Appraisal Cycle Started', `The ${title} cycle has begun. Please complete your self-review.`, 'INFO', '/appraisals');
    }

    return cycle;
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

    // Advance to next stage logic
    await this.advancePacket(packetId, organizationId);

    return review;
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
    if (stage === 'SUPERVISOR_REVIEW') return packet.supervisorId === userId;
    if (stage === 'MANAGER_REVIEW') return packet.managerId === userId;
    if (stage === 'HR_REVIEW') return packet.hrReviewerId === userId;
    if (stage === 'FINAL_REVIEW') return packet.finalReviewerId === userId;
    return false;
  }

  private static getReviewerForStage(packet: any, stage: string): string | null {
    if (stage === 'SELF_REVIEW') return packet.employeeId;
    if (stage === 'SUPERVISOR_REVIEW') return packet.supervisorId;
    if (stage === 'MANAGER_REVIEW') return packet.managerId;
    if (stage === 'HR_REVIEW') return packet.hrReviewerId;
    if (stage === 'FINAL_REVIEW') return packet.finalReviewerId;
    return null;
  }

  static async getPacketDetail(packetId: string, organizationId: string) {
    return (prisma as any).appraisalPacket.findUnique({
      where: { id: packetId, organizationId },
      include: {
        employee: { select: { id: true, fullName: true, avatarUrl: true, jobTitle: true } },
        cycle: true,
        reviews: {
          include: { reviewer: { select: { fullName: true, avatarUrl: true } } },
          orderBy: { submittedAt: 'asc' }
        }
      }
    });
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

    return (prisma as any).appraisalPacket.update({
      where: { id: packetId },
      data: {
        currentStage: 'COMPLETED',
        status: 'COMPLETED',
        updatedAt: new Date()
      }
    });
  }
}
