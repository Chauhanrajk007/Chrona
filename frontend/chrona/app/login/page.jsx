// ============================================================
// login/page.jsx — Auth page wired to FastAPI backend
// ============================================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PaperGrain from '@/components/PaperGrain';
import api from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (tab === 'signup') {
        const data = await api.post('/api/auth/signup', { username, password, name: name || username });
        localStorage.setItem('chrona_token', data.access_token);
        localStorage.setItem('chrona_user_id', data.user_id);
        localStorage.setItem('chrona_username', data.username || username);
        router.push('/onboarding');
      } else {
        const data = await api.post('/api/auth/login', { username, password });
        localStorage.setItem('chrona_token', data.access_token);
        localStorage.setItem('chrona_user_id', data.user_id);
        localStorage.setItem('chrona_username', data.username);
        router.push('/');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen relative flex items-center justify-center overflow-hidden">
      <PaperGrain />

      <div 
        className="relative z-10 w-full max-w-md p-4 animate-in fade-in zoom-in duration-500"
        style={{ transform: 'rotate(-1deg)' }}
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

        {/* Main Card */}
        <div className="paper-slip shadow-2xl p-10 flex flex-col items-center relative overflow-hidden bg-white">
          <div className="absolute inset-0 ruled-paper opacity-50 pointer-events-none" />
          
          {/* Logo */}
          <div className="mb-8 text-center relative z-10 bg-white px-6 py-2 rounded-lg">
            <div className="text-5xl mb-2" style={{ fontFamily: 'Permanent Marker, cursive', color: '#1c1c18' }}>C</div>
            <h1 className="text-2xl uppercase tracking-[0.2em] font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Welcome to <span style={{ color: '#ad170c' }}>Chrona</span>
            </h1>
            <p className="text-sm italic opacity-60 mt-1" style={{ fontFamily: 'Newsreader, serif' }}>
              Sign in to your AI Second Brain
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="w-full mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm relative z-10">
              {error}
            </div>
          )}

          {/* Tabs */}
          <div className="flex w-full mb-8 border-b border-primary/10 relative z-10 bg-white/60 backdrop-blur-xs">
            <button
              onClick={() => { setTab('signin'); setError(''); }}
              className={`flex-1 pb-3 text-xs uppercase tracking-widest font-bold transition-all ${tab === 'signin' ? 'text-primary' : 'text-black/40'}`}
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              Sign In
              {tab === 'signin' && <div className="h-0.5 bg-primary mt-3 w-full animate-in slide-in-from-left duration-300" />}
            </button>
            <button
              onClick={() => { setTab('signup'); setError(''); }}
              className={`flex-1 pb-3 text-xs uppercase tracking-widest font-bold transition-all ${tab === 'signup' ? 'text-primary' : 'text-black/40'}`}
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              Sign Up
              {tab === 'signup' && <div className="h-0.5 bg-primary mt-3 w-full animate-in slide-in-from-right duration-300" />}
            </button>
          </div>

          {/* Form */}
          <div className="w-full relative z-10">
            <form className="w-full space-y-6" onSubmit={handleSubmit}>
              {/* Name (signup only) */}
              {tab === 'signup' && (
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-60" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                    Display Name
                  </label>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white/80 backdrop-blur-sm border-2 border-black/5 px-4 py-3 focus:border-primary outline-none transition-all shadow-sm"
                    style={{ fontFamily: 'Newsreader, serif', fontSize: '1.1rem' }}
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest font-bold opacity-60" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                  Username
                </label>
                <input
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full bg-white/80 backdrop-blur-sm border-2 border-black/5 px-4 py-3 focus:border-primary outline-none transition-all shadow-sm"
                  style={{ fontFamily: 'Newsreader, serif', fontSize: '1.1rem' }}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest font-bold opacity-60" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                  Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-white/80 backdrop-blur-sm border-2 border-black/5 px-4 py-3 focus:border-primary outline-none transition-all shadow-sm"
                  style={{ fontFamily: 'Newsreader, serif', fontSize: '1.1rem' }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-container text-white py-4 font-bold uppercase tracking-widest transition-all shadow-lg active:translate-y-0.5 active:shadow-md mt-4 disabled:opacity-50"
                style={{ fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.2em' }}
              >
                {loading ? 'Processing...' : (tab === 'signin' ? 'Sign In' : 'Join Now')}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
