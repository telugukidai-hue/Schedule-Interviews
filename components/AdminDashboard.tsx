
import React, { useState } from 'react';
import { User, InterviewSlot, Stage, Role, BlockedSlot } from '../types';
import { KanbanBoard } from './KanbanBoard';
import { InterviewerGrid } from './InterviewerGrid';
import { Button } from './Button';
import { Users, LayoutDashboard, UserCheck, UserPlus, Plus, CalendarOff, Trash2 } from 'lucide-react';
import { parseISO } from 'date-fns';

interface AdminDashboardProps {
  users: User[];
  interviews: InterviewSlot[];
  blockedSlots: BlockedSlot[];
  onApprove: (id: string) => void;
  onUpdateStage: (id: string, stage: Stage) => void;
  onAssign: (interviewId: string, interviewerId: string) => void;
  onCreateInterviewer: (name: string, username: string, pass: string) => void;
  onBlockSlot: (date: string, start: string, end: string) => void;
  onDeleteBlock: (id: string) => void;
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
  onDeleteBlock
}) => {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'approvals' | 'scheduling' | 'create_interviewer' | 'availability'>('pipeline');
  
  // Form state for creating interviewer
  const [newIntName, setNewIntName] = useState('');
  const [newIntUsername, setNewIntUsername] = useState('');
  const [newIntPass, setNewIntPass] = useState('');
  const [createMsg, setCreateMsg] = useState('');

  // Form state for blocking
  const [blockDate, setBlockDate] = useState('');
  const [blockStart, setBlockStart] = useState('09:00');
  const [blockEnd, setBlockEnd] = useState('17:00');

  const pendingStudents = users.filter(u => u.role === Role.STUDENT && !u.approved);
  const interviewers = users.filter(u => u.role === Role.INTERVIEWER);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newIntName && newIntUsername && newIntPass) {
      onCreateInterviewer(newIntName, newIntUsername, newIntPass);
      setNewIntName('');
      setNewIntUsername('');
      setNewIntPass('');
      setCreateMsg('Interviewer created successfully!');
      setTimeout(() => setCreateMsg(''), 3000);
    }
  };

  const handleBlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (blockDate && blockStart && blockEnd) {
      onBlockSlot(blockDate, blockStart, blockEnd);
      setBlockDate('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
           <h1 className="text-3xl font-bold text-slate-800">Admin Dashboard</h1>
           <p className="text-slate-500 mt-1">Manage pipeline, approvals and interviewers</p>
        </div>
        
        <div className="flex flex-wrap gap-2 p-1 bg-white border border-slate-200 rounded-xl shadow-sm">
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center ${activeTab === 'pipeline' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Pipeline
          </button>
          <button
            onClick={() => setActiveTab('scheduling')}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center ${activeTab === 'scheduling' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Users className="w-4 h-4 mr-2" />
            Interviewer Board
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center ${activeTab === 'approvals' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <UserCheck className="w-4 h-4 mr-2" />
            Approvals
            {pendingStudents.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingStudents.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('create_interviewer')}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center ${activeTab === 'create_interviewer' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Staff
          </button>
          <button
            onClick={() => setActiveTab('availability')}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center ${activeTab === 'availability' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <CalendarOff className="w-4 h-4 mr-2" />
            Availability
          </button>
        </div>
      </div>

      {activeTab === 'pipeline' && (
        <KanbanBoard 
          interviews={interviews} 
          users={users} 
          onUpdateStage={onUpdateStage} 
        />
      )}

      {activeTab === 'scheduling' && (
        <div className="bg-slate-100 p-6 rounded-2xl border border-slate-200">
           <div className="mb-4 flex justify-between items-center">
             <h2 className="text-lg font-bold text-slate-700">Interviewer Allocation</h2>
             <span className="text-sm text-slate-500 bg-white px-3 py-1 rounded-full shadow-sm">Drag or use "Move" to reassign</span>
           </div>
           <InterviewerGrid 
            interviews={interviews}
            interviewers={interviewers}
            users={users}
            onAssign={onAssign}
            canMove={true}
          />
        </div>
      )}

      {activeTab === 'approvals' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden max-w-4xl mx-auto">
          <div className="p-6 border-b border-slate-100 bg-slate-50">
            <h2 className="text-xl font-bold text-slate-800">Pending Candidate Approvals</h2>
            <p className="text-sm text-slate-500">Approve candidates to allow them to schedule interviews.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {pendingStudents.length === 0 ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                <UserCheck size={48} className="text-slate-200 mb-3" />
                <p>No pending approvals</p>
              </div>
            ) : (
              pendingStudents.map(student => (
                <div key={student.id} className="p-6 flex items-center justify-between hover:bg-blue-50/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
                      {student.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{student.name}</h3>
                      <p className="text-sm text-slate-500 font-mono">{student.phone}</p>
                    </div>
                  </div>
                  <Button onClick={() => onApprove(student.id)} variant="primary">
                    Approve Request
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'create_interviewer' && (
         <div className="max-w-md mx-auto mt-8">
           <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
             <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
               <UserPlus className="text-blue-600" />
               Create Interviewer
             </h2>
             
             {createMsg && (
               <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm text-center">
                 {createMsg}
               </div>
             )}

             <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={newIntName}
                    onChange={e => setNewIntName(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Username (Login)</label>
                  <input 
                    type="text" 
                    required
                    value={newIntUsername}
                    onChange={e => setNewIntUsername(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. johnd"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <input 
                    type="password" 
                    required
                    value={newIntPass}
                    onChange={e => setNewIntPass(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="••••••••"
                  />
                </div>
                <Button type="submit" className="w-full mt-4">
                  <Plus className="w-4 h-4 mr-2" /> Create Account
                </Button>
             </form>
           </div>
         </div>
      )}

      {activeTab === 'availability' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Add Block Form */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
             <h3 className="font-bold text-lg mb-4 text-slate-800 flex items-center gap-2">
               <CalendarOff className="text-red-500" /> Block Slots (Unavailable)
             </h3>
             <form onSubmit={handleBlockSubmit} className="space-y-4">
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input 
                    type="date"
                    required
                    value={blockDate}
                    onChange={e => setBlockDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
                    <input 
                      type="time"
                      required
                      value={blockStart}
                      onChange={e => setBlockStart(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
                    <input 
                      type="time"
                      required
                      value={blockEnd}
                      onChange={e => setBlockEnd(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
               </div>
               <Button type="submit" variant="danger" className="w-full">
                 Mark Unavailable
               </Button>
             </form>
          </div>

          {/* List Blocked Slots */}
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 overflow-hidden flex flex-col">
             <h3 className="font-bold text-lg mb-4 text-slate-800">Current Blocks</h3>
             <div className="flex-1 overflow-y-auto space-y-2 pr-2">
               {blockedSlots.length === 0 ? (
                 <p className="text-slate-400 text-sm italic">No unavailable slots marked.</p>
               ) : (
                 blockedSlots.map(block => (
                   <div key={block.id} className="bg-white p-3 rounded-lg border border-red-100 flex justify-between items-center shadow-sm">
                     <div>
                       <div className="font-medium text-slate-800">{parseISO(block.date).toLocaleDateString()}</div>
                       <div className="text-xs text-red-500 font-mono">{block.startTime} - {block.endTime}</div>
                     </div>
                     <button 
                       onClick={() => onDeleteBlock(block.id)}
                       className="text-slate-400 hover:text-red-500 p-2 transition-colors"
                     >
                       <Trash2 size={16} />
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
