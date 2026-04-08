import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import Upload from './pages/Upload'
import Mindmap from './pages/Mindmap'
import Priority from './pages/Priority'
import Drafts from './pages/Drafts'
import Auth from './pages/Auth'
import OpeningAnimation from './components/OpeningAnimation'

const navLinks = [
    { to: '/', label: 'Upload', icon: '⬆️' },
    { to: '/mindmap', label: 'Mindmap', icon: '🧠' },
    { to: '/priority', label: 'Priority', icon: '📊' },
    { to: '/drafts', label: 'Drafts', icon: '📋' },
]

function isAuthenticated() {
    return !!localStorage.getItem('chrona_token')
}

function ProtectedRoute({ children }) {
    if (!isAuthenticated()) {
        return <Navigate to="/auth" replace />
    }
    return children
}

function handleLogout() {
    localStorage.removeItem('chrona_token')
    localStorage.removeItem('chrona_user_id')
    window.location.href = '/auth'
}

export default function App() {
    const location = useLocation()
    const onAuthPage = location.pathname === '/auth'

    // If on auth page, render ONLY the auth page (no nav shell)
    if (onAuthPage) {
        return <Auth />
    }

    return (
        <div className="flex flex-col min-h-screen min-h-dvh overflow-x-hidden" style={{ background: 'transparent' }}>
            <OpeningAnimation />

            {/* ── Glass Navigation ────────────────────────── */}
            <nav className="flex-none sticky top-0 z-40 glass-strong" style={{ borderBottom: '1px solid rgba(77, 163, 255, 0.15)' }}>
                {/* Row 1 — Logo + status + logout */}
                <div className="flex items-center justify-between h-10 sm:h-14 px-3 sm:px-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-sm font-bold text-white"
                            style={{ background: 'linear-gradient(135deg, #4da3ff, #6366f1)', boxShadow: '0 0 12px rgba(77, 163, 255, 0.4)' }}>
                            C
                        </div>
                        <span className="text-base sm:text-lg font-bold tracking-tight text-nv-text">
                            Chrona
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#3ddc97', boxShadow: '0 0 8px rgba(61, 220, 151, 0.5)' }} />
                            <span className="text-[10px] font-medium text-nv-text-dim uppercase tracking-wider">Live</span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-lg transition-all duration-200"
                            style={{
                                background: 'rgba(239, 68, 68, 0.12)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                color: '#fca5a5',
                            }}
                        >
                            Logout
                        </button>
                    </div>
                </div>

                {/* Row 2 — Nav tabs */}
                <div className="flex w-full">
                    {navLinks.map((link) => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            end={link.to === '/'}
                            className={({ isActive }) =>
                                `flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 sm:py-3 text-[10px] sm:text-xs font-semibold uppercase tracking-wider transition-all duration-200 relative ${isActive
                                    ? 'text-nv-accent'
                                    : 'text-nv-text-dim hover:text-nv-text'
                                }`
                            }
                            style={({ isActive }) => isActive ? {
                                background: 'rgba(77, 163, 255, 0.08)',
                                borderBottom: '2px solid #4da3ff',
                                boxShadow: '0 2px 12px rgba(77, 163, 255, 0.15)',
                            } : {
                                borderRight: '1px solid rgba(255,255,255,0.04)',
                                borderBottom: '2px solid transparent',
                            }}
                        >
                            <span className="text-lg sm:text-xl leading-none">{link.icon}</span>
                            <span>{link.label}</span>
                        </NavLink>
                    ))}
                </div>
            </nav>

            {/* ── Routes ─────────────────────────────────── */}
            <main className="flex-1 flex flex-col overflow-x-hidden min-h-0">
                <Routes>
                    <Route path="/" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
                    <Route path="/mindmap" element={<ProtectedRoute><Mindmap /></ProtectedRoute>} />
                    <Route path="/priority" element={<ProtectedRoute><Priority /></ProtectedRoute>} />
                    <Route path="/drafts" element={<ProtectedRoute><Drafts /></ProtectedRoute>} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </main>
        </div>
    )
}
