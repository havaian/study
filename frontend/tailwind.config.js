/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'medical-blue': '#0ea5e9',
        'medical-green': '#10b981',
        'medical-teal': '#06b6d4',
        'soft-blue': '#e0f2fe',
        'soft-green': '#ecfdf5',
      },
      backgroundImage: {
        'medical-gradient': 'linear-gradient(135deg, #f0f9ff 0%, #ecfdf5 25%, #f0f9ff 50%, #e0f2fe 75%, #f0f9ff 100%)',
      },
      animation: {
        'float-medical': 'floatMedical 4s ease-in-out infinite',
        'pulse-medical': 'pulse 3s ease-in-out infinite',
        'slide-in': 'slideIn 1.2s ease-out',
      },
      keyframes: {
        floatMedical: {
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