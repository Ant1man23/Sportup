import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { spacing } from '../../../theme/spacing';
import { TeamCollectiveStats, PeriodScore } from '../api/matchesApi';
import { getSportCategory, formatPeriodLabel } from '../config/sportMatchConfig';

interface TeamStatisticsTabProps {
  teamAStats?: TeamCollectiveStats;
  teamBStats?: TeamCollectiveStats;
  teamAName: string;
  teamBName: string;
  teamAColor?: string;
  teamBColor?: string;
  periodScores?: PeriodScore[];
  sportSlug?: string;
}

const empty: TeamCollectiveStats = {
  points: 0, fg_made: 0, fg_attempted: 0, fg_pct: 0,
  two_pt_made: 0, two_pt_attempted: 0, two_pt_pct: 0,
  three_pt_made: 0, three_pt_attempted: 0, three_pt_pct: 0,
  ft_made: 0, ft_attempted: 0, ft_pct: 0,
  rebounds_offensive: 0, rebounds_defensive: 0, rebounds_total: 0,
  assists: 0, steals: 0, blocks: 0, turnovers: 0, fouls: 0,
  one_pt_made: 0, one_pt_attempted: 0, one_pt_pct: 0,
  goals: 0, shots_on_target: 0, shots_off_target: 0, total_shots: 0, shot_accuracy_pct: 0,
  saves: 0, corners: 0, offsides: 0, yellow_cards: 0, red_cards: 0,
  aces: 0, attack_kills: 0, winners: 0,
};

// Animated progress bar
const StatBar: React.FC<{
  valA: number;
  valB: number;
  colorA: string;
  colorB: string;
  label: string;
  displayA: string;
  displayB: string;
  isPercent?: boolean;
}> = ({ valA, valB, colorA, colorB, label, displayA, displayB }) => {
  const total = valA + valB;
  const pctA = total > 0 ? Math.round((valA / total) * 100) : 50;
  const pctB = 100 - pctA;
  const aWins = valA > valB;
  const bWins = valB > valA;

  return (
    <View style={barStyles.row}>
      {/* Value A */}
      <View style={barStyles.valWrap}>
        <Text style={[barStyles.val, { color: colorA }, aWins && barStyles.valWinner]}>{displayA}</Text>
      </View>

      {/* Bar + label */}
      <View style={barStyles.center}>
        <Text style={barStyles.label}>{label}</Text>
        <View style={barStyles.track}>
          {/* Left fill (Team A) */}
          <View style={[barStyles.fillA, {
            width: `${pctA}%`,
            backgroundColor: aWins ? colorA : colorA + '80',
          }]} />
          {/* Right fill (Team B) */}
          <View style={[barStyles.fillB, {
            width: `${pctB}%`,
            backgroundColor: bWins ? colorB : colorB + '80',
          }]} />
        </View>
      </View>

      {/* Value B */}
      <View style={barStyles.valWrap}>
        <Text style={[barStyles.val, { color: colorB }, bWins && barStyles.valWinner, { textAlign: 'right' }]}>{displayB}</Text>
      </View>
    </View>
  );
};

const barStyles = StyleSheet.create({
  row: { marginBottom: 14 },
  center: { flex: 1, alignItems: 'center', gap: 4 },
  label: { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.3, textAlign: 'center' },
  track: {
    width: '100%',
    height: 7,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  fillA: { height: '100%', borderRadius: 4 },
  fillB: { height: '100%', borderRadius: 4 },
  valWrap: { width: 52, alignItems: 'flex-start' },
  val: { fontSize: 13, fontWeight: '700', color: '#CBD5E1' },
  valWinner: { fontWeight: '900', fontSize: 14 },
});

// Section wrapper
const StatSection: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => (
  <View style={secStyles.card}>
    <View style={secStyles.header}>
      <Text style={secStyles.icon}>{icon}</Text>
      <Text style={secStyles.title}>{title}</Text>
    </View>
    <View style={secStyles.body}>{children}</View>
  </View>
);

const secStyles = StyleSheet.create({
  card: {
    backgroundColor: '#0D1B2A',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  icon: { fontSize: 14 },
  title: { fontSize: 11, fontWeight: '900', color: '#94A3B8', letterSpacing: 0.8 },
  body: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
});

export const TeamStatisticsTab: React.FC<TeamStatisticsTabProps> = ({
  teamAStats,
  teamBStats,
  teamAName,
  teamBName,
  teamAColor = '#1456D9',
  teamBColor = '#F28B2E',
  periodScores = [],
  sportSlug,
}) => {
  const sportCategory = getSportCategory(sportSlug);
  const sA = teamAStats || empty;
  const sB = teamBStats || empty;

  const S = (label: string, displayA: string, displayB: string, rawA: number, rawB: number) => (
    <StatBar
      key={label}
      label={label}
      displayA={displayA}
      displayB={displayB}
      valA={rawA}
      valB={rawB}
      colorA={teamAColor}
      colorB={teamBColor}
    />
  );

  return (
    <View style={styles.container}>
      {/* Teams header banner */}
      <View style={styles.teamsBanner}>
        <View style={styles.teamBannerSide}>
          <View style={[styles.teamColorBar, { backgroundColor: teamAColor }]} />
          <Text style={[styles.teamBannerName, { color: teamAColor }]} numberOfLines={1}>{teamAName}</Text>
        </View>
        <Text style={styles.vsDivider}>VS</Text>
        <View style={[styles.teamBannerSide, { justifyContent: 'flex-end' }]}>
          <Text style={[styles.teamBannerName, { color: teamBColor, textAlign: 'right' }]} numberOfLines={1}>{teamBName}</Text>
          <View style={[styles.teamColorBar, { backgroundColor: teamBColor }]} />
        </View>
      </View>

      {/* ── FOOTBALL ── */}
      {sportCategory === 'football' && (
        <>
          <StatSection title="ATTAQUE & EFFICACITÉ" icon="⚽">
            {S('Buts', String(sA.goals ?? sA.points), String(sB.goals ?? sB.points), sA.goals ?? sA.points, sB.goals ?? sB.points)}
            {S('Tirs cadrés', String(sA.shots_on_target ?? 0), String(sB.shots_on_target ?? 0), sA.shots_on_target ?? 0, sB.shots_on_target ?? 0)}
            {S('Tirs non cadrés', String(sA.shots_off_target ?? 0), String(sB.shots_off_target ?? 0), sA.shots_off_target ?? 0, sB.shots_off_target ?? 0)}
            {S('Précision tirs', `${sA.shot_accuracy_pct ?? 0}%`, `${sB.shot_accuracy_pct ?? 0}%`, sA.shot_accuracy_pct ?? 0, sB.shot_accuracy_pct ?? 0)}
            {S('Passes décisives', String(sA.assists), String(sB.assists), sA.assists, sB.assists)}
            {S('Corners', String(sA.corners ?? 0), String(sB.corners ?? 0), sA.corners ?? 0, sB.corners ?? 0)}
          </StatSection>
          <StatSection title="GARDIEN & DISCIPLINE" icon="🛡️">
            {S('Arrêts gardien', String(sA.saves ?? 0), String(sB.saves ?? 0), sA.saves ?? 0, sB.saves ?? 0)}
            {S('Hors-jeux', String(sA.offsides ?? 0), String(sB.offsides ?? 0), sA.offsides ?? 0, sB.offsides ?? 0)}
            {S('Fautes', String(sA.fouls), String(sB.fouls), sA.fouls, sB.fouls)}
            {S('Cartons jaunes 🟨', String(sA.yellow_cards ?? 0), String(sB.yellow_cards ?? 0), sA.yellow_cards ?? 0, sB.yellow_cards ?? 0)}
            {S('Cartons rouges 🟥', String(sA.red_cards ?? 0), String(sB.red_cards ?? 0), sA.red_cards ?? 0, sB.red_cards ?? 0)}
          </StatSection>
        </>
      )}

      {/* ── BASKET 5×5 ── */}
      {sportCategory === 'basketball' && (
        <>
          <StatSection title="ADRESSE AUX TIRS" icon="🎯">
            {S('Tirs du terrain', `${sA.fg_pct}% (${sA.fg_made}/${sA.fg_attempted})`, `${sB.fg_pct}% (${sB.fg_made}/${sB.fg_attempted})`, sA.fg_pct, sB.fg_pct)}
            {S('Paniers à 2 pts', `${sA.two_pt_pct}% (${sA.two_pt_made}/${sA.two_pt_attempted})`, `${sB.two_pt_pct}% (${sB.two_pt_made}/${sB.two_pt_attempted})`, sA.two_pt_pct, sB.two_pt_pct)}
            {S('Paniers à 3 pts', `${sA.three_pt_pct}% (${sA.three_pt_made}/${sA.three_pt_attempted})`, `${sB.three_pt_pct}% (${sB.three_pt_made}/${sB.three_pt_attempted})`, sA.three_pt_pct, sB.three_pt_pct)}
            {S('Lancers francs', `${sA.ft_pct}% (${sA.ft_made}/${sA.ft_attempted})`, `${sB.ft_pct}% (${sB.ft_made}/${sB.ft_attempted})`, sA.ft_pct, sB.ft_pct)}
          </StatSection>
          <StatSection title="REBONDS" icon="↩️">
            {S('Total rebonds', String(sA.rebounds_total), String(sB.rebounds_total), sA.rebounds_total, sB.rebounds_total)}
            {S('Offensifs', String(sA.rebounds_offensive), String(sB.rebounds_offensive), sA.rebounds_offensive, sB.rebounds_offensive)}
            {S('Défensifs', String(sA.rebounds_defensive), String(sB.rebounds_defensive), sA.rebounds_defensive, sB.rebounds_defensive)}
          </StatSection>
          <StatSection title="JEU COLLECTIF & DÉFENSE" icon="🤝">
            {S('Passes décisives', String(sA.assists), String(sB.assists), sA.assists, sB.assists)}
            {S('Interceptions', String(sA.steals), String(sB.steals), sA.steals, sB.steals)}
            {S('Contres', String(sA.blocks), String(sB.blocks), sA.blocks, sB.blocks)}
            {S('Balles perdues', String(sA.turnovers), String(sB.turnovers), sA.turnovers, sB.turnovers)}
            {S('Fautes personnelles', String(sA.fouls), String(sB.fouls), sA.fouls, sB.fouls)}
          </StatSection>
        </>
      )}

      {/* ── BASKET 3×3 ── */}
      {sportCategory === 'basketball_3x3' && (
        <>
          <StatSection title="POINTS & ADRESSE 3×3" icon="🏀">
            {S('Points totaux', String(sA.points), String(sB.points), sA.points, sB.points)}
            {S('Tirs 1 pt (Arc/LF)', `${sA.one_pt_pct ?? 0}% (${sA.one_pt_made ?? 0}/${sA.one_pt_attempted ?? 0})`, `${sB.one_pt_pct ?? 0}% (${sB.one_pt_made ?? 0}/${sB.one_pt_attempted ?? 0})`, sA.one_pt_pct ?? 0, sB.one_pt_pct ?? 0)}
            {S('Tirs 2 pts (Ext.)', `${sA.two_pt_pct}% (${sA.two_pt_made}/${sA.two_pt_attempted})`, `${sB.two_pt_pct}% (${sB.two_pt_made}/${sB.two_pt_attempted})`, sA.two_pt_pct, sB.two_pt_pct)}
          </StatSection>
          <StatSection title="JEU & DÉFENSE 3×3" icon="🛡️">
            {S('Rebonds', String(sA.rebounds_total), String(sB.rebounds_total), sA.rebounds_total, sB.rebounds_total)}
            {S('Passes décisives', String(sA.assists), String(sB.assists), sA.assists, sB.assists)}
            {S('Interceptions', String(sA.steals), String(sB.steals), sA.steals, sB.steals)}
            {S('Contres', String(sA.blocks), String(sB.blocks), sA.blocks, sB.blocks)}
            {S('Fautes d\'équipe', String(sA.fouls), String(sB.fouls), sA.fouls, sB.fouls)}
          </StatSection>
        </>
      )}

      {/* ── VOLLEYBALL ── */}
      {sportCategory === 'volleyball' && (
        <>
          <StatSection title="POINTS & ATTAQUES" icon="🏐">
            {S('Points totaux', String(sA.points), String(sB.points), sA.points, sB.points)}
            {S('Aces (services gagnants)', String(sA.aces ?? 0), String(sB.aces ?? 0), sA.aces ?? 0, sB.aces ?? 0)}
            {S('Attaques gagnantes', String(sA.attack_kills ?? 0), String(sB.attack_kills ?? 0), sA.attack_kills ?? 0, sB.attack_kills ?? 0)}
            {S('Contres gagnants', String(sA.blocks), String(sB.blocks), sA.blocks, sB.blocks)}
          </StatSection>
          <StatSection title="DISCIPLINE" icon="📋">
            {S('Fautes', String(sA.fouls), String(sB.fouls), sA.fouls, sB.fouls)}
          </StatSection>
        </>
      )}

      {/* ── TABLE TENNIS ── */}
      {sportCategory === 'table_tennis' && (
        <StatSection title="POINTS & COUPS GAGNANTS" icon="🏓">
          {S('Points totaux', String(sA.points), String(sB.points), sA.points, sB.points)}
          {S('Services gagnants (aces)', String(sA.aces ?? 0), String(sB.aces ?? 0), sA.aces ?? 0, sB.aces ?? 0)}
          {S('Coups gagnants (winners)', String(sA.winners ?? 0), String(sB.winners ?? 0), sA.winners ?? 0, sB.winners ?? 0)}
          {S('Fautes directes', String(sA.fouls), String(sB.fouls), sA.fouls, sB.fouls)}
        </StatSection>
      )}

      {/* ── PERIOD BREAKDOWN ── */}
      {periodScores.length > 0 && (
        <StatSection title={`RÉPARTITION PAR ${formatPeriodLabel(sportCategory, 1).split(' ')[0].toUpperCase()}`} icon="📊">
          {periodScores.map((p) =>
            S(
              formatPeriodLabel(sportCategory, p.period),
              String(p.team_a),
              String(p.team_b),
              p.team_a,
              p.team_b
            )
          )}
        </StatSection>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingVertical: spacing.xs },
  teamsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D1B2A',
    borderRadius: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  teamBannerSide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teamColorBar: {
    width: 4,
    height: 28,
    borderRadius: 2,
  },
  teamBannerName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  vsDivider: {
    fontSize: 11,
    fontWeight: '900',
    color: '#475569',
    paddingHorizontal: 12,
  },
});
