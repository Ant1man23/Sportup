import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  Platform,
  Alert,
  Share,
} from 'react-native';
import {
  ChevronLeft,
  Shield,
  MessageCircle,
  UserPlus,
  Trophy,
  MapPin,
  Users,
  Crown,
  Star,
  Swords,
  ToggleLeft,
  ToggleRight,
  Calendar,
  Award,
  Share2,
} from 'lucide-react-native';
import { colors } from '../../../theme/colors';
import { radius, shadows, spacing } from '../../../theme/spacing';
import { Button } from '../../../components/Button';
import { Avatar } from '../../../components/Avatar';
import { InviteModal } from '../../../components/InviteModal';
import { teamsApi, Team, TeamMember } from '../api/teamsApi';
import { useAuthStore } from '../../../store/useAuthStore';

// ─── Level config ─────────────────────────────────────────────────────────────
const LEVEL_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  beginner:     { label: 'Débutant',      color: '#10B981', bg: '#ECFDF5' },
  intermediate: { label: 'Intermédiaire', color: '#3B82F6', bg: '#EFF6FF' },
  advanced:     { label: 'Avancé',        color: '#F59E0B', bg: '#FFFBEB' },
  elite:        { label: 'Élite',         color: '#EF4444', bg: '#FEF2F2' },
  all:          { label: 'Tous niveaux',  color: colors.primary, bg: colors.primarySoft },
};

// ─── Role config ──────────────────────────────────────────────────────────────
const ROLE_CONFIG: Record<string, { label: string; icon: React.FC<any>; color: string }> = {
  captain:      { label: 'Capitaine',     icon: Crown,  color: '#F59E0B' },
  vice_captain: { label: 'Vice-cap.',     icon: Star,   color: '#8B5CF6' },
  member:       { label: 'Membre',        icon: Users,  color: colors.muted },
};

interface TeamDetailScreenProps {
  teamId: number;
  onNavigateBack: () => void;
  onNavigateChat: (teamId: number, teamName: string) => void;
}

export const TeamDetailScreen: React.FC<TeamDetailScreenProps> = ({
  teamId,
  onNavigateBack,
  onNavigateChat,
}) => {
  const currentUser = useAuthStore((s) => s.user);
  const [team, setTeam]           = useState<Team | null>(null);
  const [loading, setLoading]     = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [togglingStatus, setTogglingStatus]   = useState(false);

  // Hero fade-in animation
  const heroAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const fetchTeam = useCallback(async () => {
    try {
      setLoading(true);
      const data = await teamsApi.getTeamDetails(teamId);
      setTeam(data);
      Animated.parallel([
        Animated.timing(heroAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    } catch (e) {
      console.warn('TeamDetail fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  const isCaptain = team?.captain?.id === currentUser?.id;

  const handleToggleOpponentStatus = async () => {
    if (!team || !isCaptain) return;
    setTogglingStatus(true);
    try {
      await teamsApi.updateOpponentStatus(
        team.id,
        !team.is_looking_for_opponent,
        team.level,
        team.city ?? undefined,
      );
      await fetchTeam();
    } catch (e: any) {
      Alert.alert('Erreur', e.message ?? 'Impossible de changer le statut.');
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleShareTeam = async () => {
    if (!team) return;
    const code = team.invite_code || `SP-${team.id}`;
    const shareMessage = `Rejoins mon équipe "${team.name}" sur SportUp !\nSport : ${team.sport?.name || 'Sport'}\nCode d'équipe : ${code}\nTélécharge l'application et rejoins-nous directement : https://sportup.app/join-team/${code}`;

    try {
      await Share.share({
        title: `Rejoins l'équipe ${team.name}`,
        message: shareMessage,
      });
    } catch (e: any) {
      console.warn('Share error:', e);
    }
  };

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centerFull}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Chargement de l'équipe...</Text>
      </View>
    );
  }

  if (!team) {
    return (
      <View style={styles.centerFull}>
        <Shield size={40} color={colors.muted} />
        <Text style={styles.loadingText}>Équipe introuvable.</Text>
        <Button title="Retour" variant="secondary" onPress={onNavigateBack} style={{ marginTop: 16 }} />
      </View>
    );
  }

  const levelCfg = LEVEL_CONFIG[team.level ?? 'intermediate'] ?? LEVEL_CONFIG.intermediate;
  const opponentActive = team.is_looking_for_opponent ?? false;
  const members: TeamMember[] = team.members ?? [];

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {/* HERO HEADER */}
      <View style={styles.hero}>
        <TouchableOpacity style={styles.backBtn} onPress={onNavigateBack} activeOpacity={0.7}>
          <ChevronLeft size={22} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>

        <Animated.View style={[styles.heroContent, { opacity: heroAnim, transform: [{ translateY: slideAnim }] }]}>
          {/* Team Badge / Logo */}
          <View style={styles.teamLogoOuter}>
            <View style={styles.teamLogoBg}>
              <Text style={styles.teamLogoText}>{team.initials ?? team.name.substring(0, 2).toUpperCase()}</Text>
            </View>
          </View>

          <Text style={styles.heroTeamName}>{team.name}</Text>

          <View style={styles.heroMetaRow}>
            <View style={[styles.levelPill, { backgroundColor: levelCfg.bg }]}>
              <Award size={11} color={levelCfg.color} />
              <Text style={[styles.levelPillText, { color: levelCfg.color }]}>{levelCfg.label}</Text>
            </View>
            {team.sport && (
              <View style={styles.sportPill}>
                <Text style={styles.sportPillText}>{team.sport.name}</Text>
              </View>
            )}
            {team.invite_code ? (
              <TouchableOpacity
                style={[styles.levelPill, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                onPress={handleShareTeam}
                activeOpacity={0.7}
              >
                <Share2 size={11} color="#FFFFFF" />
                <Text style={[styles.levelPillText, { color: '#FFFFFF', fontWeight: 'bold' }]}>
                  {team.invite_code}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.heroInfoRow}>
            {team.city ? (
              <View style={styles.heroInfoItem}>
                <MapPin size={12} color="rgba(255,255,255,0.8)" />
                <Text style={styles.heroInfoText}>{team.city}</Text>
              </View>
            ) : null}
            <View style={styles.heroInfoItem}>
              <Users size={12} color="rgba(255,255,255,0.8)" />
              <Text style={styles.heroInfoText}>{team.members_count} membre{team.members_count !== 1 ? 's' : ''}</Text>
            </View>
            <View style={styles.heroInfoItem}>
              <Trophy size={12} color="rgba(255,255,255,0.8)" />
              <Text style={styles.heroInfoText}>Capitaine : {team.captain?.username ?? '?'}</Text>
            </View>
          </View>
        </Animated.View>
      </View>

      {/* SCROLLABLE BODY */}
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {/* ACTION BUTTONS */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onNavigateChat(team.id, team.name)}
            activeOpacity={0.85}
          >
            <MessageCircle size={18} color={colors.primary} />
            <Text style={styles.actionBtnText}>Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleShareTeam}
            activeOpacity={0.85}
          >
            <Share2 size={18} color={colors.primary} />
            <Text style={styles.actionBtnText}>Partager</Text>
          </TouchableOpacity>

          {isCaptain && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setShowInviteModal(true)}
              activeOpacity={0.85}
            >
              <UserPlus size={18} color={colors.primary} />
              <Text style={styles.actionBtnText}>Inviter</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.85}>
            <Swords size={18} color={colors.primary} />
            <Text style={styles.actionBtnText}>Match</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.85}>
            <Calendar size={18} color={colors.primary} />
            <Text style={styles.actionBtnText}>Agenda</Text>
          </TouchableOpacity>
        </View>

        {/* SEARCHING OPPONENT STATUS CARD */}
        <View style={[styles.card, { marginBottom: spacing.md }]}>
          <View style={styles.cardRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Recherche d'adversaire</Text>
              <Text style={styles.cardSub}>
                {opponentActive
                  ? 'Votre équipe est visible par les adversaires potentiels.'
                  : 'Activez pour apparaître dans la liste des équipes disponibles.'}
              </Text>
            </View>
            {isCaptain ? (
              <TouchableOpacity
                onPress={handleToggleOpponentStatus}
                activeOpacity={0.8}
                disabled={togglingStatus}
              >
                {togglingStatus ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : opponentActive ? (
                  <ToggleRight size={36} color={colors.success} />
                ) : (
                  <ToggleLeft size={36} color={colors.muted} />
                )}
              </TouchableOpacity>
            ) : (
              <View style={[styles.statusBadge, { backgroundColor: opponentActive ? colors.successSoft : colors.borderLight }]}>
                <Text style={[styles.statusBadgeText, { color: opponentActive ? colors.success : colors.muted }]}>
                  {opponentActive ? '● Actif' : '● Inactif'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* STATS ROW */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{team.members_count}</Text>
            <Text style={styles.statLabel}>Membres</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{team.matches_count ?? 0}</Text>
            <Text style={styles.statLabel}>Matchs</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{team.wins_count ?? 0}</Text>
            <Text style={styles.statLabel}>Victoires</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.danger }]}>{team.losses_count ?? 0}</Text>
            <Text style={styles.statLabel}>Défaites</Text>
          </View>
        </View>

        {/* MEMBERS LIST */}
        <View style={styles.sectionHeader}>
          <Shield size={16} color={colors.primary} />
          <Text style={styles.sectionTitle}>Effectif ({members.length})</Text>
        </View>

        {members.length === 0 ? (
          <View style={styles.emptyMembers}>
            <Users size={32} color={colors.muted} />
            <Text style={styles.emptyText}>Aucun membre trouvé.</Text>
          </View>
        ) : (
          members.map((m, idx) => <MemberRow key={m.user?.id ?? idx} member={m} />)
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* INVITE MODAL */}
      <InviteModal
        visible={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        targetType="team"
        targetId={team.id}
        targetTitle={team.name}
        onSuccess={fetchTeam}
      />
    </View>
  );
};

// ─── MemberRow Component ──────────────────────────────────────────────────────
const MemberRow: React.FC<{ member: TeamMember }> = ({ member }) => {
  const roleCfg = ROLE_CONFIG[member.role] ?? ROLE_CONFIG.member;
  const RoleIcon = roleCfg.icon;

  return (
    <View style={styles.memberRow}>
      <Avatar
        name={member.user?.username ?? 'Joueur'}
        photoUrl={member.user?.photo_path ?? null}
        size={42}
      />
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{member.user?.username ?? 'Joueur'}</Text>
        <Text style={styles.memberCity}>{member.user?.city ?? 'Localisation inconnue'}</Text>
      </View>
      <View style={[styles.rolePill, { backgroundColor: roleCfg.color + '1A' }]}>
        <RoleIcon size={11} color={roleCfg.color} />
        <Text style={[styles.roleText, { color: roleCfg.color }]}>{roleCfg.label}</Text>
      </View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Loading / Error
  centerFull: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  loadingText: {
    color: colors.muted,
    fontSize: 14,
    marginTop: spacing.sm,
  },

  // HERO
  hero: {
    backgroundColor: colors.navy,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 32,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    ...shadows.card,
  },
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 16,
    left: spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  heroContent: {
    alignItems: 'center',
    marginTop: 8,
  },
  teamLogoOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  teamLogoBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamLogoText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  heroTeamName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 10,
    textAlign: 'center',
  },
  heroMetaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  levelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  levelPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  sportPill: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  sportPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroInfoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  heroInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroInfoText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
  },

  // BODY
  body: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },

  // ACTION BUTTONS
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.lg,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 6,
    ...shadows.card,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },

  // CARD
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.navy,
    marginBottom: 2,
  },
  cardSub: {
    fontSize: 11,
    color: colors.muted,
    lineHeight: 16,
    maxWidth: 220,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },

  // STATS
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    ...shadows.card,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.navy,
  },
  statLabel: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '600',
    marginTop: 2,
  },

  // SECTION HEADER
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.navy,
  },

  // MEMBERS
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.navy,
  },
  memberCity: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '800',
  },

  // EMPTY
  emptyMembers: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  emptyText: {
    fontSize: 13,
    color: colors.muted,
    marginTop: spacing.sm,
  },
});
