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
    const [view, setView] = useState('schedule')

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
            <div className="min-h-[calc(100dvh-48px)] sm:min-h-[calc(100dvh-64px)] flex items-center justify-center p-4">
                <div className="text-center animate-pulse bg-neuravex-bg p-6 border-4 border-neuravex-border shadow-neo transform rotate-1">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto bg-neuravex-accent flex items-center justify-center mb-3 border-2 border-neuravex-border shadow-neo-sm transform -rotate-3 text-xl sm:text-2xl font-black">
                        📊
                    </div>
                    <p className="text-neuravex-text text-xs font-black uppercase tracking-widest font-mono">Calculating priorities...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-[calc(100dvh-48px)] sm:min-h-[calc(100dvh-64px)] flex items-center justify-center p-4">
                <div className="bg-neuravex-pink border-4 border-neuravex-border shadow-neo p-5 max-w-sm w-full text-center transform -rotate-1">
                    <h2 className="text-neuravex-bg font-black uppercase text-lg mb-2">System Error</h2>
                    <p className="text-neuravex-bg text-xs font-bold font-mono">{error}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 overflow-y-auto overflow-x-hidden w-full px-3 sm:px-6 py-5 sm:py-8 max-w-4xl mx-auto animate-fade-in">

            {/* Header */}
            <div className="text-center mb-6 sm:mb-10">
                <div className="inline-block px-3 py-0.5 bg-neuravex-surface border-2 border-neuravex-border text-neuravex-accent font-mono text-[9px] sm:text-[11px] font-bold uppercase tracking-widest mb-3 shadow-neo-sm transform -rotate-1">
                    Analysis Module
                </div>
                <h1 className="text-3xl sm:text-5xl font-black uppercase text-neuravex-text tracking-tighter leading-none" style={{ textShadow: '2px 2px 0px #e5e7eb' }}>
                    Priority Hub
                </h1>
                <p className="text-neuravex-text font-mono text-[11px] sm:text-sm max-w-sm mx-auto mt-3 bg-neuravex-surface p-3 border-2 border-neuravex-border shadow-neo-sm">
                    AI-generated schedule with smart recommendations based on urgency and importance metrics.
                </p>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-10">
                {[
                    { label: 'Total Events', value: events.length, icon: '📅', shadow: '#3498db' },
                    { label: 'Critical', value: enrichedEvents.filter((e) => e.priority_score > 15).length, icon: '🔴', shadow: '#ff4757' },
                    { label: 'Today', value: events.filter((e) => dayjs(e.event_datetime).isSame(dayjs(), 'day')).length, icon: '📌', shadow: '#ffa502' },
                    { label: 'Schedule', value: schedule.length, icon: '📋', shadow: '#2ecc71' },
                ].map((stat) => (
                    <div key={stat.label} className="bg-neuravex-bg border-2 sm:border-4 border-neuravex-border p-3 sm:p-4 text-center shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all cursor-default" style={{ '--tw-shadow-color': stat.shadow }}>
                        <span className="text-lg sm:text-xl">{stat.icon}</span>
                        <p className="text-xl sm:text-2xl font-black text-neuravex-text mt-0.5">{stat.value}</p>
                        <p className="text-[8px] sm:text-[10px] text-neuravex-text font-black uppercase tracking-wider mt-0.5 opacity-70 leading-tight">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* View toggle */}
            <div className="flex mb-6 sm:mb-8">
                <div className="w-full sm:w-auto flex bg-neuravex-surface border-4 border-neuravex-border shadow-neo-sm">
                    {[
                        { id: 'schedule', label: 'Schedule' },
                        { id: 'ranked', label: 'Actions' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setView(tab.id)}
                            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2 text-[11px] sm:text-xs font-black uppercase tracking-widest transition-all ${view === tab.id
                                ? 'bg-neuravex-accent text-neuravex-bg'
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
                <div className="text-center py-14 bg-neuravex-bg border-4 border-dashed border-neuravex-border shadow-neo transform rotate-1">
                    <div className="w-16 h-16 mx-auto bg-neuravex-surface border-4 border-neuravex-border flex items-center justify-center mb-5 shadow-neo-sm transform -rotate-3">
                        <span className="text-3xl font-black">🕶️</span>
                    </div>
                    <p className="text-neuravex-text font-black uppercase tracking-widest text-sm">No events in system.</p>
                </div>
            ) : view === 'schedule' ? (
                <div className="space-y-3 sm:space-y-5">
                    {schedule.length === 0 ? (
                        <div className="text-center py-8 font-mono text-neuravex-text bg-neuravex-surface border-2 border-neuravex-border text-xs sm:text-sm">
                            [ NO UPCOMING EVENTS DETECTED ]
                        </div>
                    ) : (
                        schedule.map((item, i) => (
                            <PriorityCard key={item.id} item={item} index={i} />
                        ))
                    )}
                </div>
            ) : (
                /* RANKED / RECOMMENDED ACTIONS VIEW */
                <div className="space-y-4 sm:space-y-6">
                    <h2 className="text-base sm:text-xl font-black text-neuravex-text uppercase tracking-tighter text-center mb-5 bg-neuravex-accent-light w-fit mx-auto px-4 py-1 border-2 border-neuravex-border shadow-neo-sm">
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
                                <div className="bg-neuravex-bg border-4 border-neuravex-border p-3 sm:p-6 shadow-neo transition-all hover:-translate-y-1">
                                    <div className="flex flex-col gap-3">
                                        {/* Top row: rank, icon, title, category badge */}
                                        <div className="flex items-start gap-3">
                                            <div className="flex-shrink-0 flex flex-col items-center gap-1">
                                                <div className="w-8 h-8 border-2 border-neuravex-border bg-neuravex-surface flex items-center justify-center text-xs font-black text-neuravex-text shadow-neo-sm">
                                                    #{i + 1}
                                                </div>
                                                <div className="text-xl">
                                                    {event.actionIcon}
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                                    <span className="px-1.5 py-0 border-2 text-[8px] sm:text-[10px] font-black uppercase tracking-widest bg-neuravex-surface flex-shrink-0" style={{ borderColor: color.border, color: color.border }}>
                                                        {event.category}
                                                    </span>
                                                    <div
                                                        className="w-8 h-8 border-2 border-neuravex-border flex flex-col items-center justify-center font-black ml-auto flex-shrink-0"
                                                        style={{ background: color.bg, color: color.border }}
                                                    >
                                                        <span className="text-sm leading-none">{event.priority_score}</span>
                                                        <span className="text-[6px] uppercase leading-none">PTS</span>
                                                    </div>
                                                </div>
                                                <h3 className="text-sm sm:text-lg font-black uppercase text-neuravex-text tracking-tight break-words whitespace-normal">
                                                    {event.title}
                                                </h3>
                                                <p className="text-[10px] text-neuravex-text font-black font-mono opacity-70 uppercase mt-0.5">
                                                    {dayjs(event.event_datetime).format('MMM D · h:mm A')}
                                                    {event.venue && ` · ${event.venue}`}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Action clause */}
                                        <div className="bg-neuravex-surface border-2 border-neuravex-border p-3 shadow-neo-sm relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-1 h-full" style={{ background: color.border }} />
                                            <p className="text-xs sm:text-sm font-black uppercase tracking-tight pl-2" style={{ color: color.border }}>
                                                {event.action}
                                            </p>
                                            <p className="text-xs text-neuravex-text font-bold mt-1 font-mono pl-2">
                                                {event.recommendation}
                                            </p>
                                            {event.studyHours && (
                                                <div className="mt-1.5 flex items-center gap-1 text-neuravex-accent-light font-black text-[10px] uppercase tracking-widest pl-2">
                                                    <span>⏱ {event.studyHours}h BLOCK REQUIRED</span>
                                                </div>
                                            )}
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
