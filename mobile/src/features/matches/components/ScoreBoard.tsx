import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { shadows, spacing } from '../../../theme/spacing';
import { MatchTimer } from './MatchTimer';
import { PeriodScore, SetScore } from '../api/matchesApi';
import { getSportCategory, isSetSport as checkIsSetSport, formatPeriodLabel } from '../config/sportMatchConfig';

interface ScoreBoardProps {
  scoreTeamA: number;
  scoreTeamB: number;
  teamAName?: string;
  teamBName?: string;
  teamAColor?: string;
  teamBColor?: string;
  teamAFouls?: number;
  teamBFouls?: number;
  currentPeriod: number;
  totalPeriods: number;
  periodDurationSeconds?: number;
  periodElapsedSeconds?: number;
  lastResumedAt?: string | null;
  status: 'pending' | 'in_progress' | 'paused' | 'finished';
  sportSlug?: string;
  periodScores?: PeriodScore[];
  setScores?: SetScore[];
  setsWonA?: number;
  setsWonB?: number;
}

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  scoreTeamA,
  scoreTeamB,
  teamAName = 'Équipe A',
  teamBName = 'Équipe B',
  teamAColor = '#1456D9',
  teamBColor = '#F28B2E',
  teamAFouls = 0,
  teamBFouls = 0,
  currentPeriod = 1,
  totalPeriods: _totalPeriods = 4,
  periodDurationSeconds = 600,
  periodElapsedSeconds = 0,
  lastResumedAt = null,
  status = 'in_progress',
  sportSlug = 'basketball',
  periodScores = [],
  setScores = [],
  setsWonA = 0,
  setsWonB = 0,
}) => {
  const sportCategory = getSportCategory(sportSlug);
  const isSetSport = checkIsSetSport(sportSlug);
  const isBasketball = sportCategory === 'basketball' || sportCategory === 'basketball_3x3';
  const isFootball = sportCategory === 'football';
  const isPaused = status === 'paused';
  const isFinished = status === 'finished';
  const isPending = status === 'pending';

  // Pulsing animation for LIVE dot
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (status === 'in_progress') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status]);

  const getSportEmoji = () => {
    switch (sportCategory) {
      case 'football': return '⚽';
      case 'basketball': return '🏀';
      case 'basketball_3x3': return '🏀';
      case 'volleyball': return '🏐';
      case 'table_tennis': return '🏓';
      default: return '🏅';
    }
  };

  const getPeriodLabel = () => formatPeriodLabel(sportCategory, currentPeriod).toUpperCase();

  // Determine which team is "winning" for visual cue
  const aScore = isSetSport ? setsWonA : scoreTeamA;
  const bScore = isSetSport ? setsWonB : scoreTeamB;
  const aLeading = aScore > bScore;
  const bLeading = bScore > aScore;

  return (
    <View style={styles.card}>
      {/* ── Gradient Header Strip ─────────────────────────────────── */}
      <View style={styles.headerStrip}>
        <View style={styles.headerLeft}>
          <Text style={styles.sportEmoji}>{getSportEmoji()}</Text>
          <View style={styles.periodBadge}>
            <Text style={styles.periodBadgeText}>{getPeriodLabel()}</Text>
          </View>
        </View>

        {/* LIVE / STATUS Indicator */}
        <View style={[
          styles.statusPill,
          isFinished ? styles.pillFinished : isPaused ? styles.pillPaused : isPending ? styles.pillPending : styles.pillLive
        ]}>
          {status === 'in_progress' && (
            <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
          )}
          {status !== 'in_progress' && (
            <View style={[
              styles.liveDot,
              isFinished ? styles.dotFinished : isPaused ? styles.dotPaused : styles.dotPending
            ]} />
          )}
          <Text style={[
            styles.statusPillText,
            isFinished ? styles.statusTextFinished : isPaused ? styles.statusTextPaused : isPending ? styles.statusTextPending : styles.statusTextLive
          ]}>
            {isFinished ? 'TERMINÉ' : isPaused ? 'PAUSE' : isPending ? 'À VENIR' : 'EN DIRECT'}
          </Text>
        </View>

        {/* Timer */}
        <View style={styles.timerBox}>
          <MatchTimer
            initialSeconds={periodElapsedSeconds}
            periodDurationSeconds={periodDurationSeconds}
            lastResumedAt={lastResumedAt}
            isPaused={isPaused || isFinished || isPending}
            countdown={isBasketball}
          />
        </View>
      </View>

      {/* ── Main Score Arena ──────────────────────────────────────── */}
      <View style={styles.scoreArena}>

        {/* Team A */}
        <View style={styles.teamBlock}>
          <View style={[styles.teamAvatarRing, { borderColor: teamAColor, shadowColor: teamAColor }]}>
            <View style={[styles.teamAvatarInner, { backgroundColor: teamAColor + '22' }]}>
              <Text style={[styles.teamAvatarText, { color: teamAColor }]}>{getInitials(teamAName)}</Text>
            </View>
          </View>
          <Text style={styles.teamName} numberOfLines={2}>{teamAName}</Text>
          {aLeading && !isFinished && (
            <View style={[styles.leadBadge, { backgroundColor: teamAColor + '25', borderColor: teamAColor }]}>
              <Text style={[styles.leadText, { color: teamAColor }]}>MÈNE</Text>
            </View>
          )}
          {isFinished && aLeading && (
            <View style={[styles.leadBadge, { backgroundColor: '#F59E0B22', borderColor: '#F59E0B' }]}>
              <Text style={[styles.leadText, { color: '#F59E0B' }]}>🏆 GAGNANT</Text>
            </View>
          )}
          {/* Basketball fouls */}
          {isBasketball && (
            <View style={[styles.foulBubble, teamAFouls >= 5 && styles.foulBubbleDanger]}>
              <Text style={[styles.foulBubbleVal, teamAFouls >= 5 && styles.foulBubbleValDanger]}>
                {teamAFouls}
              </Text>
              <Text style={styles.foulBubbleLabel}>FAUTES</Text>
            </View>
          )}
          {/* Football cards */}
        </View>

        {/* Center Score Display */}
        <View style={styles.centerScore}>
          {isSetSport ? (
            /* Sets Score */
            <View style={styles.setsScoreBlock}>
              <View style={styles.setsMainRow}>
                <Text style={[styles.setsMainNum, { color: teamAColor }]}>{setsWonA}</Text>
                <Text style={styles.setsDash}>–</Text>
                <Text style={[styles.setsMainNum, { color: teamBColor }]}>{setsWonB}</Text>
              </View>
              <Text style={styles.setsLabel}>SETS</Text>
              <View style={styles.currentSetScoreRow}>
                <Text style={[styles.currentSetPts, { color: teamAColor }]}>{scoreTeamA}</Text>
                <Text style={styles.currentSetSep}> : </Text>
                <Text style={[styles.currentSetPts, { color: teamBColor }]}>{scoreTeamB}</Text>
              </View>
              <Text style={styles.currentSetLabel}>Points du Set en cours</Text>
            </View>
          ) : (
            /* Regular Score */
            <View style={styles.regularScoreBlock}>
              <Text style={[styles.bigScoreA, { color: teamAColor }]}>{scoreTeamA}</Text>
              <Text style={styles.scoreSeparator}>:</Text>
              <Text style={[styles.bigScoreB, { color: teamBColor }]}>{scoreTeamB}</Text>
            </View>
          )}

          {/* 3x3 target score indicator */}
          {sportCategory === 'basketball_3x3' && (
            <View style={styles.targetIndicator}>
              <Text style={styles.targetText}>OBJECTIF: 21</Text>
              {/* Progress bars */}
              <View style={styles.targetBars}>
                <View style={styles.targetBarTrack}>
                  <View style={[styles.targetBarFill, {
                    width: `${Math.min(100, (scoreTeamA / 21) * 100)}%`,
                    backgroundColor: teamAColor
                  }]} />
                </View>
                <View style={styles.targetBarTrack}>
                  <View style={[styles.targetBarFill, {
                    width: `${Math.min(100, (scoreTeamB / 21) * 100)}%`,
                    backgroundColor: teamBColor
                  }]} />
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Team B */}
        <View style={styles.teamBlock}>
          <View style={[styles.teamAvatarRing, { borderColor: teamBColor, shadowColor: teamBColor }]}>
            <View style={[styles.teamAvatarInner, { backgroundColor: teamBColor + '22' }]}>
              <Text style={[styles.teamAvatarText, { color: teamBColor }]}>{getInitials(teamBName)}</Text>
            </View>
          </View>
          <Text style={styles.teamName} numberOfLines={2}>{teamBName}</Text>
          {bLeading && !isFinished && (
            <View style={[styles.leadBadge, { backgroundColor: teamBColor + '25', borderColor: teamBColor }]}>
              <Text style={[styles.leadText, { color: teamBColor }]}>MÈNE</Text>
            </View>
          )}
          {isFinished && bLeading && (
            <View style={[styles.leadBadge, { backgroundColor: '#F59E0B22', borderColor: '#F59E0B' }]}>
              <Text style={[styles.leadText, { color: '#F59E0B' }]}>🏆 GAGNANT</Text>
            </View>
          )}
          {isBasketball && (
            <View style={[styles.foulBubble, teamBFouls >= 5 && styles.foulBubbleDanger]}>
              <Text style={[styles.foulBubbleVal, teamBFouls >= 5 && styles.foulBubbleValDanger]}>
                {teamBFouls}
              </Text>
              <Text style={styles.foulBubbleLabel}>FAUTES</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Period / Quarter Breakdown Table ─────────────────────── */}
      {isBasketball && periodScores && periodScores.length > 0 && (
        <View style={styles.breakdownTable}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.tableTeamHeader]}>ÉQUIPE</Text>
            {periodScores.slice(0, 6).map((p) => (
              <Text key={`h_${p.period}`} style={styles.tableHeaderCell}>
                {p.period <= 4 ? `Q${p.period}` : 'OT'}
              </Text>
            ))}
            <Text style={[styles.tableHeaderCell, styles.tableHeaderTotal]}>TOT</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.tableTeamCell]} numberOfLines={1}>{teamAName}</Text>
            {periodScores.slice(0, 6).map((p) => (
              <Text key={`a_${p.period}`} style={[styles.tableCell, p.team_a > p.team_b ? styles.cellWin : null]}>
                {p.team_a}
              </Text>
            ))}
            <Text style={[styles.tableCell, styles.tableTotalCell]}>{scoreTeamA}</Text>
          </View>
          <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.tableCell, styles.tableTeamCell]} numberOfLines={1}>{teamBName}</Text>
            {periodScores.slice(0, 6).map((p) => (
              <Text key={`b_${p.period}`} style={[styles.tableCell, p.team_b > p.team_a ? styles.cellWin : null]}>
                {p.team_b}
              </Text>
            ))}
            <Text style={[styles.tableCell, styles.tableTotalCell]}>{scoreTeamB}</Text>
          </View>
        </View>
      )}

      {/* ── Football mini period score ──────────────────────────── */}
      {isFootball && periodScores && periodScores.length > 0 && (
        <View style={styles.breakdownTable}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.tableTeamHeader]}>ÉQUIPE</Text>
            {periodScores.map((p) => (
              <Text key={`h_ft_${p.period}`} style={styles.tableHeaderCell}>
                {p.period === 1 ? 'MT1' : p.period === 2 ? 'MT2' : `P${p.period}`}
              </Text>
            ))}
            <Text style={[styles.tableHeaderCell, styles.tableHeaderTotal]}>TOT</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.tableTeamCell]} numberOfLines={1}>{teamAName}</Text>
            {periodScores.map((p) => <Text key={`aft_${p.period}`} style={styles.tableCell}>{p.team_a}</Text>)}
            <Text style={[styles.tableCell, styles.tableTotalCell]}>{scoreTeamA}</Text>
          </View>
          <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.tableCell, styles.tableTeamCell]} numberOfLines={1}>{teamBName}</Text>
            {periodScores.map((p) => <Text key={`bft_${p.period}`} style={styles.tableCell}>{p.team_b}</Text>)}
            <Text style={[styles.tableCell, styles.tableTotalCell]}>{scoreTeamB}</Text>
          </View>
        </View>
      )}

      {/* ── Sets History (Volleyball / TT) ────────────────────── */}
      {isSetSport && setScores && setScores.length > 0 && (
        <View style={styles.setsHistoryBar}>
          {setScores.map((s) => {
            const aWon = s.scoreA > s.scoreB;
            return (
              <View key={s.setNumber} style={styles.setChip}>
                <Text style={styles.setChipNum}>S{s.setNumber}</Text>
                <Text style={[styles.setChipScore, aWon ? { color: teamAColor } : { color: teamBColor }]}>
                  {s.scoreA}–{s.scoreB}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#07111E',
    borderRadius: 20,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    ...shadows.card,
  },

  // Header Strip
  headerStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  sportEmoji: { fontSize: 16 },
  periodBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  periodBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#CBD5E1',
    letterSpacing: 0.8,
  },

  // Status
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
  },
  pillLive: { backgroundColor: 'rgba(239,68,68,0.18)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)' },
  pillPaused: { backgroundColor: 'rgba(245,158,11,0.18)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.4)' },
  pillFinished: { backgroundColor: 'rgba(100,116,139,0.18)', borderWidth: 1, borderColor: 'rgba(100,116,139,0.4)' },
  pillPending: { backgroundColor: 'rgba(59,130,246,0.18)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.4)' },
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#EF4444' },
  dotPaused: { backgroundColor: '#F59E0B' },
  dotFinished: { backgroundColor: '#94A3B8' },
  dotPending: { backgroundColor: '#3B82F6' },
  statusPillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  statusTextLive: { color: '#EF4444' },
  statusTextPaused: { color: '#F59E0B' },
  statusTextFinished: { color: '#94A3B8' },
  statusTextPending: { color: '#3B82F6' },

  // Timer
  timerBox: {
    backgroundColor: 'rgba(0,230,118,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },

  // Score Arena
  scoreArena: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  teamBlock: {
    flex: 1.1,
    alignItems: 'center',
    gap: 6,
  },
  teamAvatarRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    elevation: 4,
  },
  teamAvatarInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamAvatarText: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  teamName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E2E8F0',
    textAlign: 'center',
    maxWidth: 90,
    lineHeight: 15,
  },
  leadBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    borderWidth: 1,
  },
  leadText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  foulBubble: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  foulBubbleDanger: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderColor: 'rgba(239,68,68,0.4)',
  },
  foulBubbleVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#CBD5E1',
    lineHeight: 18,
  },
  foulBubbleValDanger: {
    color: '#EF4444',
  },
  foulBubbleLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },

  // Center Score
  centerScore: {
    flex: 2,
    alignItems: 'center',
  },
  regularScoreBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bigScoreA: {
    fontSize: 52,
    fontWeight: '900',
    lineHeight: 58,
    fontVariant: ['tabular-nums'],
  },
  scoreSeparator: {
    fontSize: 36,
    fontWeight: '300',
    color: '#334155',
    lineHeight: 58,
  },
  bigScoreB: {
    fontSize: 52,
    fontWeight: '900',
    lineHeight: 58,
    fontVariant: ['tabular-nums'],
  },

  // Sets Score
  setsScoreBlock: { alignItems: 'center' },
  setsMainRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  setsMainNum: { fontSize: 44, fontWeight: '900', lineHeight: 50 },
  setsDash: { fontSize: 32, fontWeight: '300', color: '#334155' },
  setsLabel: { fontSize: 9, fontWeight: '800', color: '#64748B', letterSpacing: 1.5, marginTop: -4 },
  currentSetScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 8,
  },
  currentSetPts: { fontSize: 20, fontWeight: '800' },
  currentSetSep: { fontSize: 16, fontWeight: '300', color: '#475569' },
  currentSetLabel: { fontSize: 9, fontWeight: '600', color: '#475569', marginTop: 3, letterSpacing: 0.5 },

  // 3x3 target
  targetIndicator: { marginTop: 8, width: '100%', alignItems: 'center' },
  targetText: { fontSize: 9, fontWeight: '700', color: '#64748B', letterSpacing: 1, marginBottom: 4 },
  targetBars: { width: '80%', gap: 3 },
  targetBarTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2 },
  targetBarFill: { height: '100%', borderRadius: 2, minWidth: 4 },

  // Breakdown Table
  breakdownTable: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  tableCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  tableTeamHeader: {
    flex: 2,
    textAlign: 'left',
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  tableHeaderCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  tableHeaderTotal: { color: '#38BDF8', fontWeight: '900' },
  tableTeamCell: { flex: 2, textAlign: 'left', fontSize: 11, fontWeight: '700', color: '#E2E8F0' },
  tableTotalCell: { fontWeight: '900', color: '#38BDF8' },
  cellWin: { fontWeight: '900', color: '#34D399' },

  // Sets History
  setsHistoryBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    justifyContent: 'center',
  },
  setChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  setChipNum: { fontSize: 10, fontWeight: '800', color: '#64748B' },
  setChipScore: { fontSize: 11, fontWeight: '800' },
});
