// ============================================================
// ArchiveView.jsx — Historical Task Logs
// ============================================================

'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function ArchiveView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await api.get('/api/schedule/changes');
        setLogs(data.changes || []);
      } catch (err) {
        setError(err.message || 'Failed to load logs');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="ml-64 pt-24 px-12 min-h-screen bg-surface-dim/10 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="mb-12">
        <h2 className="text-4xl font-black uppercase tracking-widest text-[#1c1c18]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Archived <span className="text-primary italic">Logs</span>
        </h2>
        <p className="text-sm italic opacity-60 font-serif">A historical record of your achievements and past iterations.</p>
      </div>

      <div className="paper-slip p-0 bg-white shadow-xl relative overflow-hidden">
         {/* Table style Log */}
         <div className="min-w-full">
            <div className="grid grid-cols-5 border-b-2 border-black/5 p-6 bg-surface/30">
                <div className="text-[10px] font-bold tracking-[0.2em] opacity-40 uppercase">Task Identity</div>
                <div className="text-[10px] font-bold tracking-[0.2em] opacity-40 uppercase">Timestamp</div>
                <div className="text-[10px] font-bold tracking-[0.2em] opacity-40 uppercase text-center">Status</div>
                <div className="text-[10px] font-bold tracking-[0.2em] opacity-40 uppercase text-center">Detail</div>
                <div className="text-[10px] font-bold tracking-[0.2em] opacity-40 uppercase text-right">Actions</div>
            </div>

            <div className="divide-y divide-black/5 relative z-10 min-h-[200px]">
                {loading && <div className="p-6 text-center text-xs uppercase tracking-widest opacity-40">Loading records...</div>}
                {error && <div className="p-6 text-center text-xs uppercase tracking-widest text-red-500">{error}</div>}
                
                {!loading && !error && logs.length === 0 && (
                   <div className="p-6 text-center text-xs uppercase tracking-widest opacity-40">No records found.</div>
                )}

                {!loading && !error && logs.map(log => {
                    const date = new Date(log.created_at);
                    
                    return (
                    <div key={log.id} className="grid grid-cols-5 p-6 items-center hover:bg-surface-container/50 transition-colors group">
                        {/* Task */}
                        <div className="font-bold text-sm uppercase text-[#1c1c18] group-hover:text-primary transition-colors flex flex-col gap-1">
                           <span>{log.metadata?.event_title || 'Unknown Task'}</span>
                        </div>

                        {/* Date/Time */}
                        <div className="opacity-60 text-xs">
                           <div className="font-bold tracking-tighter" style={{ fontFamily: 'Space Grotesk' }}>
                             {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                           </div>
                           <div className="text-[10px] opacity-60 uppercase">
                             {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                           </div>
                        </div>

                        {/* Status */}
                        <div className="flex justify-center">
                            <span className="text-[9px] font-bold px-3 py-1 bg-black/5 rounded-full uppercase tracking-tighter opacity-60 border border-black/10">
                                {log.change_type.replace('_', ' ')}
                            </span>
                        </div>

                        {/* Detail / Reason */}
                        <div className="flex justify-center items-center text-center">
                            <span className="text-xs italic font-serif opacity-70 line-clamp-2" title={log.reason}>
                                {log.reason || '-'}
                            </span>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 opacity-20 group-hover:opacity-100 transition-opacity">
                            <button className="material-symbols-outlined text-[18px]">visibility</button>
                            {log.change_type !== 'completed' && <button className="material-symbols-outlined text-[18px]">restore</button>}
                            <button className="material-symbols-outlined text-[18px] text-red-500">delete_forever</button>
                        </div>
                    </div>
                )})}
            </div>
         </div>

         {/* Decorative Filing Tab */}
         <div className="absolute top-0 right-10 px-6 py-2 bg-primary/10 rounded-b-md text-[9px] font-bold uppercase tracking-[0.4em] opacity-40 border-x border-b border-primary/20">
            Dossier No. 427
         </div>
      </div>
      
      {!loading && logs.length > 0 && (
        <div className="mt-12 flex justify-center opacity-20 hover:opacity-100 transition-opacity">
          <button className="text-[11px] font-bold uppercase tracking-widest flex items-center gap-2">
              Show more records
              <span className="material-symbols-outlined">expand_more</span>
          </button>
        </div>
      )}
    </div>
  );
}
