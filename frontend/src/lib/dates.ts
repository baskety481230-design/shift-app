import { addMonths, eachDayOfInterval, endOfMonth, format, isSameDay, isToday, startOfMonth, startOfWeek, endOfWeek } from "date-fns";

export const TODAY = new Date();
export const HORIZON_END = addMonths(TODAY, 3);

export function fmtDate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}
export function fmtMonthLabel(d: Date): string {
  return format(d, "yyyy年 M月");
}
export function buildMonthGrid(monthStart: Date): Date[] {
  // Always 6 rows × 7 cols starting Monday
  const start = startOfWeek(startOfMonth(monthStart), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}
export const WEEKDAYS_JA = ["月", "火", "水", "木", "金", "土", "日"];

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map((s) => parseInt(s, 10));
  return h * 60 + m;
}
export function minutesToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
export function shiftDurationHours(start: string, end: string, breakMinutes: number): number {
  return Math.max(0, timeToMinutes(end) - timeToMinutes(start) - breakMinutes) / 60;
}
export { isSameDay, isToday };
