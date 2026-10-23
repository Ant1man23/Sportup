import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Trophy, Crown, Swords, Sparkles, CheckCircle2 } from 'lucide-react-native';
import { colors } from '../../../theme/colors';
import { radius, shadows, spacing } from '../../../theme/spacing';
import { TournamentMatch, TournamentStage } from '../../../types';

interface TournamentBracketProps {
  matches: TournamentMatch[];
  onMatchPress?: (matchId: number) => void;
}

interface StageColumn {
  key: TournamentStage;
  title: string;
  subtitle: string;
  matches: TournamentMatch[];
}

export const TournamentBracket: React.FC<TournamentBracketProps> = ({
  matches = [],
  onMatchPress,
}) => {
  // Group matches by knockout stages
  const roundOf16 = matches.filter((m) => m.stage === 'round_of_16');
  const quarters = matches.filter((m) => m.stage === 'quarter');
  const semis = matches.filter((m) => m.stage === 'semi');
  const finals = matches.filter((m) => m.stage === 'final');

  // Find champion if final is finished
  const finalMatch = finals[0];
  let championTeam: { id?: number; name: string } | null = null;
  if (finalMatch && finalMatch.status === 'finished') {
    if ((finalMatch.score_team_a ?? 0) > (finalMatch.score_team_b ?? 0)) {
      championTeam = finalMatch.team_a || { name: 'Équipe A' };
    } else if ((finalMatch.score_team_b ?? 0) > (finalMatch.score_team_a ?? 0)) {
      championTeam = finalMatch.team_b || { name: 'Équipe B' };
    }
  }

  // Construct active stages
  const stages: StageColumn[] = [];
  if (roundOf16.length > 0) {
    stages.push({
      key: 'round_of_16',
      title: '1/8 Finales',
      subtitle: `${roundOf16.length} duels`,
      matches: roundOf16,
    });
  }
  if (quarters.length > 0 || stages.length > 0) {
    stages.push({
      key: 'quarter',
      title: '1/4 Finales',
      subtitle: `${quarters.length} duels`,
      matches: quarters,
    });
  }
  if (semis.length > 0 || stages.length > 0) {
    stages.push({
      key: 'semi',
      title: '1/2 Finales',
      subtitle: `${semis.length} duels`,
      matches: semis,
    });
  }
  stages.push({
    key: 'final',
    title: 'Grande Finale',
    subtitle: 'Match pour le titre',
    matches: finals,
  });

  if (matches.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Swords size={38} color={colors.muted} />
        <Text style={styles.emptyTitle}>Tableau non généré</Text>
        <Text style={styles.emptySubtitle}>
          L'arbre des phases finales apparaîtra ici dès le tirage au sort des éliminatoires.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContainer}
    >
      {stages.map((stage) => {
        const isFinalStage = stage.key === 'final';

        return (
          <View key={stage.key} style={styles.stageColumn}>
            {/* Stage Header */}
            <View style={[styles.stageHeaderBox, isFinalStage && styles.stageHeaderFinal]}>
              <Text style={[styles.stageHeaderTitle, isFinalStage && styles.stageTitleFinal]}>
                {stage.title}
              </Text>
              <Text style={styles.stageHeaderSubtitle}>{stage.subtitle}</Text>
            </View>

            {/* Matches List in Column */}
            <View style={styles.matchesColumnList}>
              {stage.matches.length === 0 ? (
                <View style={styles.placeholderMatchCard}>
                  <Text style={styles.placeholderText}>En attente des qualifiés...</Text>
                </View>
              ) : (
                stage.matches.map((m, matchIdx) => {
                  const isFinished = m.status === 'finished';
                  const isLive = m.status === 'in_progress';
                  const teamAWon = isFinished && (m.score_team_a ?? 0) > (m.score_team_b ?? 0);
                  const teamBWon = isFinished && (m.score_team_b ?? 0) > (m.score_team_a ?? 0);

                  return (
                    <TouchableOpacity
                      key={m.id || matchIdx}
                      style={[
                        styles.matchCard,
                        isFinalStage && styles.finalMatchCard,
                        isLive && styles.liveMatchCard,
                      ]}
                      onPress={() => onMatchPress && onMatchPress(m.id)}
                      activeOpacity={0.85}
                    >
                      {/* Match Header Tag */}
                      <View style={styles.cardHeaderRow}>
                        <Text style={styles.matchNumberText}>M{matchIdx + 1}</Text>
                        {isLive ? (
                          <View style={styles.liveBadge}>
                            <View style={styles.livePulseDot} />
                            <Text style={styles.liveBadgeText}>EN DIRECT</Text>
                          </View>
                        ) : isFinished ? (
                          <View style={styles.finishedBadge}>
                            <CheckCircle2 size={11} color="#16A34A" />
                            <Text style={styles.finishedBadgeText}>Terminé</Text>
                          </View>
                        ) : (
                          <Text style={styles.pendingBadgeText}>À venir</Text>
                        )}
                      </View>

                      {/* Team A Row */}
                      <View style={[styles.teamSlot, teamAWon && styles.winnerSlot]}>
                        <View style={styles.teamInfoRow}>
                          <View style={[styles.teamDot, teamAWon && styles.teamDotWon]}>
                            <Text style={[styles.teamDotText, teamAWon && { color: '#16A34A' }]}>
                              {m.team_a?.name ? m.team_a.name.substring(0, 2).toUpperCase() : 'A'}
                            </Text>
                          </View>
                          <Text
                            style={[styles.teamNameText, teamAWon && styles.winnerTeamText]}
                            numberOfLines={1}
                          >
                            {m.team_a?.name || 'À déterminer'}
                          </Text>
                          {teamAWon && <Crown size={12} color="#F59E0B" style={{ marginLeft: 4 }} />}
                        </View>
                        <Text style={[styles.teamScoreText, teamAWon && styles.winnerScoreText]}>
                          {isFinished || isLive ? m.score_team_a : '-'}
                        </Text>
                      </View>

                      {/* Divider */}
                      <View style={styles.matchSlotDivider} />

                      {/* Team B Row */}
                      <View style={[styles.teamSlot, teamBWon && styles.winnerSlot]}>
                        <View style={styles.teamInfoRow}>
                          <View style={[styles.teamDot, teamBWon && styles.teamDotWon]}>
                            <Text style={[styles.teamDotText, teamBWon && { color: '#16A34A' }]}>
                              {m.team_b?.name ? m.team_b.name.substring(0, 2).toUpperCase() : 'B'}
                            </Text>
                          </View>
                          <Text
                            style={[styles.teamNameText, teamBWon && styles.winnerTeamText]}
                            numberOfLines={1}
                          >
                            {m.team_b?.name || 'À déterminer'}
                          </Text>
                          {teamBWon && <Crown size={12} color="#F59E0B" style={{ marginLeft: 4 }} />}
                        </View>
                        <Text style={[styles.teamScoreText, teamBWon && styles.winnerScoreText]}>
                          {isFinished || isLive ? m.score_team_b : '-'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </View>
        );
      })}

      {/* Champion Column */}
      <View style={[styles.stageColumn, { width: 200 }]}>
        <View style={[styles.stageHeaderBox, styles.championHeaderBox]}>
          <Text style={styles.championHeaderTitle}>CHAMPION</Text>
          <Text style={styles.stageHeaderSubtitle}>Vainqueur du trophée</Text>
        </View>

        <View style={styles.championCard}>
          <View style={styles.trophyCircle}>
            <Trophy size={36} color="#F59E0B" />
          </View>
          {championTeam ? (
            <>
              <View style={styles.championBadge}>
                <Sparkles size={12} color="#F59E0B" />
                <Text style={styles.championBadgeText}>VAINQUEUR 2026</Text>
              </View>
              <Text style={styles.championName} numberOfLines={2}>
                {championTeam.name}
              </Text>
              <Text style={styles.championSub}>Médaille d'or & Trophée</Text>
            </>
          ) : (
            <>
              <Text style={styles.championPendingTitle}>En attente de la Finale</Text>
              <Text style={styles.championPendingSub}>Le trophée sera remis après le dernier match</Text>
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.lg,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginVertical: spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.navy,
    marginTop: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    maxWidth: 280,
  },
  stageColumn: {
    width: 240,
  },
  stageHeaderBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
  },
  stageHeaderFinal: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  stageHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.navy,
    letterSpacing: 0.3,
  },
  stageTitleFinal: {
    color: '#D97706',
  },
  stageHeaderSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.muted,
    marginTop: 1,
  },
  matchesColumnList: {
    gap: spacing.md,
    justifyContent: 'space-around',
    flex: 1,
  },
  matchCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.sm,
    ...shadows.card,
  },
  finalMatchCard: {
    borderColor: '#F59E0B',
    borderWidth: 2,
    backgroundColor: '#FFFDF7',
  },
  liveMatchCard: {
    borderColor: '#EF4444',
    borderWidth: 2,
  },
  placeholderMatchCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    minHeight: 90,
  },
  placeholderText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  matchNumberText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.muted,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    gap: 4,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC2626',
  },
  liveBadgeText: {
    color: '#DC2626',
    fontSize: 9,
    fontWeight: '800',
  },
  finishedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    gap: 4,
  },
  finishedBadgeText: {
    color: '#16A34A',
    fontSize: 9,
    fontWeight: '700',
  },
  pendingBadgeText: {
    fontSize: 10,
    color: colors.muted,
    fontWeight: '600',
  },
  teamSlot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: radius.sm,
  },
  winnerSlot: {
    backgroundColor: '#F0FDF4',
  },
  teamInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  teamDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  teamDotWon: {
    backgroundColor: '#DCFCE7',
  },
  teamDotText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.text,
  },
  teamNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  winnerTeamText: {
    color: '#15803D',
    fontWeight: '900',
  },
  teamScoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.muted,
    marginLeft: 6,
  },
  winnerScoreText: {
    color: '#15803D',
    fontWeight: '900',
  },
  matchSlotDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 2,
  },

  championHeaderBox: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  championHeaderTitle: {
    color: '#B45309',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  championCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#F59E0B',
    minHeight: 180,
    ...shadows.card,
  },
  trophyCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  championBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    gap: 4,
    marginBottom: 4,
  },
  championBadgeText: {
    color: '#B45309',
    fontSize: 10,
    fontWeight: '800',
  },
  championName: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.navy,
    textAlign: 'center',
    marginBottom: 2,
  },
  championSub: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '600',
    textAlign: 'center',
  },
  championPendingTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.muted,
    textAlign: 'center',
    marginTop: 4,
  },
  championPendingSub: {
    fontSize: 10,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 14,
  },
});
