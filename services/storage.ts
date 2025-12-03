
import { User, Role, InterviewSlot, BlockedSlot } from '../types';

const STORAGE_KEY = 'interview_flow_db_v3';

const INITIAL_ADMIN: User = {
  id: 'admin-1',
  name: 'aikidspro',
  phone: 'admin',
  role: Role.ADMIN,
  password: '85230',
  approved: true
};

// Start with NO default interviewers as requested
const INITIAL_INTERVIEWERS: User[] = [];

interface DB {
  users: User[];
  interviews: InterviewSlot[];
  blockedSlots: BlockedSlot[];
}

export const loadData = (): DB => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    // Migration for existing data if blockedSlots is missing
    if (!parsed.blockedSlots) parsed.blockedSlots = [];
    return parsed;
  }
  return {
    users: [INITIAL_ADMIN, ...INITIAL_INTERVIEWERS],
    interviews: [],
    blockedSlots: []
  };
};

export const saveData = (data: DB) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};
