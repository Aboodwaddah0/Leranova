export const palette = {
  // Brand
  violet: {
    50:  '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    400: '#a78bfa',
    500: '#8b5cf6',
    600: '#7c3aed',
    700: '#6d28d9',
    900: '#4c1d95',
  },
  indigo: {
    50:  '#eef2ff',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
  },
  emerald: {
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
  },
  rose: {
    400: '#fb7185',
    500: '#f43f5e',
    600: '#e11d48',
  },
  amber: {
    400: '#fbbf24',
    500: '#f59e0b',
  },
  sky: {
    500: '#0ea5e9',
  },

  // Neutrals (dark palette)
  dark: {
    bg:        '#0d0c22',   // deepest background
    surface:   '#111029',   // cards, modals
    elevated:  '#1a1836',   // elevated surfaces
    border:    'rgba(255,255,255,0.08)',
    separator: 'rgba(255,255,255,0.05)',
    text:      '#ffffff',
    subtext:   'rgba(255,255,255,0.7)',
    muted:     'rgba(255,255,255,0.35)',
    placeholder:'rgba(255,255,255,0.25)',
  },

  // Neutrals (light palette)
  light: {
    bg:        '#f8fafc',
    surface:   '#ffffff',
    elevated:  '#f1f5f9',
    border:    '#e2e8f0',
    separator: '#f1f5f9',
    text:      '#0f172a',
    subtext:   '#334155',
    muted:     '#64748b',
    placeholder:'#94a3b8',
  },

  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
} as const;

/** Semantic tokens per theme */
export const tokens = {
  dark: {
    background:   palette.dark.bg,
    surface:      palette.dark.surface,
    elevated:     palette.dark.elevated,
    border:       palette.dark.border,
    separator:    palette.dark.separator,
    text:         palette.dark.text,
    subtext:      palette.dark.subtext,
    muted:        palette.dark.muted,
    placeholder:  palette.dark.placeholder,
    primary:      palette.indigo[500],
    primaryText:  palette.white,
    success:      palette.emerald[500],
    danger:       palette.rose[500],
    warning:      palette.amber[500],
    tabBar:       palette.dark.surface,
    tabBarBorder: palette.dark.border,
    tabActive:    palette.indigo[500],
    tabInactive:  palette.dark.muted,
    inputBg:      palette.dark.elevated,
    inputBorder:  palette.dark.border,
    inputText:    palette.dark.text,
    cardBg:       palette.dark.surface,
    cardBorder:   palette.dark.border,
    heroBg:       ['#4c1d95', '#0d0c22', '#312e81'] as string[],
  },
  light: {
    background:   palette.light.bg,
    surface:      palette.light.surface,
    elevated:     palette.light.elevated,
    border:       palette.light.border,
    separator:    palette.light.separator,
    text:         palette.light.text,
    subtext:      palette.light.subtext,
    muted:        palette.light.muted,
    placeholder:  palette.light.placeholder,
    primary:      palette.indigo[500],
    primaryText:  palette.white,
    success:      palette.emerald[600],
    danger:       palette.rose[600],
    warning:      palette.amber[500],
    tabBar:       palette.light.surface,
    tabBarBorder: palette.light.border,
    tabActive:    palette.indigo[600],
    tabInactive:  palette.light.muted,
    inputBg:      palette.light.surface,
    inputBorder:  palette.light.border,
    inputText:    palette.light.text,
    cardBg:       palette.light.surface,
    cardBorder:   palette.light.border,
    heroBg:       ['#5b21b6', '#1e1b4b', '#312e81'] as string[],
  },
} as const;

export type ThemeTokens = typeof tokens.dark;
