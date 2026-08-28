// Single source of truth for the leave-processing action string sent to
// POST /leave/process. The server only recognizes these exact literals.
// A past bug: an orphaned component sent 'APPROVED'/'REJECTED' instead of
// 'APPROVE'/'REJECT', which silently rejected leaves clicked as "Approve".
// Reference these constants instead of hand-typing the strings again.
export const LEAVE_ACTIONS = {
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
} as const;
