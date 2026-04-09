// ============================================================
// CancelModal.jsx — Paper-themed cancel/delete confirmation
// Ported logic from src/components/CancelModal.jsx
// ============================================================

'use client';

import { useState } from 'react';

export default function CancelModal({ event, onClose, onConfirm }) {
  const [reason, setReason] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(event.id, reason);
  };

  if (!event) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300 backdrop-blur-md"
      style={{ backgroundColor: 'rgba(28,28,24,0.35)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="paper-slip bg-white p-10 w-full max-w-md shadow-2xl relative animate-in slide-in-from-bottom-10 border-l-4"
        style={{ borderLeftColor: '#ad170c', transform: 'rotate(-0.3deg)' }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 material-symbols-outlined opacity-30 hover:opacity-100 transition-opacity"
        >close</button>

        <h3
          className="text-2xl font-black uppercase tracking-widest mb-2"
          style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#ad170c' }}
        >
          Cancel Event
        </h3>

        <p className="text-sm italic mb-6" style={{ fontFamily: 'Newsreader, serif', opacity: 0.7 }}>
          Are you sure you want to delete <strong className="not-italic" style={{ color: '#1c1c18' }}>{event.title}</strong>?
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              className="text-[10px] font-bold tracking-[0.2em] opacity-40 uppercase mb-2 block"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              htmlFor="cancel-reason"
            >
              Cancellation Reason (Optional)
            </label>
            <input
              id="cancel-reason"
              type="text"
              className="w-full bg-surface-container p-3 outline-none border border-black/10 focus:border-[#ad170c] shadow-sm text-sm italic resize-none"
              style={{ fontFamily: 'Newsreader, serif' }}
              placeholder="E.g., Finished early, not needed anymore..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex gap-4 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 font-bold uppercase tracking-widest text-black/40 hover:text-black transition-colors text-sm"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              Never Mind
            </button>
            <button
              type="submit"
              className="flex-1 py-4 font-bold uppercase tracking-widest text-white shadow-lg active:translate-y-0.5 transition-all text-sm"
              style={{ fontFamily: 'Space Grotesk, sans-serif', backgroundColor: '#ad170c' }}
            >
              Delete Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
