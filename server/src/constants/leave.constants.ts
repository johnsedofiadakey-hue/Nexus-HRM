// Single source of truth for the leave-processing action string sent by the
// client and checked by processLeave/respondAsReliever/managerReview/mdFinalReview.
// A past bug: an orphaned component sent 'APPROVED'/'REJECTED' instead of
// 'APPROVE'/'REJECT', which silently rejected leaves clicked as "Approve".
// Reference these constants instead of hand-typing the strings again.
export const LEAVE_ACTIONS = {
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
} as const;

export type LeaveAction = typeof LEAVE_ACTIONS[keyof typeof LEAVE_ACTIONS];
