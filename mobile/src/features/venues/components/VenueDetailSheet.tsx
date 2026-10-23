import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
  Animated,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import {
  X,
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  Star,
  Shield,
  Zap,
  Car,
  Coffee,
  Users,
  Layers,
  ChevronRight,
  ExternalLink,
  Facebook,
  Mail,
  Check,
  Edit2,
} from 'lucide-react-native';
import { colors } from '../../../theme/colors';
import { radius, shadows, spacing } from '../../../theme/spacing';
import { useAuthStore } from '../../../store/useAuthStore';
import {
  Venue,
  venueApi,
  formatPrice,
  formatRating,
  SPORT_DISPLAY,
  DAY_LABELS,
} from '../api/venueApi';

const { height: SCREEN_H } = Dimensions.get('window');

interface VenueDetailSheetProps {
  venueId: number | null;
  onClose: () => void;
  /** Rappel optionnel pour pré-remplir le lieu lors de la création de session */
  onSelectForSession?: (venue: Venue) => void;
  /** Callback pour ouvrir la modification du terrain */
  onEdit?: (venue: Venue) => void;
}

// ── Pill de feature ───────────────────────────────────────────────────────────

const FeaturePill = ({
  icon,
  label,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) => (
  <View style={[styles.featurePill, !active && styles.featurePillOff]}>
    {icon}
    <Text style={[styles.featurePillText, !active && styles.featurePillTextOff]}>
      {label}
    </Text>
  </View>
);

// ── CTA Bouton de contact ─────────────────────────────────────────────────────

const ContactButton = ({
  label,
  icon,
  color,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  color: string;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.ctaBtn, { backgroundColor: color }]}
    onPress={onPress}
    activeOpacity={0.85}
  >
    {icon}
    <Text style={styles.ctaBtnText}>{label}</Text>
  </TouchableOpacity>
);

// ── Composant principal ───────────────────────────────────────────────────────

export const VenueDetailSheet: React.FC<VenueDetailSheetProps> = ({
  venueId,
  onClose,
  onSelectForSession,
  onEdit,
}) => {
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const currentUser = useAuthStore((state) => state.user);

  const canEdit = !!(
    currentUser &&
    venue &&
    (venue.submitted_by === currentUser.id || currentUser.role === 'admin')
  );

  // Charger le détail quand venueId change
  useEffect(() => {
    if (venueId !== null) {
      setVenue(null);
      setLoading(true);
      venueApi
        .getVenue(venueId)
        .then(setVenue)
        .catch(() => {})
        .finally(() => setLoading(false));

      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_H,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [venueId]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_H,
      duration: 250,
      useNativeDriver: true,
    }).start(onClose);
  };

  // ── Deeplinks ────────────────────────────────────────────────────────────────

  const openWhatsApp = () => {
    if (!venue?.whatsapp_link) return;
    const msg = encodeURIComponent(
      `Bonjour, je souhaite réserver le terrain *${venue.name}* via SportUp 🏟️`
    );
    Linking.openURL(`${venue.whatsapp_link}?text=${msg}`).catch(() =>
      Linking.openURL(`tel:${venue.phone_primary}`)
    );
  };

  const openCall = () => {
    if (!venue?.phone_primary) return;
    Linking.openURL(`tel:${venue.phone_primary}`);
  };

  const openMaps = () => {
    if (!venue?.latitude || !venue?.longitude) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${venue.latitude},${venue.longitude}`;
    Linking.openURL(url);
  };

  const openFacebook = () => {
    if (!venue?.facebook_url) return;
    Linking.openURL(venue.facebook_url);
  };

  const openEmail = () => {
    if (!venue?.email) return;
    Linking.openURL(`mailto:${venue.email}`);
  };

  if (venueId === null) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={handleClose}>
      {/* Backdrop */}
      <TouchableOpacity style={styles.backdrop} onPress={handleClose} activeOpacity={1} />

      {/* Sheet */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Edit */}
        {canEdit && (
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => {
              handleClose();
              if (venue) onEdit?.(venue);
            }}
          >
            <Edit2 size={13} color={colors.primary} />
            <Text style={styles.editBtnText}>Modifier</Text>
          </TouchableOpacity>
        )}

        {/* Close */}
        <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
          <X size={18} color={colors.text} />
        </TouchableOpacity>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.loadingText}>Chargement du terrain…</Text>
          </View>
        ) : venue ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Unverified notice */}
            {!venue.is_verified && (
              <View style={styles.unverifiedBanner}>
                <Text style={styles.unverifiedBannerText}>
                  ⏳ En attente de validation par l'équipe SportUp
                </Text>
              </View>
            )}

            {/* ── Header ── */}
            <View style={styles.venueHeader}>
              <View style={styles.venueAvatarCircle}>
                <Text style={styles.venueAvatarEmoji}>🏟️</Text>
              </View>
              <View style={styles.venueHeaderInfo}>
                <View style={styles.nameLine}>
                  <Text style={styles.venueName} numberOfLines={2}>
                    {venue.name}
                  </Text>
                  {venue.is_verified && (
                    <View style={styles.verifiedBadge}>
                      <Check size={10} color="#FFF" strokeWidth={3} />
                    </View>
                  )}
                </View>
                <View style={styles.districtRow}>
                  <MapPin size={11} color={colors.muted} />
                  <Text style={styles.districtText}>
                    {venue.district} · {venue.address}
                  </Text>
                </View>

                {/* Stars */}
                <View style={styles.ratingRow}>
                  <Star size={13} color="#EAB308" fill="#EAB308" />
                  <Text style={styles.ratingVal}>{formatRating(venue.rating)}</Text>
                  <Text style={styles.ratingCount}>({venue.review_count} avis)</Text>
                  <Text style={styles.ratingDot}>·</Text>
                  <Text style={styles.bookingCount}>{venue.booking_count} sessions</Text>
                </View>
              </View>
            </View>

            {/* ── Prix & Horaires ── */}
            <View style={styles.infoStrip}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>TARIF</Text>
                <Text style={styles.infoValue}>{formatPrice(venue.price_per_hour)}</Text>
              </View>
              <View style={styles.infoSep} />
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>OUVERTURE</Text>
                <Text style={styles.infoValue}>
                  {venue.opening_time} – {venue.closing_time}
                </Text>
              </View>
              <View style={styles.infoSep} />
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>SURFACE</Text>
                <Text style={styles.infoValue}>{venue.surface_label}</Text>
              </View>
            </View>

            {/* ── Sports disponibles ── */}
            {venue.sports.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>SPORTS DISPONIBLES</Text>
                <View style={styles.sportsRow}>
                  {venue.sports.map((s) => {
                    const info = SPORT_DISPLAY[s];
                    return (
                      <View
                        key={s}
                        style={[styles.sportChip, { borderColor: info?.color ?? colors.border }]}
                      >
                        <Text style={styles.sportEmoji}>{info?.emoji ?? '🏅'}</Text>
                        <Text style={[styles.sportChipLabel, { color: info?.color ?? colors.text }]}>
                          {info?.label ?? s}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ── Équipements ── */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>ÉQUIPEMENTS</Text>
              <View style={styles.featuresGrid}>
                <FeaturePill
                  icon={<Zap size={13} color={venue.has_lighting ? '#EAB308' : colors.mutedLight} />}
                  label="Éclairage"
                  active={venue.has_lighting}
                />
                <FeaturePill
                  icon={<Users size={13} color={venue.has_changing_rooms ? colors.primary : colors.mutedLight} />}
                  label="Vestiaires"
                  active={venue.has_changing_rooms}
                />
                <FeaturePill
                  icon={<Car size={13} color={venue.has_parking ? '#10B981' : colors.mutedLight} />}
                  label="Parking"
                  active={venue.has_parking}
                />
                <FeaturePill
                  icon={<Coffee size={13} color={venue.has_canteen ? '#F28B2E' : colors.mutedLight} />}
                  label="Buvette"
                  active={venue.has_canteen}
                />
                <FeaturePill
                  icon={<Layers size={13} color={venue.has_tribunes ? '#8B5CF6' : colors.mutedLight} />}
                  label="Tribunes"
                  active={venue.has_tribunes}
                />
                <FeaturePill
                  icon={<Shield size={13} color={venue.is_indoor ? colors.primary : colors.mutedLight} />}
                  label="Intérieur"
                  active={venue.is_indoor}
                />
              </View>
            </View>

            {/* ── Jours d'ouverture ── */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>JOURS D'OUVERTURE</Text>
              <View style={styles.daysRow}>
                {Object.entries(DAY_LABELS).map(([key, label]) => {
                  const isOpen = venue.open_days?.includes(key);
                  return (
                    <View key={key} style={[styles.dayChip, isOpen && styles.dayChipActive]}>
                      <Text style={[styles.dayChipText, isOpen && styles.dayChipTextActive]}>
                        {label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* ── Notes de réservation ── */}
            {venue.booking_notes && (
              <View style={styles.notesCard}>
                <Clock size={14} color="#F28B2E" style={{ marginRight: 6, flexShrink: 0 }} />
                <Text style={styles.notesText}>{venue.booking_notes}</Text>
              </View>
            )}

            {/* ── CTA Réservation ── */}
            <View style={styles.ctaSection}>
              <Text style={styles.ctaSectionTitle}>📞 Réserver ce terrain</Text>
              <View style={styles.ctaRow}>
                {venue.whatsapp_link && (
                  <ContactButton
                    label="WhatsApp"
                    icon={<MessageCircle size={16} color="#FFF" />}
                    color="#25D366"
                    onPress={openWhatsApp}
                  />
                )}
                {venue.phone_primary && (
                  <ContactButton
                    label="Appeler"
                    icon={<Phone size={16} color="#FFF" />}
                    color={colors.primary}
                    onPress={openCall}
                  />
                )}
              </View>

              {/* Actions secondaires */}
              <View style={styles.secondaryActions}>
                {(venue.latitude && venue.longitude) && (
                  <TouchableOpacity style={styles.secondaryBtn} onPress={openMaps}>
                    <MapPin size={14} color={colors.primary} />
                    <Text style={styles.secondaryBtnText}>Itinéraire Google Maps</Text>
                    <ExternalLink size={12} color={colors.mutedLight} />
                  </TouchableOpacity>
                )}
                {venue.facebook_url && (
                  <TouchableOpacity style={styles.secondaryBtn} onPress={openFacebook}>
                    <Facebook size={14} color="#1877F2" />
                    <Text style={styles.secondaryBtnText}>Page Facebook</Text>
                    <ExternalLink size={12} color={colors.mutedLight} />
                  </TouchableOpacity>
                )}
                {venue.email && (
                  <TouchableOpacity style={styles.secondaryBtn} onPress={openEmail}>
                    <Mail size={14} color={colors.muted} />
                    <Text style={styles.secondaryBtnText}>{venue.email}</Text>
                    <ChevronRight size={12} color={colors.mutedLight} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* ── Sélection pour session ── */}
            {onSelectForSession && (
              <TouchableOpacity
                style={styles.selectSessionBtn}
                onPress={() => {
                  onSelectForSession(venue);
                  handleClose();
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.selectSessionBtnText}>
                  ✅ Utiliser ce terrain pour ma session
                </Text>
                <ChevronRight size={16} color={colors.primary} />
              </TouchableOpacity>
            )}
          </ScrollView>
        ) : (
          <View style={styles.loadingBox}>
            <Text style={styles.loadingText}>Terrain introuvable.</Text>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.55)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: SCREEN_H * 0.88,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    ...shadows.floating,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 8,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: {
    position: 'absolute',
    top: 16,
    right: 56,
    zIndex: 10,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: `${colors.primary}15`,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  unverifiedBanner: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 7,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  unverifiedBannerText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingBox: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.muted,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 40,
  },

  // Header
  venueHeader: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  venueAvatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(20,86,217,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderWidth: 1.5,
    borderColor: colors.primary + '33',
  },
  venueAvatarEmoji: { fontSize: 26 },
  venueHeaderInfo: { flex: 1 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  venueName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    flexShrink: 1,
    lineHeight: 20,
  },
  verifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  districtRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 3, marginBottom: 4 },
  districtText: { fontSize: 11, color: colors.muted, flex: 1 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingVal: { fontSize: 13, fontWeight: '800', color: '#EAB308' },
  ratingCount: { fontSize: 11, color: colors.muted },
  ratingDot: { fontSize: 11, color: colors.mutedLight },
  bookingCount: { fontSize: 11, color: colors.muted },

  // Info strip
  infoStrip: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  infoItem: { flex: 1, alignItems: 'center' },
  infoSep: { width: 1, backgroundColor: colors.border },
  infoLabel: { fontSize: 9, fontWeight: '800', color: colors.muted, letterSpacing: 0.8, marginBottom: 2 },
  infoValue: { fontSize: 12, fontWeight: '700', color: colors.text, textAlign: 'center' },

  // Section
  section: { marginBottom: spacing.md },
  sectionLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.muted,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },

  // Sports chips
  sportsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
  },
  sportEmoji: { fontSize: 13 },
  sportChipLabel: { fontSize: 11, fontWeight: '700' },

  // Feature pills
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(20,86,217,0.07)',
    borderWidth: 1,
    borderColor: colors.primary + '33',
  },
  featurePillOff: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.borderLight,
    opacity: 0.5,
  },
  featurePillText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  featurePillTextOff: { color: colors.mutedLight },

  // Days
  daysRow: { flexDirection: 'row', gap: 6 },
  dayChip: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  dayChipActive: {
    backgroundColor: 'rgba(20,86,217,0.1)',
    borderColor: colors.primary,
  },
  dayChipText: { fontSize: 10, fontWeight: '700', color: colors.mutedLight },
  dayChipTextActive: { color: colors.primary },

  // Notes
  notesCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(242,139,46,0.08)',
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(242,139,46,0.2)',
  },
  notesText: { fontSize: 12, color: colors.textSecondary, flex: 1, lineHeight: 18 },

  // CTA section
  ctaSection: { marginBottom: spacing.md },
  ctaSectionTitle: { fontSize: 13, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  ctaRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  ctaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.lg,
    ...shadows.card,
  },
  ctaBtnText: { fontSize: 14, fontWeight: '800', color: '#FFF' },

  // Secondary actions
  secondaryActions: { gap: 2 },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSubtle,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  secondaryBtnText: { flex: 1, fontSize: 12, fontWeight: '600', color: colors.text },

  // Select for session
  selectSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(20,86,217,0.06)',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  selectSessionBtnText: { fontSize: 13, fontWeight: '700', color: colors.primary, flex: 1 },
});
