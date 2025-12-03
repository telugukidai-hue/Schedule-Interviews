
import React, { useState } from 'react';
import { User, InterviewSlot, Stage } from '../types';
import { ArrowRightLeft, Sparkles } from 'lucide-react';
import { generateInterviewQuestions } from '../services/geminiService';
import { parseISO } from 'date-fns';

interface InterviewerGridProps {
  interviews: InterviewSlot[];
  interviewers: User[];
  users: User[];
  onAssign: (interviewId: string, interviewerId: string) => void;
  canMove: boolean; // If true, can reassign. If false (e.g. interviewer view), maybe limited.
  currentInterviewerId?: string; // If viewed by a specific interviewer
}

export const InterviewerGrid: React.FC<InterviewerGridProps> = ({ 
  interviews, 
  interviewers, 
  users, 
  onAssign, 
  canMove,
  currentInterviewerId
}) => {
  // Only show upcoming interviews (Classes or Interviews stage)
  const activeInterviews = interviews.filter(i => i.stage === Stage.INTERVIEWS || i.stage === Stage.CLASSES);
  
  // State for AI modal
  const [aiQuestion, setAiQuestion] = useState<{name: string, content: string} | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const handleAskAI = async (candidateName: string, stage: string) => {
    setLoadingAi(true);
    setAiQuestion({ name: candidateName, content: "Thinking..." });
    const result = await generateInterviewQuestions(stage, candidateName);
    setAiQuestion({ name: candidateName, content: result });
    setLoadingAi(false);
  };

  return (
    <div className="space-y-4">
       {/* AI Modal */}
       {aiQuestion && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
              <Sparkles className="text-purple-500 w-5 h-5"/>
              AI Questions for {aiQuestion.name}
            </h3>
            <div className="prose prose-sm max-h-60 overflow-y-auto bg-slate-50 p-4 rounded-lg border border-slate-100">
              {loadingAi ? (
                <div className="flex items-center gap-2 text-slate-500">Generating...</div>
              ) : (
                <div className="whitespace-pre-line text-slate-700">{aiQuestion.content}</div>
              )}
            </div>
            <div className="mt-4 text-right">
              <button onClick={() => setAiQuestion(null)} className="px-4 py-2 bg-slate-200 rounded hover:bg-slate-300">Close</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {interviewers.map((interviewer, index) => {
          // If viewing as a specific interviewer, highlight their column, maybe dim others?
          // For now, we show all equally as requested "A, B, C side by side"
          const assigned = activeInterviews.filter(i => i.interviewerId === interviewer.id);
          
          return (
            <div key={interviewer.id} className={`flex flex-col bg-white rounded-xl border shadow-sm ${currentInterviewerId === interviewer.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200'}`}>
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                <div>
                  <h3 className="font-bold text-slate-800">{interviewer.name}</h3>
                  <p className="text-xs text-slate-500">{assigned.length} upcoming</p>
                </div>
                {/* Visual indicator of "Default" or "Current" */}
                {index === 0 && <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Default</span>}
              </div>
              
              <div className="p-3 flex-1 min-h-[300px] space-y-3">
                {assigned.map(interview => {
                  const candidate = users.find(u => u.id === interview.studentId);
                  return (
                    <div key={interview.id} className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm hover:border-blue-300 transition-colors">
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-sm">{candidate?.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${interview.stage === Stage.CLASSES ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                          {interview.stage}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {parseISO(interview.date).toLocaleDateString()} • {interview.startTime} ({interview.durationMinutes}m)
                      </div>

                      <div className="mt-3 flex gap-2">
                        {/* Assignment Dropdown */}
                        {canMove && (
                          <div className="relative group">
                            <button className="text-xs flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-slate-600 transition-colors">
                              <ArrowRightLeft size={12} /> Move
                            </button>
                            {/* Dropdown menu */}
                            <div className="absolute left-0 top-full mt-1 w-32 bg-white rounded-md shadow-lg border border-slate-200 z-10 hidden group-hover:block">
                                {interviewers.filter(int => int.id !== interviewer.id).map(target => (
                                  <button
                                    key={target.id}
                                    onClick={() => onAssign(interview.id, target.id)}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700"
                                  >
                                    To {target.name}
                                  </button>
                                ))}
                            </div>
                          </div>
                        )}
                        
                        {/* AI Button */}
                        <button 
                          onClick={() => candidate && handleAskAI(candidate.name, interview.stage)}
                          className="text-xs flex items-center gap-1 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded text-purple-700 border border-purple-200 transition-colors ml-auto"
                        >
                          <Sparkles size={12} /> AI Help
                        </button>
                      </div>
                    </div>
                  );
                })}
                 {assigned.length === 0 && (
                    <div className="text-center py-8 text-slate-300 text-sm">
                        Slot Empty
                    </div>
                )}
              </div>
            </div>
          );
        })}
        
        {/* Unassigned Pool */}
        <div className="flex flex-col bg-slate-50 rounded-xl border border-dashed border-slate-300">
           <div className="p-4 border-b border-slate-200">
             <h3 className="font-bold text-slate-600">Unassigned</h3>
             <p className="text-xs text-slate-400">Needs interviewer</p>
           </div>
           <div className="p-3 space-y-2">
             {activeInterviews.filter(i => !i.interviewerId).map(interview => (
                <div key={interview.id} className="bg-white p-3 rounded shadow-sm border border-l-4 border-l-orange-400">
                   <div className="font-medium text-sm">{users.find(u => u.id === interview.studentId)?.name}</div>
                   <div className="text-xs text-slate-500">{parseISO(interview.date).toLocaleDateString()} @ {interview.startTime}</div>
                   <div className="mt-2 text-xs">Assign to:</div>
                   <div className="flex gap-1 mt-1 overflow-x-auto">
                     {interviewers.map(int => (
                       <button 
                        key={int.id}
                        onClick={() => onAssign(interview.id, int.id)}
                        className="px-2 py-1 bg-slate-200 hover:bg-blue-600 hover:text-white rounded text-[10px] transition-colors"
                       >
                         {int.name.split(' ')[0]}
                       </button>
                     ))}
                   </div>
                </div>
             ))}
             {activeInterviews.filter(i => !i.interviewerId).length === 0 && (
                 <div className="text-center py-4 text-slate-400 text-xs">All assigned</div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};
