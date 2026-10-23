import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { spacing } from '../../../theme/spacing';
import { PlayerBoxscore } from '../api/matchesApi';
import { getSportCategory } from '../config/sportMatchConfig';

interface PlayerBoxscoreTabProps {
  playersA: PlayerBoxscore[];
  playersB: PlayerBoxscore[];
  teamAName: string;
  teamBName: string;
  teamAColor?: string;
  teamBColor?: string;
  sportSlug?: string;
}

type CourtFilter = 'all' | 'on_court' | 'bench';

export const PlayerBoxscoreTab: React.FC<PlayerBoxscoreTabProps> = ({
  playersA,
  playersB,
  teamAName,
  teamBName,
  teamAColor = '#3B82F6',
  teamBColor = '#EF4444',
  sportSlug,
}) => {
  const [selectedSide, setSelectedSide] = useState<'team_a' | 'team_b'>('team_a');
  const [filter, setFilter] = useState<CourtFilter>('all');
  const sportCategory = getSportCategory(sportSlug);

  const activePlayers = selectedSide === 'team_a' ? playersA : playersB;
  const activeColor = selectedSide === 'team_a' ? teamAColor : teamBColor;

  const onCourtCount = activePlayers.filter(p => p.is_on_court).length;
  const benchCount = activePlayers.filter(p => !p.is_on_court).length;

  const filteredPlayers = activePlayers.filter(p => {
    if (filter === 'on_court') return p.is_on_court;
    if (filter === 'bench') return !p.is_on_court;
    return true;
  });

  const getShotPctColor = (pct: number) => {
    if (pct >= 50) return '#10B981';
    if (pct >= 35) return '#F59E0B';
    return '#94A3B8';
  };

  const renderFootballPlayerStats = (player: PlayerBoxscore) => (
    <View style={styles.statsGrid}>
      <View style={[styles.statBoxPrimary, { backgroundColor: activeColor + '18', borderColor: activeColor + '40' }]}>
        <Text style={[styles.statPrimaryVal, { color: activeColor }]}>{player.goals ?? player.points ?? 0}</Text>
        <Text style={styles.statPrimaryLabel}>BUTS ⚽</Text>
      </View>
      <View style={styles.statTile}>
        <Text style={styles.statNum}>{player.assists ?? 0}</Text>
        <Text style={styles.statLabel}>PASSES D.</Text>
      </View>
      <View style={styles.statTile}>
        <Text style={styles.statNum}>
          {player.shots_on_target ?? 0}
          <Text style={styles.statSubNum}>/{player.total_shots ?? 0}</Text>
        </Text>
        <Text style={styles.statLabel}>CADRÉS 🎯</Text>
      </View>
      <View style={styles.statTile}>
        <Text style={styles.statNum}>{player.saves ?? 0}</Text>
        <Text style={styles.statLabel}>ARRÊTS 🧤</Text>
      </View>
      <View style={styles.statTile}>
        <Text style={styles.statNum}>{player.fouls ?? 0}</Text>
        <Text style={styles.statLabel}>FAUTES</Text>
      </View>
      <View style={styles.statTile}>
        <Text style={[styles.statNum, (player.yellow_cards ?? 0) > 0 && { color: '#F59E0B' }]}>
          {player.yellow_cards ?? 0}
        </Text>
        <Text style={styles.statLabel}>JAUNE 🟨</Text>
      </View>
      <View style={styles.statTile}>
        <Text style={[styles.statNum, (player.red_cards ?? 0) > 0 && { color: '#EF4444' }]}>
          {player.red_cards ?? 0}
        </Text>
        <Text style={styles.statLabel}>ROUGE 🟥</Text>
      </View>
    </View>
  );

  const renderBasketball3x3PlayerStats = (player: PlayerBoxscore) => (
    <View>
      <View style={styles.statsGrid}>
        <View style={[styles.statBoxPrimary, { backgroundColor: activeColor + '18', borderColor: activeColor + '40' }]}>
          <Text style={[styles.statPrimaryVal, { color: activeColor }]}>{player.points}</Text>
          <Text style={styles.statPrimaryLabel}>PTS</Text>
        </View>
        <View style={styles.statTile}>
          <Text style={styles.statNum}>{player.rebounds_total}</Text>
          <Text style={styles.statLabel}>REB</Text>
        </View>
        <View style={styles.statTile}>
          <Text style={styles.statNum}>{player.assists}</Text>
          <Text style={styles.statLabel}>AST</Text>
        </View>
        <View style={styles.statTile}>
          <Text style={styles.statNum}>{player.steals}</Text>
          <Text style={styles.statLabel}>STL</Text>
        </View>
        <View style={styles.statTile}>
          <Text style={styles.statNum}>{player.blocks}</Text>
          <Text style={styles.statLabel}>BLK</Text>
        </View>
        <View style={styles.statTile}>
          <Text style={styles.statNum}>{player.fouls}</Text>
          <Text style={styles.statLabel}>FAUTES</Text>
        </View>
      </View>

      <View style={styles.splitsContainer}>
        <View style={styles.splitBadge}>
          <Text style={styles.splitTitle}>1 PT (ARC / LF)</Text>
          <View style={styles.splitRow}>
            <Text style={styles.splitRatio}>{player.one_pt_made ?? 0}/{player.one_pt_attempted ?? 0}</Text>
            <Text style={[styles.splitPct, { color: getShotPctColor(player.one_pt_pct ?? 0) }]}>
              {player.one_pt_pct ?? 0}%
            </Text>
          </View>
        </View>
        <View style={styles.splitBadge}>
          <Text style={styles.splitTitle}>2 PTS (EXTÉRIEUR)</Text>
          <View style={styles.splitRow}>
            <Text style={styles.splitRatio}>{player.two_pt_made ?? 0}/{player.two_pt_attempted ?? 0}</Text>
            <Text style={[styles.splitPct, { color: getShotPctColor(player.two_pt_pct ?? 0) }]}>
              {player.two_pt_pct ?? 0}%
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderVolleyballPlayerStats = (player: PlayerBoxscore) => (
    <View style={styles.statsGrid}>
      <View style={[styles.statBoxPrimary, { backgroundColor: activeColor + '18', borderColor: activeColor + '40' }]}>
        <Text style={[styles.statPrimaryVal, { color: activeColor }]}>{player.points}</Text>
        <Text style={styles.statPrimaryLabel}>POINTS</Text>
      </View>
      <View style={styles.statTile}>
        <Text style={styles.statNum}>{player.aces ?? 0}</Text>
        <Text style={styles.statLabel}>ACES 🎯</Text>
      </View>
      <View style={styles.statTile}>
        <Text style={styles.statNum}>{player.attack_kills ?? 0}</Text>
        <Text style={styles.statLabel}>ATTAQUES 💥</Text>
      </View>
      <View style={styles.statTile}>
        <Text style={styles.statNum}>{player.blocks}</Text>
        <Text style={styles.statLabel}>CONTRES 🛡️</Text>
      </View>
      <View style={styles.statTile}>
        <Text style={styles.statNum}>{player.fouls}</Text>
        <Text style={styles.statLabel}>FAUTES ⚠️</Text>
      </View>
    </View>
  );

  const renderTableTennisPlayerStats = (player: PlayerBoxscore) => (
    <View style={styles.statsGrid}>
      <View style={[styles.statBoxPrimary, { backgroundColor: activeColor + '18', borderColor: activeColor + '40' }]}>
        <Text style={[styles.statPrimaryVal, { color: activeColor }]}>{player.points}</Text>
        <Text style={styles.statPrimaryLabel}>POINTS</Text>
      </View>
      <View style={styles.statTile}>
        <Text style={styles.statNum}>{player.aces ?? 0}</Text>
        <Text style={styles.statLabel}>SERVICES 🎯</Text>
      </View>
      <View style={styles.statTile}>
        <Text style={styles.statNum}>{player.winners ?? 0}</Text>
        <Text style={styles.statLabel}>GAGNANTS ⚡</Text>
      </View>
      <View style={styles.statTile}>
        <Text style={styles.statNum}>{player.fouls}</Text>
        <Text style={styles.statLabel}>FAUTES ❌</Text>
      </View>
    </View>
  );

  const renderBasketball5x5PlayerStats = (player: PlayerBoxscore) => (
    <View>
      <View style={styles.statsGrid}>
        <View style={[styles.statBoxPrimary, { backgroundColor: activeColor + '18', borderColor: activeColor + '40' }]}>
          <Text style={[styles.statPrimaryVal, { color: activeColor }]}>{player.points}</Text>
          <Text style={styles.statPrimaryLabel}>PTS</Text>
        </View>
        <View style={styles.statTile}>
          <Text style={styles.statNum}>{player.rebounds_total}</Text>
          <Text style={styles.statLabel}>REB ({player.rebounds_offensive}O/{player.rebounds_defensive}D)</Text>
        </View>
        <View style={styles.statTile}>
          <Text style={styles.statNum}>{player.assists}</Text>
          <Text style={styles.statLabel}>AST</Text>
        </View>
        <View style={styles.statTile}>
          <Text style={styles.statNum}>{player.steals}</Text>
          <Text style={styles.statLabel}>STL</Text>
        </View>
        <View style={styles.statTile}>
          <Text style={styles.statNum}>{player.blocks}</Text>
          <Text style={styles.statLabel}>BLK</Text>
        </View>
        <View style={styles.statTile}>
          <Text style={styles.statNum}>{player.turnovers}</Text>
          <Text style={styles.statLabel}>TO</Text>
        </View>
        <View style={[styles.statTile, player.fouls >= 5 && styles.statTileFoulDanger]}>
          <Text style={[styles.statNum, player.fouls >= 5 && styles.statFoulDangerText]}>
            {player.fouls}
          </Text>
          <Text style={[styles.statLabel, player.fouls >= 5 && styles.statFoulDangerText]}>FAUTES</Text>
        </View>
      </View>

      <View style={styles.splitsContainer}>
        <View style={styles.splitBadge}>
          <Text style={styles.splitTitle}>TIRS DU TERRAIN</Text>
          <View style={styles.splitRow}>
            <Text style={styles.splitRatio}>{player.fg_made}/{player.fg_attempted}</Text>
            <Text style={[styles.splitPct, { color: getShotPctColor(player.fg_pct) }]}>
              {player.fg_pct}%
            </Text>
          </View>
        </View>
        <View style={styles.splitBadge}>
          <Text style={styles.splitTitle}>2 POINTS</Text>
          <View style={styles.splitRow}>
            <Text style={styles.splitRatio}>{player.two_pt_made}/{player.two_pt_attempted}</Text>
            <Text style={[styles.splitPct, { color: getShotPctColor(player.two_pt_pct) }]}>
              {player.two_pt_pct}%
            </Text>
          </View>
        </View>
        <View style={styles.splitBadge}>
          <Text style={styles.splitTitle}>3 POINTS</Text>
          <View style={styles.splitRow}>
            <Text style={styles.splitRatio}>{player.three_pt_made}/{player.three_pt_attempted}</Text>
            <Text style={[styles.splitPct, { color: getShotPctColor(player.three_pt_pct) }]}>
              {player.three_pt_pct}%
            </Text>
          </View>
        </View>
        <View style={styles.splitBadge}>
          <Text style={styles.splitTitle}>LANCERS FR.</Text>
          <View style={styles.splitRow}>
            <Text style={styles.splitRatio}>{player.ft_made}/{player.ft_attempted}</Text>
            <Text style={[styles.splitPct, { color: getShotPctColor(player.ft_pct) }]}>
              {player.ft_pct}%
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderPlayerStats = (player: PlayerBoxscore) => {
    switch (sportCategory) {
      case 'football':
        return renderFootballPlayerStats(player);
      case 'basketball_3x3':
        return renderBasketball3x3PlayerStats(player);
      case 'volleyball':
        return renderVolleyballPlayerStats(player);
      case 'table_tennis':
        return renderTableTennisPlayerStats(player);
      case 'basketball':
      default:
        return renderBasketball5x5PlayerStats(player);
    }
  };

  return (
    <View style={styles.container}>
      {/* Team Segment Tabs */}
      <View style={styles.teamTabsWrapper}>
        <TouchableOpacity
          style={[
            styles.teamTab,
            selectedSide === 'team_a' && [styles.teamTabActive, { borderBottomColor: teamAColor }]
          ]}
          onPress={() => setSelectedSide('team_a')}
          activeOpacity={0.8}
        >
          <View style={[styles.teamColorDot, { backgroundColor: teamAColor }]} />
          <Text
            style={[
              styles.teamTabText,
              selectedSide === 'team_a' && { color: '#FFFFFF', fontWeight: '800' }
            ]}
            numberOfLines={1}
          >
            {teamAName}
          </Text>
          <View style={[styles.teamCountBadge, selectedSide === 'team_a' && { backgroundColor: teamAColor + '30' }]}>
            <Text style={[styles.teamCountText, selectedSide === 'team_a' && { color: teamAColor }]}>
              {playersA.length}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.teamTab,
            selectedSide === 'team_b' && [styles.teamTabActive, { borderBottomColor: teamBColor }]
          ]}
          onPress={() => setSelectedSide('team_b')}
          activeOpacity={0.8}
        >
          <View style={[styles.teamColorDot, { backgroundColor: teamBColor }]} />
          <Text
            style={[
              styles.teamTabText,
              selectedSide === 'team_b' && { color: '#FFFFFF', fontWeight: '800' }
            ]}
            numberOfLines={1}
          >
            {teamBName}
          </Text>
          <View style={[styles.teamCountBadge, selectedSide === 'team_b' && { backgroundColor: teamBColor + '30' }]}>
            <Text style={[styles.teamCountText, selectedSide === 'team_b' && { color: teamBColor }]}>
              {playersB.length}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Filter Chips (Tous / Sur terrain / Banc) */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterChipText, filter === 'all' && styles.filterChipTextActive]}>
            Tous ({activePlayers.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, filter === 'on_court' && styles.filterChipActive]}
          onPress={() => setFilter('on_court')}
        >
          <View style={[styles.courtIndicatorDot, { backgroundColor: '#10B981' }]} />
          <Text style={[styles.filterChipText, filter === 'on_court' && styles.filterChipTextActive]}>
            Sur terrain ({onCourtCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, filter === 'bench' && styles.filterChipActive]}
          onPress={() => setFilter('bench')}
        >
          <View style={[styles.courtIndicatorDot, { backgroundColor: '#64748B' }]} />
          <Text style={[styles.filterChipText, filter === 'bench' && styles.filterChipTextActive]}>
            Banc ({benchCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Players List */}
      {filteredPlayers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyText}>Aucun joueur dans cette sélection.</Text>
        </View>
      ) : (
        filteredPlayers.map((player) => {
          const isFouledOut = (sportCategory === 'basketball' && player.fouls >= 5) || (player.red_cards ?? 0) > 0;

          return (
            <View key={player.user_id} style={styles.playerCard}>
              {/* Card Header: Jersey badge, Name, Position, Minutes, Status */}
              <View style={styles.cardHeader}>
                <View style={[styles.jerseyBadge, { borderColor: activeColor, shadowColor: activeColor }]}>
                  <Text style={[styles.jerseyText, { color: activeColor }]}>
                    #{player.jersey_number ?? '?'}
                  </Text>
                </View>

                <View style={styles.playerMainInfo}>
                  <View style={styles.playerNameRow}>
                    <Text style={styles.playerName} numberOfLines={1}>{player.username}</Text>
                    {isFouledOut && (
                      <View style={styles.foulOutBadge}>
                        <Text style={styles.foulOutText}>EXPULSÉ</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.playerSub}>
                    {player.position || 'Joueur'} • ⏱️ {player.minutes_formatted} min
                  </Text>
                </View>

                <View style={[
                  styles.courtStatusBadge,
                  player.is_on_court ? styles.courtStatusOn : styles.courtStatusBench
                ]}>
                  <View style={[styles.courtDot, { backgroundColor: player.is_on_court ? '#10B981' : '#64748B' }]} />
                  <Text style={[
                    styles.courtStatusText,
                    player.is_on_court ? styles.courtTextOn : styles.courtTextBench
                  ]}>
                    {player.is_on_court ? 'EN JEU' : 'BANC'}
                  </Text>
                </View>
              </View>

              {/* Discipline-Aware Player Stats */}
              {renderPlayerStats(player)}
            </View>
          );
        })
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xs,
  },

  // Team Tabs
  teamTabsWrapper: {
    flexDirection: 'row',
    backgroundColor: '#0D1B2A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  teamTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 8,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    backgroundColor: 'transparent',
  },
  teamTabActive: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  teamColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  teamTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  teamCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  teamCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },

  // Filter Chips
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#0D1B2A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.25)',
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
  courtIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Player Card
  playerCard: {
    backgroundColor: '#0D1B2A',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 10,
  },
  jerseyBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  jerseyText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  playerMainInfo: {
    flex: 1,
  },
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
    flexShrink: 1,
  },
  foulOutBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(239,68,68,0.2)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  foulOutText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#EF4444',
    letterSpacing: 0.5,
  },
  playerSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  courtStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  courtStatusOn: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
  },
  courtStatusBench: {
    backgroundColor: 'rgba(100,116,139,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(100,116,139,0.25)',
  },
  courtDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  courtStatusText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  courtTextOn: {
    color: '#10B981',
  },
  courtTextBench: {
    color: '#94A3B8',
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  statBoxPrimary: {
    minWidth: 58,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statPrimaryVal: {
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 22,
  },
  statPrimaryLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    marginTop: 1,
  },
  statTile: {
    flex: 1,
    minWidth: 46,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  statTileFoulDanger: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderColor: 'rgba(239,68,68,0.35)',
  },
  statNum: {
    fontSize: 13,
    fontWeight: '800',
    color: '#E2E8F0',
  },
  statSubNum: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  statFoulDangerText: {
    color: '#EF4444',
  },

  // Shooting Splits
  splitsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  splitBadge: {
    flex: 1,
    minWidth: 70,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  splitTitle: {
    fontSize: 8,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  splitRatio: {
    fontSize: 11,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  splitPct: {
    fontSize: 10,
    fontWeight: '900',
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

