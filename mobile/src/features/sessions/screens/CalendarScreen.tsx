import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Trophy,
  Users,
  Sparkles,
} from 'lucide-react-native';
import { colors } from '../../../theme/colors';
import { radius, shadows, spacing } from '../../../theme/spacing';
import { Session, sessionsApi, CompetitionType } from '../api/sessionsApi';

interface CalendarScreenProps {
  onSelectSession: (id: number) => void;
  onNavigateBack?: () => void;
}

type CalendarViewMode = 'month' | 'week' | 'day';

export const CalendarScreen: React.FC<CalendarScreenProps> = ({
  onSelectSession,
  onNavigateBack,
}) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');

  // Selected date reference
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSportFilter, setSelectedSportFilter] = useState<number | null>(null);
  const [selectedCompetitionFilter, setSelectedCompetitionFilter] = useState<CompetitionType | 'all'>('all');

  const currentYear = selectedDate.getFullYear();
  const currentMonth = selectedDate.getMonth(); // 0-indexed

  const monthParam = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

  const fetchEncounters = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        month: monthParam,
      };
      if (selectedSportFilter) {
        params.sport_id = selectedSportFilter;
      }
      if (selectedCompetitionFilter !== 'all') {
        params.competition_type = selectedCompetitionFilter;
      }
      const data = await sessionsApi.getCalendar(params);
      setSessions(Array.isArray(data) ? data : []);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [monthParam, selectedSportFilter, selectedCompetitionFilter]);

  useEffect(() => {
    fetchEncounters();
  }, [fetchEncounters]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEncounters();
  };

  const handlePrevMonth = () => {
    const prev = new Date(selectedDate);
    prev.setMonth(prev.getMonth() - 1);
    setSelectedDate(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(selectedDate);
    next.setMonth(next.getMonth() + 1);
    setSelectedDate(next);
  };

  const monthLabel = selectedDate.toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });

  const selectedDateStr = selectedDate.toISOString().split('T')[0];

  // Sessions filtered by day when viewMode is 'day'
  const filteredSessions = sessions.filter((s) => {
    if (viewMode === 'day') {
      return s.session_date === selectedDateStr;
    }
    return true;
  });

  const formatCompetitionLabel = (type?: CompetitionType) => {
    switch (type) {
      case 'corporate': return 'Interentreprises';
      case 'tournament': return 'Tournoi';
      case 'championship': return 'Championnat';
      case 'school_university': return 'Scolaire / Univ.';
      case 'official': return 'Officiel';
      case 'community': return 'Communautaire';
      case 'friendly':
      default:
        return 'Amical';
    }
  };

  return (
    <View style={styles.container}>
      {/* ── HEADER ── */}
      <View style={styles.header}>
        {onNavigateBack ? (
          <TouchableOpacity onPress={onNavigateBack} style={styles.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={20} color={colors.navy} strokeWidth={2.4} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 38 }} />
        )}

        <View style={styles.headerTitleBox}>
          <Text style={styles.screenOverline}>CALENDRIER OFFICIEL</Text>
          <Text style={styles.screenTitle}>Agenda des rencontres</Text>
        </View>

        <View style={{ width: 38 }} />
      </View>

      {/* ── MONTH SELECTOR / DATE CONTROLS ── */}
      <View style={styles.monthControlCard}>
        <TouchableOpacity onPress={handlePrevMonth} style={styles.monthNavBtn} activeOpacity={0.7}>
          <ChevronLeft size={18} color={colors.navy} />
        </TouchableOpacity>

        <View style={styles.monthTextContainer}>
          <CalendarIcon size={14} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.monthLabel}>{monthLabel.toUpperCase()}</Text>
        </View>

        <TouchableOpacity onPress={handleNextMonth} style={styles.monthNavBtn} activeOpacity={0.7}>
          <ChevronRight size={18} color={colors.navy} />
        </TouchableOpacity>
      </View>

      {/* ── VIEW MODE SELECTOR (MOIS / JOUR) ── */}
      <View style={styles.viewModeRow}>
        <TouchableOpacity
          onPress={() => setViewMode('month')}
          style={[styles.viewModeBtn, viewMode === 'month' && styles.viewModeBtnActive]}
          activeOpacity={0.8}
        >
          <Text style={[styles.viewModeText, viewMode === 'month' && styles.viewModeTextActive]}>
            Vue du mois ({sessions.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setViewMode('day')}
          style={[styles.viewModeBtn, viewMode === 'day' && styles.viewModeBtnActive]}
          activeOpacity={0.8}
        >
          <Text style={[styles.viewModeText, viewMode === 'day' && styles.viewModeTextActive]}>
            Aujourd'hui
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── FILTRES SPORTS ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.filterChipsRow, { paddingBottom: 4 }]}
      >
        {[
          { id: null, label: 'Tous sports' },
          { id: 1, label: 'Football / Futsal' },
          { id: 3, label: 'Basketball' },
          { id: 5, label: 'Volleyball' },
          { id: 6, label: 'Tennis de table' },
        ].map((sp) => {
          const active = selectedSportFilter === sp.id;
          return (
            <TouchableOpacity
              key={sp.label}
              onPress={() => setSelectedSportFilter(sp.id)}
              style={[styles.chip, active && styles.chipActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{sp.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── FILTRES TYPES DE COMPÉTITION ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterChipsRow}
      >
        <TouchableOpacity
          onPress={() => setSelectedCompetitionFilter('all')}
          style={[styles.chip, selectedCompetitionFilter === 'all' && styles.chipActive]}
          activeOpacity={0.7}
        >
          <Sparkles size={11} color={selectedCompetitionFilter === 'all' ? '#FFFFFF' : colors.primary} style={{ marginRight: 4 }} />
          <Text style={[styles.chipText, selectedCompetitionFilter === 'all' && styles.chipTextActive]}>Toutes compétitions</Text>
        </TouchableOpacity>

        {[
          { key: 'friendly' as CompetitionType, label: 'Amicaux' },
          { key: 'tournament' as CompetitionType, label: 'Tournois' },
          { key: 'championship' as CompetitionType, label: 'Championnats' },
          { key: 'corporate' as CompetitionType, label: 'Entreprises' },
          { key: 'school_university' as CompetitionType, label: 'Universitaires' },
        ].map((c) => {
          const active = selectedCompetitionFilter === c.key;
          return (
            <TouchableOpacity
              key={c.key}
              onPress={() => setSelectedCompetitionFilter(c.key)}
              style={[styles.chip, active && styles.chipActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── LISTE DES RENCONTRES ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Chargement du calendrier...</Text>
          </View>
        ) : filteredSessions.length === 0 ? (
          <View style={styles.emptyCard}>
            <CalendarIcon size={32} color={colors.muted} strokeWidth={1.6} />
            <Text style={styles.emptyTitle}>Aucune rencontre programmée</Text>
            <Text style={styles.emptySub}>
              Aucun match ou tournoi ne correspond aux filtres pour cette période.
            </Text>
          </View>
        ) : (
          filteredSessions.map((session) => {
            const sportColor = session.sport?.color_hex || colors.primary;
            return (
              <TouchableOpacity
                key={session.id}
                style={styles.encounterCard}
                onPress={() => onSelectSession(session.id)}
                activeOpacity={0.88}
              >
                {/* Top strip with sport badge & competition type */}
                <View style={styles.cardHeader}>
                  <View style={styles.sportBadge}>
                    <View style={[styles.sportDot, { backgroundColor: sportColor }]} />
                    <Text style={[styles.sportBadgeText, { color: sportColor }]}>
                      {session.sport?.name?.toUpperCase()} • {session.format || 'STANDARD'}
                    </Text>
                  </View>

                  <View style={styles.competitionPill}>
                    <Trophy size={11} color={colors.navy} style={{ marginRight: 4 }} />
                    <Text style={styles.competitionPillText}>
                      {formatCompetitionLabel(session.competition_type)}
                    </Text>
                  </View>
                </View>

                {/* Match title */}
                <Text style={styles.encounterTitle} numberOfLines={2}>
                  {session.description || `${session.sport?.name} à ${session.city || 'Antananarivo'}`}
                </Text>

                {/* Metadata row: Date, Hour, Location in Madagascar */}
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <CalendarIcon size={12} color={colors.muted} style={{ marginRight: 4 }} />
                    <Text style={styles.metaText}>{session.session_date}</Text>
                  </View>

                  <View style={styles.metaDivider} />

                  <View style={styles.metaItem}>
                    <Clock size={12} color={colors.muted} style={{ marginRight: 4 }} />
                    <Text style={styles.metaText}>{session.start_time?.substring(0, 5) || '18:00'}</Text>
                  </View>

                  <View style={styles.metaDivider} />

                  <View style={[styles.metaItem, { flex: 1 }]}>
                    <MapPin size={12} color={colors.muted} style={{ marginRight: 4 }} />
                    <Text style={styles.metaText} numberOfLines={1}>
                      {session.location_details || session.address || session.city || 'Madagascar'}
                    </Text>
                  </View>
                </View>

                {/* Footer with participants & status */}
                <View style={styles.cardFooter}>
                  <View style={styles.participantsBadge}>
                    <Users size={12} color={colors.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.participantsText}>
                      {session.current_participants}/{session.max_participants} athlètes
                    </Text>
                  </View>

                  <View style={[
                    styles.statusPill,
                    session.status === 'in_progress' ? styles.statusLive : styles.statusScheduled
                  ]}>
                    <Text style={[
                      styles.statusPillText,
                      session.status === 'in_progress' ? styles.statusLiveText : styles.statusScheduledText
                    ]}>
                      {session.status === 'in_progress' ? 'EN DIRECT' : 'PROGRAMMÉ'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 44 : 16,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBox: {
    alignItems: 'center',
  },
  screenOverline: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1.2,
  },
  screenTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.navy,
    marginTop: 1,
  },
  monthControlCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  monthNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.navy,
    letterSpacing: 0.6,
  },
  viewModeRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    gap: 8,
  },
  viewModeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.pill,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  viewModeBtnActive: {
    backgroundColor: colors.navy,
  },
  viewModeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
  },
  viewModeTextActive: {
    color: '#FFFFFF',
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  chipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 48,
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 10,
    fontWeight: '500',
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 32,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginTop: 16,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.navy,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  encounterCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.subtle,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sportDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  sportBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  competitionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  competitionPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.navy,
  },
  encounterTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.navy,
    lineHeight: 20,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.border,
    marginHorizontal: 6,
  },
  metaText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  participantsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantsText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  statusScheduled: {
    backgroundColor: '#EFF6FF',
  },
  statusScheduledText: {
    color: '#1D4ED8',
    fontSize: 10,
    fontWeight: '800',
  },
  statusLive: {
    backgroundColor: '#FEF2F2',
  },
  statusLiveText: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: '800',
  },
  statusPillText: {
    letterSpacing: 0.5,
  },
});
