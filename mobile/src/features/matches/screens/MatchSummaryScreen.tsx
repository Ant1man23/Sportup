import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { colors } from '../../../theme/colors';
import { radius, shadows, spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';
import { Button } from '../../../components/Button';
import { Match, matchesApi, MatchStatisticsResponse } from '../api/matchesApi';
import { TeamStatisticsTab } from '../components/TeamStatisticsTab';
import { PlayerBoxscoreTab } from '../components/PlayerBoxscoreTab';
import { PlayByPlayTab } from '../components/PlayByPlayTab';

interface MatchSummaryScreenProps {
  matchId: number;
  onNavigateHome: () => void;
  onNavigateStats: () => void;
  onNavigateBack?: () => void;
}

type SummaryTab = 'overview' | 'team_stats' | 'players';

export const MatchSummaryScreen: React.FC<MatchSummaryScreenProps> = ({
  matchId,
  onNavigateHome,
  onNavigateStats,
  onNavigateBack,
}) => {
  const [match, setMatch] = useState<Match | null>(null);
  const [statistics, setStatistics] = useState<MatchStatisticsResponse | null>(null);
  const [activeTab, setActiveTab] = useState<SummaryTab>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      matchesApi.getMatchDetails(matchId),
      matchesApi.getMatchStatistics(matchId).catch(() => null),
    ])
      .then(([m, s]) => {
        setMatch(m);
        if (s) setStatistics(s);
      })
      .finally(() => setLoading(false));
  }, [matchId]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const teamAName = match?.team_a_name || 'Équipe A';
  const teamBName = match?.team_b_name || 'Équipe B';
  const teamAColor = match?.team_a_color || '#1456D9';
  const teamBColor = match?.team_b_color || '#F28B2E';

  return (
    <View style={styles.container}>
      <View style={styles.topNavRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onNavigateBack || onNavigateHome}
          activeOpacity={0.7}
        >
          <ChevronLeft size={20} color={colors.navy} strokeWidth={2.4} />
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
        <Text style={styles.topNavTitle}>Récapitulatif du match</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Header Banner */}
        <View style={styles.headerCard}>
        <Text style={styles.headerTag}>MATCH TERMINÉ</Text>

        <View style={styles.scoreRow}>
          <Text style={styles.teamName}>{teamAName}</Text>
          <Text style={styles.scoreText}>
            {match?.score_team_a} - {match?.score_team_b}
          </Text>
          <Text style={styles.teamName}>{teamBName}</Text>
        </View>

        <Text style={styles.metaText}>
          Durée totale : {Math.floor((match?.elapsed_seconds || 0) / 60)} min · {match?.total_periods} périodes
        </Text>
      </View>

      {/* Segmented Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'overview' && styles.tabBtnActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'overview' && styles.tabBtnTextActive]}>
            Résumé
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'team_stats' && styles.tabBtnActive]}
          onPress={() => setActiveTab('team_stats')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'team_stats' && styles.tabBtnTextActive]}>
            Stats Équipes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'players' && styles.tabBtnActive]}
          onPress={() => setActiveTab('players')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'players' && styles.tabBtnTextActive]}>
            Fiches Joueurs
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <View>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Fil des Événements</Text>
            <PlayByPlayTab
              events={match?.events || []}
              teamAName={teamAName}
              teamBName={teamBName}
              teamAColor={teamAColor}
              teamBColor={teamBColor}
              isOrganizer={false}
            />
          </View>
        </View>
      )}

      {/* Tab 2: Team Stats */}
      {activeTab === 'team_stats' && (
        <TeamStatisticsTab
          teamAStats={statistics?.collective.team_a}
          teamBStats={statistics?.collective.team_b}
          teamAName={teamAName}
          teamBName={teamBName}
          teamAColor={teamAColor}
          teamBColor={teamBColor}
          periodScores={statistics?.period_scores || []}
        />
      )}

      {/* Tab 3: Player Boxscores */}
      {activeTab === 'players' && (
        <PlayerBoxscoreTab
          playersA={statistics?.players.team_a || []}
          playersB={statistics?.players.team_b || []}
          teamAName={teamAName}
          teamBName={teamBName}
          teamAColor={teamAColor}
          teamBColor={teamBColor}
        />
      )}

      {/* Navigation Buttons */}
      <View style={styles.actions}>
        <Button
          title="Consulter mes statistiques"
          onPress={onNavigateStats}
          size="lg"
          style={styles.btn}
        />
        <Button
          title="Retour à l'accueil"
          variant="secondary"
          onPress={onNavigateHome}
          size="lg"
          style={styles.btn}
        />
      </View>
    </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#EEF2F6',
    borderRadius: radius.pill,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
    marginLeft: 3,
  },
  topNavTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.navy,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  headerCard: {
    backgroundColor: colors.navy,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.card,
  },
  headerTag: {
    ...typography.overline,
    color: colors.success,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: spacing.sm,
  },
  teamName: {
    ...typography.h2,
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
  },
  scoreText: {
    ...typography.display,
    fontSize: 40,
    color: '#FFFFFF',
    fontWeight: '800',
    marginHorizontal: spacing.md,
    fontFamily: 'monospace',
  },
  metaText: {
    ...typography.caption,
    color: colors.primarySoft,
    marginTop: spacing.sm,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    padding: 3,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {
    backgroundColor: colors.navy,
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.md,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  btn: {
    width: '100%',
  },
});
