import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Modal,
  RefreshControl,
  Keyboard,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import {
  SlidersHorizontal,
  Activity,
  ChevronRight,
  ChevronLeft,
  Plus,
  MapPin,
  Clock,
  Sparkles,
  Map as MapIcon,
  List as ListIcon,
  X,
  Calendar,
  Users,
  Check,
  Compass,
} from 'lucide-react-native';
import { colors } from '../../../theme/colors';
import { radius, shadows, spacing } from '../../../theme/spacing';
import { Badge } from '../../../components/Badge';
import { Session, sessionsApi } from '../api/sessionsApi';
import { ENV } from '../../../config/env';
import {
  googleMapsService,
  PlacePrediction,
} from '../../../services/googleMapsService';

interface ExploreMapScreenProps {
  onSelectSession: (id: number) => void;
  onNavigateCreate: () => void;
  onNavigateBack?: () => void;
}

interface SelectedArea {
  name: string;
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
  isAllMadagascar?: boolean;
}

const DEFAULT_MADAGASCAR_AREA: SelectedArea = {
  name: 'Antananarivo',
  latitude: ENV.DEFAULT_LOCATION.latitude,
  longitude: ENV.DEFAULT_LOCATION.longitude,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
  isAllMadagascar: false,
};

const ALL_MADAGASCAR_AREA: SelectedArea = {
  name: 'Tout Madagascar',
  latitude: -18.7669,
  longitude: 46.8691,
  latitudeDelta: 8.5,
  longitudeDelta: 8.5,
  isAllMadagascar: true,
};

export const ExploreMapScreen: React.FC<ExploreMapScreenProps> = ({
  onSelectSession,
  onNavigateCreate,
  onNavigateBack,
}) => {
  const mapRef = useRef<MapView>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<Session | null>(null);

  // Vue, zone et ville sélectionnée
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [currentArea, setCurrentArea] = useState<SelectedArea>(DEFAULT_MADAGASCAR_AREA);

  // Recherche de villes & autocomplétion
  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchDebounce = useRef<NodeJS.Timeout | null>(null);

  // Filtres avancés
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  /**
   * Charger les sessions depuis l'API Laravel
   */
  const loadSessionsForArea = async (area: SelectedArea) => {
    try {
      setLoading(true);
      let res;
      if (area.isAllMadagascar) {
        // Charger toutes les sessions sans filtre de coordonnées fixes
        res = await sessionsApi.listSessions({
          all: true,
          per_page: 150,
        });
      } else {
        // Charger les sessions de la zone ou de la ville
        res = await sessionsApi.listSessions({
          lat: area.latitude,
          lng: area.longitude,
          radius: 35,
          city: area.name,
          per_page: 100,
        });
      }

      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setSessions(list);
      if (list.length > 0) {
        setActiveSession(list[0]);
      } else {
        setActiveSession(null);
      }
    } catch (err) {
      console.warn('Erreur chargement sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessionsForArea(currentArea);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSessionsForArea(currentArea);
    setRefreshing(false);
  };

  /**
   * Sélectionner et voler vers une ville / localité
   */
  const handleSelectArea = (area: SelectedArea) => {
    Keyboard.dismiss();
    setShowDropdown(false);
    setPredictions([]);
    setSearchQuery(area.isAllMadagascar ? '' : area.name);
    setCurrentArea(area);

    if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: area.latitude,
          longitude: area.longitude,
          latitudeDelta: area.latitudeDelta,
          longitudeDelta: area.longitudeDelta,
        },
        700
      );
    }

    loadSessionsForArea(area);
  };

  /**
   * Gestion de la saisie dans la barre de recherche
   */
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);

    if (searchDebounce.current) {
      clearTimeout(searchDebounce.current);
    }

    if (text.trim().length < 2) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    searchDebounce.current = setTimeout(async () => {
      setIsSearchingPlaces(true);
      try {
        const results = await googleMapsService.searchPlaces(text);
        setPredictions(results);
        setShowDropdown(results.length > 0);
      } catch (err) {
        console.warn('Place search error:', err);
      } finally {
        setIsSearchingPlaces(false);
      }
    }, 300);
  };

  /**
   * Clic sur une prédiction de ville / localité
   */
  const handleSelectPrediction = async (prediction: PlacePrediction) => {
    Keyboard.dismiss();
    setShowDropdown(false);
    setSearchQuery(prediction.primaryText);
    setIsSearchingPlaces(true);

    try {
      const details = await googleMapsService.getPlaceDetails(prediction.placeId);
      if (details) {
        const area: SelectedArea = {
          name: details.city || prediction.primaryText,
          latitude: details.latitude,
          longitude: details.longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
          isAllMadagascar: false,
        };
        handleSelectArea(area);
      } else {
        // Fallback geocode
        const geocoded = await googleMapsService.geocodeAddress(prediction.primaryText);
        if (geocoded) {
          const area: SelectedArea = {
            name: geocoded.city || prediction.primaryText,
            latitude: geocoded.latitude,
            longitude: geocoded.longitude,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
            isAllMadagascar: false,
          };
          handleSelectArea(area);
        }
      }
    } catch (err) {
      console.warn('Erreur sélection ville:', err);
    } finally {
      setIsSearchingPlaces(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setPredictions([]);
    setShowDropdown(false);
  };

  // Filtrage local complémentaire (sport, niveau, disponibilité, etc.)
  const filteredSessions = sessions.filter((s) => {
    if (selectedSport) {
      const slug = s.sport?.slug?.toLowerCase() || '';
      if (selectedSport === 'football') {
        if (!slug.includes('foot') && !slug.includes('futsal') && !slug.includes('soccer')) return false;
      } else if (selectedSport === 'basketball') {
        if (!slug.includes('basket') && !slug.includes('3x3')) return false;
      } else if (selectedSport === 'volleyball') {
        if (!slug.includes('volley')) return false;
      } else if (selectedSport === 'table_tennis') {
        if (!slug.includes('tennis-de-table') && !slug.includes('table-tennis') && !slug.includes('ping-pong')) return false;
      } else if (slug !== selectedSport) {
        return false;
      }
    }
    if (onlyAvailable && s.current_participants >= s.max_participants) {
      return false;
    }
    if (filterLevel !== 'all' && s.level !== filterLevel && s.level !== 'all') {
      return false;
    }
    return true;
  });

  const hasActiveFilters = filterLevel !== 'all' || onlyAvailable;

  const resetFilters = () => {
    setFilterLevel('all');
    setOnlyAvailable(false);
  };

  // Villes rapides populaires de Madagascar
  const QUICK_CITIES = [
    { label: 'Tout Madagascar', isAll: true },
    { label: 'Antananarivo', lat: -18.8792, lng: 47.5079 },
    { label: 'Toamasina', lat: -18.1492, lng: 49.4023 },
    { label: 'Mahajanga', lat: -15.7167, lng: 46.3167 },
    { label: 'Antsirabe', lat: -19.8659, lng: 47.0333 },
    { label: 'Fianarantsoa', lat: -21.4506, lng: 47.0826 },
    { label: 'Toliara', lat: -23.3516, lng: 43.6674 },
    { label: 'Antsiranana', lat: -12.2833, lng: 49.2833 },
    { label: 'Morondava', lat: -20.2887, lng: 44.2806 },
    { label: 'Nosy Be', lat: -13.3100, lng: 48.2600 },
  ];

  return (
    <View style={styles.container}>
      {/* ── CARTE GOOGLE MAPS ── */}
      {viewMode === 'map' && (
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{
            latitude: currentArea.latitude,
            longitude: currentArea.longitude,
            latitudeDelta: currentArea.latitudeDelta,
            longitudeDelta: currentArea.longitudeDelta,
          }}
          showsUserLocation
          showsMyLocationButton
          onPress={() => {
            if (showDropdown) setShowDropdown(false);
          }}
        >
          {filteredSessions.map((s) => {
            // Uniquement afficher les marqueurs avec de vraies coordonnées
            if (!s.latitude || !s.longitude) return null;

            const isSelected = activeSession?.id === s.id;
            const isFootball = s.sport.slug.includes('football');
            const pinColor = s.sport.color_hex || (isFootball ? colors.primary : '#F28B2E');

            return (
              <Marker
                key={s.id}
                coordinate={{
                  latitude: s.latitude,
                  longitude: s.longitude,
                }}
                onPress={() => {
                  setActiveSession(s);
                  mapRef.current?.animateToRegion(
                    {
                      latitude: s.latitude,
                      longitude: s.longitude,
                      latitudeDelta: 0.05,
                      longitudeDelta: 0.05,
                    },
                    400
                  );
                }}
              >
                <View
                  style={[
                    styles.customMarker,
                    { backgroundColor: pinColor },
                    isSelected && styles.markerSelected,
                  ]}
                >
                  <Activity size={16} color="#FFFFFF" strokeWidth={2.4} />
                </View>
              </Marker>
            );
          })}
        </MapView>
      )}

      {/* ── TOP BARRE DE RECHERCHE DE VILLE & FILTRES ── */}
      <View style={[styles.topOverlay, viewMode === 'list' && styles.topOverlayListMode]}>
        <View style={styles.searchBar}>
          {onNavigateBack && (
            <TouchableOpacity onPress={onNavigateBack} style={styles.mapBackBtn} activeOpacity={0.7}>
              <ChevronLeft size={20} color={colors.navy} strokeWidth={2.4} />
            </TouchableOpacity>
          )}
          <MapPin size={18} color={colors.primary} strokeWidth={2.2} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={handleSearchChange}
            placeholder="Rechercher une ville à Madagascar..."
            placeholderTextColor={colors.muted}
            returnKeyType="search"
            onFocus={() => {
              if (predictions.length > 0) setShowDropdown(true);
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch} style={styles.clearBtn} activeOpacity={0.7}>
              <X size={14} color={colors.muted} strokeWidth={2.5} />
            </TouchableOpacity>
          )}
          {(loading || isSearchingPlaces) && (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 6 }} />
          )}

          {/* Toggle Vue Carte / Liste */}
          <TouchableOpacity
            style={[styles.actionBtn, viewMode === 'list' && styles.actionBtnActive]}
            onPress={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
            activeOpacity={0.8}
          >
            {viewMode === 'map' ? (
              <ListIcon size={16} color={colors.navy} strokeWidth={2.2} />
            ) : (
              <MapIcon size={16} color="#FFFFFF" strokeWidth={2.2} />
            )}
          </TouchableOpacity>

          {/* Bouton Modal Filtres */}
          <TouchableOpacity
            style={[styles.actionBtn, hasActiveFilters && styles.actionBtnFiltered]}
            onPress={() => setShowFilterModal(true)}
            activeOpacity={0.8}
          >
            <SlidersHorizontal
              size={16}
              color={hasActiveFilters ? '#FFFFFF' : colors.primary}
              strokeWidth={2}
            />
            {hasActiveFilters && <View style={styles.filterDotBadge} />}
          </TouchableOpacity>
        </View>

        {/* ── DROPDOWN AUTOCOMPLÉTION DES VILLES & LOCALITÉS ── */}
        {showDropdown && predictions.length > 0 && (
          <View style={styles.predictionsDropdown}>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 220 }}>
              {predictions.map((p) => (
                <TouchableOpacity
                  key={p.placeId}
                  style={styles.predictionRow}
                  onPress={() => handleSelectPrediction(p)}
                  activeOpacity={0.75}
                >
                  <View style={styles.predictionIconBox}>
                    <MapPin size={14} color={colors.primary} />
                  </View>
                  <View style={styles.predictionTexts}>
                    <Text style={styles.predictionPrimary} numberOfLines={1}>
                      {p.primaryText}
                    </Text>
                    {p.secondaryText ? (
                      <Text style={styles.predictionSecondary} numberOfLines={1}>
                        {p.secondaryText}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── BANDEAU DES GRANDES VILLES DE MADAGASCAR (ACCÈS RAPIDE) ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cityPillsRow}
        >
          {QUICK_CITIES.map((c) => {
            const isSelected = c.isAll
              ? currentArea.isAllMadagascar
              : currentArea.name.toLowerCase() === c.label.toLowerCase();

            return (
              <TouchableOpacity
                key={c.label}
                style={[styles.cityPill, isSelected && styles.cityPillActive]}
                onPress={() => {
                  if (c.isAll) {
                    handleSelectArea(ALL_MADAGASCAR_AREA);
                  } else if (c.lat && c.lng) {
                    handleSelectArea({
                      name: c.label,
                      latitude: c.lat,
                      longitude: c.lng,
                      latitudeDelta: 0.1,
                      longitudeDelta: 0.1,
                      isAllMadagascar: false,
                    });
                  }
                }}
                activeOpacity={0.8}
              >
                {c.isAll ? (
                  <Compass
                    size={13}
                    color={isSelected ? '#FFFFFF' : colors.primary}
                    style={{ marginRight: 4 }}
                  />
                ) : (
                  <MapPin
                    size={12}
                    color={isSelected ? '#FFFFFF' : colors.navy}
                    style={{ marginRight: 4 }}
                  />
                )}
                <Text style={[styles.cityPillText, isSelected && styles.cityPillTextActive]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── PILULES DE FILTRE PAR SPORT ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsRow}
        >
          <TouchableOpacity
            style={[styles.filterPill, selectedSport === null && styles.filterPillActive]}
            onPress={() => setSelectedSport(null)}
            activeOpacity={0.8}
          >
            <Sparkles
              size={12}
              color={selectedSport === null ? '#FFFFFF' : colors.primary}
              style={{ marginRight: 5 }}
            />
            <Text style={[styles.filterPillText, selectedSport === null && styles.filterPillTextActive]}>
              Tous ({sessions.length})
            </Text>
          </TouchableOpacity>

          {[
            { id: 'football', label: '⚽ Football', color: '#1456D9' },
            { id: 'basketball', label: '🏀 Basket', color: '#F28B2E' },
            { id: 'volleyball', label: '🏐 Volley', color: '#10B981' },
            { id: 'table_tennis', label: '🏓 Tennis de table', color: '#8B5CF6' },
          ].map((sport) => {
            const isSelected = selectedSport === sport.id;
            return (
              <TouchableOpacity
                key={sport.id}
                style={[
                  styles.filterPill,
                  isSelected && { backgroundColor: sport.color, borderColor: sport.color },
                ]}
                onPress={() => setSelectedSport(isSelected ? null : sport.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterPillText, isSelected && styles.filterPillTextActive]}>
                  {sport.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── MODE LISTE SYNCHRONISÉ ── */}
      {viewMode === 'list' && (
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.listHeaderRow}>
            <Text style={styles.listHeaderTitle}>
              {filteredSessions.length} session{filteredSessions.length > 1 ? 's' : ''} à{' '}
              {currentArea.name}
            </Text>
            <TouchableOpacity onPress={onNavigateCreate} style={styles.createLinkBtn} activeOpacity={0.8}>
              <Plus size={13} color={colors.primary} strokeWidth={2.5} style={{ marginRight: 3 }} />
              <Text style={styles.seeListLink}>Créer</Text>
            </TouchableOpacity>
          </View>

          {filteredSessions.length === 0 ? (
            <View style={styles.emptyListCard}>
              <MapPin size={38} color={colors.muted} strokeWidth={1.5} />
              <Text style={styles.emptyListTitle}>
                Aucune session sportive disponible dans cette ville pour le moment.
              </Text>
              <Text style={styles.emptyListSub}>
                Soyez le premier à organiser une rencontre sportive à {currentArea.name} !
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={onNavigateCreate}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyActionBtnText}>Créer une session à {currentArea.name}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredSessions.map((session) => {
              const spotsLeft = session.max_participants - session.current_participants;
              const isFull = spotsLeft <= 0;
              const sportColor = session.sport.color_hex || colors.primary;

              return (
                <TouchableOpacity
                  key={session.id}
                  style={styles.sessionListItem}
                  onPress={() => onSelectSession(session.id)}
                  activeOpacity={0.88}
                >
                  <View style={[styles.listItemAccent, { backgroundColor: sportColor }]} />
                  <View style={styles.listItemBody}>
                    <View style={styles.listItemHeader}>
                      <Badge
                        label={session.sport.name.toUpperCase()}
                        variant="sport"
                        sportColor={sportColor}
                        size="sm"
                      />
                      <Badge
                        label={session.format || 'Partie libre'}
                        variant="muted"
                        size="sm"
                      />
                      {session.level && (
                        <Badge
                          label={session.level === 'all' ? 'Tous niveaux' : session.level}
                          variant="muted"
                          size="sm"
                        />
                      )}
                      <View style={{ flex: 1 }} />
                      <Badge
                        label={isFull ? 'Complet' : `${spotsLeft} place${spotsLeft > 1 ? 's' : ''}`}
                        variant={isFull ? 'danger' : 'success'}
                        size="sm"
                      />
                    </View>

                    <Text style={styles.listItemTitle} numberOfLines={1}>
                      {session.description || `${session.sport.name} • ${session.city || currentArea.name}`}
                    </Text>

                    <View style={styles.listItemMetaRow}>
                      <View style={styles.metaItem}>
                        <Calendar size={13} color={colors.muted} style={{ marginRight: 4 }} />
                        <Text style={styles.metaText}>{session.session_date}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Clock size={13} color={colors.muted} style={{ marginRight: 4 }} />
                        <Text style={styles.metaText}>{session.start_time?.substring(0, 5)}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <MapPin size={13} color={colors.muted} style={{ marginRight: 4 }} />
                        <Text style={styles.metaText} numberOfLines={1}>
                          {session.address || session.city || currentArea.name}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.listItemFooter}>
                      <View style={styles.organizerRow}>
                        <Users size={13} color={colors.muted} style={{ marginRight: 5 }} />
                        <Text style={styles.organizerText}>
                          Org. {session.organizer?.username || 'SportUp'} ({session.current_participants}/{session.max_participants})
                        </Text>
                      </View>
                      <View style={styles.joinActionRow}>
                        <Text style={styles.joinActionText}>Détails</Text>
                        <ChevronRight size={14} color={colors.primary} strokeWidth={2.5} />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* ── CARTE FLOTTANTE DU BAS (MODE CARTE) ── */}
      {viewMode === 'map' && (
        <View style={styles.bottomCardContainer}>
          <View style={styles.bottomHeader}>
            <Text style={styles.zoneCountText}>
              {filteredSessions.length} session{filteredSessions.length > 1 ? 's' : ''} à{' '}
              {currentArea.name}
            </Text>
            <TouchableOpacity onPress={onNavigateCreate} style={styles.createLinkBtn} activeOpacity={0.8}>
              <Plus size={13} color={colors.primary} strokeWidth={2.5} style={{ marginRight: 3 }} />
              <Text style={styles.seeListLink}>Créer</Text>
            </TouchableOpacity>
          </View>

          {filteredSessions.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselScrollContent}
              decelerationRate="fast"
              snapToInterval={296}
              snapToAlignment="start"
            >
              {filteredSessions.map((session) => {
                const isSelected = activeSession?.id === session.id;
                const spotsLeft = session.max_participants - session.current_participants;
                const isFull = spotsLeft <= 0;
                const sportColor = session.sport?.color_hex || colors.primary;

                return (
                  <TouchableOpacity
                    key={`carousel_${session.id}`}
                    activeOpacity={0.92}
                    style={[
                      styles.carouselCard,
                      isSelected && styles.carouselCardSelected,
                    ]}
                    onPress={() => {
                      setActiveSession(session);
                      if (session.latitude && session.longitude) {
                        mapRef.current?.animateToRegion(
                          {
                            latitude: session.latitude,
                            longitude: session.longitude,
                            latitudeDelta: 0.04,
                            longitudeDelta: 0.04,
                          },
                          400
                        );
                      }
                    }}
                  >
                    {/* Top Row: Sport Badge + Spots Pill */}
                    <View style={styles.carouselTopRow}>
                      <View style={[styles.sportTagBadge, { backgroundColor: `${sportColor}18` }]}>
                        <Activity size={12} color={sportColor} strokeWidth={2.4} style={{ marginRight: 4 }} />
                        <Text style={[styles.sportTagText, { color: sportColor }]}>
                          {session.sport?.name?.toUpperCase() || 'SPORT'}
                        </Text>
                      </View>
                      <View style={[styles.spotsPillBadge, isFull ? styles.spotsFull : styles.spotsAvailable]}>
                        <Text style={[styles.spotsPillText, isFull ? styles.spotsFullText : styles.spotsAvailableText]}>
                          {isFull ? 'Complet' : `${spotsLeft} place${spotsLeft > 1 ? 's' : ''}`}
                        </Text>
                      </View>
                    </View>

                    {/* Title */}
                    <Text style={styles.carouselTitle} numberOfLines={1}>
                      {session.description || `${session.sport?.name || 'Session'} • ${session.city || currentArea.name}`}
                    </Text>

                    {/* Meta Row: Date, Time, Location */}
                    <View style={styles.carouselMetaRow}>
                      <View style={styles.metaItem}>
                        <Calendar size={11} color={colors.muted} style={{ marginRight: 3 }} />
                        <Text style={styles.carouselMetaText}>{session.session_date}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Clock size={11} color={colors.muted} style={{ marginRight: 3 }} />
                        <Text style={styles.carouselMetaText}>{session.start_time?.substring(0, 5)}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <MapPin size={11} color={colors.muted} style={{ marginRight: 3 }} />
                        <Text style={styles.carouselMetaText} numberOfLines={1}>
                          {session.city || session.address || currentArea.name}
                        </Text>
                      </View>
                    </View>

                    {/* Bottom Action: Organizer + Rejoindre Button */}
                    <View style={styles.carouselFooter}>
                      <View style={styles.carouselOrgWrap}>
                        <Users size={12} color={colors.muted} style={{ marginRight: 4 }} />
                        <Text style={styles.carouselOrgText} numberOfLines={1}>
                          Org. {session.organizer?.username || 'SportUp'}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={[styles.carouselJoinBtn, { backgroundColor: sportColor }]}
                        onPress={() => onSelectSession(session.id)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.carouselJoinText}>Rejoindre</Text>
                        <ChevronRight size={13} color="#FFFFFF" strokeWidth={2.8} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            /* Message clair d'absence de session dans la zone */
            <View style={styles.emptyZoneCard}>
              <View style={styles.emptyIconCircle}>
                <MapPin size={22} color={colors.muted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.emptyZoneTitle}>
                  Aucune session sportive disponible dans cette ville pour le moment.
                </Text>
                <Text style={styles.emptyZoneSubtitle}>
                  La carte reste centrée sur {currentArea.name}. Organisez la première partie !
                </Text>
              </View>
              <TouchableOpacity
                style={styles.emptyZoneCreateBtn}
                onPress={onNavigateCreate}
                activeOpacity={0.85}
              >
                <Plus size={14} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 4 }} />
                <Text style={styles.emptyZoneCreateText}>Créer</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* ── MODAL DES FILTRES AVANCÉS ── */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtres avancés</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)} style={styles.modalCloseBtn} activeOpacity={0.7}>
                <X size={18} color={colors.muted} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
              {/* Niveau */}
              <Text style={styles.filterSectionTitle}>Niveau requis</Text>
              <View style={styles.levelPillsRow}>
                {[
                  { key: 'all', label: 'Tous niveaux' },
                  { key: 'beginner', label: 'Débutant' },
                  { key: 'intermediate', label: 'Intermédiaire' },
                  { key: 'advanced', label: 'Avancé' },
                ].map((lvl) => {
                  const isSel = filterLevel === lvl.key;
                  return (
                    <TouchableOpacity
                      key={lvl.key}
                      style={[styles.levelPill, isSel && styles.levelPillActive]}
                      onPress={() => setFilterLevel(lvl.key)}
                      activeOpacity={0.8}
                    >
                      {isSel && <Check size={13} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 4 }} />}
                      <Text style={[styles.levelPillText, isSel && styles.levelPillTextActive]}>
                        {lvl.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Places disponibles */}
              <View style={styles.filterToggleRow}>
                <View style={{ flex: 1, paddingRight: spacing.md }}>
                  <Text style={styles.toggleRowTitle}>Places disponibles uniquement</Text>
                  <Text style={styles.toggleRowSubtitle}>Masquer les sessions complètes</Text>
                </View>
                <TouchableOpacity
                  style={[styles.customToggle, onlyAvailable && styles.customToggleActive]}
                  onPress={() => setOnlyAvailable(!onlyAvailable)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.customToggleThumb, onlyAvailable && styles.customToggleThumbActive]} />
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Actions modal */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalResetBtn}
                onPress={resetFilters}
                activeOpacity={0.7}
              >
                <Text style={styles.modalResetText}>Réinitialiser</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalApplyBtn}
                onPress={() => setShowFilterModal(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.modalApplyText}>
                  Voir ({filteredSessions.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },

  // Marqueur carte
  customMarker: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    ...shadows.card,
  },
  markerSelected: {
    transform: [{ scale: 1.25 }],
    borderColor: colors.navy,
    borderWidth: 3,
  },

  // Overlay supérieur
  topOverlay: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.lg,
    right: spacing.lg,
    gap: spacing.xs + 3,
    zIndex: 10,
  },
  topOverlayListMode: {
    position: 'relative',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    height: 48,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  mapBackBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.navy,
    fontWeight: '600',
    paddingVertical: 0,
  },
  clearBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    position: 'relative',
  },
  actionBtnActive: {
    backgroundColor: colors.navy,
  },
  actionBtnFiltered: {
    backgroundColor: colors.primary,
  },
  filterDotBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.warning,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  // Dropdown des prédictions
  predictionsDropdown: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    ...shadows.floating,
  },
  predictionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  predictionIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  predictionTexts: {
    flex: 1,
  },
  predictionPrimary: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
  },
  predictionSecondary: {
    fontSize: 11,
    color: colors.muted,
  },

  // Pilules villes rapides
  cityPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  cityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.subtle,
  },
  cityPillActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  cityPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.navy,
  },
  cityPillTextActive: {
    color: '#FFFFFF',
  },

  // Pilules filtres sports
  filterPillsRow: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.subtle,
  },
  filterPillActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  filterPillDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.navy,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },

  // Mode Liste
  listContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl + 40,
    gap: spacing.md,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  listHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
  },
  sessionListItem: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  listItemAccent: {
    width: 6,
  },
  listItemBody: {
    flex: 1,
    padding: spacing.md,
    gap: 8,
  },
  listItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  listItemTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.navy,
  },
  listItemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '600',
  },
  listItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 8,
    marginTop: 2,
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  organizerText: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '500',
  },
  joinActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  joinActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  emptyListCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.subtle,
  },
  emptyListTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.navy,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptyListSub: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  emptyActionBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  // Modal des filtres
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    maxHeight: '80%',
    ...shadows.floating,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    marginVertical: spacing.sm,
  },
  filterSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.navy,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  levelPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    marginBottom: spacing.lg,
  },
  levelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  levelPillActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  levelPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy,
  },
  levelPillTextActive: {
    color: '#FFFFFF',
  },
  filterToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.md,
  },
  toggleRowTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 2,
  },
  toggleRowSubtitle: {
    fontSize: 11,
    color: colors.muted,
  },
  customToggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.borderLight,
    padding: 2,
    justifyContent: 'center',
  },
  customToggleActive: {
    backgroundColor: colors.primary,
  },
  customToggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    ...shadows.subtle,
  },
  customToggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalResetBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  modalResetText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
  },
  modalApplyBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    ...shadows.floating,
  },
  modalApplyText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Carte flottante en bas
  bottomCardContainer: {
    position: 'absolute',
    bottom: spacing.lg,
    left: 0,
    right: 0,
  },
  bottomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
    paddingHorizontal: spacing.lg,
  },
  zoneCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 4,
    borderRadius: radius.pill,
    ...shadows.subtle,
  },
  createLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  seeListLink: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },

  // Carousel horizontal de sessions en bas de carte
  carouselScrollContent: {
    paddingHorizontal: spacing.lg,
    gap: 12,
    paddingBottom: 4,
  },
  carouselCard: {
    width: 290,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    ...shadows.card,
    justifyContent: 'space-between',
  },
  carouselCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
  },
  carouselTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sportTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  sportTagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  spotsPillBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  spotsAvailable: {
    backgroundColor: colors.successSoft,
  },
  spotsFull: {
    backgroundColor: colors.dangerSoft,
  },
  spotsPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  spotsAvailableText: {
    color: '#059669',
  },
  spotsFullText: {
    color: colors.danger,
  },
  carouselTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.navy,
    marginBottom: 8,
  },
  carouselMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  carouselMetaText: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '500',
  },
  carouselFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 10,
  },
  carouselOrgWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  carouselOrgText: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '600',
  },
  carouselJoinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    gap: 2,
  },
  carouselJoinText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  sessionCardPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.floating,
  },
  previewSportCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  previewInfo: {
    flex: 1,
  },
  previewTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  previewTag: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  previewFormat: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.muted,
    marginLeft: 4,
  },
  previewStatusBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.success,
    marginLeft: 4,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.navy,
    marginBottom: 4,
  },
  previewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  previewSub: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '500',
  },
  spotsBadge: {
    backgroundColor: colors.successSoft,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
  },
  spotsBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  chevronBox: {
    paddingLeft: spacing.xs,
  },

  // Carte zone vide
  emptyZoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.floating,
    gap: spacing.sm,
  },
  emptyIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyZoneTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.navy,
    lineHeight: 16,
  },
  emptyZoneSubtitle: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 2,
  },
  emptyZoneCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  emptyZoneCreateText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
