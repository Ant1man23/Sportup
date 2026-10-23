import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../../theme/colors';
import { radius, shadows, spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

interface StatCardProps {
  value: string | number;
  label: string;
  valueColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  value,
  label,
  valueColor = colors.text,
}) => {
  return (
    <View style={styles.card}>
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  value: {
    ...typography.display,
    fontSize: 24,
  },
  label: {
    ...typography.caption,
    color: colors.muted,
    marginTop: 2,
    textAlign: 'center',
  },
});
