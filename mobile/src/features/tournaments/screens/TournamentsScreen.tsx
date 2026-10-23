import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Share,
  Linking,
} from 'react-native';
import {
  Trophy,
  Calendar,
  Users,
  ArrowRight,
  Sparkles,
  ChevronLeft,
  Plus,
  Award,
  GitCommit,
  UserPlus,
  Check,
  Swords,
  Shield,
  Crown,
  ChevronRight,
  MessageCircle,
} from 'lucide-react-native';
import { colors } from '../../../theme/colors';
import { radius, shadows, spacing } from '../../../theme/spacing';
import { Badge } from '../../../components/Badge';
import { Button } from '../../../components/Button';
import { tournamentsApi } from '../../../api/tournamentsApi';
import { teamsApi, Team } from '../../teams/api/teamsApi';
import { useAuthStore } from '../../../store/useAuthStore';
import { Tournament, TournamentStanding, TournamentMatch } from '../../../types';
import { TournamentBracket } from '../components/TournamentBracket';

type SportFilter = 'all' | 'football' | 'basketball' | 'volleyball' | 'table-tennis';
type BracketStageFilter = 'all' | 'round_of_16' | 'quarter_finals' | 'semi_finals' | 'final';

interface TournamentsScreenProps {
  onNavigateBack?: () => void;
  onNavigateMatch?: (matchId: number) => void;
}

export const TournamentsScreen: React.FC<TournamentsScreenProps> = ({
  onNavigateBack,
  onNavigateMatch,
}) => {
  const currentUser = useAuthStore((state) => state.user);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSport, setActiveSport] = useState<SportFilter>('all');
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);

  // Tournament view tabs inside modal: 'info' | 'standings' | 'bracket'
  const [detailTab, setDetailTab] = useState<'info' | 'standings' | 'bracket'>('info');
  const [standings, setStandings] = useState<TournamentStanding[]>([]);
  const [bracket, setBracket] = useState<TournamentMatch[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [bracketFilter, setBracketFilter] = useState<BracketStageFilter>('all');
  const [bracketViewMode, setBracketViewMode] = useState<'tree' | 'list'>('tree');

  // Inscription Modal State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [myCaptainedTeams, setMyCaptainedTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [registeringTeam, setRegisteringTeam] = useState(false);

  // Create Tournament Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    sport_id: 1,
    format: 'knockout' as 'groups' | 'knockout' | 'groups_then_knockout',
    start_date: new Date().toISOString().split('T')[0],
    max_teams: 16,
    prize_pool: '500 000 Ar',
    description: '',
  });
  const [creating, setCreating] = useState(false);

  const fetchTournaments = useCallback(async () => {
    try {
      const data = await tournamentsApi.getTournaments();
      setTournaments(data);
    } catch {
      // Keep empty list on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTournaments();
  };

  const handleOpenDetails = async (t: Tournament) => {
    setSelectedTournament(t);
    setDetailTab('info');
    setLoadingDetail(true);
    try {
      const details = await tournamentsApi.getTournamentDetails(t.id);
      setSelectedTournament(details);
      const [st, br] = await Promise.all([
        tournamentsApi.getStandings(t.id),
        tournamentsApi.getBracket(t.id),
      ]);
      setStandings(st);
      setBracket(br);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleShareTournamentWhatsApp = async (t: Tournament) => {
    const sportName = t.sport?.name || 'Compétition SportUp';
    const teamsCount = t.teams_count ?? t.teams?.length ?? 0;
    const maxTeams = t.max_teams || 16;
    const prize = t.prize_pool ? `\n🎁 Cashprize & Récompenses : *${t.prize_pool}*` : '';
    const date = t.starts_on || t.start_date || 'Date à venir';

    const text = `🏆 *GRAND TOURNOI SPORTUP : ${t.name.toUpperCase()} !*\nDiscipline : *${sportName}* (${t.format || 'Élimination directe'})${prize}\n📅 Début : *${date}*\n👥 Équipes inscrites : *${teamsCount}/${maxTeams}*\n\n👉 *Inscrivez votre équipe ou suivez les matchs en direct sur SportUp :*\nhttps://sportup.mg/tournaments/${t.id}`;

    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(text)}`;
    try {
      const supported = await Linking.canOpenURL(whatsappUrl);
      if (supported) {
        await Linking.openURL(whatsappUrl);
      } else {
        await Share.share({ message: text, title: t.name });
      }
    } catch {
      await Share.share({ message: text, title: t.name });
    }
  };

  // ── Inscription d'équipe ──────────────────────────────────────────────────

  const handleOpenRegisterModal = async () => {
    if (!selectedTournament) return;
    setLoadingTeams(true);
    setShowRegisterModal(true);
    try {
      const allTeams = await teamsApi.listTeams();
      // Filter teams where currentUser is captain
      const captained = allTeams.filter((t) => t.captain?.id === currentUser?.id);
      setMyCaptainedTeams(captained);
      if (captained.length > 0) {
        setSelectedTeamId(captained[0].id);
      } else {
        setSelectedTeamId(null);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoadingTeams(false);
    }
  };

  const handleConfirmRegistration = async () => {
    if (!selectedTournament || !selectedTeamId) {
      Alert.alert('Équipe requise', 'Veuillez sélectionner une équipe.');
      return;
    }
    setRegisteringTeam(true);
    try {
      await tournamentsApi.registerTeam(selectedTournament.id, selectedTeamId);
      Alert.alert('Félicitations !', 'Votre équipe a été inscrite avec succès au tournoi.');
      setShowRegisterModal(false);
      // Reload details & list
      handleOpenDetails(selectedTournament);
      fetchTournaments();
    } catch (err: any) {
      Alert.alert('Inscription', err?.response?.data?.message || err.message || 'Impossible d\'inscrire cette équipe.');
    } finally {
      setRegisteringTeam(false);
    }
  };

  const handleCreateTournament = async () => {
    if (!createForm.name.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir le nom du tournoi.');
      return;
    }
    setCreating(true);
    try {
      await tournamentsApi.createTournament(createForm);
      Alert.alert('Succès', 'Tournoi créé avec succès !');
      setShowCreateModal(false);
      fetchTournaments();
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Impossible de créer le tournoi.');
    } finally {
      setCreating(false);
    }
  };

  const handleTriggerDraw = async () => {
    if (!selectedTournament) return;
    try {
      await tournamentsApi.drawTournament(selectedTournament.id);
      Alert.alert('Tirage effectué', 'Les poules et l\'arbre du tournoi ont été générés avec succès !');
      handleOpenDetails(selectedTournament);
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Le tirage a échoué. Assurez-vous d\'avoir au moins 2 équipes inscrites.');
    }
  };

  const filteredTournaments = tournaments.filter((t) => {
    if (activeSport === 'all') return true;
    return t.sport?.slug?.includes(activeSport);
  });

  const featured = tournaments.find((t) => t.is_featured) || tournaments[0];

  // Check if current user has a team already enrolled
  const isUserTeamEnrolled = selectedTournament?.teams?.some(
    (t) => t.id === selectedTeamId || t.name === currentUser?.username
  );

  const isOrganizer = selectedTournament?.organizer?.id === currentUser?.id;

  // Filter bracket matches by stage
  const filteredBracket = bracket.filter((m) => {
    if (bracketFilter === 'all') return true;
    return m.stage === bracketFilter;
  });

  const getStageTitle = (stage: string) => {
    switch (stage) {
      case 'final':
        return '🏆 Grande Finale';
      case 'semi_finals':
        return '⚡ Demi-Finale';
      case 'quarter_finals':
        return '🎯 Quart de Finale';
      case 'round_of_16':
        return '⚔️ Huitièmes de Finale';
      default:
        return stage?.toUpperCase() || 'Match éliminatoire';
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
    >
      {/* ── TOP HEADER ── */}
      <View style={styles.topHeader}>
        {onNavigateBack && (
          <TouchableOpacity onPress={onNavigateBack} style={styles.backButton} activeOpacity={0.7}>
            <ChevronLeft size={20} color={colors.navy} strokeWidth={2.4} />
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.screenHeaderTitle}>Tournois & Coupes</Text>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.85}
        >
          <Plus size={16} color="#FFFFFF" strokeWidth={2.6} />
          <Text style={styles.createBtnText}>Organiser</Text>
        </TouchableOpacity>
      </View>

      {/* ── FEATURED HERO CARD ── */}
      {featured ? (
        <TouchableOpacity
          style={[styles.featuredCard, styles.featuredBorder]}
          onPress={() => handleOpenDetails(featured)}
          activeOpacity={0.9}
        >
          <View style={styles.featuredTopRow}>
            <View style={styles.featuredBadge}>
              <Sparkles size={12} color="#FBBF24" style={{ marginRight: 4 }} />
              <Text style={styles.featuredBadgeText}>TOURNOI VEDETTE</Text>
            </View>
            {featured.prize_pool && (
              <View style={styles.prizeBadge}>
                <Award size={12} color="#34D399" style={{ marginRight: 4 }} />
                <Text style={styles.prizeBadgeText}>{featured.prize_pool}</Text>
              </View>
            )}
          </View>

          <Text style={styles.featuredTitle}>{featured.name}</Text>

          <View style={styles.featuredMetaRow}>
            <View style={styles.featuredMetaItem}>
              <Calendar size={13} color="rgba(255,255,255,0.7)" style={{ marginRight: 4 }} />
              <Text style={styles.featuredMetaText}>{featured.starts_on || featured.start_date || 'Bientôt'}</Text>
            </View>
            <View style={styles.featuredMetaDivider} />
            <View style={styles.featuredMetaItem}>
              <Users size={13} color="rgba(255,255,255,0.7)" style={{ marginRight: 4 }} />
              <Text style={styles.featuredMetaText}>
                {featured.teams_count ?? featured.teams?.length ?? 0}/{featured.max_teams || 16} équipes
              </Text>
            </View>
          </View>

          <View style={styles.featuredRegisterBtn}>
            <Text style={styles.featuredRegisterBtnText}>Consulter & Participer</Text>
            <ArrowRight size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
          </View>
        </TouchableOpacity>
      ) : null}

      {/* ── SPORT FILTER TABS ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow}>
        {(['all', 'football', 'basketball', 'volleyball', 'table-tennis'] as SportFilter[]).map((slug) => {
          const labels: Record<SportFilter, string> = {
            all: 'Tous les sports',
            football: '⚽ Football',
            basketball: '🏀 Basketball',
            volleyball: '🏐 Volleyball',
            'table-tennis': '🏓 Tennis de Table',
          };
          const isActive = activeSport === slug;
          return (
            <TouchableOpacity
              key={slug}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveSport(slug)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{labels[slug]}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── TOURNAMENTS LIST ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Compétitions disponibles</Text>
        <Text style={styles.sectionCount}>{filteredTournaments.length} tournois</Text>
      </View>

      {filteredTournaments.length === 0 ? (
        <View style={styles.emptyBox}>
          <Trophy size={36} color={colors.muted} />
          <Text style={styles.emptyTitle}>Aucun tournoi trouvé</Text>
          <Text style={styles.emptySub}>Soyez le premier à organiser un tournoi sur SportUp !</Text>
        </View>
      ) : (
        filteredTournaments.map((t) => {
          const isFull = (t.teams_count ?? t.teams?.length ?? 0) >= (t.max_teams || 16);
          return (
            <TouchableOpacity
              key={t.id}
              style={styles.tournamentCard}
              onPress={() => handleOpenDetails(t)}
              activeOpacity={0.85}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.sportTag, { backgroundColor: t.sport?.color_hex ? `${t.sport.color_hex}20` : colors.primarySoft }]}>
                  <Text style={[styles.sportTagText, { color: t.sport?.color_hex || colors.primary }]}>
                    {t.sport?.name?.toUpperCase() || 'MULTISPORT'}
                  </Text>
                </View>
                <Badge
                  label={isFull ? 'Complet' : t.status === 'open' ? 'Inscriptions Ouvertes' : 'En cours'}
                  variant={isFull ? 'danger' : t.status === 'open' ? 'success' : 'primary'}
                />
              </View>

              <Text style={styles.tournamentName}>{t.name}</Text>

              <View style={styles.cardDetailsRow}>
                <View style={styles.cardDetailItem}>
                  <Calendar size={13} color={colors.muted} style={{ marginRight: 4 }} />
                  <Text style={styles.cardDetailText}>{t.starts_on || t.start_date || 'Date à venir'}</Text>
                </View>
                <View style={styles.cardDetailDivider} />
                <View style={styles.cardDetailItem}>
                  <Users size={13} color={colors.muted} style={{ marginRight: 4 }} />
                  <Text style={styles.cardDetailText}>
                    {t.teams_count ?? t.teams?.length ?? 0} / {t.max_teams} équipes
                  </Text>
                </View>
                {t.prize_pool && (
                  <>
                    <View style={styles.cardDetailDivider} />
                    <View style={styles.cardDetailItem}>
                      <Award size={13} color="#16A34A" style={{ marginRight: 4 }} />
                      <Text style={[styles.cardDetailText, { color: '#16A34A', fontWeight: '700' }]}>{t.prize_pool}</Text>
                    </View>
                  </>
                )}
              </View>
            </TouchableOpacity>
          );
        })
      )}

      {/* ── TOURNAMENT DETAIL MODAL ── */}
      <Modal visible={!!selectedTournament} animationType="slide">
        {selectedTournament && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setSelectedTournament(null)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <ChevronLeft size={22} color={colors.navy} strokeWidth={2.4} />
                <Text style={styles.modalCloseText}>Fermer</Text>
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle} numberOfLines={1}>
                {selectedTournament.name}
              </Text>
              <View style={{ width: 60 }} />
            </View>

            {/* Modal Tabs */}
            <View style={styles.modalTabsRow}>
              <TouchableOpacity
                style={[styles.modalTab, detailTab === 'info' && styles.modalTabActive]}
                onPress={() => setDetailTab('info')}
              >
                <Trophy size={15} color={detailTab === 'info' ? colors.primary : colors.muted} style={{ marginRight: 5 }} />
                <Text style={[styles.modalTabText, detailTab === 'info' && styles.modalTabTextActive]}>Aperçu & Inscrits</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalTab, detailTab === 'standings' && styles.modalTabActive]}
                onPress={() => setDetailTab('standings')}
              >
                <Shield size={15} color={detailTab === 'standings' ? colors.primary : colors.muted} style={{ marginRight: 5 }} />
                <Text style={[styles.modalTabText, detailTab === 'standings' && styles.modalTabTextActive]}>Classement</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalTab, detailTab === 'bracket' && styles.modalTabActive]}
                onPress={() => setDetailTab('bracket')}
              >
                <GitCommit size={15} color={detailTab === 'bracket' ? colors.primary : colors.muted} style={{ marginRight: 5 }} />
                <Text style={[styles.modalTabText, detailTab === 'bracket' && styles.modalTabTextActive]}>Arbre de Matchs</Text>
              </TouchableOpacity>
            </View>

            {loadingDetail ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
            ) : (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}>
                {/* ── TAB 1: INFO & INSCRIPTION ── */}
                {detailTab === 'info' && (
                  <View>
                    <View style={styles.tournamentHeroBanner}>
                      <View style={styles.badgeRow}>
                        <Badge
                          label={selectedTournament.status === 'open' ? 'Inscriptions ouvertes' : 'Tournoi en cours'}
                          variant={selectedTournament.status === 'open' ? 'success' : 'primary'}
                        />
                        <Text style={styles.formatPill}>Format: {selectedTournament.format}</Text>
                      </View>
                      <Text style={styles.heroTournamentName}>{selectedTournament.name}</Text>
                      <Text style={styles.detailDesc}>
                        {selectedTournament.description || 'Bienvenue dans la compétition officielle SportUp ! Créez ou inscrivez votre équipe pour disputer les phases finales.'}
                      </Text>

                      {selectedTournament.prize_pool && (
                        <View style={styles.prizeCallout}>
                          <Award size={18} color="#D97706" style={{ marginRight: 8 }} />
                          <View>
                            <Text style={styles.prizeCalloutLabel}>Cashprize & Récompenses</Text>
                            <Text style={styles.prizeCalloutVal}>{selectedTournament.prize_pool}</Text>
                          </View>
                        </View>
                      )}
                    </View>

                    {/* ── PARTAGE WHATSAPP DU TOURNOI ── */}
                    <TouchableOpacity
                      style={styles.tournamentWhatsappBtn}
                      onPress={() => handleShareTournamentWhatsApp(selectedTournament)}
                      activeOpacity={0.88}
                    >
                      <View style={styles.whatsappIconCircleSmall}>
                        <MessageCircle size={18} color="#FFFFFF" strokeWidth={2.4} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.tournamentWhatsappTitle}>Partager ce tournoi sur WhatsApp</Text>
                        <Text style={styles.tournamentWhatsappSub}>Envoyez l'invitation à vos capitaines et joueurs</Text>
                      </View>
                      <View style={styles.tournamentWhatsappBadge}>
                        <Text style={styles.tournamentWhatsappBadgeText}>Inviter</Text>
                      </View>
                    </TouchableOpacity>

                    {/* Statut ou CTA Inscription d'équipe */}
                    {isUserTeamEnrolled ? (
                      <View style={[styles.registrationCtaCard, { borderColor: '#16A34A', backgroundColor: '#F0FDF4' }]}>
                        <View style={styles.registrationCtaHeader}>
                          <Check size={20} color="#16A34A" />
                          <Text style={[styles.registrationCtaTitle, { color: '#16A34A' }]}>Votre équipe est inscrite !</Text>
                        </View>
                        <Text style={styles.registrationCtaDesc}>
                          Vous participez officiellement à ce tournoi. Consultez les poules ou l'arbre des phases finales dès que le tirage sera validé.
                        </Text>
                      </View>
                    ) : selectedTournament.status === 'open' ? (
                      <View style={styles.registrationCtaCard}>
                        <View style={styles.registrationCtaHeader}>
                          <UserPlus size={20} color={colors.primary} />
                          <Text style={styles.registrationCtaTitle}>Participer avec votre équipe</Text>
                        </View>
                        <Text style={styles.registrationCtaDesc}>
                          Seul le capitaine peut inscrire son équipe. Vous devez posséder une équipe dans la discipline pour valider votre entrée.
                        </Text>
                        <TouchableOpacity
                          style={styles.registerTeamBtn}
                          onPress={handleOpenRegisterModal}
                          activeOpacity={0.88}
                        >
                          <Users size={16} color="#FFFFFF" strokeWidth={2.4} style={{ marginRight: 6 }} />
                          <Text style={styles.registerTeamBtnText}>Inscrire mon équipe</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}

                    {/* Action Tirage Organisateur */}
                    {isOrganizer && (
                      <View style={styles.organizerCard}>
                        <Text style={styles.organizerCardTitle}>Panneau de l'Organisateur</Text>
                        <Text style={styles.organizerCardDesc}>
                          Générez automatiquement les poules et l'arbre d'élimination à partir des équipes inscrites.
                        </Text>
                        <Button
                          title="Tirage au sort & Générer matchs"
                          onPress={handleTriggerDraw}
                          style={{ marginTop: spacing.sm }}
                        />
                      </View>
                    )}

                    {/* Liste des équipes participantes */}
                    <View style={styles.teamsSectionHeader}>
                      <Text style={styles.detailSectionTitle}>
                        Équipes inscrites ({selectedTournament.teams?.length || 0} / {selectedTournament.max_teams})
                      </Text>
                    </View>

                    {(!selectedTournament.teams || selectedTournament.teams.length === 0) ? (
                      <Text style={styles.noDataText}>Aucune équipe n'est encore inscrite. Soyez la première !</Text>
                    ) : (
                      selectedTournament.teams.map((team, idx) => (
                        <View key={team.id || idx} style={styles.teamRow}>
                          <View style={styles.teamAvatar}>
                            <Text style={styles.teamAvatarText}>{team.initials || team.name?.substring(0, 2).toUpperCase()}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.teamRowName}>{team.name}</Text>
                            <Text style={styles.teamRowMeta}>Équipe officielle</Text>
                          </View>
                          {team.group_label && <Text style={styles.groupBadge}>Poule {team.group_label}</Text>}
                        </View>
                      ))
                    )}
                  </View>
                )}

                {/* ── TAB 2: STANDINGS / POULES ── */}
                {detailTab === 'standings' && (
                  <View>
                    <Text style={styles.detailSectionTitle}>Classement Général des Poules</Text>
                    {standings.length === 0 ? (
                      <Text style={styles.noDataText}>Le classement sera mis à jour dès le déroulement des premiers matchs.</Text>
                    ) : (
                      <View style={styles.tableCard}>
                        <View style={styles.tableHeaderRow}>
                          <Text style={[styles.tableCol, { flex: 2, textAlign: 'left', paddingLeft: 6 }]}>Équipe</Text>
                          <Text style={styles.tableCol}>J</Text>
                          <Text style={styles.tableCol}>V</Text>
                          <Text style={styles.tableCol}>N</Text>
                          <Text style={styles.tableCol}>D</Text>
                          <Text style={[styles.tableCol, { fontWeight: '900', color: colors.primary }]}>PTS</Text>
                        </View>
                        {standings.map((st, index) => (
                          <View key={st.team_id || index} style={styles.tableDataRow}>
                            <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center' }}>
                              <Text style={styles.rankNumber}>{index + 1}</Text>
                              <Text style={[styles.tableCell, { textAlign: 'left', fontWeight: '700' }]} numberOfLines={1}>
                                {st.team_name}
                              </Text>
                            </View>
                            <Text style={styles.tableCell}>{st.played}</Text>
                            <Text style={styles.tableCell}>{st.wins}</Text>
                            <Text style={styles.tableCell}>{st.draws}</Text>
                            <Text style={styles.tableCell}>{st.losses}</Text>
                            <Text style={[styles.tableCell, { fontWeight: '900', color: colors.primary }]}>{st.points}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {/* ── TAB 3: INTERACTIVE KNOCKOUT BRACKET ── */}
                {detailTab === 'bracket' && (
                  <View>
                    <View style={styles.bracketHeaderRow}>
                      <Text style={styles.detailSectionTitle}>Arbre du Tournoi</Text>
                      <Text style={styles.bracketCountBadge}>{bracket.length} matchs</Text>
                    </View>

                    {/* View Switcher: Tree vs List */}
                    <View style={styles.bracketViewSwitcher}>
                      <TouchableOpacity
                        style={[styles.switcherBtn, bracketViewMode === 'tree' && styles.switcherBtnActive]}
                        onPress={() => setBracketViewMode('tree')}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.switcherBtnText, bracketViewMode === 'tree' && styles.switcherBtnTextActive]}>
                          🌳 Arbre Interactif (Bracket)
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.switcherBtn, bracketViewMode === 'list' && styles.switcherBtnActive]}
                        onPress={() => setBracketViewMode('list')}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.switcherBtnText, bracketViewMode === 'list' && styles.switcherBtnTextActive]}>
                          📋 Liste par Tour
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {bracketViewMode === 'tree' ? (
                      <TournamentBracket
                        matches={bracket}
                        onMatchPress={(matchId) => {
                          setSelectedTournament(null);
                          onNavigateMatch?.(matchId);
                        }}
                      />
                    ) : (
                      <>
                        {/* Filter pills for stages */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stageFilterScroll}>
                      {(['all', 'round_of_16', 'quarter_finals', 'semi_finals', 'final'] as BracketStageFilter[]).map((stg) => {
                        const labels: Record<BracketStageFilter, string> = {
                          all: 'Tous les tours',
                          round_of_16: '1/8 Finales',
                          quarter_finals: '1/4 Finales',
                          semi_finals: '1/2 Finales',
                          final: 'Grande Finale',
                        };
                        const isStgActive = bracketFilter === stg;
                        return (
                          <TouchableOpacity
                            key={stg}
                            style={[styles.stagePill, isStgActive && styles.stagePillActive]}
                            onPress={() => setBracketFilter(stg)}
                            activeOpacity={0.8}
                          >
                            <Text style={[styles.stagePillText, isStgActive && styles.stagePillTextActive]}>
                              {labels[stg]}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    {filteredBracket.length === 0 ? (
                      <View style={styles.emptyBracketBox}>
                        <Swords size={34} color={colors.muted} />
                        <Text style={styles.noDataTitle}>Aucun match généré</Text>
                        <Text style={styles.noDataText}>
                          Le tableau d'élimination apparaîtra ici après le tirage au sort par l'organisateur.
                        </Text>
                      </View>
                    ) : (
                      filteredBracket.map((b) => {
                        const isFinal = b.stage === 'final';
                        const teamAWon = (b.score_team_a ?? 0) > (b.score_team_b ?? 0) && b.status === 'finished';
                        const teamBWon = (b.score_team_b ?? 0) > (b.score_team_a ?? 0) && b.status === 'finished';
                        const isLive = b.status === 'in_progress';

                        return (
                          <View
                            key={b.id}
                            style={[
                              styles.bracketMatchCard,
                              isFinal && styles.bracketFinalCard,
                            ]}
                          >
                            <View style={styles.bracketCardTop}>
                              <Text style={[styles.bracketStageText, isFinal && styles.bracketFinalText]}>
                                {getStageTitle(b.stage)} · Tour {b.round_number}
                              </Text>
                              <Badge
                                label={isLive ? 'EN DIRECT' : b.status === 'finished' ? 'Terminé' : 'Programmé'}
                                variant={isLive ? 'danger' : b.status === 'finished' ? 'muted' : 'primary'}
                              />
                            </View>

                            {/* Duel Container */}
                            <View style={styles.duelContainer}>
                              {/* Team A */}
                              <View style={[styles.duelTeamRow, teamAWon && styles.winningTeamRow]}>
                                <View style={styles.teamDuelIdentity}>
                                  <View style={[styles.teamMiniAvatar, teamAWon && { backgroundColor: '#DCFCE7' }]}>
                                    <Text style={[styles.teamMiniAvatarText, teamAWon && { color: '#16A34A' }]}>
                                      {b.team_a?.name?.substring(0, 2).toUpperCase() || 'A'}
                                    </Text>
                                  </View>
                                  <Text style={[styles.duelTeamName, teamAWon && styles.winningTeamText]}>
                                    {b.team_a?.name || 'À déterminer'}
                                  </Text>
                                  {teamAWon && <Crown size={14} color="#16A34A" style={{ marginLeft: 6 }} />}
                                </View>
                                <Text style={[styles.duelScore, teamAWon && styles.winningScore]}>
                                  {b.score_team_a ?? '-'}
                                </Text>
                              </View>

                              {/* VS Divider */}
                              <View style={styles.vsDivider} />

                              {/* Team B */}
                              <View style={[styles.duelTeamRow, teamBWon && styles.winningTeamRow]}>
                                <View style={styles.teamDuelIdentity}>
                                  <View style={[styles.teamMiniAvatar, teamBWon && { backgroundColor: '#DCFCE7' }]}>
                                    <Text style={[styles.teamMiniAvatarText, teamBWon && { color: '#16A34A' }]}>
                                      {b.team_b?.name?.substring(0, 2).toUpperCase() || 'B'}
                                    </Text>
                                  </View>
                                  <Text style={[styles.duelTeamName, teamBWon && styles.winningTeamText]}>
                                    {b.team_b?.name || 'À déterminer'}
                                  </Text>
                                  {teamBWon && <Crown size={14} color="#16A34A" style={{ marginLeft: 6 }} />}
                                </View>
                                <Text style={[styles.duelScore, teamBWon && styles.winningScore]}>
                                  {b.score_team_b ?? '-'}
                                </Text>
                              </View>
                            </View>

                            {/* Match Action */}
                            {onNavigateMatch && (
                              <TouchableOpacity
                                style={styles.bracketMatchActionBtn}
                                onPress={() => onNavigateMatch(b.id)}
                                activeOpacity={0.8}
                              >
                                <Text style={styles.bracketMatchActionText}>
                                  {isLive ? 'Accéder au Live Scoreboard' : 'Consulter la feuille de match'}
                                </Text>
                                <ChevronRight size={14} color={colors.primary} />
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      })
                    )}
                      </>
                    )}
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        )}
      </Modal>

      {/* ── MODAL INSCRIPTION ÉQUIPE ── */}
      <Modal visible={showRegisterModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.registerSheetContainer}>
            <View style={styles.registerSheetHeader}>
              <View>
                <Text style={styles.registerSheetTitle}>Inscrire mon équipe</Text>
                <Text style={styles.registerSheetSub}>{selectedTournament?.name}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowRegisterModal(false)}
                style={styles.closeSheetBtn}
              >
                <Text style={styles.closeSheetText}>✕</Text>
              </TouchableOpacity>
            </View>

            {loadingTeams ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 30 }} />
            ) : myCaptainedTeams.length === 0 ? (
              <View style={styles.noCaptainedTeamsBox}>
                <Shield size={34} color={colors.muted} />
                <Text style={styles.noCaptainedTeamsTitle}>Aucune équipe dont vous êtes le capitaine</Text>
                <Text style={styles.noCaptainedTeamsDesc}>
                  Pour inscrire une équipe à une compétition, vous devez en être le capitaine officiel. Créez votre équipe dans l'onglet Équipes !
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.selectTeamPrompt}>Sélectionnez l'équipe à engager :</Text>
                {myCaptainedTeams.map((team) => {
                  const isSelected = selectedTeamId === team.id;
                  return (
                    <TouchableOpacity
                      key={team.id}
                      style={[styles.teamSelectCard, isSelected && styles.teamSelectCardActive]}
                      onPress={() => setSelectedTeamId(team.id)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.teamAvatar}>
                        <Text style={styles.teamAvatarText}>{team.initials || team.name.substring(0, 2).toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.teamSelectName, isSelected && { color: colors.primary }]}>
                          {team.name}
                        </Text>
                        <Text style={styles.teamSelectMeta}>
                          {team.sport?.name || 'Sport'} · {team.members_count || 1} membre(s)
                        </Text>
                      </View>
                      {isSelected && (
                        <View style={styles.radioSelectedDot}>
                          <Check size={14} color="#FFFFFF" strokeWidth={2.8} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {myCaptainedTeams.length > 0 && (
              <Button
                title="Confirmer l'inscription"
                loading={registeringTeam}
                disabled={!selectedTeamId}
                onPress={handleConfirmRegistration}
                style={{ marginTop: spacing.md }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* ── MODAL CRÉATION TOURNOI ── */}
      <Modal visible={showCreateModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowCreateModal(false)}
              style={styles.modalCloseBtn}
              activeOpacity={0.7}
            >
              <ChevronLeft size={22} color={colors.navy} strokeWidth={2.4} />
              <Text style={styles.modalCloseText}>Annuler</Text>
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>Créer un Tournoi</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg }}>
            <Text style={styles.inputLabel}>Nom de la compétition *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Coupe de Tana 2026"
              value={createForm.name}
              onChangeText={(text) => setCreateForm({ ...createForm, name: text })}
            />

            <Text style={styles.inputLabel}>Format de la compétition</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              {[
                { key: 'knockout', label: 'Élimination directe' },
                { key: 'groups', label: 'Poules simples' },
                { key: 'groups_then_knockout', label: 'Poules + Finales' },
              ].map((f) => (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.formatChip, createForm.format === f.key && styles.formatChipActive]}
                  onPress={() => setCreateForm({ ...createForm, format: f.key as any })}
                >
                  <Text style={[styles.formatChipText, createForm.format === f.key && styles.formatChipTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Date de démarrage *</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={createForm.start_date}
              onChangeText={(text) => setCreateForm({ ...createForm, start_date: text })}
            />

            <Text style={styles.inputLabel}>Cashprize / Récompenses</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 500 000 Ar"
              value={createForm.prize_pool}
              onChangeText={(text) => setCreateForm({ ...createForm, prize_pool: text })}
            />

            <Text style={styles.inputLabel}>Nombre max d'équipes</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={String(createForm.max_teams)}
              onChangeText={(text) => setCreateForm({ ...createForm, max_teams: Number(text) || 16 })}
            />

            <Text style={styles.inputLabel}>Description / Règlement</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              multiline
              placeholder="Précisez le règlement, lieu et horaires..."
              value={createForm.description}
              onChangeText={(text) => setCreateForm({ ...createForm, description: text })}
            />

            <Button
              title="Valider et publier le tournoi"
              loading={creating}
              onPress={handleCreateTournament}
              style={{ marginTop: spacing.xl }}
            />
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

  topHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  backButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#EEF2F6', borderRadius: radius.pill },
  backButtonText: { fontSize: 13, fontWeight: '700', color: colors.navy, marginLeft: 2 },
  screenHeaderTitle: { fontSize: 18, fontWeight: '900', color: colors.navy },
  createBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  createBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12, marginLeft: 4 },

  featuredCard: { backgroundColor: colors.navy, borderRadius: radius.xxl, padding: spacing.xl, marginBottom: spacing.lg },
  featuredBorder: { borderColor: `${colors.primary}30`, borderWidth: 1.5 },
  featuredTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  featuredBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245, 158, 11, 0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  featuredBadgeText: { fontSize: 10, fontWeight: '800', color: '#FBBF24' },
  prizeBadge: { backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  prizeBadgeText: { fontSize: 10, fontWeight: '800', color: '#34D399' },
  featuredTitle: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', marginVertical: spacing.xs },
  featuredMetaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  featuredMetaItem: { flexDirection: 'row', alignItems: 'center' },
  featuredMetaDivider: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255, 255, 255, 0.3)', marginHorizontal: spacing.sm },
  featuredMetaText: { fontSize: 12, color: 'rgba(255, 255, 255, 0.8)' },
  featuredRegisterBtn: { height: 44, borderRadius: radius.pill, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  featuredRegisterBtnText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },

  tabRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight },
  tabActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  tabText: { fontSize: 12, fontWeight: '700', color: colors.navy },
  tabTextActive: { color: '#FFFFFF' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.navy },
  sectionCount: { fontSize: 12, color: colors.muted },

  tournamentCard: { backgroundColor: colors.surface, borderRadius: radius.xxl, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.borderLight, ...shadows.card },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  sportTag: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill },
  sportTagText: { fontSize: 10, fontWeight: '800' },
  tournamentName: { fontSize: 16, fontWeight: '800', color: colors.navy, marginBottom: 4 },
  cardDetailsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceSubtle, borderRadius: radius.md, paddingVertical: 6, paddingHorizontal: 10, marginTop: spacing.xs },
  cardDetailItem: { flexDirection: 'row', alignItems: 'center' },
  cardDetailDivider: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.mutedLight, marginHorizontal: spacing.sm },
  cardDetailText: { fontSize: 12, color: colors.textSecondary },

  emptyBox: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.navy, marginBottom: 6 },
  emptySub: { fontSize: 13, color: colors.muted, textAlign: 'center' },

  // Modal styles
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.borderLight, backgroundColor: colors.surface },
  modalCloseBtn: { flexDirection: 'row', alignItems: 'center' },
  modalCloseText: { fontWeight: '700', color: colors.navy, marginLeft: 4 },
  modalHeaderTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '800', color: colors.navy },
  modalTabsRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.borderLight, backgroundColor: colors.surface },
  modalTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  modalTabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  modalTabText: { fontSize: 13, fontWeight: '600', color: colors.muted },
  modalTabTextActive: { color: colors.primary, fontWeight: '800' },

  tournamentHeroBanner: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.borderLight },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  formatPill: { fontSize: 11, fontWeight: '700', color: colors.muted, backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  heroTournamentName: { fontSize: 20, fontWeight: '900', color: colors.navy, marginBottom: 6 },
  detailDesc: { fontSize: 13, color: colors.muted, lineHeight: 19 },
  prizeCallout: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', padding: spacing.md, borderRadius: radius.lg, marginTop: spacing.md },
  prizeCalloutLabel: { fontSize: 11, fontWeight: '700', color: '#92400E' },
  prizeCalloutVal: { fontSize: 15, fontWeight: '900', color: '#B45309' },

  // Registration CTA Card
  registrationCtaCard: { backgroundColor: '#F0FDF4', borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: '#BBF7D0' },
  registrationCtaHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  registrationCtaTitle: { fontSize: 15, fontWeight: '800', color: '#166534' },
  registrationCtaDesc: { fontSize: 12, color: '#15803D', lineHeight: 18, marginBottom: spacing.md },
  registerTeamBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, paddingVertical: 11, borderRadius: radius.pill },
  registerTeamBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },

  // WhatsApp Viral Invitation Button
  tournamentWhatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  whatsappIconCircleSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tournamentWhatsappTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#15803D',
  },
  tournamentWhatsappSub: {
    fontSize: 11,
    color: '#166534',
    marginTop: 2,
  },
  tournamentWhatsappBadge: {
    backgroundColor: '#25D366',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  tournamentWhatsappBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },

  organizerCard: { backgroundColor: '#EFF6FF', borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: '#BFDBFE' },
  organizerCardTitle: { fontSize: 15, fontWeight: '800', color: '#1E40AF', marginBottom: 4 },
  organizerCardDesc: { fontSize: 12, color: '#1D4ED8', lineHeight: 18 },

  teamsSectionHeader: { marginTop: spacing.md, marginBottom: spacing.xs },
  detailSectionTitle: { fontSize: 16, fontWeight: '800', color: colors.navy, marginBottom: spacing.xs },
  teamRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  teamAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  teamAvatarText: { fontWeight: '800', color: colors.primary, fontSize: 13 },
  teamRowName: { fontSize: 14, fontWeight: '700', color: colors.navy },
  teamRowMeta: { fontSize: 11, color: colors.muted, marginTop: 1 },
  groupBadge: { backgroundColor: '#E0E7FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, fontSize: 11, fontWeight: '800', color: '#3730A3' },

  noDataText: { fontSize: 13, color: colors.muted, fontStyle: 'italic', marginVertical: spacing.md },
  tableCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.sm },
  tableHeaderRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.borderLight, paddingVertical: 8 },
  tableCol: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '700', color: colors.navy },
  tableDataRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.surfaceSubtle, alignItems: 'center' },
  tableCell: { flex: 1, textAlign: 'center', fontSize: 12, color: colors.navy },
  rankNumber: { width: 20, fontSize: 12, fontWeight: '800', color: colors.muted, textAlign: 'center' },

  // Bracket Interactive View
  bracketHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  bracketCountBadge: { fontSize: 12, fontWeight: '700', color: colors.primary, backgroundColor: colors.primarySoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  bracketViewSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: radius.pill,
    padding: 3,
    marginVertical: spacing.sm,
  },
  switcherBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: radius.pill,
  },
  switcherBtnActive: {
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  switcherBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
  },
  switcherBtnTextActive: {
    color: colors.navy,
    fontWeight: '800',
  },
  stageFilterScroll: { flexDirection: 'row', marginVertical: spacing.sm },
  stagePill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: '#F1F5F9', marginRight: 8 },
  stagePillActive: { backgroundColor: colors.navy },
  stagePillText: { fontSize: 12, fontWeight: '700', color: colors.navy },
  stagePillTextActive: { color: '#FFFFFF' },
  emptyBracketBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  noDataTitle: { fontSize: 15, fontWeight: '800', color: colors.navy, marginTop: 8 },

  bracketMatchCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.md + 2, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.borderLight, ...shadows.card },
  bracketFinalCard: { borderColor: '#F59E0B', borderWidth: 1.5, backgroundColor: '#FFFDF5' },
  bracketCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  bracketStageText: { fontSize: 12, fontWeight: '800', color: colors.primary },
  bracketFinalText: { color: '#B45309' },

  duelContainer: { backgroundColor: colors.background, borderRadius: radius.lg, padding: 8, marginVertical: 4 },
  duelTeamRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 8, borderRadius: radius.md },
  winningTeamRow: { backgroundColor: '#F0FDF4' },
  teamDuelIdentity: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  teamMiniAvatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.surfaceSubtle, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  teamMiniAvatarText: { fontSize: 10, fontWeight: '800', color: colors.navy },
  duelTeamName: { fontSize: 13, fontWeight: '700', color: colors.navy, flex: 1 },
  winningTeamText: { color: '#16A34A', fontWeight: '800' },
  duelScore: { fontSize: 15, fontWeight: '900', color: colors.navy, minWidth: 24, textAlign: 'right' },
  winningScore: { color: '#16A34A' },
  vsDivider: { height: 1, backgroundColor: colors.borderLight, marginVertical: 2 },

  bracketMatchActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.borderLight },
  bracketMatchActionText: { fontSize: 12, fontWeight: '800', color: colors.primary },

  // Sheet Modal Inscription
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  registerSheetContainer: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, padding: spacing.xl, paddingBottom: 40 },
  registerSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  registerSheetTitle: { fontSize: 18, fontWeight: '900', color: colors.navy },
  registerSheetSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  closeSheetBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  closeSheetText: { fontSize: 13, fontWeight: '800', color: colors.muted },
  noCaptainedTeamsBox: { alignItems: 'center', paddingVertical: 24 },
  noCaptainedTeamsTitle: { fontSize: 15, fontWeight: '800', color: colors.navy, textAlign: 'center', marginTop: 8, marginBottom: 4 },
  noCaptainedTeamsDesc: { fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 18 },
  selectTeamPrompt: { fontSize: 13, fontWeight: '700', color: colors.navy, marginBottom: spacing.sm },
  teamSelectCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.borderLight, marginBottom: 8, backgroundColor: colors.background },
  teamSelectCardActive: { borderColor: colors.primary, backgroundColor: '#F8FAFF' },
  teamSelectName: { fontSize: 14, fontWeight: '700', color: colors.navy },
  teamSelectMeta: { fontSize: 11, color: colors.muted, marginTop: 2 },
  radioSelectedDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },

  // Create Form styles
  formatChip: { flex: 1, paddingVertical: 8, paddingHorizontal: 6, borderRadius: radius.md, backgroundColor: '#F1F5F9', alignItems: 'center' },
  formatChipActive: { backgroundColor: colors.navy },
  formatChipText: { fontSize: 11, fontWeight: '700', color: colors.navy, textAlign: 'center' },
  formatChipTextActive: { color: '#FFFFFF' },
  inputLabel: { fontSize: 13, fontWeight: '700', color: colors.navy, marginBottom: 6, marginTop: spacing.md },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.navy },
});
