import prisma from '../prisma/client';
import { logAction } from './audit.service';
import { notify } from './websocket.service';

export class TargetService {
  /**
   * Create a new target (Department or Individual)
   */
  static async createTarget(data: any, originatorId: string, organizationId: string) {
    const { title, description, level, metrics, dueDate, departmentId, assigneeId, lineManagerId, reviewerId, type, weight } = data;

    const target = await prisma.target.create({
      data: {
        organizationId,
        title,
        description,
        level: level || 'INDIVIDUAL',
        type,
        dueDate: dueDate ? new Date(dueDate) : null,
        originator: { connect: { id: originatorId } },
        assignee: assigneeId ? { connect: { id: assigneeId } } : undefined,
        department: departmentId ? { connect: { id: departmentId } } : undefined,
        lineManager: lineManagerId ? { connect: { id: lineManagerId } } : undefined,
        reviewer: reviewerId ? { connect: { id: reviewerId } } : { connect: { id: originatorId } }, // Default reviewer is originator if not specified
        weight: weight || 1.0,
        status: 'ASSIGNED', // Move directly to assigned if creating for someone
        metrics: {
          create: metrics?.map((m: any) => ({
            organizationId,
            title: m.title,
            description: m.description,
            metricType: m.metricType || 'NUMERICAL',
            targetValue: m.targetValue,
            unit: m.unit,
            weight: m.weight || 1.0
          }))
        }
      },
      include: { metrics: true }
    });

    // Notify Assignee
    if (assigneeId) {
      await notify(assigneeId, '🎯 New Target Assigned', `You have been assigned a new target: ${title}`, 'INFO', '/performance');
    }

    return target;
  }

  /**
   * Cascade a Department target to individual staff members
   */
  static async cascadeTarget(parentTargetId: string, staffAssignments: any[], managerId: string, organizationId: string) {
    const parentTarget = await prisma.target.findUnique({
      where: { id: parentTargetId, organizationId },
      include: { metrics: true }
    });

    if (!parentTarget) throw new Error('Parent target not found');
    if (parentTarget.level !== 'DEPARTMENT') throw new Error('Only Department targets can be cascaded');

    const createdTargets: any[] = [];

    for (const assignment of staffAssignments) {
      const { staffId, weightRatio = 1.0 } = assignment;
      
      const newTarget = await prisma.target.create({
        data: {
          organizationId,
          title: `[CASCADED] ${parentTarget.title}`,
          description: parentTarget.description,
          level: 'INDIVIDUAL',
          parentTargetId: parentTarget.id,
          assigneeId: staffId,
          originatorId: managerId,
          lineManagerId: managerId,
          reviewerId: managerId,
          dueDate: parentTarget.dueDate,
          weight: parentTarget.weight * weightRatio,
          status: 'ASSIGNED',
          metrics: {
            create: parentTarget.metrics.map(m => ({
              organizationId,
              title: m.title,
              description: m.description,
              metricType: m.metricType,
              targetValue: m.targetValue ? m.targetValue * weightRatio : null,
              unit: m.unit,
              weight: m.weight
            }))
          }
        }
      });
      createdTargets.push(newTarget);
      await notify(staffId, '🎯 Cascaded Target Assigned', `A departmental goal has been cascaded to you: ${parentTarget.title}`, 'INFO', '/performance');
    }

    return createdTargets;
  }

  /**
   * Staff acknowledges a target or requests clarification
   */
  static async acknowledge(targetId: string, userId: string, organizationId: string, status: 'ACKNOWLEDGED' | 'CLARIFICATION_REQUESTED', message?: string) {
    const target = await prisma.target.findUnique({
      where: { id: targetId, organizationId }
    });

    if (!target) throw new Error('Target not found');
    if (target.assigneeId !== userId) throw new Error('Not authorized to acknowledge this target');
    if (target.status !== 'ASSIGNED') throw new Error('Target is not in ASSIGNED state');

    // Explicit acknowledgement record
    await (prisma as any).targetAcknowledgement.create({
      data: {
        organizationId,
        target: { connect: { id: targetId } },
        user: { connect: { id: userId } },
        status: status,
        message: message
      }
    });

    // Update target status correctly
    const nextStatus = status === 'ACKNOWLEDGED' ? 'ACKNOWLEDGED' : 'CLARIFICATION_REQUESTED';
    await (prisma as any).target.update({
      where: { id: targetId },
      data: { status: nextStatus }
    });

    // Notify Originator
    await notify(target.originatorId, 
      status === 'ACKNOWLEDGED' ? '✅ Target Acknowledged' : '❓ Clarification Requested',
      `Staff ${userId} has ${status.toLowerCase()} the target: ${target.title}`, 
      status === 'ACKNOWLEDGED' ? 'SUCCESS' : 'WARNING', 
      '/team'
    );

    return target; // Return the original target or the updated one? The instruction implies returning the updated one.
  }

  /**
   * Submit a progress update for a metric
   */
  static async updateProgress(targetId: string, metricUpdates: any[], userId: string, organizationId: string, submitForReview: boolean = false) {
    const target = await prisma.target.findUnique({
      where: { id: targetId, organizationId },
      include: { metrics: true }
    });

    if (!target) throw new Error('Target not found');
    if (target.assigneeId !== userId) throw new Error('Not authorized to update this target');
    
    // Spec says: Progress updates allowed only if ACKNOWLEDGED or IN_PROGRESS
    if (!['ACKNOWLEDGED', 'IN_PROGRESS'].includes(target.status)) {
      throw new Error(`Cannot update progress when target is ${target.status}`);
    }

    for (const update of metricUpdates) {
      const { metricId, value, comment } = update;
      
      const metric = target.metrics.find(m => m.id === metricId);
      if (!metric) continue;

      // Create update log
      await (prisma as any).targetUpdate.create({
        data: {
          organizationId,
          target: { connect: { id: targetId } },
          metric: metricId ? { connect: { id: metricId } } : undefined,
          submittedBy: { connect: { id: userId } },
          value: parseFloat(value),
          notes: comment
        }
      });

      // Update current value on the metric
      if (metricId) {
        await (prisma as any).targetMetric.update({
          where: { id: metricId },
          data: { currentValue: parseFloat(value) }
        });
      }
    }

    const newStatus = submitForReview ? 'UNDER_REVIEW' : 'IN_PROGRESS';
    const updatedTarget = await (prisma as any).target.update({
      where: { id: targetId },
      data: { status: newStatus }
    });

    if (submitForReview && target.reviewerId) {
      await notify(target.reviewerId, '🎯 Target Awaiting Review', `Target "${target.title}" has been submitted for review.`, 'INFO', '/team');
    }

    return updatedTarget;
  }

  /**
   * Reviewer scores or rejects a target
   */
  static async reviewTarget(targetId: string, reviewerId: string, organizationId: string, approved: boolean, feedback?: string) {
    const target = await prisma.target.findUnique({
      where: { id: targetId, organizationId }
    });

    if (!target) throw new Error('Target not found');
    if (target.reviewerId !== reviewerId) throw new Error('Not authorized to review this target');
    if (target.status !== 'UNDER_REVIEW') throw new Error('Target is not awaiting review');

    const newStatus = approved ? 'COMPLETED' : 'IN_PROGRESS';
    
    const updatedTarget = await prisma.target.update({
      where: { id: targetId },
      data: { status: newStatus }
    });

    if (target.assigneeId) {
      await notify(target.assigneeId, 
        approved ? '🎉 Target Completed' : '🔄 Target Returned',
        approved ? `Your target "${target.title}" has been marked as completed.` : `Your target was returned for correction: ${feedback}`,
        approved ? 'SUCCESS' : 'WARNING',
        '/performance'
      );
    }

    return updatedTarget;
  }
}
