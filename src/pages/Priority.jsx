import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
    sortByPriority,
    getPriorityScore,
    getPriorityColor,
    generateSchedule,
    enrichAndSort,
    generateAction,
} from '../lib/priorityEngine'
import PriorityCard from '../components/PriorityCard'
import dayjs from 'dayjs'

export default function Priority() {
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [view, setView] = useState('schedule') // 'schedule' | 'ranked'

    useEffect(() => {
        async function fetchEvents() {
            try {
                const { data, error: fetchError } = await supabase.from('events').select('*')
                if (fetchError) throw fetchError
                setEvents(data || [])
            } catch (err) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }
        fetchEvents()
    }, [])

    const enrichedEvents = enrichAndSort(events)
    const schedule = generateSchedule(events)

    if (loading) {
        return (
            <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
                <div className="text-center animate-pulse bg-neuravex-bg p-8 border-4 border-neuravex-border shadow-neo transform rotate-1">
                    <div className="w-16 h-16 mx-auto bg-neuravex-accent flex items-center justify-center mb-4 border-2 border-neuravex-border shadow-neo-sm transform -rotate-3 text-2xl font-black">
                        📊
                    </div>
                    <p className="text-neuravex-text text-sm font-black uppercase tracking-widest font-mono">Calculating priorities...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
                <div className="bg-neuravex-pink border-4 border-neuravex-border shadow-neo p-6 max-w-md text-center transform -rotate-1">
                    <h2 className="text-neuravex-bg font-black uppercase text-xl mb-2">System Error</h2>
                    <p className="text-neuravex-bg text-sm font-bold font-mono">{error}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-[calc(100vh-64px)] p-6 max-w-4xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="text-center mb-12 relative">
                <div className="inline-block px-4 py-1 bg-neuravex-surface border-2 border-neuravex-border text-neuravex-accent font-mono text-xs font-bold uppercase tracking-widest mb-4 shadow-neo-sm transform -rotate-2">
                    Analysis Module
                </div>
                <h1 className="text-5xl sm:text-6xl font-black uppercase text-neuravex-text tracking-tighter" style={{ textShadow: '4px 4px 0px #e8a838' }}>
                    Priority Hub
                </h1>
                <p className="text-neuravex-text font-mono text-sm max-w-lg mx-auto mt-6 bg-neuravex-surface p-4 border-2 border-neuravex-border shadow-neo-sm">
                    AI-generated schedule with smart recommendations based on urgency and importance metrics.
                </p>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
                {[
                    { label: 'Total Events', value: events.length, icon: '📅', shadow: '#5ce0c8' },
                    { label: 'Critical', value: enrichedEvents.filter((e) => e.priority_score > 15).length, icon: '🔴', shadow: '#e8a838' },
                    { label: 'Today', value: events.filter((e) => dayjs(e.event_datetime).isSame(dayjs(), 'day')).length, icon: '📌', shadow: '#3bbfa7' },
                    { label: 'Schedule', value: schedule.length, icon: '📋', shadow: '#2d9f8f' },
                ].map((stat) => (
                    <div key={stat.label} className="bg-neuravex-bg border-4 border-neuravex-border p-4 text-center shadow-neo-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-default" style={{ '--tw-shadow-color': stat.shadow }}>
                        <span className="text-xl">{stat.icon}</span>
                        <p className="text-2xl font-black text-neuravex-text mt-1">{stat.value}</p>
                        <p className="text-[10px] text-neuravex-text font-black uppercase tracking-widest mt-1 opacity-70">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* View toggle */}
            <div className="flex justify-center mb-10">
                <div className="inline-flex bg-neuravex-surface border-4 border-neuravex-border p-1 shadow-neo-sm">
                    {[
                        { id: 'schedule', label: 'Schedule' },
                        { id: 'ranked', label: 'Actions' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setView(tab.id)}
                            className={`px-6 py-2 text-xs font-black uppercase tracking-widest transition-all ${view === tab.id
                                ? 'bg-neuravex-accent text-neuravex-bg shadow-inner'
                                : 'text-neuravex-text hover:bg-neuravex-card'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            {events.length === 0 ? (
                <div className="text-center py-20 bg-neuravex-bg border-4 border-dashed border-neuravex-border shadow-neo transform rotate-1">
                    <div className="w-20 h-20 mx-auto bg-neuravex-surface border-4 border-neuravex-border flex items-center justify-center mb-6 shadow-neo-sm transform -rotate-3">
                        <span className="text-4xl font-black">🕶️</span>
                    </div>
                    <p className="text-neuravex-text font-black uppercase tracking-widest">No events in system.</p>
                </div>
            ) : view === 'schedule' ? (
                <div className="space-y-6">
                    {schedule.length === 0 ? (
                        <div className="text-center py-10 font-mono text-neuravex-text bg-neuravex-surface border-2 border-neuravex-border">
                            [ NO UPCOMING EVENTS DETECTED ]
                        </div>
                    ) : (
                        schedule.map((item, i) => (
                            <PriorityCard key={item.id} item={item} index={i} />
                        ))
                    )}
                </div>
            ) : (
                /* ===== RANKED / RECOMMENDED ACTIONS VIEW ===== */
                <div className="space-y-6">
                    <h2 className="text-xl font-black text-neuravex-text uppercase tracking-tighter text-center mb-8 bg-neuravex-accent-light inline-block px-4 py-1 border-2 border-neuravex-border shadow-neo-sm mx-auto flex w-fit">
                        Recommended Actions
                    </h2>
                    {enrichedEvents.map((event, i) => {
                        const color = event.color
                        return (
                            <div
                                key={event.id}
                                className="relative animate-slide-up"
                                style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'backwards' }}
                            >
                                <div className="bg-neuravex-bg border-4 border-neuravex-border p-6 shadow-neo transition-all hover:-translate-y-1" style={{ '--tw-shadow-color': color.border }}>
                                    <div className="flex items-start gap-6">
                                        {/* Rank + icon */}
                                        <div className="flex-shrink-0 flex flex-col items-center gap-2">
                                            <div className="w-10 h-10 border-2 border-neuravex-border bg-neuravex-surface flex items-center justify-center text-sm font-black text-neuravex-text shadow-neo-sm">
                                                #{i + 1}
                                            </div>
                                            <div className="text-2xl filter drop-shadow-[2px_2px_0_rgba(0,0,0,0.5)]">
                                                {event.actionIcon}
                                            </div>
                                        </div>

                                        {/* Main content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                <h3 className="text-xl font-black uppercase text-neuravex-text tracking-tight truncate">
                                                    {event.title}
                                                </h3>
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-0 border-2 text-[10px] font-black uppercase tracking-widest bg-neuravex-surface" style={{ borderColor: color.border, color: color.border }}>
                                                        {event.category}
                                                    </span>
                                                </div>
                                            </div>

                                            <p className="text-xs text-neuravex-text font-black font-mono opacity-70 uppercase mb-4">
                                                {dayjs(event.event_datetime).format('MMM D · h:mm A')}
                                                {event.venue && ` · ${event.venue}`}
                                            </p>

                                            {/* Action clause highlight */}
                                            <div className="bg-neuravex-surface border-2 border-neuravex-border p-4 shadow-neo-sm relative overflow-hidden">
                                                <div className="absolute top-0 left-0 w-1.5 h-full" style={{ background: color.border }} />
                                                <p className="text-base font-black uppercase tracking-tight" style={{ color: color.border }}>
                                                    {event.action}
                                                </p>
                                                <p className="text-sm text-neuravex-text font-bold mt-2 font-mono">
                                                    {event.recommendation}
                                                </p>
                                                {event.studyHours && (
                                                    <div className="mt-2 flex items-center gap-2 text-neuravex-accent-light font-black text-xs uppercase tracking-widest">
                                                        <span>⏱ {event.studyHours}h BLOCK REQUIRED</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Score */}
                                        <div className="flex-shrink-0 flex flex-col items-center gap-1">
                                            <div
                                                className="w-16 h-16 border-4 border-neuravex-border flex flex-col items-center justify-center shadow-neo-sm font-black"
                                                style={{ background: color.bg, color: color.border }}
                                            >
                                                <span className="text-2xl">{event.priority_score}</span>
                                                <span className="text-[9px] uppercase tracking-widest mt-[-4px]">PTS</span>
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest mt-1" style={{ color: color.border }}>
                                                {color.label}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
