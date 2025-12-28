
import React, { useState, useEffect, useMemo } from 'react';
import { api } from './services/storage'; 
import { supabase } from './services/supabase';
import { User, Role, Stage, InterviewSlot, BlockedSlot, Notification } from './types';
import { Auth } from './components/Auth';
import { AdminDashboard } from './components/AdminDashboard';
import { StudentScheduler } from './components/StudentScheduler';
import { InterviewerGrid } from './components/InterviewerGrid';
import { Button } from './components/Button';
import { LogOut, Layout, UserCircle, Sun, Moon, Sparkles } from 'lucide-react';

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [interviews, setInterviews] = useState<InterviewSlot[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  const [authView, setAuthView] = useState<'student' | 'admin'>('student');

  const hour = new Date().getHours();
  const isNight = hour >= 18 || hour < 6;

  const stars = useMemo(() => {
    return Array.from({ length: 150 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: `${Math.random() * 1.5 + 0.5}px`,
      delay: `${Math.random() * 5}s`,
    }));
  }, []);

  const refreshData = async () => {
    const data = await api.fetchFullState();
    setAllUsers(data.users);
    setInterviews(data.interviews);
    setBlockedSlots(data.blockedSlots);
    setNotifications(data.notifications);
  };

  useEffect(() => {
    const init = async () => {
      await refreshData();
      const savedSessionId = localStorage.getItem('interview_flow_session_user_id');
      if (savedSessionId) {
        const data = await api.fetchFullState();
        const found = data.users.find(u => u.id === savedSessionId);
        if (found) {
          setUser(found);
        } else {
            localStorage.removeItem('interview_flow_session_user_id');
        }
      }
      setIsLoading(false);
    };

    init();

    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => refreshData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleLogin = (identifier: string, passOrPhone: string, role: Role) => {
    const found = allUsers.find(u => {
      if (role === Role.STUDENT) {
        return u.name.toLowerCase() === identifier.toLowerCase() && u.phone === passOrPhone && u.role === Role.STUDENT;
      } else {
        return u.role === role && (u.name === identifier || u.phone === identifier) && u.password === passOrPhone;
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
    const newUser: User = { id: crypto.randomUUID(), name, phone, role: Role.STUDENT, approved: false };
    setAllUsers(prev => [...prev, newUser]);
    setUser(newUser);
    localStorage.setItem('interview_flow_session_user_id', newUser.id);
    await api.createUser(newUser);
    return true;
  };

  const getDefaultInterviewerId = () => {
    const staff = allUsers.filter(u => u.role === Role.INTERVIEWER);
    return staff.length > 0 ? staff[0].id : null;
  };

  const handleAddCandidate = async (name: string, phone: string) => {
    let targetUser = allUsers.find(u => u.phone === phone);
    
    if (!targetUser) {
      targetUser = { id: crypto.randomUUID(), name, phone, role: Role.STUDENT, approved: true };
      setAllUsers(prev => [...prev, targetUser!]);
      await api.createUser(targetUser);
    }

    const defaultStaffId = getDefaultInterviewerId();
    const newInterview: InterviewSlot = {
      id: crypto.randomUUID(), studentId: targetUser.id, interviewerId: defaultStaffId,
      date: new Date().toISOString().split('T')[0], startTime: '00:00',
      durationMinutes: 0, stage: Stage.CLASSES, companyName: 'New Applicant'
    };
    setInterviews(prev => [...prev, newInterview]);
    await api.createInterview(newInterview);
  };

  const handleCreateInterviewer = async (name: string, username: string, pass: string, email: string) => {
    const newInt: User = { id: crypto.randomUUID(), name, phone: username, email, role: Role.INTERVIEWER, password: pass, approved: true };
    setAllUsers(prev => [...prev, newInt]);
    await api.createUser(newInt);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('interview_flow_session_user_id');
    setAuthView('student');
  };

  const handleApprove = async (studentId: string) => {
    setAllUsers(prev => prev.map(u => u.id === studentId ? { ...u, approved: true } : u));
    await api.updateUser(studentId, { approved: true });
    
    const defaultStaffId = getDefaultInterviewerId();
    const newInterview: InterviewSlot = {
      id: crypto.randomUUID(), studentId: studentId, interviewerId: defaultStaffId,
      date: new Date().toISOString().split('T')[0], startTime: '00:00',
      durationMinutes: 0, stage: Stage.CLASSES, companyName: 'New Applicant'
    };
    setInterviews(prev => [...prev, newInterview]);
    await api.createInterview(newInterview);
  };

  const handleSchedule = async (date: string, startTime: string, duration: number, companyName: string) => {
    if (!user) return;
    const defaultStaffId = getDefaultInterviewerId();
    
    const newInterview: InterviewSlot = {
      id: crypto.randomUUID(),
      studentId: user.id,
      interviewerId: defaultStaffId, 
      date,
      startTime,
      durationMinutes: duration,
      stage: Stage.INTERVIEWS,
      companyName
    };

    setInterviews(prev => [...prev, newInterview]);
    await api.createInterview(newInterview);
  };

  const handleCancelInterview = async (interviewId: string) => {
    if (window.confirm("Reschedule or Cancel: This will release your current time slot. Proceed?")) {
      const { error } = await api.deleteInterview(interviewId);
      if (!error) {
        setInterviews(prev => prev.filter(i => i.id !== interviewId));
      } else {
        alert("Failed to cancel. Please check your network.");
      }
    }
  };

  const handleDeleteCandidate = async (interviewId: string) => {
    if (window.confirm("Permanent Removal: Remove this candidate registration?")) {
      const { error } = await api.deleteInterview(interviewId);
      if (!error) {
        setInterviews(prev => prev.filter(i => i.id !== interviewId));
      }
    }
  };
  
  const handleAdminCancelInterview = async (interviewId: string) => {
    const interview = interviews.find(i => i.id === interviewId);
    if (interview && window.confirm("Admin: Cancel this student booking?")) {
      const notif: Notification = {
        id: crypto.randomUUID(), userId: interview.studentId,
        message: `Admin Action: Your scheduled interview for ${interview.companyName} on ${interview.date} was cancelled.`,
        read: false, timestamp: new Date().toISOString()
      };
      
      const { error } = await api.deleteInterview(interviewId);
      if (!error) {
        setInterviews(prev => prev.filter(i => i.id !== interviewId));
        setNotifications(prev => [...prev, notif]);
        await api.createNotification(notif);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4 shadow-[0_0_20px_rgba(220,38,38,0.5)]"></div>
          <span className="text-red-100 font-black tracking-widest uppercase text-[10px] animate-pulse">Lunar Sync In Progress</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col relative transition-all duration-1000 ${isNight ? 'env-night dark text-slate-100' : 'env-day text-slate-900'}`}>
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {isNight ? (
          <>
            {stars.map(star => (
              <div key={star.id} className="star animate-twinkle" style={{ left: star.left, top: star.top, width: star.size, height: star.size, animationDelay: star.delay }}></div>
            ))}
            
            {/* Realistic Photographed Blood Moon from Earth */}
            <div className="absolute top-20 right-20 select-none animate-float">
              {/* Massive atmospheric glow (Aura) */}
              <div className="absolute inset-[-80px] w-[300px] h-[300px] bg-[#660000] rounded-full blur-[90px] opacity-40 animate-pulse-slow"></div>
              <div className="absolute inset-[-40px] w-[220px] h-[220px] bg-[#991b1b] rounded-full blur-[50px] opacity-30"></div>
              
              {/* Main Moon Body with Spots/Craters */}
              <div className="relative w-40 h-40 rounded-full bg-gradient-to-br from-[#450a0a] via-[#991b1b] to-[#1e0a0a] shadow-[inset_-15px_-15px_50px_rgba(0,0,0,0.8),0_0_60px_rgba(153,27,27,0.5)] overflow-hidden border border-red-900/40">
                {/* Natural Spots/Craters */}
                <div className="absolute top-[15%] left-[25%] w-10 h-10 bg-black/40 rounded-full blur-[4px]"></div>
                <div className="absolute bottom-[20%] right-[15%] w-14 h-14 bg-black/30 rounded-full blur-[6px]"></div>
                <div className="absolute top-[50%] left-[10%] w-6 h-6 bg-black/45 rounded-full blur-[2px]"></div>
                <div className="absolute bottom-[10%] left-[40%] w-8 h-8 bg-black/35 rounded-full blur-[3px]"></div>
                <div className="absolute top-[30%] right-[25%] w-7 h-7 bg-black/40 rounded-full blur-[3px]"></div>
                <div className="absolute top-[60%] right-[35%] w-4 h-4 bg-black/50 rounded-full blur-[1px]"></div>
                
                {/* Texture overlay */}
                <div className="absolute inset-0 w-full h-full opacity-15 bg-[url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')] mix-blend-multiply"></div>
                
                {/* Secondary Highlight */}
                <div className="absolute top-2 left-2 w-16 h-16 bg-white/5 rounded-full blur-xl"></div>
              </div>

              {/* Realistic Lens Flare Streak */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[2px] bg-gradient-to-r from-transparent via-red-500/10 to-transparent rotate-[170deg] blur-[1px]"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[1px] bg-gradient-to-r from-transparent via-red-400/10 to-transparent rotate-[80deg] blur-[3px]"></div>
            </div>
          </>
        ) : (
          <>
            <div className="mountain"></div>
            <div className="mountain-snow"></div>
            <div className="absolute top-20 left-20 w-24 h-24 bg-yellow-300 rounded-full shadow-[0_0_60px_#fde047] animate-pulse-slow"></div>
          </>
        )}
      </div>

      {!user ? (
        <div className="z-10 w-full h-screen flex flex-col justify-center relative">
          <div className="absolute top-6 right-6 z-50">
            <Button 
              variant="ghost" 
              onClick={() => setAuthView(authView === 'student' ? 'admin' : 'student')}
              className={`glass-panel border-none shadow-lg px-6 ${isNight ? 'text-red-200 hover:bg-white/10' : 'text-blue-600 hover:bg-white/50'}`}
            >
              {authView === 'student' ? <Moon className="w-4 h-4 mr-2" /> : <Sun className="w-4 h-4 mr-2" />}
              {authView === 'student' ? 'Staff Area' : 'Student Area'}
            </Button>
          </div>
          <Auth mode={authView} onLogin={handleLogin} onRegister={handleRegister} />
        </div>
      ) : (
        <div className="z-10 flex flex-col min-h-screen">
          <header className={`glass-panel sticky top-0 z-40 shadow-sm border-b transition-colors duration-500 ${isNight ? 'border-red-900/20' : 'border-slate-200'}`}>
            <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl text-white shadow-lg animate-float ${isNight ? 'bg-red-700 shadow-red-900/40' : 'bg-blue-600 shadow-blue-500/30'}`}>
                   <Layout className="w-6 h-6" />
                </div>
                <div>
                  <span className="font-extrabold text-2xl tracking-tighter dark:text-white">InterviewFlow</span>
                  <div className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isNight ? 'text-red-400' : 'text-blue-600'}`}>Lunar Board</div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className={`hidden md:flex items-center gap-3 px-4 py-2 rounded-xl glass-panel ${isNight ? 'text-red-100' : 'text-slate-700'}`}>
                  <UserCircle className={`w-5 h-5 ${isNight ? 'text-red-400' : 'text-blue-500'}`} />
                  <span className="font-bold text-sm">{user.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${isNight ? 'bg-red-900/50 text-red-300' : 'bg-blue-100 text-blue-700'}`}>{user.role}</span>
                </div>
                <Button variant="secondary" onClick={handleLogout} className="glass-panel border-none shadow-md hover:scale-105 transition-transform font-bold dark:text-white">
                  <LogOut className="w-4 h-4 mr-2" /> Logout
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10 animate-in fade-in duration-700">
            {user.role === Role.ADMIN && (
              <AdminDashboard 
                users={allUsers} interviews={interviews} blockedSlots={blockedSlots}
                onApprove={handleApprove} 
                onUpdateStage={(id, stage) => { setInterviews(prev => prev.map(i => i.id === id ? { ...i, stage } : i)); api.updateInterview(id, { stage }); }}
                onAssign={(id, intId) => { setInterviews(prev => prev.map(i => i.id === id ? { ...i, interviewerId: intId } : i)); api.updateInterview(id, { interviewerId: intId }); }}
                onCreateInterviewer={handleCreateInterviewer}
                onBlockSlot={(date, start, end) => { const nb: BlockedSlot = { id: crypto.randomUUID(), date, startTime: start, endTime: end }; setBlockedSlots(prev => [...prev, nb]); api.createBlock(nb); }}
                onDeleteBlock={(id) => { setBlockedSlots(prev => prev.filter(b => b.id !== id)); api.deleteBlock(id); }}
                onAddCandidate={handleAddCandidate} onCancel={handleAdminCancelInterview} onDeleteCandidate={handleDeleteCandidate}
              />
            )}
            {user.role === Role.INTERVIEWER && (
              <div className="space-y-8">
                <div className="flex items-center gap-3">
                   <Sparkles className="text-red-400 animate-pulse" />
                   <h1 className="text-3xl font-black tracking-tight dark:text-white uppercase">Staff View</h1>
                </div>
                <InterviewerGrid 
                  interviews={interviews} interviewers={allUsers.filter(u => u.role === Role.INTERVIEWER)}
                  users={allUsers} onAssign={(id, intId) => { setInterviews(prev => prev.map(i => i.id === id ? { ...i, interviewerId: intId } : i)); api.updateInterview(id, { interviewerId: intId }); }}
                  canMove={true} currentInterviewerId={user.id} onAddStaff={() => {}} onCancel={handleDeleteCandidate} 
                />
              </div>
            )}
            {user.role === Role.STUDENT && (
              <StudentScheduler 
                student={user} interviews={interviews} blockedSlots={blockedSlots} notifications={notifications}
                onSchedule={handleSchedule} onCancel={handleCancelInterview} onClearNotification={(id) => { setNotifications(prev => prev.filter(n => n.id !== id)); api.deleteNotification(id); }}
              />
            )}
          </main>
          
          <footer className="py-10 text-center text-xs opacity-50 font-bold tracking-widest uppercase dark:text-slate-500">
             &copy; 2024 InterviewFlow &bull; Lunar Blood Moon Theme
          </footer>
        </div>
      )}
    </div>
  );
};

export default App;
