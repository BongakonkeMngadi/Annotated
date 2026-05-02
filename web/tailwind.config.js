export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Iosevka', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        sans: ['Iosevka', 'JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        ink: '#070707',
        paper: '#f7f0e7',
        ember: '#ff5a1f',
        gold: '#ffb545',
      },
      boxShadow: {
        glow: '0 0 60px rgba(255, 90, 31, 0.24)',
      },
    },
  },
  plugins: [],
};
