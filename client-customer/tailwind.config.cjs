const colors = require('./src/theme/colors');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./index.html",
  ],
  theme: {
    extend: {
      colors: {
        primary: colors.primary,
        secondary: colors.secondary,
        softBlue: colors.softBlue,
        zinc: colors.zinc,
        red: colors.red,
        yellow: colors.yellow,
        purple: colors.purple,
        pink: colors.pink,
        green: colors.green,
        vividEmerald: colors.vividEmerald,
        blue: colors.blue,
        orange: colors.orange,
        amber: colors.amber,
        cyan: colors.cyan,
        emerald: colors.emerald,
        fuchsia: colors.fuchsia,
        gray: colors.gray,
        indigo: colors.indigo,
        lime: colors.lime,
        neutral: colors.neutral,
        rose: colors.rose,
        sky: colors.sky,
        slate: colors.slate,
        stone: colors.stone,
        teal: colors.teal,
        violet: colors.violet,
        white: colors.white,
        typography: colors.typography,
        black: colors.black,
        disabled: colors.disabled,
        error: colors.error,
        info: colors.info,
        success: colors.success,
        warning: colors.warning,
      },
      animation: {
        'bounce-slow': 'bounce 3s infinite',
        'fade-in': 'fadeIn 0.2s ease-in',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
