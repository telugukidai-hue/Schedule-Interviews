
import React, { useState, useEffect } from 'react';
import { loadData, saveData } from './services/storage';
import { User, Role, Stage, InterviewSlot, BlockedSlot } from './types';
import { Auth } from './components/Auth';
import { AdminDashboard } from './components/AdminDashboard';
import { StudentScheduler } from './components/StudentScheduler';
import { InterviewerGrid } from './components/InterviewerGrid';
import { Button } from './components/Button';
import { LogOut, Layout, UserCircle } from 'lucide-react';

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [interviews, setInterviews] = useState<InterviewSlot[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [authView, setAuthView] = useState<'student' | 'admin'>('student');

  // Initialize Data
  useEffect(() => {
    const data = loadData();
    setAllUsers(data.users);
    setInterviews(data.interviews);
    setBlockedSlots(data.blockedSlots || []);
  }, []);

  // Persist Data on change
  useEffect(() => {
    if (allUsers.length > 0) {
      saveData({ users: allUsers, interviews, blockedSlots });
    }
  }, [allUsers, interviews, blockedSlots]);

  // --- Actions ---

  const handleLogin = (identifier: string, passOrPhone: string, role: Role) => {
    const found = allUsers.find(u => {
      if (role === Role.STUDENT) {
        return u.name.toLowerCase() === identifier.toLowerCase() && u.phone === passOrPhone && u.role === Role.STUDENT;
      } else {
        if (role === Role.ADMIN) return u.role === Role.ADMIN && u.name === identifier && u.password === passOrPhone;
        return u.role === Role.INTERVIEWER && u.name === identifier && u.password === passOrPhone;
      }
    });

    if (found) {
      setUser(found);
      return true;
    }
    return false;
  };

  const handleRegister = (name: string, phone: string) => {
    if (allUsers.find(u => u.phone === phone)) return false;
    
    const newUser: User = {
      id: `student-${Date.now()}`,
      name,
      phone,
      role: Role.STUDENT,
      approved: false // Default false
    };
    setAllUsers([...allUsers, newUser]);
    setUser(newUser);
    return true;
  };

  const handleCreateInterviewer = (name: string, username: string, pass: string) => {
      const newInt: User = {
        id: `int-${Date.now()}`,
        name: name,
        phone: username, // Using phone field to store username for simplicity in this schema
        role: Role.INTERVIEWER,
        password: pass,
        approved: true
      };
      setAllUsers([...allUsers, newInt]);
  };

  const handleLogout = () => {
    setUser(null);
    setAuthView('student');
  };

  const handleApprove = (studentId: string) => {
    setAllUsers(prev => prev.map(u => u.id === studentId ? { ...u, approved: true } : u));
  };

  const handleSchedule = (date: string, startTime: string, duration: number, companyName: string) => {
    if (!user) return;
    
    const interviewers = allUsers.filter(u => u.role === Role.INTERVIEWER);
    const defaultInterviewer = interviewers.length > 0 ? interviewers[0].id : null;

    const newInterview: InterviewSlot = {
      id: `int-${Date.now()}`,
      studentId: user.id,
      interviewerId: defaultInterviewer, 
      date,
      startTime,
      durationMinutes: duration,
      stage: Stage.CLASSES,
      companyName
    };
    setInterviews([...interviews, newInterview]);
  };

  const handleCancelInterview = (interviewId: string) => {
    setInterviews(prev => prev.filter(i => i.id !== interviewId));
  };

  const handleAssign = (interviewId: string, interviewerId: string) => {
    setInterviews(prev => prev.map(i => i.id === interviewId ? { ...i, interviewerId } : i));
  };

  const handleUpdateStage = (interviewId: string, stage: Stage) => {
    setInterviews(prev => prev.map(i => i.id === interviewId ? { ...i, stage } : i));
  };

  const handleBlockSlot = (date: string, startTime: string, endTime: string) => {
    const newBlock: BlockedSlot = {
      id: `block-${Date.now()}`,
      date,
      startTime,
      endTime
    };
    setBlockedSlots([...blockedSlots, newBlock]);
  };

  const handleDeleteBlock = (id: string) => {
    setBlockedSlots(prev => prev.filter(b => b.id !== id));
  };

  // --- Rendering ---

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <div className="absolute top-4 right-4 z-10">
          <Button 
            variant="ghost" 
            onClick={() => setAuthView(authView === 'student' ? 'admin' : 'student')}
            className="text-xs bg-white/80 backdrop-blur shadow-sm hover:bg-white"
          >
            {authView === 'student' ? 'Admin / Interviewer Login' : 'Student Login'}
          </Button>
        </div>
        
        <Auth 
          mode={authView}
          onLogin={handleLogin}
          onRegister={handleRegister}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg text-white">
               <Layout className="w-5 h-5" />
            </div>
            <span className="font-bold text-xl text-slate-800 tracking-tight">InterviewFlow</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
              <UserCircle className="w-4 h-4" />
              <span className="font-medium">{user.name}</span>
              <span className="text-xs opacity-60 uppercase tracking-wide font-bold">({user.role})</span>
            </div>
            <Button variant="secondary" onClick={handleLogout} className="text-xs sm:text-sm">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        
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
              />
            </div>
          </div>
        )}

        {user.role === Role.STUDENT && (
          <StudentScheduler 
            student={user}
            interviews={interviews}
            blockedSlots={blockedSlots}
            onSchedule={handleSchedule}
            onCancel={handleCancelInterview}
          />
        )}

      </main>
    </div>
  );
};

export default App;
