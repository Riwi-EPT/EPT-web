// Student identity captured at login. Mirrors the shared StudentInfo contract
// (date/teacher are always set by the form here).
export interface StudentInfo {
  name: string;
  email: string;
  date: string;
  teacher: string;
  startedAt: string | null;
  ltiMode?: boolean;
}
