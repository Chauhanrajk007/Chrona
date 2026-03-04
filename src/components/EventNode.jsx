import { Handle, Position } from '@xyflow/react'
import { getPriorityColor, getPriorityScore } from '../lib/priorityEngine'
import dayjs from 'dayjs'

export default function EventNode({ data }) {
    const { event } = data
    const score = getPriorityScore(event)
    const color = getPriorityColor(score)

    return (
        <div
            className="relative px-4 py-3 min-w-[180px] max-w-[220px] transition-all duration-300 hover:-translate-y-1 cursor-pointer group bg-neuravex-bg"
            style={{
                border: `3px solid ${color.border}`,
                boxShadow: `4px 4px 0 ${color.border}`,
            }}
        >
            <Handle
                type="target"
                position={Position.Left}
                className="!bg-transparent !border-0 !w-0 !h-0"
            />

            {/* Priority badge */}
            <div
                className="absolute -top-3 -right-3 w-8 h-8 flex items-center justify-center text-xs font-black font-mono border-2"
                style={{
                    background: color.border,
                    color: '#0d2b2b',
                    borderColor: '#0d2b2b'
                }}
            >
                {score}
            </div>

            {/* Title */}
            <h3 className="text-sm font-black uppercase truncate tracking-tight" style={{ color: color.border }}>
                {event.title}
            </h3>

            {/* Date */}
            <p className="text-[11px] mt-1 font-mono font-bold" style={{ color: '#ffffff' }}>
                {dayjs(event.event_datetime).format('MMM D, h:mm A')}
            </p>

            {/* Category */}
            <span
                className="inline-block mt-3 px-2 py-0 border-2 text-[10px] font-black uppercase tracking-widest bg-neuravex-surface shadow-neo-sm transform -rotate-2"
                style={{ borderColor: color.border, color: color.border }}
            >
                {event.category}
            </span>

            <Handle
                type="source"
                position={Position.Right}
                className="!bg-transparent !border-0 !w-0 !h-0"
            />
        </div>
    )
}
