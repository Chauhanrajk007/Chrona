// ============================================================
// HabitsView.jsx — Habit tracker with bullet-journal style
// ============================================================

'use client';

const HABITS = [
  { id: 1, name: 'Morning Run (5km)', icon: 'sprint', frequency: 'Daily' },
  { id: 2, name: 'Meditate (10min)', icon: 'self_improvement', frequency: 'Daily' },
  { id: 3, name: 'Read Research Papers', icon: 'menu_book', frequency: 'Weekdays' },
  { id: 4, name: 'Project Coding', icon: 'code', frequency: 'Daily' }
];

const DAYS = Array.from({ length: 14 }, (_, i) => i + 1); // 14 day view

export default function HabitsView() {
  return (
    <div className="ml-64 pt-24 px-12 min-h-screen bg-surface-dim/10 animate-in fade-in duration-500 pb-20">
      
      {/* Header */}
      <div className="mb-10">
        <h2 className="text-4xl font-black uppercase tracking-widest text-[#1c1c18]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Habit <span className="text-primary italic">Tracker</span>
        </h2>
        <p className="text-sm italic opacity-60 font-serif">Cultivating discipline through small, consistent steps.</p>
      </div>

      {/* Habits Sheet */}
      <div className="paper-slip p-10 bg-white shadow-xl relative min-h-[600px]">
        {/* Binder holes effect */}
        <div className="absolute left-4 top-0 h-full flex flex-col gap-10 py-10 opacity-10">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="w-4 h-4 rounded-full bg-black" />
          ))}
        </div>

        <div className="pl-12">
          {/* Day Headers */}
          <div className="flex mb-6 border-b border-black/5 pb-4">
            <div className="w-1/3 text-[10px] font-bold tracking-widest opacity-30 uppercase">Habit / Routine</div>
            <div className="flex-1 flex justify-between">
              {DAYS.map(d => (
                <div key={d} className="w-6 text-center text-[9px] font-bold opacity-30">{d}</div>
              ))}
            </div>
          </div>

          {/* Habit Rows */}
          <div className="space-y-4">
            {HABITS.map(habit => (
              <div key={habit.id} className="flex items-center group py-2">
                <div className="w-1/3 flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary/40 group-hover:text-primary transition-colors">{habit.icon}</span>
                  <div>
                    <div className="font-bold text-sm uppercase text-[#1c1c18]">{habit.name}</div>
                    <div className="text-[9px] italic opacity-40 font-serif">{habit.frequency}</div>
                  </div>
                </div>

                <div className="flex-1 flex justify-between">
                  {DAYS.map(d => {
                    const isCompleted = Math.random() > 0.4; // Mock data
                    return (
                        <div 
                          key={d} 
                          className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer flex items-center justify-center
                            ${isCompleted ? 'bg-primary border-primary text-white scale-110 shadow-lg shadow-primary/20' : 'border-black/5 hover:border-black/10'}`}
                        >
                          {isCompleted && <span className="material-symbols-outlined text-[12px] font-bold">check</span>}
                        </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* New Habit Field */}
          <div className="mt-12 pt-8 border-t border-dashed border-black/10">
            <button className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-primary/60 hover:text-primary transition-all">
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              Define New Habit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
