/** The date selected by the movable heart in Our Calendar. Month is zero-based (0 = January). */
export interface CalendarHeartDate {
  year: number;
  month: number;
  day: number;
}

/** Validate a saved calendar date before it enters a publication or a local draft. */
export function isValidCalendarHeartDate(value: unknown): value is CalendarHeartDate {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const date = value as Record<string, unknown>;
  const { year, month, day } = date;
  if (
    typeof year !== "number" || !Number.isInteger(year) || year < 1900 || year > 2200 ||
    typeof month !== "number" || !Number.isInteger(month) || month < 0 || month > 11 ||
    typeof day !== "number" || !Number.isInteger(day) || day < 1 || day > 31
  ) {
    return false;
  }
  return day <= new Date(year, month + 1, 0).getDate();
}
