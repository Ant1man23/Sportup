import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Calendar, MapPin, Bookmark, Clock } from 'lucide-react-native';
import { colors } from '../../../theme/colors';
import { radius, shadows, spacing } from '../../../theme/spacing';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { Session } from '../api/sessionsApi';

interface SessionCardProps {
  session: Session;
  onPress: () => void;
  onJoin?: () => void;
  isJoined?: boolean;
}

export const SessionCard: React.FC<SessionCardProps> = ({
  session,
  onPress,
  onJoin,
  isJoined = false,
}) => {
  const isFootball = session.sport.slug.includes('football');
  const sportColor = session.sport.color_hex || (isFootball ? colors.primary : '#F28B2E');
  const spotsLeft = session.max_participants - session.current_participants;

  const organizerInitials = session.organizer?.username
    ? session.organizer.username.substring(0, 2).toUpperCase()
    : 'SP';

  const formatSessionDate = (rawDate: string): string => {
    if (!rawDate) return '';
    try {
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return rawDate;
      return d.toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
    } catch {
      return rawDate;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      style={styles.card}
    >
      {/* Top Header with Sport Tag & Status */}
      <View style={styles.topRow}>
        <View style={styles.sportBadgeRow}>
          <Badge
            label={session.sport.name.toUpperCase()}
            variant="sport"
            sportColor={sportColor}
            showDot
            size="sm"
          />
          <View style={styles.formatPill}>
            <Text style={styles.formatPillText}>{session.format || '5V5'}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.bookmarkBtn} activeOpacity={0.7}>
          <Bookmark size={16} color={colors.mutedLight} />
        </TouchableOpacity>
      </View>

      {/* Match Title / Description */}
      <Text style={styles.title} numberOfLines={2}>
        {session.description || `${session.sport.name} à ${session.city || 'Antananarivo'}`}
      </Text>

      {/* Date & Location details */}
      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Calendar size={13} color={colors.muted} style={{ marginRight: 5 }} />
          <Text style={styles.detailText}>
            {formatSessionDate(session.session_date)}
          </Text>
        </View>

        <View style={styles.detailDivider} />

        <View style={styles.detailItem}>
          <Clock size={13} color={colors.muted} style={{ marginRight: 5 }} />
          <Text style={styles.detailText}>
            {session.start_time ? session.start_time.substring(0, 5) : '18:00'}
          </Text>
        </View>

        <View style={styles.detailDivider} />

        <View style={[styles.detailItem, { flex: 1 }]}>
          <MapPin size={13} color={colors.muted} style={{ marginRight: 5 }} />
          <Text style={styles.detailText} numberOfLines={1}>
            {session.address || session.city || 'Antananarivo'}
            {session.distance_km ? ` • ${session.distance_km.toFixed(1)} km` : ''}
          </Text>
        </View>
      </View>

      {/* Footer with avatar, spots left & Rejoindre button */}
      <View style={styles.footerRow}>
        <View style={styles.participantInfo}>
          <View style={styles.avatarMini}>
            <Text style={styles.avatarMiniText}>{organizerInitials}</Text>
          </View>
          <View>
            <Text style={styles.organizerName} numberOfLines={1}>
              {session.organizer?.username || 'Organisateur'}
            </Text>
            {spotsLeft > 0 ? (
              <View style={styles.spotsRow}>
                <View style={styles.spotDot} />
                <Text style={styles.spotsText}>
                  {spotsLeft} place{spotsLeft > 1 ? 's' : ''} disponible{spotsLeft > 1 ? 's' : ''}
                </Text>
              </View>
            ) : (
              <Text style={styles.spotsFullText}>Complet</Text>
            )}
          </View>
        </View>

        {onJoin && (
          <Button
            title={isJoined ? 'Inscrit' : spotsLeft === 0 ? 'Complet' : 'Rejoindre'}
            variant={isJoined ? 'secondary' : spotsLeft === 0 ? 'ghost' : 'primary'}
            size="sm"
            disabled={spotsLeft === 0 && !isJoined}
            onPress={() => onJoin()}
            style={styles.joinBtn}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: spacing.md + 2,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs + 2,
  },
  sportBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  formatPill: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  formatPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.muted,
  },
  bookmarkBtn: {
    padding: spacing.xs,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.navy,
    letterSpacing: -0.3,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: spacing.sm + 2,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.mutedLight,
    marginHorizontal: 8,
  },
  detailText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  avatarMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    borderWidth: 1.5,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  avatarMiniText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  organizerName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy,
  },
  spotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  spotDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  spotsText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  spotsFullText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    marginTop: 1,
  },
  joinBtn: {
    minWidth: 88,
    height: 34,
    paddingHorizontal: spacing.md,
  },
});
