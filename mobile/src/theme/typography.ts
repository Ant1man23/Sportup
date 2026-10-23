export const typography = {
  fonts: {
    heading: 'Poppins',
    body: 'Inter',
  },
  display: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700' as const,
  },
  h1: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600' as const,
  },
  h2: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400' as const,
  },
  bodyStrong: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600' as const,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as const,
  },
  overline: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
};

export type Typography = typeof typography;
