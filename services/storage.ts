
import { supabase } from './supabase';
import { User, InterviewSlot, BlockedSlot, Notification, Role, Stage } from '../types';

// Initial Admin User (Fallback if DB is empty or connection fails)
const INITIAL_ADMIN: User = {
  id: 'admin-1',
  name: 'Administrator',
  phone: 'aikidspro', 
  email: 'admin@aikids.com',
  role: Role.ADMIN,
  password: '85230',
  approved: true
};

export const api = {
  // Fetch all data (used for initial load and sync)
  fetchFullState: async () => {
    try {
      const [usersRes, interviewsRes, blocksRes, notifsRes] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('interviews').select('*'),
        supabase.from('blocked_slots').select('*'),
        supabase.from('notifications').select('*')
      ]);

      // Check for critical errors (Users table is essential)
      if (usersRes.error) {
        console.error("Supabase Error (Users):", JSON.stringify(usersRes.error, null, 2));
        throw new Error(`Failed to fetch users: ${usersRes.error.message}`);
      }
      
      if (interviewsRes.error) console.warn("Supabase Warning (Interviews):", interviewsRes.error.message);
      if (blocksRes.error) console.warn("Supabase Warning (BlockedSlots):", blocksRes.error.message);
      if (notifsRes.error) console.warn("Supabase Warning (Notifications):", notifsRes.error.message);
      
      // Map DB snake_case to CamelCase
      const users: User[] = (usersRes.data || []).map(u => ({
        id: u.id,
        name: u.name,
        phone: u.phone,
        email: u.email,
        role: (u.role as Role) || Role.STUDENT,
        password: u.password,
        approved: u.approved
      }));

      // If no users found (and no error), return initial admin so the system isn't locked out
      if (users.length === 0) {
        users.push(INITIAL_ADMIN);
      }

      const interviews: InterviewSlot[] = (interviewsRes.data || []).map(i => ({
        id: i.id,
        studentId: i.student_id,
        interviewerId: i.interviewer_id,
        date: i.date,
        startTime: i.start_time,
        durationMinutes: i.duration_minutes,
        stage: i.stage as Stage,
        companyName: i.company_name
      }));

      const blockedSlots: BlockedSlot[] = (blocksRes.data || []).map(b => ({
        id: b.id,
        date: b.date,
        startTime: b.start_time,
        endTime: b.end_time,
        reason: b.reason
      }));

      const notifications: Notification[] = (notifsRes.data || []).map(n => ({
        id: n.id,
        userId: n.user_id,
        message: n.message,
        read: n.read,
        timestamp: n.timestamp
      }));

      return { users, interviews, blockedSlots, notifications };

    } catch (e: any) {
      // Detailed logging to fix [object Object] report
      const msg = e.message || JSON.stringify(e);
      console.error("Supabase Sync Error:", msg);
      // Return local fallback state so app doesn't crash
      return { users: [INITIAL_ADMIN], interviews: [], blockedSlots: [], notifications: [] };
    }
  },

  // --- Actions ---

  createUser: async (user: User) => {
    const { data, error } = await supabase.from('users').insert({
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      password: user.password,
      approved: user.approved
    });
    if (error) console.error("Error creating user:", error.message);
    return { data, error };
  },

  updateUser: async (id: string, updates: Partial<User>) => {
    const { data, error } = await supabase.from('users').update(updates).eq('id', id);
    if (error) console.error("Error updating user:", error.message);
    return { data, error };
  },

  createInterview: async (interview: InterviewSlot) => {
    const { data, error } = await supabase.from('interviews').insert({
      id: interview.id,
      student_id: interview.studentId,
      interviewer_id: interview.interviewerId,
      date: interview.date,
      start_time: interview.startTime,
      duration_minutes: interview.durationMinutes,
      stage: interview.stage,
      company_name: interview.companyName
    });
    if (error) console.error("Error creating interview:", error.message);
    return { data, error };
  },

  updateInterview: async (id: string, updates: Partial<InterviewSlot>) => {
    const payload: any = {};
    if (updates.studentId !== undefined) payload.student_id = updates.studentId;
    if (updates.interviewerId !== undefined) payload.interviewer_id = updates.interviewerId;
    if (updates.date !== undefined) payload.date = updates.date;
    if (updates.startTime !== undefined) payload.start_time = updates.startTime;
    if (updates.durationMinutes !== undefined) payload.duration_minutes = updates.durationMinutes;
    if (updates.stage !== undefined) payload.stage = updates.stage;
    if (updates.companyName !== undefined) payload.company_name = updates.companyName;

    const { data, error } = await supabase.from('interviews').update(payload).eq('id', id);
    if (error) console.error("Error updating interview:", error.message);
    return { data, error };
  },

  deleteInterview: async (id: string) => {
    const { error } = await supabase.from('interviews').delete().eq('id', id);
    if (error) console.error("Error deleting interview:", error.message);
    return { error };
  },

  createBlock: async (block: BlockedSlot) => {
    const { data, error } = await supabase.from('blocked_slots').insert({
      id: block.id,
      date: block.date,
      start_time: block.startTime,
      end_time: block.endTime,
      reason: block.reason
    });
    if (error) console.error("Error creating block:", error.message);
    return { data, error };
  },

  deleteBlock: async (id: string) => {
    const { error } = await supabase.from('blocked_slots').delete().eq('id', id);
    if (error) console.error("Error deleting block:", error.message);
    return { error };
  },

  createNotification: async (notif: Notification) => {
    const { data, error } = await supabase.from('notifications').insert({
      id: notif.id,
      user_id: notif.userId,
      message: notif.message,
      read: notif.read,
      timestamp: notif.timestamp
    });
    if (error) console.error("Error creating notification:", error.message);
    return { data, error };
  },

  deleteNotification: async (id: string) => {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) console.error("Error deleting notification:", error.message);
    return { error };
  }
};
