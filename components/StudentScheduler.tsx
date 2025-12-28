
import React, { useState, useEffect } from 'react';
import { User, InterviewSlot, Stage, BlockedSlot, HOURS_START, HOURS_END, Notification } from '../types';
import { CheckCircle, Clock, ChevronRight, ChevronLeft, Building2, XCircle, Bell, ArrowRight, Sparkles } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, startOfToday, isToday, startOfWeek, endOfWeek, parseISO, addMinutes } from 'date-fns';
import { Button } from './Button';

interface StudentSchedulerProps {
  student: User;
  interviews: InterviewSlot[];
  blockedSlots: BlockedSlot[];
  notifications?: Notification[];
  onSchedule: (date: string, time: string, duration: number, companyName: string) => void;
  onCancel: (interviewId: string) => void;
  onClearNotification?: (id: string) => void;
}

const timeToMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const minutesToTime = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const formatDurationText = (mins: number) => {
  if (mins === 60) return "1 Hour";
  if (mins === 120) return "2 Hours";
  if (mins === 90) return "1:30 Hours";
  return `${mins}min`;
};

export const StudentScheduler: React.FC<StudentSchedulerProps> = ({ 
  student, interviews = [], blockedSlots = [], notifications = [], onSchedule, onCancel, onClearNotification
}) => {
  const [currentMonth, setCurrentMonth] = useState(() => startOfToday());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [selectedTime, setSelectedTime] = useState<string | null>(null); 
  const [isSyncing, setIsSyncing] = useState(false);
  const [feedback, setFeedback] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [slotStatuses, setSlotStatuses] = useState<{time: string, status: string}[]>([]);

  const bookedInterviews = (interviews || [])
    .filter(i => i.studentId === student.id && i.durationMinutes > 0)
    .sort((a, b) => new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime());

  useEffect(() => {
    // REQUIREMENT: without adding company name dont give slot timings
    if (!companyName.trim() || !selectedDate || !duration) {
      setSlotStatuses([]);
      return;
    }

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const dayInts = (interviews || []).filter(i => i.date === dateStr && i.durationMinutes > 0);
    const dayBlocks = (blockedSlots || []).filter(b => b.date === dateStr);
    
    const slots = [];
    let currentMin = HOURS_START * 60;
    while (currentMin <= HOURS_END * 60) {
      const time = minutesToTime(currentMin);
      let status = 'available';
      const endMin = currentMin + duration;
      
      if (endMin > HOURS_END * 60 + 15) status = 'past';
      else if (isToday(selectedDate) && new Date(`${dateStr}T${time}`) < new Date()) status = 'past';
      else if (dayBlocks.some(b => Math.max(currentMin, timeToMinutes(b.startTime)) < Math.min(endMin, timeToMinutes(b.endTime)))) status = 'blocked';
      else if (dayInts.some(i => Math.max(currentMin, timeToMinutes(i.startTime)) < Math.min(endMin, timeToMinutes(i.startTime) + i.durationMinutes))) status = 'booked';
      
      if (status !== 'past') slots.push({ time, status });
      currentMin += 15;
    }
    setSlotStatuses(slots);
  }, [selectedDate, duration, interviews, blockedSlots, companyName]);

  const handleBook = () => {
    if (!selectedDate || !selectedTime || !duration || !companyName) return;
    setIsSyncing(true);
    
    setTimeout(() => {
      onSchedule(format(selectedDate, 'yyyy-MM-dd'), selectedTime, duration, companyName);
      setIsSyncing(false);
      setFeedback({ 
        type: 'success', 
        text: `Confirmed: Calendar Event "${student.name} - ${companyName}" created for telugukidai@gmail.com and raghavacsf@gmail.com.` 
      });
      setCompanyName('');
      setDuration(null);
      setSelectedTime(null);
      setSelectedDate(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 1800);
  };

  const getFullDisplay = (interview: InterviewSlot) => {
    const start = parseISO(`${interview.date}T${interview.startTime}`);
    const end = addMinutes(start, interview.durationMinutes);
    return {
      date: format(start, 'd MMM'),
      range: `${format(start, 'ha')} to ${format(end, 'ha')}`.toLowerCase(),
      durationLabel: `(${formatDurationText(interview.durationMinutes)} interview)`
    };
  };

  if (!student.approved) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center glass-panel rounded-[2.5rem] p-12 shadow-2xl border border-white/10">
         <XCircle className="w-16 h-16 text-red-600 mx-auto mb-6" />
         <h1 className="text-3xl font-black mb-4 dark:text-white uppercase">Verification Required</h1>
         <p className="text-lg opacity-70 font-bold dark:text-slate-300">Your profile is currently under review by our administration.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-700">
      
      {notifications.filter(n => n.userId === student.id && !n.read).map(notif => (
        <div key={notif.id} className="glass-panel border-red-500/20 bg-red-950/20 p-6 rounded-3xl flex items-center justify-between shadow-xl">
           <div className="flex gap-4">
             <Bell className="text-red-500 animate-bounce" />
             <div className="dark:text-white">
                <p className="font-black text-sm tracking-tight">{notif.message}</p>
                <p className="text-[10px] font-bold opacity-50 uppercase mt-1">
                  {notif.timestamp ? format(parseISO(notif.timestamp), 'dd MMM yyyy') : 'Recently'}
                </p>
             </div>
           </div>
           <button onClick={() => onClearNotification?.(notif.id)} className="opacity-40 hover:opacity-100 dark:text-white"><XCircle /></button>
        </div>
      ))}

      {bookedInterviews.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-black flex items-center gap-3 dark:text-white uppercase tracking-tight">
             <CheckCircle className="text-green-500" /> My Schedule
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bookedInterviews.map(i => {
              const display = getFullDisplay(i);
              return (
                <div key={i.id} className="glass-panel p-6 rounded-[2.5rem] border-white/10 hover:shadow-2xl transition-all bg-white/5 group relative">
                  <div className="flex justify-between items-start dark:text-white">
                    <div>
                        <div className="text-[9px] font-black uppercase tracking-widest text-red-500 mb-1">Booked</div>
                        <div className="text-3xl font-black tracking-tighter">{display.date}</div>
                        <div className="text-sm font-bold opacity-70 mt-1">{display.range}</div>
                        <div className="text-[10px] opacity-40 uppercase font-black tracking-widest mt-1">{display.durationLabel}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Company</div>
                        <div className="text-lg font-black">{i.companyName}</div>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
                    <div className="text-[9px] font-black bg-green-500/10 text-green-400 px-3 py-1.5 rounded-full border border-green-500/20 uppercase tracking-widest">SYNCED</div>
                    <button 
                      onClick={() => onCancel(i.id)} 
                      className="text-[10px] font-black opacity-30 group-hover:opacity-100 group-hover:text-red-500 transition-all uppercase tracking-widest"
                    >
                      Reschedule / Cancel
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-12">
        <div className="text-center">
           <h1 className="text-5xl font-black tracking-tighter mb-4 dark:text-white uppercase">Secure Session</h1>
           <p className="text-lg opacity-60 font-black dark:text-slate-300">Identify your destination company to unlock the board.</p>
        </div>

        {feedback && (
          <div className={`p-6 rounded-3xl border glass-panel font-black text-center animate-in slide-in-from-top-4 ${feedback.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
            {feedback.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7 glass-panel p-8 rounded-[3rem] border-white/10 shadow-xl">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black tracking-tight dark:text-white">{format(currentMonth, 'MMMM yyyy')}</h3>
              <div className="flex gap-2">
                <button onClick={() => setCurrentMonth(prev => addMonths(prev, -1))} className="p-2 glass-panel border-none rounded-xl hover:bg-white/20 dark:text-white"><ChevronLeft/></button>
                <button onClick={() => setCurrentMonth(prev => addMonths(prev, 1))} className="p-2 glass-panel border-none rounded-xl hover:bg-white/20 dark:text-white"><ChevronRight/></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-4">
               {['S','M','T','W','T','F','S'].map(d => <div key={d} className="text-center text-[10px] font-black opacity-30 dark:text-white">{d}</div>)}
               {eachDayOfInterval({ start: startOfWeek(startOfMonth(currentMonth)), end: endOfWeek(endOfMonth(currentMonth)) }).map(date => {
                 const isSel = selectedDate && isSameDay(date, selectedDate);
                 const isPast = date < startOfToday();
                 const curMonth = isSameMonth(date, currentMonth);
                 return (
                   <button 
                     key={date.toISOString()} disabled={isPast} onClick={() => setSelectedDate(date)}
                     className={`aspect-square rounded-2xl font-black text-sm flex items-center justify-center transition-all ${!curMonth ? 'opacity-20' : ''} ${isSel ? 'bg-red-600 text-white shadow-xl shadow-red-900/40 scale-110' : isPast ? 'opacity-10 cursor-not-allowed' : 'hover:bg-white/10 border border-white/5 dark:text-white'}`}
                   >
                     {format(date, 'd')}
                   </button>
                 );
               })}
            </div>
            
            <div className={`mt-10 transition-all duration-500 ${!selectedDate ? 'opacity-20 translate-y-2' : 'opacity-100 translate-y-0'}`}>
               <div className="flex items-center gap-2 font-black text-xs uppercase tracking-widest opacity-60 mb-4 dark:text-slate-300"><Clock size={14}/> Interview Length</div>
               <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[30, 60, 90, 120].map(v => (
                    <button key={v} onClick={() => setDuration(v)} className={`py-4 rounded-2xl text-xs font-black border transition-all ${duration === v ? 'bg-red-600 border-red-500 text-white shadow-lg' : 'glass-panel border-white/5 hover:bg-white/10 dark:text-white'}`}>
                      {formatDurationText(v)}
                    </button>
                  ))}
               </div>
            </div>
          </div>

          <div className={`lg:col-span-5 flex flex-col glass-panel p-8 rounded-[3rem] transition-all duration-500 border-white/10 shadow-xl ${(!selectedDate || !duration) ? 'opacity-20' : 'opacity-100'}`}>
             <h3 className="text-xl font-black mb-6 dark:text-white">Availability</h3>
             <div className="mb-6 space-y-4">
                <div className="relative">
                  <Building2 className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${companyName ? 'text-red-500' : 'text-slate-500'}`} size={18} />
                  <input 
                    type="text" placeholder="Target Company Name" value={companyName} onChange={e => setCompanyName(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-slate-300 font-black focus:ring-4 ring-red-500/10 focus:border-red-500 outline-none text-slate-900"
                  />
                  {!companyName.trim() && <div className="text-[9px] text-red-500 font-black uppercase tracking-widest mt-3 animate-pulse">Required: Company Name to see slots</div>}
                </div>
             </div>
             
             <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 max-h-[400px]">
                {slotStatuses.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-2">
                    {slotStatuses.map(s => (
                      <button 
                        key={s.time} disabled={s.status !== 'available'} onClick={() => setSelectedTime(s.time)}
                        className={`p-4 rounded-2xl font-black text-xs border transition-all flex items-center justify-between ${selectedTime === s.time ? 'bg-red-600 text-white border-red-600 shadow-lg' : s.status === 'available' ? 'glass-panel bg-white/5 border-white/10 hover:bg-white/10 dark:text-white' : 'opacity-10 bg-slate-500/10 cursor-not-allowed border-transparent'}`}
                      >
                        {s.time} {selectedTime === s.time && <ArrowRight size={14}/>}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="h-60 flex flex-col items-center justify-center text-slate-500 opacity-40 font-black uppercase tracking-tighter text-sm text-center px-12 border-2 border-dashed border-white/5 rounded-[2rem]">
                      {!companyName.trim() ? 'Board Locked: Identity Company' : 'No available lunar slots'}
                  </div>
                )}
             </div>
          </div>
        </div>
      </div>

      {selectedTime && !isSyncing && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-full max-w-2xl px-6 animate-in slide-in-from-bottom-10">
           <div className="glass-panel p-8 rounded-[3rem] shadow-[0_40px_80px_-15px_rgba(153,27,27,0.5)] border-red-900/30 flex flex-col md:flex-row items-center justify-between gap-6 bg-red-950/80 backdrop-blur-3xl border">
              <div>
                 <div className="text-[9px] font-black uppercase tracking-widest text-red-400 mb-1">Finalize Secure Booking</div>
                 <div className="text-2xl font-black text-white">{format(selectedDate!, 'dd MMMM')} at {selectedTime}</div>
                 <div className="text-[10px] opacity-60 font-black text-red-200 uppercase tracking-widest mt-1">{formatDurationText(duration!)} Interview session</div>
              </div>
              <Button onClick={handleBook} className="px-14 py-5 rounded-2xl text-lg font-black bg-red-600 hover:bg-red-500 shadow-2xl hover:scale-105 active:scale-95 transition-all w-full md:w-auto text-white uppercase tracking-widest">
                 BOOK NOW
              </Button>
           </div>
        </div>
      )}

      {isSyncing && (
        <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center p-6 text-center">
           <div className="animate-in zoom-in duration-500">
              <div className="relative w-32 h-32 mx-auto mb-10">
                 <div className="absolute inset-0 border-8 border-red-600/10 rounded-full"></div>
                 <div className="absolute inset-0 border-8 border-red-600 border-t-transparent rounded-full animate-spin shadow-[0_0_30px_rgba(220,38,38,0.5)]"></div>
              </div>
              <h2 className="text-4xl font-black tracking-tighter mb-4 text-white uppercase">Syncing Boards</h2>
              <p className="text-xl opacity-60 font-bold text-red-200">Scheduling for telugukidai and raghavacsf...</p>
           </div>
        </div>
      )}
    </div>
  );
};
