 
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#F8FAFC',
        panel: '#F1F5F9',
        card: '#FFFFFF',
        'card-border': '#E2E8F0',
        primary: '#0F172A',
        secondary: '#64748B',
        accent: '#3B82F6',
        'accent-hover': '#2563EB',
        success: '#16A34A',
        danger: '#DC2626',
        'input-border': '#CBD5E1',
        'input-focus': '#3B82F6'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      },
      borderRadius: {
        DEFAULT: '8px'
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08)'
      }
    }
  },
  plugins: []
};
