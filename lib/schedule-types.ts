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
  studentName: string;
  courses: Course[];
  timeSlots: string[];
}

export interface ScheduleData {
  legacy?: boolean;
  data?: boolean[][];
  semester?: string;
  studentName?: string;
  courses?: Course[];
  timeSlots?: string[];
}

export interface ScheduleDocument extends DetailedScheduleData {
  email: string;
  createdAt: Date;
  updatedAt: Date;
}
