import { useState, useEffect, useCallback, useMemo } from 'react'
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
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

// Distinct colors for each category so they are easy to distinguish
const CATEGORY_COLORS = {
    exam: { border: '#e74c3c', bg: '#e74c3c20', glow: '#e74c3c80' },        // Red
    hackathon: { border: '#00b894', bg: '#00b89420', glow: '#00b89480' },    // Teal-green
    assignment: { border: '#e67e22', bg: '#e67e2220', glow: '#e67e2280' },   // Orange
    meeting: { border: '#9b59b6', bg: '#9b59b620', glow: '#9b59b680' },      // Purple
    personal: { border: '#3498db', bg: '#3498db20', glow: '#3498db80' },     // Blue
    reminder: { border: '#1abc9c', bg: '#1abc9c20', glow: '#1abc9c80' },     // Mint
    other: { border: '#95a5a6', bg: '#95a5a620', glow: '#95a5a680' },        // Gray
}

function getCategoryColor(category) {
    const key = (category || 'other').toLowerCase()
    return CATEGORY_COLORS[key] || CATEGORY_COLORS.other
}

export default function Mindmap() {
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [nodes, setNodes, onNodesChange] = useNodesState([])
    const [edges, setEdges, onEdgesChange] = useEdgesState([])

    // Fetch events
    useEffect(() => {
        async function fetchEvents() {
            try {
                const { data, error: fetchError } = await supabase
                    .from('events')
                    .select('*')
                    .order('event_datetime', { ascending: true })

                if (fetchError) throw fetchError
                setEvents(data || [])
            } catch (err) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }
        fetchEvents()
    }, [])

    // Build nodes and edges when events change
    useEffect(() => {
        if (events.length === 0) {
            setNodes([
                {
                    id: 'center',
                    type: 'default',
                    position: { x: 0, y: 0 },
                    data: { label: '🧠 You' },
                    style: {
                        background: 'linear-gradient(135deg, #2d9f8f, #3bbfa7)',
                        color: '#fff',
                        border: '2px solid #3bbfa7',
                        borderRadius: '50%',
                        width: 80,
                        height: 80,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: 700,
                        boxShadow: '0 0 30px #2d9f8f40',
                    },
                    draggable: true,
                },
            ])
            setEdges([])
            return
        }

        const sorted = sortByPriority(events)
        const newNodes = []
        const newEdges = []

        // 1. Center node
        newNodes.push({
            id: 'center',
            type: 'default',
            position: { x: 0, y: 0 },
            data: { label: '🧠 You' },
            style: {
                background: 'linear-gradient(135deg, #2d9f8f, #3bbfa7)',
                color: '#fff',
                border: '2px solid #3bbfa7',
                borderRadius: '50%',
                width: 80,
                height: 80,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                fontWeight: 700,
                boxShadow: '0 0 30px #2d9f8f40',
            },
            draggable: true,
        })

        // 2. Group events by category
        const categories = {}
        sorted.forEach((event) => {
            const cat = event.category || 'other'
            if (!categories[cat]) categories[cat] = []
            categories[cat].push(event)
        })

        const categoryKeys = Object.keys(categories)
        const catCount = categoryKeys.length

        // Category circle radius
        const catRadius = 300

        // 3. Create Category nodes and their respective Event nodes
        categoryKeys.forEach((cat, catIndex) => {
            // Use distinct category color instead of priority color for the category node
            const eventsInCat = categories[cat]
            const catColor = getCategoryColor(cat)

            const catId = `cat-${cat}`
            const catAngle = (2 * Math.PI * catIndex) / catCount - Math.PI / 2

            // Plot category position
            const cx = Math.cos(catAngle) * catRadius
            const cy = Math.sin(catAngle) * catRadius

            // Add Category Node with distinct category color
            newNodes.push({
                id: catId,
                type: 'categoryNode',
                position: { x: cx - 70, y: cy - 20 },
                data: { label: cat, color: catColor },
                draggable: true,
            })

            // Add Edge from Center to Category - THICK and VISIBLE
            newEdges.push({
                id: `edge-center-${cat}`,
                source: 'center',
                target: catId,
                type: 'default',
                style: { stroke: catColor.border, strokeWidth: 4, opacity: 1 },
                animated: true,
            })

            // Radially fan out the events belonging to this category from the category node
            const eventCount = eventsInCat.length
            const spreadAngle = (Math.PI / 3) // 60 degrees spread per category cluster
            const startAngle = catAngle - spreadAngle / 2

            eventsInCat.forEach((event, eIndex) => {
                const eAngle = eventCount === 1
                    ? catAngle
                    : startAngle + (spreadAngle * (eIndex / (eventCount - 1)))

                // Add distance outward from the category node
                const score = getPriorityScore(event)
                const distanceOut = getNodeDistance(score) + 100 // Extra padding from cat node

                const ex = cx + Math.cos(eAngle) * distanceOut
                const ey = cy + Math.sin(eAngle) * distanceOut

                newNodes.push({
                    id: event.id,
                    type: 'eventNode',
                    position: { x: ex - 90, y: ey - 30 },
                    data: { event },
                    draggable: true,
                })

                // Use priority color for event edges so they stand out
                const eventColor = getPriorityColor(score)
                newEdges.push({
                    id: `edge-${cat}-${event.id}`,
                    source: catId,
                    target: event.id,
                    type: 'default',
                    animated: score > 15,
                    style: { stroke: eventColor.border, strokeWidth: 3, opacity: 1 },
                })
            })
        })

        setNodes(newNodes)
        setEdges(newEdges)
    }, [events])

    if (loading) {
        return (
            <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
                <div className="text-center animate-pulse bg-neuravex-bg p-8 border-4 border-neuravex-border shadow-neo transform rotate-1">
                    <div className="w-16 h-16 mx-auto bg-neuravex-accent flex items-center justify-center mb-4 border-2 border-neuravex-border shadow-neo-sm transform -rotate-3">
                        <span className="text-2xl font-black">🧠</span>
                    </div>
                    <p className="text-neuravex-text text-sm font-black uppercase tracking-widest font-mono">Loading Space...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
                <div className="bg-neuravex-pink border-4 border-neuravex-border shadow-neo p-6 max-w-md text-center transform -rotate-1">
                    <h2 className="text-neuravex-bg font-black uppercase text-xl mb-2">System Error</h2>
                    <p className="text-neuravex-bg text-sm font-bold font-mono">{error}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="h-[calc(100vh-64px)] relative">
            {/* Event count badge */}
            <div className="absolute top-4 left-4 z-10 bg-neuravex-bg border-4 border-neuravex-border px-3 py-2 flex items-center gap-2 shadow-neo-sm transform -rotate-2">
                <div className="w-3 h-3 bg-neuravex-accent border-2 border-neuravex-border shadow-neo-sm animate-pulse" />
                <span className="text-xs font-mono font-bold text-neuravex-text tracking-widest uppercase">
                    {events.length} events
                </span>
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 z-10 bg-neuravex-bg border-4 border-neuravex-border p-3 space-y-2 shadow-neo-sm transform rotate-1">
                {[
                    { label: 'Critical', color: '#ff4757' }, // Red
                    { label: 'High', color: '#ffa502' },    // Orange
                    { label: 'Medium', color: '#3498db' },  // Blue
                    { label: 'Low', color: '#2ecc71' },     // Green
                ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-neuravex-border shadow-neo-sm" style={{ background: item.color }} />
                        <span className="text-xs font-mono font-bold uppercase text-neuravex-text tracking-wider">{item.label}</span>
                    </div>
                ))}
            </div>

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.3 }}
                minZoom={0.3}
                maxZoom={2}
                proOptions={{ hideAttribution: true }}
                className="bg-transparent"
            >
                <Background color="#2d9f8f" gap={32} size={2} variant="dots" />
                <Controls className="react-flow-controls-neo" style={{
                    backgroundColor: '#0d2b2b', border: '2px solid #2d9f8f', borderRadius: '0', boxShadow: '4px 4px 0 #2d9f8f'
                }} />
                <MiniMap
                    nodeStrokeColor={(n) => {
                        if (n.type === 'categoryNode') return n.data.color?.border || '#eee'
                        if (n.type === 'eventNode') return n.data.event?.color?.border || '#eee'
                        return '#e8a838'
                    }}
                    nodeColor={(n) => {
                        if (n.type === 'categoryNode') return n.data.color?.bg || '#fff'
                        if (n.type === 'eventNode') return n.data.event?.color?.bg || '#fff'
                        return '#0d2b2b'
                    }}
                    nodeBorderRadius={0}
                    style={{ backgroundColor: '#143838', border: '4px solid #2d9f8f', borderRadius: '0', boxShadow: '4px 4px 0 #2d9f8f' }}
                />
            </ReactFlow>
        </div>
    )
}
