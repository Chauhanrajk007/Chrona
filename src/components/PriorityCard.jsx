import { getPriorityColor } from '../lib/priorityEngine'

export default function PriorityCard({ item, index }) {
    const color = getPriorityColor(item.priority)
    const isBreak = item.type === 'break'
    const isCritical = item.priority > 15

    return (
        <div
            className="relative animate-slide-up group"
            style={{
                animationDelay: `${index * 50}ms`,
                animationFillMode: 'backwards',
            }}
        >
            <div className={`
                relative bg-neuravex-bg border-4 border-neuravex-border p-5 shadow-neo transition-all hover:-translate-x-1 hover:-translate-y-1
                ${isBreak ? 'border-neuravex-muted opacity-80' : ''}
            `}
                style={{
                    '--tw-shadow-color': isBreak ? '#2a2a2a' : color.border
                }}>
                <div className="flex items-start gap-6">
                    {/* Time column */}
                    <div className="flex-shrink-0 text-center min-w-[80px]">
                        <p className="text-[10px] font-black font-mono text-neuravex-text opacity-50 uppercase tracking-widest">{item.startDate}</p>
                        <p className="text-xl font-black text-neuravex-text tracking-tighter mt-1">{item.startTime}</p>
                        <div className="w-full h-1 bg-neuravex-border my-2 shadow-neo-sm opacity-30" />
                        <p className="text-sm font-black text-neuravex-text opacity-70">{item.endTime}</p>
                    </div>

                    {/* Divider */}
                    <div
                        className="w-1.5 self-stretch border-r-2 border-neuravex-border opacity-20 min-h-[70px]"
                    />

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                        {/* Title row */}
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl filter drop-shadow-[2px_2px_0_rgba(0,0,0,0.5)]">
                                {item.actionIcon || (isBreak ? '☕' : '📅')}
                            </span>
                            <div className="flex flex-col">
                                <span className={`text-[10px] w-fit font-black uppercase tracking-widest px-2 border-2 ${isBreak ? 'bg-neuravex-surface text-neuravex-text border-neuravex-muted' :
                                        'bg-neuravex-accent-light text-neuravex-bg border-neuravex-border'
                                    }`}>
                                    {isBreak ? 'system break' : item.type || 'event'}
                                </span>
                                <h3 className={`text-xl font-black uppercase tracking-tight truncate mt-1 ${isBreak ? 'text-neuravex-text/50' : 'text-neuravex-text'}`}>
                                    {item.title}
                                </h3>
                            </div>
                        </div>

                        {/* Action clause */}
                        {item.action && !isBreak && (
                            <div className="mt-4 bg-neuravex-surface border-2 border-neuravex-border p-3 shadow-neo-sm relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1.5 h-full" style={{ background: color.border }} />
                                <p className="text-sm font-black uppercase tracking-tight" style={{ color: color.border }}>
                                    {item.action}
                                </p>
                                {item.recommendation && (
                                    <p className="text-xs text-neuravex-text font-bold mt-1 font-mono">
                                        {item.recommendation}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Break recommendation */}
                        {isBreak && item.recommendation && (
                            <p className="text-sm text-neuravex-text font-black font-mono mt-2 opacity-60">
                                {item.recommendation}
                            </p>
                        )}

                        {/* Tags row */}
                        <div className="flex items-center gap-4 mt-4">
                            {item.category && (
                                <span
                                    className="px-2 py-0 border-2 text-[10px] font-black uppercase tracking-widest bg-neuravex-surface"
                                    style={{ borderColor: color.border, color: color.border }}
                                >
                                    {item.category}
                                </span>
                            )}
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-neuravex-text uppercase tracking-widest bg-neuravex-surface px-2 border-2 border-neuravex-border">
                                    ⏱ {item.duration} min
                                </span>
                            </div>
                            {item.venue && (
                                <span className="text-[10px] font-black text-neuravex-text uppercase tracking-widest opacity-60">
                                    📍 {item.venue}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Priority score */}
                    {!isBreak && (
                        <div className="flex-shrink-0 flex flex-col items-center gap-1">
                            <div
                                className="w-14 h-14 border-4 border-neuravex-border flex flex-col items-center justify-center shadow-neo-sm font-black"
                                style={{ background: color.bg, color: color.border }}
                            >
                                <span className="text-xl">{item.priority}</span>
                                <span className="text-[8px] uppercase tracking-widest mt-[-2px]">pts</span>
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-widest mt-1" style={{ color: color.border }}>
                                {color.label}
                            </span>
                        </div>
                    )}
                </div>

                {/* Corner Decoration */}
                <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none overflow-hidden">
                    <div className="absolute top-[-10px] right-[-10px] w-20 h-4 bg-neuravex-border rotate-45 opacity-20" />
                </div>
            </div>
        </div>
    )
}
