/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            colors: {
                neuravex: {
                    bg: '#0d2b2b',        // Deep dark teal background
                    surface: '#143838',   // Slightly lighter teal for cards
                    card: '#1a4a4a',      // Lighter teal for nested elements
                    border: '#2d9f8f',    // Teal borders
                    accent: '#3bbfa7',    // Teal-green accent (Primary)
                    'accent-light': '#5ce0c8', // Light teal accent (Secondary)
                    pink: '#e8a838',      // Warm amber for critical/active states
                    text: '#ffffff',
                    muted: '#8fbfb5',
                },
            },
            boxShadow: {
                // Hard neo-brutalist shadows with teal tones
                'neo': '4px 4px 0 var(--tw-shadow-color, #2d9f8f)',
                'neo-sm': '2px 2px 0 var(--tw-shadow-color, #2d9f8f)',
                'neo-lg': '8px 8px 0 var(--tw-shadow-color, #2d9f8f)',
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'float': 'float 6s ease-in-out infinite',
                'slide-up': 'slideUp 0.5s ease-out',
                'fade-in': 'fadeIn 0.4s ease-out',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
            },
        },
    },
    plugins: [],
}
