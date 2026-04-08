import { Handle, Position } from '@xyflow/react'
import { getPriorityColor, getPriorityScore, getSeverityColor } from '../lib/priorityEngine'
import dayjs from 'dayjs'

export default function EventNode({ data }) {
    const { event, onDelete } = data
    const score = getPriorityScore(event)
    const color = getPriorityColor(score)
    const severityColor = getSeverityColor(event.severity_level)

    const handleDelete = (e) => {
        e.stopPropagation()
        if (onDelete) onDelete(event.id)
    }

    // Determine if the event should have pulsing animation based on severity
    const hasPulse = event.severity_level === 'critical' || event.severity_level === 'high'

    return (
        <div
            className={`relative px-3 py-2.5 min-w-[120px] max-w-[170px] sm:min-w-[150px] sm:max-w-[200px] transition-all duration-300 cursor-pointer rounded-lg group ${hasPulse ? 'animate-pulse' : ''}`}
            style={{
                background: 'rgba(15, 25, 60, 0.85)',
                backdropFilter: 'blur(8px)',
                border: `1px solid ${severityColor.border}50`,
                boxShadow: `0 0 16px ${severityColor.border}30, 0 4px 12px rgba(0,0,0,0.4)`,
            }}
        >
            <Handle type="target" position={Position.Left} className="!bg-transparent !border-0 !w-0 !h-0" />

            {/* Severity indicator dot */}
            <div
                className="absolute -top-1 -left-1 w-3 h-3 rounded-full"
                style={{
                    background: severityColor.border,
                    boxShadow: `0 0 8px ${severityColor.border}`
                }}
                title={`Severity: ${event.severity_level || 'medium'}`}
            />

            {/* Delete button — red X */}
            <button
                onClick={handleDelete}
                className="absolute -top-2 -right-2 w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-xs font-bold rounded-md transition-all duration-150 hover:scale-110 z-10"
                style={{
                    background: 'rgba(255, 77, 77, 0.9)',
                    color: '#fff',
                    boxShadow: '0 0 10px rgba(255, 77, 77, 0.5)',
                    border: '1px solid rgba(255, 77, 77, 0.6)',
                }}
                title="Delete event"
            >
                ✕
            </button>

            {/* Title */}
            <h3 className="text-[10px] sm:text-xs font-semibold uppercase truncate tracking-tight text-white pr-4">
                {event.title}
            </h3>

            {/* Date */}
            <p className="text-[9px] sm:text-[10px] mt-0.5 font-mono" style={{ color: '#94a3b8' }}>
                {dayjs(event.event_datetime).format('MMM D, h:mmA')}
            </p>

            {/* Category and Severity badges */}
            <div className="flex flex-wrap gap-1 mt-1.5">
                <span
                    className="inline-block px-1.5 py-0.5 rounded text-[7px] sm:text-[8px] font-semibold uppercase tracking-wider"
                    style={{ background: `${color.border}20`, color: color.border, border: `1px solid ${color.border}30` }}
                >
                    {event.category}
                </span>
                <span
                    className="inline-block px-1.5 py-0.5 rounded text-[7px] sm:text-[8px] font-semibold uppercase tracking-wider"
                    style={{ background: `${severityColor.bg}`, color: severityColor.text, border: `1px solid ${severityColor.border}30` }}
                >
                    {event.severity_level || 'medium'}
                </span>
            </div>

            <Handle type="source" position={Position.Right} className="!bg-transparent !border-0 !w-0 !h-0" />
        </div>
    )
}
