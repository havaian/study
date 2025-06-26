/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'educational-blue': '#1e3a8a',
        'educational-green': '#059669',
        'educational-teal': '#0d9488',
        'educational-purple': '#7c3aed',
        'soft-blue': '#1e40af',
        'soft-green': '#f3f4f6',
      },
      backgroundImage: {
        'educational-gradient': 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 25%, #f8fafc 50%, #ddd6fe 75%, #f8fafc 100%)',
      },
      animation: {
        'float-educational': 'floatEducational 4s ease-in-out infinite',
        'pulse-educational': 'pulse 3s ease-in-out infinite',
        'slide-in': 'slideIn 1.2s ease-out',
      },
      keyframes: {
        floatEducational: {
          '0%, 100%': {
            transform: 'translateY(0px) rotate(0deg)',
          },
          '25%': {
            transform: 'translateY(-10px) rotate(1deg)',
          },
          '50%': {
            transform: 'translateY(-15px) rotate(0deg)',
          },
          '75%': {
            transform: 'translateY(-10px) rotate(-1deg)',
          },
        },
        slideIn: {
          'from': {
            opacity: '0',
            transform: 'translateY(50px)',
          },
          'to': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
      },
      boxShadow: {
        'glow': '0 20px 40px rgba(14, 165, 233, 0.15)',
        'glow-green': '0 20px 40px rgba(16, 185, 129, 0.15)',
        'glow-teal': '0 20px 40px rgba(6, 182, 212, 0.15)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}