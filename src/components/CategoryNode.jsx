import { Handle, Position } from '@xyflow/react'

export default function CategoryNode({ data }) {
    const { label, color } = data

    return (
        <div
            className="relative px-3 sm:px-5 py-1.5 sm:py-2 transition-all duration-300 cursor-pointer flex items-center justify-center min-w-[80px] sm:min-w-[120px] bg-neuravex-surface transform -rotate-1"
            style={{
                border: `3px solid ${color.border}`,
                boxShadow: `3px 3px 0 ${color.border}`,
            }}
        >
            <Handle type="target" position={Position.Left} className="!bg-transparent !border-0 !w-0 !h-0" />

            <h3 className="text-xs sm:text-base font-black tracking-widest uppercase text-neuravex-text" style={{ textShadow: `1px 1px 0px #ffffff, -1px -1px 0 #ffffff, 1px -1px 0 #ffffff, -1px 1px 0 #ffffff` }}>
                {label}
            </h3>

            <Handle type="source" position={Position.Right} className="!bg-transparent !border-0 !w-0 !h-0" />
        </div>
    )
}
