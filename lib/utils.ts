// Shared utility functions

/**
 * Generate all 144 student IDs.
 * Floors 2–10, rooms 1–4 per floor, students A–D per room.
 */
export function generateAllStudentIds(): string[] {
  const ids: string[] = [];
  const suffixes = ["A", "B", "C", "D"];
  for (let floor = 2; floor <= 10; floor++) {
    for (let room = 1; room <= 4; room++) {
      for (const suffix of suffixes) {
        ids.push(`${floor}0${room}${suffix}`);
      }
    }
  }
  return ids;
}

/**
 * Get the room number from a student ID.
 * e.g. "201A" → "201", "1003B" → "1003"
 */
export function getRoomFromStudentId(studentId: string): string {
  return studentId.slice(0, -1);
}

/**
 * Format a date as YYYY-MM-DD for database use.
 */
export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Get today + next 2 days as bookable dates (IST).
 */
export function getBookableDates(): string[] {
  const now = new Date();
  // Use IST offset
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);

  const dates: string[] = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(istNow);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

/**
 * Format a date string (YYYY-MM-DD) to display format.
 * e.g. "2024-08-15" → "Thu, 15 Aug"
 */
export function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/**
 * Check if a date string is today (in IST).
 */
export function isToday(dateStr: string): boolean {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(new Date().getTime() + istOffset);
  const today = istNow.toISOString().split("T")[0];
  return dateStr === today;
}

/**
 * Default password for generated student accounts.
 * Format: Room<studentId>@hostel — admin should reset.
 */
export function defaultStudentPassword(studentId: string): string {
  return `Room${studentId}@hostel`;
}

/**
 * Validate a phone number (basic Indian number check).
 */
export function isValidPhone(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone.replace(/\s/g, ""));
}
