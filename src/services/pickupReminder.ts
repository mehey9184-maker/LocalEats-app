const minute = 60_000;
const automaticDelay = 12 * minute;
const automaticLifetime = 60 * minute;
const snoozeDelay = 10 * minute;
const snoozeGrace = 15 * minute;

export type PickupReminderState = {
  automaticShown?: boolean;
  acknowledged?: boolean;
  snoozedUntil?: number;
};

export function pickupReminderDue(state: PickupReminderState, readyAt: number | undefined, now: number) {
  if (state.acknowledged) return false;
  if (state.snoozedUntil !== undefined) {
    return now >= state.snoozedUntil && now < state.snoozedUntil + snoozeGrace;
  }
  if (state.automaticShown || readyAt === undefined || !Number.isFinite(readyAt)) return false;
  const age = now - readyAt;
  return age >= automaticDelay && age < automaticLifetime;
}

export function schedulePickupReminder(now: number): PickupReminderState {
  return {automaticShown: true, snoozedUntil: now + snoozeDelay};
}
