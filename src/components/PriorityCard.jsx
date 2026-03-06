import { getPriorityColor } from '../lib/priorityEngine'

export default function PriorityCard({ item, index }) {
    const color = getPriorityColor(item.priority)
    const isBreak = item.type === 'break'

    return (
        <div
            className="relative animate-slide-up group"
            style={{
                animationDelay: `${index * 50}ms`,
                animationFillMode: 'backwards',
            }}
        >
            <div className={`
                relative bg-neuravex-bg border-4 border-neuravex-border p-3 sm:p-5 shadow-neo transition-all hover:-translate-x-1 hover:-translate-y-1
                ${isBreak ? 'border-neuravex-muted opacity-80' : ''}
            `}
                style={{ '--tw-shadow-color': isBreak ? '#e5e7eb' : color.border }}>

                {/* Top info row: time + priority badge */}
                <div className="flex items-center justify-between mb-2 sm:mb-3 pb-2 border-b-2 border-neuravex-border">
                    {/* Time */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-sm sm:text-base font-black text-neuravex-text tracking-tight">{item.startTime}</span>
                        <span className="text-[9px] sm:text-[10px] font-black opacity-50">TO</span>
                        <span className="text-xs sm:text-sm font-black text-neuravex-text opacity-70">{item.endTime}</span>
                    </div>

                    {/* Priority score */}
                    {!isBreak && (
                        <div
                            className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-neuravex-border flex flex-col items-center justify-center font-black flex-shrink-0"
                            style={{ background: color.bg, color: color.border }}
                        >
                            <span className="text-xs sm:text-sm leading-none">{item.priority}</span>
                            <span className="text-[5px] sm:text-[7px] uppercase leading-none tracking-widest">pts</span>
                        </div>
                    )}
                </div>

                {/* Main content */}
                <div className="flex items-start gap-2.5 sm:gap-3">
                    {/* Icon */}
                    <span className="text-lg sm:text-2xl flex-shrink-0 mt-0.5 filter drop-shadow-[1px_1px_0_rgba(0,0,0,0.4)]">
                        {item.actionIcon || (isBreak ? '☕' : '📅')}
                    </span>

                    <div className="flex-1 min-w-0">
                        {/* Type badge + title */}
                        <span className={`text-[8px] sm:text-[10px] w-fit font-black uppercase tracking-widest px-1.5 py-0 border-2 inline-block mb-1 ${isBreak
                            ? 'bg-neuravex-surface text-neuravex-text border-neuravex-muted'
                            : 'bg-neuravex-accent-light text-neuravex-bg border-neuravex-border'
                            }`}>
                            {isBreak ? 'system break' : item.type || 'event'}
                        </span>
                        <h3 className={`text-sm sm:text-xl font-black uppercase tracking-tight break-words whitespace-normal leading-tight ${isBreak ? 'text-neuravex-text/50' : 'text-neuravex-text'}`}>
                            {item.title}
                        </h3>

                        {/* Action clause */}
                        {item.action && !isBreak && (
                            <div className="mt-2 bg-neuravex-surface border-2 border-neuravex-border p-2 sm:p-3 shadow-neo-sm relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full" style={{ background: color.border }} />
                                <p className="text-[10px] sm:text-sm font-black uppercase tracking-tight pl-2" style={{ color: color.border }}>
                                    {item.action}
                                </p>
                                {item.recommendation && (
                                    <p className="text-[10px] sm:text-xs text-neuravex-text font-bold mt-1 font-mono pl-2">
                                        {item.recommendation}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Break recommendation */}
                        {isBreak && item.recommendation && (
                            <p className="text-xs text-neuravex-text font-black font-mono mt-1.5 opacity-60">
                                {item.recommendation}
                            </p>
                        )}

                        {/* Tags */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2 sm:mt-3">
                            {item.category && (
                                <span
                                    className="px-1.5 py-0 border-2 text-[8px] sm:text-[10px] font-black uppercase tracking-widest bg-neuravex-surface"
                                    style={{ borderColor: color.border, color: color.border }}
                                >
                                    {item.category}
                                </span>
                            )}
                            <span className="text-[8px] sm:text-[10px] font-black text-neuravex-text uppercase tracking-widest bg-neuravex-surface px-1.5 border-2 border-neuravex-border">
                                ⏱ {item.duration} min
                            </span>
                            {item.venue && (
                                <span className="text-[8px] sm:text-[10px] font-black text-neuravex-text uppercase tracking-widest opacity-60">
                                    📍 {item.venue}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
