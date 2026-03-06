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
        <div className="flex flex-col min-h-screen min-h-dvh bg-transparent overflow-x-hidden">
            <OpeningAnimation />

            {/* Navigation */}
            <nav className="flex-none sticky top-0 z-40 bg-neuravex-bg border-b-4 border-neuravex-border shadow-neo">
                {/* Row 1 — Logo + status */}
                <div className="flex items-center justify-between h-10 sm:h-14 px-3 sm:px-6 border-b-2 border-neuravex-border">
                    <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center bg-neuravex-accent-light text-neuravex-bg text-xs sm:text-sm font-bold border-2 border-neuravex-border shadow-neo-sm transform -rotate-3">
                            N
                        </div>
                        <span className="text-base sm:text-xl font-black tracking-tighter uppercase text-neuravex-text ml-0.5">
                            Neuravex
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-black border border-neuravex-border animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neuravex-text">Live</span>
                    </div>
                </div>

                {/* Row 2 — Nav tabs: full-width, large tap targets */}
                <div className="flex w-full">
                    {navLinks.map((link) => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            end={link.to === '/'}
                            className={({ isActive }) =>
                                `flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 sm:py-3 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all duration-150 border-r-2 last:border-r-0 border-neuravex-border ${isActive
                                    ? 'bg-neuravex-accent text-neuravex-bg'
                                    : 'bg-neuravex-surface text-neuravex-text hover:bg-neuravex-card'
                                }`
                            }
                        >
                            <span className="text-lg sm:text-xl leading-none">{link.icon}</span>
                            <span>{link.label}</span>
                        </NavLink>
                    ))}
                </div>
            </nav>

            {/* Routes — fills remaining height; each page handles its own scroll */}
            <main className="flex-1 flex flex-col overflow-x-hidden min-h-0">
                <Routes>
                    <Route path="/" element={<Upload />} />
                    <Route path="/mindmap" element={<Mindmap />} />
                    <Route path="/priority" element={<Priority />} />
                </Routes>
            </main>
        </div>
    )
}
