import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  Platform,
  StatusBar,
} from 'react-native';
import {
  ChevronLeft,
  TrendingUp,
  Trophy,
  Clock,
  BarChart2,
  History,
  Target,
  Zap,
} from 'lucide-react-native';
import { colors } from '../../../theme/colors';
import { radius, shadows, spacing } from '../../../theme/spacing';
import { statisticsApi, StatisticsResponse } from '../api/statisticsApi';
import { useAuthStore } from '../../../store/useAuthStore';
import { UserStatHistory } from '../../../types';

const CHART_HEIGHT = 80;

interface StatisticsScreenProps {
  onNavigateBack?: () => void;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export const StatisticsScreen: React.FC<StatisticsScreenProps> = ({ onNavigateBack }) => {
  const user = useAuthStore((state) => state.user);
  const [data, setData] = useState<StatisticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'history'>('stats');
  const [history, setHistory] = useState<UserStatHistory[]>([]);
  const [histLoading, setHistLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    statisticsApi.getUserStatistics(user.id)
      .then((d) => {
        setData(d);
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(ringAnim, { toValue: (d?.summary?.win_rate || 0) / 100, duration: 1100, useNativeDriver: false }),
        ]).start();
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [user?.id]);

  useEffect(() => {
    if (activeTab !== 'history' || !user?.id || history.length > 0) return;
    setHistLoading(true);
    statisticsApi.getUserStatHistory(user.id)
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setHistLoading(false));
  }, [activeTab, user?.id]);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const summary = data?.summary ?? {
    matches_played: 0, wins: 0, losses: 0, draws: 0,
    win_rate: 0, goals_scored: 0, points_scored: 0,
    assists: 0, rebounds: 0, blocks: 0, steals: 0, mvp_count: 0,
  };

  const winRate = summary.win_rate;
  const mvpCount = summary.mvp_count || 0;
  const bySport = data?.by_sport || [];

  const ringColor = winRate >= 60 ? colors.success
    : winRate >= 40 ? colors.warning
    : colors.danger;

  const performanceLabel =
    winRate >= 80 ? 'Elite' :
    winRate >= 60 ? 'En forme' :
    winRate >= 40 ? 'En progression' :
    'Continuez !';

  const perfPoints = data?.recent_performance || [];
  const chartPoints = perfPoints.length > 0 ? perfPoints :
    Array.from({ length: 6 }, (_, i) => ({
      match_index: i + 1,
      win_rate: Math.max(10, Math.min(90, winRate + Math.sin(i) * 15)),
      result: (i % 3 === 0 ? 'loss' : 'win') as 'win' | 'loss' | 'draw',
    }));
  const maxRate = Math.max(...chartPoints.map(p => p.win_rate), 1);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.navy} />

      {/* ── Hero header (navy) ── */}
      <Animated.View style={[styles.hero, { opacity: fadeAnim }]}>

        {/* Top row */}
        <View style={styles.heroTop}>
          {onNavigateBack && (
            <TouchableOpacity onPress={onNavigateBack} style={styles.backBtn} activeOpacity={0.65}>
              <ChevronLeft size={18} color="rgba(255,255,255,0.75)" strokeWidth={2.2} />
            </TouchableOpacity>
          )}
          <Text style={styles.heroTitle}>Statistiques</Text>
          {mvpCount > 0 && (
            <View style={styles.mvpPill}>
              <Trophy size={11} color="#F59E0B" strokeWidth={2.5} />
              <Text style={styles.mvpPillText}>{mvpCount} MVP</Text>
            </View>
          )}
        </View>

        {/* Ring + summary */}
        <View style={styles.heroBody}>
          <View style={styles.ringArea}>
            <View style={styles.ringBg}>
              <Animated.View style={[styles.ringFill, {
                borderColor: ringAnim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(255,255,255,0.12)', ringColor] }),
                borderWidth: ringAnim.interpolate({ inputRange: [0, 1], outputRange: [5, 9] }),
              }]}>
                <Text style={styles.ringRate}>{winRate}<Text style={styles.ringPct}>%</Text></Text>
                <Text style={styles.ringLabel}>VICTOIRES</Text>
              </Animated.View>
            </View>
            <View style={[styles.performancePill, { borderColor: `${ringColor}55` }]}>
              <View style={[styles.performanceDot, { backgroundColor: ringColor }]} />
              <Text style={[styles.performanceText, { color: ringColor }]}>{performanceLabel}</Text>
            </View>
          </View>

          {/* Trois stats clés */}
          <View style={styles.keyStats}>
            <KeyStat value={summary.matches_played} label="Matchs" />
            <View style={styles.keyStatSep} />
            <KeyStat value={summary.wins} label="Victoires" accent={colors.success} />
            <View style={styles.keyStatSep} />
            <KeyStat value={summary.losses} label="D\u00e9faites" accent={colors.danger} />
          </View>
        </View>
      </Animated.View>

      {/* ── Tab bar ── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'stats' && styles.tabItemActive]}
          onPress={() => setActiveTab('stats')}
          activeOpacity={0.75}
        >
          <BarChart2 size={14} color={activeTab === 'stats' ? colors.primary : colors.muted} strokeWidth={2} />
          <Text style={[styles.tabText, activeTab === 'stats' && styles.tabTextActive]}>Vue d\u2019ensemble</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'history' && styles.tabItemActive]}
          onPress={() => setActiveTab('history')}
          activeOpacity={0.75}
        >
          <History size={14} color={activeTab === 'history' ? colors.primary : colors.muted} strokeWidth={2} />
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>Historique</Text>
        </TouchableOpacity>
      </View>

      {/* ── Content ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'stats' && (
          <>
            {/* Métriques détaillées */}
            <SectionLabel icon={<Target size={13} color={colors.primary} strokeWidth={2} />} label="M\u00e9triques" />
            <View style={styles.metricsGrid}>
              <MetricCard value={summary.goals_scored || 0} label="Buts" color={colors.primary} />
              <MetricCard value={summary.points_scored || 0} label="Points" color="#F59E0B" />
              <MetricCard value={summary.assists || 0} label="Passes D." color={colors.success} />
              <MetricCard value={summary.rebounds || 0} label="Rebonds" color="#8B5CF6" />
              <MetricCard value={summary.blocks || 0} label="Contres" color="#EC4899" />
              <MetricCard value={summary.steals || 0} label="Interceptions" color="#3B82F6" />
            </View>

            {/* Courbe de forme */}
            {chartPoints.length > 0 && (
              <>
                <SectionLabel icon={<TrendingUp size={13} color={colors.primary} strokeWidth={2} />} label="Progression de forme" />
                <View style={styles.card}>
                  <View style={styles.chartWrap}>
                    <View style={styles.chartArea}>
                      {[0, 0.5, 1].map((pct, i) => (
                        <View key={i} style={[styles.gridLine, { bottom: pct * CHART_HEIGHT }]} />
                      ))}
                      {chartPoints.map((point, idx) => {
                        const x = (idx / Math.max(chartPoints.length - 1, 1)) * 100;
                        const y = (point.win_rate / maxRate) * CHART_HEIGHT;
                        const dc = point.result === 'win' ? colors.success
                          : point.result === 'loss' ? colors.danger : colors.muted;
                        return (
                          <View
                            key={idx}
                            style={[styles.chartDot, {
                              left: `${x}%` as any,
                              bottom: y,
                              backgroundColor: dc,
                              shadowColor: dc,
                            }]}
                          />
                        );
                      })}
                    </View>
                    <View style={styles.chartLegend}>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                        <Text style={styles.legendText}>Victoire</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
                        <Text style={styles.legendText}>D\u00e9faite</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </>
            )}

            {/* Par sport */}
            {bySport.length > 0 && (
              <>
                <SectionLabel icon={<Zap size={13} color={colors.primary} strokeWidth={2} />} label="Par sport" />
                <View style={styles.card}>
                  {bySport.map((stat, idx) => {
                    const pct = stat.matches_played > 0
                      ? Math.round((stat.wins / stat.matches_played) * 100) : 0;
                    const sc = stat.sport.color_hex || colors.primary;
                    return (
                      <View key={stat.sport_id}>
                        {idx > 0 && <View style={styles.divider} />}
                        <View style={styles.sportRow}>
                          <View style={[styles.sportDot, { backgroundColor: sc }]} />
                          <View style={styles.sportInfo}>
                            <View style={styles.sportTopRow}>
                              <Text style={styles.sportName}>{stat.sport.name}</Text>
                              <Text style={[styles.sportPct, { color: sc }]}>{pct}%</Text>
                            </View>
                            <View style={styles.progressBg}>
                              <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: sc }]} />
                            </View>
                            <Text style={styles.sportSub}>{stat.matches_played} matchs \u00b7 {stat.wins}V {stat.losses}D</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </>
        )}

        {activeTab === 'history' && (
          <HistoryTab history={history} loading={histLoading} />
        )}
      </ScrollView>
    </View>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const KeyStat: React.FC<{ value: number; label: string; accent?: string }> = ({ value, label, accent }) => (
  <View style={styles.keyStat}>
    <Text style={[styles.keyStatValue, accent ? { color: accent } : {}]}>{value}</Text>
    <Text style={styles.keyStatLabel}>{label}</Text>
  </View>
);

const SectionLabel: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <View style={styles.sectionLabel}>
    <View style={styles.sectionLabelIcon}>{icon}</View>
    <Text style={styles.sectionLabelText}>{label}</Text>
  </View>
);

const MetricCard: React.FC<{ value: number; label: string; color: string }> = ({ value, label, color }) => (
  <View style={styles.metricCard}>
    <Text style={[styles.metricValue, { color }]}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

// ─── History tab ──────────────────────────────────────────────────────────────

const HIST_MAX_H = 88;

const HistoryTab: React.FC<{ history: UserStatHistory[]; loading: boolean }> = ({ history, loading }) => {
  const recent = history.slice(-10).reverse();
  const animsRef = useRef<Animated.Value[]>([]);
  if (animsRef.current.length !== recent.length) {
    animsRef.current = recent.map(() => new Animated.Value(0));
  }
  const anims = animsRef.current;

  useEffect(() => {
    Animated.stagger(50, anims.map(a =>
      Animated.spring(a, { toValue: 1, useNativeDriver: false, friction: 8, tension: 60 })
    )).start();
  }, [recent.length]);

  const getScore = (h: UserStatHistory) => h.stats_json?.points ?? h.stats_json?.goals ?? 0;
  const maxScore = Math.max(...recent.map(getScore), 1);

  const resultColor = (r?: string) =>
    r === 'win' ? colors.success : r === 'loss' ? colors.danger : colors.muted;

  if (loading) return (
    <View style={styles.histEmpty}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  if (recent.length === 0) return (
    <View style={styles.histEmpty}>
      <Clock size={36} color={colors.border} strokeWidth={1.5} />
      <Text style={styles.histEmptyTitle}>Aucun historique</Text>
      <Text style={styles.histEmptySub}>Jouez des matchs pour voir votre progression ici.</Text>
    </View>
  );

  return (
    <View>
      {/* Bar chart */}
      <SectionLabel icon={<BarChart2 size={13} color={colors.primary} strokeWidth={2} />} label="10 derniers matchs" />
      <View style={styles.card}>
        <View style={styles.histChart}>
          {recent.map((h, i) => {
            const score = getScore(h);
            const bc = resultColor(h.stats_json?.result);
            return (
              <View key={h.id} style={styles.histBarCol}>
                <Text style={[styles.histBarVal, { color: bc }]}>{score > 0 ? score : ''}</Text>
                <Animated.View
                  style={[styles.histBar, {
                    backgroundColor: `${bc}22`,
                    borderTopColor: bc,
                    height: anims[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, Math.max(6, (score / maxScore) * HIST_MAX_H)],
                    }),
                  }]}
                />
                <Text style={styles.histBarDate} numberOfLines={1}>
                  {new Date(h.played_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                </Text>
              </View>
            );
          })}
        </View>
        <View style={styles.histBarLegend}>
          {[{ c: colors.success, l: 'Victoire' }, { c: colors.danger, l: 'D\u00e9faite' }, { c: colors.muted, l: 'Nul' }].map(x => (
            <View key={x.l} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: x.c }]} />
              <Text style={styles.legendText}>{x.l}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* List */}
      <SectionLabel icon={<History size={13} color={colors.primary} strokeWidth={2} />} label="D\u00e9tail" />
      <View style={styles.card}>
        {recent.map((h, idx) => {
          const rc = resultColor(h.stats_json?.result);
          const rLabel = h.stats_json?.result === 'win' ? 'V'
            : h.stats_json?.result === 'loss' ? 'D' : 'N';
          const statsLine = [
            h.stats_json?.goals && `${h.stats_json.goals} buts`,
            h.stats_json?.points && `${h.stats_json.points} pts`,
            h.stats_json?.assists && `${h.stats_json.assists} ast`,
            h.stats_json?.rebounds && `${h.stats_json.rebounds} reb`,
          ].filter(Boolean).join(' \u00b7 ');

          return (
            <View key={h.id}>
              {idx > 0 && <View style={styles.divider} />}
              <View style={styles.histListRow}>
                <View style={[styles.histResultBadge, { backgroundColor: `${rc}18` }]}>
                  <Text style={[styles.histResultLetter, { color: rc }]}>{rLabel}</Text>
                </View>
                <View style={styles.histListInfo}>
                  <Text style={styles.histListDate}>
                    {new Date(h.played_at).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </Text>
                  <Text style={styles.histListStats}>{statsLine || 'Pas de statistiques'}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

  // Hero
  hero: {
    backgroundColor: colors.navy,
    paddingTop: Platform.OS === 'android' ? spacing.xl + 4 : spacing.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  mvpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  mvpPillText: { fontSize: 11, fontWeight: '700', color: '#F59E0B' },

  heroBody: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },

  ringArea: { alignItems: 'center', gap: spacing.sm },
  ringBg: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringFill: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navySoft,
  },
  ringRate: { fontSize: 30, fontWeight: '800', color: '#FFFFFF', letterSpacing: -1 },
  ringPct: { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  ringLabel: { fontSize: 8, fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: 1.2, marginTop: 2 },
  performancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  performanceDot: { width: 6, height: 6, borderRadius: 3 },
  performanceText: { fontSize: 11, fontWeight: '700' },

  keyStats: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: spacing.md,
  },
  keyStat: { flex: 1, alignItems: 'center', gap: 4 },
  keyStatValue: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  keyStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: '500' },
  keyStatSep: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.1)' },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    gap: 0,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: { borderBottomColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.muted },
  tabTextActive: { color: colors.primary },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: 48 },

  // Card / section
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...shadows.subtle,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderLight,
    marginLeft: spacing.md,
  },

  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionLabelIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabelText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },

  // Metrics grid
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  metricCard: {
    width: '31%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: 3,
    ...shadows.subtle,
  },
  metricValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  metricLabel: { fontSize: 11, color: colors.muted, fontWeight: '500' },

  // Chart
  chartWrap: { padding: spacing.md },
  chartArea: {
    height: CHART_HEIGHT + 20,
    position: 'relative',
    marginBottom: spacing.sm,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  chartDot: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.surface,
    marginLeft: -4.5,
    marginBottom: -4.5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  chartLegend: { flexDirection: 'row', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 3.5 },
  legendText: { fontSize: 11, color: colors.muted, fontWeight: '500' },

  // Sport rows
  sportRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    gap: spacing.md,
  },
  sportDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  sportInfo: { flex: 1, gap: 6 },
  sportTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sportName: { fontSize: 14, fontWeight: '600', color: colors.text },
  sportPct: { fontSize: 14, fontWeight: '800' },
  sportSub: { fontSize: 11, color: colors.muted },
  progressBg: { height: 5, backgroundColor: colors.borderLight, borderRadius: radius.pill, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.pill },

  // History chart
  histChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: HIST_MAX_H + 36,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.lg,
    gap: 3,
  },
  histBarCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  histBarVal: { fontSize: 9, fontWeight: '700', marginBottom: 3 },
  histBar: {
    width: '82%',
    borderTopWidth: 2,
    borderRadius: 3,
    minHeight: 6,
  },
  histBarDate: { fontSize: 8, color: colors.muted, marginTop: 4, fontWeight: '500' },
  histBarLegend: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },

  // History list
  histListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    gap: spacing.md,
  },
  histResultBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  histResultLetter: { fontSize: 15, fontWeight: '800' },
  histListInfo: { flex: 1, gap: 2 },
  histListDate: { fontSize: 13, fontWeight: '600', color: colors.text },
  histListStats: { fontSize: 12, color: colors.muted },

  // Empty state
  histEmpty: {
    paddingTop: 64,
    alignItems: 'center',
    gap: spacing.md,
  },
  histEmptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  histEmptySub: { fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 20, maxWidth: 220 },
});
