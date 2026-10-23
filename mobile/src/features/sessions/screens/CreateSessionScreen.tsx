import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { colors } from '../../../theme/colors';
import { radius, shadows, spacing } from '../../../theme/spacing';
import { ArrowLeft, Trophy, Users, Eye, MapPin } from 'lucide-react-native';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { DatePickerField } from '../../../components/DatePickerField';
import { TimePickerField } from '../../../components/TimePickerField';
import { ErrorBanner } from '../../../components/ErrorBanner';
import { GooglePlacesInput } from '../../../components/GooglePlacesInput';
import { PlaceLocation, MADAGASCAR_CITIES } from '../../../services/googleMapsService';
import {
  sessionsApi,
  CompetitionType,
  ParticipationMode,
  SpectatorAccess,
} from '../api/sessionsApi';
import { DisciplineSelector } from '../../../components/DisciplineSelector';

interface CreateSessionScreenProps {
  onSuccess: (sessionId: number) => void;
  onCancel: () => void;
}

const COMPETITION_TYPES: Array<{ key: CompetitionType; label: string }> = [
  { key: 'friendly', label: 'Match amical' },
  { key: 'corporate', label: 'Interentreprises' },
  { key: 'tournament', label: 'Tournoi' },
  { key: 'championship', label: 'Championnat' },
  { key: 'school_university', label: 'Scolaire / Univ.' },
  { key: 'official', label: 'Officiel' },
  { key: 'community', label: 'Communautaire' },
];

const PARTICIPATION_MODES: Array<{ key: ParticipationMode; label: string }> = [
  { key: 'open', label: 'Ouverte à tous' },
  { key: 'approval_required', label: 'Validation requise' },
  { key: 'invitation', label: 'Sur invitation' },
];

const SPECTATOR_ACCESSES: Array<{ key: SpectatorAccess; label: string }> = [
  { key: 'free', label: 'Public gratuit' },
  { key: 'online_only', label: 'Suivi en ligne' },
  { key: 'paid', label: 'Entrée payante' },
  { key: 'private', label: 'Privé' },
];

export const CreateSessionScreen: React.FC<CreateSessionScreenProps> = ({
  onSuccess,
  onCancel,
}) => {
  const [sportId, setSportId] = useState<number>(1);
  const [format, setFormat] = useState('5v5');
  const todayStr = new Date().toISOString().split('T')[0];
  const [sessionDate, setSessionDate] = useState(todayStr);
  const [startTime, setStartTime] = useState('18:00');
  const [competitionType, setCompetitionType] = useState<CompetitionType>('friendly');
  const [participationMode, setParticipationMode] = useState<ParticipationMode>('open');
  const [spectatorAccess, setSpectatorAccess] = useState<SpectatorAccess>('free');
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced' | 'all'>('intermediate');
  const [maxParticipants, setMaxParticipants] = useState('10');
  const [address, setAddress] = useState('Stade Municipal de Mahamasina');
  const [locationDetails, setLocationDetails] = useState('');
  const [city, setCity] = useState('Antananarivo');
  const [latitude, setLatitude] = useState(-18.9189);
  const [longitude, setLongitude] = useState(47.5256);
  const [description, setDescription] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!sessionDate || !startTime || !address) {
      setError('Veuillez renseigner la date, l\'heure et le lieu.');
      return;
    }

    setLoading(true);
    try {
      const created = await sessionsApi.createSession({
        sport_id: sportId,
        type: 'free_match',
        competition_type: competitionType,
        participation_mode: participationMode,
        spectator_access: spectatorAccess,
        format,
        session_date: sessionDate,
        start_time: startTime,
        latitude,
        longitude,
        address,
        location_details: locationDetails.trim() || undefined,
        city,
        level,
        max_participants: parseInt(maxParticipants, 10) || 10,
        description,
      });
      onSuccess(created.id);
    } catch (err: any) {
      setError(err.message || 'Échec de la création de la rencontre.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {error && <ErrorBanner message={error} />}

        {/* ── HEADER ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.backBtn} activeOpacity={0.8}>
            <ArrowLeft size={18} color={colors.navy} strokeWidth={2.4} />
          </TouchableOpacity>
          <Text style={styles.title}>Organiser une rencontre</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* ── DISCIPLINE SPORTIVE ── */}
        <DisciplineSelector
          selectedSportId={sportId}
          onSelectSport={(discipline) => {
            setSportId(discipline.id);
            setFormat(discipline.formatDefault);
            setMaxParticipants(discipline.defaultParticipants.toString());
          }}
        />

        {/* ── TYPE DE RENCONTRE ── */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionTitleRow}>
            <Trophy size={14} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.sectionLabel}>TYPE DE RENCONTRE</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {COMPETITION_TYPES.map((t) => {
              const active = competitionType === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => setCompetitionType(t.key)}
                  style={[styles.chip, active && styles.chipActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── MODE DE PARTICIPATION & ACCÈS SPECTATEURS ── */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionTitleRow}>
            <Users size={14} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.sectionLabel}>MODE DE PARTICIPATION</Text>
          </View>
          <View style={styles.chipsWrap}>
            {PARTICIPATION_MODES.map((m) => {
              const active = participationMode === m.key;
              return (
                <TouchableOpacity
                  key={m.key}
                  onPress={() => setParticipationMode(m.key)}
                  style={[styles.chip, active && styles.chipActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{m.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <View style={styles.sectionTitleRow}>
            <Eye size={14} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.sectionLabel}>ACCÈS DES SPECTATEURS</Text>
          </View>
          <View style={styles.chipsWrap}>
            {SPECTATOR_ACCESSES.map((a) => {
              const active = spectatorAccess === a.key;
              return (
                <TouchableOpacity
                  key={a.key}
                  onPress={() => setSpectatorAccess(a.key)}
                  style={[styles.chip, active && styles.chipActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{a.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── DATE & HEURE ── */}
        <View style={styles.rowInputs}>
          <View style={styles.halfCol}>
            <DatePickerField
              label="Date de la rencontre"
              value={sessionDate}
              onChange={setSessionDate}
              minDate={new Date().toISOString().split('T')[0]}
            />
          </View>
          <View style={styles.halfCol}>
            <TimePickerField
              label="Heure de coup d'envoi"
              value={startTime}
              onChange={setStartTime}
            />
          </View>
        </View>

        {/* ── LIEU & CARTOGRAPHIE (MADAGASCAR) ── */}
        <View style={styles.locationSection}>
          {/* Sélection rapide de la ville */}
          <View style={styles.cityPickerBlock}>
            <View style={styles.sectionTitleRow}>
              <MapPin size={14} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.sectionLabel}>VILLE DE LA RENCONTRE</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cityChipsRow}>
              {['Antananarivo', 'Toamasina', 'Mahajanga', 'Antsirabe', 'Fianarantsoa', 'Toliara', 'Antsiranana', 'Morondava'].map((c) => {
                const isSelected = city.toLowerCase() === c.toLowerCase();
                return (
                  <TouchableOpacity
                    key={c}
                    onPress={() => {
                      setCity(c);
                      const found = MADAGASCAR_CITIES.find((mc) => mc.name.toLowerCase() === c.toLowerCase());
                      if (found) {
                        setLatitude(found.latitude);
                        setLongitude(found.longitude);
                        setAddress(`Terrain municipal, ${found.name}`);
                      }
                    }}
                    style={[styles.cityChip, isSelected && styles.cityChipActive]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.cityChipText, isSelected && styles.cityChipTextActive]}>{c}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <Input
              label=""
              placeholder="Ville (ex: Toamasina, Mahajanga...)"
              value={city}
              onChangeText={setCity}
            />
          </View>

          <GooglePlacesInput
            label="Lieu ou terrain"
            placeholder="Rechercher un terrain à Madagascar..."
            initialValue={address}
            onLocationSelect={(loc: PlaceLocation) => {
              setAddress(loc.formattedAddress);
              if (loc.city) setCity(loc.city);
              setLatitude(loc.latitude);
              setLongitude(loc.longitude);
            }}
          />

          <Input
            label="Repères d'accès & précisions du terrain"
            placeholder="Ex : Porte B, Terrain couvert près du Palais des Sports"
            value={locationDetails}
            onChangeText={setLocationDetails}
          />

          {/* Carte Google Maps interactive avec marqueur déplaçable */}
          <Text style={styles.interactiveMapLabel}>Position sur la carte (glissez le marqueur)</Text>
          <View style={styles.interactiveMapCard}>
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.interactiveMap}
              region={{
                latitude,
                longitude,
                latitudeDelta: 0.03,
                longitudeDelta: 0.03,
              }}
              onPress={(e) => {
                const coord = e.nativeEvent.coordinate;
                setLatitude(coord.latitude);
                setLongitude(coord.longitude);
              }}
            >
              <Marker
                draggable
                coordinate={{ latitude, longitude }}
                title={address || 'Lieu de la rencontre'}
                description={`${city} — Déplacez le marqueur pour ajuster`}
                pinColor={sportId === 1 ? colors.primary : '#FF7A29'}
                onDragEnd={(e) => {
                  const coord = e.nativeEvent.coordinate;
                  setLatitude(coord.latitude);
                  setLongitude(coord.longitude);
                }}
              />
            </MapView>
            <View style={styles.mapHintBadge}>
              <Text style={styles.mapHintText}>
                📍 Touchez la carte ou déplacez le marqueur ({latitude.toFixed(4)}, {longitude.toFixed(4)})
              </Text>
            </View>
          </View>
        </View>

        {/* ── PARTICIPANTS & NIVEAU ── */}
        <View style={styles.rowInputs}>
          <View style={styles.halfCol}>
            <Input
              label="Effectif max."
              placeholder="10 joueurs"
              keyboardType="number-pad"
              value={maxParticipants}
              onChangeText={setMaxParticipants}
            />
          </View>
          <View style={styles.halfCol}>
            <Text style={styles.fieldLabel}>Niveau requis</Text>
            <TouchableOpacity
              style={styles.levelSelector}
              onPress={() => {
                const next = level === 'beginner' ? 'intermediate' : level === 'intermediate' ? 'advanced' : 'all';
                setLevel(next);
              }}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.levelDot,
                  {
                    backgroundColor:
                      level === 'beginner' ? '#10B981' : level === 'intermediate' ? '#3B82F6' : '#F59E0B',
                  },
                ]}
              />
              <Text style={styles.levelSelectorText}>
                {level === 'beginner' ? 'Débutant' : level === 'intermediate' ? 'Intermédiaire' : level === 'advanced' ? 'Avancé' : 'Tous niveaux'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── DESCRIPTION & CONSIGNES ── */}
        <Input
          label="Consignes & règlement de la rencontre"
          placeholder="Équipements obligatoires, consignes aux équipes, vestiaires..."
          multiline
          numberOfLines={3}
          value={description}
          onChangeText={setDescription}
          style={styles.textArea}
        />

        {/* ── CTA ── */}
        <Button
          title="Publier la rencontre"
          loading={loading}
          onPress={handleSubmit}
          size="lg"
          style={styles.submitBtn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.subtle,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.navy,
  },
  sectionBlock: {
    marginBottom: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.muted,
    letterSpacing: 0.8,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: spacing.md,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
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
  rowInputs: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  halfCol: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 6,
  },
  levelSelector: {
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  levelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  levelSelectorText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
  },
  locationSection: {
    marginBottom: spacing.sm,
  },
  cityPickerBlock: {
    marginBottom: spacing.sm,
  },
  cityChipsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 8,
  },
  cityChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cityChipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  cityChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy,
  },
  cityChipTextActive: {
    color: '#FFFFFF',
  },
  interactiveMapLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    marginBottom: 6,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  interactiveMapCard: {
    height: 180,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.md,
    position: 'relative',
  },
  interactiveMap: {
    ...StyleSheet.absoluteFillObject,
  },
  mapHintBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: radius.md,
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  mapHintText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  mapWrapper: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitBtn: {
    marginTop: spacing.md,
  },
});
