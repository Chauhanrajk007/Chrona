// ============================================================
// onboarding/page.jsx — AI Personality Quiz (4 questions)
// Saves to /api/onboarding/save, then redirects to dashboard
// ============================================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PaperGrain from '@/components/PaperGrain';
import api from '@/lib/api';

const STEPS = [
  {
    key: 'primary_focus',
    question: 'What do you need to focus on right now?',
    subtitle: 'This tells Chrona what to prioritize when scheduling your tasks.',
    icon: 'target',
    options: [
      { value: 'exams', label: 'Exams / Studies', icon: 'school', desc: 'Focus on exam prep & study sessions' },
      { value: 'projects', label: 'Projects / Hackathon', icon: 'rocket_launch', desc: 'Ship code, build demos, hit deadlines' },
      { value: 'work', label: 'Work / Job', icon: 'work', desc: 'Professional tasks & meetings' },
      { value: 'personal', label: 'Personal / Health', icon: 'favorite', desc: 'Self-care, fitness, well-being' },
    ],
  },
  {
    key: 'motivation_type',
    question: 'What do you actually feel like doing these days?',
    subtitle: 'Chrona uses this to weight tasks closer to what motivates you.',
    icon: 'local_fire_department',
    options: [
      { value: 'study', label: 'Study', icon: 'menu_book', desc: 'Read, review, memorize' },
      { value: 'build', label: 'Build / Code', icon: 'code', desc: 'Create, prototype, hack' },
      { value: 'exercise', label: 'Exercise', icon: 'fitness_center', desc: 'Move, train, stay active' },
      { value: 'chill', label: 'Chill / Low effort', icon: 'spa', desc: 'Relax, recharge, breathe' },
    ],
  },
  {
    key: 'preferred_slot',
    question: 'When do you usually get things done?',
    subtitle: 'AI will prefer scheduling your top tasks in this time window.',
    icon: 'schedule',
    options: [
      { value: 'morning', label: 'Morning', icon: 'wb_sunny', desc: '6 AM – 12 PM' },
      { value: 'afternoon', label: 'Afternoon', icon: 'wb_cloudy', desc: '12 PM – 5 PM' },
      { value: 'evening', label: 'Evening', icon: 'routine', desc: '5 PM – 9 PM' },
      { value: 'night', label: 'Night', icon: 'dark_mode', desc: '9 PM – 2 AM' },
    ],
  },
  {
    key: 'recovery_style',
    question: 'When you miss a task, what do you usually do?',
    subtitle: 'This shapes how Chrona auto-reschedules missed tasks for you.',
    icon: 'settings_backup_restore',
    options: [
      { value: 'postpone', label: 'I postpone it', icon: 'event_repeat', desc: 'Push it to the next day' },
      { value: 'same_day', label: 'I try later same day', icon: 'update', desc: 'Find another slot today' },
      { value: 'break_smaller', label: 'I break it smaller', icon: 'view_agenda', desc: 'Split into micro-tasks' },
    ],
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const current = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  const handleSelect = async (value) => {
    const updated = { ...answers, [current.key]: value };
    setAnswers(updated);

    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      // Last question — save to backend
      setSaving(true);
      setError('');
      try {
        await api.post('/api/onboarding/save', {
          primary_focus: updated.primary_focus,
          motivation_type: updated.motivation_type,
          preferred_slot: updated.preferred_slot,
          recovery_style: updated.recovery_style || 'same_day',
        });
        localStorage.setItem('chrona_onboarded', 'true');
        router.push('/');
      } catch (err) {
        setError(err.message || 'Failed to save. Try again.');
        setSaving(false);
      }
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <main className="min-h-screen relative flex items-center justify-center overflow-hidden">
      <PaperGrain />

      <div
        className="relative z-10 w-full max-w-lg p-4 animate-in fade-in zoom-in duration-500"
        style={{ transform: 'rotate(-0.5deg)' }}
      >
        {/* Push Pin */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 drop-shadow-md">
          <span
            className="material-symbols-outlined text-4xl"
            style={{ color: '#ad170c', fontVariationSettings: "'FILL' 1" }}
          >
            push_pin
          </span>
        </div>

        {/* Card */}
        <div className="paper-slip shadow-2xl p-10 relative overflow-hidden bg-white">
          <div className="absolute inset-0 ruled-paper opacity-30 pointer-events-none" />

          {/* Progress Bar */}
          <div className="relative z-10 mb-8">
            <div className="flex justify-between items-center mb-3">
              <span
                className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Step {step + 1} of {STEPS.length}
              </span>
              <span
                className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {Math.round(progress)}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-black/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="relative z-10 text-center mb-8">
            <span className="material-symbols-outlined text-5xl text-primary/30 mb-4 block">
              {current.icon}
            </span>
            <h2
              className="text-xl font-bold uppercase tracking-wide mb-2"
              style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1c1c18' }}
            >
              {current.question}
            </h2>
            <p
              className="text-sm italic opacity-60"
              style={{ fontFamily: 'Newsreader, serif' }}
            >
              {current.subtitle}
            </p>
          </div>

          {/* Options */}
          <div className="relative z-10 space-y-3">
            {current.options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                disabled={saving}
                className={`w-full text-left p-4 border-2 transition-all duration-200 hover:shadow-md active:scale-[0.98] group ${
                  answers[current.key] === opt.value
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-black/5 bg-white hover:border-primary/30'
                } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      answers[current.key] === opt.value
                        ? 'bg-primary/15 text-primary'
                        : 'bg-black/5 text-black/40 group-hover:bg-primary/10 group-hover:text-primary/60'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl">{opt.icon}</span>
                  </div>
                  <div>
                    <div
                      className="font-bold text-sm uppercase tracking-widest"
                      style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                    >
                      {opt.label}
                    </div>
                    <div
                      className="text-xs opacity-50 mt-0.5"
                      style={{ fontFamily: 'Newsreader, serif' }}
                    >
                      {opt.desc}
                    </div>
                  </div>
                  {answers[current.key] === opt.value && (
                    <span className="material-symbols-outlined text-primary ml-auto">check_circle</span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="relative z-10 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Back button */}
          {step > 0 && !saving && (
            <button
              onClick={handleBack}
              className="relative z-10 mt-6 text-xs font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity flex items-center gap-2"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Go Back
            </button>
          )}

          {/* Saving indicator */}
          {saving && (
            <div className="relative z-10 mt-6 text-center">
              <div
                className="text-sm font-bold uppercase tracking-widest text-primary animate-pulse"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Setting up your AI engine...
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p
            className="text-[10px] uppercase tracking-[0.15em] opacity-30 font-bold"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            Chrona AI Priority Engine · Personalization Quiz
          </p>
        </div>
      </div>
    </main>
  );
}
