import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_BASE = ''

export default function Auth() {
    const [isLogin, setIsLogin] = useState(true)
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')
        setLoading(true)

        try {
            if (isLogin) {
                const res = await fetch(`${API_BASE}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password }),
                })
                const data = await res.json()
                if (!res.ok) throw new Error(data.detail || 'Login failed')

                localStorage.setItem('chrona_token', data.access_token)
                localStorage.setItem('chrona_user_id', data.user_id)
                localStorage.setItem('chrona_username', data.username)
                navigate('/')
            } else {
                const res = await fetch(`${API_BASE}/api/auth/signup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password, name }),
                })
                const data = await res.json()
                if (!res.ok) throw new Error(data.detail || 'Signup failed')

                setSuccess('Account created! You can now sign in.')
                setIsLogin(true)
                setPassword('')
            }
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const inputStyle = {
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: '#e2e8f0',
    }

    return (
        <div className="min-h-screen min-h-dvh flex items-center justify-center px-4 py-8"
            style={{ background: 'radial-gradient(ellipse at top, #0f1c3f 0%, #070d1f 60%, #050a18 100%)' }}>

            <div className="fixed inset-0 pointer-events-none" style={{
                background: 'radial-gradient(600px circle at 50% 30%, rgba(77,163,255,0.08), transparent 60%)',
            }} />

            <div className="w-full max-w-md relative z-10">

                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-14 h-14 flex items-center justify-center rounded-2xl text-2xl font-black text-white mb-4"
                        style={{
                            background: 'linear-gradient(135deg, #4da3ff, #6366f1)',
                            boxShadow: '0 0 30px rgba(77,163,255,0.4), 0 8px 32px rgba(0,0,0,0.3)',
                        }}>
                        C
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#e2e8f0' }}>
                        Welcome to <span style={{ color: '#4da3ff' }}>Chrona</span>
                    </h1>
                    <p className="text-sm mt-1" style={{ color: '#64748b' }}>
                        {isLogin ? 'Sign in to your AI Second Brain' : 'Create your account'}
                    </p>
                </div>

                {/* Card */}
                <div className="rounded-2xl p-6 sm:p-8" style={{
                    background: 'rgba(15,25,60,0.7)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid rgba(77,163,255,0.15)',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
                }}>

                    {/* Toggle */}
                    <div className="flex rounded-xl mb-6 p-1" style={{
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.06)',
                    }}>
                        {['Sign In', 'Sign Up'].map((label, i) => {
                            const active = i === 0 ? isLogin : !isLogin
                            return (
                                <button key={label} type="button"
                                    onClick={() => { setIsLogin(i === 0); setError(''); setSuccess('') }}
                                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300"
                                    style={active ? {
                                        background: 'linear-gradient(135deg, rgba(77,163,255,0.25), rgba(99,102,241,0.2))',
                                        color: '#4da3ff',
                                        boxShadow: '0 2px 12px rgba(77,163,255,0.2)',
                                    } : { background: 'transparent', color: '#64748b' }}
                                >{label}</button>
                            )
                        })}
                    </div>

                    {/* Messages */}
                    {error && (
                        <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium" style={{
                            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5',
                        }}>{error}</div>
                    )}
                    {success && (
                        <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium" style={{
                            background: 'rgba(61,220,151,0.12)', border: '1px solid rgba(61,220,151,0.25)', color: '#6ee7b7',
                        }}>{success}</div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">

                        {!isLogin && (
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#94a3b8' }}>
                                    Display Name
                                </label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)}
                                    placeholder="Your name" required={!isLogin}
                                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                                    style={inputStyle}
                                    onFocus={e => e.target.style.borderColor = 'rgba(77,163,255,0.5)'}
                                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#94a3b8' }}>
                                Username
                            </label>
                            <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                                placeholder="Enter username" required
                                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                                style={inputStyle}
                                onFocus={e => e.target.style.borderColor = 'rgba(77,163,255,0.5)'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#94a3b8' }}>
                                Password
                            </label>
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••" required minLength={4}
                                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                                style={inputStyle}
                                onFocus={e => e.target.style.borderColor = 'rgba(77,163,255,0.5)'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                            />
                        </div>

                        <button type="submit" disabled={loading}
                            className="w-full py-3.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-300 mt-2"
                            style={{
                                background: loading ? 'rgba(77,163,255,0.3)' : 'linear-gradient(135deg, #4da3ff, #6366f1)',
                                color: '#fff',
                                boxShadow: loading ? 'none' : '0 4px 20px rgba(77,163,255,0.35)',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.7 : 1,
                            }}
                        >
                            {loading ? '⏳ Processing...' : isLogin ? 'Sign In' : 'Create Account'}
                        </button>
                    </form>
                </div>

                <p className="text-center text-xs mt-6" style={{ color: '#475569' }}>
                    Powered by Chrona AI · Your Intelligent Scheduler
                </p>
            </div>
        </div>
    )
}
