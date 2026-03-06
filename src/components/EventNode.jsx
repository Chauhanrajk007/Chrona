import { Handle, Position } from '@xyflow/react'
import { getPriorityColor, getPriorityScore } from '../lib/priorityEngine'
import dayjs from 'dayjs'

export default function EventNode({ data }) {
    const { event } = data
    const score = getPriorityScore(event)
    const color = getPriorityColor(score)

    return (
        <div
            className="relative px-3 py-2.5 min-w-[120px] max-w-[170px] sm:min-w-[150px] sm:max-w-[200px] transition-all duration-300 cursor-pointer rounded-lg"
            style={{
                background: 'rgba(15, 25, 60, 0.85)',
                backdropFilter: 'blur(8px)',
                border: `1px solid ${color.border}50`,
                boxShadow: `0 0 16px ${color.border}30, 0 4px 12px rgba(0,0,0,0.4)`,
            }}
        >
            <Handle type="target" position={Position.Left} className="!bg-transparent !border-0 !w-0 !h-0" />

            {/* Priority badge */}
            <div
                className="absolute -top-2 -right-2 w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-[9px] sm:text-[10px] font-bold rounded-md"
                style={{ background: color.border, color: '#ffffff', boxShadow: `0 0 10px ${color.border}60` }}
            >
                {score}
            </div>

            {/* Title */}
            <h3 className="text-[10px] sm:text-xs font-semibold uppercase truncate tracking-tight text-white">
                {event.title}
            </h3>

            {/* Date */}
            <p className="text-[9px] sm:text-[10px] mt-0.5 font-mono" style={{ color: '#94a3b8' }}>
                {dayjs(event.event_datetime).format('MMM D, h:mmA')}
            </p>

            {/* Category */}
            <span
                className="inline-block mt-1.5 px-1.5 py-0.5 rounded text-[7px] sm:text-[8px] font-semibold uppercase tracking-wider"
                style={{ background: `${color.border}20`, color: color.border, border: `1px solid ${color.border}30` }}
            >
                {event.category}
            </span>

            <Handle type="source" position={Position.Right} className="!bg-transparent !border-0 !w-0 !h-0" />
        </div>
    )
}
