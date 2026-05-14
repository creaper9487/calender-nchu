export interface Course {
  courseName: string;
  instructor: string;
  room: string;
  courseCode: string;
  dayOfWeek: number;
  timeSlot: string;
  periodIndex: number;
}

export interface DetailedScheduleData {
  semester: string;
  studentId: string;
  studentName: string;
  courses: Course[];
  timeSlots: string[];
}

export interface ScheduleData {
  legacy?: boolean;
  data?: boolean[][];
  semester?: string;
  studentId?: string;
  studentName?: string;
  courses?: Course[];
  timeSlots?: string[];
}

export interface ScheduleDocument extends DetailedScheduleData {
  createdAt: Date;
  updatedAt: Date;
}

export interface FreeBlock {
  dayOfWeek: number;
  fromPeriod: number;
  toPeriod: number;
  length: number;
  fromTime: string;
  toTime: string;
}
