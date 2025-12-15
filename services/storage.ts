
import { User, InterviewSlot, BlockedSlot, Notification, Role, Stage } from '../types';
import { supabase } from './supabase';

// Helper to Map DB (snake_case) to App (camelCase)
const fromDbUser = (u: any): User => ({
  id: u.id,
  name: u.name,
  phone: u.phone,
  email: u.email,
  role: u.role as Role,
  password: u.password,
  approved: u.approved
});

// Helper to Map App (camelCase) to DB (snake_case)
// Converting undefined to null to strictly satisfy Supabase/Postgres constraints
const toDbUser = (u: User) => ({
  id: u.id,
  name: u.name,
  phone: u.phone,
  email: u.email || null,
  role: u.role,
  password: u.password || null,
  approved: u.approved
});

const fromDbInterview = (i: any): InterviewSlot => ({
  id: i.id,
  studentId: i.student_id,
  interviewerId: i.interviewer_id,
  date: i.date,
  startTime: i.start_time,
  durationMinutes: i.duration_minutes,
  stage: i.stage as Stage,
  companyName: i.company_name
});

const toDbInterview = (i: InterviewSlot) => ({
  id: i.id,
  student_id: i.studentId,
  interviewer_id: i.interviewerId || null,
  date: i.date,
  start_time: i.startTime,
  duration_minutes: i.durationMinutes,
  stage: i.stage,
  company_name: i.companyName || null
});

const fromDbBlock = (b: any): BlockedSlot => ({
  id: b.id,
  date: b.date,
  startTime: b.start_time,
  endTime: b.end_time,
  reason: b.reason
});

const toDbBlock = (b: BlockedSlot) => ({
  id: b.id,
  date: b.date,
  start_time: b.startTime,
  end_time: b.endTime,
  reason: b.reason || null
});

const fromDbNotif = (n: any): Notification => ({
  id: n.id,
  userId: n.user_id,
  message: n.message,
  read: n.read,
  timestamp: n.timestamp
});

const toDbNotif = (n: Notification) => ({
  id: n.id,
  user_id: n.userId,
  message: n.message,
  read: n.read,
  timestamp: n.timestamp || null
});

// Use a UUID for the initial admin to ensure compatibility with UUID-typed primary keys
const INITIAL_ADMIN: User = {
  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  name: 'Administrator',
  phone: 'aikidspro', 
  email: 'admin@aikids.com',
  role: Role.ADMIN,
  password: '85230',
  approved: true
};

export const api = {
  fetchFullState: async () => {
    try {
      // 1. Fetch Users
      const { data: usersData, error: usersError } = await supabase.from('users').select('*');
      if (usersError) {
        console.error('Error fetching users:', usersError);
        // Do not throw here, allow partial loading if possible, or handle gracefully
      }

      let users = (usersData || []).map(fromDbUser);

      // Handle Initial Admin if DB is empty or connection failed (fallback mode)
      // If the DB is completely empty (no users), we try to insert the admin.
      if (users.length === 0) {
        // Try to insert
        const { error: insertError } = await supabase.from('users').insert([toDbUser(INITIAL_ADMIN)]);
        if (!insertError) {
           users = [INITIAL_ADMIN];
        } else {
           console.error('Error creating initial admin (Check RLS Policies):', insertError);
           // Fallback to in-memory admin so user isn't locked out, but warn them
           users = [INITIAL_ADMIN];
        }
      }

      // 2. Fetch Interviews
      const { data: intData, error: intError } = await supabase.from('interviews').select('*');
      if (intError) console.error('Error fetching interviews:', intError);
      const interviews = (intData || []).map(fromDbInterview);

      // 3. Fetch Blocks
      const { data: blockData, error: blockError } = await supabase.from('blocked_slots').select('*');
      if (blockError) console.error('Error fetching blocks:', blockError);
      const blockedSlots = (blockData || []).map(fromDbBlock);

      // 4. Fetch Notifications
      const { data: notifData, error: notifError } = await supabase.from('notifications').select('*');
      if (notifError) console.error('Error fetching notifications:', notifError);
      const notifications = (notifData || []).map(fromDbNotif);

      return { users, interviews, blockedSlots, notifications };

    } catch (e) {
      console.error("Supabase Fetch Critical Error:", e);
      return { users: [INITIAL_ADMIN], interviews: [], blockedSlots: [], notifications: [] };
    }
  },

  createUser: async (user: User) => {
    const { data, error } = await supabase.from('users').insert([toDbUser(user)]).select();
    if (error) console.error("Error creating user:", error);
    return { data: data ? fromDbUser(data[0]) : null, error };
  },

  updateUser: async (id: string, updates: Partial<User>) => {
    // Map updates to snake_case
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.email !== undefined) dbUpdates.email = updates.email || null;
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.password !== undefined) dbUpdates.password = updates.password || null;
    if (updates.approved !== undefined) dbUpdates.approved = updates.approved;

    const { error } = await supabase.from('users').update(dbUpdates).eq('id', id);
    if (error) console.error("Error updating user:", error);
    return { data: null, error };
  },

  createInterview: async (interview: InterviewSlot) => {
    const { data, error } = await supabase.from('interviews').insert([toDbInterview(interview)]).select();
    if (error) console.error("Error creating interview:", error);
    return { data: data ? fromDbInterview(data[0]) : null, error };
  },

  updateInterview: async (id: string, updates: Partial<InterviewSlot>) => {
    const dbUpdates: any = {};
    if (updates.studentId !== undefined) dbUpdates.student_id = updates.studentId;
    if (updates.interviewerId !== undefined) dbUpdates.interviewer_id = updates.interviewerId || null;
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime;
    if (updates.durationMinutes !== undefined) dbUpdates.duration_minutes = updates.durationMinutes;
    if (updates.stage !== undefined) dbUpdates.stage = updates.stage;
    if (updates.companyName !== undefined) dbUpdates.company_name = updates.companyName || null;

    const { error } = await supabase.from('interviews').update(dbUpdates).eq('id', id);
    if (error) console.error("Error updating interview:", error);
    return { data: null, error };
  },

  deleteInterview: async (id: string) => {
    const { error } = await supabase.from('interviews').delete().eq('id', id);
    if (error) console.error("Error deleting interview:", error);
    return { error };
  },

  createBlock: async (block: BlockedSlot) => {
    const { data, error } = await supabase.from('blocked_slots').insert([toDbBlock(block)]).select();
    if (error) console.error("Error creating block:", error);
    return { data: data ? fromDbBlock(data[0]) : null, error };
  },

  deleteBlock: async (id: string) => {
    const { error } = await supabase.from('blocked_slots').delete().eq('id', id);
    if (error) console.error("Error deleting block:", error);
    return { error };
  },

  createNotification: async (notif: Notification) => {
    const { data, error } = await supabase.from('notifications').insert([toDbNotif(notif)]).select();
    if (error) console.error("Error creating notification:", error);
    return { data: data ? fromDbNotif(data[0]) : null, error };
  },

  deleteNotification: async (id: string) => {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) console.error("Error deleting notification:", error);
    return { error };
  }
};
