// ============================================================
// ConflictNotification.jsx — Paper-themed floating conflict toast
// Ported logic from src/components/ConflictNotification.jsx
// Restyled to match the new ruled-paper / paper-slip aesthetic
// ============================================================

'use client';

import { useState, useEffect } from 'react';

export default function ConflictNotification({ conflicts = [], onResolve, onDismiss }) {
  const [dismissed, setDismissed] = useState(new Set());
  const [animatingOut, setAnimatingOut] = useState(new Set());

  // Auto-dismiss after 15s
  useEffect(() => {
    if (conflicts.length === 0) return;
    const timers = conflicts.map((_, i) => {
      if (dismissed.has(i)) return null;
      return setTimeout(() => handleDismiss(i), 15000);
    });
    return () => timers.forEach(t => t && clearTimeout(t));
  }, [conflicts.length, dismissed]);

  const handleDismiss = (index) => {
    setAnimatingOut(prev => new Set(prev).add(index));
    setTimeout(() => {
      setDismissed(prev => new Set(prev).add(index));
      setAnimatingOut(prev => { const next = new Set(prev); next.delete(index); return next; });
      onDismiss?.(index);
    }, 300);
  };

  const handleResolve = (index, action, eventId) => {
    setAnimatingOut(prev => new Set(prev).add(index));
    setTimeout(() => {
      setDismissed(prev => new Set(prev).add(index));
      onResolve?.(index, action, eventId);
    }, 300);
  };

  const visibleConflicts = conflicts
    .map((c, i) => ({ ...c, index: i }))
    .filter(c => !dismissed.has(c.index));

  if (visibleConflicts.length === 0) return null;

  return (
    <div className="fixed top-6 right-6 z-[80] flex flex-col gap-4 max-w-sm w-full pointer-events-none" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
      {visibleConflicts.map(conflict => {
        const isExiting = animatingOut.has(conflict.index);
        return (
          <div
            key={conflict.index}
            className="pointer-events-auto paper-slip bg-white p-5 relative overflow-hidden border-l-4"
            style={{
              borderLeftColor: '#ff9800',
              boxShadow: '4px 4px 20px rgba(0,0,0,0.12)',
              animation: isExiting ? 'slideOutRight 0.3s ease-in forwards' : 'slideInRight 0.4s ease-out',
            }}
          >
            {/* Close button */}
            <button
              onClick={() => handleDismiss(conflict.index)}
              className="absolute top-3 right-3 material-symbols-outlined text-sm opacity-30 hover:opacity-100 transition-opacity"
            >close</button>

            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[#ff9800]">sync_problem</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: '#ff9800' }}>
                Schedule Conflict
              </span>
            </div>

            {/* Conflict details */}
            <p className="text-sm leading-relaxed" style={{ fontFamily: 'Newsreader, serif', color: '#1c1c18' }}>
              <strong style={{ color: '#ad170c' }}>"{conflict.eventA?.title}"</strong>
              {' '}overlaps with{' '}
              <strong style={{ color: '#ad170c' }}>"{conflict.eventB?.title}"</strong>
            </p>
            <p className="text-[10px] font-bold tracking-[0.15em] opacity-40 uppercase mt-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {conflict.overlapMinutes} MIN OVERLAP
            </p>

            {/* Action buttons */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => handleResolve(conflict.index, 'reschedule', conflict.eventB?.id)}
                className="flex-1 py-2.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-all hover:shadow-md active:scale-95"
                style={{
                  backgroundColor: '#ff9800',
                  color: '#ffffff',
                  fontFamily: 'Space Grotesk, sans-serif',
                }}
              >
                Reschedule
              </button>
              <button
                onClick={() => handleResolve(conflict.index, 'keep', null)}
                className="flex-1 py-2.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-all hover:shadow-md active:scale-95"
                style={{
                  backgroundColor: 'transparent',
                  color: '#1c1c18',
                  border: '1px solid rgba(28,28,24,0.15)',
                  fontFamily: 'Space Grotesk, sans-serif',
                }}
              >
                Keep Both
              </button>
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(120%); opacity: 0; }
          to   { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
          from { transform: translateX(0); opacity: 1; }
          to   { transform: translateX(120%); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
