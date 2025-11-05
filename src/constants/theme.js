// src/constants/theme.js
// Design system for Dividela app

export const COLORS = {
  // Primary colors
  primary: '#667eea',
  primaryDark: '#5568d3',
  primaryLight: '#8a9eff',
  
  // Secondary colors
  secondary: '#764ba2',
  
  // Gradient
  gradientStart: '#667eea',
  gradientEnd: '#764ba2',
  
  // Text colors
  text: '#333333',
  textSecondary: '#666666',
  textLight: '#999999',
  textWhite: '#ffffff',
  
  // Background colors
  background: '#ffffff',
  backgroundSecondary: '#f8f9fa',
  backgroundLight: '#f0f1f3',
  
  // Status colors
  success: '#4caf50',
  error: '#f44336',
  warning: '#ffc107',
  info: '#2196f3',
  
  // UI element colors
  border: '#eeeeee',
  borderLight: '#f5f5f5',
  divider: '#e0e0e0',
  
  // Balance colors
  positive: '#4caf50', // They owe you
  negative: '#f44336', // You owe them
  neutral: '#999999',  // All settled
};

export const FONTS = {
  // Font families
  regular: 'System',
  medium: 'System',
  bold: 'System',
  
  // Font sizes
  sizes: {
    tiny: 11,
    small: 13,
    body: 15,
    subtitle: 16,
    title: 18,
    heading: 22,
    large: 28,
    xlarge: 36,
    xxlarge: 48,
  },
  
  // Font weights
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};

export const SPACING = {
  // Base spacing unit (8px)
  unit: 8,
  
  // Common spacing values
  tiny: 4,
  small: 8,
  medium: 12,
  base: 16,
  large: 20,
  xlarge: 24,
  xxlarge: 32,
  huge: 40,
  
  // Specific use cases
  screenPadding: 20,
  cardPadding: 16,
  buttonPadding: 14,
  inputPadding: 14,
};

export const SIZES = {
  // Border radius
  borderRadius: {
    small: 8,
    medium: 12,
    large: 15,
    xlarge: 20,
    round: 999,
  },
  
  // Button sizes
  button: {
    height: 48,
    minWidth: 100,
  },
  
  // Input sizes
  input: {
    height: 48,
  },
  
  // Icon sizes
  icon: {
    small: 20,
    medium: 24,
    large: 32,
    xlarge: 44,
  },
  
  // Avatar sizes
  avatar: {
    small: 36,
    medium: 44,
    large: 60,
  },
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  
  medium: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  
  large: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  
  card: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  
  fab: {
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
};

export const ANIMATIONS = {
  // Duration in milliseconds
  duration: {
    instant: 0,
    fast: 150,
    normal: 250,
    slow: 350,
  },
  
  // Easing functions (for animated library)
  easing: {
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};

// Utility function to create linear gradient config
export const createGradient = (start = COLORS.gradientStart, end = COLORS.gradientEnd) => ({
  colors: [start, end],
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
});

// Common styles that can be reused
export const COMMON_STYLES = {
  // Container styles
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  screenPadding: {
    paddingHorizontal: SPACING.screenPadding,
  },
  
  // Card styles
  card: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius.medium,
    padding: SPACING.cardPadding,
    ...SHADOWS.card,
  },
  
  // Text styles
  heading: {
    fontSize: FONTS.sizes.heading,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
  },
  
  title: {
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
  },
  
  body: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.regular,
    color: COLORS.text,
  },
  
  caption: {
    fontSize: FONTS.sizes.small,
    fontWeight: FONTS.weights.regular,
    color: COLORS.textSecondary,
  },
  
  // Button styles
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.borderRadius.medium,
    paddingVertical: SPACING.buttonPadding,
    paddingHorizontal: SPACING.large,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: SIZES.button.height,
  },
  
  primaryButtonText: {
    color: COLORS.textWhite,
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
  },
  
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: SIZES.borderRadius.medium,
    paddingVertical: SPACING.buttonPadding,
    paddingHorizontal: SPACING.large,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: SIZES.button.height,
  },
  
  secondaryButtonText: {
    color: COLORS.text,
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.medium,
  },
  
  // Input styles
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: SIZES.borderRadius.medium,
    paddingVertical: SPACING.inputPadding,
    paddingHorizontal: SPACING.base,
    fontSize: FONTS.sizes.body,
    color: COLORS.text,
    minHeight: SIZES.input.height,
  },
  
  inputFocused: {
    borderColor: COLORS.primary,
  },
  
  // Layout helpers
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  rowSpaceBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Separator
  separator: {
    height: 1,
    backgroundColor: COLORS.divider,
  },
};

export default {
  COLORS,
  FONTS,
  SPACING,
  SIZES,
  SHADOWS,
  ANIMATIONS,
  COMMON_STYLES,
  createGradient,
};
