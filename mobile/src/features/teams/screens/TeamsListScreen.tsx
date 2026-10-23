import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Alert,
  TextInput,
} from 'react-native';
import { Search, Mail, Check, X, Shield, Plus, MessageCircle, ChevronLeft, Hash } from 'lucide-react-native';
import { colors } from '../../../theme/colors';
import { radius, spacing } from '../../../theme/spacing';
import { Button } from '../../../components/Button';
import { InviteModal } from '../../../components/InviteModal';
import { teamsApi, Team } from '../api/teamsApi';
import { TeamInvitation } from '../../../types';

export const TeamsListScreen: React.FC<{
  onSelectTeam: (id: number) => void;
  onNavigateTeamChat?: (teamId: number, teamName: string) => void;
  onNavigateBack?: () => void;
}> = ({
  onSelectTeam,
  onNavigateTeamChat,
  onNavigateBack,
}) => {
  const [activeTab, setActiveTab] = useState<'my_teams' | 'invitations' | 'find_opponent'>('my_teams');

  // My Teams
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [loadingTeams, setLoadingTeams] = useState(true);

  // Invitations
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);

  // Opponents search
  const [opponents, setOpponents] = useState<any[]>([]);
  const [searchLevel] = useState<string>('');
  const [searchCity, setSearchCity] = useState<string>('');

  // Create team modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    sport_id: 1,
    level: 'intermediate',
    city: 'Antananarivo',
    is_looking_for_opponent: true,
  });
  const [creating, setCreating] = useState(false);

  // Join by code modal
  const [showJoinCodeModal, setShowJoinCodeModal] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joiningByCode, setJoiningByCode] = useState(false);

  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);

  const fetchMyTeams = useCallback(async () => {
    try {
      setLoadingTeams(true);
      const list = await teamsApi.listTeams();
      setTeams(list);
      if (list.length > 0 && !selectedTeam) {
        const details = await teamsApi.getTeamDetails(list[0].id);
        setSelectedTeam(details);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoadingTeams(false);
    }
  }, [selectedTeam]);

  const fetchInvitations = useCallback(async () => {
    try {
      const data = await teamsApi.getMyInvitations();
      setInvitations(data);
    } catch (e) {
      console.warn(e);
    }
  }, []);

  const fetchOpponents = useCallback(async () => {
    try {
      const data = await teamsApi.getTeams(true, searchLevel || undefined, searchCity || undefined);
      setOpponents(data);
    } catch (e) {
      console.warn(e);
    }
  }, [searchLevel, searchCity]);

  useEffect(() => {
    fetchMyTeams();
    fetchInvitations();
  }, []);

  useEffect(() => {
    if (activeTab === 'find_opponent') {
      fetchOpponents();
    }
  }, [activeTab, fetchOpponents]);

  const handleCreateTeam = async () => {
    if (!createForm.name.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un nom d\'équipe.');
      return;
    }
    setCreating(true);
    try {
      await teamsApi.createTeam(createForm);
      Alert.alert('Succès', 'Équipe créée !');
      setShowCreateModal(false);
      fetchMyTeams();
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Impossible de créer l\'équipe.');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleOpponentStatus = async (team: Team) => {
    try {
      const updated = await teamsApi.updateOpponentStatus(
        team.id,
        !team.is_looking_for_opponent,
        team.level,
        team.city || undefined
      );
      Alert.alert('Statut mis à jour', updated.message);
      fetchMyTeams();
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  };

  const handleRespondInvitation = async (invId: number, action: 'accept' | 'decline') => {
    try {
      const res = await teamsApi.respondInvitation(invId, action);
      Alert.alert('Invitation', res.message);
      fetchInvitations();
      fetchMyTeams();
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  };

  const handleJoinByCode = async () => {
    if (!joinCodeInput.trim()) return;
    try {
      setJoiningByCode(true);
      const res = await teamsApi.joinTeamByCode(joinCodeInput.trim());
      Alert.alert('Équipe rejointe !', res.message);
      setShowJoinCodeModal(false);
      setJoinCodeInput('');
      fetchMyTeams();
    } catch (e: any) {
      Alert.alert('Rejoindre une équipe', e.response?.data?.message || e.message || 'Impossible de rejoindre avec ce code.');
    } finally {
      setJoiningByCode(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER TABS */}
      <View style={styles.topTabs}>
        {onNavigateBack && (
          <TouchableOpacity onPress={onNavigateBack} style={styles.tabBackBtn} activeOpacity={0.7}>
            <ChevronLeft size={20} color={colors.navy} strokeWidth={2.4} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.topTab, activeTab === 'my_teams' && styles.topTabActive]}
          onPress={() => setActiveTab('my_teams')}
        >
          <Shield size={16} color={activeTab === 'my_teams' ? colors.primary : colors.muted} />
          <Text style={[styles.topTabText, activeTab === 'my_teams' && styles.topTabTextActive]}>
            Mes Équipes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.topTab, activeTab === 'invitations' && styles.topTabActive]}
          onPress={() => setActiveTab('invitations')}
        >
          <Mail size={16} color={activeTab === 'invitations' ? colors.primary : colors.muted} />
          <Text style={[styles.topTabText, activeTab === 'invitations' && styles.topTabTextActive]}>
            Invitations ({invitations.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.topTab, activeTab === 'find_opponent' && styles.topTabActive]}
          onPress={() => setActiveTab('find_opponent')}
        >
          <Search size={16} color={activeTab === 'find_opponent' ? colors.primary : colors.muted} />
          <Text style={[styles.topTabText, activeTab === 'find_opponent' && styles.topTabTextActive]}>
            Adversaires
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* TAB 1: MY TEAMS */}
        {activeTab === 'my_teams' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Équipes rattachées</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={[styles.addBtn, { backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: colors.borderLight }]}
                  onPress={() => setShowJoinCodeModal(true)}
                >
                  <Hash size={14} color={colors.primary} />
                  <Text style={[styles.addBtnText, { color: colors.primary }]}>Rejoindre</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => setShowCreateModal(true)}
                >
                  <Plus size={16} color="#FFF" />
                  <Text style={styles.addBtnText}>Nouvelle</Text>
                </TouchableOpacity>
              </View>
            </View>

            {loadingTeams ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
            ) : teams.length === 0 ? (
              <View style={styles.emptyCard}>
                <Shield size={36} color={colors.muted} />
                <Text style={styles.emptyTitle}>Aucune équipe inscrite</Text>
                <Text style={styles.emptySub}>Créez votre première équipe pour défier d'autres joueurs.</Text>
                <Button title="Créer une équipe" onPress={() => setShowCreateModal(true)} style={{ marginTop: 12 }} />
              </View>
            ) : (
              teams.map((t) => (
                <View key={t.id} style={styles.teamCard}>
                  <View style={styles.teamCardHeader}>
                    <View style={styles.teamBadge}>
                      <Text style={styles.teamBadgeText}>{t.initials}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.teamCardName}>{t.name}</Text>
                      <Text style={styles.teamCardSub}>
                        {t.sport?.name} · Level: {t.level || 'Intermediate'} · {t.city || 'Tana'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.statusRow}>
                    <Text style={styles.statusText}>
                      Recherche d'adversaire : {t.is_looking_for_opponent ? 'ACTIF 🟢' : 'INACTIF ⚪'}
                    </Text>
                    <TouchableOpacity
                      style={styles.toggleBtn}
                      onPress={() => handleToggleOpponentStatus(t)}
                    >
                      <Text style={styles.toggleBtnText}>Changer</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.teamCardActions}>
                    <TouchableOpacity
                      style={styles.chatTeamBtn}
                      onPress={() => onNavigateTeamChat && onNavigateTeamChat(t.id, t.name)}
                      activeOpacity={0.8}
                    >
                      <MessageCircle size={14} color={colors.primary} style={{ marginRight: 4 }} />
                      <Text style={styles.chatTeamBtnText}>Chat</Text>
                    </TouchableOpacity>

                    <Button
                      title="Inviter"
                      variant="secondary"
                      size="sm"
                      onPress={() => {
                        setSelectedTeam(t);
                        setShowInviteModal(true);
                      }}
                    />
                    <Button
                      title="Voir l'équipe →"
                      size="sm"
                      onPress={() => onSelectTeam(t.id)}
                    />
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 2: INVITATIONS */}
        {activeTab === 'invitations' && (
          <View>
            <Text style={styles.sectionTitle}>Invitations d'équipes en attente</Text>
            {invitations.length === 0 ? (
              <View style={styles.emptyCard}>
                <Mail size={36} color={colors.muted} />
                <Text style={styles.emptyTitle}>Aucune invitation reçue</Text>
              </View>
            ) : (
              invitations.map((inv) => (
                <View key={inv.id} style={styles.invitationCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.invTitle}>{inv.team?.name || 'Équipe'}</Text>
                    <Text style={styles.invSub}>Invité par @{inv.inviter?.username || 'capitaine'}</Text>
                  </View>
                  <View style={styles.invActions}>
                    <TouchableOpacity
                      style={[styles.invBtn, { backgroundColor: colors.success }]}
                      onPress={() => handleRespondInvitation(inv.id, 'accept')}
                    >
                      <Check size={18} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.invBtn, { backgroundColor: colors.danger }]}
                      onPress={() => handleRespondInvitation(inv.id, 'decline')}
                    >
                      <X size={18} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 3: FIND OPPONENT */}
        {activeTab === 'find_opponent' && (
          <View>
            <Text style={styles.sectionTitle}>Recherche d'adversaires</Text>

            {/* Filter controls */}
            <View style={styles.filterRow}>
              <TextInput
                style={[styles.filterInput, { flex: 1 }]}
                placeholder="Ville (ex: Tana)"
                value={searchCity}
                onChangeText={setSearchCity}
              />
              <TouchableOpacity style={styles.filterSearchBtn} onPress={fetchOpponents}>
                <Search size={16} color="#FFF" />
              </TouchableOpacity>
            </View>

            {opponents.length === 0 ? (
              <View style={styles.emptyCard}>
                <Search size={36} color={colors.muted} />
                <Text style={styles.emptyTitle}>Aucun adversaire trouvé</Text>
              </View>
            ) : (
              opponents.map((opp) => (
                <View key={opp.id} style={styles.opponentCard}>
                  <View style={styles.teamBadge}>
                    <Text style={styles.teamBadgeText}>{opp.initials}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.teamCardName}>{opp.name}</Text>
                    <Text style={styles.teamCardSub}>{opp.sport?.name} · Niveau: {opp.level || 'intermédiaire'}</Text>
                    <Text style={styles.teamCardCity}>📍 {opp.city || 'Non renseigné'}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.challengeBtn}
                    onPress={() => Alert.alert('Défier l\'équipe', `Invitation à un match envoyée à ${opp.name} !`)}
                  >
                    <Text style={styles.challengeBtnText}>Défier</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* CREATE TEAM MODAL */}
      <Modal visible={showCreateModal} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Créer une nouvelle équipe</Text>
          <TextInput
            style={styles.input}
            placeholder="Nom de l'équipe"
            value={createForm.name}
            onChangeText={(text) => setCreateForm({ ...createForm, name: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Ville (ex: Antananarivo)"
            value={createForm.city}
            onChangeText={(text) => setCreateForm({ ...createForm, city: text })}
          />
          <Button title="Créer L'Équipe" loading={creating} onPress={handleCreateTeam} style={{ marginTop: 20 }} />
          <Button title="Annuler" variant="secondary" onPress={() => setShowCreateModal(false)} style={{ marginTop: 10 }} />
        </View>
      </Modal>

      {/* JOIN TEAM BY CODE MODAL */}
      <Modal visible={showJoinCodeModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rejoindre une équipe</Text>
            <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 14 }}>
              Entrez le code d'invitation reçu de votre capitaine (ex : SP-A1B2C3) :
            </Text>
            <TextInput
              style={[styles.input, { textTransform: 'uppercase', fontWeight: 'bold', fontSize: 16, textAlign: 'center', letterSpacing: 2 }]}
              placeholder="SP-XXXXXX"
              value={joinCodeInput}
              onChangeText={setJoinCodeInput}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <Button
              title="Rejoindre l'équipe"
              loading={joiningByCode}
              disabled={!joinCodeInput.trim()}
              onPress={handleJoinByCode}
              style={{ marginTop: 10 }}
            />
            <Button
              title="Annuler"
              variant="secondary"
              onPress={() => {
                setShowJoinCodeModal(false);
                setJoinCodeInput('');
              }}
              style={{ marginTop: 8 }}
            />
          </View>
        </View>
      </Modal>

      {/* INVITE MEMBER MODAL */}
      {selectedTeam && (
        <InviteModal
          visible={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          targetType="team"
          targetId={selectedTeam.id}
          targetTitle={selectedTeam.name}
          onSuccess={fetchMyTeams}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topTabs: { flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderLight, alignItems: 'center' },
  tabBackBtn: { paddingHorizontal: 12, paddingVertical: 10, justifyContent: 'center', alignItems: 'center' },
  topTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6 },
  topTabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  topTabText: { fontSize: 12, fontWeight: '600', color: colors.muted },
  topTabTextActive: { color: colors.primary, fontWeight: '800' },
  content: { padding: spacing.lg },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.navy },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill },
  addBtnText: { color: '#FFF', fontWeight: '800', fontSize: 12, marginLeft: 4 },

  teamCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.borderLight },
  teamCardHeader: { flexDirection: 'row', alignItems: 'center' },
  teamBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  teamBadgeText: { fontWeight: '800', color: colors.primary, fontSize: 16 },
  teamCardName: { fontSize: 16, fontWeight: '800', color: colors.navy },
  teamCardSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  teamCardCity: { fontSize: 11, color: colors.primary, marginTop: 2, fontWeight: '600' },

  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surfaceSubtle, padding: 8, borderRadius: radius.md, marginVertical: 10 },
  statusText: { fontSize: 12, fontWeight: '700', color: colors.navy },
  toggleBtn: { backgroundColor: colors.navy, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
  toggleBtnText: { color: '#FFF', fontSize: 10, fontWeight: '800' },

  teamCardActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  chatTeamBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primarySoft, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.pill },
  chatTeamBtnText: { color: colors.primary, fontSize: 12, fontWeight: '800' },

  invitationCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.borderLight },
  invTitle: { fontSize: 15, fontWeight: '800', color: colors.navy },
  invSub: { fontSize: 12, color: colors.muted },
  invActions: { flexDirection: 'row', gap: 8 },
  invBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  filterRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  filterInput: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, height: 40 },
  filterSearchBtn: { width: 40, height: 40, backgroundColor: colors.primary, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },

  opponentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.borderLight },
  challengeBtn: { backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill },
  challengeBtnText: { color: '#FFF', fontWeight: '800', fontSize: 12 },

  emptyCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', marginTop: 20 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.navy, marginTop: 10 },
  emptySub: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 4 },

  modalContainer: { flex: 1, backgroundColor: colors.background, padding: spacing.xl, justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.xl },
  modalCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.navy, marginBottom: 16 },
  input: { backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, height: 44, color: colors.navy, marginBottom: 12 },
});
