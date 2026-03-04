import { Handle, Position } from '@xyflow/react'

export default function CategoryNode({ data }) {
    const { label, color } = data

    return (
        <div
            className="relative px-6 py-3 transition-all duration-300 hover:-translate-y-1 hover:translate-x-1 cursor-pointer group flex items-center justify-center min-w-[140px] bg-neuravex-surface transform -rotate-2"
            style={{
                border: `4px solid ${color.border}`,
                boxShadow: `4px 4px 0 ${color.border}`,
            }}
        >
            <Handle
                type="target"
                position={Position.Left}
                className="!bg-transparent !border-0 !w-0 !h-0"
            />

            <h3 className="text-xl font-black tracking-widest uppercase text-neuravex-text" style={{ textShadow: `2px 2px 0px ${color.border}` }}>
                {label}
            </h3>

            <Handle
                type="source"
                position={Position.Right}
                className="!bg-transparent !border-0 !w-0 !h-0"
            />
        </div>
    )
}
