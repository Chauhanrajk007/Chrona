// ============================================================
// PriorityView.jsx — Full Priority Hub (paper-themed)
// Ported ALL features from src/pages/Priority.jsx:
//   - Enriched ranked actions list
//   - AI-generated schedule with study blocks
//   - Notification alert banners  
//   - Rescheduling opportunities  
//   - Conflict detection + ConflictNotification toasts
//   - Cancel modal
//   - Auto-archive expired events (60 min grace)
//   - Schedule change logging
//   - Complete / Reschedule / Delete actions
// ============================================================

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, getCurrentUserId } from '@/lib/supabase';
import api from '@/lib/api';
import ConflictNotification from '@/components/ConflictNotification';
import CancelModal from '@/components/CancelModal';
import RescheduleModal from '@/components/RescheduleModal';
import {
  enrichAndSort,
  enrichAndSortWithProfile,
  generateSchedule,
  detectConflicts,
  identifyReschedulingOpportunities,
  findNextFreeSlot,
  rescheduleEvent,
  generateRescheduleMessage,
  getPriorityScore,
} from '@/lib/priorityEngine';

const TICK_INTERVAL = 60_000;

export default function PriorityView({ events: externalEvents, onDelete, onUpdate, onRefresh }) {
  const [localEvents, setLocalEvents] = useState(externalEvents || []);
  const [view, setView] = useState('schedule');
  const [tick, setTick] = useState(0);
  const [onboardingProfile, setOnboardingProfile] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);

  // Helper: extract real event UUID from schedule item IDs
  const extractEventId = (itemId) => {
    if (!itemId) return null;
    if (itemId.startsWith('event-')) return itemId.slice(6);
    if (itemId.startsWith('study-')) {
      const rest = itemId.slice(6);
      const lastDash = rest.lastIndexOf('-');
      return lastDash > 0 ? rest.slice(0, lastDash) : rest;
    }
    return itemId;
  };

  // Sync external events
  useEffect(() => { setLocalEvents(externalEvents || []); }, [externalEvents]);

  // Fetch onboarding profile
  useEffect(() => {
    api.get('/api/onboarding/status')
      .then(data => { if (data?.completed && data?.profile) setOnboardingProfile(data.profile); })
      .catch(() => {});
  }, []);

  // Detect conflicts
  useEffect(() => {
    if (localEvents.length > 1) setConflicts(detectConflicts(localEvents, 30));
    else setConflicts([]);
  }, [localEvents, tick]);

  // Real-time tick + auto-archive
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
      const now = new Date();
      setLocalEvents(prev => {
        const expired = prev.filter(e => (now - new Date(e.event_datetime)) >= 3600000);
        const remaining = prev.filter(e => (now - new Date(e.event_datetime)) < 3600000);

        if (expired.length > 0) {
          const nowISO = now.toISOString();
          const archivedEvents = expired.map(e => ({
            ...e, status: 'expired', archived_at: nowISO, notes: 'Automatically archived - event expired'
          }));
          supabase.from('drafts').insert(archivedEvents).then(({ error: archiveErr }) => {
            if (archiveErr) console.error('Archive failed:', archiveErr.message);
            const ids = expired.map(e => e.id);
            supabase.from('schedule_changes').update({ event_id: null }).in('event_id', ids).then(() => {
              supabase.from('events').delete().in('id', ids).then(({ error: delErr }) => {
                if (delErr) console.error('Auto-cleanup failed:', delErr.message);
              });
            });
          });
        }
        return remaining;
      });
    }, TICK_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const handleDeleteConfirm = useCallback(async (eventId, reason) => {
    const deletedEvent = localEvents.find(e => e.id === eventId);
    setLocalEvents(prev => prev.filter(e => e.id !== eventId));
    try {
      await onDelete(eventId);
      api.post('/api/schedule/changes', {
        event_id: null, change_type: 'cancelled', reason: reason || 'Cancelled by user',
        metadata: { original_event_id: eventId, event_title: deletedEvent?.title || 'Unknown', cancellation_reason: reason }
      }).catch(() => {});
    } catch (err) {
      console.error('Delete failed:', err);
      onRefresh();
    } finally {
      setCancelTarget(null);
    }
  }, [localEvents, onDelete, onRefresh]);

  const handleCompleteEvent = useCallback(async (eventId) => {
    const completedEvent = localEvents.find(e => e.id === eventId);
    await onUpdate(eventId, { status: 'completed' });
    setLocalEvents(prev => prev.filter(e => e.id !== eventId));
    api.post('/api/schedule/changes', {
      event_id: eventId, change_type: 'completed',
      reason: generateRescheduleMessage(completedEvent || { title: 'Event' }, 'completed'),
      metadata: { event_title: completedEvent?.title || 'Unknown' },
    }).catch(() => {});
  }, [localEvents, onUpdate]);

  const handleAutoReschedule = useCallback((event) => {
    setRescheduleTarget({ event, conflictingEvent: null });
  }, []);

  const handleConflictResolve = useCallback((conflictIndex, action, chosenEventId) => {
    const conflict = conflicts[conflictIndex];
    if (!conflict) return;
    if (action === 'reschedule' && chosenEventId) {
      const eventToReschedule = conflict.eventA.id === chosenEventId ? conflict.eventA : conflict.eventB;
      const otherEvent = conflict.eventA.id === chosenEventId ? conflict.eventB : conflict.eventA;
      setRescheduleTarget({ event: eventToReschedule, conflictingEvent: otherEvent });
    }
  }, [conflicts]);

  // Computed data
  const enrichedEvents = useMemo(() => (
    onboardingProfile ? enrichAndSortWithProfile(localEvents, onboardingProfile) : enrichAndSort(localEvents)
  ), [localEvents, onboardingProfile, tick]);

  const schedule = useMemo(() => generateSchedule(localEvents), [localEvents, tick]);
  const reschedulingOpportunities = useMemo(() => identifyReschedulingOpportunities(localEvents), [localEvents, tick]);

  const activeAlerts = enrichedEvents.filter(e => e.alert && e.alert.type !== 'past').map(e => e.alert);

  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    return [
      { label: 'TOTAL EVENTS', value: localEvents.length, icon: 'event' },
      { label: 'CRITICAL', value: enrichedEvents.filter(e => e.priority_score > 15).length, icon: 'priority_high' },
      {
        label: 'TODAY',
        value: localEvents.filter(e => { const d = new Date(e.event_datetime); return d >= today && d < tomorrow; }).length,
        icon: 'push_pin'
      },
      { label: 'CONFLICTS', value: conflicts.length, icon: 'warning' },
    ];
  }, [localEvents, enrichedEvents, conflicts]);

  // Priority color → paper-theme color map
  const paperColor = (color) => {
    if (!color) return '#656464';
    if (color.label === 'Critical') return '#ad170c';
    if (color.label === 'High') return '#ff9800';
    if (color.label === 'Medium') return '#2b4c7e';
    return '#3ddc97';
  };

  return (
    <div className="ml-64 pt-24 px-12 min-h-screen bg-surface-dim/20 pb-20 overflow-y-auto relative">

      {/* Conflict Notification Toasts */}
      <ConflictNotification
        conflicts={conflicts}
        onResolve={handleConflictResolve}
        onDismiss={() => {}}
      />

      {/* Cancel Modal */}
      {cancelTarget && (
        <CancelModal
          event={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}

      {/* Reschedule Modal */}
      {rescheduleTarget && (
        <RescheduleModal
          event={rescheduleTarget.event}
          conflictingEvent={rescheduleTarget.conflictingEvent}
          allEvents={localEvents}
          onClose={() => setRescheduleTarget(null)}
          onSuccess={() => { setRescheduleTarget(null); onRefresh(); }}
          onUpdate={onUpdate}
        />
      )}

      {/* 1. Stats Grid */}
      <div className="grid grid-cols-4 gap-6 mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
        {stats.map(stat => (
          <div key={stat.label} className="paper-slip p-6 flex flex-col items-center gap-2 border-b-2 border-primary/10 shadow-sm bg-white">
            <span className="material-symbols-outlined text-primary/40 text-3xl opacity-80">{stat.icon}</span>
            <div className="text-4xl font-black text-[#1c1c18]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{stat.value}</div>
            <div className="text-[10px] font-bold tracking-[0.2em] opacity-40 uppercase text-black">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* 2. Notification Alert Banners */}
      {activeAlerts.length > 0 && (
        <div className="space-y-3 mb-10 animate-in fade-in duration-700">
          {activeAlerts.map((alert, i) => (
            <div key={i} className="ruled-paper p-5 border-l-4 bg-white shadow-sm" style={{ borderLeftColor: alert.color }}>
              <div className="flex items-start gap-3">
                <span className="text-2xl">{alert.icon}</span>
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: alert.color, fontFamily: 'Space Grotesk' }}>{alert.title}</div>
                  <div className="text-sm italic mt-1 opacity-70" style={{ fontFamily: 'Newsreader, serif' }}>{alert.message}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Rescheduling Opportunities */}
      {reschedulingOpportunities.length > 0 && (
        <div className="space-y-3 mb-10 animate-in fade-in duration-700">
          {reschedulingOpportunities.map((opp, idx) => (
            <div key={idx} className="ruled-paper p-5 border-l-4 border-[#ff9800] bg-white shadow-sm">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[#ff9800]">swap_horiz</span>
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.15em] text-[#ff9800]" style={{ fontFamily: 'Space Grotesk' }}>Rescheduling Opportunity</div>
                  <div className="text-sm italic mt-1 opacity-70" style={{ fontFamily: 'Newsreader, serif' }}>
                    {opp.suggestedReschedulings.length} lower-priority tasks could be rescheduled before "{opp.criticalEvent.title}"
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {opp.suggestedReschedulings.slice(0, 3).map((task, i) => (
                      <span key={i} className="text-[9px] font-bold px-2 py-1 bg-[#ff9800]/10 text-[#ff9800] uppercase tracking-widest">{task.taskTitle}</span>
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
      )}

      {/* Onboarding Profile Badge */}
      {onboardingProfile && (
        <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 bg-[#3ddc97]/10 border border-[#3ddc97]/20">
          <span className="text-sm">✨</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ fontFamily: 'Space Grotesk', color: '#3ddc97' }}>
            Personalized for {onboardingProfile.primary_focus} · {onboardingProfile.preferred_slot} peak
          </span>
        </div>
      )}

      {/* 4. View Toggle */}
      <div className="flex mb-8">
        <div className="flex bg-white shadow-sm border border-black/5 overflow-hidden">
          {[
            { id: 'schedule', label: 'Schedule' },
            { id: 'ranked', label: 'Ranked Actions' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className="px-6 py-3 text-xs font-bold uppercase tracking-[0.15em] transition-all"
              style={{
                fontFamily: 'Space Grotesk, sans-serif',
                backgroundColor: view === tab.id ? '#ad170c' : 'transparent',
                color: view === tab.id ? '#ffffff' : '#1c1c18',
                opacity: view === tab.id ? 1 : 0.5,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Content */}
      {localEvents.length === 0 ? (
        <div className="text-center py-20 paper-slip bg-white shadow-sm">
          <span className="material-symbols-outlined text-5xl opacity-20 block mb-4">event_busy</span>
          <p className="font-bold uppercase tracking-widest text-sm opacity-40" style={{ fontFamily: 'Space Grotesk' }}>No events in system</p>
          <p className="text-xs italic opacity-40 mt-1" style={{ fontFamily: 'Newsreader, serif' }}>Create an event to get started.</p>
        </div>
      ) : view === 'schedule' ? (
        /* ======== SCHEDULE VIEW ======== */
        <div className="space-y-4">
          {schedule.length === 0 ? (
            <div className="text-center py-12 paper-slip bg-white text-sm italic opacity-40" style={{ fontFamily: 'Newsreader, serif' }}>
              No upcoming events detected
            </div>
          ) : (
            schedule.map((item, i) => {
              const isBreak = item.type === 'break';
              const isStudy = item.type === 'study';
              const accentColor = isBreak ? '#656464' : isStudy ? '#2b4c7e' : '#ad170c';
              return (
                <div
                  key={item.id}
                  className="paper-slip bg-white p-5 border-l-4 transition-transform hover:scale-[1.005] hover:shadow-lg animate-in fade-in slide-in-from-bottom-2"
                  style={{ borderLeftColor: accentColor, animationDelay: `${i * 40}ms`, animationFillMode: 'backwards' }}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="w-10 h-10 flex items-center justify-center shrink-0 text-2xl">{item.actionIcon}</div>

                    <div className="flex-1 min-w-0">
                      {/* Top meta row */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold tracking-[0.2em] opacity-40 uppercase" style={{ fontFamily: 'Space Grotesk' }}>
                          {item.startTime} → {item.endTime} ({item.duration} MIN)
                        </span>
                        {item.category && (
                          <span className="text-[9px] font-bold px-2 py-0.5 bg-black/5 uppercase tracking-widest opacity-60">{item.category}</span>
                        )}
                        {item.alert && item.alert.type !== 'past' && (
                          <span className="text-[9px] font-bold px-2 py-0.5 uppercase tracking-widest animate-pulse" style={{ backgroundColor: `${item.alert.color}15`, color: item.alert.color }}>
                            {item.alert.icon} {item.alert.title}
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <div className="font-bold text-sm uppercase text-[#1c1c18] leading-tight truncate" style={{ fontFamily: 'Space Grotesk' }}>
                        {item.title}
                      </div>

                      {/* Action clause */}
                      <div className="mt-2 p-3 bg-surface-container border border-black/5">
                        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: accentColor, fontFamily: 'Space Grotesk' }}>
                          {item.action}
                        </p>
                        <p className="text-xs italic mt-1 opacity-60" style={{ fontFamily: 'Newsreader, serif' }}>
                          {item.recommendation}
                        </p>
                      </div>

                      {/* AI Auto-Suggestion Tags */}
                      {(() => {
                        const realId = extractEventId(item.id);
                        const ev = realId ? localEvents.find(e => e.id === realId) : null;
                        const tags = [...(ev?.key_topics || []), ...(ev?.action_items || [])];
                        if (tags.length === 0) return null;
                        return (
                          <div className="mt-3">
                            <div className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-30 mb-1.5" style={{ fontFamily: 'Space Grotesk' }}>
                              <span className="material-symbols-outlined text-[12px] align-middle mr-1">auto_awesome</span>
                              AI Suggestions
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {tags.map((tag, ti) => (
                                <span
                                  key={ti}
                                  className="text-[9px] font-bold px-2.5 py-1 uppercase tracking-widest border border-black/8 bg-[#f5f0e8] text-[#1c1c18]/70 hover:bg-[#ad170c]/10 hover:text-[#ad170c] hover:border-[#ad170c]/20 transition-colors cursor-default"
                                  style={{ fontFamily: 'Space Grotesk' }}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {item.venue && (
                        <div className="mt-1.5 text-[10px] opacity-40 italic" style={{ fontFamily: 'Newsreader, serif' }}>
                          📍 {item.venue}
                        </div>
                      )}
                    </div>

                    {/* Action buttons (only for non-break items) */}
                    {!isBreak && (
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button onClick={() => handleCompleteEvent(extractEventId(item.id))}
                          className="material-symbols-outlined text-[18px] p-1.5 hover:text-green-600 transition-colors opacity-30 hover:opacity-100" title="Complete">
                          check_circle
                        </button>
                        <button onClick={() => {
                            const ev = localEvents.find(e => e.id === extractEventId(item.id));
                            if (ev) handleAutoReschedule(ev);
                          }}
                          className="material-symbols-outlined text-[18px] p-1.5 hover:text-[#ff9800] transition-colors opacity-30 hover:opacity-100" title="Reschedule">
                          sync
                        </button>
                        <button onClick={() => {
                            const ev = localEvents.find(e => e.id === extractEventId(item.id));
                            if (ev) setCancelTarget(ev);
                          }}
                          className="material-symbols-outlined text-[18px] p-1.5 hover:text-[#ad170c] transition-colors opacity-30 hover:opacity-100" title="Delete">
                          close
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* ======== RANKED ACTIONS VIEW ======== */
        <div className="space-y-4">
          <div className="text-center mb-8">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40" style={{ fontFamily: 'Space Grotesk' }}>
              AI-Ranked by Priority Score
            </span>
          </div>

          {enrichedEvents.map((event, i) => {
            const color = paperColor(event.color);
            return (
              <div
                key={event.id}
                className="paper-slip bg-white p-5 border-l-4 transition-transform hover:scale-[1.005] hover:shadow-lg animate-in fade-in slide-in-from-bottom-2"
                style={{ borderLeftColor: color, animationDelay: `${i * 50}ms`, animationFillMode: 'backwards' }}
              >
                <div className="flex items-start gap-4">
                  {/* Rank + Icon */}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div className="w-9 h-9 flex items-center justify-center text-xs font-black bg-black/5 uppercase" style={{ fontFamily: 'Space Grotesk' }}>
                      #{i + 1}
                    </div>
                    <div className="text-xl">{event.actionIcon}</div>
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Category + Alert + Score */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[9px] font-bold px-2 py-0.5 uppercase tracking-widest" style={{ backgroundColor: `${color}15`, color }}>{event.category}</span>
                      {event.alert && event.alert.type !== 'past' && (
                        <span className="text-[9px] font-bold px-2 py-0.5 uppercase tracking-widest animate-pulse" style={{ backgroundColor: `${event.alert.color}15`, color: event.alert.color }}>
                          {event.alert.icon} {event.alert.title}
                        </span>
                      )}
                      <div className="ml-auto flex items-center gap-1.5">
                        <div className="text-xs font-black px-2 py-1 text-center" style={{ backgroundColor: `${color}15`, color, fontFamily: 'Space Grotesk' }}>
                          {event.priority_score} pts
                        </div>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-sm uppercase text-[#1c1c18] leading-tight" style={{ fontFamily: 'Space Grotesk' }}>
                      {event.title}
                    </h3>
                    <p className="text-[10px] opacity-40 font-bold tracking-[0.15em] uppercase mt-0.5" style={{ fontFamily: 'Space Grotesk' }}>
                      {new Date(event.event_datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {new Date(event.event_datetime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      {event.venue && ` · ${event.venue}`}
                    </p>

                    {/* Action clause */}
                    <div className="mt-3 p-3 bg-surface-container border border-black/5">
                      <p className="text-xs font-bold uppercase tracking-widest" style={{ color, fontFamily: 'Space Grotesk' }}>{event.action}</p>
                      <p className="text-xs italic mt-1 opacity-60" style={{ fontFamily: 'Newsreader, serif' }}>{event.recommendation}</p>
                      {event.studyHours && (
                        <div className="mt-1.5 text-[10px] font-bold opacity-40 uppercase tracking-widest" style={{ fontFamily: 'Space Grotesk' }}>
                          ⏱ {event.studyHours}h block required
                        </div>
                      )}
                    </div>

                    {/* AI Auto-Suggestion Tags */}
                    {(() => {
                      const tags = [...(event.key_topics || []), ...(event.action_items || [])];
                      if (tags.length === 0) return null;
                      return (
                        <div className="mt-3">
                          <div className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-30 mb-1.5" style={{ fontFamily: 'Space Grotesk' }}>
                            <span className="material-symbols-outlined text-[12px] align-middle mr-1">auto_awesome</span>
                            AI Suggestions
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {tags.map((tag, ti) => (
                              <span
                                key={ti}
                                className="text-[9px] font-bold px-2.5 py-1 uppercase tracking-widest border border-black/8 bg-[#f5f0e8] text-[#1c1c18]/70 hover:bg-[#ad170c]/10 hover:text-[#ad170c] hover:border-[#ad170c]/20 transition-colors cursor-default"
                                style={{ fontFamily: 'Space Grotesk' }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button onClick={() => handleCompleteEvent(event.id)}
                      className="material-symbols-outlined text-[18px] p-1.5 hover:text-green-600 transition-colors opacity-30 hover:opacity-100" title="Complete">
                      check_circle
                    </button>
                    <button onClick={() => handleAutoReschedule(event)}
                      className="material-symbols-outlined text-[18px] p-1.5 hover:text-[#ff9800] transition-colors opacity-30 hover:opacity-100" title="Auto-reschedule">
                      sync
                    </button>
                    <button onClick={() => setCancelTarget(event)}
                      className="material-symbols-outlined text-[18px] p-1.5 hover:text-[#ad170c] transition-colors opacity-30 hover:opacity-100" title="Delete">
                      close
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
