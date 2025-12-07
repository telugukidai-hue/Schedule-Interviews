
import React, { useState } from 'react';
import { Stage, InterviewSlot, User, Role } from '../types';
import { User as UserIcon, Plus, Phone } from 'lucide-react';
import { parseISO } from 'date-fns';
import { Button } from './Button';

interface KanbanBoardProps {
  interviews: InterviewSlot[];
  users: User[];
  onUpdateStage: (id: string, stage: Stage) => void;
  onAddCandidate: (name: string, phone: string) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ interviews, users, onUpdateStage, onAddCandidate }) => {
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full min-h-[500px]">
      {stages.map(stage => {
        const stageItems = interviews.filter(i => i.stage === stage);
        return (
          <div 
            key={stage} 
            className="flex flex-col bg-slate-50 rounded-xl border border-slate-200 h-full shadow-sm transition-colors"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage)}
          >
            {/* Header */}
            <div className={`p-3 border-b border-slate-200 rounded-t-xl font-bold flex justify-between items-center ${getStageColor(stage)}`}>
              <span>{stage}</span>
              {stage === Stage.CLASSES && (
                <button 
                  onClick={() => setIsAdding(!isAdding)}
                  className="bg-white/50 hover:bg-white p-1 rounded-full transition-colors"
                  title="Add Candidate"
                >
                  <Plus size={16} />
                </button>
              )}
            </div>

            {/* Content */}
            <div className="p-3 flex-1 overflow-y-auto space-y-3 max-h-[600px] custom-scrollbar">
              {/* Add Form */}
              {stage === Stage.CLASSES && isAdding && (
                <div className="bg-white p-3 rounded-lg shadow-md border border-blue-200 animate-in slide-in-from-top-2">
                  <form onSubmit={handleAddSubmit} className="space-y-2">
                    <input 
                      type="text" 
                      placeholder="Name" 
                      className="w-full text-sm p-2 border rounded"
                      value={newName} 
                      onChange={e => setNewName(e.target.value)}
                      required
                      autoFocus
                    />
                    <input 
                      type="tel" 
                      placeholder="Phone" 
                      className="w-full text-sm p-2 border rounded"
                      value={newPhone} 
                      onChange={e => setNewPhone(e.target.value)}
                      required
                    />
                    <div className="flex gap-2 pt-1">
                      <Button type="submit" className="w-full text-xs py-1">Add</Button>
                      <button type="button" onClick={() => setIsAdding(false)} className="px-2 py-1 text-xs bg-slate-100 rounded">Cancel</button>
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
                    className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-300 transition-all cursor-move group relative"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-bold text-slate-800 flex items-center gap-2">
                        {student?.name || 'Unknown'}
                      </div>
                    </div>
                    
                    <div className="flex items-center text-xs text-slate-500 font-mono bg-slate-50 px-2 py-1 rounded w-fit">
                      <Phone size={10} className="mr-1" />
                      {student?.phone}
                    </div>

                    {/* Hidden on card, but useful data if needed later */}
                    {/* <div className="text-[10px] text-slate-400 mt-2">
                       ID: {interview.id.slice(-4)}
                    </div> */}
                  </div>
                );
              })}
              {stageItems.length === 0 && !isAdding && (
                <div className="text-center py-10 text-slate-400 text-sm italic border-2 border-dashed border-slate-200 rounded-lg">
                  Drop items here
                </div>
              )}
            </div>

            {/* Footer Count */}
            <div className="p-3 border-t border-slate-200 bg-white rounded-b-xl text-center">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Candidates
              </span>
              <div className="text-xl font-bold text-slate-800">
                {stageItems.length}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
