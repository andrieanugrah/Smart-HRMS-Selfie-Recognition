/**
 * Date & Timezone utilities for Smart HRMS.
 * Default timezone is Asia/Jakarta (WIB UTC+7).
 */

export const DEFAULT_TIMEZONE = 'Asia/Jakarta';

/**
 * Returns YYYY-MM-DD in the specified timezone (default: Asia/Jakarta).
 */
export function getTodayDateString(timezone = DEFAULT_TIMEZONE, date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Returns current hour (0-23) in the specified timezone.
 */
export function getHourInTimezone(timezone = DEFAULT_TIMEZONE, date = new Date()): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    hour12: false,
  });
  return parseInt(formatter.format(date), 10);
}

/**
 * Calculates business days (Mon-Fri) between two YYYY-MM-DD date strings inclusive.
 */
export function calculateBusinessDays(startDateStr: string, endDateStr: string): number {
  const [sy, sm, sd] = startDateStr.split('-').map(Number);
  const [ey, em, ed] = endDateStr.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  let count = 0;
  const cur = new Date(start);

  while (cur <= end) {
    const dayOfWeek = cur.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}
