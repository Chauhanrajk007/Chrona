import { useState, useEffect, useCallback, useRef, useLayoutEffect, useMemo } from 'react'
import dayjs from 'dayjs'
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    ReactFlowProvider,
} from '@xyflow/react'

// Real-time refresh interval (ms)
const TICK_INTERVAL = 60_000
import '@xyflow/react/dist/style.css'
import { supabase, getCurrentUserId } from '../lib/supabase'
import {
    getPriorityScore,
    getPriorityColor,
    getNodeDistance,
    sortByPriority,
} from '../lib/priorityEngine'
import EventNode from '../components/EventNode'
import CategoryNode from '../components/CategoryNode'
import CancelModal from '../components/CancelModal'
import { api } from '../lib/api'
import { rescheduleEvent, generateRescheduleMessage } from '../lib/priorityEngine'

const nodeTypes = { eventNode: EventNode, categoryNode: CategoryNode }

const CATEGORY_COLORS = {
    exam: { border: '#ff4d4d', bg: '#ff4d4d20' },
    hackathon: { border: '#4da3ff', bg: '#4da3ff20' },
    assignment: { border: '#ff9f43', bg: '#ff9f4320' },
    meeting: { border: '#10b981', bg: '#10b98120' },
    personal: { border: '#3ddc97', bg: '#3ddc9720' },
    reminder: { border: '#38bdf8', bg: '#38bdf820' },
    other: { border: '#94a3b8', bg: '#94a3b820' },
}

function getCategoryColor(cat) {
    return CATEGORY_COLORS[(cat || 'other').toLowerCase()] || CATEGORY_COLORS.other
}

const STORAGE_KEY = 'chrona_mindmap_positions'

// ── Inner ReactFlow component ────────────────────────────────────────────────
function MindmapCanvas({ events, canvasHeight, onDeleteEvent, onCompleteEvent, onRescheduleEvent }) {
    const [nodes, setNodes, onNodesChange] = useNodesState([])
    const [edges, setEdges, onEdgesChange] = useEdgesState([])
    const rfInstance = useRef(null)

    const buildLayout = useCallback((eventsData) => {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
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
                background: 'radial-gradient(circle, #1e3a5f, #0a1128)',
                color: '#4da3ff',
                border: '2px solid rgba(77, 163, 255, 0.5)',
                borderRadius: '50%',
                width: 76,
                height: 76,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 700,
                boxShadow: '0 0 30px rgba(77, 163, 255, 0.35), 0 0 60px rgba(77, 163, 255, 0.1)',
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
            newEdges.push({
                id: `e-c-${cat}`, source: 'center', target: catId,
                style: { stroke: color.border, strokeWidth: 2 },
                animated: true,
            })

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
                newNodes.push({
                    id: ev.id,
                    type: 'eventNode',
                    position: ePos,
                    data: { event: ev, onDelete: onDeleteEvent, onComplete: onCompleteEvent, onReschedule: onRescheduleEvent },
                    draggable: true,
                })
                newEdges.push({
                    id: `e-${cat}-${ev.id}`, source: catId, target: ev.id,
                    animated: score > 15,
                    style: { stroke: eColor.border, strokeWidth: 1.5 },
                })

                // Collect sub-items natively extracted by backend
                const subItems = []
                if (ev.key_topics && Array.isArray(ev.key_topics)) {
                    subItems.push(...ev.key_topics.map(t => ({ label: `${t}`, type: 'topic' })))
                }
                if (ev.action_items && Array.isArray(ev.action_items)) {
                    subItems.push(...ev.action_items.map(t => ({ label: `${t}`, type: 'action' })))
                }

                if (subItems.length > 0) {
                    const subSpread = Math.PI / 1.5
                    const subStartAngle = eAngle - subSpread / 2
                    subItems.forEach((sub, si) => {
                        const sAngle = subItems.length === 1 ? eAngle : subStartAngle + (subSpread * si) / (subItems.length - 1)
                        const sDist = 90 // distance from event node
                        // Center is roughly +60, +20 inside the event node relative to top-left
                        const sx = ex + Math.cos(sAngle) * sDist
                        const sy = ey + Math.sin(sAngle) * sDist
                        const subId = `sub-${ev.id}-${si}`
                        const subPos = saved[subId] || { x: sx - 40, y: sy - 10 }
                        
                        newNodes.push({
                            id: subId,
                            type: 'default',
                            position: subPos,
                            data: { label: sub.label },
                            style: {
                                background: sub.type === 'action' ? 'rgba(255, 159, 67, 0.1)' : 'rgba(77, 163, 255, 0.1)',
                                color: sub.type === 'action' ? '#ff9f43' : '#4da3ff',
                                border: `1px solid ${sub.type === 'action' ? 'rgba(255, 159, 67, 0.3)' : 'rgba(77, 163, 255, 0.3)'}`,
                                borderRadius: '8px',
                                padding: '4px 6px',
                                fontSize: '8px',
                                fontWeight: 600,
                                width: 'max-content',
                                maxWidth: '100px',
                                whiteSpace: 'normal',
                                textAlign: 'center',
                                backdropFilter: 'blur(4px)',
                            },
                            draggable: true,
                        })
                        newEdges.push({
                            id: `e-${ev.id}-${subId}`, source: ev.id, target: subId,
                            style: { stroke: sub.type === 'action' ? 'rgba(255, 159, 67, 0.4)' : 'rgba(77, 163, 255, 0.4)', strokeWidth: 1, strokeDasharray: '2 2' },
                        })
                    })
                }
            })
        })

        setNodes(newNodes)
        setEdges(newEdges)
    }, [setNodes, setEdges, onDeleteEvent, onCompleteEvent, onRescheduleEvent])

    useEffect(() => { buildLayout(events) }, [events, buildLayout])

    // When ReactFlow initializes, do a delayed fitView as extra assurance
    const onInit = useCallback((instance) => {
        rfInstance.current = instance
        // After init, wait for nodes to be painted then fit
        setTimeout(() => instance.fitView({ padding: 0.2, duration: 400 }), 300)
        setTimeout(() => instance.fitView({ padding: 0.2, duration: 400 }), 800)
    }, [])

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
                onInit={onInit}
                nodeTypes={nodeTypes}
                panOnScroll={false}
                panOnDrag={true}
                zoomOnPinch={true}
                zoomOnScroll={false}
                preventScrolling={true}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.05}
                maxZoom={3}
                proOptions={{ hideAttribution: true }}
            >
                <Background color="rgba(77, 163, 255, 0.06)" gap={28} size={1} variant="dots" />
                <Controls />
                <MiniMap
                    className="hidden md:block"
                    nodeBorderRadius={4}
                    nodeColor={() => 'rgba(77, 163, 255, 0.3)'}
                    nodeStrokeColor={() => 'rgba(77, 163, 255, 0.5)'}
                />
            </ReactFlow>
        </div>
    )
}

// ── Page outer wrapper ───────────────────────────────────────────────────────
export default function Mindmap() {
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [canvasHeight, setCanvasHeight] = useState(0)
    const [resetKey, setResetKey] = useState(0)
    const [tick, setTick] = useState(0)
    const [cancelTarget, setCancelTarget] = useState(null)

    // Real-time tick: re-render every 60s so node colors update live
    // Also auto-archives past events (1h grace period) to drafts table
    useEffect(() => {
        const cleanup = () => {
            setTick((t) => t + 1)
            const now = dayjs()
            setEvents((prev) => {
                const expired = prev.filter((e) => now.diff(dayjs(e.event_datetime), 'hour', true) >= 1)
                const remaining = prev.filter((e) => now.diff(dayjs(e.event_datetime), 'hour', true) < 1)

                // Archive expired events to drafts table in background
                if (expired.length > 0) {
                    const nowISO = new Date().toISOString()
                    const archivedEvents = expired.map(e => ({
                        ...e,
                        status: 'expired',
                        archived_at: nowISO,
                        notes: 'Automatically archived - event expired'
                    }))

                    // First, insert expired events into drafts table
                    supabase.from('drafts').insert(archivedEvents).then(({ error: archiveErr }) => {
                        if (archiveErr) {
                            console.error('Archive to drafts failed:', archiveErr.message)
                            // Fallback: still delete from events even if archiving fails
                            const ids = expired.map(e => e.id)
                            supabase.from('events').delete().in('id', ids).then(({ error: delErr }) => {
                                if (delErr) console.error('Auto-cleanup failed:', delErr.message)
                            })
                        } else {
                            // Only delete from events table after successful archiving
                            const ids = expired.map(e => e.id)
                            supabase.from('events').delete().in('id', ids).then(({ error: delErr }) => {
                                if (delErr) console.error('Auto-cleanup failed:', delErr.message)
                            })
                        }
                    })
                }
                return remaining
            })
        }
        const id = setInterval(cleanup, TICK_INTERVAL)
        return () => clearInterval(id)
    }, [])

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

    const fetchEvents = useCallback(async () => {
        const userId = getCurrentUserId()
        let query = supabase.from('events').select('*').order('event_datetime', { ascending: true })
        if (userId) query = query.eq('user_id', userId)
        const { data, error: e } = await query
        if (e) setError(e.message)
        else setEvents(data || [])
        setLoading(false)
    }, [])

    useEffect(() => { fetchEvents() }, [fetchEvents])

    const handleReset = () => {
        localStorage.removeItem(STORAGE_KEY)
        setResetKey((k) => k + 1)
    }

    const handleDeleteConfirm = useCallback(async (eventId, reason) => {
        const deletedEvent = events.find(e => e.id === eventId)
        setEvents((prev) => prev.filter((e) => e.id !== eventId))
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
        delete saved[eventId]
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
        try {
            await supabase.from('events').delete().eq('id', eventId)
            await api.post('/api/schedule/changes', {
                event_id: eventId,
                change_type: 'cancelled',
                reason: reason || 'Cancelled by user',
                metadata: { event_title: deletedEvent?.title || 'Unknown', cancellation_reason: reason }
            }).catch(() => {})
        } catch (err) {
            console.error('Delete failed:', err.message)
            fetchEvents()
        } finally {
            setCancelTarget(null)
        }
    }, [events, fetchEvents])

    const handleDeleteEvent = useCallback((eventId) => {
        const eventToCancel = events.find(e => e.id === eventId)
        if (eventToCancel) setCancelTarget(eventToCancel)
    }, [events])

    const handleCompleteEvent = useCallback(async (eventId) => {
        try {
            const completedEvent = events.find(e => e.id === eventId)
            const { error: updateError } = await supabase
                .from('events')
                .update({ status: 'completed' })
                .eq('id', eventId)

            if (updateError) throw updateError

            try {
                await api.post('/api/schedule/changes', {
                    event_id: eventId,
                    change_type: 'completed',
                    reason: generateRescheduleMessage(completedEvent || { title: 'Event' }, 'completed'),
                    metadata: { event_title: completedEvent?.title || 'Unknown' },
                })
            } catch (logErr) { /* non-fatal */ }

            setEvents(prev => prev.filter(e => e.id !== eventId))
        } catch (error) {
            console.error('Complete event error:', error)
        }
    }, [events])

    const handleAutoReschedule = useCallback(async (event) => {
        try {
            const eventTime = dayjs(event.event_datetime)
            const baseTime = eventTime.isAfter(dayjs()) ? eventTime : dayjs()
            const newDateTime = baseTime.add(2, 'hour').toISOString()
            
            const updatedEvent = await rescheduleEvent(event.id, newDateTime, supabase)
            setEvents(prev => prev.map(e => e.id === event.id ? updatedEvent : e))
            
            api.post('/api/schedule/changes', {
                event_id: event.id,
                change_type: 'rescheduled',
                reason: 'Auto-rescheduled +2 hours to allow completion',
                metadata: { event_title: updatedEvent?.title || 'Unknown', original_time: newDateTime }
            }).catch(() => {})
        } catch (error) {
            console.error('Reschedule failed:', error)
        }
    }, [])

    const canvasStyle = {
        width: '100%',
        height: canvasHeight > 0 ? `${canvasHeight}px` : '100vh',
        position: 'relative',
    }

    return (
        <div style={canvasStyle}>
            {/* Cancel Modal */}
            {cancelTarget && (
                <CancelModal
                    event={cancelTarget}
                    onClose={() => setCancelTarget(null)}
                    onConfirm={handleDeleteConfirm}
                />
            )}

            {/* Top bar */}
            <div style={{ position: 'absolute', top: 12, left: 0, right: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', pointerEvents: 'none' }}>
                <div style={{ pointerEvents: 'auto' }} className="glass rounded-lg px-3 py-1.5 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#4da3ff', boxShadow: '0 0 8px rgba(77, 163, 255, 0.5)' }} />
                    <span className="text-[10px] sm:text-xs font-mono font-semibold text-nv-text tracking-wider">{events.length} events</span>
                </div>
                <button
                    onClick={handleReset}
                    style={{ pointerEvents: 'auto' }}
                    className="glass rounded-lg font-semibold text-[10px] sm:text-xs px-3 py-1.5 transition-all hover:-translate-y-0.5 text-nv-critical"
                >
                    ↺ Reset
                </button>
            </div>

            {/* Priority legend — bottom-right; on md+ pushed up to avoid minimap overlap */}
            <div className="absolute bottom-3 right-3 z-20 pointer-events-none md:bottom-[140px]">
                <div className="glass rounded-lg px-3 py-2.5 flex flex-col gap-1.5">
                    <p className="text-[8px] font-semibold uppercase tracking-widest text-nv-text-muted">Priority</p>
                    {[
                        { label: 'Critical', color: '#ff4d4d' },
                        { label: 'High', color: '#ff9f43' },
                        { label: 'Medium', color: '#4da3ff' },
                        { label: 'Low', color: '#3ddc97' },
                    ].map((item) => (
                        <div key={item.label} className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: item.color, boxShadow: `0 0 6px ${item.color}60` }} />
                            <span className="text-[9px] font-medium" style={{ color: item.color }}>{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Severity legend — bottom-left */}
            <div className="absolute bottom-3 left-3 z-20 pointer-events-none md:bottom-[140px]">
                <div className="glass rounded-lg px-3 py-2.5 flex flex-col gap-1.5">
                    <p className="text-[8px] font-semibold uppercase tracking-widest text-nv-text-muted">Severity</p>
                    {[
                        { label: 'Critical', color: '#ff4d4d' },
                        { label: 'High', color: '#ff9f43' },
                        { label: 'Medium', color: '#4da3ff' },
                        { label: 'Low', color: '#3ddc97' },
                    ].map((item) => (
                        <div key={item.label} className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color, boxShadow: `0 0 6px ${item.color}60` }} />
                            <span className="text-[9px] font-medium" style={{ color: item.color }}>{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Canvas content */}
            {loading ? (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="text-center glass rounded-xl p-6 shadow-glass">
                        <div className="w-8 h-8 mx-auto rounded-full border-2 border-nv-accent/30 border-t-nv-accent animate-spin mb-3" />
                        <p className="text-nv-text-dim text-xs font-medium tracking-wider uppercase">Loading Space...</p>
                    </div>
                </div>
            ) : error ? (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                    <div className="glass rounded-xl p-5 max-w-sm w-full text-center shadow-glass" style={{ borderColor: 'rgba(255, 77, 77, 0.3)' }}>
                        <h2 className="text-nv-critical font-bold text-lg mb-2">Error</h2>
                        <p className="text-nv-text-dim text-xs font-mono">{error}</p>
                    </div>
                </div>
            ) : (
                <ReactFlowProvider key={`${resetKey}-${tick}`}>
                    <MindmapCanvas events={events} canvasHeight={canvasHeight} onDeleteEvent={handleDeleteEvent} onCompleteEvent={handleCompleteEvent} onRescheduleEvent={handleAutoReschedule} />
                </ReactFlowProvider>
            )}
        </div>
    )
}
