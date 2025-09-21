// Design system constants matching iOS StreamColors and StreamFonts

export const StreamColors = {
  // Primary Brand Colors
  streamBlue: '#2196F3',
  streamGreen: '#4CAF50',
  streamOrange: '#FF9800',
  streamRed: '#F44336',

  // Scenario Theme Colors
  starbucksGreen: '#00704A',
  amazonOrange: '#FF9900',
  uberCyan: '#00BCD4',

  // Neutral Colors
  background: '#F8FAFB',
  surface: '#FFFFFF',
  surfaceVariant: '#F5F7FA',
  outline: '#E0E4E7',

  // Text Colors
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  textTertiary: '#999999',

  // Status Colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
} as const;

export const ScenarioThemes = {
  starbucks: {
    primary: StreamColors.starbucksGreen,
    gradient: 'from-green-600 to-green-700',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
  },
  amazon: {
    primary: StreamColors.amazonOrange,
    gradient: 'from-orange-500 to-orange-600',
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
  },
  uber: {
    primary: StreamColors.uberCyan,
    gradient: 'from-cyan-500 to-cyan-600',
    iconBg: 'bg-cyan-100',
    iconColor: 'text-cyan-600',
  },
  custom: {
    primary: StreamColors.streamBlue,
    gradient: 'from-blue-500 to-blue-600',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
} as const;

export const DifficultyStyles = {
  easy: {
    color: StreamColors.success,
    bgColor: 'bg-green-50',
    textColor: 'text-green-600',
    dotColor: 'bg-green-500',
  },
  medium: {
    color: StreamColors.warning,
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-600',
    dotColor: 'bg-yellow-500',
  },
  hard: {
    color: StreamColors.error,
    bgColor: 'bg-red-50',
    textColor: 'text-red-600',
    dotColor: 'bg-red-500',
  },
} as const;

export const StatusStyles = {
  // Attestation Status
  pending: {
    color: StreamColors.warning,
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-600',
    badgeClass: 'badge-warning',
  },
  verified: {
    color: StreamColors.success,
    bgColor: 'bg-green-50',
    textColor: 'text-green-600',
    badgeClass: 'badge-success',
  },
  claimed: {
    color: StreamColors.info,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    badgeClass: 'badge-info',
  },
  expired: {
    color: StreamColors.textSecondary,
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-600',
    badgeClass: 'badge-neutral',
  },
  revoked: {
    color: StreamColors.error,
    bgColor: 'bg-red-50',
    textColor: 'text-red-600',
    badgeClass: 'badge-error',
  },

  // Session Status
  inactive: {
    color: StreamColors.textSecondary,
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-600',
  },
  active: {
    color: StreamColors.success,
    bgColor: 'bg-green-50',
    textColor: 'text-green-600',
  },
  paused: {
    color: StreamColors.warning,
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-600',
  },

  // Proof Status
  generating: {
    color: StreamColors.info,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    badgeClass: 'badge-info',
  },
  completed: {
    color: StreamColors.success,
    bgColor: 'bg-green-50',
    textColor: 'text-green-600',
    badgeClass: 'badge-success',
  },
  failed: {
    color: StreamColors.error,
    bgColor: 'bg-red-50',
    textColor: 'text-red-600',
    badgeClass: 'badge-error',
  },
  verifying: {
    color: StreamColors.warning,
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-600',
    badgeClass: 'badge-warning',
  },

  // Claim Status
  available: {
    color: StreamColors.success,
    bgColor: 'bg-green-50',
    textColor: 'text-green-600',
    buttonClass: 'btn-success',
  },
  processing: {
    color: StreamColors.warning,
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-600',
    buttonClass: 'btn-warning',
  },
} as const;

export const IconNames = {
  // Scenario Icons
  starbucks: 'coffee',
  amazon: 'package',
  uber: 'car',
  custom: 'briefcase',

  // Proof Type Icons
  wage_proof: 'dollar-sign',
  attendance_proof: 'clock',
  identity_proof: 'shield',

  // Status Icons
  pending: 'clock',
  verified: 'check-circle',
  claimed: 'check-circle-2',
  expired: 'x-circle',
  revoked: 'ban',
  generating: 'loader',
  completed: 'check',
  failed: 'x',
  verifying: 'search',

  // Session Icons
  inactive: 'pause',
  active: 'play',
  paused: 'pause',

  // General Icons
  wallet: 'wallet',
  settings: 'settings',
  profile: 'user',
  dashboard: 'layout-dashboard',
  work: 'clock',
  proofs: 'shield-check',
  history: 'history',
  stats: 'bar-chart-3',
  earnings: 'dollar-sign',
  hours: 'clock',
  sessions: 'calendar',
} as const;

export const AnimationConfig = {
  // Duration presets
  fast: 150,
  normal: 200,
  slow: 300,
  slower: 500,

  // Easing curves
  easeOut: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
  easeIn: 'cubic-bezier(0.4, 0.0, 1, 1)',
  easeInOut: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',

  // Spring configurations
  spring: {
    type: 'spring',
    stiffness: 300,
    damping: 30,
  },
  springBouncy: {
    type: 'spring',
    stiffness: 400,
    damping: 10,
  },
} as const;

export const LayoutConfig = {
  // Container max widths
  maxWidth: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // Spacing presets
  spacing: {
    xs: '0.5rem', // 8px
    sm: '0.75rem', // 12px
    md: '1rem', // 16px
    lg: '1.5rem', // 24px
    xl: '2rem', // 32px
    '2xl': '3rem', // 48px
  },

  // Border radius presets
  borderRadius: {
    sm: '0.375rem', // 6px
    md: '0.5rem', // 8px
    lg: '0.75rem', // 12px
    xl: '1rem', // 16px
    '2xl': '1.25rem', // 20px
  },

  // Shadow presets
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  },
} as const;

export const BreakPoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export const ZIndexLayers = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  modal: 30,
  popover: 40,
  tooltip: 50,
  notification: 60,
} as const;