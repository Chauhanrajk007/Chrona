// ============================================================
// RescheduleModal.jsx — Intelligent rescheduling dialog
// Wired to /api/schedule/changes and Supabase
// ============================================================

'use client';

import { useState, useEffect } from 'react';
import { supabase, getCurrentUserId } from '@/lib/supabase';
import api from '@/lib/api';

// Native JS equivalent of PriorityEngine's findNextFreeSlot
function findNextFreeSlot(allEvents, excludeEventId, durationMinutes = 60) {
  const now = new Date();
  const bufferMs = 30 * 60000;
  
  // Snap to next 15 min
  let coeff = 1000 * 60 * 15;
  let scanStart = new Date(Math.ceil(now.getTime() / coeff) * coeff);

  const occupied = (allEvents || [])
    .filter(e => e.id !== excludeEventId && e.event_datetime && e.status !== 'completed')
    .map(e => {
      const start = new Date(e.event_datetime).getTime() - bufferMs;
      const end = new Date(e.event_datetime).getTime() + (e.duration_minutes * 60000 || 60 * 60000) + bufferMs;
      return { start, end };
    })
    .sort((a, b) => a.start - b.start);

  const maxScanEnd = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  let candidate = new Date(scanStart);

  while (candidate < maxScanEnd) {
    const candidateHour = candidate.getHours();
    
    // Skip sleeping
    if (candidateHour < 7) {
      candidate.setHours(7, 0, 0, 0);
      continue;
    }
    // Skip night
    if (candidateHour >= 21) {
      candidate.setDate(candidate.getDate() + 1);
      candidate.setHours(7, 0, 0, 0);
      continue;
    }

    const slotEndTime = candidate.getTime() + (durationMinutes * 60000);
    const slotEndDate = new Date(slotEndTime);
    if (slotEndDate.getHours() >= 21 && slotEndDate.getDate() === candidate.getDate()) {
      candidate.setDate(candidate.getDate() + 1);
      candidate.setHours(7, 0, 0, 0);
      continue;
    }

    const hasConflict = occupied.some(range => {
      return candidate.getTime() < range.end && slotEndTime > range.start;
    });

    if (!hasConflict) return candidate;

    candidate = new Date(candidate.getTime() + 15 * 60000);
  }

  // Fallback -> +2 hours
  return new Date(now.getTime() + 2 * 60 * 60 * 1000);
}

export default function RescheduleModal({ event, conflictingEvent, allEvents = [], onClose, onSuccess, onUpdate }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [autoSlot, setAutoSlot] = useState(null);

  useEffect(() => {
    // Automatically find the next free slot when modal opens
    if (!event) {
        onClose();
        return;
    }
    const slot = findNextFreeSlot(allEvents, event.id, event.duration_minutes || 60);
    setAutoSlot(slot);
  }, [event, allEvents, onClose]);

  const handleSave = async () => {
    if (!autoSlot) return setError('Computing free time...');

    setSaving(true);
    setError('');

    try {
      const isoStr = autoSlot.toISOString();
      const userId = getCurrentUserId();

      // Update event natively in frontend hooks to keep sync immediate
      const result = await onUpdate(event.id, { event_datetime: isoStr });
      
      if (result && result.error) {
        throw new Error(result.error.message || 'Failed to update event in database');
      }

      const finalReason = reason.trim() || (conflictingEvent ? `Conflict with "${conflictingEvent.title}" — auto-moved by Chrona engine.` : 'Automatically rescheduled block.');

      // 1. Log to draft section (as requested: "let the draft section have the reson why it was late")
      if (reason.trim() !== '') {
        await supabase.from('drafts').insert({
           user_id: userId,
           raw_text: `[TRACKING MSG - ${event.title}] Late reason: ${reason}`,
           processed: false,
           priority: 'low',
           category: 'other'
        });
      }

      // 2. Log to schedule_changes
      try {
        await api.post('/api/schedule/changes', {
          event_id: event.id,
          change_type: conflictingEvent ? 'conflict_resolved' : 'auto_moved',
          old_datetime: event.event_datetime,
          new_datetime: isoStr,
          reason: finalReason,
          conflicting_event_id: conflictingEvent?.id || null,
        });
      } catch (logErr) {
        console.warn('Backend changes log failed, skipping', logErr);
      }

      setSaving(false);
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to reschedule');
      setSaving(false);
    }
  };

  if (!event || !autoSlot) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300 backdrop-blur-md"
      style={{ backgroundColor: 'rgba(28,28,24,0.4)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        className="paper-slip bg-white p-10 w-full max-w-md shadow-2xl relative animate-in slide-in-from-bottom-10"
        style={{ transform: 'rotate(0.5deg)' }}
      >
        <button onClick={onClose} className="absolute top-4 right-4 material-symbols-outlined opacity-30 hover:opacity-100 transition-opacity">close</button>

        <h3 className="text-3xl font-black uppercase tracking-widest text-[#ff9800] mb-2 flex flex-col" style={{ fontFamily: 'Space Grotesk' }}>
          <span>Auto</span>
          <span>Resolve Slot</span>
        </h3>
        
        <div className="space-y-6 mt-8">
          <div className="p-4 bg-surface-container rounded-sm border-l-4 border-black/20 text-sm">
            <strong className="block uppercase tracking-widest text-[#1c1c18] font-bold">{event.title}</strong>
            <span className="opacity-60 italic font-serif block mt-1">
              Was: {new Date(event.event_datetime).toLocaleTimeString()}
            </span>
            <div className="mt-3 text-primary uppercase tracking-widest text-[10px] font-bold">
              → Moving to: {autoSlot.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
            {conflictingEvent && (
              <div className="mt-2 text-[#ff9800] uppercase tracking-widest text-[9px] font-bold">
                ⚠️ Avoids Conflict: {conflictingEvent.title}
              </div>
            )}
          </div>

          <div>
             <label className="text-[10px] font-bold tracking-[0.2em] opacity-40 uppercase mb-2 block">Tracking Reason (Optional)</label>
             <textarea 
               value={reason} onChange={e => setReason(e.target.value)}
               className="w-full bg-surface p-3 outline-none border border-black/10 focus:border-[#ff9800] shadow-sm text-sm italic font-serif resize-none h-20"
               placeholder="Why are you late / moving this? The AI will log this in your drafts."
             />
          </div>

          {error && <div className="text-red-600 text-xs font-bold uppercase tracking-widest">{error}</div>}

          <div className="pt-4 flex gap-4">
            <button onClick={onClose} className="flex-1 py-4 font-bold uppercase tracking-widest text-black/40 hover:text-black transition-colors text-sm">
              Keep Old Time
            </button>
            <button 
              onClick={handleSave} 
              disabled={saving}
              className="flex-1 bg-[#ff9800] text-white py-4 font-bold uppercase tracking-widest shadow-lg active:translate-y-0.5 transition-all text-sm disabled:opacity-50"
            >
              Confirm Move
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
