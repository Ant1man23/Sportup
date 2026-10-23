import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import {
  Target,
  Zap,
  Shield,
  Crown,
  Award,
  Trophy,
  Flame,
  Rocket,
  X,
  Lock,
} from 'lucide-react-native';
import { colors } from '../../../theme/colors';
import { radius, shadows, spacing } from '../../../theme/spacing';
import { GamificationData, UserBadge } from '../api/profileApi';

interface BadgesGalleryProps {
  gamification: GamificationData;
}

function BadgeIcon({ name, size, color }: { name: string; size: number; color: string }) {
  const props = { size, color };
  switch (name) {
    case 'Target':    return <Target {...props} />;
    case 'Zap':       return <Zap {...props} />;
    case 'Shield':    return <Shield {...props} />;
    case 'Crown':     return <Crown {...props} />;
    case 'Award':     return <Award {...props} />;
    case 'Trophy':    return <Trophy {...props} />;
    case 'Flame':     return <Flame {...props} />;
    case 'Rocket':    return <Rocket {...props} />;
    default:          return <Award {...props} />;
  }
}

interface BadgeDetailModalProps {
  badge: UserBadge | null;
  onClose: () => void;
}

const BadgeDetailModal: React.FC<BadgeDetailModalProps> = ({ badge, onClose }) => {
  if (!badge) return null;
  const isUnlocked = badge.is_unlocked;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          {/* Close */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={18} color={colors.text} />
          </TouchableOpacity>

          {/* Badge Icon Circle */}
          <View style={[
            styles.detailIconCircle,
            { backgroundColor: isUnlocked ? `${badge.color}22` : 'rgba(100,116,139,0.1)' },
            isUnlocked && { borderColor: badge.color, borderWidth: 2 },
          ]}>
            {isUnlocked ? (
              <BadgeIcon name={badge.icon} size={36} color={badge.color} />
            ) : (
              <Lock size={32} color="#64748B" />
            )}
          </View>

          {/* Status */}
          <View style={[styles.detailStatusPill, { backgroundColor: isUnlocked ? `${badge.color}22` : 'rgba(100,116,139,0.1)' }]}>
            <Text style={[styles.detailStatusText, { color: isUnlocked ? badge.color : '#64748B' }]}>
              {isUnlocked ? '✅ BADGE DÉBLOQUÉ' : '🔒 EN COURS'}
            </Text>
          </View>

          <Text style={styles.detailTitle}>{badge.name}</Text>
          <Text style={styles.detailDesc}>{badge.description}</Text>

          {/* Progress bar */}
          <View style={styles.detailProgressSection}>
            <View style={styles.detailProgressRow}>
              <Text style={styles.detailProgressLabel}>Progression</Text>
              <Text style={[styles.detailProgressValue, { color: isUnlocked ? badge.color : colors.muted }]}>
                {badge.current} / {badge.target} {badge.unit}
              </Text>
            </View>
            <View style={styles.detailProgressTrack}>
              <View style={[
                styles.detailProgressFill,
                {
                  width: `${badge.progress_percent}%`,
                  backgroundColor: isUnlocked ? badge.color : '#3B82F6',
                },
              ]} />
            </View>
            <Text style={styles.detailProgressPct}>{badge.progress_percent}% accompli</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const BadgesGallery: React.FC<BadgesGalleryProps> = ({ gamification }) => {
  const [selectedBadge, setSelectedBadge] = useState<UserBadge | null>(null);

  const unlockedBadges = gamification.badges.filter((b) => b.is_unlocked);
  const lockedBadges = gamification.badges.filter((b) => !b.is_unlocked);

  return (
    <View style={styles.container}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Trophy size={16} color="#EAB308" style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>Badges & Trophées</Text>
        </View>
        <View style={styles.completionPill}>
          <Text style={styles.completionText}>
            {gamification.unlocked_count}/{gamification.total_badges} ({gamification.completion_rate}%)
          </Text>
        </View>
      </View>

      {/* Overall progress */}
      <View style={styles.overallProgressTrack}>
        <View style={[styles.overallProgressFill, { width: `${gamification.completion_rate}%` }]} />
      </View>

      {/* Unlocked badges */}
      {unlockedBadges.length > 0 && (
        <View style={styles.badgesGroup}>
          <Text style={styles.groupLabel}>DÉBLOQUÉS ({unlockedBadges.length})</Text>
          <View style={styles.badgesGrid}>
            {unlockedBadges.map((badge) => (
              <TouchableOpacity
                key={badge.id}
                style={styles.badgeTile}
                onPress={() => setSelectedBadge(badge)}
                activeOpacity={0.85}
              >
                <View style={[styles.badgeIconWrap, { backgroundColor: `${badge.color}20`, borderColor: badge.color }]}>
                  <BadgeIcon name={badge.icon} size={22} color={badge.color} />
                </View>
                <Text style={styles.badgeName} numberOfLines={2}>{badge.name}</Text>
                <View style={[styles.unlockedDot, { backgroundColor: badge.color }]} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Locked badges with progress */}
      {lockedBadges.length > 0 && (
        <View style={styles.badgesGroup}>
          <Text style={styles.groupLabel}>EN COURS ({lockedBadges.length})</Text>
          {lockedBadges.map((badge) => (
            <TouchableOpacity
              key={badge.id}
              style={styles.progressBadgeRow}
              onPress={() => setSelectedBadge(badge)}
              activeOpacity={0.85}
            >
              <View style={styles.progressBadgeIcon}>
                <BadgeIcon name={badge.icon} size={18} color="#64748B" />
              </View>
              <View style={styles.progressBadgeBody}>
                <View style={styles.progressBadgeTitleRow}>
                  <Text style={styles.progressBadgeName}>{badge.name}</Text>
                  <Text style={styles.progressBadgePct}>{badge.current}/{badge.target} {badge.unit}</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${badge.progress_percent}%` }]} />
                </View>
                <Text style={styles.progressBadgeDesc} numberOfLines={1}>{badge.description}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <BadgeDetailModal badge={selectedBadge} onClose={() => setSelectedBadge(null)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  completionPill: {
    backgroundColor: 'rgba(234,179,8,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  completionText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EAB308',
    letterSpacing: 0.4,
  },

  // Overall progress bar
  overallProgressTrack: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  overallProgressFill: {
    height: 4,
    backgroundColor: '#EAB308',
    borderRadius: 2,
  },

  // Groups
  badgesGroup: {
    marginBottom: spacing.md,
  },
  groupLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.muted,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },

  // Unlocked grid tiles
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  badgeTile: {
    width: '22%',
    alignItems: 'center',
    gap: 4,
  },
  badgeIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  badgeName: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 13,
  },
  unlockedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Locked progress rows
  progressBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  progressBadgeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(100,116,139,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBadgeBody: {
    flex: 1,
  },
  progressBadgeTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressBadgeName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  progressBadgePct: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3B82F6',
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginBottom: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: '#3B82F6',
    borderRadius: 2,
  },
  progressBadgeDesc: {
    fontSize: 10,
    color: colors.muted,
    fontWeight: '500',
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    width: '100%',
    alignItems: 'center',
    ...shadows.floating,
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeBtn: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    padding: 4,
    backgroundColor: colors.background,
    borderRadius: radius.pill,
  },
  detailIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  detailStatusPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginBottom: spacing.sm,
  },
  detailStatusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  detailDesc: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  detailProgressSection: {
    width: '100%',
  },
  detailProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailProgressLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
  },
  detailProgressValue: {
    fontSize: 11,
    fontWeight: '800',
  },
  detailProgressTrack: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginBottom: 6,
    overflow: 'hidden',
  },
  detailProgressFill: {
    height: 8,
    borderRadius: 4,
  },
  detailProgressPct: {
    fontSize: 10,
    color: colors.muted,
    textAlign: 'right',
  },
});
