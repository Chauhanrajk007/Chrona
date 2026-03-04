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
        <div className="min-h-screen bg-transparent relative">
            {/* Opening Animation Overlay */}
            <OpeningAnimation />

            {/* Navigation - Neo Brutalist */}
            <nav className="sticky top-4 z-40 mx-4 sm:mx-8 mb-8 bg-neuravex-bg border-4 border-neuravex-border shadow-neo transition-all">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 flex items-center justify-center bg-neuravex-accent-light text-neuravex-bg text-sm font-bold border-2 border-neuravex-border shadow-neo-sm transform -rotate-3 hover:rotate-0 transition-transform cursor-default">
                            N
                        </div>
                        <span className="text-xl font-black tracking-tighter uppercase text-neuravex-text hidden sm:inline ml-1">
                            Neuravex
                        </span>
                    </div>

                    {/* Nav links */}
                    <div className="flex items-center gap-2 bg-neuravex-surface border-2 border-neuravex-border p-1.5 shadow-neo-sm">
                        {navLinks.map((link) => (
                            <NavLink
                                key={link.to}
                                to={link.to}
                                end={link.to === '/'}
                                className={({ isActive }) =>
                                    `flex items-center gap-1.5 px-3 sm:px-4 py-1.5 text-sm font-bold uppercase transition-all duration-200 border-2 ${isActive
                                        ? 'bg-neuravex-accent text-neuravex-bg border-neuravex-border shadow-neo-sm translate-y-[-2px]'
                                        : 'bg-transparent text-neuravex-text border-transparent hover:border-neuravex-border hover:bg-neuravex-card hover:-translate-y-1'
                                    }`
                                }
                            >
                                <span className="text-base">{link.icon}</span>
                                <span className="hidden sm:inline">{link.label}</span>
                            </NavLink>
                        ))}
                    </div>

                    {/* Decorative status */}
                    <div className="flex items-center gap-2 px-3 py-1 bg-neuravex-surface border-2 border-neuravex-border shadow-neo-sm">
                        <div className="w-2.5 h-2.5 bg-emerald-400 border border-neuravex-border animate-pulse" />
                        <span className="text-xs font-bold uppercase tracking-wider text-neuravex-text hidden sm:inline">Connected</span>
                    </div>
                </div>
            </nav>

            {/* Routes */}
            <main className="px-4 sm:px-8 pb-8">
                <Routes>
                    <Route path="/" element={<Upload />} />
                    <Route path="/mindmap" element={<Mindmap />} />
                    <Route path="/priority" element={<Priority />} />
                </Routes>
            </main>
        </div>
    )
}
