import { Handle, Position } from '@xyflow/react'
import { getPriorityColor, getPriorityScore } from '../lib/priorityEngine'
import dayjs from 'dayjs'

export default function EventNode({ data }) {
    const { event } = data
    const score = getPriorityScore(event)
    const color = getPriorityColor(score)

    return (
        <div
            className="relative px-2.5 py-2 min-w-[110px] max-w-[160px] sm:min-w-[150px] sm:max-w-[200px] transition-all duration-300 cursor-pointer bg-neuravex-bg"
            style={{
                border: `2px solid ${color.border}`,
                boxShadow: `3px 3px 0 ${color.border}`,
            }}
        >
            <Handle type="target" position={Position.Left} className="!bg-transparent !border-0 !w-0 !h-0" />

            {/* Priority badge */}
            <div
                className="absolute -top-2.5 -right-2.5 w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-[9px] sm:text-[10px] font-black border-2"
                style={{ background: color.border, color: '#ffffff', borderColor: '#000000' }}
            >
                {score}
            </div>

            {/* Title */}
            <h3 className="text-[9px] sm:text-[11px] font-black uppercase truncate tracking-tight" style={{ color: color.border }}>
                {event.title}
            </h3>

            {/* Date */}
            <p className="text-[9px] sm:text-[10px] mt-0.5 font-mono font-bold" style={{ color: '#000000' }}>
                {dayjs(event.event_datetime).format('MMM D, h:mmA')}
            </p>

            {/* Category */}
            <span
                className="inline-block mt-1.5 px-1 py-0 border text-[8px] sm:text-[9px] font-black uppercase tracking-wider bg-neuravex-surface transform -rotate-1"
                style={{ borderColor: color.border, color: color.border }}
            >
                {event.category}
            </span>

            <Handle type="source" position={Position.Right} className="!bg-transparent !border-0 !w-0 !h-0" />
        </div>
    )
}
