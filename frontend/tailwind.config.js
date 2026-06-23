/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        danish: {
          red: '#C8102E',
          white: '#FFFFFF',
          accent: '#E8B84B',
          dark: '#1a1a2e',
          card: '#16213e',
          surface: '#0f3460',
        },
      },
      fontFamily: {
        display: ['"Segoe UI"', 'Tahoma', 'Geneva', 'Verdana', 'sans-serif'],
        body: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
