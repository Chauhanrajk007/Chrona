import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react'
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    useReactFlow,
    ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { supabase } from '../lib/supabase'
import {
    getPriorityScore,
    getPriorityColor,
    getNodeDistance,
    sortByPriority,
} from '../lib/priorityEngine'
import EventNode from '../components/EventNode'
import CategoryNode from '../components/CategoryNode'

const nodeTypes = { eventNode: EventNode, categoryNode: CategoryNode }

const CATEGORY_COLORS = {
    exam: { border: '#e74c3c', bg: '#e74c3c20' },
    hackathon: { border: '#00b894', bg: '#00b89420' },
    assignment: { border: '#e67e22', bg: '#e67e2220' },
    meeting: { border: '#9b59b6', bg: '#9b59b620' },
    personal: { border: '#3498db', bg: '#3498db20' },
    reminder: { border: '#1abc9c', bg: '#1abc9c20' },
    other: { border: '#95a5a6', bg: '#95a5a620' },
}

function getCategoryColor(cat) {
    return CATEGORY_COLORS[(cat || 'other').toLowerCase()] || CATEGORY_COLORS.other
}

const STORAGE_KEY = 'neuravex_mindmap_positions'

// ── Inner ReactFlow component ────────────────────────────────────────────────
function MindmapCanvas({ events, canvasHeight }) {
    const [nodes, setNodes, onNodesChange] = useNodesState([])
    const [edges, setEdges, onEdgesChange] = useEdgesState([])
    const { fitView } = useReactFlow()
    const fitQueued = useRef(false)

    const buildLayout = useCallback((eventsData, ignoreSaved = false) => {
        const saved = ignoreSaved ? {} : JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
        const sorted = sortByPriority(eventsData)
        const newNodes = []
        const newEdges = []

        const centerPos = saved['center'] || { x: 0, y: 0 }
        newNodes.push({
            id: 'center',
            type: 'default',
            position: centerPos,
            data: { label: '🧠 You' },
            style: {
                background: 'linear-gradient(135deg,#000,#374151)',
                color: '#fff',
                border: '3px solid #000',
                borderRadius: '50%',
                width: 72,
                height: 72,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: 900,
                boxShadow: '4px 4px 0 #000',
            },
            draggable: true,
        })

        const byCategory = {}
        sorted.forEach((e) => {
            const cat = e.category || 'other'
            if (!byCategory[cat]) byCategory[cat] = []
            byCategory[cat].push(e)
        })

        const catKeys = Object.keys(byCategory)
        catKeys.forEach((cat, ci) => {
            const evts = byCategory[cat]
            const color = getCategoryColor(cat)
            const catId = `cat-${cat}`
            const angle = (2 * Math.PI * ci) / catKeys.length - Math.PI / 2
            const cx = Math.cos(angle) * 200
            const cy = Math.sin(angle) * 200
            const catPos = saved[catId] || { x: cx - 55, y: cy - 15 }

            newNodes.push({ id: catId, type: 'categoryNode', position: catPos, data: { label: cat, color }, draggable: true })
            newEdges.push({ id: `e-c-${cat}`, source: 'center', target: catId, style: { stroke: color.border, strokeWidth: 3 }, animated: true })

            const spread = Math.PI / 3
            const startAngle = angle - spread / 2
            evts.forEach((ev, ei) => {
                const eAngle = evts.length === 1 ? angle : startAngle + (spread * ei) / (evts.length - 1)
                const score = getPriorityScore(ev)
                const dist = Math.min(getNodeDistance(score) + 60, 130)
                const ex = cx + Math.cos(eAngle) * dist
                const ey = cy + Math.sin(eAngle) * dist
                const ePos = saved[ev.id] || { x: ex - 60, y: ey - 20 }
                const eColor = getPriorityColor(score)
                newNodes.push({ id: ev.id, type: 'eventNode', position: ePos, data: { event: ev }, draggable: true })
                newEdges.push({ id: `e-${cat}-${ev.id}`, source: catId, target: ev.id, animated: score > 15, style: { stroke: eColor.border, strokeWidth: 2 } })
            })
        })

        setNodes(newNodes)
        setEdges(newEdges)
        fitQueued.current = true
    }, [setNodes, setEdges])

    useEffect(() => { buildLayout(events) }, [events, buildLayout])

    useEffect(() => {
        if (!fitQueued.current || nodes.length === 0 || !canvasHeight) return
        fitQueued.current = false
        const t = setTimeout(() => fitView({ padding: 0.15, duration: 600 }), 300)
        return () => clearTimeout(t)
    }, [nodes, fitView, canvasHeight])

    const onNodeDragStop = useCallback((_e, node) => {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
        saved[node.id] = node.position
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
    }, [])

    return (
        <div style={{ width: '100%', height: canvasHeight || '100%' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeDragStop={onNodeDragStop}
                nodeTypes={nodeTypes}
                panOnScroll={false}
                panOnDrag={true}
                zoomOnPinch={true}
                zoomOnScroll={false}
                preventScrolling={true}
                fitView={false}
                minZoom={0.05}
                maxZoom={3}
                proOptions={{ hideAttribution: true }}
            >
                <Background color="#00000025" gap={24} size={1.5} variant="dots" />
                <Controls style={{ backgroundColor: '#fff', border: '2px solid #000', borderRadius: 0, boxShadow: '3px 3px 0 #000' }} />
                <MiniMap className="hidden md:block" nodeBorderRadius={0} style={{ backgroundColor: '#fff', border: '2px solid #000', borderRadius: 0 }} />
            </ReactFlow>
        </div>
    )
}

// ── Page outer wrapper ───────────────────────────────────────────────────────
export default function Mindmap() {
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const navRef = useRef(null)
    const [canvasHeight, setCanvasHeight] = useState(0)
    const [resetKey, setResetKey] = useState(0)

    // Compute canvas height = window.innerHeight – nav element height
    useLayoutEffect(() => {
        function measure() {
            const navEl = document.querySelector('nav')
            const navH = navEl ? navEl.getBoundingClientRect().height : 0
            setCanvasHeight(window.innerHeight - navH)
        }
        measure()
        window.addEventListener('resize', measure)
        return () => window.removeEventListener('resize', measure)
    }, [])

    useEffect(() => {
        supabase.from('events').select('*').order('event_datetime', { ascending: true })
            .then(({ data, error: e }) => {
                if (e) setError(e.message)
                else setEvents(data || [])
                setLoading(false)
            })
    }, [])

    const handleReset = () => {
        localStorage.removeItem(STORAGE_KEY)
        setResetKey((k) => k + 1)
    }

    const canvasStyle = {
        width: '100%',
        height: canvasHeight > 0 ? `${canvasHeight}px` : '100vh',
        position: 'relative',
    }

    return (
        <div style={canvasStyle}>
            {/* Top bar */}
            <div style={{ position: 'absolute', top: 12, left: 0, right: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', pointerEvents: 'none' }}>
                <div style={{ pointerEvents: 'auto' }} className="bg-neuravex-bg border-2 border-neuravex-border px-2 py-1 flex items-center gap-1.5 shadow-neo-sm">
                    <div className="w-1.5 h-1.5 bg-black animate-pulse" />
                    <span className="text-[9px] sm:text-[11px] font-mono font-black text-neuravex-text tracking-widest uppercase">{events.length} events</span>
                </div>
                <button
                    onClick={handleReset}
                    style={{ pointerEvents: 'auto' }}
                    className="bg-neuravex-pink text-white font-black uppercase text-[9px] sm:text-[11px] px-2.5 py-1.5 border-2 border-neuravex-border shadow-neo-sm transition-all hover:-translate-y-0.5"
                >
                    ↺ Reset
                </button>
            </div>

            {/* Priority legend — bottom-RIGHT to avoid overlapping controls */}
            <div style={{ position: 'absolute', bottom: 8, right: 8, zIndex: 20, pointerEvents: 'none' }}>
                <div className="bg-neuravex-bg border-2 border-neuravex-border px-2 py-2 shadow-neo-sm flex flex-col gap-1.5">
                    <p className="text-[7px] font-black uppercase tracking-widest text-neuravex-muted font-mono">Priority</p>
                    {[
                        { label: 'Critical', color: '#ff4757' },
                        { label: 'High', color: '#ffa502' },
                        { label: 'Medium', color: '#3498db' },
                        { label: 'Low', color: '#2ecc71' },
                    ].map((item) => (
                        <div key={item.label} className="flex items-center gap-1.5">
                            <div className="w-3 h-3 border-2 border-neuravex-border" style={{ background: item.color }} />
                            <span className="text-[9px] font-black uppercase font-mono" style={{ color: item.color }}>{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Canvas content */}
            {loading ? (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="text-center animate-pulse bg-neuravex-bg p-6 border-4 border-neuravex-border shadow-neo">
                        <p className="text-neuravex-text text-xs font-black uppercase tracking-widest font-mono">Loading Space...</p>
                    </div>
                </div>
            ) : error ? (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                    <div className="bg-neuravex-pink border-4 border-neuravex-border shadow-neo p-5 max-w-sm w-full text-center">
                        <h2 className="text-white font-black uppercase text-lg mb-2">Error</h2>
                        <p className="text-white text-xs font-bold font-mono">{error}</p>
                    </div>
                </div>
            ) : (
                <ReactFlowProvider key={resetKey}>
                    <MindmapCanvas key={resetKey} events={events} canvasHeight={canvasHeight} />
                </ReactFlowProvider>
            )}
        </div>
    )
}
