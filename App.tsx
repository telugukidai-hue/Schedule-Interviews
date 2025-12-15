
import React, { useState, useEffect } from 'react';
import { api } from './services/storage'; // This is now our Supabase API wrapper
import { supabase } from './services/supabase';
import { User, Role, Stage, InterviewSlot, BlockedSlot, Notification } from './types';
import { Auth } from './components/Auth';
import { AdminDashboard } from './components/AdminDashboard';
import { StudentScheduler } from './components/StudentScheduler';
import { InterviewerGrid } from './components/InterviewerGrid';
import { Button } from './components/Button';
import { LogOut, Layout, UserCircle } from 'lucide-react';

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  
  // App State
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [interviews, setInterviews] = useState<InterviewSlot[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  const [authView, setAuthView] = useState<'student' | 'admin'>('student');

  // Fetch Data Function
  const refreshData = async () => {
    const data = await api.fetchFullState();
    setAllUsers(data.users);
    setInterviews(data.interviews);
    setBlockedSlots(data.blockedSlots);
    setNotifications(data.notifications);
  };

  // Initial Load & Realtime Subscription
  useEffect(() => {
    const init = async () => {
      await refreshData();
      
      // Restore session
      const savedSessionId = localStorage.getItem('interview_flow_session_user_id');
      if (savedSessionId) {
        // We need to wait for data to be loaded to find the user
        const data = await api.fetchFullState();
        const found = data.users.find(u => u.id === savedSessionId);
        if (found) {
          setUser(found);
        }
      }
      setIsLoading(false);
    };

    init();

    // Realtime Subscription
    const channel = supabase.channel('main_db_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        (payload) => {
          console.log('Realtime change received!', payload);
          refreshData(); // Simple strategy: refetch all on any change
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error("Realtime Connection Error:", err);
        }
        if (status === 'SUBSCRIBED') {
          console.log("Connected to Realtime DB");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Sync current user state if they are updated in DB
  useEffect(() => {
    if (user && allUsers.length > 0) {
      const freshUser = allUsers.find(u => u.id === user.id);
      if (freshUser && (freshUser.approved !== user.approved || freshUser.role !== user.role || freshUser.name !== user.name)) {
        setUser(freshUser);
      }
    }
  }, [allUsers, user]);

  const handleLogin = (identifier: string, passOrPhone: string, role: Role) => {
    const found = allUsers.find(u => {
      if (role === Role.STUDENT) {
        return u.name.toLowerCase() === identifier.toLowerCase() && u.phone === passOrPhone && u.role === Role.STUDENT;
      } else {
        const isNameMatch = u.name === identifier;
        const isUsernameMatch = u.phone === identifier;
        const isRoleMatch = u.role === role;
        return isRoleMatch && (isNameMatch || isUsernameMatch) && u.password === passOrPhone;
      }
    });

    if (found) {
      setUser(found);
      localStorage.setItem('interview_flow_session_user_id', found.id);
      return true;
    }
    return false;
  };

  const handleRegister = async (name: string, phone: string) => {
    if (allUsers.find(u => u.phone === phone)) return false;
    const newUser: User = { id: `student-${Date.now()}`, name, phone, role: Role.STUDENT, approved: false };
    
    // Optimistic Update
    setAllUsers(prev => [...prev, newUser]);
    setUser(newUser);
    localStorage.setItem('interview_flow_session_user_id', newUser.id);

    // DB Update
    await api.createUser(newUser);
    return true;
  };

  const handleAddCandidate = async (name: string, phone: string) => {
    if (allUsers.find(u => u.phone === phone)) return;
    const newUser: User = { id: `student-${Date.now()}`, name, phone, role: Role.STUDENT, approved: true };
    
    const newInterview: InterviewSlot = {
      id: `int-${Date.now()}`,
      studentId: newUser.id,
      interviewerId: null,
      date: new Date().toISOString().split('T')[0],
      startTime: '00:00',
      durationMinutes: 0,
      stage: Stage.CLASSES,
      companyName: 'Pending'
    };

    setAllUsers(prev => [...prev, newUser]);
    setInterviews(prev => [...prev, newInterview]);

    await api.createUser(newUser);
    await api.createInterview(newInterview);
  };

  const handleCreateInterviewer = async (name: string, username: string, pass: string, email: string) => {
      const newInt: User = {
        id: `int-${Date.now()}`,
        name: name,
        phone: username, 
        email: email,
        role: Role.INTERVIEWER,
        password: pass,
        approved: true
      };
      setAllUsers(prev => [...prev, newInt]);
      await api.createUser(newInt);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('interview_flow_session_user_id');
    setAuthView('student');
  };

  const handleApprove = async (studentId: string) => {
    // Optimistic
    setAllUsers(prev => prev.map(u => u.id === studentId ? { ...u, approved: true } : u));
    
    const newInterview: InterviewSlot = {
      id: `int-${Date.now()}`,
      studentId: studentId,
      interviewerId: null,
      date: new Date().toISOString().split('T')[0],
      startTime: '00:00', 
      durationMinutes: 0,
      stage: Stage.CLASSES, 
      companyName: 'Pending'
    };
    setInterviews(prev => [...prev, newInterview]);

    // DB
    await api.updateUser(studentId, { approved: true });
    await api.createInterview(newInterview);
  };

  const handleSchedule = async (date: string, startTime: string, duration: number, companyName: string) => {
    if (!user) return;
    
    const interviewers = allUsers.filter(u => u.role === Role.INTERVIEWER);
    let assignedInterviewerId = null;
    if (interviewers.length > 0) {
      assignedInterviewerId = interviewers[0].id;
    }

    const existingPlaceholder = interviews.find(i => i.studentId === user.id && i.durationMinutes === 0);
    
    if (existingPlaceholder) {
      const updates = {
        date,
        startTime,
        durationMinutes: duration,
        companyName,
        interviewerId: assignedInterviewerId
      };
      
      setInterviews(prev => prev.map(i => i.id === existingPlaceholder.id ? { ...i, ...updates } : i));
      await api.updateInterview(existingPlaceholder.id, updates);
    } else {
      const newInterview: InterviewSlot = {
        id: `int-${Date.now()}`,
        studentId: user.id,
        interviewerId: assignedInterviewerId,
        date,
        startTime,
        durationMinutes: duration,
        stage: Stage.CLASSES,
        companyName
      };
      setInterviews(prev => [...prev, newInterview]);
      await api.createInterview(newInterview);
    }
  };

  const handleCancelInterview = async (interviewId: string) => {
    setInterviews(prev => prev.filter(i => i.id !== interviewId));
    await api.deleteInterview(interviewId);
  };
  
  const handleAdminCancelInterview = async (interviewId: string) => {
    const interview = interviews.find(i => i.id === interviewId);
    if (interview) {
      const notif: Notification = {
        id: `notif-${Date.now()}`,
        userId: interview.studentId,
        message: `Admin cancelled your interview on ${interview.date} at ${interview.startTime}. Please contact them and reschedule.`,
        read: false,
        timestamp: new Date().toISOString()
      };
      setNotifications(prev => [...prev, notif]);
      setInterviews(prev => prev.filter(i => i.id !== interviewId));

      await api.createNotification(notif);
      await api.deleteInterview(interviewId);
    }
  };
  
  const handleClearNotification = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    await api.deleteNotification(id);
  };

  const handleAssign = async (interviewId: string, interviewerId: string) => {
    setInterviews(prev => prev.map(i => i.id === interviewId ? { ...i, interviewerId } : i));
    await api.updateInterview(interviewId, { interviewerId });
  };

  const handleUpdateStage = async (interviewId: string, stage: Stage) => {
    setInterviews(prev => prev.map(i => i.id === interviewId ? { ...i, stage } : i));
    await api.updateInterview(interviewId, { stage });
  };

  const handleBlockSlot = async (date: string, startTime: string, endTime: string) => {
    const newBlock: BlockedSlot = { id: `block-${Date.now()}`, date, startTime, endTime };
    setBlockedSlots(prev => [...prev, newBlock]);
    await api.createBlock(newBlock);
  };

  const handleDeleteBlock = async (id: string) => {
    setBlockedSlots(prev => prev.filter(b => b.id !== id));
    await api.deleteBlock(id);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <span className="ml-3 text-slate-500 font-medium">Connecting to Database...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-slate-50 z-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-50/50 to-slate-100/50"></div>
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-200/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        </div>
        <div className="absolute top-4 right-4 z-[50]">
          <Button 
            variant="ghost" 
            onClick={() => setAuthView(authView === 'student' ? 'admin' : 'student')}
            className="text-xs bg-white/80 backdrop-blur shadow-sm hover:bg-white border border-white/50 cursor-pointer pointer-events-auto"
          >
            {authView === 'student' ? 'Admin / Interviewer Login' : 'Student Login'}
          </Button>
        </div>
        <div className="z-10 w-full h-full flex flex-col flex-1 relative justify-center">
           <Auth mode={authView} onLogin={handleLogin} onRegister={handleRegister} />
        </div>
      </div>
    );
  }

  // Find default interviewer for StudentScheduler (if any)
  const defaultInterviewer = allUsers.find(u => u.role === Role.INTERVIEWER) || null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg text-white shadow-sm">
               <Layout className="w-5 h-5" />
            </div>
            <span className="font-bold text-xl text-slate-800 tracking-tight">InterviewFlow</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
              <UserCircle className="w-4 h-4 text-slate-500" />
              <span className="font-medium">{user.name}</span>
            </div>
            <Button variant="secondary" onClick={handleLogout} className="text-xs sm:text-sm">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
        {user.role === Role.ADMIN && (
          <AdminDashboard 
            users={allUsers}
            interviews={interviews}
            blockedSlots={blockedSlots}
            onApprove={handleApprove}
            onAssign={handleAssign}
            onUpdateStage={handleUpdateStage}
            onCreateInterviewer={handleCreateInterviewer}
            onBlockSlot={handleBlockSlot}
            onDeleteBlock={handleDeleteBlock}
            onAddCandidate={handleAddCandidate}
            onCancel={handleAdminCancelInterview}
          />
        )}
        {user.role === Role.INTERVIEWER && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Interviewer Dashboard</h1>
            <div className="bg-slate-100 p-6 rounded-2xl border border-slate-200">
              <InterviewerGrid 
                interviews={interviews}
                interviewers={allUsers.filter(u => u.role === Role.INTERVIEWER)}
                users={allUsers}
                onAssign={handleAssign}
                canMove={true}
                currentInterviewerId={user.id}
                onAddStaff={() => {}} 
                onCancel={() => {}} 
              />
            </div>
          </div>
        )}
        {user.role === Role.STUDENT && (
          <StudentScheduler 
            student={user}
            interviews={interviews}
            blockedSlots={blockedSlots}
            notifications={notifications}
            onSchedule={handleSchedule}
            onCancel={handleCancelInterview}
            onClearNotification={handleClearNotification}
            defaultInterviewer={defaultInterviewer || undefined}
          />
        )}
      </main>
    </div>
  );
};

export default App;
