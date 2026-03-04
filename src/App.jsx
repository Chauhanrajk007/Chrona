import { Routes, Route, NavLink } from 'react-router-dom'
import Upload from './pages/Upload'
import Mindmap from './pages/Mindmap'
import Priority from './pages/Priority'
import OpeningAnimation from './components/OpeningAnimation'

const navLinks = [
    { to: '/', label: 'Upload', icon: '⬆️' },
    { to: '/mindmap', label: 'Mindmap', icon: '🧠' },
    { to: '/priority', label: 'Priority', icon: '📊' },
]

export default function App() {
    return (
        <div className="min-h-screen bg-neuravex-bg relative">
            {/* Opening Animation Overlay */}
            <OpeningAnimation />

            {/* Navigation */}
            <nav className="sticky top-0 z-40 bg-neuravex-bg/80 backdrop-blur-xl border-b border-neuravex-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neuravex-accent to-purple-500 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-neuravex-accent/30">
                            N
                        </div>
                        <span className="text-lg font-bold bg-gradient-to-r from-neuravex-accent-light to-purple-400 bg-clip-text text-transparent hidden sm:inline">
                            Neuravex
                        </span>
                    </div>

                    {/* Nav links */}
                    <div className="flex items-center gap-1 bg-neuravex-surface border border-neuravex-border rounded-xl p-1">
                        {navLinks.map((link) => (
                            <NavLink
                                key={link.to}
                                to={link.to}
                                end={link.to === '/'}
                                className={({ isActive }) =>
                                    `flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${isActive
                                        ? 'bg-neuravex-accent text-white shadow-lg shadow-neuravex-accent/20'
                                        : 'text-neuravex-muted hover:text-neuravex-text hover:bg-neuravex-card'
                                    }`
                                }
                            >
                                <span className="text-sm">{link.icon}</span>
                                <span className="hidden sm:inline">{link.label}</span>
                            </NavLink>
                        ))}
                    </div>

                    {/* Decorative status */}
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[11px] text-neuravex-muted hidden sm:inline">Connected</span>
                    </div>
                </div>
            </nav>

            {/* Routes */}
            <main>
                <Routes>
                    <Route path="/" element={<Upload />} />
                    <Route path="/mindmap" element={<Mindmap />} />
                    <Route path="/priority" element={<Priority />} />
                </Routes>
            </main>
        </div>
    )
}
