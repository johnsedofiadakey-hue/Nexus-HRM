"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TargetService = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const websocket_service_1 = require("./websocket.service");
class TargetService {
    /**
     * Create a new target (Department or Individual)
     */
    static async createTarget(data, originatorId, organizationId) {
        const { title, description, level, metrics, dueDate, departmentId, assigneeId, lineManagerId, reviewerId, type, weight, parentTargetId, contributionWeight } = data;
        if (!title)
            throw new Error('Target title is required');
        if (level === 'INDIVIDUAL' && !assigneeId)
            throw new Error('Individual targets require an assignee');
        const target = await client_1.default.target.create({
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
                lineManager: (lineManagerId && lineManagerId !== '' && lineManagerId !== 'null') ? { connect: { id: lineManagerId } } : undefined,
                reviewer: (reviewerId && reviewerId !== '' && reviewerId !== 'null') ? { connect: { id: reviewerId } } : { connect: { id: originatorId } },
                weight: parseFloat(String(weight)) || 1.0,
                contributionWeight: parseFloat(String(contributionWeight)) || 0,
                parentTarget: (parentTargetId && parentTargetId !== '' && parentTargetId !== 'null') ? { connect: { id: parentTargetId } } : undefined,
                status: 'ASSIGNED',
                metrics: {
                    create: (metrics || []).map((m) => ({
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
            await (0, websocket_service_1.notify)(assigneeId, '🎯 New Target Assigned', `You have been assigned a new target: ${title}`, 'INFO', '/performance');
        }
        return target;
    }
    /**
     * Cascade a Department target to individual staff members
     */
    static async cascadeTarget(parentTargetId, staffAssignments, managerId, organizationId) {
        const parentTarget = await client_1.default.target.findUnique({
            where: { id: parentTargetId, organizationId },
            include: { metrics: true }
        });
        if (!parentTarget)
            throw new Error('Parent target not found');
        if (parentTarget.level !== 'DEPARTMENT')
            throw new Error('Only Department targets can be cascaded');
        const createdTargets = [];
        for (const assignment of staffAssignments) {
            const { staffId, weightRatio = 1.0 } = assignment;
            const newTarget = await client_1.default.target.create({
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
            await (0, websocket_service_1.notify)(staffId, '🎯 Cascaded Target Assigned', `A departmental goal has been cascaded to you: ${parentTarget.title}`, 'INFO', '/performance');
        }
        return createdTargets;
    }
    /**
     * Staff acknowledges a target or requests clarification
     */
    static async acknowledge(targetId, userId, organizationId, status, message) {
        const target = await client_1.default.target.findUnique({
            where: { id: targetId, organizationId }
        });
        if (!target)
            throw new Error('Target not found');
        if (target.assigneeId !== userId)
            throw new Error('Not authorized to acknowledge this target');
        if (target.status !== 'ASSIGNED')
            throw new Error('Target is not in ASSIGNED state');
        // Explicit acknowledgement record
        await client_1.default.targetAcknowledgement.create({
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
        await client_1.default.target.update({
            where: { id: targetId },
            data: { status: nextStatus }
        });
        // Notify Originator
        await (0, websocket_service_1.notify)(target.originatorId, status === 'ACKNOWLEDGED' ? '✅ Target Acknowledged' : '❓ Clarification Requested', `Staff ${userId} has ${status.toLowerCase()} the target: ${target.title}`, status === 'ACKNOWLEDGED' ? 'SUCCESS' : 'WARNING', '/team');
        return target;
    }
    /**
     * Update an existing target and its metrics
     */
    static async updateTarget(targetId, orgId, data) {
        const { title, description, dueDate, weight, contributionWeight, status, metrics } = data;
        const target = await client_1.default.target.findUnique({
            where: { id: targetId, organizationId: orgId },
            include: { metrics: true }
        });
        if (!target)
            throw new Error('Target not found');
        return await client_1.default.$transaction(async (tx) => {
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
                    }
                    else {
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
    static async updateProgress(targetId, metricUpdates, userId, organizationId, submitForReview = false) {
        const target = await client_1.default.target.findUnique({
            where: { id: targetId, organizationId },
            include: { metrics: true }
        });
        if (!target)
            throw new Error('Target not found');
        if (target.assigneeId !== userId)
            throw new Error('Not authorized to update this target');
        // Spec says: Progress updates allowed only if ACKNOWLEDGED or IN_PROGRESS
        if (!['ACKNOWLEDGED', 'IN_PROGRESS'].includes(target.status)) {
            throw new Error(`Cannot update progress when target is ${target.status}`);
        }
        for (const update of metricUpdates) {
            const { metricId, value, comment } = update;
            const metric = target.metrics.find(m => m.id === metricId);
            if (!metric)
                continue;
            // Create update log
            await client_1.default.targetUpdate.create({
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
                await client_1.default.targetMetric.update({
                    where: { id: metricId },
                    data: { currentValue: parseFloat(value) }
                });
            }
        }
        const newStatus = submitForReview ? 'UNDER_REVIEW' : 'IN_PROGRESS';
        const updatedTarget = await client_1.default.target.update({
            where: { id: targetId },
            data: { status: newStatus }
        });
        if (submitForReview && target.reviewerId) {
            await (0, websocket_service_1.notify)(target.reviewerId, '🎯 Target Awaiting Review', `Target "${target.title}" has been submitted for review.`, 'INFO', '/team');
        }
        return updatedTarget;
    }
    /**
     * Reviewer scores or rejects a target
     */
    static async reviewTarget(targetId, reviewerId, organizationId, approved, feedback) {
        const target = await client_1.default.target.findUnique({
            where: { id: targetId, organizationId }
        });
        if (!target)
            throw new Error('Target not found');
        if (target.reviewerId !== reviewerId)
            throw new Error('Not authorized to review this target');
        if (target.status !== 'UNDER_REVIEW')
            throw new Error('Target is not awaiting review');
        const newStatus = approved ? 'COMPLETED' : 'IN_PROGRESS';
        const updatedTarget = await client_1.default.target.update({
            where: { id: targetId },
            data: { status: newStatus }
        });
        if (target.assigneeId) {
            await (0, websocket_service_1.notify)(target.assigneeId, approved ? '🎉 Target Completed' : '🔄 Target Returned', approved ? `Your target "${target.title}" has been marked as completed.` : `Your target was returned for correction: ${feedback}`, approved ? 'SUCCESS' : 'WARNING', '/performance');
        }
        return updatedTarget;
    }
    /**
     * Calculate strategic rollup for a parent target
     */
    static async getStrategicRollup(targetId, organizationId) {
        const parent = await client_1.default.target.findUnique({
            where: { id: targetId, organizationId },
            include: {
                childTargets: {
                    include: { metrics: true }
                },
                metrics: true
            }
        });
        if (!parent)
            return null;
        // Calculate progress of children
        const childContributions = parent.childTargets.map(child => {
            const progress = this.calculateTargetProgress(child);
            return {
                id: child.id,
                title: child.title,
                progress: progress,
                contributionWeight: child.contributionWeight || 0,
                weightedProgress: (progress * (child.contributionWeight || 0)) / 100
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
     * Delete a target and its associated metrics/records
     */
    static async deleteTarget(targetId, orgId) {
        const target = await client_1.default.target.findFirst({
            where: { id: targetId, organizationId: orgId }
        });
        if (!target)
            throw new Error('Target not found');
        return await client_1.default.$transaction(async (tx) => {
            // 1. Delete Metrics
            await tx.targetMetric.deleteMany({
                where: { targetId }
            });
            // 2. Delete Updates (if model exists)
            try {
                await tx.targetUpdate.deleteMany({
                    where: { targetId }
                });
            }
            catch (e) { }
            // 3. Delete Acknowledgements (if model exists)
            try {
                await tx.targetAcknowledgement.deleteMany({
                    where: { targetId }
                });
            }
            catch (e) { }
            // 4. Delete the target itself
            return await tx.target.delete({
                where: { id: targetId }
            });
        });
    }
    static calculateTargetProgress(target) {
        if (!target.metrics || target.metrics.length === 0)
            return 0;
        let totalProgress = 0;
        let totalWeight = 0;
        target.metrics.forEach((m) => {
            if (m.targetValue && m.targetValue > 0) {
                const progress = Math.min(100, (m.currentValue / m.targetValue) * 100);
                totalProgress += progress * (m.weight || 1.0);
                totalWeight += (m.weight || 1.0);
            }
        });
        return totalWeight > 0 ? totalProgress / totalWeight : 0;
    }
}
exports.TargetService = TargetService;
