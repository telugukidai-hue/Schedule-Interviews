
import React, { useState } from 'react';
import { User, InterviewSlot, Stage } from '../types';
import { Sparkles, Plus, Calendar, Trash2 } from 'lucide-react';
import { generateInterviewQuestions } from '../services/geminiService';
import { parseISO, format } from 'date-fns';

interface InterviewerGridProps {
  interviews: InterviewSlot[];
  interviewers: User[];
  users: User[];
  onAssign: (interviewId: string, interviewerId: string) => void;
  canMove: boolean; 
  currentInterviewerId?: string;
  onAddStaff: () => void;
  onCancel: (interviewId: string) => void;
}

export const InterviewerGrid: React.FC<InterviewerGridProps> = ({ 
  interviews, 
  interviewers, 
  users, 
  onAssign, 
  canMove,
  currentInterviewerId,
  onAddStaff,
  onCancel
}) => {
  const activeInterviews = interviews.filter(i => i.stage === Stage.INTERVIEWS || i.stage === Stage.CLASSES);
  
  const [aiQuestion, setAiQuestion] = useState<{name: string, content: string} | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const handleAskAI = async (candidateName: string, stage: string) => {
    setLoadingAi(true);
    setAiQuestion({ name: candidateName, content: "Thinking..." });
    const result = await generateInterviewQuestions(stage, candidateName);
    setAiQuestion({ name: candidateName, content: result });
    setLoadingAi(false);
  };

  const generateGCalLink = (interview: InterviewSlot, candidate: User | undefined, interviewer: User) => {
    if (!candidate) return '#';
    // Handle placeholder/pending
    if (interview.durationMinutes === 0) return '#';

    const startTime = parseISO(`${interview.date}T${interview.startTime}`);
    const endTime = new Date(startTime.getTime() + interview.durationMinutes * 60000);
    
    // Format for GCal: YYYYMMDDTHHMMSSZ
    const startStr = format(startTime, "yyyyMMdd'T'HHmmss");
    const endStr = format(endTime, "yyyyMMdd'T'HHmmss");
    
    const title = encodeURIComponent(`Interview: ${candidate.name}`);
    const details = encodeURIComponent(`Interview with ${candidate.name} (${candidate.phone})\nStage: ${interview.stage}`);
    const location = encodeURIComponent("Online / Phone");
    const emails = interviewer.email ? `&add=${interviewer.email}` : '';

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&location=${location}${emails}`;
  };

  // Drag Handlers
  const handleDragStart = (e: React.DragEvent, interviewId: string) => {
    e.dataTransfer.setData('interviewId', interviewId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
  };

  const handleDrop = (e: React.DragEvent, interviewerId: string) => {
    e.preventDefault();
    const interviewId = e.dataTransfer.getData('interviewId');
    if (interviewId) {
      onAssign(interviewId, interviewerId);
    }
  };

  return (
    <div className="space-y-4">
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
          const assigned = activeInterviews.filter(i => i.interviewerId === interviewer.id);
          
          return (
            <div 
              key={interviewer.id} 
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, interviewer.id)}
              className={`flex flex-col bg-white rounded-xl border shadow-sm transition-colors ${currentInterviewerId === interviewer.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200'}`}
            >
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                <div>
                  <h3 className="font-bold text-slate-800">{interviewer.name}</h3>
                  <p className="text-xs text-slate-500">{assigned.length} upcoming</p>
                </div>
                {interviewer.email && (
                  <span className="text-[10px] text-slate-400 bg-white px-2 py-1 rounded border border-slate-100" title={interviewer.email}>
                    {interviewer.email.split('@')[0]}
                  </span>
                )}
                {/* Add Staff Mini Button */}
                {index === 0 && interviewers.length < 3 && (
                   <button 
                     onClick={onAddStaff}
                     className="ml-auto bg-blue-50 hover:bg-blue-100 text-blue-600 p-1.5 rounded-full transition-colors"
                     title="Add Staff"
                   >
                     <Plus size={16} />
                   </button>
                )}
              </div>
              
              <div className="p-3 flex-1 min-h-[300px] space-y-3">
                {assigned.map(interview => {
                  const candidate = users.find(u => u.id === interview.studentId);
                  const isPlaceholder = interview.durationMinutes === 0;
                  
                  return (
                    <div 
                      key={interview.id} 
                      draggable={canMove}
                      onDragStart={(e) => handleDragStart(e, interview.id)}
                      className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm hover:border-blue-300 transition-colors cursor-move relative group"
                    >
                      {canMove && (
                        <button 
                          onClick={() => onCancel(interview.id)}
                          className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          title="Cancel Interview"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}

                      <div className="flex justify-between items-start pr-6">
                        <span className="font-semibold text-sm">{candidate?.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${interview.stage === Stage.CLASSES ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                          {interview.stage}
                        </span>
                      </div>
                      
                      <div className="text-xs text-slate-500 mt-1">
                        {isPlaceholder ? (
                           <span className="italic text-slate-400">Pending Schedule</span>
                        ) : (
                           `${format(parseISO(interview.date), 'dd MMM yyyy')} • ${interview.startTime} (${interview.durationMinutes}m)`
                        )}
                      </div>

                      <div className="mt-3 flex gap-2 flex-wrap">
                        {/* GCal Button - Only show if scheduled */}
                        {!isPlaceholder && (
                          <a 
                            href={generateGCalLink(interview, candidate, interviewer)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs flex items-center gap-1 bg-green-50 hover:bg-green-100 px-2 py-1 rounded text-green-700 border border-green-200 transition-colors"
                            title="Add to Google Calendar"
                          >
                            <Calendar size={12} /> GCal
                          </a>
                        )}
                        
                        {/* AI Button */}
                        <button 
                          onClick={() => candidate && handleAskAI(candidate.name, interview.stage)}
                          className="text-xs flex items-center gap-1 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded text-purple-700 border border-purple-200 transition-colors ml-auto"
                        >
                          <Sparkles size={12} /> AI
                        </button>
                      </div>
                    </div>
                  );
                })}
                 {assigned.length === 0 && (
                    <div className="text-center py-8 text-slate-300 text-sm border-2 border-dashed border-slate-100 rounded-lg m-2">
                        Drop Candidate Here
                    </div>
                )}
              </div>
            </div>
          );
        })}

        {/* If no interviewers, show a prompt card */}
        {interviewers.length === 0 && (
          <div className="flex flex-col items-center justify-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 min-h-[300px] hover:bg-blue-50 hover:border-blue-300 transition-all cursor-pointer group" onClick={onAddStaff}>
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-slate-400 group-hover:text-blue-500 shadow-sm mb-4 transition-colors">
              <Plus size={32} />
            </div>
            <h3 className="font-bold text-slate-500 group-hover:text-blue-600">Add Staff</h3>
            <p className="text-sm text-slate-400">Get started by adding interviewers</p>
          </div>
        )}
        
        {/* Unassigned Pool */}
        <div className="flex flex-col bg-orange-50/50 rounded-xl border border-dashed border-orange-200" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, '')}>
           <div className="p-4 border-b border-orange-100">
             <h3 className="font-bold text-orange-800">Unassigned</h3>
             <p className="text-xs text-orange-600">Drag here to unassign</p>
           </div>
           <div className="p-3 space-y-2">
             {activeInterviews.filter(i => !i.interviewerId).map(interview => (
                <div 
                  key={interview.id} 
                  draggable={canMove}
                  onDragStart={(e) => handleDragStart(e, interview.id)}
                  className="bg-white p-3 rounded shadow-sm border-l-4 border-l-orange-400 cursor-move relative group"
                >
                   {canMove && (
                        <button 
                          onClick={() => onCancel(interview.id)}
                          className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          title="Cancel Interview"
                        >
                          <Trash2 size={14} />
                        </button>
                    )}
                   <div className="font-medium text-sm pr-6">{users.find(u => u.id === interview.studentId)?.name}</div>
                   <div className="text-xs text-slate-500">
                     {interview.durationMinutes === 0 ? 'Pending Schedule' : `${format(parseISO(interview.date), 'dd MMM yyyy')} @ ${interview.startTime}`}
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
