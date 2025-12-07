
export enum Role {
  ADMIN = 'ADMIN',
  INTERVIEWER = 'INTERVIEWER',
  STUDENT = 'STUDENT'
}

export enum Stage {
  CLASSES = 'Classes',
  INTERVIEWS = 'Interviews',
  SUCCESSFUL = 'Successful',
  UNSUCCESSFUL = 'Unsuccessful'
}

export interface User {
  id: string;
  name: string;
  phone: string; // Used as ID for students, Username for interviewers
  email?: string; // For Google Calendar invites
  role: Role;
  password?: string; // For Admin/Interviewer
  approved: boolean; // For Students
}

export interface InterviewSlot {
  id: string;
  studentId: string;
  interviewerId: string | null; // Null if not yet assigned specific interviewer, or pooled
  date: string; // ISO Date string YYYY-MM-DD
  startTime: string; // HH:mm
  durationMinutes: number;
  stage: Stage;
  companyName?: string;
}

export interface BlockedSlot {
  id: string;
  date: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  reason?: string;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  timestamp?: string;
}

export const HOURS_START = 9; // 9 AM
export const HOURS_END = 20.5; // 8:30 PM

// For context
export interface AppState {
  currentUser: User | null;
  users: User[];
  interviews: InterviewSlot[];
  blockedSlots: BlockedSlot[];
}

export interface AuthContextType {
  state: AppState;
  login: (identifier: string, passwordOrPhone: string, role: Role) => Promise<boolean>;
  logout: () => void;
  registerStudent: (name: string, phone: string) => Promise<boolean>;
  approveStudent: (studentId: string) => void;
  createInterviewer: (name: string, username: string, password: string, email: string) => void;
  scheduleInterview: (studentId: string, date: string, startTime: string, duration: number, companyName: string) => void;
  updateInterviewStage: (interviewId: string, newStage: Stage) => void;
  assignInterviewer: (interviewId: string, interviewerId: string) => void;
  blockSlot: (date: string, startTime: string, endTime: string) => void;
}
