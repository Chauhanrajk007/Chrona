// ============================================================
// AddItemModal.jsx — Wired to /api/process-event + /api/process-event-json
// ============================================================

'use client';

import { useEffect, useState, useRef } from 'react';
import api from '@/lib/api';

export default function AddItemModal({ isOpen, onClose, onSuccess }) {
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleProcess = async () => {
    if (!description.trim() && !file) {
      setError('Enter a description or upload a file');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);

    try {
      let data;
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        if (description.trim()) formData.append('text', description.trim());
        data = await api.postFormData('/api/process-event', formData);
      } else {
        data = await api.post('/api/process-event-json', { text: description.trim() });
      }
      setResult(data.event);
      // Auto-close after brief delay to show success
      setTimeout(() => {
        setDescription('');
        setFile(null);
        setResult(null);
        onSuccess?.();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to process event');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300"
      style={{ backgroundColor: 'rgba(28,28,24,0.3)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-lg animate-in slide-in-from-bottom-8 duration-500" style={{ transform: 'rotate(0.5deg)' }}>
        <div className="paper-slip shadow-2xl overflow-hidden bg-white" style={{ minHeight: '500px' }}>
          <div className="absolute inset-0 ruled-paper opacity-20 pointer-events-none" />

          <button onClick={onClose} className="absolute top-4 right-4 z-20 material-symbols-outlined text-gray-400 hover:text-primary transition-colors">
            close
          </button>

          <header className="px-10 pt-10 pb-6 relative z-10">
            <h2 className="text-4xl text-primary mb-2" style={{ fontFamily: 'Permanent Marker, cursive' }}>
              Add Event
            </h2>
            <p className="text-sm italic opacity-70" style={{ fontFamily: 'Newsreader, serif' }}>
              Paste text, drop a PDF, or upload an image — AI extracts event data automatically.
            </p>
          </header>

          <div className="px-10 pb-10 space-y-8 relative z-10 flex flex-col h-full">
            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
            )}

            {/* Success result */}
            {result && (
              <div className="p-4 bg-green-50 border border-green-200 text-green-800 text-sm">
                <div className="font-bold uppercase tracking-widest text-xs mb-1">✓ Event Created</div>
                <div className="font-bold text-lg">{result.title}</div>
                <div className="text-xs opacity-60 mt-1">
                  {result.category} • {result.event_datetime ? new Date(result.event_datetime).toLocaleString() : 'No date'}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 px-1" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder='e.g. "Math exam tomorrow 4 PM in Room 301"'
                disabled={loading}
                className="w-full h-32 bg-surface-container rounded-sm p-4 focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none italic disabled:opacity-50"
                style={{ fontFamily: 'Newsreader, serif', fontSize: '1.2rem', border: '1px solid rgba(0,0,0,0.05)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}
              />
            </div>

            {/* File Upload */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 px-1" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                File Upload
              </label>
              <div 
                className={`group border-2 border-dashed rounded-sm p-10 flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer ${file ? 'border-primary/40 bg-primary/5' : 'border-black/10 hover:border-primary/30'}`}
                style={{ backgroundColor: file ? undefined : 'rgba(28,28,24,0.02)' }}
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={handleFileChange} />
                <div className="w-12 h-12 rounded-full border border-black/5 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shadow-sm" style={{ backgroundColor: file ? '#ad170c' : '#fff', color: file ? '#fff' : undefined }}>
                  <span className="material-symbols-outlined text-center leading-none">{file ? 'check' : 'upload'}</span>
                </div>
                <div className="text-center font-bold uppercase text-[9px] tracking-widest opacity-60">
                  {file ? (
                    <>{file.name} <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-red-500 ml-2">✕ Remove</button></>
                  ) : (
                    <>Drop <span className="text-primary">PDF</span> or <span className="text-primary">Image</span> here
                      <div className="font-normal normal-case italic mt-1 text-xs opacity-60">or click to browse</div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleProcess}
              disabled={loading || !!result}
              className="w-full bg-primary hover:bg-primary-container text-white py-5 font-bold uppercase tracking-[0.3em] transition-all shadow-lg active:translate-y-0.5 active:shadow-md mt-auto disabled:opacity-50"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              {loading ? 'Processing with AI...' : 'Process Event'}
            </button>
          </div>
        </div>

        <div 
          className="absolute -top-3 left-1/4 w-1/2 h-8 bg-white/40 backdrop-blur-md opacity-50 z-20 pointer-events-none"
          style={{ clipPath: 'polygon(0% 0%, 100% 10%, 95% 90%, 5% 100%)', borderLeft: '1px solid rgba(0,0,0,0.05)', borderRight: '1px solid rgba(0,0,0,0.05)' }}
        />
      </div>
    </div>
  );
}
