import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/websocket.service', () => ({
  notify: vi.fn().mockResolvedValue(undefined),
  initWebSocket: vi.fn(),
}));

import prisma from '../prisma/client';
import { LeaveService } from '../services/leave.service';
import { notify } from '../services/websocket.service';

const notifyMock = vi.mocked(notify);

const employeeId = '22222222-2222-4222-8222-222222222222';
const leaveId = '33333333-3333-4333-8333-333333333333';
const directorId = '77777777-7777-4777-8777-777777777777'; // performs final sign-off, rank 80
const mdId = '88888888-8888-4888-8888-888888888888'; // the org's actual MD

const baseLeave = {
  id: leaveId,
  employeeId,
  organizationId: 'org-test',
  status: 'MD_REVIEW',
  startDate: new Date('2026-08-01'),
  endDate: new Date('2026-08-05'),
  leaveDays: 3,
  employee: { fullName: 'Test Account', supervisorId: null, departmentId: null, role: 'STAFF' },
};

describe('LeaveService.mdFinalReview — MD register notification', () => {
  let userFindFirst: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    (prisma as any).leaveRequest = {
      findUnique: vi.fn().mockResolvedValue(baseLeave),
    };
    (prisma.user.findUnique as any).mockResolvedValue({ id: directorId, role: 'DIRECTOR' });

    userFindFirst = vi.fn().mockResolvedValue({ id: mdId, role: 'MD' });

    (prisma as any).$transaction = vi.fn((fn: (tx: any) => Promise<any>) =>
      fn({
        leaveRequest: {
          update: vi.fn().mockResolvedValue({ id: leaveId, status: 'APPROVED' }),
        },
        user: {
          findUnique: vi.fn().mockResolvedValue({
            id: employeeId,
            leaveBalance: 20,
            leaveAllowance: 24,
            leaveBroughtForward: 0,
            organization: { defaultLeaveAllowance: 24 },
          }),
          update: vi.fn(),
          findFirst: userFindFirst,
        },
      })
    );
  });

  it('notifies the org MD with a register confirmation when a Director approves', async () => {
    await LeaveService.mdFinalReview(leaveId, directorId, true, 'Approved');

    const mdCall = notifyMock.mock.calls.find(call => call[0] === mdId);
    expect(mdCall).toBeDefined();
    expect(mdCall![1]).toMatch(/Register/i);
    expect(mdCall![4]).toBe('/leave?tab=REGISTER');
  });

  it('does not notify the MD a second time when the MD is the one approving', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: mdId, role: 'MD' });

    await LeaveService.mdFinalReview(leaveId, mdId, true, 'Approved');

    const mdCall = notifyMock.mock.calls.find(call => call[0] === mdId && /Register/i.test(call[1]));
    expect(mdCall).toBeUndefined();
  });

  it('does not send a register notification on rejection', async () => {
    await LeaveService.mdFinalReview(leaveId, directorId, false, 'Not enough coverage');

    const registerCall = notifyMock.mock.calls.find(call => /Register/i.test(call[1] || ''));
    expect(registerCall).toBeUndefined();
  });
});
