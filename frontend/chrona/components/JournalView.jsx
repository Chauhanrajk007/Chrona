// ============================================================
// JournalView.jsx — Reflective writing space
// ============================================================

'use client';

const PAST_ENTRIES = [
  { date: 'Apr 08, 2026', title: 'The flow of creativity', excerpt: 'Today I realized that planning is just half the battle. Momentum is...' },
  { date: 'Apr 07, 2026', title: 'Focus and Refraction', excerpt: 'Deep work sessions are becoming more consistent since I started...' },
];

export default function JournalView() {
  return (
    <div className="ml-64 pt-24 px-12 min-h-screen bg-surface-dim/10 animate-in fade-in duration-500 pb-20">
      
      {/* Header */}
      <div className="mb-10 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-widest text-[#1c1c18]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Daily <span className="text-primary italic">Journal</span>
          </h2>
          <p className="text-sm italic opacity-60 font-serif">A sanctuary for your thoughts and reflections.</p>
        </div>
        <div className="text-[10px] font-bold tracking-[0.3em] opacity-30 uppercase pb-1">Apr 09, 2026</div>
      </div>

      <div className="grid grid-cols-3 gap-10">
        {/* Editor Area */}
        <div className="col-span-2 space-y-8">
            <div className="paper-slip p-0 bg-white shadow-xl relative min-h-[500px] overflow-hidden">
                {/* Horizontal ruled lines */}
                <div className="absolute inset-0 ruled-paper opacity-50 pointer-events-none" />
                
                <textarea 
                    className="w-full h-full min-h-[500px] bg-transparent p-12 relative z-10 focus:outline-none resize-none text-xl leading-[1.5rem]"
                    style={{ fontFamily: 'Newsreader, serif', lineHeight: '1.5rem' }}
                    placeholder="Dear Chrona, today was..."
                />
            </div>

            <div className="flex justify-end gap-4">
                <button className="px-8 py-3 border border-black/10 text-[11px] font-bold uppercase tracking-widest hover:bg-black/5 transition-all">Drafts</button>
                <button className="px-10 py-3 bg-[#1c1c18] text-white text-[11px] font-bold uppercase tracking-widest shadow-lg hover:bg-primary transition-all">Save Entry</button>
            </div>
        </div>

        {/* Sidebar / Past Entries */}
        <div className="space-y-6">
            <h4 className="text-[10px] font-bold tracking-[0.3em] uppercase opacity-40">Previous Entries</h4>
            
            <div className="space-y-4">
                {PAST_ENTRIES.map(entry => (
                    <div key={entry.date} className="paper-slip p-6 bg-white shadow-sm hover:shadow-md transition-all cursor-pointer border-l-2 border-primary/20 hover:border-primary">
                        <div className="text-[9px] font-bold opacity-30 uppercase tracking-widest mb-1">{entry.date}</div>
                        <div className="font-bold text-sm uppercase text-[#1c1c18] mb-2">{entry.title}</div>
                        <p className="text-xs italic opacity-60 font-serif line-clamp-2">{entry.excerpt}</p>
                    </div>
                ))}
            </div>

            <div className="p-6 bg-primary/5 rounded-sm border border-primary/10 mt-10">
                <span className="material-symbols-outlined text-primary text-xl mb-2">lightbulb</span>
                <p className="text-xs italic text-primary/80 font-serif">Tip: Reflect on three things you're grateful for today to boost mindfulness.</p>
            </div>
        </div>
      </div>
    </div>
  );
}
