
import { User, InterviewSlot, BlockedSlot, Notification, Role, Stage } from '../types';

const KEYS = {
  USERS: 'interview_flow_users',
  INTERVIEWS: 'interview_flow_interviews',
  BLOCKS: 'interview_flow_blocks',
  NOTIFS: 'interview_flow_notifications'
};

// Initial Admin User (Fallback)
const INITIAL_ADMIN: User = {
  id: 'admin-1',
  name: 'Administrator',
  phone: 'aikidspro', 
  email: 'admin@aikids.com',
  role: Role.ADMIN,
  password: '85230',
  approved: true
};

// Helper to get data safely
const getStored = <T>(key: string, defaultVal: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultVal;
  } catch {
    return defaultVal;
  }
};

// Helper to set data and notify app
const setStored = (key: string, val: any) => {
  localStorage.setItem(key, JSON.stringify(val));
  // Dispatch a custom event so the current tab updates immediately
  window.dispatchEvent(new Event('local_storage_update'));
};

export const api = {
  // Fetch all data
  fetchFullState: async () => {
    let users = getStored<User[]>(KEYS.USERS, []);
    // Ensure admin exists if list is empty
    if (users.length === 0) {
      users = [INITIAL_ADMIN];
      setStored(KEYS.USERS, users);
    }

    const interviews = getStored<InterviewSlot[]>(KEYS.INTERVIEWS, []);
    const blockedSlots = getStored<BlockedSlot[]>(KEYS.BLOCKS, []);
    const notifications = getStored<Notification[]>(KEYS.NOTIFS, []);

    return { users, interviews, blockedSlots, notifications };
  },

  // --- Actions (Simulating Async to match previous API structure) ---

  createUser: async (user: User) => {
    const users = getStored<User[]>(KEYS.USERS, []);
    users.push(user);
    setStored(KEYS.USERS, users);
    return { data: user, error: null };
  },

  updateUser: async (id: string, updates: Partial<User>) => {
    const users = getStored<User[]>(KEYS.USERS, []);
    const index = users.findIndex(u => u.id === id);
    if (index !== -1) {
      users[index] = { ...users[index], ...updates };
      setStored(KEYS.USERS, users);
    }
    return { data: null, error: null };
  },

  createInterview: async (interview: InterviewSlot) => {
    const items = getStored<InterviewSlot[]>(KEYS.INTERVIEWS, []);
    items.push(interview);
    setStored(KEYS.INTERVIEWS, items);
    return { data: interview, error: null };
  },

  updateInterview: async (id: string, updates: Partial<InterviewSlot>) => {
    const items = getStored<InterviewSlot[]>(KEYS.INTERVIEWS, []);
    const index = items.findIndex(i => i.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...updates };
      setStored(KEYS.INTERVIEWS, items);
    }
    return { data: null, error: null };
  },

  deleteInterview: async (id: string) => {
    const items = getStored<InterviewSlot[]>(KEYS.INTERVIEWS, []);
    const newItems = items.filter(i => i.id !== id);
    setStored(KEYS.INTERVIEWS, newItems);
    return { error: null };
  },

  createBlock: async (block: BlockedSlot) => {
    const items = getStored<BlockedSlot[]>(KEYS.BLOCKS, []);
    items.push(block);
    setStored(KEYS.BLOCKS, items);
    return { data: block, error: null };
  },

  deleteBlock: async (id: string) => {
    const items = getStored<BlockedSlot[]>(KEYS.BLOCKS, []);
    const newItems = items.filter(i => i.id !== id);
    setStored(KEYS.BLOCKS, newItems);
    return { error: null };
  },

  createNotification: async (notif: Notification) => {
    const items = getStored<Notification[]>(KEYS.NOTIFS, []);
    items.push(notif);
    setStored(KEYS.NOTIFS, items);
    return { data: notif, error: null };
  },

  deleteNotification: async (id: string) => {
    const items = getStored<Notification[]>(KEYS.NOTIFS, []);
    const newItems = items.filter(i => i.id !== id);
    setStored(KEYS.NOTIFS, newItems);
    return { error: null };
  }
};
