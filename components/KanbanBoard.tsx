
import React, { useState } from 'react';
import { Stage, InterviewSlot, User } from '../types';
import { Plus, Phone, Trash2, UserCheck } from 'lucide-react';
import { Button } from './Button';

interface KanbanBoardProps {
  interviews: InterviewSlot[];
  users: User[];
  onUpdateStage: (id: string, stage: Stage) => void;
  onAddCandidate: (name: string, phone: string) => void;
  onDeleteCandidate?: (interviewId: string) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ 
  interviews, 
  users, 
  onUpdateStage, 
  onAddCandidate, 
  onDeleteCandidate 
}) => {
  const stages = [Stage.CLASSES, Stage.INTERVIEWS, Stage.SUCCESSFUL, Stage.UNSUCCESSFUL];
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const getStudent = (id: string) => users.find(u => u.id === id);

  const getStageColor = (stage: Stage) => {
    switch (stage) {
      case Stage.CLASSES: return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case Stage.INTERVIEWS: return 'bg-blue-50 border-blue-200 text-blue-800';
      case Stage.SUCCESSFUL: return 'bg-green-50 border-green-200 text-green-800';
      case Stage.UNSUCCESSFUL: return 'bg-red-50 border-red-200 text-red-800';
      default: return 'bg-slate-50';
    }
  };

  const handleDragStart = (e: React.DragEvent, interviewId: string) => {
    e.dataTransfer.setData('interviewId', interviewId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetStage: Stage) => {
    e.preventDefault();
    const interviewId = e.dataTransfer.getData('interviewId');
    if (interviewId) {
      onUpdateStage(interviewId, targetStage);
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName && newPhone) {
      onAddCandidate(newName, newPhone);
      setNewName('');
      setNewPhone('');
      setIsAdding(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-full min-h-[500px]">
      {stages.map(stage => {
        // Only show registration placeholders in the pipeline board
        const stageItems = interviews.filter(i => i.stage === stage && i.durationMinutes === 0);
        
        return (
          <div 
            key={stage} 
            className="flex flex-col bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-white/5 h-full shadow-sm transition-colors"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage)}
          >
            {/* Header */}
            <div className={`p-4 border-b border-slate-200 dark:border-white/5 rounded-t-2xl font-black flex justify-between items-center ${getStageColor(stage)}`}>
              <span className="uppercase tracking-widest text-xs">{stage}</span>
              {stage === Stage.CLASSES && (
                <button 
                  onClick={() => setIsAdding(!isAdding)}
                  className="bg-white/50 hover:bg-white p-2 rounded-xl transition-all shadow-sm"
                  title="Add Candidate"
                >
                  <Plus size={18} />
                </button>
              )}
            </div>

            {/* Content */}
            <div className="p-3 flex-1 overflow-y-auto space-y-3 max-h-[600px] custom-scrollbar bg-transparent">
              {/* Add Form */}
              {stage === Stage.CLASSES && isAdding && (
                <div className="bg-white p-4 rounded-xl shadow-lg border-2 border-blue-500 animate-in slide-in-from-top-2">
                  <form onSubmit={handleAddSubmit} className="space-y-3">
                    <input 
                      type="text" 
                      placeholder="Candidate Name" 
                      className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-lg font-bold outline-none focus:border-blue-500 text-slate-900"
                      value={newName} 
                      onChange={e => setNewName(e.target.value)}
                      required
                    />
                    <input 
                      type="tel" 
                      placeholder="Phone / Unique ID" 
                      className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-lg font-bold outline-none focus:border-blue-500 text-slate-900"
                      value={newPhone} 
                      onChange={e => setNewPhone(e.target.value)}
                      required
                    />
                    <div className="flex gap-2 pt-1">
                      <Button type="submit" className="flex-1 text-xs py-2 font-black">Add</Button>
                      <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-xs font-bold bg-slate-200 text-slate-700 rounded-lg">Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              {stageItems.map(interview => {
                const student = getStudent(interview.studentId);
                return (
                  <div 
                    key={interview.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, interview.id)}
                    className="bg-white dark:bg-white/5 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-white/10 hover:shadow-xl hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-move group relative"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center font-black text-xs text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                          {student?.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-black text-slate-800 dark:text-white text-sm tracking-tight">
                            {student?.name || 'Unknown'}
                          </div>
                          <div className="flex items-center text-[10px] text-slate-400 dark:text-slate-400 font-bold mt-0.5">
                            <Phone size={8} className="mr-1" />
                            {student?.phone}
                          </div>
                        </div>
                      </div>
                      
                      {onDeleteCandidate && (
                        <button 
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteCandidate(interview.id); }}
                          className="text-slate-200 hover:text-red-500 p-1 transition-all"
                          title="Remove Entry"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    
                    <div className="mt-4 flex items-center justify-between">
                       <div className="text-[8px] font-black uppercase tracking-widest text-slate-300 dark:text-slate-500">Registered Tracking</div>
                       {stage === Stage.SUCCESSFUL && <UserCheck size={14} className="text-green-500" />}
                    </div>
                  </div>
                );
              })}
              {stageItems.length === 0 && !isAdding && (
                <div className="text-center py-10 text-slate-400 text-xs font-bold border-2 border-dashed border-slate-200 dark:border-white/5 rounded-xl opacity-30">
                  DRAG HERE
                </div>
              )}
            </div>

            {/* Footer Count */}
            <div className="p-4 border-t border-slate-200 dark:border-white/5 bg-white/30 dark:bg-white/5 rounded-b-2xl flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Members
              </span>
              <div className="text-xl font-black text-slate-800 dark:text-white">
                {stageItems.length}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
