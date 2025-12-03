
import React, { useState, useEffect } from 'react';
import { User, InterviewSlot, Stage, BlockedSlot, HOURS_START, HOURS_END } from '../types';
import { CheckCircle, Calendar as CalendarIcon, Clock, ChevronRight, ChevronLeft, Building2, Trash2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, startOfToday, isToday, addMinutes, parse } from 'date-fns';
import { Button } from './Button';

interface StudentSchedulerProps {
  student: User;
  interviews: InterviewSlot[];
  blockedSlots: BlockedSlot[];
  onSchedule: (date: string, time: string, duration: number, companyName: string) => void;
  onCancel: (interviewId: string) => void;
}

// Helper to check overlaps
const isTimeOverlapping = (start1: number, end1: number, start2: number, end2: number) => {
  return Math.max(start1, start2) < Math.min(end1, end2);
};

const timeToMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export const StudentScheduler: React.FC<StudentSchedulerProps> = ({ student, interviews, blockedSlots, onSchedule, onCancel }) => {
  const [currentMonth, setCurrentMonth] = useState(startOfToday());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [companyName, setCompanyName] = useState('');
  
  // Slot Status: 'available' | 'booked' (Yellow) | 'blocked' (Red) | 'selected'
  const [slotStatuses, setSlotStatuses] = useState<{time: string, status: string}[]>([]);
  
  // Confirmation Modal
  const [pendingSlot, setPendingSlot] = useState<string | null>(null);

  const myInterviews = interviews.filter(i => i.studentId === student.id && (i.stage === Stage.CLASSES || i.stage === Stage.INTERVIEWS));

  // Durations
  const durations = [
    { label: '15 Mins', value: 15 },
    { label: '30 Mins', value: 30 },
    { label: '1 Hour', value: 60 },
    { label: '2 Hours', value: 120 },
  ];

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  useEffect(() => {
    if (selectedDate && duration) {
      calculateSlots();
    } else {
      setSlotStatuses([]);
    }
  }, [selectedDate, duration, interviews, blockedSlots]);

  const calculateSlots = () => {
    if (!selectedDate || !duration) return;
    
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const newSlots: {time: string, status: string}[] = [];
    
    // Existing interviews on this day
    const daysInterviews = interviews.filter(i => i.date === dateStr && (i.stage === Stage.CLASSES || i.stage === Stage.INTERVIEWS));
    
    // Blocked slots on this day
    const daysBlocked = blockedSlots.filter(b => b.date === dateStr);

    let currentTimeMinutes = HOURS_START * 60; 
    const latestStartTimeMinutes = HOURS_END * 60;

    while (currentTimeMinutes <= latestStartTimeMinutes) {
      const h = Math.floor(currentTimeMinutes / 60);
      const m = currentTimeMinutes % 60;
      const timeString = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      
      const slotStart = currentTimeMinutes;
      const slotEnd = currentTimeMinutes + duration;

      const slotDateTime = new Date(`${dateStr}T${timeString}`);
      
      let status = 'available';

      // 1. Check if in past (if today)
      if (isToday(selectedDate) && slotDateTime < new Date()) {
        status = 'past'; // Don't show or disable
      } else {
         // 2. Check Admin Blocks (Red) - Highest Priority
         const isBlocked = daysBlocked.some(b => {
           const bStart = timeToMinutes(b.startTime);
           const bEnd = timeToMinutes(b.endTime);
           return isTimeOverlapping(slotStart, slotEnd, bStart, bEnd);
         });

         if (isBlocked) {
           status = 'blocked';
         } else {
           // 3. Check Booked by Others OR Self (Yellow)
           const isBooked = daysInterviews.some(i => {
             const iStart = timeToMinutes(i.startTime);
             const iEnd = iStart + i.durationMinutes;
             return isTimeOverlapping(slotStart, slotEnd, iStart, iEnd);
           });

           if (isBooked) status = 'booked';
         }
      }

      if (status !== 'past') {
        newSlots.push({ time: timeString, status });
      }

      currentTimeMinutes += 15; 
    }
    setSlotStatuses(newSlots);
  };

  const initiateBooking = (time: string) => {
    setPendingSlot(time);
    setCompanyName('');
  };

  const confirmBooking = () => {
    if (selectedDate && duration && pendingSlot && companyName.trim()) {
      onSchedule(format(selectedDate, 'yyyy-MM-dd'), pendingSlot, duration, companyName);
      setPendingSlot(null);
      // Reset after booking
      setCompanyName('');
    }
  };

  if (!student.approved) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center p-10 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 shadow-sm">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-amber-600" />
        </div>
        <h2 className="text-2xl font-bold mb-3">Pending Approval</h2>
        <p className="text-amber-800 leading-relaxed">
          Your registration has been received. Please wait for an administrator to approve your account before scheduling your interview.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      
      {/* 1. My Scheduled Interviews Section */}
      {myInterviews.length > 0 && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 animate-in slide-in-from-top-4 duration-500">
           <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
             <CheckCircle className="text-green-600" /> Your Scheduled Interviews
           </h2>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {myInterviews.map(interview => (
               <div key={interview.id} className="bg-slate-50 rounded-xl border border-slate-200 p-5 relative overflow-hidden group hover:shadow-md transition-shadow">
                 <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                 <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Date & Time</p>
                      <p className="font-bold text-slate-900 text-lg">
                        {format(new Date(interview.date), 'MMM do')} at {interview.startTime}
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
                 <div className="mt-5 pt-4 border-t border-slate-200 flex justify-end">
                    <button 
                      onClick={() => {
                        if(confirm('Are you sure you want to cancel this interview? You can reschedule by booking a new slot.')) {
                          onCancel(interview.id);
                        }
                      }}
                      className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1 bg-white border border-red-100 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} /> Cancel / Reschedule
                    </button>
                 </div>
               </div>
             ))}
           </div>
        </div>
      )}

      {/* 2. New Booking Section */}
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">
            {myInterviews.length > 0 ? 'Book Another Slot' : 'Book Your Interview'}
          </h1>
          <p className="text-slate-500 text-lg">Select a date, duration, and time slot.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Calendar & Duration */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Calendar Grid */}
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
                {monthDays.map((date) => {
                  const isSelected = selectedDate && isSameDay(date, selectedDate);
                  const isCurrentMonth = isSameMonth(date, currentMonth);
                  const isTodayDate = isToday(date);
                  
                  // Past dates disable
                  const isPast = date < startOfToday();

                  if (!isCurrentMonth) return <div key={date.toString()} className="aspect-square"></div>;

                  return (
                    <button
                      key={date.toString()}
                      disabled={isPast}
                      onClick={() => setSelectedDate(date)}
                      className={`
                        aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-all relative
                        ${isSelected 
                          ? 'bg-blue-600 text-white shadow-md scale-105 z-10' 
                          : isPast ? 'bg-slate-50 text-slate-300 cursor-not-allowed' : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-100'
                        }
                        ${isTodayDate && !isSelected ? 'ring-2 ring-blue-400 ring-offset-2' : ''}
                      `}
                    >
                      <span className={`text-xs ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>{format(date, 'MMM')}</span>
                      <span className="font-bold text-lg">{format(date, 'd')}</span>
                      {isTodayDate && <span className="absolute bottom-1 w-1 h-1 bg-blue-500 rounded-full"></span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Duration Selector */}
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

          {/* Right Column: Slots */}
          <div className="lg:col-span-5">
             <div className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col transition-all duration-300 ${(!selectedDate || !duration) ? 'opacity-50 pointer-events-none' : ''}`}>
               <div className="mb-4 pb-4 border-b border-slate-100">
                 <h3 className="font-bold text-lg text-slate-800">Available Slots</h3>
                 <p className="text-sm text-slate-500">
                   {selectedDate ? format(selectedDate, 'EEEE, MMMM do') : 'Select a date'}
                   {duration ? ` • ${duration} Mins` : ''}
                 </p>
                 <div className="flex gap-3 mt-3 text-[10px] uppercase font-bold tracking-wide">
                    <span className="flex items-center gap-1 text-slate-500"><span className="w-2 h-2 rounded-full bg-slate-200"></span> Available</span>
                    <span className="flex items-center gap-1 text-yellow-600"><span className="w-2 h-2 rounded-full bg-yellow-400"></span> Unavailable</span>
                    <span className="flex items-center gap-1 text-red-600"><span className="w-2 h-2 rounded-full bg-red-500"></span> Blocked</span>
                 </div>
               </div>
               
               <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                 {slotStatuses.length > 0 ? (
                   <div className="grid grid-cols-2 gap-3">
                     {slotStatuses.map(slot => (
                       <button
                        key={slot.time}
                        disabled={slot.status !== 'available'}
                        onClick={() => initiateBooking(slot.time)}
                        className={`
                          group flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl border transition-all shadow-sm
                          ${slot.status === 'available' ? 'bg-slate-50 hover:bg-blue-600 hover:text-white border-slate-200 hover:border-blue-600 cursor-pointer' : ''}
                          ${slot.status === 'booked' ? 'bg-yellow-50 text-yellow-700 border-yellow-200 cursor-not-allowed opacity-90' : ''}
                          ${slot.status === 'blocked' ? 'bg-red-50 text-red-700 border-red-200 cursor-not-allowed opacity-80' : ''}
                        `}
                       >
                         {slot.time}
                         {slot.status === 'available' && <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
                         {slot.status === 'booked' && <span className="text-[10px] uppercase">Booked</span>}
                         {slot.status === 'blocked' && <span className="text-[10px] uppercase">Blocked</span>}
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
               
               {slotStatuses.length > 0 && (
                 <div className="mt-4 pt-4 border-t border-slate-100 text-center text-xs text-slate-400">
                   Working hours: 9:00 AM - 8:30 PM
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>

      {/* Booking Confirmation Modal */}
      {pendingSlot && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-blue-600 p-6 text-white">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <CheckCircle className="w-6 h-6" /> Confirm Booking
              </h3>
              <p className="text-blue-100 mt-1">Please provide final details</p>
            </div>
            
            <div className="p-6 space-y-6">
               <div className="grid grid-cols-2 gap-4 text-sm">
                 <div className="bg-slate-50 p-3 rounded-lg">
                   <span className="block text-slate-400 text-xs font-bold uppercase">Date</span>
                   <span className="font-semibold text-slate-800">{selectedDate && format(selectedDate, 'MMM do')}</span>
                 </div>
                 <div className="bg-slate-50 p-3 rounded-lg">
                   <span className="block text-slate-400 text-xs font-bold uppercase">Time</span>
                   <span className="font-semibold text-slate-800">{pendingSlot} ({duration}m)</span>
                 </div>
               </div>

               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-2">Company Name <span className="text-red-500">*</span></label>
                 <div className="relative">
                   <Building2 className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                   <input 
                    type="text" 
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Enter company name"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    autoFocus
                   />
                 </div>
               </div>
               
               <div className="flex gap-3 pt-2">
                 <Button variant="secondary" className="flex-1" onClick={() => setPendingSlot(null)}>Cancel</Button>
                 <Button 
                   className="flex-1" 
                   disabled={!companyName.trim()}
                   onClick={confirmBooking}
                 >
                   Confirm Slot
                 </Button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
