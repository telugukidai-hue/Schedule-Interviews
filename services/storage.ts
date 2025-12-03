
import { User, Role, InterviewSlot, BlockedSlot } from '../types';

const STORAGE_KEY = 'interview_flow_db_v4';

const INITIAL_ADMIN: User = {
  id: 'admin-1',
  name: 'Administrator',
  phone: 'aikidspro', // Username field
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
    try {
      const parsed = JSON.parse(stored);
      return {
        users: Array.isArray(parsed.users) ? parsed.users : [INITIAL_ADMIN],
        interviews: Array.isArray(parsed.interviews) ? parsed.interviews : [],
        blockedSlots: Array.isArray(parsed.blockedSlots) ? parsed.blockedSlots : []
      };
    } catch (e) {
      console.error("Failed to parse storage, resetting DB", e);
    }
  }
  return {
    users: [INITIAL_ADMIN, ...INITIAL_INTERVIEWERS],
    interviews: [],
    blockedSlots: []
  };
};

export const saveData = (data: DB) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save data", e);
  }
};
