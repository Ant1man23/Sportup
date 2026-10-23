import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  RefreshControl,
} from 'react-native';
import {
  Search,
  Trophy,
  Bell,
  Map,
  List,
  SlidersHorizontal,
  CalendarX2,
  Calendar as CalendarIcon,
  Sparkles,
  Plus,
  MessageCircle,
  Clock,
  MapPin,
  ChevronRight,
} from 'lucide-react-native';
import { colors } from '../../../theme/colors';
import { radius, shadows, spacing } from '../../../theme/spacing';
import { SessionCard } from '../../sessions/components/SessionCard';
import { Session, sessionsApi } from '../../sessions/api/sessionsApi';
import { useAuthStore } from '../../../store/useAuthStore';
import { apiClient } from '../../../api/client';
import { GoogleMapsView } from '../../../components/GoogleMapsView';
import { DisciplineSelector } from '../../../components/DisciplineSelector';
import { notificationPolling } from '../../../services/notificationPolling';

interface HomeScreenProps {
  onSelectSession: (id: number) => void;
  onNavigateExplore: () => void;
  onNavigateTournaments: () => void;
  onNavigateNotifications: () => void;
  onNavigateCalendar?: () => void;
  onNavigateConversations?: () => void;
  onNavigateVenues?: () => void;
}

interface SportCategory {
  id: number;
  name: string;
  slug: string;
  color_hex?: string;
}

const DEFAULT_LAT = -18.8792;
const DEFAULT_LNG = 47.5079;

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onSelectSession,
  onNavigateExplore,
  onNavigateTournaments,
  onNavigateNotifications,
  onNavigateCalendar,
  onNavigateConversations,
  onNavigateVenues,
}) => {
  const user = useAuthStore((state) => state.user);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sports, setSports] = useState<SportCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSportFilter, setSelectedSportFilter] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  const greetingAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Récupération du nombre réel de notifications non lues
  const fetchNotificationsCount = async () => {
    try {
      const res = await apiClient.get<{ unread_count?: number }>('/notifications');
      if (res.data && typeof res.data.unread_count === 'number') {
        setUnreadNotifs(res.data.unread_count);
      }
    } catch {
      // Échec silencieux
    }
  };

  // Pulse animation for notification badge
  useEffect(() => {
    if (unreadNotifs > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [unreadNotifs]);

  // Écoute des nouvelles notifications reçues au premier plan
  useEffect(() => {
    fetchNotificationsCount();
    const unsubscribePolling = notificationPolling.onForegroundNotification(() => {
      fetchNotificationsCount();
    });
    return () => {
      unsubscribePolling();
    };
  }, []);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

  useEffect(() => {
    Animated.timing(greetingAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const fetchSports = async () => {
    try {
      const res = await apiClient.get<SportCategory[]>('/sports');
      if (Array.isArray(res.data)) {
        setSports(res.data);
      }
    } catch {
      setSports([
        { id: 1, name: 'Football 11', slug: 'football-11', color_hex: '#1456D9' },
        { id: 2, name: 'Football 5', slug: 'football-5', color_hex: '#0F44B3' },
        { id: 3, name: 'Basket 5×5', slug: 'basketball-5x5', color_hex: '#F28B2E' },
        { id: 4, name: 'Basket 3×3', slug: 'basketball-3x3', color_hex: '#E06D12' },
        { id: 5, name: 'Volleyball', slug: 'volleyball', color_hex: '#10B981' },
        { id: 6, name: 'Tennis de table', slug: 'tennis-de-table', color_hex: '#8B5CF6' },
      ]);
    }
  };

  const fetchNearbySessions = async () => {
    try {
      setLoading(true);
      const res = await sessionsApi.listSessions({
        lat: DEFAULT_LAT,
        lng: DEFAULT_LNG,
        radius: 20,
        sport_id: selectedSportFilter || undefined,
      });
      const listData = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setSessions(listData);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchSports(), fetchNearbySessions(), fetchNotificationsCount()]);
    setRefreshing(false);
  };

  useEffect(() => { fetchSports(); }, []);
  useEffect(() => { fetchNearbySessions(); }, [selectedSportFilter]);

  // Upcoming sessions: next 3 sorted by session_date + start_time
  const upcomingSessions = [...sessions]
    .filter((s) => s.status === 'open' || s.status === 'scheduled')
    .sort((a, b) => {
      const da = `${a.session_date} ${a.start_time}`;
      const db = `${b.session_date} ${b.start_time}`;
      return da.localeCompare(db);
    })
    .slice(0, 3);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >

      {/* ── TOP HEADER ── */}
      <Animated.View style={[styles.header, { opacity: greetingAnim }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>{greeting}, {user?.username || 'Sportif'}</Text>
          <Text style={styles.title}>Trouve ta session</Text>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={onNavigateTournaments}
            activeOpacity={0.8}
          >
            <Trophy size={18} color={colors.navy} strokeWidth={2} />
          </TouchableOpacity>

          {onNavigateVenues && (
            <TouchableOpacity
              style={styles.headerActionBtn}
              onPress={onNavigateVenues}
              activeOpacity={0.8}
            >
              <Map size={18} color={colors.navy} strokeWidth={2} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => { setUnreadNotifs(0); onNavigateNotifications(); }}
            activeOpacity={0.8}
          >
            <Bell size={18} color={colors.navy} strokeWidth={2} />
            {unreadNotifs > 0 && (
              <Animated.View style={[styles.notifBadge, { transform: [{ scale: pulseAnim }] }]}>
                <Text style={styles.notifBadgeText}>
                  {unreadNotifs > 9 ? '9+' : unreadNotifs}
                </Text>
              </Animated.View>
            )}
          </TouchableOpacity>

          {onNavigateCalendar && (
            <TouchableOpacity
              style={styles.headerActionBtn}
              onPress={onNavigateCalendar}
              activeOpacity={0.8}
            >
              <CalendarIcon size={18} color={colors.navy} strokeWidth={2} />
            </TouchableOpacity>
          )}

          {onNavigateConversations && (
            <TouchableOpacity
              style={styles.headerActionBtn}
              onPress={onNavigateConversations}
              activeOpacity={0.8}
            >
              <MessageCircle size={18} color={colors.navy} strokeWidth={2} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.mapToggleBtn}
            onPress={() => setShowMap((v) => !v)}
            activeOpacity={0.85}
          >
            {showMap ? (
              <List size={18} color="#FFFFFF" strokeWidth={2.4} />
            ) : (
              <Map size={18} color="#FFFFFF" strokeWidth={2.4} />
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ── SEARCH BAR ── */}
      <TouchableOpacity activeOpacity={0.9} onPress={onNavigateExplore} style={styles.searchWrapper}>
        <View style={styles.searchBar}>
          <Search size={18} color={colors.muted} strokeWidth={2} style={styles.searchIcon} />
          <Text style={styles.searchPlaceholder}>Rechercher par sport, ville ou quartier...</Text>
          <View style={styles.filterIconBox}>
            <SlidersHorizontal size={15} color={colors.primary} strokeWidth={2} />
          </View>
        </View>
      </TouchableOpacity>

      {/* ── CHOISIS TA DISCIPLINE ── */}
      <DisciplineSelector
        selectedSportId={selectedSportFilter}
        onSelectSport={(discipline) => {
          setSelectedSportFilter(selectedSportFilter === discipline.id ? null : discipline.id);
        }}
      />

      {/* ── GOOGLE MAPS VIEW (sessions sur carte) ── */}
      {showMap && (
        <View style={styles.mapSection}>
          <View style={styles.mapHeaderRow}>
            <Text style={styles.mapSectionLabel}>Terrains & sessions autour de toi</Text>
            {sessions.length > 0 && (
              <Text style={styles.mapSessionCountBadge}>
                {sessions.length} trouvée{sessions.length > 1 ? 's' : ''}
              </Text>
            )}
          </View>
          <GoogleMapsView
            latitude={DEFAULT_LAT}
            longitude={DEFAULT_LNG}
            title="Antananarivo — Sessions sportives"
            address="Centre d'Antananarivo, Madagascar"
            sportColor={colors.primary}
            height={220}
            interactive={true}
          />
        </View>
      )}

      {/* ── SPORT FILTER CHIPS ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScrollView}
        contentContainerStyle={styles.filterRow}
      >
        <TouchableOpacity
          onPress={() => setSelectedSportFilter(null)}
          style={[styles.chip, selectedSportFilter === null && styles.chipActive]}
          activeOpacity={0.8}
        >
          <Sparkles
            size={13}
            color={selectedSportFilter === null ? '#FFFFFF' : colors.primary}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.chipText, selectedSportFilter === null && styles.chipTextActive]}>
            Tous les sports
          </Text>
        </TouchableOpacity>

        {sports.map((sport) => {
          const isSelected = selectedSportFilter === sport.id;
          const chipColor = sport.color_hex || colors.primary;
          return (
            <TouchableOpacity
              key={sport.id}
              onPress={() => setSelectedSportFilter(sport.id)}
              style={[
                styles.chip,
                isSelected && { backgroundColor: chipColor, borderColor: chipColor }
              ]}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.chipDot,
                  { backgroundColor: isSelected ? '#FFFFFF' : chipColor }
                ]}
              />
              <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                {sport.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── MATCHDAY BANNER (upcoming sessions) ── */}
      {upcomingSessions.length > 0 && (
        <View style={styles.matchdaySection}>
          <View style={styles.matchdaySectionHeader}>
            <View style={styles.matchdayLiveDot} />
            <Text style={styles.matchdaySectionTitle}>Prochains matchs</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.matchdayRow}>
            {upcomingSessions.map((sess) => {
              const sportColor = sess.sport.color_hex || colors.primary;
              const spotsLeft = sess.max_participants - sess.current_participants;
              return (
                <TouchableOpacity
                  key={sess.id}
                  style={[styles.matchdayCard, { borderTopColor: sportColor }]}
                  onPress={() => onSelectSession(sess.id)}
                  activeOpacity={0.88}
                >
                  <View style={[styles.matchdayCardSportTag, { backgroundColor: `${sportColor}18` }]}>
                    <Text style={[styles.matchdayCardSportText, { color: sportColor }]}>
                      {sess.sport.name.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.matchdayCardFormat}>
                    {sess.format || 'Partie libre'}
                  </Text>
                  <View style={styles.matchdayCardMeta}>
                    <Clock size={11} color={colors.muted} style={{ marginRight: 4 }} />
                    <Text style={styles.matchdayCardMetaText}>
                      {sess.start_time?.substring(0, 5)}
                    </Text>
                  </View>
                  <View style={styles.matchdayCardMeta}>
                    <MapPin size={11} color={colors.muted} style={{ marginRight: 4 }} />
                    <Text style={styles.matchdayCardMetaText} numberOfLines={1}>
                      {sess.city || 'Antananarivo'}
                    </Text>
                  </View>
                  <View style={styles.matchdayCardFooter}>
                    <Text style={[
                      styles.matchdayCardSpots,
                      { color: spotsLeft === 0 ? colors.danger : colors.success }
                    ]}>
                      {spotsLeft === 0 ? 'Complet' : `${spotsLeft} place${spotsLeft > 1 ? 's' : ''}`}
                    </Text>
                    <ChevronRight size={14} color={colors.muted} strokeWidth={2.5} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── ATHLETIC STATS BANNER ── */}
      <View style={styles.quickStatsBanner}>
        <View style={styles.quickStat}>
          <Text style={styles.quickStatValue}>{sessions.length}</Text>
          <Text style={styles.quickStatLabel}>Sessions actives</Text>
        </View>
        <View style={styles.quickStatDivider} />
        <View style={styles.quickStat}>
          <Text style={styles.quickStatValue}>20 km</Text>
          <Text style={styles.quickStatLabel}>Rayon de recherche</Text>
        </View>
        <View style={styles.quickStatDivider} />
        <View style={styles.quickStat}>
          <Text style={[styles.quickStatValue, { color: '#34D399' }]}>
            {sessions.filter(s => s.current_participants < s.max_participants).length}
          </Text>
          <Text style={styles.quickStatLabel}>Places ouvertes</Text>
        </View>
      </View>

      {/* ── SECTION HEADER ── */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Sessions près de toi</Text>
          <Text style={styles.sectionSubtitle}>Rejoins un match ouvert ou réserve ta place</Text>
        </View>
        <TouchableOpacity
          style={styles.createQuickBtn}
          onPress={onNavigateExplore}
          activeOpacity={0.8}
        >
          <Plus size={14} color={colors.primary} strokeWidth={2.5} style={{ marginRight: 4 }} />
          <Text style={styles.createQuickBtnText}>Organiser</Text>
        </TouchableOpacity>
      </View>

      {/* ── SESSIONS LIST ── */}
      {loading ? (
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loaderText}>Recherche des sessions disponibles...</Text>
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.emptyBox}>
          <View style={styles.emptyIconCircle}>
            <CalendarX2 size={28} color={colors.muted} strokeWidth={1.8} />
          </View>
          <Text style={styles.emptyTitle}>Aucune session disponible</Text>
          <Text style={styles.emptySub}>
            Il n'y a pas encore de match prévu dans ce secteur. Sois le premier à en lancer un !
          </Text>
          <TouchableOpacity
            style={styles.emptyCreateBtn}
            onPress={onNavigateExplore}
            activeOpacity={0.88}
          >
            <Plus size={16} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 6 }} />
            <Text style={styles.emptyCreateBtnText}>Créer une session</Text>
          </TouchableOpacity>
        </View>
      ) : (
        sessions.map((sess) => (
          <SessionCard
            key={sess.id}
            session={sess}
            onPress={() => onSelectSession(sess.id)}
            onJoin={() => onSelectSession(sess.id)}
            isJoined={sess.participants?.some((p) => p.id === user?.id)}
          />
        ))
      )}

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.navy,
    letterSpacing: -0.6,
    marginTop: 2,
  },

  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.subtle,
  },
  mapToggleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  // Search
  searchWrapper: {
    marginBottom: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    height: 48,
    ...shadows.subtle,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 14,
    color: colors.muted,
  },
  filterIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Map section
  mapSection: {
    marginBottom: spacing.lg,
  },
  mapHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
  },
  mapSectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy,
  },
  mapSessionCountBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },

  // Filters
  filterScrollView: {
    marginBottom: spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.subtle,
  },
  chipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },

  // Quick stats
  quickStatsBanner: {
    flexDirection: 'row',
    backgroundColor: colors.navy,
    borderRadius: radius.xl,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    ...shadows.card,
  },
  quickStat: {
    alignItems: 'center',
    flex: 1,
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  quickStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: 2,
    textAlign: 'center',
  },
  quickStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy,
    letterSpacing: -0.4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
  },
  createQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  createQuickBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },

  // Loader
  loaderBox: {
    alignItems: 'center',
    padding: spacing.xxl,
  },
  loaderText: {
    fontSize: 13,
    color: colors.muted,
    marginTop: spacing.sm,
  },

  // Notification badge
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.background,
    paddingHorizontal: 2,
  },
  notifBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Matchday section
  matchdaySection: {
    marginBottom: spacing.lg,
  },
  matchdaySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: 6,
  },
  matchdayLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  matchdaySectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.navy,
    letterSpacing: -0.3,
  },
  matchdayRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingRight: spacing.lg,
  },
  matchdayCard: {
    width: 150,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderTopWidth: 3,
    ...shadows.card,
    gap: 5,
  },
  matchdayCardSportTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
    marginBottom: 2,
  },
  matchdayCardSportText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  matchdayCardFormat: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.navy,
    letterSpacing: -0.2,
  },
  matchdayCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  matchdayCardMetaText: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '500',
    flex: 1,
  },
  matchdayCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 6,
  },
  matchdayCardSpots: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Empty
  emptyBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginTop: spacing.xs,
    ...shadows.subtle,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.navy,
    marginBottom: spacing.xs,
  },
  emptySub: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyCreateBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
