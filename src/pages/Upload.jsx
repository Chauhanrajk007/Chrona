import { useState, useRef } from 'react'

export default function Upload() {
    const [text, setText] = useState('')
    const [file, setFile] = useState(null)
    const [status, setStatus] = useState(null) // { type: 'success' | 'error', message: string }
    const [loading, setLoading] = useState(false)
    const [dragActive, setDragActive] = useState(false)
    const fileInputRef = useRef(null)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!text.trim() && !file) {
            setStatus({ type: 'error', message: 'Please enter text or upload a file.' })
            return
        }

        setLoading(true)
        setStatus(null)

        try {
            const formData = new FormData()
            if (file) {
                formData.append('file', file)
            }
            if (text.trim()) {
                formData.append('text', text.trim())
            }

            const res = await fetch('/api/process-event', {
                method: 'POST',
                body: formData,
            })

            if (!res.ok) throw new Error(`Server error: ${res.status}`)
            setStatus({ type: 'success', message: 'Event processed successfully ✨' })
            setText('')
            setFile(null)
            if (fileInputRef.current) fileInputRef.current.value = ''
        } catch (err) {
            setStatus({ type: 'error', message: err.message || 'Failed to process event.' })
        } finally {
            setLoading(false)
        }
    }

    const handleDrag = (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
        else if (e.type === 'dragleave') setDragActive(false)
    }

    const handleDrop = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)
        if (e.dataTransfer.files?.[0]) {
            setFile(e.dataTransfer.files[0])
        }
    }
    return (
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-6">
            <div className="w-full max-w-xl animate-fade-in bg-neuravex-bg border-4 border-neuravex-border shadow-neo p-8 relative">

                {/* Decorative Top Accent Line */}
                <div className="absolute top-0 left-0 w-full h-2 bg-neuravex-accent" />

                {/* Header */}
                <div className="mb-8">
                    <div className="inline-block px-3 py-1 bg-neuravex-surface border-2 border-neuravex-border text-neuravex-accent font-mono text-xs font-bold uppercase tracking-widest mb-4 shadow-neo-sm transform -rotate-2">
                        System Upload
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-black uppercase text-neuravex-text tracking-tighter mb-2" style={{ textShadow: '3px 3px 0px #2d9f8f' }}>
                        Add Event
                    </h1>
                    <p className="text-neuravex-text font-mono text-sm border-l-4 border-neuravex-accent pl-3 mt-4 bg-neuravex-surface p-2 shadow-neo-sm">
                        Paste text, drop a PDF, or upload an image.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Text input */}
                    <div className="relative">
                        <label htmlFor="event-text" className="absolute -top-3 left-4 bg-neuravex-bg px-2 text-xs font-bold text-neuravex-accent-light uppercase tracking-wider z-10 border-x-2 border-t-2 border-neuravex-border">
                            Description
                        </label>
                        <textarea
                            id="event-text"
                            rows={4}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder='e.g. "Math exam tomorrow 4 PM"'
                            className="w-full bg-neuravex-surface border-2 border-neuravex-border p-4 text-neuravex-text placeholder-neuravex-muted focus:outline-none focus:border-neuravex-accent shadow-neo transition-all resize-none font-mono text-sm relative z-0"
                        />
                    </div>

                    {/* File upload */}
                    <div className="relative mt-8">
                        <label className="absolute -top-3 left-4 bg-neuravex-bg px-2 text-xs font-bold text-neuravex-pink uppercase tracking-wider z-10 border-x-2 border-t-2 border-neuravex-border">
                            File Upload
                        </label>
                        <div
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`
                relative border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200 shadow-neo
                ${dragActive
                                    ? 'border-neuravex-accent bg-neuravex-accent/10 translate-y-[-2px]'
                                    : 'border-neuravex-border hover:border-neuravex-accent hover:bg-neuravex-surface hover:-translate-y-1'
                                }
              `}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.png,.jpg,.jpeg,.webp"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                className="hidden"
                            />

                            {file ? (
                                <div className="flex items-center justify-between bg-neuravex-bg border-2 border-neuravex-border p-3 shadow-neo-sm">
                                    <div className="flex items-center gap-3 text-left">
                                        <div className="w-10 h-10 bg-neuravex-surface border-2 border-neuravex-border flex items-center justify-center font-bold text-neuravex-accent">
                                            📄
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-neuravex-text truncate max-w-[200px]">{file.name}</p>
                                            <p className="text-xs text-neuravex-muted font-mono">{(file.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setFile(null)
                                            if (fileInputRef.current) fileInputRef.current.value = ''
                                        }}
                                        className="w-8 h-8 flex items-center justify-center bg-neuravex-pink border-2 border-neuravex-border text-neuravex-bg font-bold hover:bg-red-500 shadow-neo-sm hover:translate-y-[2px] transition-all"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="w-12 h-12 mx-auto bg-neuravex-surface border-2 border-neuravex-border flex items-center justify-center shadow-neo-sm transform rotate-6">
                                        <svg className="w-6 h-6 text-neuravex-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M12 3v13.5m0-13.5l-4.5 4.5m4.5-4.5l4.5 4.5" />
                                        </svg>
                                    </div>
                                    <p className="text-sm font-bold text-neuravex-text font-mono uppercase">
                                        Drop <span className="text-neuravex-pink">PDF</span> or <span className="text-neuravex-pink">Image</span>
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 mt-4 bg-neuravex-accent border-4 border-neuravex-border font-black text-neuravex-bg uppercase tracking-widest text-lg shadow-neo transition-all hover:-translate-y-1 active:translate-y-1 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-neo"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2 font-mono">
                                <div className="w-4 h-4 rounded-sm bg-neuravex-bg animate-pulse" />
                                PROCESSING...
                            </span>
                        ) : (
                            'Process Event'
                        )}
                    </button>

                    {/* Status Message */}
                    {status && (
                        <div
                            className={`p-4 border-4 text-sm font-bold uppercase tracking-wider text-center animate-slide-up shadow-neo-sm ${status.type === 'success'
                                ? 'bg-neuravex-border border-emerald-400 text-emerald-400'
                                : 'bg-neuravex-border border-neuravex-pink text-neuravex-pink'
                                }`}
                        >
                            {status.message}
                        </div>
                    )}
                </form>
            </div>
        </div>
    )
}
