import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { radius, spacing } from '../../../theme/spacing';
import { MatchEvent } from '../api/matchesApi';

interface PlayByPlayTabProps {
  events: MatchEvent[];
  teamAName: string;
  teamBName: string;
  teamAColor?: string;
  teamBColor?: string;
  isOrganizer: boolean;
  sportSlug?: string;
  onCancelEvent?: (eventId: number) => void;
  actionLoading?: boolean;
}

type EventFilter = 'all' | 'scores' | 'fouls';

export const PlayByPlayTab: React.FC<PlayByPlayTabProps> = ({
  events,
  teamAName,
  teamBName,
  teamAColor = '#3B82F6',
  teamBColor = '#EF4444',
  isOrganizer,
  sportSlug,
  onCancelEvent,
  actionLoading = false,
}) => {
  const [filter, setFilter] = useState<EventFilter>('all');
  const activeEvents = [...events].reverse(); // Most recent first

  const getEventBadge = (ev: MatchEvent) => {
    switch (ev.type) {
      // ─── Basketball ─────────────────────────────────────────────
      case 'basket':
        return {
          text: `PANIER +${ev.points || 2}${ev.points === 3 ? ' (3PTS)' : ev.points === 1 ? ' (LF)' : ''}`,
          color: '#38BDF8',
          bg: 'rgba(56,189,248,0.15)',
          border: 'rgba(56,189,248,0.3)',
          icon: '🏀',
          isScore: true,
        };
      case 'free_throw':
        return {
          text: ev.shot_result === 'missed' ? 'LF MANQUÉ' : 'LANCER FRANC +1',
          color: ev.shot_result === 'missed' ? '#94A3B8' : '#10B981',
          bg: ev.shot_result === 'missed' ? 'rgba(148,163,184,0.12)' : 'rgba(16,185,129,0.15)',
          border: ev.shot_result === 'missed' ? 'rgba(148,163,184,0.2)' : 'rgba(16,185,129,0.3)',
          icon: '🏀',
          isScore: ev.shot_result !== 'missed',
        };
      case 'missed_shot':
        return {
          text: `TIR MANQUÉ${ev.shot_type ? ` (${ev.shot_type.toUpperCase()})` : ''}`,
          color: '#64748B',
          bg: 'rgba(100,116,139,0.12)',
          border: 'rgba(100,116,139,0.2)',
          icon: '❌',
          isScore: false,
        };
      case 'rebound':
        return {
          text: `REBOND ${ev.rebound_type === 'offensive' ? 'OFFENSIF' : 'DÉFENSIF'}`,
          color: '#38BDF8',
          bg: 'rgba(56,189,248,0.12)',
          border: 'rgba(56,189,248,0.25)',
          icon: '↩️',
          isScore: false,
        };
      case 'steal':
        return { text: 'INTERCEPTION', color: '#A855F7', bg: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.3)', icon: '✋', isScore: false };
      case 'block':
        return { text: 'CONTRE', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)', icon: '🛡️', isScore: false };
      case 'turnover':
        return { text: 'BALLE PERDUE', color: '#EF4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)', icon: '🔄', isScore: false };

      // ─── Football ──────────────────────────────────────────────
      case 'goal':
        return { text: '⚽ BUT ! (+1)', color: '#10B981', bg: 'rgba(16,185,129,0.2)', border: 'rgba(16,185,129,0.4)', icon: '⚽', isScore: true };
      case 'shot_on_target':
        return { text: 'TIR CADRÉ', color: '#38BDF8', bg: 'rgba(56,189,248,0.15)', border: 'rgba(56,189,248,0.3)', icon: '🎯', isScore: false };
      case 'shot_off_target':
        return { text: 'TIR NON CADRÉ', color: '#64748B', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.2)', icon: '💨', isScore: false };
      case 'save':
        return { text: 'ARRÊT GARDIEN', color: '#10B981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)', icon: '🧤', isScore: false };
      case 'corner':
        return { text: 'CORNER', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)', icon: '🚩', isScore: false };
      case 'offside':
        return { text: 'HORS-JEU', color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.2)', icon: '🏁', isScore: false };
      case 'card_yellow':
        return { text: 'CARTON JAUNE', color: '#F59E0B', bg: 'rgba(245,158,11,0.2)', border: 'rgba(245,158,11,0.4)', icon: '🟨', isFoul: true };
      case 'card_red':
        return { text: 'CARTON ROUGE', color: '#EF4444', bg: 'rgba(239,68,68,0.2)', border: 'rgba(239,68,68,0.4)', icon: '🟥', isFoul: true };

      // ─── Volleyball ────────────────────────────────────────────
      case 'ace':
        return { text: `ACE ${ev.points ? `(+${ev.points})` : ''}`, color: '#A855F7', bg: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.3)', icon: '🎯', isScore: true };
      case 'attack_kill':
        return { text: `ATTAQUE GAGNANTE ${ev.points ? `(+${ev.points})` : ''}`, color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)', icon: '💥', isScore: true };

      // ─── Table Tennis ──────────────────────────────────────────
      case 'winner':
        return { text: `COUP GAGNANT ${ev.points ? `(+${ev.points})` : ''}`, color: '#38BDF8', bg: 'rgba(56,189,248,0.15)', border: 'rgba(56,189,248,0.3)', icon: '⚡', isScore: true };

      // ─── Generic point ─────────────────────────────────────────
      case 'point':
        return { text: `POINT (+${ev.points || 1})`, color: '#10B981', bg: 'rgba(16,185,129,0.18)', border: 'rgba(16,185,129,0.35)', icon: '✅', isScore: true };

      // ─── Common ────────────────────────────────────────────────
      case 'assist':
        return { text: 'PASSE DÉCISIVE', color: '#10B981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)', icon: '👟', isScore: false };
      case 'foul':
        return { text: 'FAUTE', color: '#EF4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)', icon: '⚠️', isFoul: true };
      case 'substitution':
        return { text: 'REMPLACEMENT', color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.2)', icon: '🔄', isScore: false };
      case 'period_started':
        return { text: `DÉBUT PÉRIODE ${ev.period || ''}`, color: '#38BDF8', bg: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.3)', icon: '▶️', isSystem: true };
      case 'period_ended':
        return { text: `FIN PÉRIODE ${ev.period || ''}`, color: '#94A3B8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)', icon: '⏹️', isSystem: true };
      case 'match_paused':
        return { text: 'MATCH EN PAUSE', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)', icon: '⏸️', isSystem: true };
      case 'match_resumed':
        return { text: 'MATCH REPRIS', color: '#10B981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)', icon: '▶️', isSystem: true };
      case 'match_ended':
        return { text: 'MATCH TERMINÉ', color: '#EF4444', bg: 'rgba(239,68,68,0.2)', border: 'rgba(239,68,68,0.4)', icon: '🏁', isSystem: true };
      default:
        return { text: (ev.type as string).toUpperCase(), color: '#CBD5E1', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)', icon: '•' };
    }
  };

  const getPeriodLabel = (ev: MatchEvent): string => {
    const p = ev.period || 1;
    if (sportSlug === 'volleyball' || sportSlug === 'volley') return `S${p}`;
    if (sportSlug === 'table-tennis' || sportSlug === 'tennis-de-table' || sportSlug === 'ping-pong') return `M${p}`;
    if (sportSlug === 'football' || sportSlug === 'football-11' || sportSlug === 'football-5' || sportSlug === 'futsal') {
      return p === 1 ? 'MT1' : p === 2 ? 'MT2' : `P${p}`;
    }
    return `Q${p}`;
  };

  const handleConfirmCancel = (eventId: number) => {
    Alert.alert(
      'Annuler l\'action',
      'Êtes-vous sûr de vouloir supprimer cet événement ? Le score et les statistiques seront automatiquement recalculés.',
      [
        { text: 'Retour', style: 'cancel' },
        { text: 'Confirmer l\'annulation', style: 'destructive', onPress: () => onCancelEvent?.(eventId) },
      ]
    );
  };

  const filteredEvents = activeEvents.filter((ev) => {
    if (filter === 'scores') {
      const b = getEventBadge(ev);
      return b.isScore;
    }
    if (filter === 'fouls') {
      const b = getEventBadge(ev);
      return b.isFoul || ev.type === 'foul' || ev.type === 'card_yellow' || ev.type === 'card_red';
    }
    return true;
  });

  if (activeEvents.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>⏱️</Text>
        <Text style={styles.emptyText}>Aucun événement enregistré pour ce match.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Event Filter Chips */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterChipText, filter === 'all' && styles.filterChipTextActive]}>
            Tous ({activeEvents.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, filter === 'scores' && styles.filterChipActive]}
          onPress={() => setFilter('scores')}
        >
          <Text style={styles.filterIcon}>🎯</Text>
          <Text style={[styles.filterChipText, filter === 'scores' && styles.filterChipTextActive]}>
            Scores & Buts
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, filter === 'fouls' && styles.filterChipActive]}
          onPress={() => setFilter('fouls')}
        >
          <Text style={styles.filterIcon}>⚠️</Text>
          <Text style={[styles.filterChipText, filter === 'fouls' && styles.filterChipTextActive]}>
            Fautes & Cartons
          </Text>
        </TouchableOpacity>
      </View>

      {/* Events Timeline */}
      <View style={styles.timelineList}>
        {filteredEvents.map((ev) => {
          const badge = getEventBadge(ev);
          const isTeamA = ev.team_side === 'team_a';
          const teamColor = isTeamA ? teamAColor : teamBColor;
          const teamName = isTeamA ? teamAName : teamBName;
          const periodLabel = getPeriodLabel(ev);

          // System Event Divider
          const isSystemEvent = ['period_started', 'period_ended', 'match_ended', 'match_paused', 'match_resumed'].includes(ev.type);

          if (isSystemEvent) {
            return (
              <View key={ev.id} style={styles.systemDividerRow}>
                <View style={styles.systemDividerLine} />
                <View style={[styles.systemBadge, { borderColor: badge.border, backgroundColor: badge.bg }]}>
                  <Text style={[styles.systemBadgeText, { color: badge.color }]}>
                    {badge.icon} {badge.text}
                  </Text>
                </View>
                <View style={styles.systemDividerLine} />
              </View>
            );
          }

          return (
            <View key={ev.id} style={[styles.eventItemRow, ev.is_cancelled && styles.eventCancelled]}>
              {/* Left Timeline Indicator */}
              <View style={styles.timelineCol}>
                <View style={[styles.timeBubble, { borderColor: teamColor + '60' }]}>
                  <Text style={[styles.quarterTag, { color: teamColor }]}>{periodLabel}</Text>
                  <Text style={styles.minuteTag}>{ev.minute ?? 0}'</Text>
                </View>
                <View style={styles.verticalTrack} />
              </View>

              {/* Event Card */}
              <View style={[styles.eventCard, { borderLeftColor: teamColor }]}>
                {/* Header row: Badge + Team Tag */}
                <View style={styles.cardTopRow}>
                  <View style={[styles.actionBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                    <Text style={styles.actionIcon}>{badge.icon}</Text>
                    <Text style={[styles.actionBadgeText, { color: badge.color }]}>{badge.text}</Text>
                  </View>

                  <View style={[styles.teamTag, { backgroundColor: teamColor + '18', borderColor: teamColor + '40' }]}>
                    <Text style={[styles.teamTagText, { color: teamColor }]} numberOfLines={1}>
                      {teamName}
                    </Text>
                  </View>
                </View>

                {/* Player details */}
                {ev.type === 'substitution' ? (
                  <View style={styles.playerDetailBox}>
                    <Text style={styles.subText}>
                      <Text style={styles.subIn}>▲ Entrée: </Text>
                      <Text style={styles.boldWhite}>{ev.sub_in_player?.username || 'Joueur'}</Text>
                    </Text>
                    <Text style={styles.subText}>
                      <Text style={styles.subOut}>▼ Sortie: </Text>
                      <Text style={styles.boldWhite}>{ev.sub_out_player?.username || 'Joueur'}</Text>
                    </Text>
                  </View>
                ) : ev.player ? (
                  <View style={styles.playerDetailBox}>
                    <Text style={styles.playerMainName}>
                      {ev.player.username}
                      {ev.related_player && (
                        <Text style={styles.assistText}> (Passe: {ev.related_player.username})</Text>
                      )}
                    </Text>
                  </View>
                ) : null}

                {/* Cancelled flag */}
                {ev.is_cancelled && (
                  <View style={styles.cancelledBadge}>
                    <Text style={styles.cancelledLabel}>[ACTION ANNULÉE]</Text>
                  </View>
                )}

                {/* Organizer Undo Button */}
                {isOrganizer && !ev.is_cancelled && onCancelEvent && (
                  <TouchableOpacity
                    style={styles.undoBtn}
                    onPress={() => handleConfirmCancel(ev.id)}
                    disabled={actionLoading}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.undoBtnText}>🗑️ Annuler l'action</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xs,
  },

  // Filters
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#0D1B2A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.25)',
  },
  filterIcon: {
    fontSize: 12,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  filterChipTextActive: {
    color: '#F8FAFC',
    fontWeight: '700',
  },

  // Timeline
  timelineList: {
    gap: 4,
  },
  eventItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  eventCancelled: {
    opacity: 0.4,
  },

  // Left Time Bubble
  timelineCol: {
    alignItems: 'center',
    width: 48,
  },
  timeBubble: {
    backgroundColor: '#0D1B2A',
    borderRadius: 10,
    borderWidth: 1.5,
    paddingVertical: 4,
    paddingHorizontal: 4,
    alignItems: 'center',
    width: 46,
    zIndex: 2,
  },
  quarterTag: {
    fontSize: 9,
    fontWeight: '900',
  },
  minuteTag: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 1,
  },
  verticalTrack: {
    width: 2,
    flex: 1,
    minHeight: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginTop: 4,
  },

  // Event Card
  eventCard: {
    flex: 1,
    backgroundColor: '#0D1B2A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderLeftWidth: 3.5,
    padding: 10,
    gap: 6,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  actionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  actionIcon: {
    fontSize: 11,
  },
  actionBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  teamTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    maxWidth: 120,
  },
  teamTagText: {
    fontSize: 9.5,
    fontWeight: '700',
  },

  // Player Details
  playerDetailBox: {
    paddingTop: 2,
  },
  playerMainName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  assistText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  subText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  subIn: {
    color: '#10B981',
    fontWeight: '700',
  },
  subOut: {
    color: '#EF4444',
    fontWeight: '700',
  },
  boldWhite: {
    color: '#F8FAFC',
    fontWeight: '700',
  },

  // Cancelled Status
  cancelledBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(239,68,68,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cancelledLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#EF4444',
  },

  // Undo Button
  undoBtn: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 4,
  },
  undoBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EF4444',
  },

  // System Divider
  systemDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    gap: 8,
  },
  systemDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  systemBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  systemBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // Empty State
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D1B2A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
});

