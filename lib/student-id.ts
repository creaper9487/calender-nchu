export const STUDENT_ID_RE = /^[A-Za-z0-9]{4,12}$/;

export function isValidStudentId(id: string): boolean {
  return STUDENT_ID_RE.test(id.trim());
}
