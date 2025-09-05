export const theme = {
  colors: {
    black: "#000000",
    white: "#FFFFFF",
    offWhite: "#F5F5F5",
    darkGray: "#141414",
    mediumGray: "#1E1E1E",
    lightGray: "#2A2A2A",
    borderGray: "#333333",
    textGray: "#999999",
    error: "#FF3B30",
    success: "#34C759",
    warning: "#FF9500",
    glow: "rgba(255, 255, 255, 0.08)",
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  typography: {
    hero: {
      fontSize: 48,
      fontWeight: "300" as const,
      letterSpacing: -1,
    },
    h1: {
      fontSize: 32,
      fontWeight: "600" as const,
      letterSpacing: -0.5,
    },
    h2: {
      fontSize: 24,
      fontWeight: "600" as const,
      letterSpacing: -0.3,
    },
    h3: {
      fontSize: 20,
      fontWeight: "600" as const,
    },
    body: {
      fontSize: 16,
      fontWeight: "400" as const,
      lineHeight: 24,
    },
    caption: {
      fontSize: 14,
      fontWeight: "400" as const,
      opacity: 0.7,
    },
    button: {
      fontSize: 16,
      fontWeight: "600" as const,
      letterSpacing: 0.5,
    },
  },
  animation: {
    fast: 150,
    normal: 200,
    slow: 300,
  },
};