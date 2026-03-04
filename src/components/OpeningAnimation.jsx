import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'

export default function OpeningAnimation({ onComplete }) {
    const containerRef = useRef(null)
    const blocksRef = useRef([])
    const textRef = useRef(null)
    const [animationDone, setAnimationDone] = useState(false)

    useEffect(() => {
        // Lock scroll while animating
        document.body.classList.add('no-scroll')

        // We use a timeline so we can chain the text reveal and block staggered animations
        const tl = gsap.timeline({
            onComplete: () => {
                document.body.classList.remove('no-scroll')
                setAnimationDone(true)
                if (onComplete) onComplete()
            }
        })

        // Step 1: Animate the NEURAVEX text in
        tl.fromTo(
            textRef.current,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }
        )

        // Hold the text for a short moment
        tl.to(textRef.current, { opacity: 0, duration: 0.5, delay: 0.5 })

        // 🌟 Use the exact GSAP polygon animation from the user's HTML template
        // This makes the blocks pull up (from bottom to top) in a stagger
        tl.to(
            blocksRef.current,
            {
                duration: 1,
                clipPath: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)', // Pulls the bottom up
                stagger: 0.075,
                ease: 'power3.inOut'
            },
            '-=0.2'
        )

        return () => {
            tl.kill()
        }
    }, [onComplete])

    if (animationDone) return null

    // Generate 8 blocks as in the cg-art-tech-nav example
    const blocks = Array.from({ length: 8 })

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 z-[9999] pointer-events-none flex"
        >
            {/* The Text overlay */}
            <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                <h1
                    ref={textRef}
                    className="text-white text-5xl md:text-7xl lg:text-9xl font-bold tracking-widest uppercase font-mono"
                    style={{
                        fontFamily: '"Space Mono", monospace',
                        opacity: 0
                    }}
                >
                    Neuravex
                </h1>
            </div>

            {/* The animated blocks layer */}
            <div className="absolute inset-0 z-10 flex w-full h-full pointer-events-none">
                {blocks.map((_, i) => (
                    <div
                        key={i}
                        ref={(el) => (blocksRef.current[i] = el)}
                        // Based on cg-art-tech-nav: blue (#2f24f2) or the brand purple
                        className="flex-1 h-full bg-[#2f24f2]"
                        style={{
                            marginRight: '-1px', // Prevent weird 1px gaps between blocks
                            clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' // Full height initially
                        }}
                    />
                ))}
            </div>
        </div>
    )
}
