// ============================================================
// CalendarView.jsx — Monthly calendar wired to live events
// ============================================================

'use client';

import { useState, useMemo } from 'react';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export default function CalendarView({ events = [] }) {
  const [selectedDay, setSelectedDay] = useState(null);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = new Date(year, month, 1).getDay();
  const todayDate = now.getDate();
  const monthName = now.toLocaleDateString('en-US', { month: 'long' });

  const grid = Array.from({ length: 42 }, (_, i) => i - startOffset + 1);

  // Group events by day of month
  const eventsByDay = useMemo(() => {
    const map = {};
    events.forEach(event => {
      if (!event.event_datetime) return;
      const d = new Date(event.event_datetime);
      if (d.getMonth() === month && d.getFullYear() === year) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push({
          id: event.id,
          title: event.title,
          time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          category: (event.category || 'other').toUpperCase(),
        });
      }
    });
    return map;
  }, [events, month, year]);

  return (
    <div className="ml-64 pt-24 px-12 min-h-screen bg-surface-dim/10 animate-in fade-in duration-500 pb-20">
      
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-widest text-[#1c1c18]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {monthName} <span className="text-primary italic">{year}</span>
          </h2>
          <p className="text-sm italic opacity-60 font-serif">Planning your journey month by month.</p>
        </div>
      </div>

      <div className="paper-slip p-8 bg-white shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 ruled-paper opacity-10 pointer-events-none" />
        <div className="grid grid-cols-7 gap-px bg-black/5 relative z-10">
          {DAYS.map(day => (
            <div key={day} className="bg-[#fcf9f2] p-4 text-[10px] font-bold tracking-[0.2em] text-center opacity-40">{day}</div>
          ))}

          {grid.map((dayNum, idx) => {
            const hasTasks = eventsByDay[dayNum];
            const isToday = dayNum === todayDate;

            return (
              <div 
                key={idx} 
                className={`bg-white min-h-[120px] p-2 transition-all cursor-pointer hover:bg-surface-container group relative ${dayNum < 1 || dayNum > daysInMonth ? 'opacity-0 pointer-events-none' : ''}`}
                onClick={() => dayNum > 0 && dayNum <= daysInMonth && setSelectedDay(dayNum)}
              >
                <div className={`text-sm font-bold w-10 h-10 flex items-center justify-center rounded-full transition-colors ${isToday ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'opacity-30 group-hover:opacity-100'}`}>
                  {(dayNum > 0 && dayNum <= daysInMonth) ? dayNum : ''}
                </div>
                <div className="mt-2 pl-2 flex gap-1 flex-wrap">
                  {hasTasks?.map(t => (
                    <div key={t.id} className="w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary/80 transition-colors" />
                  ))}
                </div>
                {hasTasks && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-40 transition-opacity">
                    <span className="material-symbols-outlined text-[10px]">open_in_new</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Day Detail Overlay */}
      {selectedDay && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300 backdrop-blur-md"
          style={{ backgroundColor: 'rgba(28,28,24,0.4)' }}
          onClick={() => setSelectedDay(null)}
        >
          <div 
            className="paper-slip bg-white p-10 w-full max-w-md shadow-2xl relative animate-in slide-in-from-bottom-10"
            style={{ transform: 'rotate(-0.5deg)' }}
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setSelectedDay(null)} className="absolute top-4 right-4 material-symbols-outlined opacity-30 hover:opacity-100 transition-opacity">close</button>

            <div className="text-[10px] font-bold tracking-[0.3em] uppercase opacity-40 mb-2" style={{ fontFamily: 'Work Sans' }}>Daily Schedule</div>
            <h3 className="text-3xl font-black uppercase tracking-widest text-[#1c1c18] mb-8" style={{ fontFamily: 'Space Grotesk' }}>
              {monthName} {selectedDay}
            </h3>

            <div className="space-y-4">
              {eventsByDay[selectedDay] ? (
                eventsByDay[selectedDay].map(task => (
                  <div key={task.id} className="p-6 border border-black/5 bg-surface rounded-sm hover:-translate-y-1 transition-all shadow-sm relative group overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors" />
                    <div className="text-[10px] font-bold opacity-30 uppercase tracking-[0.2em] mb-1">{task.time}</div>
                    <div className="font-bold text-xl leading-tight uppercase text-[#1c1c18] mb-3">{task.title}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold px-3 py-1 bg-primary/5 text-primary rounded-full uppercase tracking-widest">{task.category}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="italic opacity-40 text-center py-16 font-serif bg-surface/30 rounded-lg border border-dashed border-black/5">
                  No events pinned for this date.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
