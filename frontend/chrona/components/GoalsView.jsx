// ============================================================
// GoalsView.jsx — Long-term Vision Board
// ============================================================

'use client';

const GOALS = [
  { id: 1, title: 'Master Quantum Physics', group: 'ACADEMIC', progress: 65, color: '#ad170c' },
  { id: 2, title: 'Build a Next-Gen AI Assistant', group: 'CARRIER', progress: 40, color: '#1c1c18' },
  { id: 3, title: 'Run a Full Marathon', group: 'PERSONAL', progress: 85, color: '#DC143C' },
  { id: 4, title: 'Learn 3D Architectural Design', group: 'CARRIER', progress: 20, color: '#5f5744' }
];

export default function GoalsView() {
  return (
    <div className="ml-64 pt-24 px-12 min-h-screen bg-surface-dim/10 animate-in fade-in duration-500 pb-20">
      
      {/* Header */}
      <div className="mb-12">
        <h2 className="text-4xl font-black uppercase tracking-widest text-[#1c1c18]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Long-term <span className="text-primary italic">Goals</span>
        </h2>
        <p className="text-sm italic opacity-60 font-serif">Mapping your horizon and the milestones ahead.</p>
      </div>

      <div className="grid grid-cols-2 gap-10">
        {GOALS.map(goal => (
          <div key={goal.id} className="paper-slip p-8 bg-white shadow-lg relative group transition-transform hover:-translate-y-1">
             <div className="absolute top-0 left-0 w-2 h-full" style={{ backgroundColor: goal.color, opacity: 0.3 }} />
             
             <div className="flex justify-between items-start mb-6">
                <div>
                    <div className="text-[10px] font-bold tracking-[0.3em] uppercase opacity-40 mb-1">{goal.group}</div>
                    <h4 className="text-2xl font-black uppercase tracking-tight leading-none text-[#1c1c18]" style={{ fontFamily: 'Space Grotesk' }}>
                        {goal.title}
                    </h4>
                </div>
                <button className="material-symbols-outlined opacity-20 hover:opacity-100 transition-opacity">more_horiz</button>
             </div>

             {/* Progress Bar - Hand Shaded Look */}
             <div className="space-y-3">
                <div className="flex justify-between text-[11px] font-bold opacity-60 uppercase tracking-widest">
                    <span>Progress</span>
                    <span>{goal.progress}%</span>
                </div>
                <div className="h-6 w-full bg-surface-container relative overflow-hidden rounded-sm border border-black/5">
                    <div 
                        className="h-full transition-all duration-1000 ease-out flex items-center justify-end px-2"
                        style={{ 
                            width: `${goal.progress}%`, 
                            backgroundColor: goal.color,
                            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)'
                        }}
                    >
                    </div>
                </div>
             </div>

             <div className="mt-8 pt-6 border-t border-dashed border-black/10 flex gap-4">
                <div className="text-[11px] font-bold bg-primary/5 text-primary px-3 py-1 rounded-sm uppercase tracking-widest italic">3 Milestones Left</div>
                <div className="text-[11px] font-bold bg-black/5 opacity-40 px-3 py-1 rounded-sm uppercase tracking-widest italic">Review: Monthly</div>
             </div>
          </div>
        ))}

        {/* Add New Box */}
        <div className="border-2 border-dashed border-black/10 flex flex-col items-center justify-center p-12 hover:border-primary/30 transition-all cursor-pointer group rounded-sm min-h-[300px]">
           <span className="material-symbols-outlined text-4xl opacity-20 group-hover:text-primary group-hover:opacity-100 transition-all mb-4">add_task</span>
           <div className="text-[11px] font-bold uppercase tracking-[0.3em] opacity-30 group-hover:opacity-100 group-hover:text-primary">Establish New Vision</div>
        </div>
      </div>
    </div>
  );
}
