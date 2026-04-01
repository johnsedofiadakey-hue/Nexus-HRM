import prisma from '../prisma/client';
import { logAction } from './audit.service';
import { notify } from './websocket.service';

export class TargetService {
  /**
   * Create a new target (Department or Individual)
   */
  static async createTarget(data: any, originatorId: string, organizationId: string) {
    const { title, description, level, metrics, dueDate, departmentId, assigneeId, lineManagerId, reviewerId, type, weight, parentTargetId, contributionWeight } = data;
    
    if (!title) throw new Error('Target title is required');
    if (level === 'INDIVIDUAL' && !assigneeId) throw new Error('Individual targets require an assignee');

    // Auto-assign lineManager if missing and level is INDIVIDUAL
    let finalLineManagerId = lineManagerId;
    if (level === 'INDIVIDUAL' && assigneeId && (!finalLineManagerId || finalLineManagerId === 'null')) {
      const assigneeUser = await prisma.user.findUnique({ where: { id: assigneeId } });
      if (assigneeUser?.supervisorId) {
        finalLineManagerId = assigneeUser.supervisorId;
      }
    }

    const target = await prisma.target.create({
      data: {
        organizationId,
        title,
        description,
        level: level || 'INDIVIDUAL',
        type: type || 'SINGLE',
        dueDate: dueDate ? new Date(dueDate) : null,
        originator: { connect: { id: originatorId } },
        assignee: (assigneeId && assigneeId !== '' && assigneeId !== 'null') ? { connect: { id: assigneeId } } : undefined,
        department: (departmentId && String(departmentId) !== '') ? { connect: { id: parseInt(String(departmentId)) } } : undefined,
        lineManager: (finalLineManagerId && finalLineManagerId !== '' && finalLineManagerId !== 'null') ? { connect: { id: finalLineManagerId } } : undefined,
        reviewer: (reviewerId && reviewerId !== '' && reviewerId !== 'null') 
          ? { connect: { id: reviewerId } } 
          : { connect: { id: finalLineManagerId || originatorId } },
        weight: parseFloat(String(weight)) || 1.0,
        contributionWeight: parseFloat(String(contributionWeight)) || 0,
        parentTarget: (parentTargetId && parentTargetId !== '' && parentTargetId !== 'null') ? { connect: { id: parentTargetId } } : undefined,
        status: 'ASSIGNED',
        metrics: {
          create: (metrics || []).map((m: any) => ({
            organizationId,
            title: m.title || 'Untitled Metric',
            description: m.description || '',
            metricType: m.metricType || 'NUMERICAL',
            targetValue: m.targetValue !== undefined && m.targetValue !== '' ? parseFloat(String(m.targetValue)) : null,
            unit: m.unit || '',
            weight: m.weight !== undefined && m.weight !== '' ? parseFloat(String(m.weight)) : 1.0
          }))
        }
      },
      include: { metrics: true }
    });

    // Notify Assignee
    if (assigneeId) {
      await notify(assigneeId, '🎯 New Target Assigned', `You have been assigned a new target: ${title}`, 'INFO', '/performance');
    }

    // Notify Line Manager if different from originator
    if (finalLineManagerId && finalLineManagerId !== originatorId) {
      await notify(finalLineManagerId, '🎯 Target Assigned to Your Team', `A new target "${title}" has been assigned to your direct report.`, 'INFO', '/team');
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
          weight: Number(parentTarget.weight) * weightRatio,
          status: 'ASSIGNED',
          metrics: {
            create: parentTarget.metrics.map(m => ({
              organizationId,
              title: m.title,
              description: m.description,
              metricType: m.metricType,
              targetValue: m.targetValue ? Number(m.targetValue) * weightRatio : null,
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

    return target;
  }

  /**
   * Update an existing target and its metrics
   */
  static async updateTarget(targetId: string, orgId: string, data: any) {
    const { title, description, dueDate, weight, contributionWeight, status, metrics } = data;

    const target = await prisma.target.findUnique({
      where: { id: targetId, organizationId: orgId },
      include: { metrics: true }
    });

    if (!target) throw new Error('Target not found');

    return await prisma.$transaction(async (tx) => {
      // 1. Update metadata
      const updatedTarget = await tx.target.update({
        where: { id: targetId },
        data: {
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
          ...(weight !== undefined && { weight: parseFloat(String(weight)) }),
          ...(contributionWeight !== undefined && { contributionWeight: parseFloat(String(contributionWeight)) }),
          ...(status !== undefined && { status }),
        }
      });

      // 2. Sync Metrics if provided
      if (metrics && Array.isArray(metrics)) {
        const incomingMetricIds = metrics.map(m => m.id).filter(Boolean);
        const existingMetricIds = target.metrics.map(m => m.id);

        // A. Delete removed metrics
        const metricsToDelete = existingMetricIds.filter(id => !incomingMetricIds.includes(id));
        if (metricsToDelete.length > 0) {
          await tx.targetMetric.deleteMany({
            where: { id: { in: metricsToDelete } }
          });
        }

        // B. Upsert metrics
        for (const m of metrics) {
          if (m.id) {
            // Update
            await tx.targetMetric.update({
              where: { id: m.id },
              data: {
                title: m.title,
                description: m.description,
                metricType: m.metricType,
                targetValue: m.targetValue !== undefined && m.targetValue !== '' ? parseFloat(String(m.targetValue)) : null,
                unit: m.unit,
                weight: m.weight !== undefined && m.weight !== '' ? parseFloat(String(m.weight)) : 1.0
              }
            });
          } else {
            // Create
            await tx.targetMetric.create({
              data: {
                organizationId: orgId,
                targetId: targetId,
                title: m.title || 'Untitled Metric',
                description: m.description || '',
                metricType: m.metricType || 'NUMERICAL',
                targetValue: m.targetValue !== undefined && m.targetValue !== '' ? parseFloat(String(m.targetValue)) : null,
                unit: m.unit || '',
                weight: m.weight !== undefined && m.weight !== '' ? parseFloat(String(m.weight)) : 1.0
              }
            });
          }
        }
      }

      return updatedTarget;
    });
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
          comment: comment
        }
      });

      // Update current value on the metric
      if (metricId) {
        await prisma.targetMetric.update({
          where: { id: metricId },
          data: { currentValue: parseFloat(String(value)) }
        });
      }
    }

    const newStatus = submitForReview ? 'UNDER_REVIEW' : 'IN_PROGRESS';
    const updatedTarget = await prisma.target.update({
      where: { id: targetId },
      data: { status: newStatus }
    });

    // ── SYNC PROGRESS ──
    await this.syncTargetProgress(targetId);

    if (submitForReview && target.reviewerId) {
      await notify(target.reviewerId, '🎯 Target Awaiting Review', `Target "${target.title}" has been submitted for review.`, 'INFO', '/team');
    } else if (target.lineManagerId && target.lineManagerId !== userId) {
      // Notify line manager of general progress update
      await notify(target.lineManagerId, '📈 Target Progress Update', `"${target.assigneeId}" has updated progress on: ${target.title}`, 'INFO', '/team');
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

    // ── SYNC PROGRESS ──
    await this.syncTargetProgress(targetId);

    if (approved) {
      // 📜 Log to Employee History
      await prisma.employeeHistory.create({
        data: {
          organizationId,
          employeeId: target.assigneeId || '',
          title: 'Target Achieved',
          description: `Target "${target.title}" was completed and verified.`,
          type: 'PERFORMANCE',
          severity: 'SUCCESS',
          createdById: reviewerId
        }
      });
    }

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

  /**
   * Calculate strategic rollup for a parent target
   */
  static async getStrategicRollup(targetId: string, organizationId: string) {
    const parent = await prisma.target.findUnique({
      where: { id: targetId, organizationId },
      include: {
        childTargets: {
          include: { metrics: true }
        },
        metrics: true
      }
    });

    if (!parent) return null;

    // Calculate progress of children
    const childContributions = parent.childTargets.map(child => {
      const progress = this.calculateTargetProgress(child);
      return {
        id: child.id,
        title: child.title,
        progress: progress,
        contributionWeight: child.contributionWeight || 0,
        weightedProgress: (progress * Number(child.contributionWeight || 0)) / 100
      };
    });

    const totalWeightedProgress = childContributions.reduce((acc, c) => acc + c.weightedProgress, 0);

    return {
      parentId: parent.id,
      parentTitle: parent.title,
      totalProgress: totalWeightedProgress,
      breakdown: childContributions
    };
  }

  /**
   * Delete a target and ALL associated records (hard purge)
   */
  static async deleteTarget(targetId: string, orgId: string) {
    const target = await prisma.target.findFirst({
      where: { id: targetId, organizationId: orgId },
      include: { childTargets: true }
    });

    if (!target) throw new Error('Target not found');

    // Recursively delete child targets first
    for (const child of (target.childTargets || [])) {
      await this.deleteTarget(child.id, orgId);
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Delete all Updates (references metrics too)
      await (tx as any).targetUpdate.deleteMany({ where: { targetId } });

      // 2. Delete all Acknowledgements
      await (tx as any).targetAcknowledgement.deleteMany({ where: { targetId } });

      // 3. Delete all Metrics
      await tx.targetMetric.deleteMany({ where: { targetId } });

      // 4. Delete the target itself
      return await tx.target.delete({ where: { id: targetId } });
    });
  }

  /**
   * Sync a target's progress from metrics OR children, then bubble up.
   */
  static async syncTargetProgress(targetId: string) {
    const target = await prisma.target.findUnique({
      where: { id: targetId },
      include: { metrics: true, childTargets: true }
    });

    if (!target) return;

    let progress = 0;

    // A. Composite Progress (from children)
    if (target.childTargets && target.childTargets.length > 0) {
      let totalWeightedProgress = 0;
      target.childTargets.forEach(child => {
        totalWeightedProgress += (Number(child.progress) * Number(child.contributionWeight || 0)) / 100;
      });
      progress = Math.min(100, totalWeightedProgress);
    } 
    // B. Direct Progress (from metrics)
    else if (target.metrics && target.metrics.length > 0) {
      let totalProgress = 0;
      let totalWeight = 0;
      target.metrics.forEach((m: any) => {
        if (m.targetValue && m.targetValue > 0) {
          const mProgress = Math.min(100, (Number(m.currentValue) / Number(m.targetValue)) * 100);
          totalProgress += mProgress * (m.weight || 1.0);
          totalWeight += (m.weight || 1.0);
        }
      });
      progress = totalWeight > 0 ? (totalProgress / totalWeight) : 0;
    }

    // Update target
    await prisma.target.update({
      where: { id: targetId },
      data: { progress }
    });

    // Bubble Up
    if (target.parentTargetId) {
      await this.syncTargetProgress(target.parentTargetId);
    }
  }

  /**
   * Global sync for all targets in an organization (Migration helper)
   */
  static async syncAllTargets(organizationId: string) {
    const targets = await prisma.target.findMany({
      where: { organizationId, metrics: { some: {} } },
      select: { id: true }
    });
    console.log(`[TargetService] Syncing progress for ${targets.length} targets...`);
    for (const t of targets) {
      await this.syncTargetProgress(t.id);
    }
  }

  private static calculateTargetProgress(target: any): number {
    if (!target.metrics || target.metrics.length === 0) return target.progress || 0;
    
    let totalProgress = 0;
    let totalWeight = 0;

    target.metrics.forEach((m: any) => {
      if (m.targetValue && m.targetValue > 0) {
        const progress = Math.min(100, (Number(m.currentValue) / Number(m.targetValue)) * 100);
        totalProgress += progress * (m.weight || 1.0);
        totalWeight += (m.weight || 1.0);
      }
    });

    return totalWeight > 0 ? totalProgress / totalWeight : 0;
  }
}
