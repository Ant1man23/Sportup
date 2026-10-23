import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  X,
  Check,
  Layers,
  Zap,
  Car,
  Coffee,
  Shield,
  Building,
} from 'lucide-react-native';
import { colors } from '../../../theme/colors';
import { radius, shadows, spacing } from '../../../theme/spacing';
import {
  Venue,
  VenueFormPayload,
  SurfaceType,
  venueApi,
} from '../api/venueApi';

interface VenueFormModalProps {
  visible: boolean;
  onClose: () => void;
  venueToEdit?: Venue | null;
  onSuccess: () => void;
}

const AVAILABLE_SPORTS = [
  { key: 'football', label: 'Football', emoji: '⚽' },
  { key: 'football5', label: 'Foot 5', emoji: '🏟️' },
  { key: 'basketball', label: 'Basketball', emoji: '🏀' },
  { key: 'basketball3x3', label: 'Basket 3x3', emoji: '🏀' },
  { key: 'volleyball', label: 'Volleyball', emoji: '🏐' },
  { key: 'table_tennis', label: 'Ping-Pong', emoji: '🏓' },
  { key: 'athletics', label: 'Athlétisme', emoji: '🏃' },
];

const AVAILABLE_SURFACES: { key: SurfaceType; label: string }[] = [
  { key: 'gazon_synthetique', label: 'Gazon synthétique' },
  { key: 'gazon_naturel', label: 'Gazon naturel' },
  { key: 'beton', label: 'Béton' },
  { key: 'parquet', label: 'Parquet' },
  { key: 'sable', label: 'Sable' },
  { key: 'ciment', label: 'Ciment' },
];

const COMMON_CITIES = ['Antananarivo', 'Toamasina', 'Antsirabe', 'Mahajanga', 'Fianarantsoa', 'Toliara', 'Antsiranana'];

export const VenueFormModal: React.FC<VenueFormModalProps> = ({
  visible,
  onClose,
  venueToEdit,
  onSuccess,
}) => {
  const isEditing = !!venueToEdit;

  // Form states
  const [name, setName] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('Antananarivo');
  const [address, setAddress] = useState('');
  const [selectedSports, setSelectedSports] = useState<string[]>(['football']);
  const [surfaceType, setSurfaceType] = useState<SurfaceType>('gazon_synthetique');
  const [pricePerHour, setPricePerHour] = useState('');
  const [capacity, setCapacity] = useState('');
  const [phonePrimary, setPhonePrimary] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [email, setEmail] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [openingTime, setOpeningTime] = useState('07:00');
  const [closingTime, setClosingTime] = useState('22:00');

  // Facilities toggles
  const [isIndoor, setIsIndoor] = useState(false);
  const [hasLighting, setHasLighting] = useState(false);
  const [hasChangingRooms, setHasChangingRooms] = useState(false);
  const [hasParking, setHasParking] = useState(false);
  const [hasTribunes, setHasTribunes] = useState(false);
  const [hasCanteen, setHasCanteen] = useState(false);

  const [saving, setSaving] = useState(false);

  // Populate form on open / edit
  useEffect(() => {
    if (visible) {
      if (venueToEdit) {
        setName(venueToEdit.name || '');
        setDistrict(venueToEdit.district || '');
        setCity(venueToEdit.city || 'Antananarivo');
        setAddress(venueToEdit.address || '');
        setSelectedSports(venueToEdit.sports || ['football']);
        setSurfaceType(venueToEdit.surface_type || 'gazon_synthetique');
        setPricePerHour(venueToEdit.price_per_hour ? String(venueToEdit.price_per_hour) : '');
        setCapacity(venueToEdit.capacity ? String(venueToEdit.capacity) : '');
        setPhonePrimary(venueToEdit.phone_primary || '');
        setWhatsappNumber(venueToEdit.whatsapp_number || '');
        setEmail(venueToEdit.email || '');
        setFacebookUrl(venueToEdit.facebook_url || '');
        setBookingNotes(venueToEdit.booking_notes || '');
        setOpeningTime(venueToEdit.opening_time || '07:00');
        setClosingTime(venueToEdit.closing_time || '22:00');
        setIsIndoor(!!venueToEdit.is_indoor);
        setHasLighting(!!venueToEdit.has_lighting);
        setHasChangingRooms(!!venueToEdit.has_changing_rooms);
        setHasParking(!!venueToEdit.has_parking);
        setHasTribunes(!!venueToEdit.has_tribunes);
        setHasCanteen(!!venueToEdit.has_canteen);
      } else {
        // Reset defaults
        setName('');
        setDistrict('');
        setCity('Antananarivo');
        setAddress('');
        setSelectedSports(['football']);
        setSurfaceType('gazon_synthetique');
        setPricePerHour('');
        setCapacity('');
        setPhonePrimary('');
        setWhatsappNumber('');
        setEmail('');
        setFacebookUrl('');
        setBookingNotes('');
        setOpeningTime('07:00');
        setClosingTime('22:00');
        setIsIndoor(false);
        setHasLighting(false);
        setHasChangingRooms(false);
        setHasParking(false);
        setHasTribunes(false);
        setHasCanteen(false);
      }
    }
  }, [visible, venueToEdit]);

  const toggleSport = (sportKey: string) => {
    setSelectedSports((prev) =>
      prev.includes(sportKey)
        ? prev.filter((s) => s !== sportKey)
        : [...prev, sportKey]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Champ requis', 'Veuillez saisir le nom du terrain.');
      return;
    }
    if (!district.trim()) {
      Alert.alert('Champ requis', 'Veuillez indiquer le quartier ou district (ex: Ankorondrano).');
      return;
    }
    if (!city.trim()) {
      Alert.alert('Champ requis', 'Veuillez indiquer la ville.');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Champ requis', 'Veuillez préciser l\'adresse ou un repère clair.');
      return;
    }
    if (selectedSports.length === 0) {
      Alert.alert('Champ requis', 'Sélectionnez au moins un sport praticable.');
      return;
    }

    const payload: VenueFormPayload = {
      name: name.trim(),
      district: district.trim(),
      city: city.trim(),
      address: address.trim(),
      sports: selectedSports,
      surface_type: surfaceType,
      price_per_hour: pricePerHour ? parseInt(pricePerHour, 10) : null,
      price_currency: 'MGA',
      capacity: capacity ? parseInt(capacity, 10) : null,
      phone_primary: phonePrimary.trim() || null,
      whatsapp_number: whatsappNumber.trim() || null,
      email: email.trim() || null,
      facebook_url: facebookUrl.trim() || null,
      booking_notes: bookingNotes.trim() || null,
      opening_time: openingTime.trim() || '07:00',
      closing_time: closingTime.trim() || '22:00',
      is_indoor: isIndoor,
      has_lighting: hasLighting,
      has_changing_rooms: hasChangingRooms,
      has_parking: hasParking,
      has_tribunes: hasTribunes,
      has_canteen: hasCanteen,
    };

    setSaving(true);
    try {
      if (isEditing && venueToEdit) {
        await venueApi.updateVenue(venueToEdit.id, payload);
        Alert.alert('Succès', 'Le terrain a été mis à jour.');
      } else {
        await venueApi.createVenue(payload);
        Alert.alert(
          'Terrain soumis !',
          'Merci pour votre contribution ! Le terrain sera vérifié et validé par l\'équipe SportUp.'
        );
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Une erreur est survenue lors de l\'enregistrement.';
      Alert.alert('Erreur', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} disabled={saving}>
            <X size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>
              {isEditing ? 'Modifier le terrain' : 'Ajouter un terrain'}
            </Text>
            <Text style={styles.headerSubtitle}>
              Annuaire SportUp · Madagascar
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleSubmit}
            style={[styles.saveHeaderBtn, saving && { opacity: 0.7 }]}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.saveHeaderBtnText}>
                {isEditing ? 'Sauvegarder' : 'Soumettre'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Notice info */}
          <View style={styles.noticeBox}>
            <Shield size={18} color={colors.primary} />
            <Text style={styles.noticeText}>
              {isEditing
                ? 'Vos modifications seront immédiatement appliquées à la fiche du terrain.'
                : 'Partagez un terrain de sport de votre quartier. Il sera accessible à tous les sportifs après vérification.'}
            </Text>
          </View>

          {/* Section: Informations générales */}
          <Text style={styles.sectionTitle}>INFORMATIONS GÉNÉRALES</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Nom du terrain <Text style={styles.req}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Terrain Synthétique Galaxy, Gymnase Ankorondrano"
              placeholderTextColor={colors.muted}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>
                Ville <Text style={styles.req}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Antananarivo"
                placeholderTextColor={colors.muted}
                value={city}
                onChangeText={setCity}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>
                Quartier / District <Text style={styles.req}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Ankorondrano, Itaosy"
                placeholderTextColor={colors.muted}
                value={district}
                onChangeText={setDistrict}
              />
            </View>
          </View>

          {/* Quick city suggestions */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cityChipsScroll}
          >
            {COMMON_CITIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.cityChip, city === c && styles.cityChipActive]}
                onPress={() => setCity(c)}
              >
                <Text style={[styles.cityChipText, city === c && styles.cityChipTextActive]}>
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Adresse exacte ou repère <Text style={styles.req}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: En face du collège, Route d'Andravoahangy"
              placeholderTextColor={colors.muted}
              value={address}
              onChangeText={setAddress}
            />
          </View>

          {/* Section: Sports praticables */}
          <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>
            SPORTS PRATICABLES <Text style={styles.req}>*</Text>
          </Text>
          <View style={styles.chipGrid}>
            {AVAILABLE_SPORTS.map((sp) => {
              const active = selectedSports.includes(sp.key);
              return (
                <TouchableOpacity
                  key={sp.key}
                  style={[styles.sportSelectChip, active && styles.sportSelectChipActive]}
                  onPress={() => toggleSport(sp.key)}
                >
                  <Text style={styles.sportSelectEmoji}>{sp.emoji}</Text>
                  <Text style={[styles.sportSelectText, active && styles.sportSelectTextActive]}>
                    {sp.label}
                  </Text>
                  {active && <Check size={14} color={colors.primary} strokeWidth={3} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Section: Surface de jeu */}
          <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>SURFACE DU TERRAIN</Text>
          <View style={styles.surfaceGrid}>
            {AVAILABLE_SURFACES.map((surf) => {
              const active = surfaceType === surf.key;
              return (
                <TouchableOpacity
                  key={surf.key}
                  style={[styles.surfaceChip, active && styles.surfaceChipActive]}
                  onPress={() => setSurfaceType(surf.key)}
                >
                  <Text style={[styles.surfaceChipText, active && styles.surfaceChipTextActive]}>
                    {surf.label}
                  </Text>
                  {active && <Check size={13} color="#FFF" strokeWidth={3} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Section: Tarifs & Horaires */}
          <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>TARIFS & HORAIRES</Text>
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Tarif par heure (Ariary)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 40000"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
                value={pricePerHour}
                onChangeText={setPricePerHour}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Capacité joueurs / spectateurs</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 200"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
                value={capacity}
                onChangeText={setCapacity}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Heure d'ouverture</Text>
              <TextInput
                style={styles.input}
                placeholder="07:00"
                placeholderTextColor={colors.muted}
                value={openingTime}
                onChangeText={setOpeningTime}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Heure de fermeture</Text>
              <TextInput
                style={styles.input}
                placeholder="22:00"
                placeholderTextColor={colors.muted}
                value={closingTime}
                onChangeText={setClosingTime}
              />
            </View>
          </View>

          {/* Section: Équipements */}
          <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>ÉQUIPEMENTS & COMMODITÉS</Text>
          <View style={styles.facilitiesGrid}>
            {[
              {
                label: 'Terrain couvert (Indoor)',
                icon: <Building size={16} color={isIndoor ? colors.primary : colors.muted} />,
                state: isIndoor,
                toggle: () => setIsIndoor(!isIndoor),
              },
              {
                label: 'Éclairage nocturne',
                icon: <Zap size={16} color={hasLighting ? colors.primary : colors.muted} />,
                state: hasLighting,
                toggle: () => setHasLighting(!hasLighting),
              },
              {
                label: 'Vestiaires & Douches',
                icon: <Layers size={16} color={hasChangingRooms ? colors.primary : colors.muted} />,
                state: hasChangingRooms,
                toggle: () => setHasChangingRooms(!hasChangingRooms),
              },
              {
                label: 'Parking disponible',
                icon: <Car size={16} color={hasParking ? colors.primary : colors.muted} />,
                state: hasParking,
                toggle: () => setHasParking(!hasParking),
              },
              {
                label: 'Gradins / Tribunes',
                icon: <Layers size={16} color={hasTribunes ? colors.primary : colors.muted} />,
                state: hasTribunes,
                toggle: () => setHasTribunes(!hasTribunes),
              },
              {
                label: 'Buvette / Cafétéria',
                icon: <Coffee size={16} color={hasCanteen ? colors.primary : colors.muted} />,
                state: hasCanteen,
                toggle: () => setHasCanteen(!hasCanteen),
              },
            ].map((fac) => (
              <TouchableOpacity
                key={fac.label}
                style={[styles.facilityToggle, fac.state && styles.facilityToggleActive]}
                onPress={fac.toggle}
              >
                <View style={styles.facilityIcon}>{fac.icon}</View>
                <Text style={[styles.facilityText, fac.state && styles.facilityTextActive]}>
                  {fac.label}
                </Text>
                <View style={[styles.checkbox, fac.state && styles.checkboxActive]}>
                  {fac.state && <Check size={12} color="#FFF" strokeWidth={3} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Section: Contacts & Réservation */}
          <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>CONTACTS & RÉSERVATION</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Téléphone d'appel</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 034 00 000 00"
              placeholderTextColor={colors.muted}
              keyboardType="phone-pad"
              value={phonePrimary}
              onChangeText={setPhonePrimary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Numéro WhatsApp (pour réservations directes)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: +261 34 00 000 00"
              placeholderTextColor={colors.muted}
              keyboardType="phone-pad"
              value={whatsappNumber}
              onChangeText={setWhatsappNumber}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="contact@terrain.mg"
                placeholderTextColor={colors.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Page Facebook</Text>
              <TextInput
                style={styles.input}
                placeholder="https://facebook.com/..."
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                value={facebookUrl}
                onChangeText={setFacebookUrl}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Remarques & Modalités de réservation</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Ex: Acompte de 50% demandé par MVola/Airtel Money, réservation 48h à l'avance..."
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={3}
              value={bookingNotes}
              onChangeText={setBookingNotes}
            />
          </View>

          {/* Big submit button at bottom */}
          <TouchableOpacity
            style={[styles.bigSubmitBtn, saving && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.bigSubmitBtnText}>
                {isEditing ? 'Enregistrer les modifications' : 'Soumettre le terrain'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
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
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 52 : 20,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.sm,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.muted,
  },
  saveHeaderBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  saveHeaderBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 40,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: `${colors.primary}12`,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.primary}25`,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    lineHeight: 17,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.muted,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  req: {
    color: colors.danger,
  },
  inputGroup: {
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cityChipsScroll: {
    gap: 6,
    paddingBottom: spacing.sm,
  },
  cityChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cityChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  cityChipText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
  },
  cityChipTextActive: {
    color: '#FFF',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.sm,
  },
  sportSelectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sportSelectChipActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}12`,
  },
  sportSelectEmoji: {
    fontSize: 14,
  },
  sportSelectText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  sportSelectTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  surfaceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.sm,
  },
  surfaceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  surfaceChipActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  surfaceChipText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  surfaceChipTextActive: {
    color: '#FFF',
  },
  facilitiesGrid: {
    gap: 8,
    marginBottom: spacing.md,
  },
  facilityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  facilityToggleActive: {
    borderColor: `${colors.primary}50`,
    backgroundColor: `${colors.primary}08`,
  },
  facilityIcon: {
    marginRight: 10,
  },
  facilityText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  facilityTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  bigSubmitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.lg,
    alignItems: 'center',
    marginTop: spacing.md,
    ...shadows.card,
  },
  bigSubmitBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
