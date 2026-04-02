"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncPunches = void 0;
const client_1 = __importDefault(require("../prisma/client"));
/**
 * Biometric Synchronization Controller
 * Handles batch uploads from physical devices or bridge scripts.
 */
const syncPunches = async (req, res) => {
    try {
        const { punches, organizationId: bodyOrgId } = req.body;
        // Multi-tenancy: prioritize orgId from auth user, fallback to body
        const userRole = req.user?.role;
        const organizationId = req.user?.organizationId || bodyOrgId || 'default-tenant';
        // Verification: Only Admin/MD/Developer can sync
        if (userRole && !['MD', 'DEV', 'HR', 'IT_ADMIN'].includes(userRole)) {
            return res.status(403).json({ error: 'Access denied: Insufficient permissions for biometric sync.' });
        }
        if (!punches || !Array.isArray(punches)) {
            return res.status(400).json({ error: 'Invalid payload: "punches" array is required.' });
        }
        const results = {
            processed: 0,
            errors: 0,
            skipped: 0,
            details: []
        };
        for (const punch of punches) {
            try {
                const { biometricId, timestamp, type = 'PUNCH' } = punch;
                const punchDate = new Date(timestamp);
                const normalizedDate = new Date(punchDate);
                normalizedDate.setHours(0, 0, 0, 0);
                // 1. Find the employee
                const employee = await client_1.default.user.findFirst({
                    where: { biometricId: biometricId.toString(), organizationId }
                });
                if (!employee) {
                    results.skipped++;
                    results.details.push(`User not found for biometricId: ${biometricId}`);
                    continue;
                }
                // 2. Find or Create Attendance Log for the day
                const existingLog = await client_1.default.attendanceLog.findUnique({
                    where: {
                        employeeId_date: {
                            employeeId: employee.id,
                            date: normalizedDate
                        }
                    }
                });
                if (!existingLog) {
                    // New Log: Initial punch is always Clock In unless specified
                    await client_1.default.attendanceLog.create({
                        data: {
                            organizationId,
                            employeeId: employee.id,
                            date: normalizedDate,
                            clockIn: punchDate,
                            source: 'BIOMETRIC',
                            status: 'PRESENT'
                        }
                    });
                }
                else {
                    // Update existing log
                    const updateData = { source: 'BIOMETRIC' };
                    if (type === 'CHECKIN' || (!existingLog.clockIn && type === 'PUNCH')) {
                        updateData.clockIn = punchDate;
                    }
                    else if (type === 'CHECKOUT' || (existingLog.clockIn && type === 'PUNCH')) {
                        // Only update clockOut if this punch is later than existing clockIn
                        if (!existingLog.clockIn || punchDate > existingLog.clockIn) {
                            updateData.clockOut = punchDate;
                        }
                    }
                    await client_1.default.attendanceLog.update({
                        where: { id: existingLog.id },
                        data: updateData
                    });
                }
                results.processed++;
            }
            catch (err) {
                results.errors++;
                results.details.push(`Error processing punch for ${punch.biometricId}: ${err.message}`);
            }
        }
        return res.json({
            message: 'Sync completed',
            ...results
        });
    }
    catch (error) {
        console.error('[BiometricSync] Fatal error:', error);
        return res.status(500).json({ error: 'Internal Server Error during sync.' });
    }
};
exports.syncPunches = syncPunches;
