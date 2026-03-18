/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#1e1f29',
          secondary: '#282937',
          tertiary: '#1a1924',
        },
        border: {
          DEFAULT: 'rgba(255,255,255,0.06)',
          hover: 'rgba(255,255,255,0.12)',
        },
        text: {
          primary: '#ffffff',
          secondary: '#d9d9d9',
          muted: '#bdbdbd',
        },
        accent: {
          DEFAULT: '#34bd59',
          dark: '#2c8d47',
        },
      },
      fontFamily: {
        body: ['Montserrat', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.72rem',
      },
    },
  },
  plugins: [],
};
