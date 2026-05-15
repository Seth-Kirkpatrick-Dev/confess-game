/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './context/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}',
  ],
  // Cosmetic preview_class values come from the DB at runtime — Tailwind can't scan them.
  // Every class token used in any cosmetic's preview_class must be listed here.
  safelist: [
    // name_color — solid text colours
    'text-slate-300', 'text-blue-400', 'text-yellow-400', 'text-rose-400',
    'text-yellow-300', 'text-violet-400', 'text-rose-300', 'text-emerald-400',
    'text-lime-400', 'text-pink-400', 'text-cyan-400', 'text-amber-400',
    'text-orange-400', 'text-pink-300', 'text-transparent',
    'text-indigo-400', 'text-red-400', 'text-teal-400', 'text-white',
    'text-purple-400', 'text-sky-400', 'text-fuchsia-400', 'text-green-400',
    'text-yellow-500', 'text-green-300', 'text-rose-500',
    // name_color — gradients
    'bg-gradient-to-r', 'from-pink-400', 'via-violet-400', 'to-blue-400', 'bg-clip-text',
    'from-red-400', 'via-orange-400', 'to-yellow-400',
    // name_color — glow / drop-shadow
    'drop-shadow-[0_0_8px_rgba(250,204,21,0.7)]',
    'drop-shadow-[0_0_6px_rgba(249,168,212,0.6)]',
    'drop-shadow-[0_0_8px_rgba(134,239,172,0.7)]',
    'drop-shadow-[0_0_8px_rgba(244,63,94,0.7)]',
    // border — ring sizes
    'ring-1', 'ring-2',
    // border — avatar ring colours
    'ring-violet-500/70', 'ring-red-500/70', 'ring-orange-500/60', 'ring-yellow-500/70',
    'ring-cyan-400/70', 'ring-sky-400/70', 'ring-fuchsia-500/60', 'ring-emerald-500/60',
    'ring-white/50',
    // badge_frame — background fills
    'bg-violet-900/40', 'bg-yellow-500/15', 'bg-amber-500/20', 'bg-cyan-500/10',
    'bg-emerald-500/15', 'bg-red-500/15', 'bg-sky-500/15', 'bg-fuchsia-500/15',
    'bg-yellow-500/20', 'bg-blue-500/10',
    // badge_frame — ring colours
    'ring-violet-500/30', 'ring-yellow-400/50', 'ring-amber-500/40', 'ring-cyan-400/50',
    'ring-emerald-400/40', 'ring-red-400/40', 'ring-sky-400/40', 'ring-fuchsia-400/40',
    'ring-yellow-400/60', 'ring-blue-400/50', 'ring-amber-400/50',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0f0f0f',
        surface: '#1a1a1a',
        surfaceHover: '#222222',
        border: '#2a2a2a',
        textPrimary: '#f0f0f0',
        textSecondary: '#888888',
        accent: '#7c3aed',
        accentHover: '#6d28d9',
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'pulse-once': 'pulse 0.5s ease-in-out',
      },
      keyframes: {
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
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
};
