import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { radius, shadows, spacing } from '../../../theme/spacing';
import { SetScore } from '../api/matchesApi';
import { Trophy, Flame, ChevronRight, Award } from 'lucide-react-native';

interface SetsScoreBoardProps {
  scoreTeamA: number; // Points in current set
  scoreTeamB: number; // Points in current set
  setsWonA: number;
  setsWonB: number;
  currentSet: number;
  maxSets?: number; // e.g. 3 (best of 5) or 2 (best of 3)
  sportSlug: 'volleyball' | 'table-tennis' | string;
  teamAName?: string;
  teamBName?: string;
  teamAColor?: string;
  teamBColor?: string;
  status: 'pending' | 'in_progress' | 'paused' | 'finished';
  setScores?: SetScore[];
  onTriggerNextSet?: () => void;
  isOrganizer?: boolean;
}

export const SetsScoreBoard: React.FC<SetsScoreBoardProps> = ({
  scoreTeamA,
  scoreTeamB,
  setsWonA = 0,
  setsWonB = 0,
  currentSet = 1,
  maxSets = 3,
  sportSlug,
  teamAName = 'Équipe A',
  teamBName = 'Équipe B',
  teamAColor = '#9C27B0',
  teamBColor = '#F28B2E',
  status = 'in_progress',
  setScores = [],
  onTriggerNextSet,
  isOrganizer = false,
}) => {
  const isVolleyball = sportSlug === 'volleyball';
  const isTableTennis = sportSlug === 'table-tennis';
  const isFinished = status === 'finished';
  const isPaused = status === 'paused';

  // Target points per set
  const isTieBreak = isVolleyball && currentSet === 5;
  const setTargetPoints = isTableTennis ? 11 : isTieBreak ? 15 : 25;

  // Set Point & Match Point detection
  const diff = scoreTeamA - scoreTeamB;
  const isTeamASetPoint = scoreTeamA >= setTargetPoints - 1 && diff >= 1;
  const isTeamBSetPoint = scoreTeamB >= setTargetPoints - 1 && diff <= -1;

  const isTeamAMatchPoint = isTeamASetPoint && setsWonA === maxSets - 1;
  const isTeamBMatchPoint = isTeamBSetPoint && setsWonB === maxSets - 1;

  // Set won condition (target reached with >= 2 points diff)
  const isTeamASetWon = scoreTeamA >= setTargetPoints && diff >= 2;
  const isTeamBSetWon = scoreTeamB >= setTargetPoints && -diff >= 2;

  const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <View style={styles.card}>
      {/* ─── Top Header: Discipline & Set Number ──────────────────────────────── */}
      <View style={styles.topBar}>
        <View style={styles.badgeRow}>
          <View style={styles.sportBadge}>
            <Text style={styles.sportBadgeText}>
              {isVolleyball ? 'VOLLEYBALL' : isTableTennis ? 'TENNIS DE TABLE' : 'MATCH EN SETS'}
            </Text>
          </View>
          <View style={styles.setNumberBadge}>
            <Text style={styles.setNumberBadgeText}>
              SET {currentSet} {isTieBreak ? '(TIE-BREAK)' : ''}
            </Text>
          </View>
        </View>

        <View style={[
          styles.statusBadge,
          isFinished ? styles.statusFinished : isPaused ? styles.statusPaused : styles.statusLive
        ]}>
          <View style={[
            styles.statusDot,
            isFinished ? styles.dotFinished : isPaused ? styles.dotPaused : styles.dotLive
          ]} />
          <Text style={[
            styles.statusText,
            isFinished ? styles.textFinished : isPaused ? styles.textPaused : styles.textLive
          ]}>
            {isFinished ? 'TERMINÉ' : isPaused ? 'PAUSE' : 'EN DIRECT'}
          </Text>
        </View>
      </View>

      {/* ─── Sets Won Overview (Grand score de sets) ─────────────────────────── */}
      <View style={styles.setsWonContainer}>
        <Text style={styles.setsWonTitle}>SETS GAGNÉS (PREMIER À {maxSets})</Text>
        <View style={styles.setsWonRow}>
          {/* Team A Sets Pills */}
          <View style={styles.setPillsRow}>
            {Array.from({ length: maxSets }).map((_, i) => (
              <View
                key={`pill_a_${i}`}
                style={[
                  styles.setPill,
                  i < setsWonA && { backgroundColor: teamAColor, borderColor: teamAColor },
                ]}
              />
            ))}
          </View>

          <View style={styles.setsDigitBox}>
            <Text style={[styles.setsDigit, { color: teamAColor }]}>{setsWonA}</Text>
            <Text style={styles.setsDigitSeparator}>-</Text>
            <Text style={[styles.setsDigit, { color: teamBColor }]}>{setsWonB}</Text>
          </View>

          {/* Team B Sets Pills */}
          <View style={styles.setPillsRow}>
            {Array.from({ length: maxSets }).map((_, i) => (
              <View
                key={`pill_b_${i}`}
                style={[
                  styles.setPill,
                  i < setsWonB && { backgroundColor: teamBColor, borderColor: teamBColor },
                ]}
              />
            ))}
          </View>
        </View>
      </View>

      {/* ─── Current Set Points (Scoreboard Principal) ────────────────────────── */}
      <View style={styles.currentSetScoreBoard}>
        {/* Team A Points */}
        <View style={styles.teamScoreCol}>
          <View style={[styles.avatarCircle, { borderColor: teamAColor }]}>
            <Text style={[styles.avatarText, { color: teamAColor }]}>
              {getInitials(teamAName)}
            </Text>
          </View>
          <Text style={styles.teamName} numberOfLines={1}>{teamAName}</Text>
          <Text style={[styles.pointsDisplay, { color: teamAColor }]}>
            {scoreTeamA}
          </Text>
          <Text style={styles.pointsLabel}>POINTS DU SET</Text>
        </View>

        {/* Center VS & Set Target */}
        <View style={styles.centerBlock}>
          <View style={styles.targetBadge}>
            <Text style={styles.targetBadgeText}>OBJECTIF</Text>
            <Text style={styles.targetBadgeValue}>{setTargetPoints} PTS</Text>
            <Text style={styles.targetBadgeSub}>(Écart 2 pts)</Text>
          </View>

          {/* Set / Match Point Alert */}
          {(isTeamAMatchPoint || isTeamBMatchPoint) ? (
            <View style={[styles.alertBanner, styles.alertMatchPoint]}>
              <Flame size={12} color="#EF4444" style={{ marginRight: 4 }} />
              <Text style={styles.alertTextMatchPoint}>
                BALLE DE MATCH {isTeamAMatchPoint ? teamAName : teamBName}
              </Text>
            </View>
          ) : (isTeamASetPoint || isTeamBSetPoint) ? (
            <View style={[styles.alertBanner, styles.alertSetPoint]}>
              <Award size={12} color="#F59E0B" style={{ marginRight: 4 }} />
              <Text style={styles.alertTextSetPoint}>
                BALLE DE SET {isTeamASetPoint ? teamAName : teamBName}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Team B Points */}
        <View style={styles.teamScoreCol}>
          <View style={[styles.avatarCircle, { borderColor: teamBColor }]}>
            <Text style={[styles.avatarText, { color: teamBColor }]}>
              {getInitials(teamBName)}
            </Text>
          </View>
          <Text style={styles.teamName} numberOfLines={1}>{teamBName}</Text>
          <Text style={[styles.pointsDisplay, { color: teamBColor }]}>
            {scoreTeamB}
          </Text>
          <Text style={styles.pointsLabel}>POINTS DU SET</Text>
        </View>
      </View>

      {/* ─── Set Won Notification / Action Button ────────────────────────────── */}
      {(isTeamASetWon || isTeamBSetWon) && isOrganizer && (
        <TouchableOpacity
          style={styles.setWonBanner}
          onPress={onTriggerNextSet}
          activeOpacity={0.85}
        >
          <Trophy size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.setWonTitle}>
              SET {currentSet} REMPORTÉ PAR {isTeamASetWon ? teamAName : teamBName} !
            </Text>
            <Text style={styles.setWonSub}>
              Appuyez pour valider et lancer le Set suivant
            </Text>
          </View>
          <ChevronRight size={20} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* ─── Finished Sets History Table ────────────────────────────────────── */}
      {setScores && setScores.length > 0 && (
        <View style={styles.historyTableContainer}>
          <Text style={styles.historyTableTitle}>RÉCAPITULATIF DES SETS</Text>
          <View style={styles.historyTable}>
            {/* Header Row */}
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableCell, styles.tableTeamCol]}>ÉQUIPES</Text>
              {setScores.map((s) => (
                <Text key={`th_set_${s.setNumber}`} style={styles.tableCellHeader}>
                  S{s.setNumber}
                </Text>
              ))}
              <Text style={[styles.tableCellHeader, styles.tableCellTotalHeader]}>SETS</Text>
            </View>

            {/* Team A Row */}
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.tableTeamName]} numberOfLines={1}>
                {teamAName}
              </Text>
              {setScores.map((s) => {
                const won = s.scoreA > s.scoreB;
                return (
                  <Text
                    key={`score_a_s${s.setNumber}`}
                    style={[styles.tableCell, won && styles.scoreWonText]}
                  >
                    {s.scoreA}
                  </Text>
                );
              })}
              <Text style={[styles.tableCell, styles.totalSetsCell]}>{setsWonA}</Text>
            </View>

            {/* Team B Row */}
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.tableTeamName]} numberOfLines={1}>
                {teamBName}
              </Text>
              {setScores.map((s) => {
                const won = s.scoreB > s.scoreA;
                return (
                  <Text
                    key={`score_b_s${s.setNumber}`}
                    style={[styles.tableCell, won && styles.scoreWonText]}
                  >
                    {s.scoreB}
                  </Text>
                );
              })}
              <Text style={[styles.tableCell, styles.totalSetsCell]}>{setsWonB}</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0A1424',
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    ...shadows.card,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sportBadge: {
    backgroundColor: 'rgba(156, 39, 176, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(156, 39, 176, 0.4)',
  },
  sportBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D8B4FE',
    letterSpacing: 0.5,
  },
  setNumberBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  setNumberBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#CBD5E1',
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  statusLive: { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
  statusPaused: { backgroundColor: 'rgba(245, 158, 11, 0.15)' },
  statusFinished: { backgroundColor: 'rgba(100, 116, 139, 0.15)' },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  dotLive: { backgroundColor: '#EF4444' },
  dotPaused: { backgroundColor: '#F59E0B' },
  dotFinished: { backgroundColor: '#64748B' },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  textLive: { color: '#EF4444' },
  textPaused: { color: '#F59E0B' },
  textFinished: { color: '#94A3B8' },

  // Sets Won Box
  setsWonContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  setsWonTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 6,
  },
  setsWonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  setPillsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  setPill: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  setsDigitBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setsDigit: {
    fontSize: 28,
    fontWeight: '900',
  },
  setsDigitSeparator: {
    fontSize: 22,
    fontWeight: '700',
    color: '#64748B',
  },

  // Current Set Scoreboard
  currentSetScoreBoard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  teamScoreCol: {
    flex: 1,
    alignItems: 'center',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
  },
  teamName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
    maxWidth: 110,
    textAlign: 'center',
  },
  pointsDisplay: {
    fontSize: 48,
    fontWeight: '900',
    lineHeight: 52,
  },
  pointsLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },

  // Center Target & Alerts
  centerBlock: {
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  targetBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  targetBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  targetBadgeValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  targetBadgeSub: {
    fontSize: 8,
    color: '#64748B',
  },

  // Alerts
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  alertSetPoint: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  alertMatchPoint: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  alertTextSetPoint: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F59E0B',
  },
  alertTextMatchPoint: {
    fontSize: 9,
    fontWeight: '800',
    color: '#EF4444',
  },

  // Set Won Banner
  setWonBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  setWonTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  setWonSub: {
    fontSize: 11,
    color: '#ECFDF5',
    marginTop: 2,
  },

  // History Table
  historyTableContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  historyTableTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 8,
    textAlign: 'center',
  },
  historyTable: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
  },
  tableCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  tableTeamCol: {
    flex: 2.2,
    textAlign: 'left',
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  tableTeamName: {
    flex: 2.2,
    textAlign: 'left',
    fontSize: 11,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  tableCellHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
  },
  tableCellTotalHeader: {
    color: '#38BDF8',
  },
  totalSetsCell: {
    fontWeight: '900',
    color: '#38BDF8',
  },
  scoreWonText: {
    fontWeight: '800',
    color: '#34D399',
  },
});
