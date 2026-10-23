import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Animated,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import {
  Search,
  MapPin,
  Star,
  Zap,
  Car,
  Users,
  Shield,
  SlidersHorizontal,
  X,
  ChevronRight,
  ArrowLeft,
  Check,
  Plus,
} from 'lucide-react-native';
import { colors } from '../../../theme/colors';
import { radius, shadows, spacing } from '../../../theme/spacing';
import {
  Venue,
  VenueFilters,
  venueApi,
  formatPrice,
  formatRating,
  SPORT_DISPLAY,
} from '../api/venueApi';
import { VenueDetailSheet } from '../components/VenueDetailSheet';
import { VenueFormModal } from '../components/VenueFormModal';

// ── Types ──────────────────────────────────────────────────────────────────────

interface VenuesScreenProps {
  onNavigateBack?: () => void;
}

// ── Constantes ────────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: 'rating',     label: '⭐ Mieux notés' },
  { value: 'popular',    label: '🔥 Populaires' },
  { value: 'price_asc',  label: '💰 Prix croissant' },
  { value: 'price_desc', label: '💰 Prix décroissant' },
];

const SPORT_FILTERS = [
  { value: '',              label: 'Tous les sports', emoji: '🏅' },
  { value: 'football',      label: 'Football',        emoji: '⚽' },
  { value: 'football5',     label: 'Foot 5',          emoji: '🏟️' },
  { value: 'basketball',    label: 'Basketball',      emoji: '🏀' },
  { value: 'volleyball',    label: 'Volleyball',      emoji: '🏐' },
  { value: 'table_tennis',  label: 'Ping-Pong',       emoji: '🏓' },
];

// ── Card d'un terrain ─────────────────────────────────────────────────────────

const VenueCard = React.memo(({
  venue,
  onPress,
}: {
  venue: Venue;
  onPress: () => void;
}) => {
  // Premier sport du terrain
  const primarySport = venue.sports[0];
  const sportInfo = primarySport ? SPORT_DISPLAY[primarySport] : null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Bande de couleur sport */}
      <View style={[styles.cardAccent, { backgroundColor: sportInfo?.color ?? colors.primary }]} />

      <View style={styles.cardBody}>
        {/* En-tête */}
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardName} numberOfLines={1}>{venue.name}</Text>
            {venue.is_verified && (
              <View style={styles.verifiedDot}>
                <Check size={9} color="#FFF" strokeWidth={3} />
              </View>
            )}
          </View>

          <View style={styles.cardMeta}>
            <MapPin size={11} color={colors.muted} />
            <Text style={styles.cardDistrict} numberOfLines={1}>
              {venue.district}
            </Text>
          </View>
        </View>

        {/* Infos clés */}
        <View style={styles.cardInfoRow}>
          <View style={styles.cardInfoItem}>
            <Star size={12} color="#EAB308" fill="#EAB308" />
            <Text style={styles.cardInfoText}>{formatRating(venue.rating)}</Text>
          </View>
          <Text style={styles.cardInfoSep}>·</Text>
          <Text style={styles.cardInfoText}>
            {venue.surface_label}
          </Text>
          <Text style={styles.cardInfoSep}>·</Text>
          {venue.is_indoor ? (
            <><Shield size={11} color={colors.primary} /><Text style={[styles.cardInfoText, { color: colors.primary }]}> Couvert</Text></>
          ) : (
            <Text style={styles.cardInfoText}>Extérieur</Text>
          )}
        </View>

        {/* Tags sports */}
        <View style={styles.cardSportsRow}>
          {venue.sports.slice(0, 3).map((s) => {
            const info = SPORT_DISPLAY[s];
            return (
              <View key={s} style={[styles.sportTag, { borderColor: (info?.color ?? colors.primary) + '55' }]}>
                <Text style={styles.sportTagText}>{info?.emoji ?? '🏅'} {info?.label ?? s}</Text>
              </View>
            );
          })}
          {venue.sports.length > 3 && (
            <View style={styles.sportTag}>
              <Text style={styles.sportTagText}>+{venue.sports.length - 3}</Text>
            </View>
          )}
        </View>

        {/* Footer prix + équipements */}
        <View style={styles.cardFooter}>
          <View style={styles.cardEquipRow}>
            {venue.has_lighting && <Zap size={13} color="#EAB308" />}
            {venue.has_changing_rooms && <Users size={13} color={colors.primary} />}
            {venue.has_parking && <Car size={13} color="#10B981" />}
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceText}>{formatPrice(venue.price_per_hour)}</Text>
            <ChevronRight size={14} color={colors.mutedLight} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ── Écran principal ────────────────────────────────────────────────────────────

export const VenuesScreen: React.FC<VenuesScreenProps> = ({ onNavigateBack }) => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedVenueId, setSelectedVenueId] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showVenueForm, setShowVenueForm] = useState(false);
  const [venueToEdit, setVenueToEdit] = useState<Venue | null>(null);

  // Filtres actifs
  const [activeSport, setActiveSport] = useState('');
  const [activeSort, setActiveSort] = useState<VenueFilters['sort']>('rating');
  const [onlyLighting, setOnlyLighting] = useState(false);
  const [onlyChangingRooms, setOnlyChangingRooms] = useState(false);
  const [onlyParking, setOnlyParking] = useState(false);
  const [onlyIndoor, setOnlyIndoor] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const buildFilters = useCallback((): VenueFilters => ({
    search: search.trim() || undefined,
    sport: activeSport || undefined,
    sort: activeSort,
    lighting: onlyLighting || undefined,
    changing_rooms: onlyChangingRooms || undefined,
    indoor: onlyIndoor || undefined,
  }), [search, activeSport, activeSort, onlyLighting, onlyChangingRooms, onlyIndoor]);

  const fetchVenues = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await venueApi.getVenues(buildFilters());
      setVenues(res.data);
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    } catch {
      // silencieux
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [buildFilters]);

  useEffect(() => {
    fadeAnim.setValue(0);
    const t = setTimeout(() => fetchVenues(), search ? 400 : 0);
    return () => clearTimeout(t);
  }, [activeSport, activeSort, onlyLighting, onlyChangingRooms, onlyIndoor, search]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchVenues(true);
  };

  // Nombre de filtres actifs
  const activeFilterCount = [onlyLighting, onlyChangingRooms, onlyParking, onlyIndoor].filter(Boolean).length;

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        {onNavigateBack && (
          <TouchableOpacity onPress={onNavigateBack} style={styles.backBtn}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
        )}
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>Annuaire des Terrains</Text>
          <Text style={styles.headerSub}>Madagascar · {venues.length} complexes</Text>
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
          onPress={() => setShowFilters((v) => !v)}
        >
          <SlidersHorizontal size={16} color={activeFilterCount > 0 ? '#FFF' : colors.text} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.addHeaderBtn}
          onPress={() => {
            setVenueToEdit(null);
            setShowVenueForm(true);
          }}
          activeOpacity={0.8}
        >
          <Plus size={15} color="#FFF" />
          <Text style={styles.addHeaderBtnText}>Ajouter</Text>
        </TouchableOpacity>
      </View>

      {/* ── Barre de recherche ── */}
      <View style={styles.searchBar}>
        <Search size={16} color={colors.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un terrain, quartier…"
          placeholderTextColor={colors.mutedLight}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <X size={16} color={colors.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Filtres sport (horizontaux) ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sportChipsScroll}
        style={styles.sportChipsContainer}
      >
        {SPORT_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.sportChip, activeSport === f.value && styles.sportChipActive]}
            onPress={() => setActiveSport(activeSport === f.value ? '' : f.value)}
          >
            <Text style={styles.sportChipEmoji}>{f.emoji}</Text>
            <Text style={[styles.sportChipLabel, activeSport === f.value && styles.sportChipLabelActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Panneau de filtres avancés ── */}
      {showFilters && (
        <View style={styles.filtersPanel}>
          {/* Sort */}
          <Text style={styles.filtersPanelLabel}>TRI</Text>
          <View style={styles.filtersPanelRow}>
            {SORT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.sortChip, activeSort === opt.value && styles.sortChipActive]}
                onPress={() => setActiveSort(opt.value as VenueFilters['sort'])}
              >
                <Text style={[styles.sortChipText, activeSort === opt.value && styles.sortChipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Equipment toggles */}
          <Text style={[styles.filtersPanelLabel, { marginTop: 10 }]}>ÉQUIPEMENTS</Text>
          <View style={styles.filtersPanelRow}>
            {[
              { label: '⚡ Éclairage', state: onlyLighting, set: setOnlyLighting },
              { label: '👕 Vestiaires', state: onlyChangingRooms, set: setOnlyChangingRooms },
              { label: '🚗 Parking', state: onlyParking, set: setOnlyParking },
              { label: '🏠 Couvert', state: onlyIndoor, set: setOnlyIndoor },
            ].map((f) => (
              <TouchableOpacity
                key={f.label}
                style={[styles.toggleChip, f.state && styles.toggleChipActive]}
                onPress={() => f.set((v) => !v)}
              >
                {f.state && <Check size={11} color={colors.primary} strokeWidth={3} />}
                <Text style={[styles.toggleChipText, f.state && styles.toggleChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ── Liste ── */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>Chargement des terrains…</Text>
        </View>
      ) : (
        <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
          <FlatList
            data={venues}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <VenueCard venue={item} onPress={() => setSelectedVenueId(item.id)} />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyEmoji}>🏟️</Text>
                <Text style={styles.emptyTitle}>Aucun terrain trouvé</Text>
                <Text style={styles.emptySub}>
                  Essayez d'élargir votre recherche ou de modifier les filtres.
                </Text>
                <TouchableOpacity
                  style={styles.emptyAddBtn}
                  onPress={() => {
                    setVenueToEdit(null);
                    setShowVenueForm(true);
                  }}
                  activeOpacity={0.85}
                >
                  <Plus size={16} color="#FFF" />
                  <Text style={styles.emptyAddBtnText}>Ajouter un terrain</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </Animated.View>
      )}

      {/* ── Floating Action Button (Ajouter) ── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setVenueToEdit(null);
          setShowVenueForm(true);
        }}
        activeOpacity={0.85}
      >
        <Plus size={18} color="#FFF" strokeWidth={2.5} />
        <Text style={styles.fabText}>Ajouter un terrain</Text>
      </TouchableOpacity>

      {/* ── Detail sheet ── */}
      <VenueDetailSheet
        venueId={selectedVenueId}
        onClose={() => setSelectedVenueId(null)}
        onEdit={(venue) => {
          setVenueToEdit(venue);
          setShowVenueForm(true);
        }}
      />

      {/* ── Form Modal (Add / Edit) ── */}
      <VenueFormModal
        visible={showVenueForm}
        onClose={() => {
          setShowVenueForm(false);
          setVenueToEdit(null);
        }}
        venueToEdit={venueToEdit}
        onSuccess={() => fetchVenues(true)}
      />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: 52,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitles: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  headerSub: { fontSize: 12, color: colors.muted },
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: { fontSize: 8, fontWeight: '800', color: '#FFF' },
  addHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.md,
  },
  addHeaderBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    padding: 0,
  },

  // Sport chips
  sportChipsContainer: { maxHeight: 48 },
  sportChipsScroll: {
    paddingHorizontal: spacing.md,
    gap: 8,
    alignItems: 'center',
    paddingVertical: 4,
  },
  sportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sportChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sportChipEmoji: { fontSize: 13 },
  sportChipLabel: { fontSize: 12, fontWeight: '600', color: colors.text },
  sportChipLabelActive: { color: '#FFF' },

  // Filters panel
  filtersPanel: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginBottom: 8,
    borderRadius: radius.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  filtersPanelLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.muted,
    letterSpacing: 1,
    marginBottom: 6,
  },
  filtersPanelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  sortChipText: { fontSize: 11, fontWeight: '600', color: colors.text },
  sortChipTextActive: { color: '#FFF' },
  toggleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleChipActive: {
    backgroundColor: 'rgba(20,86,217,0.08)',
    borderColor: colors.primary,
  },
  toggleChipText: { fontSize: 11, fontWeight: '600', color: colors.text },
  toggleChipTextActive: { color: colors.primary },

  // List
  listContent: {
    padding: spacing.md,
    paddingBottom: 80,
  },

  // Venue card
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardAccent: { width: 5 },
  cardBody: { flex: 1, padding: spacing.sm },
  cardHeader: { marginBottom: 5 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  cardName: { fontSize: 14, fontWeight: '800', color: colors.text, flex: 1 },
  verifiedDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cardDistrict: { fontSize: 11, color: colors.muted, flex: 1 },
  cardInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  cardInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cardInfoText: { fontSize: 11, color: colors.textSecondary },
  cardInfoSep: { fontSize: 11, color: colors.mutedLight },
  cardSportsRow: { flexDirection: 'row', gap: 5, flexWrap: 'wrap', marginBottom: 8 },
  sportTag: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sportTagText: { fontSize: 10, fontWeight: '700', color: colors.textSecondary },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardEquipRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  priceText: { fontSize: 12, fontWeight: '800', color: colors.primary },

  // Loading / empty
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 40,
  },
  loadingText: { fontSize: 14, color: colors.muted },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  emptySub: { fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 18 },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  emptyAddBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.pill,
    ...shadows.floating,
    elevation: 6,
  },
  fabText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
