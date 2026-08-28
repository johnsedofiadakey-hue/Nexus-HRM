import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/websocket.service', () => ({
  notify: vi.fn().mockResolvedValue(undefined),
  initWebSocket: vi.fn(),
}));

import prisma from '../prisma/client';
import { LeaveService } from '../services/leave.service';

const leaveId = '33333333-3333-4333-8333-333333333333';
const employeeId = '22222222-2222-4222-8222-222222222222';
const matrixManagerId = '44444444-4444-4444-8444-444444444444';
const outsiderManagerId = '55555555-5555-4555-8555-555555555555';

describe('LeaveService.managerReview — authorization', () => {
  let leaveRequestUpdate: ReturnType<typeof vi.fn>;
  let employeeReportingFindFirst: ReturnType<typeof vi.fn>;

  const baseLeave = {
    id: leaveId,
    employeeId,
    status: 'MANAGER_REVIEW',
    managerId: null,
    relieverAcceptanceRequired: false,
    relieverId: null,
    relieverStatus: 'PENDING',
    employee: {
      role: 'STAFF',
      supervisorId: 'someone-else-entirely',
      departmentId: 10, // different from the reviewing manager's department
      fullName: 'Test Employee',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    leaveRequestUpdate = vi.fn().mockResolvedValue({ id: leaveId, status: 'MD_REVIEW' });
    employeeReportingFindFirst = vi.fn();

    (prisma as any).$transaction = vi.fn((fn: (tx: any) => Promise<any>) =>
      fn({
        leaveRequest: {
          findUnique: vi.fn().mockResolvedValue(baseLeave),
          update: leaveRequestUpdate,
        },
        user: {
          // The reviewing manager's own record (rank lookup)
          findUnique: vi.fn().mockResolvedValue({ role: 'MANAGER', departmentId: 999 }),
        },
        employeeReporting: {
          findFirst: employeeReportingFindFirst,
        },
      })
    );
  });

  it('rejects a manager who is neither primary/dept supervisor, matrix manager, nor high rank', async () => {
    employeeReportingFindFirst.mockResolvedValue(null); // no reporting line exists

    await expect(
      LeaveService.managerReview(leaveId, outsiderManagerId, true, 'ok')
    ).rejects.toThrow(/Unauthorized for Step 1 Manager Review/);

    expect(leaveRequestUpdate).not.toHaveBeenCalled();
  });

  it('allows a functional/dotted-line (matrix) manager to approve, even in a different department', async () => {
    employeeReportingFindFirst.mockResolvedValue({
      id: 'reporting-1',
      employeeId,
      managerId: matrixManagerId,
      type: 'DOTTED',
      effectiveTo: null,
    });

    const result = await LeaveService.managerReview(leaveId, matrixManagerId, true, 'Approved via functional line');

    expect(employeeReportingFindFirst).toHaveBeenCalledWith({
      where: { employeeId, managerId: matrixManagerId, effectiveTo: null },
    });
    expect(leaveRequestUpdate).toHaveBeenCalledWith({
      where: { id: leaveId },
      data: expect.objectContaining({ status: 'MD_REVIEW', managerId: matrixManagerId }),
    });
    expect(result).toEqual({ id: leaveId, status: 'MD_REVIEW' });
  });
});
