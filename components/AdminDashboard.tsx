
import React, { useState } from 'react';
import { User, InterviewSlot, Stage, Role, BlockedSlot } from '../types';
import { InterviewerGrid } from './InterviewerGrid';
import { KanbanBoard } from './KanbanBoard';
import { Button } from './Button';
import { Users, LayoutDashboard, UserCheck, UserPlus, Plus, CalendarOff, Trash2, Mail } from 'lucide-react';
import { parseISO, format } from 'date-fns';

interface AdminDashboardProps {
  users: User[];
  interviews: InterviewSlot[];
  blockedSlots: BlockedSlot[];
  onApprove: (id: string) => void;
  onUpdateStage: (id: string, stage: Stage) => void;
  onAssign: (interviewId: string, interviewerId: string) => void;
  onCreateInterviewer: (name: string, username: string, pass: string, email: string) => void;
  onBlockSlot: (date: string, start: string, end: string) => void;
  onDeleteBlock: (id: string) => void;
  onAddCandidate: (name: string, phone: string) => void;
  onCancel: (interviewId: string) => void;
  onDeleteCandidate?: (interviewId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  users,
  interviews,
  blockedSlots,
  onApprove,
  onUpdateStage,
  onAssign,
  onCreateInterviewer,
  onBlockSlot,
  onDeleteBlock,
  onAddCandidate,
  onCancel,
  onDeleteCandidate
}) => {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'approvals' | 'scheduling' | 'create_interviewer' | 'availability'>('pipeline');
  
  const [newIntName, setNewIntName] = useState('');
  const [newIntUsername, setNewIntUsername] = useState('');
  const [newIntPass, setNewIntPass] = useState('');
  const [newIntEmail, setNewIntEmail] = useState('');
  const [createMsg, setCreateMsg] = useState('');

  const [blockDate, setBlockDate] = useState('');
  const [blockStart, setBlockStart] = useState('09:00');
  const [blockEnd, setBlockEnd] = useState('17:00');

  const pendingStudents = users.filter(u => u.role === Role.STUDENT && !u.approved);
  const interviewers = users.filter(u => u.role === Role.INTERVIEWER);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newIntName && newIntUsername && newIntPass) {
      onCreateInterviewer(newIntName, newIntUsername, newIntPass, newIntEmail);
      setNewIntName('');
      setNewIntUsername('');
      setNewIntPass('');
      setNewIntEmail('');
      setCreateMsg('Staff account successfully added.');
      setTimeout(() => setCreateMsg(''), 3000);
    }
  };

  const handleBlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (blockDate && blockStart && blockEnd) {
      onBlockSlot(blockDate, blockStart, blockEnd);
      setBlockDate('');
      alert("Success: Slots for selected date are now restricted.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-slate-200 dark:border-white/5 pb-6">
        <div>
           <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Admin Control</h1>
           <p className="text-slate-500 dark:text-slate-400 mt-1 font-bold">Monitor registered users and session staff</p>
        </div>
        
        <div className="flex flex-wrap gap-2 p-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl shadow-sm">
          {[
            { id: 'pipeline', label: 'Pipeline', icon: LayoutDashboard },
            { id: 'scheduling', label: 'Staff Grid', icon: Users },
            { id: 'approvals', label: 'Approvals', icon: UserCheck, count: pendingStudents.length },
            { id: 'create_interviewer', label: 'Add Staff', icon: UserPlus },
            { id: 'availability', label: 'Availability', icon: CalendarOff }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-lg text-sm font-black transition-all flex items-center ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'}`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{tab.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'pipeline' && (
        <KanbanBoard 
          interviews={interviews} 
          users={users} 
          onUpdateStage={onUpdateStage}
          onAddCandidate={onAddCandidate}
          onDeleteCandidate={onDeleteCandidate}
        />
      )}

      {activeTab === 'scheduling' && (
        <div className="bg-slate-100 dark:bg-slate-900/40 p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-inner">
           <div className="mb-4 flex justify-between items-center">
             <h2 className="text-lg font-black text-slate-700 dark:text-white">Assigned Sessions</h2>
             <span className="text-[10px] text-slate-500 bg-white dark:bg-white/10 px-3 py-1.5 rounded-full shadow-sm font-black uppercase tracking-wider">Default allocation active</span>
           </div>
           <InterviewerGrid 
            interviews={interviews}
            interviewers={interviewers}
            users={users}
            onAssign={onAssign}
            canMove={true}
            onAddStaff={() => setActiveTab('create_interviewer')}
            onCancel={onCancel}
          />
        </div>
      )}

      {activeTab === 'approvals' && (
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-lg border border-slate-200 dark:border-white/10 overflow-hidden max-w-4xl mx-auto">
          <div className="p-6 border-b border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-transparent">
            <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Pending Approval</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-bold mt-1">Allow registration for new student accounts.</p>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {pendingStudents.length === 0 ? (
              <div className="p-16 text-center text-slate-400 flex flex-col items-center">
                <UserCheck size={64} className="text-slate-200 dark:text-white/10 mb-4" />
                <p className="font-black text-lg">No pending requests</p>
              </div>
            ) : (
              pendingStudents.map(student => (
                <div key={student.id} className="p-6 flex items-center justify-between hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center font-black text-xl shadow-sm">
                      {student.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 dark:text-white text-lg tracking-tight">{student.name}</h3>
                      <p className="text-sm text-slate-400 font-black tracking-widest">{student.phone}</p>
                    </div>
                  </div>
                  <Button onClick={() => onApprove(student.id)} variant="primary" className="font-black px-8 py-3 rounded-xl shadow-lg">
                    Approve Access
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'create_interviewer' && (
         <div className="max-w-md mx-auto mt-8">
           <div className="bg-white dark:bg-white/5 p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-white/10">
             <h2 className="text-xl font-black mb-6 flex items-center gap-3 tracking-tight dark:text-white">
               <UserPlus className="text-blue-600" />
               New Staff User
             </h2>
             
             {createMsg && (
               <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-xl text-sm text-center font-black border border-green-200 dark:border-green-800 animate-in zoom-in duration-300">
                 {createMsg}
               </div>
             )}

             <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Display Name</label>
                  <input type="text" required value={newIntName} onChange={e => setNewIntName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-slate-900 dark:text-white placeholder:opacity-30"
                    placeholder="Full Name" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Login ID / Phone</label>
                  <input type="text" required value={newIntUsername} onChange={e => setNewIntUsername(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-slate-900 dark:text-white"
                    placeholder="Enter unique ID" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Staff Email (Sync)</label>
                  <input type="email" required value={newIntEmail} onChange={e => setNewIntEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-slate-900 dark:text-white"
                    placeholder="staff@example.com" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Password</label>
                  <input type="password" required value={newIntPass} onChange={e => setNewIntPass(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-slate-900 dark:text-white"
                    placeholder="••••••••" />
                </div>
                <Button type="submit" className="w-full mt-6 font-black py-4 rounded-xl shadow-xl shadow-blue-500/20">
                  Add User
                </Button>
             </form>
           </div>
         </div>
      )}

      {activeTab === 'availability' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-white/5 p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-white/10">
             <h3 className="font-black text-xl mb-6 text-slate-800 dark:text-white flex items-center gap-3 tracking-tight">
               <CalendarOff className="text-red-500" /> Restrict Access
             </h3>
             <form onSubmit={handleBlockSubmit} className="space-y-6">
               <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Date</label>
                  <input type="date" required value={blockDate} onChange={e => setBlockDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-slate-900 dark:text-white" />
               </div>
               <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">From</label>
                    <input type="time" required value={blockStart} onChange={e => setBlockStart(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-slate-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">To</label>
                    <input type="time" required value={blockEnd} onChange={e => setBlockEnd(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-slate-900 dark:text-white" />
                  </div>
               </div>
               <Button type="submit" variant="danger" className="w-full font-black py-4 rounded-xl shadow-xl shadow-red-500/20">
                 Block Availability
               </Button>
             </form>
          </div>

          <div className="bg-white dark:bg-white/5 p-8 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden flex flex-col">
             <h3 className="font-black text-xl mb-6 text-slate-800 dark:text-white tracking-tight">System Restrictions</h3>
             <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar max-h-[400px]">
               {blockedSlots.length === 0 ? (
                 <div className="text-center py-20 bg-slate-50 dark:bg-white/5 rounded-xl border border-dashed border-slate-200 dark:border-white/5">
                    <p className="text-slate-400 dark:text-slate-500 text-sm font-bold">No active blocks.</p>
                 </div>
               ) : (
                 blockedSlots.map(block => (
                   <div key={block.id} className="bg-slate-50 dark:bg-white/5 p-5 rounded-xl border border-red-100 dark:border-red-900/20 flex justify-between items-center group transition-all hover:bg-red-50 dark:hover:bg-red-900/10">
                     <div>
                       <div className="font-black text-slate-900 dark:text-white tracking-tight">{format(parseISO(block.date), 'dd MMMM yyyy')}</div>
                       <div className="text-[10px] text-red-600 dark:text-red-400 font-black uppercase tracking-widest mt-1 bg-red-100/50 dark:bg-red-900/20 px-2 py-1 rounded-md inline-block border border-red-200 dark:border-red-900/30">
                         {block.startTime} to {block.endTime}
                       </div>
                     </div>
                     <button onClick={() => onDeleteBlock(block.id)}
                       className="text-slate-300 hover:text-red-500 p-2 transition-all bg-white dark:bg-white/5 rounded-lg shadow-sm border border-slate-100 dark:border-white/10">
                       <Trash2 size={18} />
                     </button>
                   </div>
                 ))
               )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
