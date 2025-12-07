
import React, { useState, useEffect } from 'react';
import { User, InterviewSlot, Stage, BlockedSlot, HOURS_START, HOURS_END, Notification } from '../types';
import { CheckCircle, Calendar as CalendarIcon, Clock, ChevronRight, ChevronLeft, Building2, Ban, AlertTriangle, RefreshCw, Info, Calendar, XCircle, Bell, ArrowRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, startOfToday, isToday, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { Button } from './Button';

interface StudentSchedulerProps {
  student: User;
  interviews: InterviewSlot[];
  blockedSlots: BlockedSlot[];
  notifications?: Notification[];
  defaultInterviewer?: User;
  onSchedule: (date: string, time: string, duration: number, companyName: string) => void;
  onCancel: (interviewId: string) => void;
  onClearNotification?: (id: string) => void;
}

const isTimeOverlapping = (start1: number, end1: number, start2: number, end2: number) => {
  // Standard overlap check: Max(Start) < Min(End)
  return Math.max(start1, start2) < Math.min(end1, end2);
};

const timeToMinutes = (time: string) => {
  if (!time) return 0;
  const parts = time.split(':');
  if (parts.length !== 2) return 0;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  return h * 60 + m;
};

export const StudentScheduler: React.FC<StudentSchedulerProps> = ({ 
  student, 
  interviews = [], 
  blockedSlots = [], 
  notifications = [],
  defaultInterviewer,
  onSchedule, 
  onCancel,
  onClearNotification
}) => {
  const [currentMonth, setCurrentMonth] = useState(() => startOfToday());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [selectedTime, setSelectedTime] = useState<string | null>(null); 
  
  const [feedbackMsg, setFeedbackMsg] = useState<{type: 'success' | 'info' | 'error', text: string} | null>(null);
  const [slotStatuses, setSlotStatuses] = useState<{time: string, status: string}[]>([]);
  const [interviewToCancel, setInterviewToCancel] = useState<string | null>(null);

  if (!student) return null;

  const myInterviews = (interviews || [])
    .filter(i => i.studentId === student.id && (i.stage === Stage.CLASSES || i.stage === Stage.INTERVIEWS) && i.durationMinutes > 0)
    .sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.startTime}`);
      const dateB = new Date(`${b.date}T${b.startTime}`);
      return dateA.getTime() - dateB.getTime();
    });

  const durations = [
    { label: '15 Mins', value: 15 },
    { label: '30 Mins', value: 30 },
    { label: '1 Hour', value: 60 },
    { label: '2 Hours', value: 120 },
  ];

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  useEffect(() => {
    if (selectedDate && duration) {
      try {
        calculateSlots();
      } catch (e) {
        console.error("Error calculating slots", e);
        setSlotStatuses([]);
      }
    } else {
      setSlotStatuses([]);
    }
  }, [selectedDate, duration, interviews, blockedSlots]);

  // Reset selections when dependencies change
  useEffect(() => {
    setSelectedTime(null);
    setFeedbackMsg(null);
  }, [selectedDate, duration]);

  const calculateSlots = () => {
    if (!selectedDate || !duration) return;
    
    // STRICT string formatting to avoid timezone issues. 
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const newSlots: {time: string, status: string}[] = [];
    
    const safeInterviews = Array.isArray(interviews) ? interviews : [];
    const safeBlocked = Array.isArray(blockedSlots) ? blockedSlots : [];

    const daysInterviews = safeInterviews.filter(i => i.date === dateStr && (i.stage === Stage.CLASSES || i.stage === Stage.INTERVIEWS));
    const daysBlocked = safeBlocked.filter(b => b.date === dateStr);

    let currentTimeMinutes = HOURS_START * 60; 
    const latestStartTimeMinutes = HOURS_END * 60;

    while (currentTimeMinutes <= latestStartTimeMinutes) {
      const h = Math.floor(currentTimeMinutes / 60);
      const m = currentTimeMinutes % 60;
      const timeString = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      
      const slotStart = currentTimeMinutes;
      // Note: for VISUAL blocked status, we mainly care if the start time is occupied
      // We do NOT block visually for duration overlaps here anymore, as requested.
      // Validation happens on click.

      let status = 'available';
      
      if (isToday(selectedDate) && new Date(`${dateStr}T${timeString}`) < new Date()) {
        status = 'past'; 
      } else {
         // 1. Check Admin Blocks (These are hard blocks)
         const blockingSlot = daysBlocked.find(b => {
           const bStart = timeToMinutes(b.startTime);
           const bEnd = timeToMinutes(b.endTime);
           // Admin blocks cover the entire range inclusive
           return slotStart >= bStart && slotStart < bEnd;
         });

         if (blockingSlot) {
            status = 'blocked';
         } else {
           // 2. Check Interviews - VISUAL CHECK
           // We only mark it as 'booked' if the slot START time is strictly inside an existing interview
           const isOccupied = daysInterviews.some(i => {
              const iStart = timeToMinutes(i.startTime);
              const iEnd = iStart + i.durationMinutes;
              return slotStart >= iStart && slotStart < iEnd;
           });

           if (isOccupied) {
              // Check if it's my own interview
              const isMine = daysInterviews.some(i => i.studentId === student.id && slotStart >= timeToMinutes(i.startTime) && slotStart < (timeToMinutes(i.startTime) + i.durationMinutes));
              status = isMine ? 'mine' : 'booked';
           } 
           // We intentionally DO NOT check for duration overlap here (the 'unavailable' state)
           // to satisfy the request that previous empty slots should not be blocked.
         }
      }

      if (status !== 'past') {
        newSlots.push({ time: timeString, status });
      }

      currentTimeMinutes += 15; 
    }
    setSlotStatuses(newSlots);
  };

  const handleSlotClick = (time: string) => {
    if (!companyName.trim()) {
      setFeedbackMsg({ type: 'error', text: "Please enter a Company Name before selecting a slot." });
      return;
    }

    if (!duration || !selectedDate) return;

    // PERFORM STRICT VALIDATION HERE
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const slotStart = timeToMinutes(time);
    const slotEnd = slotStart + duration;

    // Check overlaps with Interviews
    const safeInterviews = Array.isArray(interviews) ? interviews : [];
    const daysInterviews = safeInterviews.filter(i => i.date === dateStr && (i.stage === Stage.CLASSES || i.stage === Stage.INTERVIEWS));
    
    const conflict = daysInterviews.find(i => {
       const iStart = timeToMinutes(i.startTime);
       const iEnd = iStart + i.durationMinutes;
       return isTimeOverlapping(slotStart, slotEnd, iStart, iEnd);
    });

    if (conflict) {
      setFeedbackMsg({ 
        type: 'error', 
        text: `Duration Conflict: This ${duration}m slot overlaps with an existing interview at ${conflict.startTime}.` 
      });
      return;
    }

    // Check overlaps with Blocks
    const safeBlocked = Array.isArray(blockedSlots) ? blockedSlots : [];
    const daysBlocked = safeBlocked.filter(b => b.date === dateStr);
    const blockConflict = daysBlocked.find(b => {
      const bStart = timeToMinutes(b.startTime);
      const bEnd = timeToMinutes(b.endTime);
      return isTimeOverlapping(slotStart, slotEnd, bStart, bEnd);
    });

    if (blockConflict) {
      setFeedbackMsg({ 
        type: 'error', 
        text: `This slot is marked unavailable by the administrator.` 
      });
      return;
    }

    // Check if it goes past working hours
    if (slotEnd > (HOURS_END * 60) + 15) { // Allow slight buffer if needed, but strict end
       setFeedbackMsg({ 
        type: 'error', 
        text: `Booking extends past working hours (8:30 PM).` 
      });
      return;
    }

    setFeedbackMsg(null);
    setSelectedTime(time);
  };

  // Helper to generate link for the confirmation action (instant open)
  const createInstantLink = (date: Date, time: string, durationMin: number, company: string) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const startTime = parseISO(`${dateStr}T${time}`);
      const endTime = new Date(startTime.getTime() + durationMin * 60000);
      
      const startStr = format(startTime, "yyyyMMdd'T'HHmmss");
      const endStr = format(endTime, "yyyyMMdd'T'HHmmss");
      
      const title = encodeURIComponent(`Interview: ${company}`);
      const details = encodeURIComponent(`Interview with ${company}`);
      const location = encodeURIComponent("Online");
      
      // If default interviewer is present, add them
      const guest = defaultInterviewer?.email ? `&add=${defaultInterviewer.email}` : '';
      
      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&location=${location}${guest}`;
  };

  const handleBookAppointment = () => {
    if (selectedDate && duration && selectedTime && companyName.trim()) {
       // Open GCal immediately
       const link = createInstantLink(selectedDate, selectedTime, duration, companyName);
       window.open(link, '_blank');

       onSchedule(format(selectedDate, 'yyyy-MM-dd'), selectedTime, duration, companyName);
       
       // Success actions
       setCompanyName('');
       setDuration(null); 
       setSelectedTime(null);
       
       setFeedbackMsg({ type: 'success', text: 'Booking Confirmed! Google Calendar opened.' });
       // Scroll to top to see the booking
       window.scrollTo({ top: 0, behavior: 'smooth' });
       setTimeout(() => setFeedbackMsg(null), 5000);
    }
  };

  const handleConfirmCancel = () => {
    if (interviewToCancel) {
      onCancel(interviewToCancel);
      setInterviewToCancel(null);
      setFeedbackMsg({ type: 'info', text: 'Booking cancelled. Please select a new slot.' });
      setTimeout(() => {
        document.getElementById('booking-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      setTimeout(() => setFeedbackMsg(null), 8000);
    }
  };

  const generateGCalLink = (interview: InterviewSlot) => {
    const startTime = parseISO(`${interview.date}T${interview.startTime}`);
    const endTime = new Date(startTime.getTime() + interview.durationMinutes * 60000);
    const startStr = format(startTime, "yyyyMMdd'T'HHmmss");
    const endStr = format(endTime, "yyyyMMdd'T'HHmmss");
    const title = encodeURIComponent(`Interview with ${interview.companyName || 'Interviewer'}`);
    const details = encodeURIComponent(`Stage: ${interview.stage}`);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&location=Online`;
  };

  if (!student.approved) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center p-10 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 shadow-sm animate-in fade-in">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-amber-600" />
        </div>
        <h2 className="text-2xl font-bold mb-3">Pending Approval</h2>
        <p className="text-amber-800 leading-relaxed">
          Your registration has been received. Please wait for an administrator to approve your account.
        </p>
      </div>
    );
  }

  const myNotifications = notifications.filter(n => n.userId === student.id && !n.read);

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-32 animate-in fade-in relative">
      
      {/* Notifications Area */}
      {myNotifications.length > 0 && (
         <div className="space-y-3">
           {myNotifications.map(notif => (
             <div key={notif.id} className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start justify-between shadow-sm animate-in slide-in-from-top-2">
                <div className="flex gap-3">
                   <div className="bg-red-100 p-2 rounded-full h-fit">
                      <Bell className="w-4 h-4 text-red-600" />
                   </div>
                   <div>
                     <h4 className="font-bold text-red-900">Notification</h4>
                     <p className="text-red-800 text-sm">{notif.message}</p>
                   </div>
                </div>
                {onClearNotification && (
                  <button onClick={() => onClearNotification(notif.id)} className="text-red-400 hover:text-red-600">
                    <XCircle size={18} />
                  </button>
                )}
             </div>
           ))}
         </div>
      )}

      {myInterviews.length > 0 && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
           <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
             <CheckCircle className="text-green-600" /> Your Scheduled Interviews
           </h2>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {myInterviews.map(interview => (
               <div key={interview.id} className="bg-white rounded-xl border border-green-200 p-5 relative overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
                 <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                 <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Date & Time</p>
                      <p className="font-bold text-slate-900 text-lg">
                        {format(parseISO(interview.date), 'dd MMM yyyy')} at {interview.startTime}
                      </p>
                      <p className="text-sm text-slate-600 mt-1">{interview.durationMinutes} Minutes</p>
                    </div>
                    {interview.companyName && (
                      <div className="text-right">
                         <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Company</p>
                         <p className="font-semibold text-slate-800">{interview.companyName}</p>
                      </div>
                    )}
                 </div>
                 <div className="mt-5 pt-4 border-t border-slate-100 flex justify-between items-center">
                    <a 
                      href={generateGCalLink(interview)} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-xs flex items-center gap-1 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg text-green-700 font-medium transition-colors"
                    >
                      <Calendar size={14} /> GCal
                    </a>

                    <button 
                      onClick={() => setInterviewToCancel(interview.id)}
                      className="text-xs text-slate-600 hover:text-red-600 font-medium flex items-center gap-1 bg-slate-50 border border-slate-200 hover:bg-red-50 hover:border-red-200 px-3 py-1.5 rounded-lg transition-all"
                    >
                      <RefreshCw size={14} /> Cancel
                    </button>
                 </div>
               </div>
             ))}
           </div>
        </div>
      )}

      <div id="booking-section" className="space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">
            {myInterviews.length > 0 ? 'Book Another Slot' : 'Book Your Interview'}
          </h1>
          <p className="text-slate-500 text-lg">Select a date, duration, and time slot.</p>
        </div>

        {feedbackMsg && (
          <div className={`max-w-2xl mx-auto p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${feedbackMsg.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : (feedbackMsg.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-blue-100 text-blue-800 border border-blue-200')}`}>
             {feedbackMsg.type === 'success' ? <CheckCircle className="w-5 h-5"/> : (feedbackMsg.type === 'error' ? <AlertTriangle className="w-5 h-5" /> : <Info className="w-5 h-5"/>)}
             <p className="font-medium">{feedbackMsg.text}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800">
                      <CalendarIcon className="w-5 h-5 text-blue-600" /> 
                      {format(currentMonth, 'MMMM yyyy')}
                  </h3>
                  <div className="flex gap-2">
                      <button onClick={() => setCurrentMonth(prev => addMonths(prev, -1))} className="p-1 hover:bg-slate-100 rounded-full"><ChevronLeft className="w-5 h-5 text-slate-600"/></button>
                      <button onClick={() => setCurrentMonth(prev => addMonths(prev, 1))} className="p-1 hover:bg-slate-100 rounded-full"><ChevronRight className="w-5 h-5 text-slate-600"/></button>
                  </div>
              </div>

              <div className="grid grid-cols-7 gap-2 mb-2">
                 {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                   <div key={d} className="text-center text-xs font-semibold text-slate-400 uppercase py-1">{d}</div>
                 ))}
              </div>
              
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((date) => {
                  const isSelected = selectedDate && isSameDay(date, selectedDate);
                  const isCurrentMonth = isSameMonth(date, currentMonth);
                  const isTodayDate = isToday(date);
                  const isPast = date < startOfToday();

                  return (
                    <button
                      key={date.toISOString()}
                      disabled={isPast}
                      onClick={() => setSelectedDate(date)}
                      className={`
                        aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-all relative
                        ${!isCurrentMonth ? 'text-slate-300 bg-slate-50/50' : ''}
                        ${isSelected 
                          ? 'bg-blue-600 text-white shadow-md scale-105 z-10' 
                          : isPast ? 'bg-slate-50 text-slate-300 cursor-not-allowed' : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-100'
                        }
                        ${isTodayDate && !isSelected ? 'ring-2 ring-blue-400 ring-offset-2' : ''}
                      `}
                    >
                      <span className="font-bold text-lg">{format(date, 'd')}</span>
                      {isTodayDate && <span className="absolute bottom-1 w-1 h-1 bg-blue-500 rounded-full"></span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all duration-300 ${!selectedDate ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
               <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-800">
                <Clock className="w-5 h-5 text-blue-600" /> Select Duration
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {durations.map(d => (
                  <button
                    key={d.value}
                    onClick={() => setDuration(d.value)}
                    className={`px-4 py-3 rounded-xl border font-medium text-sm transition-all ${
                      duration === d.value
                       ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                       : 'bg-white hover:border-blue-300 border-slate-200 text-slate-700'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
             <div className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col transition-all duration-300 ${(!selectedDate || !duration) ? 'opacity-50 pointer-events-none' : ''}`}>
               <div className="mb-4 pb-4 border-b border-slate-100">
                 <h3 className="font-bold text-lg text-slate-800">Available Slots</h3>
                 <p className="text-sm text-slate-500">
                   {selectedDate ? format(selectedDate, 'dd MMM yyyy') : 'Select a date'}
                 </p>
               </div>
               
               <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Company Name <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <input 
                    type="text" 
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Enter company name"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  {!companyName.trim() && duration && (
                    <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                      <AlertTriangle size={12} /> Enter company name to see slots
                    </p>
                  )}
               </div>
               
               <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[400px]">
                 {(slotStatuses.length > 0) ? (
                   <div className="grid grid-cols-2 gap-3">
                     {slotStatuses.map(slot => (
                       <button
                        key={slot.time}
                        disabled={(slot.status !== 'available' && slot.status !== 'booked' && slot.status !== 'mine') || !companyName.trim()}
                        onClick={() => handleSlotClick(slot.time)}
                        className={`
                          group flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl border transition-all shadow-sm
                          ${slot.time === selectedTime 
                             ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-300 ring-offset-1 z-10' 
                             : ''}
                          ${slot.status === 'available' && slot.time !== selectedTime
                             ? (companyName.trim() ? 'bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border-slate-200 hover:border-blue-200 cursor-pointer' : 'bg-slate-50 text-slate-400 cursor-not-allowed') 
                             : ''}
                          ${slot.status === 'booked' ? 'bg-yellow-50 text-yellow-700 border-yellow-200 cursor-not-allowed opacity-90' : ''}
                          ${slot.status === 'mine' ? 'bg-green-50 text-green-700 border-green-200 cursor-not-allowed opacity-90' : ''}
                          ${slot.status === 'blocked' ? 'bg-red-50 text-red-700 border-red-200 cursor-not-allowed opacity-80' : ''}
                        `}
                       >
                         {slot.time}
                         {slot.status === 'mine' && <CheckCircle size={14} />}
                         {slot.status === 'booked' && <Ban size={14} />}
                         {slot.status === 'blocked' && <Ban size={14} />}
                       </button>
                     ))}
                   </div>
                 ) : (
                   <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 min-h-[200px]">
                     <CalendarIcon size={48} className="text-slate-200" />
                     <p>No slots available or selection incomplete.</p>
                   </div>
                 )}
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Booking Footer for Confirmation */}
      {selectedTime && selectedDate && duration && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-2xl z-40 animate-in slide-in-from-bottom-5">
           <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <p className="text-sm text-slate-500 font-medium uppercase tracking-wide">Confirm Booking</p>
                <div className="flex items-center gap-2 text-xl font-bold text-slate-800">
                  <span>{format(selectedDate, 'dd MMM')}</span>
                  <ArrowRight size={18} className="text-slate-400" />
                  <span>{selectedTime}</span>
                  <span className="text-slate-400 font-normal text-base">({duration} mins)</span>
                </div>
              </div>
              <Button 
                onClick={handleBookAppointment}
                className="w-full sm:w-auto px-8 py-3 text-lg shadow-blue-200 shadow-lg"
              >
                Book Appointment
              </Button>
           </div>
        </div>
      )}

      {interviewToCancel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
             <div className="bg-amber-500 p-6 text-white">
               <h3 className="text-xl font-bold flex items-center gap-2">
                 <AlertTriangle className="w-6 h-6" /> Reschedule Interview
               </h3>
             </div>
             <div className="p-6 space-y-4">
               <p className="text-slate-600 text-sm">
                 To reschedule, we must first <strong>cancel your current booking</strong>.
               </p>
               <div className="flex gap-3 pt-4">
                 <Button variant="secondary" className="flex-1" onClick={() => setInterviewToCancel(null)}>Back</Button>
                 <Button variant="danger" className="flex-1" onClick={handleConfirmCancel}>
                   Yes, Cancel
                 </Button>
               </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
