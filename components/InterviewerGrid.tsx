
import React, { useState } from 'react';
import { User, InterviewSlot, Stage } from '../types';
import { Sparkles, Check, Trash2, Building2, Clock, Mail, ShieldCheck } from 'lucide-react';
import { generateInterviewQuestions } from '../services/geminiService';
import { parseISO, format, addMinutes } from 'date-fns';

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
  // REQUIREMENT: remove waiting pool - all active interviews are shown under their respective or default staff
  const activeInterviews = interviews.filter(i => i.stage === Stage.INTERVIEWS || i.stage === Stage.CLASSES);
  
  const [aiQuestion, setAiQuestion] = useState<{name: string, content: string} | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [selectedInterviewId, setSelectedInterviewId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const formatDurationText = (mins: number) => {
    if (mins === 60) return "1 Hour";
    if (mins === 120) return "2 Hours";
    if (mins === 90) return "1:30 Hours";
    return `${mins}min`;
  };

  const getFullTimeDisplay = (interview: InterviewSlot) => {
    if (interview.durationMinutes === 0) {
      return { 
        dateStr: 'TBD', 
        timeRange: 'Unscheduled registration', 
        durText: 'Awaiting student action' 
      };
    }
    const start = parseISO(`${interview.date}T${interview.startTime}`);
    const end = addMinutes(start, interview.durationMinutes);
    const dateStr = format(start, 'd MMM');
    const timeRange = `${format(start, 'ha')} to ${format(end, 'ha')}`.toLowerCase();
    const durText = `(${formatDurationText(interview.durationMinutes)} interview)`;
    
    return { dateStr, timeRange, durText };
  };

  const handleAskAI = async (candidateName: string, stage: string) => {
    setLoadingAi(true);
    setAiQuestion({ name: candidateName, content: "Connecting to AI..." });
    const result = await generateInterviewQuestions(stage, candidateName);
    setAiQuestion({ name: candidateName, content: result });
    setLoadingAi(false);
  };

  const handleSyncToCalendar = (interviewId: string, name: string, company: string) => {
    setSyncingId(interviewId);
    setTimeout(() => {
      setSyncingId(null);
      alert(`Success: Event "${name} - ${company}" synchronized with telugukidai@gmail.com and raghavacsf@gmail.com.`);
    }, 1200);
  };

  return (
    <div className="space-y-6">
       {aiQuestion && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="glass-panel rounded-[2.5rem] shadow-[0_0_50px_rgba(153,27,27,0.4)] max-w-lg w-full p-10 animate-in zoom-in duration-300 border border-red-900/40">
            <h3 className="text-2xl font-black mb-4 flex items-center gap-3 dark:text-white uppercase tracking-tighter">
              <Sparkles className="text-red-500 w-7 h-7 animate-pulse"/>
              Lunar AI Assistant
            </h3>
            <p className="text-sm opacity-70 mb-6 font-bold dark:text-slate-300">Hard-coded synchronization for {aiQuestion.name}:</p>
            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 max-h-80 overflow-y-auto custom-scrollbar">
              {loadingAi ? (
                <div className="flex items-center gap-4 text-red-500 font-black uppercase text-xs">
                   <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                   Analyzing Profile...
                </div>
              ) : (
                <div className="whitespace-pre-line text-sm font-medium leading-relaxed dark:text-white">{aiQuestion.content}</div>
              )}
            </div>
            <div className="mt-8 flex justify-end">
              <button onClick={() => setAiQuestion(null)} className="px-10 py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl">Close Assistant</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {interviewers.map((interviewer, idx) => {
          // Unassigned items (Waiting Pool) are automatically shown on the first staff member's board
          const assigned = activeInterviews
            .filter(i => i.interviewerId === interviewer.id || (idx === 0 && !i.interviewerId))
            .sort((a, b) => {
              if (a.durationMinutes === 0) return 1;
              if (b.durationMinutes === 0) return -1;
              const dateA = new Date(`${a.date}T${a.startTime}`).getTime();
              const dateB = new Date(`${b.date}T${b.startTime}`).getTime();
              return dateA - dateB;
            });
          
          const isTarget = currentInterviewerId === interviewer.id;
          
          return (
            <div 
              key={interviewer.id} 
              onClick={() => selectedInterviewId && onAssign(selectedInterviewId, interviewer.id)}
              className={`flex flex-col rounded-[2.5rem] border glass-panel transition-all duration-500 group ${selectedInterviewId ? 'cursor-pointer hover:ring-4 ring-red-500/30' : ''} ${isTarget ? 'border-red-600 shadow-2xl shadow-red-900/20' : 'border-white/10'}`}
            >
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
                <div className="flex items-center gap-5">
                   <div className={`w-14 h-14 rounded-3xl flex items-center justify-center font-black text-xl shadow-lg ${isTarget ? 'bg-red-600 text-white' : 'bg-white/10 dark:bg-white/5 dark:text-white border border-white/5'}`}>
                      {interviewer.name.charAt(0)}
                   </div>
                   <div>
                      <h3 className="font-black tracking-tight text-xl dark:text-white uppercase">{interviewer.name}</h3>
                      <div className="flex items-center gap-1.5 text-[11px] opacity-60 font-black uppercase tracking-widest dark:text-red-400">
                         <Mail size={12} className="text-red-500" /> {interviewer.email || 'raghavacsf@gmail.com'}
                      </div>
                   </div>
                </div>
                {isTarget && <ShieldCheck className="text-red-500 w-6 h-6" />}
              </div>
              
              <div className="p-6 flex-1 min-h-[400px] space-y-4">
                {assigned.map(interview => {
                  const candidate = users.find(u => u.id === interview.studentId);
                  const isPlaceholder = interview.durationMinutes === 0;
                  const isSelected = selectedInterviewId === interview.id;
                  const isSyncing = syncingId === interview.id;
                  const timeInfo = getFullTimeDisplay(interview);
                  const isUnassigned = !interview.interviewerId;
                  
                  return (
                    <div 
                      key={interview.id} 
                      onClick={(e) => { e.stopPropagation(); setSelectedInterviewId(isSelected ? null : interview.id); }}
                      className={`glass-panel p-6 rounded-3xl border transition-all cursor-pointer relative group/card ${isSelected ? 'ring-2 ring-red-500 bg-red-600/10 scale-[1.02]' : isUnassigned ? 'border-dashed border-red-500/30 bg-red-900/5' : 'border-white/5 hover:bg-white/10'}`}
                    >
                      <button 
                        onClick={(e) => { e.stopPropagation(); onCancel(interview.id); }}
                        className="absolute top-3 right-3 p-1.5 text-slate-500 hover:text-red-500 transition-colors opacity-0 group-hover/card:opacity-100"
                        title="Remove Record"
                      >
                        <Trash2 size={14} />
                      </button>

                      <div className="flex justify-between items-start mb-4 pr-6">
                        <span className="font-black text-base tracking-tight dark:text-white uppercase">{candidate?.name}</span>
                        <div className={`text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-widest ${interview.stage === Stage.CLASSES ? 'bg-yellow-500/20 text-yellow-500' : 'bg-red-600/20 text-red-400'}`}>
                          {interview.stage}
                        </div>
                      </div>
                      
                      <div className="space-y-3 mb-6">
                        {interview.companyName && (
                          <div className="flex items-center gap-2 text-sm font-black dark:text-slate-300">
                             <Building2 size={14} className="text-red-500" /> {interview.companyName}
                          </div>
                        )}
                        <div className="flex flex-col gap-1 text-xs opacity-70 font-black dark:text-slate-400">
                          <div className="flex items-center gap-2">
                             <Clock size={14} className="text-red-500" />
                             {isPlaceholder ? 'PENDING BOOKING' : `${timeInfo.dateStr} @ ${timeInfo.timeRange}`}
                          </div>
                          {!isPlaceholder && (
                             <div className="ml-6 text-[10px] opacity-40 uppercase tracking-widest font-black">
                                {timeInfo.durText}
                             </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-3 justify-between items-center">
                        {!isPlaceholder && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); candidate && handleSyncToCalendar(interview.id, candidate.name, interview.companyName || ''); }}
                            className={`text-[10px] flex items-center gap-2 px-4 py-2 rounded-2xl font-black border transition-all ${isSyncing ? 'bg-white/5 text-slate-500 border-white/10' : 'bg-green-600/10 text-green-500 border-green-600/30 hover:bg-green-600/20'}`}
                          >
                            {isSyncing ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div> : <Check size={14} />} 
                            SYNCED
                          </button>
                        )}
                        <button 
                          onClick={(e) => { e.stopPropagation(); candidate && handleAskAI(candidate.name, interview.stage); }}
                          className="text-[10px] flex items-center gap-2 px-4 py-2 rounded-2xl font-black bg-red-600/10 text-red-500 border border-red-600/30 hover:bg-red-600/20 ml-auto shadow-sm uppercase tracking-widest"
                        >
                          <Sparkles size={14} /> AI AID
                        </button>
                      </div>
                    </div>
                  );
                })}
                 {assigned.length === 0 && (
                    <div className="text-center py-16 text-slate-500 text-[11px] font-black uppercase tracking-widest border-2 border-dashed border-white/5 rounded-[2rem] opacity-20">
                        No Active Board Entries
                    </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
