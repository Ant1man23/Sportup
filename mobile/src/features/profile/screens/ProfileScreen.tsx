import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
  PermissionsAndroid,
  StatusBar,
} from 'react-native';
import {
  Camera,
  Settings,
  Trophy,
  Award,
  Flame,
  LogOut,
  BarChart3,
  Image as ImageIcon,
  Edit3,
  MapPin,
  Shield,
  X,
  ChevronLeft,
  ChevronRight,
  Bell,
  CheckCircle2,
  Server,
} from 'lucide-react-native';
import { launchCamera, launchImageLibrary, Asset } from 'react-native-image-picker';
import { colors } from '../../../theme/colors';
import { radius, shadows, spacing } from '../../../theme/spacing';
import { Avatar } from '../../../components/Avatar';
import { Button } from '../../../components/Button';
import { ApiServerModal } from '../../../components/ApiServerModal';
import { getActiveApiUrl } from '../../../api/client';
import { useAuthStore } from '../../../store/useAuthStore';
import { profileApi, UserProfileResponse, UserStats, GamificationData } from '../api/profileApi';
import { BadgesGallery } from '../components/BadgesGallery';

const LEVEL_CONFIG: Record<string, { label: string; color: string; next: string; xp: number; targetXp: number }> = {
  beginner: { label: 'Débutant', color: '#10B981', next: 'Intermédiaire', xp: 35, targetXp: 100 },
  intermediate: { label: 'Intermédiaire', color: '#3B82F6', next: 'Avancé', xp: 65, targetXp: 100 },
  advanced: { label: 'Avancé', color: '#F59E0B', next: 'Élite', xp: 85, targetXp: 100 },
  elite: { label: 'Élite', color: '#EF4444', next: 'Légende', xp: 100, targetXp: 100 },
  all: { label: 'Tous niveaux', color: colors.primary, next: 'Intermédiaire', xp: 50, targetXp: 100 },
};

interface ProfileScreenProps {
  onNavigateStats?: () => void;
  onNavigateNotifications?: () => void;
  onNavigateBack?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onNavigateStats,
  onNavigateNotifications,
  onNavigateBack,
}) => {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<UserProfileResponse | null>(null);
  const [stats, setStats] = useState<UserStats>({
    matches_played: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    win_rate: 0,
    goals_scored: 0,
    points_scored: 0,
    mvp_count: 0,
  });

  const [gamification, setGamification] = useState<GamificationData | null>(null);

  const [photoPickerVisible, setPhotoPickerVisible] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [selectedPhotoAsset, setSelectedPhotoAsset] = useState<Asset | null>(null);
  const [serverModalVisible, setServerModalVisible] = useState(false);

  const [editVisible, setEditVisible] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const xpAnim = useRef(new Animated.Value(0)).current;

  const loadProfile = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [pData, sData] = await Promise.all([
        profileApi.getUserProfile(user.id),
        profileApi.getUserStats(user.id),
      ]);
      setProfileData(pData);
      if (sData?.summary) {
        setStats(sData.summary);
      }
      if (sData?.gamification) {
        setGamification(sData.gamification);
      } else if (pData?.gamification) {
        setGamification(pData.gamification);
      }
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(xpAnim, { toValue: 1, duration: 700, useNativeDriver: false }),
      ]).start();
    } catch {
      // Keep existing data on transient network error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [user?.id]);

  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Permission Caméra',
          message: 'SportUp a besoin d’accès à votre appareil photo pour votre avatar sportif.',
          buttonPositive: 'Autoriser',
          buttonNegative: 'Annuler',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  };

  const handleUploadAsset = async (asset: Asset) => {
    if (!asset.uri) return;
    setPhotoPickerVisible(false);
    setSelectedPhotoAsset(asset);
    setUploadingPhoto(true);

    try {
      if (asset.base64) {
        const updated = await profileApi.updateProfile({
          avatar_base64: asset.base64,
        });
        setUser({ ...user, ...updated });
        loadProfile();
        Alert.alert('Succès', 'Photo de profil mise à jour.');
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de mettre à jour la photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleTakePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert('Permission refusée', 'Accès caméra requis.');
      return;
    }

    launchCamera(
      {
        mediaType: 'photo',
        cameraType: 'front',
        quality: 0.8,
        maxWidth: 800,
        maxHeight: 800,
        includeBase64: true,
      },
      (response) => {
        if (response.didCancel || response.errorCode) return;
        if (response.assets && response.assets.length > 0) {
          handleUploadAsset(response.assets[0]);
        }
      }
    );
  };

  const handleChooseFromGallery = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 800,
        maxHeight: 800,
        selectionLimit: 1,
        includeBase64: true,
      },
      (response) => {
        if (response.didCancel || response.errorCode) return;
        if (response.assets && response.assets.length > 0) {
          handleUploadAsset(response.assets[0]);
        }
      }
    );
  };

  const handleSaveProfile = async () => {
    if (!editUsername.trim()) {
      Alert.alert('Validation', 'Le nom d’utilisateur ne peut pas être vide.');
      return;
    }
    setEditLoading(true);
    try {
      const payload: any = {
        username: editUsername.trim(),
        city: editCity.trim(),
      };
      if (selectedPhotoAsset?.base64) {
        payload.avatar_base64 = selectedPhotoAsset.base64;
      }
      const updated = await profileApi.updateProfile(payload);
      setUser({
        ...user,
        ...updated,
      });
      setSelectedPhotoAsset(null);
      setEditVisible(false);
      loadProfile();
      Alert.alert('Succès', 'Profil athlète mis à jour.');
    } catch {
      Alert.alert('Erreur', 'Impossible de mettre à jour le profil.');
    } finally {
      setEditLoading(false);
    }
  };

  const openEdit = () => {
    setEditUsername(currentUser?.username || '');
    setEditCity(currentUser?.city || '');
    setEditVisible(true);
  };

  const handleConfirmLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter de votre compte SportUp ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Se déconnecter', style: 'destructive', onPress: logout },
      ]
    );
  };

  if (loading && !profileData) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Chargement du profil...</Text>
      </View>
    );
  }

  const currentUser = profileData?.user || user;
  const favoriteSports = profileData?.favorite_sports || [];
  const rank = profileData?.rank;
  const levelKey = (currentUser?.level || 'intermediate').toLowerCase();
  const levelConfig = LEVEL_CONFIG[levelKey] || LEVEL_CONFIG.intermediate;
  const winRate = stats.win_rate || 0;
  const mvpCount = stats.mvp_count || 0;

  const avatarPhotoUrl =
    currentUser?.photo_url ||
    (currentUser?.photo_path?.startsWith('http') ? currentUser.photo_path : null);

  const xpWidth = xpAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', `${levelConfig.xp}%`],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.navy} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── ATHLETIC HERO HEADER ── */}
        <View style={styles.heroBanner}>
          {/* Top navigation actions */}
          <View style={styles.heroTopBar}>
            {onNavigateBack ? (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={onNavigateBack}
                activeOpacity={0.7}
              >
                <ChevronLeft size={20} color="#FFFFFF" strokeWidth={2.4} />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 38 }} />
            )}

            <View style={styles.heroHeaderTitleBox}>
              <Text style={styles.heroHeaderTitle}>PROFIL ATHLÈTE</Text>
            </View>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={openEdit}
              activeOpacity={0.7}
            >
              <Settings size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Profile Identity */}
          <Animated.View
            style={[
              styles.profileOverlay,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.avatarWrapper}>
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => setPhotoPickerVisible(true)}
                style={styles.avatarTouchable}
              >
                <Avatar
                  name={currentUser?.username || 'SportUp'}
                  photoUrl={avatarPhotoUrl}
                  size={92}
                />
                {uploadingPhoto && (
                  <View style={styles.avatarUploadOverlay}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cameraBadge}
                onPress={() => setPhotoPickerVisible(true)}
                disabled={uploadingPhoto}
                activeOpacity={0.85}
              >
                <Camera size={14} color="#FFFFFF" strokeWidth={2.2} />
              </TouchableOpacity>
            </View>

            <View style={styles.identityRow}>
              <Text style={styles.username}>{currentUser?.username || 'Athlète'}</Text>
              <View style={styles.verifiedBadge}>
                <CheckCircle2 size={13} color="#3B82F6" strokeWidth={2.4} />
              </View>
            </View>

            <View style={styles.locationPill}>
              <MapPin size={12} color="#94A3B8" />
              <Text style={styles.locationText}>
                {currentUser?.city ? currentUser.city : 'Madagascar'}
              </Text>
              <Text style={styles.dotSeparator}>•</Text>
              <Text style={styles.memberStatus}>Membre SportUp</Text>
            </View>

            {/* Level & XP Progress Card */}
            <View style={styles.xpCard}>
              <View style={styles.xpTopRow}>
                <View style={styles.levelTag}>
                  <Trophy size={13} color={levelConfig.color} style={{ marginRight: 5 }} />
                  <Text style={[styles.levelTagText, { color: levelConfig.color }]}>
                    {levelConfig.label.toUpperCase()}{rank ? ` • CLASSEMENT #${rank}` : ''}
                  </Text>
                </View>
                <Text style={styles.xpRatioText}>
                  {levelConfig.xp} / {levelConfig.targetXp} XP
                </Text>
              </View>

              <View style={styles.xpTrack}>
                <Animated.View
                  style={[
                    styles.xpFill,
                    {
                      width: xpWidth,
                      backgroundColor: levelConfig.color,
                    },
                  ]}
                />
              </View>

              <View style={styles.xpBottomRow}>
                <Text style={styles.xpHint}>
                  Plus que {levelConfig.targetXp - levelConfig.xp} XP avant le rang {levelConfig.next}
                </Text>
              </View>
            </View>
          </Animated.View>
        </View>

        {/* ── KEY PERFORMANCE METRICS DOCK ── */}
        <View style={styles.statsFloatingCard}>
          <View style={styles.metricItem}>
            <Text style={styles.metricNumber}>{stats.matches_played}</Text>
            <Text style={styles.metricLabel}>MATCHS</Text>
          </View>
          <View style={styles.metricDivider} />

          <View style={styles.metricItem}>
            <Text style={[styles.metricNumber, { color: colors.success }]}>
              {stats.wins}
            </Text>
            <Text style={styles.metricLabel}>VICTOIRES</Text>
          </View>
          <View style={styles.metricDivider} />

          <View style={styles.metricItem}>
            <Text
              style={[
                styles.metricNumber,
                { color: winRate >= 50 ? colors.success : colors.warning },
              ]}
            >
              {winRate}%
            </Text>
            <Text style={styles.metricLabel}>WIN RATE</Text>
          </View>
          <View style={styles.metricDivider} />

          <View style={styles.metricItem}>
            <View style={styles.awardRow}>
              <Award size={15} color="#F59E0B" style={{ marginRight: 3 }} />
              <Text style={[styles.metricNumber, { color: '#F59E0B' }]}>
                {mvpCount}
              </Text>
            </View>
            <Text style={styles.metricLabel}>MVP</Text>
          </View>
        </View>

        {/* ── BADGES & GAMIFICATION GALLERY ── */}
        {gamification && (
          <View style={{ marginHorizontal: spacing.md, marginBottom: spacing.md }}>
            <BadgesGallery gamification={gamification} />
          </View>
        )}

        {/* ── QUICK ACTION TILES ── */}
        <View style={styles.section}>
          <Text style={styles.sectionOverline}>ESPACE ATHLÈTE</Text>

          <View style={styles.navCard}>
            {onNavigateStats && (
              <TouchableOpacity
                style={styles.navRow}
                onPress={onNavigateStats}
                activeOpacity={0.7}
              >
                <View style={[styles.navIconBox, { backgroundColor: 'rgba(20, 86, 217, 0.1)' }]}>
                  <BarChart3 size={18} color={colors.primary} />
                </View>
                <View style={styles.navRowBody}>
                  <Text style={styles.navRowTitle}>Statistiques & Graphiques</Text>
                  <Text style={styles.navRowSub}>Analyses de tirs, forme, ratios et historiques</Text>
                </View>
                <ChevronRight size={18} color={colors.mutedLight} />
              </TouchableOpacity>
            )}

            {onNavigateStats && onNavigateNotifications && <View style={styles.navDivider} />}

            {onNavigateNotifications && (
              <TouchableOpacity
                style={styles.navRow}
                onPress={onNavigateNotifications}
                activeOpacity={0.7}
              >
                <View style={[styles.navIconBox, { backgroundColor: 'rgba(242, 139, 46, 0.1)' }]}>
                  <Bell size={18} color="#F28B2E" />
                </View>
                <View style={styles.navRowBody}>
                  <Text style={styles.navRowTitle}>Préférences de Notifications</Text>
                  <Text style={styles.navRowSub}>Rappels de match, scores en direct et alertes</Text>
                </View>
                <ChevronRight size={18} color={colors.mutedLight} />
              </TouchableOpacity>
            )}

            <View style={styles.navDivider} />

            <TouchableOpacity
              style={styles.navRow}
              onPress={openEdit}
              activeOpacity={0.7}
            >
              <View style={[styles.navIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Edit3 size={18} color="#10B981" />
              </View>
              <View style={styles.navRowBody}>
                <Text style={styles.navRowTitle}>Éditer le profil public</Text>
                <Text style={styles.navRowSub}>Nom d'utilisateur, photo et localisation</Text>
              </View>
              <ChevronRight size={18} color={colors.mutedLight} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── FAVORITE SPORTS ── */}
        {favoriteSports.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Flame size={16} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.sectionTitle}>Sports de prédilection</Text>
            </View>

            <View style={styles.sportsList}>
              {favoriteSports.map((sport) => {
                const sportColor = sport.color_hex || colors.primary;
                return (
                  <View key={sport.id} style={styles.sportBadge}>
                    <View style={[styles.sportDot, { backgroundColor: sportColor }]} />
                    <Text style={styles.sportName}>{sport.name}</Text>
                    <View style={styles.sportLevelPill}>
                      <Text style={styles.sportLevelText}>Actif</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── API SERVER CONFIGURATION ── */}
        <View style={{ marginHorizontal: spacing.md, marginBottom: spacing.sm }}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              padding: spacing.md,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: '#E4E7EC',
            }}
            onPress={() => setServerModalVisible(true)}
            activeOpacity={0.8}
          >
            <Server size={18} color={colors.primary} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Serveur API & Réseau</Text>
              <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }} numberOfLines={1}>
                {getActiveApiUrl()}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {/* ── LOGOUT / SESSION ── */}
        <View style={styles.logoutSection}>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleConfirmLogout}
            activeOpacity={0.8}
          >
            <LogOut size={16} color={colors.danger} style={{ marginRight: 8 }} />
            <Text style={styles.logoutBtnText}>Se déconnecter</Text>
          </TouchableOpacity>
          <Text style={styles.versionText}>SportUp v2.4 • Précision sportive</Text>
        </View>
      </ScrollView>

      {/* ── MODAL: EDIT ATHLETE PROFILE ── */}
      <Modal
        visible={editVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Modifier mon profil</Text>
                <Text style={styles.modalSub}>Informations visibles par vos coéquipiers</Text>
              </View>
              <TouchableOpacity
                onPress={() => setEditVisible(false)}
                style={styles.modalCloseBtn}
              >
                <X size={18} color={colors.navy} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalAvatarRow}>
              <Avatar
                name={currentUser?.username || ''}
                photoUrl={avatarPhotoUrl}
                size={58}
              />
              <TouchableOpacity
                style={styles.modalChangePhotoBtn}
                onPress={() => {
                  setEditVisible(false);
                  setTimeout(() => setPhotoPickerVisible(true), 300);
                }}
              >
                <ImageIcon size={14} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.modalChangePhotoText}>Changer la photo</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>NOM D’UTILISATEUR</Text>
              <TextInput
                style={styles.input}
                value={editUsername}
                onChangeText={setEditUsername}
                placeholder="Votre pseudo"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>VILLE DE RÉSIDENCE</Text>
              <TextInput
                style={styles.input}
                value={editCity}
                onChangeText={setEditCity}
                placeholder="Ex : Antananarivo, Tamatave..."
                placeholderTextColor={colors.muted}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <Button
                title="Enregistrer"
                loading={editLoading}
                onPress={handleSaveProfile}
                style={styles.saveBtn}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: PHOTO PICKER ── */}
      <Modal
        visible={photoPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalCard}>
            <Text style={styles.modalTitle}>Photo de profil</Text>
            <Text style={styles.pickerSubtitle}>Choisissez une source pour mettre à jour votre avatar</Text>

            <TouchableOpacity
              style={styles.pickerOption}
              onPress={handleTakePhoto}
              activeOpacity={0.7}
            >
              <View style={[styles.pickerIconBg, { backgroundColor: colors.primarySoft }]}>
                <Camera size={20} color={colors.primary} />
              </View>
              <View style={styles.pickerOptionTexts}>
                <Text style={styles.pickerOptionTitle}>Prendre une photo</Text>
                <Text style={styles.pickerOptionDesc}>Activer la caméra frontale</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pickerOption}
              onPress={handleChooseFromGallery}
              activeOpacity={0.7}
            >
              <View style={[styles.pickerIconBg, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                <Shield size={20} color="#10B981" />
              </View>
              <View style={styles.pickerOptionTexts}>
                <Text style={styles.pickerOptionTitle}>Choisir depuis la galerie</Text>
                <Text style={styles.pickerOptionDesc}>Sélectionner un fichier image</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelPickerBtn}
              onPress={() => setPhotoPickerVisible(false)}
            >
              <Text style={styles.cancelPickerText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: API SERVER & NETWORK CONFIGURATION ── */}
      <ApiServerModal
        visible={serverModalVisible}
        onClose={() => setServerModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C1827',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    paddingBottom: 48,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    fontSize: 13,
    color: colors.muted,
    marginTop: spacing.md,
    fontWeight: '500',
  },

  // ── Hero Banner ──
  heroBanner: {
    backgroundColor: '#0C1827',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 36,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  heroHeaderTitleBox: {
    alignItems: 'center',
  },
  heroHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: 1.4,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileOverlay: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  avatarTouchable: {
    borderRadius: 48,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  avatarUploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#0C1827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  username: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  verifiedBadge: {
    padding: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  dotSeparator: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 12,
  },
  memberStatus: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },

  // XP Card
  xpCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  xpTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  levelTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelTagText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  xpRatioText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  xpTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    borderRadius: 3,
  },
  xpBottomRow: {
    marginTop: 6,
  },
  xpHint: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '500',
  },

  // ── Floating Metrics Card ──
  statsFloatingCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.lg,
    marginTop: -20,
    borderRadius: radius.xl,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy,
    letterSpacing: -0.5,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 0.8,
    marginTop: 3,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.borderLight,
    alignSelf: 'center',
  },
  awardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // ── Section ──
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  sectionOverline: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 1.2,
    marginBottom: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.navy,
  },

  // ── Navigation Card ──
  navCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.subtle,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
  },
  navIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  navRowBody: {
    flex: 1,
  },
  navRowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy,
  },
  navRowSub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },
  navDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderLight,
    marginLeft: 60,
  },

  // ── Sports List ──
  sportsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  sportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  sportDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  sportName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy,
  },
  sportLevelPill: {
    marginLeft: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sportLevelText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
  },

  // ── Logout ──
  logoutSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.danger,
  },
  versionText: {
    fontSize: 11,
    color: colors.mutedLight,
    marginTop: 14,
    fontWeight: '500',
  },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(12, 24, 39, 0.65)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: spacing.xl,
    ...shadows.card,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy,
  },
  modalSub: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  modalChangePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  modalChangePhotoText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.muted,
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: colors.navy,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: colors.navy,
    fontWeight: '700',
    fontSize: 13,
  },
  saveBtn: {
    flex: 1,
    height: 44,
  },

  // ── Photo Picker Modal ──
  pickerModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: spacing.xl,
    ...shadows.card,
  },
  pickerSubtitle: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: spacing.lg,
    marginTop: 2,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: '#F8FAFC',
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerIconBg: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  pickerOptionTexts: {
    flex: 1,
  },
  pickerOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy,
  },
  pickerOptionDesc: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  cancelPickerBtn: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelPickerText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
  },
});
