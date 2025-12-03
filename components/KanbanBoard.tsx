import React from 'react';
import { Stage, InterviewSlot, User } from '../types';
import { User as UserIcon } from 'lucide-react';

interface KanbanBoardProps {
  interviews: InterviewSlot[];
  users: User[];
  onUpdateStage: (id: string, stage: Stage) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ interviews, users, onUpdateStage }) => {
  const stages = [Stage.CLASSES, Stage.INTERVIEWS, Stage.SUCCESSFUL, Stage.UNSUCCESSFUL];

  const getStudentName = (id: string) => users.find(u => u.id === id)?.name || 'Unknown';

  const getStageColor = (stage: Stage) => {
    switch (stage) {
      case Stage.CLASSES: return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case Stage.INTERVIEWS: return 'bg-blue-50 border-blue-200 text-blue-800';
      case Stage.SUCCESSFUL: return 'bg-green-50 border-green-200 text-green-800';
      case Stage.UNSUCCESSFUL: return 'bg-red-50 border-red-200 text-red-800';
      default: return 'bg-slate-50';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full min-h-[500px]">
      {stages.map(stage => {
        const stageItems = interviews.filter(i => i.stage === stage);
        return (
          <div key={stage} className="flex flex-col bg-slate-50 rounded-xl border border-slate-200 h-full shadow-sm">
            {/* Header */}
            <div className={`p-3 border-b border-slate-200 rounded-t-xl font-bold flex justify-between items-center ${getStageColor(stage)}`}>
              <span>{stage}</span>
            </div>

            {/* Content */}
            <div className="p-3 flex-1 overflow-y-auto space-y-3 max-h-[600px]">
              {stageItems.map(interview => (
                <div key={interview.id} className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-all group">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-slate-800 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs">
                        <UserIcon size={12} />
                      </div>
                      {getStudentName(interview.studentId)}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 mb-3 ml-8">
                    {new Date(interview.date).toLocaleDateString()} at {interview.startTime}
                  </div>
                  
                  {/* Quick move actions */}
                  <div className="flex flex-wrap gap-1 mt-2 opacity-50 group-hover:opacity-100 transition-opacity">
                    {stages.filter(s => s !== stage).map(targetStage => (
                      <button
                        key={targetStage}
                        onClick={() => onUpdateStage(interview.id, targetStage)}
                        className="text-[10px] px-2 py-1 bg-white hover:bg-slate-100 rounded text-slate-600 border border-slate-200 shadow-sm"
                      >
                        To {targetStage}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {stageItems.length === 0 && (
                <div className="text-center py-10 text-slate-400 text-sm italic border-2 border-dashed border-slate-200 rounded-lg">
                  No candidates
                </div>
              )}
            </div>

            {/* Footer Count */}
            <div className="p-3 border-t border-slate-200 bg-white rounded-b-xl text-center">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Total Candidates
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