// ============================================================
// UpcomingView.jsx — Elegant Daily/Weekly Planner View
// Wired to live Supabase events
// ============================================================

'use client';

import { useMemo, useState } from 'react';
import RescheduleModal from '@/components/RescheduleModal';
import CancelModal from '@/components/CancelModal';
import ConflictNotification from '@/components/ConflictNotification';
import { supabase } from '@/lib/supabase';
import {
  detectConflicts,
  identifyReschedulingOpportunities,
  enrichAndSort,
  getPriorityColor,
} from '@/lib/priorityEngine';

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const ampm = i >= 12 ? 'PM' : 'AM';
  const hour = i % 12 || 12;
  return `${hour} ${ampm}`;
});

export default function UpcomingView({ events = [], onUpdate, onRefresh, onDelete }) {
  const [rescheduleEvent, setRescheduleEvent] = useState(null);
  const [cancelEvent, setCancelEvent] = useState(null);

  // Compute live stats and timeline blocks
  const { timelineBlocks, stats, conflicts, realConflicts } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayEvents = events.filter(e => {
      if (!e.event_datetime) return false;
      if (e.status === 'completed') return false;
      const d = new Date(e.event_datetime);
      return d >= today && d < tomorrow;
    });

    let criticalCount = 0;
    let conflictCount = 0;
    const blocks = [];

    // Sort chronologically
    todayEvents.sort((a, b) => new Date(a.event_datetime) - new Date(b.event_datetime));

    todayEvents.forEach((ev, idx) => {
      const dt = new Date(ev.event_datetime);
      const startMinutes = dt.getHours() * 60 + dt.getMinutes();
      
      // Default duration is 60 minutes if not specified
      const duration = ev.duration_minutes || 60;
      
      // Check for conflict with previous event
      let isConflict = false;
      if (idx > 0) {
        const prev = blocks[idx - 1];
        if (startMinutes < prev.startMinutes + prev.duration) {
          isConflict = true;
          conflictCount++;
        }
      }

      if (ev.priority === 'High' || ev.priority === 'Critical') criticalCount++;

      let icon = 'event';
      let color = '#656464'; // Default gray
      if (ev.category?.toLowerCase() === 'exam') { icon = 'school'; color = '#ad170c'; }
      if (ev.category?.toLowerCase() === 'meeting') { icon = 'groups'; color = '#2b4c7e'; }
      if (ev.category?.toLowerCase() === 'hackathon') { icon = 'rocket_launch'; color = '#ad170c'; }

      const dtEnd = new Date(dt.getTime() + duration * 60000);
      const timeSlot = `${dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} → ${dtEnd.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;

      blocks.push({
        id: ev.id,
        title: ev.title,
        time: timeSlot,
        category: (ev.category || 'other').toUpperCase(),
        priority: ev.priority,
        top: (startMinutes / 60) * 80, // 80px per hour
        height: (duration / 60) * 80,
        startMinutes,
        duration,
        color: isConflict ? '#ff9800' : color, // Orange if conflict
        icon,
        isConflict,
        _raw: ev
      });
    });

    return {
      timelineBlocks: blocks,
      conflicts: blocks.filter(b => b.isConflict),
      realConflicts: detectConflicts(todayEvents),
      stats: [
        { label: 'TOTAL EVENTS', value: todayEvents.length.toString(), icon: 'event' },
        { label: 'CRITICAL', value: criticalCount.toString(), icon: 'priority_high' },
        { label: 'TODAY', value: today.getDate().toString(), icon: 'push_pin' },
        { label: 'CONFLICTS', value: conflictCount.toString(), icon: 'warning' }
      ]
    };
  }, [events]);

  const handleMarkComplete = async (block) => {
    await onUpdate(block.id, { status: 'completed' });
  };

  const handleConflictResolve = (conflictIndex, action, chosenEventId) => {
    const conflict = realConflicts[conflictIndex];
    if (!conflict) return;
    if (action === 'reschedule' && chosenEventId) {
      const eventToReschedule = conflict.eventA.id === chosenEventId ? conflict.eventA : conflict.eventB;
      setRescheduleEvent(eventToReschedule);
    }
  };

  return (
    <div className="ml-64 pt-24 px-12 min-h-screen bg-surface-dim/20 pb-20 overflow-y-auto relative">
      
      {/* 1. Priority Hub Header Stats */}
      <div className="grid grid-cols-4 gap-6 mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
        {stats.map((stat) => (
          <div 
            key={stat.label}
            className="paper-slip p-6 flex flex-col items-center gap-2 border-b-2 border-primary/10 shadow-sm bg-white"
          >
            <span className="material-symbols-outlined text-primary/40 text-3xl opacity-80">{stat.icon}</span>
            <div className="text-4xl font-black text-[#1c1c18]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {stat.value}
            </div>
            <div className="text-[10px] font-bold tracking-[0.2em] opacity-40 uppercase text-black">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* 2. Rescheduling Alert Card (if conflicts exist) */}
      {conflicts.length > 0 && (
        <div 
          className="ruled-paper p-6 mb-12 border-l-4 border-[#ff9800] shadow-lg animate-in fade-in duration-700 bg-white"
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-[#ff9800]">sync_problem</span>
              <div>
                <div className="font-bold text-sm tracking-widest uppercase text-[#ff9800]">Schedule Conflict Detected</div>
                <div className="text-xs opacity-60 mt-1 italic font-serif">
                  {conflicts.length} overlapping event{conflicts.length > 1 ? 's' : ''} require your attention.
                </div>
              </div>
            </div>
            <button 
              onClick={() => setRescheduleEvent(conflicts[0]._raw)}
              className="px-4 py-2 bg-[#ff9800]/10 text-[#ff9800] text-xs font-bold uppercase tracking-widest hover:bg-[#ff9800]/20 transition-colors"
            >
              Resolve
            </button>
          </div>
        </div>
      )}

      {/* 2b. Rescheduling Opportunities (from AI priority engine) */}
      {(() => {
        const opportunities = identifyReschedulingOpportunities(events);
        if (opportunities.length === 0) return null;
        return (
          <div className="space-y-3 mb-12 animate-in fade-in duration-700">
            {opportunities.map((opp, idx) => (
              <div key={idx} className="ruled-paper p-5 border-l-4 border-[#ff9800] bg-white shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#ff9800]">swap_horiz</span>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.15em] text-[#ff9800]" style={{ fontFamily: 'Space Grotesk' }}>
                      Rescheduling Opportunity
                    </div>
                    <div className="text-sm italic mt-1 opacity-70" style={{ fontFamily: 'Newsreader, serif' }}>
                      {opp.suggestedReschedulings.length} lower-priority tasks could be moved before "{opp.criticalEvent.title}"
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {opp.suggestedReschedulings.slice(0, 3).map((task, i) => (
                        <span key={i} className="text-[9px] font-bold px-2 py-1 bg-[#ff9800]/10 text-[#ff9800] uppercase tracking-widest">
                          {task.taskTitle}
                        </span>
                      ))}
                      {opp.suggestedReschedulings.length > 3 && (
                        <span className="text-[9px] font-bold px-2 py-1 bg-[#ff9800]/10 text-[#ff9800] uppercase tracking-widest">
                          +{opp.suggestedReschedulings.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* 3. Planner Grid */}
      <div className="animate-in fade-in zoom-in-95 duration-1000 delay-100">
        <h3 className="text-2xl mb-8 uppercase tracking-widest font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Priority <span className="text-primary italic font-light">Timeline</span>
        </h3>

        <div className="relative flex bg-white/50 p-6 rounded-xl border border-black/5 shadow-sm">
          
          {/* Times column */}
          <div className="w-20 pr-4 text-right flex flex-col pt-2 relative z-10" style={{ gap: '65px' }}>
            {HOURS.map(hour => (
              <div key={hour} className="text-[10px] font-bold opacity-40 uppercase tracking-tighter h-[15px] leading-none">
                {hour}
              </div>
            ))}
          </div>

          {/* Grid Content Column */}
          <div className="flex-1 relative border-l border-black/10 min-h-[1920px]">
            {/* Horizontal Grid Lines */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" 
                 style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,0.2) 1px, transparent 1px)', backgroundSize: '100% 80px' }} />

            {/* Current Time Indicator */}
            <div 
              className="absolute w-full h-[2px] bg-primary/40 z-20"
              style={{ top: `${((new Date().getHours() * 60 + new Date().getMinutes()) / 60) * 80}px` }}
            >
              <div className="absolute left-[-4px] top-[-3px] w-2 h-2 rounded-full bg-primary" />
            </div>

            {/* Task Blocks */}
            {timelineBlocks.map(block => (
              <div 
                key={block.id}
                className="absolute left-4 right-4 paper-slip shadow-md p-4 transition-transform hover:scale-[1.01] hover:shadow-xl border-l-4 overflow-hidden bg-white z-10"
                style={{
                  top: `${block.top}px`,
                  minHeight: `${Math.max(block.height, 60)}px`,
                  borderLeftColor: block.color,
                }}
              >
                {/* Check/Action Icons */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-10 hover:opacity-100 transition-opacity z-20 bg-white/80 p-1 rounded-bl-md">
                   <button onClick={() => handleMarkComplete(block)} title="Mark Complete" className="material-symbols-outlined text-[18px] p-1 hover:text-green-600 transition-colors">check_circle</button>
                   <button onClick={() => setRescheduleEvent(block._raw)} title="Reschedule" className="material-symbols-outlined text-[18px] p-1 hover:text-primary transition-colors">sync</button>
                   <button onClick={() => setCancelEvent(block._raw)} title="Delete" className="material-symbols-outlined text-[18px] p-1 hover:text-red-600 transition-colors">close</button>
                </div>

                <div className="flex gap-4 items-start h-full">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                       style={{ backgroundColor: `${block.color}15`, color: block.color }}>
                    <span className="material-symbols-outlined">{block.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 mb-1 truncate">
                      {block.time} ({block.duration} MIN)
                    </div>
                    <div className="font-bold text-sm leading-tight uppercase text-[#1c1c18] mb-2 truncate">
                      {block.title}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                       <span className="text-[9px] font-bold px-2 py-1 bg-black/5 rounded-sm opacity-60 uppercase tracking-widest">{block.category}</span>
                       {block.priority === 'High' && <span className="text-[9px] font-bold px-2 py-1 bg-[#ff9800]/10 text-[#ff9800] rounded-sm uppercase tracking-widest">HIGH</span>}
                       {block.priority === 'Critical' && <span className="text-[9px] font-bold px-2 py-1 bg-[#ad170c]/10 text-[#ad170c] rounded-sm uppercase tracking-widest animate-pulse">CRITICAL</span>}
                    </div>
                    {/* AI Auto-Suggestion Tags */}
                    {(() => {
                      const tags = [...(block._raw?.key_topics || []), ...(block._raw?.action_items || [])];
                      if (tags.length === 0) return null;
                      return (
                        <div className="mt-2">
                          <div className="text-[8px] font-bold uppercase tracking-[0.2em] opacity-25 mb-1" style={{ fontFamily: 'Space Grotesk' }}>
                            <span className="material-symbols-outlined text-[10px] align-middle mr-0.5">auto_awesome</span>
                            AI Notes
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {tags.slice(0, 5).map((tag, ti) => (
                              <span
                                key={ti}
                                className="text-[8px] font-bold px-2 py-0.5 uppercase tracking-widest border border-black/8 bg-[#f5f0e8] text-[#1c1c18]/60"
                                style={{ fontFamily: 'Space Grotesk' }}
                              >
                                {tag}
                              </span>
                            ))}
                            {tags.length > 5 && (
                              <span className="text-[8px] font-bold px-2 py-0.5 opacity-40">+{tags.length - 5}</span>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reschedule Modal logic goes here. Needs RescheduleModal component. */}
      {rescheduleEvent && (
        <RescheduleModal 
           event={rescheduleEvent} 
           conflictingEvent={conflicts.find(c => c.id !== rescheduleEvent.id)?._raw} 
           allEvents={events}
           onClose={() => setRescheduleEvent(null)}
           onSuccess={() => { setRescheduleEvent(null); onRefresh(); }}
           onUpdate={onUpdate}
        />
      )}

      {/* Cancel Modal logic */}
      {cancelEvent && (
        <CancelModal
          event={cancelEvent}
          onClose={() => setCancelEvent(null)}
          onConfirm={async (eventId, reason) => {
            setCancelEvent(null);
            await onDelete(eventId, reason);
          }}
        />
      )}

      <ConflictNotification
        conflicts={realConflicts}
        onResolve={handleConflictResolve}
        onDismiss={() => {}}
      />
    </div>
  );
}
