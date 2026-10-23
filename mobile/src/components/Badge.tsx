                                                        import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'muted' | 'sport';
  sportColor?: string;
  showDot?: boolean;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'primary',
  sportColor,
  showDot = false,
  size = 'md',
  style,
  textStyle,
}) => {
  const getTheme = () => {
    if (variant === 'sport' && sportColor) {
      return {
        bg: `${sportColor}15`,
        text: sportColor,
        dot: sportColor,
      };
    }
    switch (variant) {
      case 'success':
        return {
          bg: colors.successSoft,
          text: '#059669',
          dot: colors.success,
        };
      case 'warning':
        return {
          bg: colors.warningSoft,
          text: '#D97706',
          dot: colors.warning,
        };
      case 'danger':
        return {
          bg: colors.dangerSoft,
          text: '#DC2626',
          dot: colors.danger,
        };
      case 'muted':
        return {
          bg: '#F1F5F9',
          text: '#475569',
          dot: '#94A3B8',
        };
      default:
        return {
          bg: colors.primarySoft,
          text: colors.primary,
          dot: colors.primary,
        };
    }
  };

  const theme = getTheme();
  const isSm = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: theme.bg },
        isSm && styles.badgeSm,
        style,
      ]}
    >
      {showDot && (
        <View style={[styles.dot, { backgroundColor: theme.dot }, isSm && styles.dotSm]} />
      )}
      <Text
        style={[
          styles.text,
          { color: theme.text },
          isSm && styles.textSm,
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  dotSm: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginRight: 4,
  },
  text: {
    ...typography.overline,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  textSm: {
    fontSize: 9,
    lineHeight: 12,
  },
});
