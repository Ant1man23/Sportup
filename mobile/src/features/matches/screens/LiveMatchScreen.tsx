import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Linking,
} from 'react-native';
import {
  ChevronLeft,
  Users,
  X,
  Shield,
  Edit3,
  ArrowLeftRight,
  ClipboardList,
  Save,
  Share2,
  FileText,
  Sparkles,
} from 'lucide-react-native';
import { colors } from '../../../theme/colors';
import { radius, shadows, spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';
import { Button } from '../../../components/Button';
import { ErrorBanner } from '../../../components/ErrorBanner';
import { ScoreBoard } from '../components/ScoreBoard';
import { SetsScoreBoard } from '../components/SetsScoreBoard';
import { MatchShareCardModal } from '../components/MatchShareCardModal';
import { getActiveApiUrl } from '../../../api/client';
import { TeamStatisticsTab } from '../components/TeamStatisticsTab';
import { PlayerBoxscoreTab } from '../components/PlayerBoxscoreTab';
import { PlayByPlayTab } from '../components/PlayByPlayTab';
import { OrganizerControlPad } from '../components/OrganizerControlPad';
import {
  Match,
  MatchPlayer,
  matchesApi,
  AddMatchEventPayload,
  MatchStatisticsResponse,
  LiveMatchResponse,
} from '../api/matchesApi';
import { matchLiveSync, SyncConnectionStatus } from '../../../services/matchLiveSync';
import { offlineQueueService } from '../../../services/offlineQueue';
import { useAuthStore } from '../../../store/useAuthStore';
import { isSetSport } from '../config/sportMatchConfig';

interface LiveMatchScreenProps {
  matchId: number;
  onFinishMatch: (matchId: number) => void;
  onNavigateBack?: () => void;
}

type TabType = 'dashboard' | 'team_stats' | 'players' | 'timeline';

export const LiveMatchScreen: React.FC<LiveMatchScreenProps> = ({
  matchId,
  onFinishMatch,
  onNavigateBack,
}) => {
  const currentUser = useAuthStore((state) => state.user);

  const [match, setMatch] = useState<Match | null>(null);
  const [statistics, setStatistics] = useState<MatchStatisticsResponse | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [connectionStatus, setConnectionStatus] = useState<SyncConnectionStatus>('connected');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lineup & match sheet modal state
  const [showLineupModal, setShowLineupModal] = useState(false);
  const [lineupSide, setLineupSide] = useState<'team_a' | 'team_b'>('team_a');
  const [editablePlayersA, setEditablePlayersA] = useState<MatchPlayer[]>([]);
  const [editablePlayersB, setEditablePlayersB] = useState<MatchPlayer[]>([]);
  const [savingLineup, setSavingLineup] = useState(false);

  // Match share card modal state
  const [showShareModal, setShowShareModal] = useState(false);

  // Open official printable match sheet in browser / PDF
  const handleOpenOfficialSheet = () => {
    const baseUrl = getActiveApiUrl().replace(/\/api\/v1\/?$/, '');
    Linking.openURL(`${baseUrl}/api/v1/matches/${matchId}/sheet`).catch(() => {
      Alert.alert('Erreur', 'Impossible d’ouvrir la feuille de match officielle.');
    });
  };

  // Fetch full match and statistics
  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [matchData, statsData] = await Promise.all([
        matchesApi.getMatchDetails(matchId),
        matchesApi.getMatchStatistics(matchId).catch(() => null),
      ]);
      setMatch(matchData);
      if (statsData) {
        setStatistics(statsData);
      }
    } catch (err: any) {
      setError(err.message || 'Impossible de charger le match.');
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  // Subscribe to live synchronization
  useEffect(() => {
    fetchInitialData();

    const unsubscribe = matchLiveSync.subscribe(matchId, {
      onLiveUpdate: (live: LiveMatchResponse) => {
        setMatch((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            score_team_a: live.score_team_a,
            score_team_b: live.score_team_b,
            current_period: live.current_period,
            total_periods: live.total_periods,
            period_duration_seconds: live.period_duration_seconds,
            period_elapsed_seconds: live.period_elapsed_seconds,
            remaining_period_seconds: live.remaining_period_seconds,
            status: live.status,
            team_a_fouls: live.team_a.fouls,
            team_b_fouls: live.team_b.fouls,
            last_resumed_at: live.last_resumed_at || undefined,
            team_a_name: live.team_a.name,
            team_b_name: live.team_b.name,
            team_a_color: live.team_a.color,
            team_b_color: live.team_b.color,
          };
        });
      },
      onStatsUpdate: (stats: MatchStatisticsResponse) => {
        setStatistics(stats);
      },
      onStatusChange: (status: SyncConnectionStatus) => {
        setConnectionStatus(status);
      },
      onError: () => {
        // silent sync error handled by status
      },
    });

    return () => {
      unsubscribe();
    };
  }, [matchId, fetchInitialData]);

  // Check if current user is the organizer, assigned referee or admin
  const isOrganizer =
    currentUser?.id === match?.session?.organizer_id ||
    currentUser?.id === (match?.session as any)?.referee_id ||
    currentUser?.role === 'admin';

  // ─── Actions Handlers ────────────────────────────────────────────────────────

  const handleAddEvent = async (payload: AddMatchEventPayload) => {
    if (!match) return;

    // Generate idempotency key for this action to prevent duplicates
    const idempotencyKey = `mob_${match.id}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const fullPayload: AddMatchEventPayload = {
      ...payload,
      idempotency_key: idempotencyKey,
      period: payload.period || match.current_period,
    };

    setActionLoading(true);
    try {
      const newEvent = await matchesApi.addMatchEvent(match.id, fullPayload);

      // Append new event to events list
      const pts = newEvent.points || 0;
      const nextScoreA = newEvent.team_side === 'team_a' && pts ? match.score_team_a + pts : match.score_team_a;
      const nextScoreB = newEvent.team_side === 'team_b' && pts ? match.score_team_b + pts : match.score_team_b;

      setMatch((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          score_team_a: nextScoreA,
          score_team_b: nextScoreB,
          events: [...(prev.events || []), newEvent],
        };
      });

      // Automatic set win detection for Volleyball & Table Tennis
      const currentSport = match.session?.sport?.slug || '';
      const isSetSportType = currentSport === 'volleyball' || currentSport === 'table-tennis';
      if (isSetSportType && isOrganizer) {
        const isVolleyTieBreak = currentSport === 'volleyball' && match.current_period === 5;
        const targetPts = currentSport === 'volleyball' ? (isVolleyTieBreak ? 15 : 25) : 11;
        const wonA = nextScoreA >= targetPts && nextScoreA - nextScoreB >= 2;
        const wonB = nextScoreB >= targetPts && nextScoreB - nextScoreA >= 2;

        if (wonA || wonB) {
          const winnerTeam = wonA ? (match.team_a_name || 'Équipe A') : (match.team_b_name || 'Équipe B');
          Alert.alert(
            '🏆 Set remporté !',
            `${winnerTeam} remporte le Set ${match.current_period} (${nextScoreA} - ${nextScoreB}) !\n\nVoulez-vous clore ce set et démarrer le Set suivant ?`,
            [
              { text: 'Continuer le set', style: 'cancel' },
              {
                text: 'Valider et Set suivant',
                onPress: async () => {
                  setActionLoading(true);
                  try {
                    await matchesApi.nextPeriod(match.id);
                    await fetchInitialData();
                    matchLiveSync.syncNow(match.id);
                  } catch (err: any) {
                    setError(err.message || 'Erreur lors du passage au set suivant.');
                  } finally {
                    setActionLoading(false);
                  }
                },
              },
            ]
          );
        }
      }

      // Refresh live statistics in background
      matchLiveSync.syncNow(match.id);
    } catch (err: any) {
      // Enqueue to offline queue with idempotency key
      await offlineQueueService.enqueueEvent(match.id, fullPayload);

      // Optimistic score update for user comfort
      if (payload.type === 'basket' || payload.type === 'goal' || payload.type === 'point') {
        const added = payload.points || 1;
        setMatch((prev) =>
          prev ? {
            ...prev,
            score_team_a: payload.team_side === 'team_a' ? prev.score_team_a + added : prev.score_team_a,
            score_team_b: payload.team_side === 'team_b' ? prev.score_team_b + added : prev.score_team_b,
          } : prev
        );
      }
      setError('Événement stocké hors-ligne. Il sera synchronisé dès le retour du réseau.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelEvent = async (eventId: number) => {
    if (!match) return;
    setActionLoading(true);
    try {
      const res = await matchesApi.cancelMatchEvent(match.id, eventId);
      setMatch(res.match);
      matchLiveSync.syncNow(match.id);
    } catch (err: any) {
      setError(err.message || 'Impossible d\'annuler cet événement.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePauseMatch = async () => {
    if (!match) return;
    setActionLoading(true);
    try {
      const updated = await matchesApi.pauseMatch(match.id);
      setMatch(updated);
      matchLiveSync.syncNow(match.id);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise en pause.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResumeMatch = async () => {
    if (!match) return;
    setActionLoading(true);
    try {
      const updated = await matchesApi.resumeMatch(match.id);
      setMatch(updated);
      matchLiveSync.syncNow(match.id);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la reprise.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleNextPeriod = async () => {
    if (!match) return;
    const currentSport = match.session?.sport?.slug || '';
    const isSetSportType = currentSport === 'volleyball' || currentSport === 'table-tennis';

    const title = isSetSportType ? 'Passer au set suivant' : 'Passer au quart-temps suivant';
    const message = isSetSportType
      ? `Êtes-vous sûr de vouloir clore le Set ${match.current_period} (${match.score_team_a} - ${match.score_team_b}) et enregistrer le score ?`
      : `Êtes-vous sûr de vouloir clore le quart-temps Q${match.current_period} et démarrer le suivant ?`;

    Alert.alert(
      title,
      message,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            setActionLoading(true);
            try {
              await matchesApi.nextPeriod(match.id);
              await fetchInitialData();
              matchLiveSync.syncNow(match.id);
            } catch (err: any) {
              setError(err.message || (isSetSportType ? 'Erreur lors du passage au set suivant.' : 'Erreur lors du passage au quart-temps suivant.'));
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleFinish = async () => {
    if (!match) return;
    Alert.alert(
      'Terminer le match',
      'Le match sera marqué comme terminé et les classements / statistiques seront consolidés. Confirmer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Terminer',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const updated = await matchesApi.finishMatch(match.id);
              setMatch((prev) => (prev ? { ...prev, status: 'finished' } : updated));
              setShowShareModal(true);
            } catch (err: any) {
              setError(err.message || 'Erreur lors de la clôture du match.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleUndoLastEvent = () => {
    if (!match || !match.events || match.events.length === 0) return;
    const active = match.events.filter((e) => !e.is_cancelled);
    if (active.length === 0) return;
    const last = active[active.length - 1];
    handleCancelEvent(last.id);
  };

  // ─── Lineup / Feuille de match Handlers ─────────────────────────────────────

  const handleOpenLineupModal = () => {
    if (!match) return;
    setEditablePlayersA([...(match.team_a_players || [])]);
    setEditablePlayersB([...(match.team_b_players || [])]);
    setLineupSide('team_a');
    setShowLineupModal(true);
  };

  const handleUpdatePlayerA = (index: number, updates: Partial<MatchPlayer>) => {
    setEditablePlayersA((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  const handleUpdatePlayerB = (index: number, updates: Partial<MatchPlayer>) => {
    setEditablePlayersB((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  const handleTransferSide = (player: MatchPlayer, fromSide: 'team_a' | 'team_b') => {
    if (fromSide === 'team_a') {
      setEditablePlayersA((prev) => prev.filter((p) => p.id !== player.id));
      setEditablePlayersB((prev) => [...prev, player]);
    } else {
      setEditablePlayersB((prev) => prev.filter((p) => p.id !== player.id));
      setEditablePlayersA((prev) => [...prev, player]);
    }
  };

  const handleSaveLineup = async () => {
    if (!match) return;
    setSavingLineup(true);
    try {
      const playersPayload = [
        ...editablePlayersA.map((p) => ({
          user_id: p.id,
          team_side: 'team_a' as const,
          jersey_number: p.jersey_number,
          position: p.position,
          is_starter: p.is_starter ?? true,
          is_on_court: p.is_on_court ?? true,
        })),
        ...editablePlayersB.map((p) => ({
          user_id: p.id,
          team_side: 'team_b' as const,
          jersey_number: p.jersey_number,
          position: p.position,
          is_starter: p.is_starter ?? true,
          is_on_court: p.is_on_court ?? true,
        })),
      ];
      await matchesApi.updatePlayers(match.id, playersPayload);
      await fetchInitialData();
      setShowLineupModal(false);
      Alert.alert('Feuille de match', 'Les compositions d\'équipe et numéros ont été enregistrés avec succès.');
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message || err.message || 'Impossible d\'enregistrer la feuille de match.');
    } finally {
      setSavingLineup(false);
    }
  };

  if (loading && !match) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Synchronisation du direct...</Text>
      </View>
    );
  }

  if (!match) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error || 'Match introuvable.'}</Text>
        <Button title="Réessayer" variant="secondary" onPress={fetchInitialData} style={{ marginTop: 16 }} />
      </View>
    );
  }

  const sportSlug = match.session?.sport?.slug || 'basketball';
  const teamAName = match.team_a_name || match.session?.team_a?.name || 'Équipe A';
  const teamBName = match.team_b_name || match.session?.team_b?.name || 'Équipe B';
  const teamAColor = match.team_a_color || '#1456D9';
  const teamBColor = match.team_b_color || '#F28B2E';
  const teamAPlayers: MatchPlayer[] = match.team_a_players || [];
  const teamBPlayers: MatchPlayer[] = match.team_b_players || [];

  return (
    <View style={styles.screenWrapper}>
      {/* ─── Top Navigation Bar ──────────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onNavigateBack || (() => onFinishMatch(match.id))}
          activeOpacity={0.7}
        >
          <ChevronLeft size={22} color={colors.text} />
          <Text style={styles.backBtnText}>Retour</Text>
        </TouchableOpacity>

        <View style={styles.topBarCenter}>
          <View style={[styles.liveIndicatorDot, match.status === 'in_progress' ? styles.dotRedPulse : styles.dotOrange]} />
          <Text style={styles.topBarTitle}>
            {match.status === 'in_progress' ? 'DIRECT' : match.status === 'paused' ? 'EN PAUSE' : 'MATCH'}
          </Text>
        </View>

        <View style={styles.topBarRightActions}>
          <TouchableOpacity
            style={styles.actionIconBtn}
            onPress={() => setShowShareModal(true)}
            activeOpacity={0.75}
            accessibilityLabel="Partager la carte de match"
          >
            <Share2 size={16} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionIconBtn}
            onPress={handleOpenOfficialSheet}
            activeOpacity={0.75}
            accessibilityLabel="Feuille officielle PDF"
          >
            <FileText size={16} color={colors.primary} />
          </TouchableOpacity>
          {isOrganizer && (
            <TouchableOpacity
              style={styles.rosterBtn}
              onPress={handleOpenLineupModal}
              activeOpacity={0.75}
            >
              <Users size={15} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={styles.rosterBtnText}>Compos</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ─── Sync Status Bar ──────────────────────────────────────────────────────── */}
      <View style={[
        styles.syncStatusBar,
        connectionStatus === 'connected' ? styles.syncConnected : connectionStatus === 'reconnecting' ? styles.syncReconnecting : styles.syncOffline
      ]}>
        <View style={[
          styles.syncDot,
          connectionStatus === 'connected' ? styles.dotGreen : connectionStatus === 'reconnecting' ? styles.dotYellow : styles.dotRed
        ]} />
        <Text style={styles.syncStatusText}>
          {connectionStatus === 'connected'
            ? 'TEMPS RÉEL ACTIF • SYNCHRONISÉ'
            : connectionStatus === 'reconnecting'
            ? 'RECONNEXION AU SERVEUR...'
            : 'HORS-LIGNE • ACTIONS EN FILE D\'ATTENTE'}
        </Text>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {error && <ErrorBanner message={error} />}

        {/* ─── ScoreBoard / SetsScoreBoard Component ────────────────────────── */}
        {isSetSport(sportSlug) ? (
          <SetsScoreBoard
            scoreTeamA={match.score_team_a}
            scoreTeamB={match.score_team_b}
            setsWonA={match.sets_won_a || 0}
            setsWonB={match.sets_won_b || 0}
            currentSet={match.current_period || 1}
            maxSets={3}
            sportSlug={sportSlug}
            teamAName={teamAName}
            teamBName={teamBName}
            teamAColor={teamAColor}
            teamBColor={teamBColor}
            status={match.status}
            setScores={match.set_scores || []}
            onTriggerNextSet={handleNextPeriod}
            isOrganizer={isOrganizer}
          />
        ) : (
          <ScoreBoard
            scoreTeamA={match.score_team_a}
            scoreTeamB={match.score_team_b}
            teamAName={teamAName}
            teamBName={teamBName}
            teamAColor={teamAColor}
            teamBColor={teamBColor}
            teamAFouls={match.team_a_fouls || 0}
            teamBFouls={match.team_b_fouls || 0}
            currentPeriod={match.current_period}
            totalPeriods={match.total_periods}
            periodDurationSeconds={match.period_duration_seconds}
            periodElapsedSeconds={match.period_elapsed_seconds || match.elapsed_seconds}
            lastResumedAt={match.last_resumed_at}
            status={match.status}
            sportSlug={sportSlug}
            periodScores={statistics?.period_scores || []}
            setScores={match.set_scores}
            setsWonA={match.sets_won_a}
            setsWonB={match.sets_won_b}
          />
        )}

        {/* ─── Match Finished Quick Actions Banner ────────────────────────────── */}
        {match.status === 'finished' && (
          <View style={styles.finishedActionsCard}>
            <View style={styles.finishedActionsHeader}>
              <Sparkles size={16} color="#F59E0B" />
              <Text style={styles.finishedActionsTitle}>Match Clôturé · Résultats Officiels</Text>
            </View>
            <View style={styles.finishedButtonsRow}>
              <TouchableOpacity
                style={styles.shareStoryBtn}
                onPress={() => setShowShareModal(true)}
                activeOpacity={0.85}
              >
                <Share2 size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.shareStoryBtnText}>Carte Story / WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.officialPdfBtn}
                onPress={handleOpenOfficialSheet}
                activeOpacity={0.85}
              >
                <FileText size={15} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.officialPdfBtnText}>Feuille PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ─── Segmented Navigation Tabs ────────────────────────────────────────── */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'dashboard' && styles.tabItemActive]}
            onPress={() => setActiveTab('dashboard')}
          >
            <Text style={[styles.tabText, activeTab === 'dashboard' && styles.tabTextActive]}>
              Tableau
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'team_stats' && styles.tabItemActive]}
            onPress={() => setActiveTab('team_stats')}
          >
            <Text style={[styles.tabText, activeTab === 'team_stats' && styles.tabTextActive]}>
              Stats Équipes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'players' && styles.tabItemActive]}
            onPress={() => setActiveTab('players')}
          >
            <Text style={[styles.tabText, activeTab === 'players' && styles.tabTextActive]}>
              Joueurs
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'timeline' && styles.tabItemActive]}
            onPress={() => setActiveTab('timeline')}
          >
            <Text style={[styles.tabText, activeTab === 'timeline' && styles.tabTextActive]}>
              Fil Match
            </Text>
          </TouchableOpacity>
        </View>

        {/* ─── Tab 1: Dashboard (Organizer Control Pad OR Spectator View) ───────── */}
        {activeTab === 'dashboard' && (
          <View>
            {/* Organizer Lineup / Match Sheet banner */}
            {isOrganizer && (
              <View style={styles.lineupBannerCard}>
                <View style={styles.lineupBannerLeft}>
                  <ClipboardList size={18} color={colors.primary} />
                  <View style={{ marginLeft: 8 }}>
                    <Text style={styles.lineupBannerTitle}>Feuille de match & Compositions</Text>
                    <Text style={styles.lineupBannerSub}>
                      {teamAPlayers.length} dans {teamAName} · {teamBPlayers.length} dans {teamBName}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.lineupEditBtn}
                  onPress={handleOpenLineupModal}
                  activeOpacity={0.85}
                >
                  <Edit3 size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.lineupEditBtnText}>Ajuster</Text>
                </TouchableOpacity>
              </View>
            )}

            {isOrganizer ? (
              <OrganizerControlPad
                teamAName={teamAName}
                teamBName={teamBName}
                teamAColor={teamAColor}
                teamBColor={teamBColor}
                teamAPlayers={teamAPlayers}
                teamBPlayers={teamBPlayers}
                currentPeriod={match.current_period}
                isPaused={match.status === 'paused'}
                status={match.status}
                actionLoading={actionLoading}
                sportSlug={sportSlug}
                onAddEvent={handleAddEvent}
                onPause={handlePauseMatch}
                onResume={handleResumeMatch}
                onNextPeriod={handleNextPeriod}
                onFinishMatch={handleFinish}
                onUndoLastEvent={handleUndoLastEvent}
              />
            ) : (
              <View style={styles.spectatorCard}>
                <Text style={styles.spectatorTitle}>MODE SPECTATEUR EN DIRECT</Text>
                <Text style={styles.spectatorBody}>
                  Suivez les scores, fautes et statistiques en direct. Les données s'actualisent automatiquement sans rechargement.
                </Text>
              </View>
            )}

            {/* Quick overview of latest events */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Dernières actions</Text>
                <TouchableOpacity onPress={() => setActiveTab('timeline')}>
                  <Text style={styles.seeAllText}>Voir tout ›</Text>
                </TouchableOpacity>
              </View>
              <PlayByPlayTab
                events={(match.events || []).slice(-6)}
                teamAName={teamAName}
                teamBName={teamBName}
                teamAColor={teamAColor}
                teamBColor={teamBColor}
                isOrganizer={isOrganizer}
                sportSlug={sportSlug}
                onCancelEvent={handleCancelEvent}
                actionLoading={actionLoading}
              />
            </View>

            {/* Top Performers multi-sport widget */}
            {statistics && statistics.players?.all && (() => {
              const cat = sportSlug === 'volleyball' || sportSlug === 'volley' || sportSlug === 'beach-volley'
                ? 'volleyball'
                : sportSlug === 'table-tennis' || sportSlug === 'tennis-de-table' || sportSlug === 'ping-pong'
                ? 'table_tennis'
                : sportSlug === 'basketball-3x3' || sportSlug === 'basket-3x3' || sportSlug === '3x3'
                ? 'basketball_3x3'
                : sportSlug === 'basketball' || sportSlug === 'basket' || sportSlug === 'basketball-5x5'
                ? 'basketball'
                : 'football';

              const getPerformerKey = (p: any): number => {
                switch (cat) {
                  case 'basketball':
                  case 'basketball_3x3':
                    return (p.points ?? 0) * 2 + (p.assists ?? 0) + (p.rebounds_total ?? 0);
                  case 'volleyball':
                    return (p.aces ?? 0) * 3 + (p.attack_kills ?? 0) * 2 + (p.blocks ?? 0);
                  case 'table_tennis':
                    return (p.points ?? 0) * 2 + (p.aces ?? 0);
                  default: // football
                    return (p.goals ?? 0) * 4 + (p.assists ?? 0) * 2 + (p.shots_on_target ?? 0);
                }
              };

              const getWidgetTitle = (): string => {
                switch (cat) {
                  case 'basketball':
                  case 'basketball_3x3': return '🏀 Meilleurs Marqueurs';
                  case 'volleyball': return '🏐 Meilleurs Joueurs';
                  case 'table_tennis': return '🏓 Meilleurs Joueurs';
                  default: return '⚽ Buteurs & Passeurs';
                }
              };

              const topPlayers = statistics.players.all
                .filter((p: any) => getPerformerKey(p) > 0)
                .sort((a: any, b: any) => getPerformerKey(b) - getPerformerKey(a))
                .slice(0, 5);

              if (topPlayers.length === 0) return null;

              return (
                <View style={styles.sectionContainer}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>{getWidgetTitle()}</Text>
                    <TouchableOpacity onPress={() => setActiveTab('players')}>
                      <Text style={styles.seeAllText}>Boxscore ›</Text>
                    </TouchableOpacity>
                  </View>
                  {topPlayers.map((player: any, idx: number) => {
                    const isTeamA = player.team_side === 'team_a';
                    const teamColor = isTeamA ? teamAColor : teamBColor;
                    return (
                      <View key={`perf-${player.user_id}`} style={styles.scorerRow}>
                        <View style={[styles.scorerRankBadge, { backgroundColor: idx === 0 ? '#F59E0B' : idx === 1 ? '#94A3B8' : idx === 2 ? '#CD7C3F' : colors.borderLight }]}>
                          <Text style={styles.scorerRankText}>{idx + 1}</Text>
                        </View>
                        <View style={[styles.scorerTeamDot, { backgroundColor: teamColor }]} />
                        <Text style={styles.scorerName} numberOfLines={1}>{player.username}</Text>
                        {player.jersey_number != null && (
                          <Text style={styles.scorerJersey}>#{player.jersey_number}</Text>
                        )}
                        <View style={styles.scorerStats}>
                          {/* Football */}
                          {cat === 'football' && (player.goals ?? 0) > 0 && (
                            <View style={[styles.scorerStatBadge, { backgroundColor: `${teamColor}18` }]}>
                              <Text style={[styles.scorerStatText, { color: teamColor }]}>{player.goals} but{player.goals > 1 ? 's' : ''}</Text>
                            </View>
                          )}
                          {cat === 'football' && (player.assists ?? 0) > 0 && (
                            <View style={styles.scorerAssistBadge}>
                              <Text style={styles.scorerAssistText}>{player.assists} passe{player.assists > 1 ? 's' : ''}</Text>
                            </View>
                          )}
                          {/* Basketball */}
                          {(cat === 'basketball' || cat === 'basketball_3x3') && (player.points ?? 0) > 0 && (
                            <View style={[styles.scorerStatBadge, { backgroundColor: `${teamColor}18` }]}>
                              <Text style={[styles.scorerStatText, { color: teamColor }]}>{player.points} pts</Text>
                            </View>
                          )}
                          {(cat === 'basketball' || cat === 'basketball_3x3') && (player.rebounds_total ?? 0) > 0 && (
                            <View style={styles.scorerAssistBadge}>
                              <Text style={styles.scorerAssistText}>{player.rebounds_total} reb</Text>
                            </View>
                          )}
                          {(cat === 'basketball' || cat === 'basketball_3x3') && (player.assists ?? 0) > 0 && (
                            <View style={styles.scorerAssistBadge}>
                              <Text style={styles.scorerAssistText}>{player.assists} passe{player.assists > 1 ? 's' : ''}</Text>
                            </View>
                          )}
                          {/* Volleyball */}
                          {cat === 'volleyball' && (player.aces ?? 0) > 0 && (
                            <View style={[styles.scorerStatBadge, { backgroundColor: `${teamColor}18` }]}>
                              <Text style={[styles.scorerStatText, { color: teamColor }]}>{player.aces} ace{player.aces > 1 ? 's' : ''}</Text>
                            </View>
                          )}
                          {cat === 'volleyball' && (player.attack_kills ?? 0) > 0 && (
                            <View style={styles.scorerAssistBadge}>
                              <Text style={styles.scorerAssistText}>{player.attack_kills} att.</Text>
                            </View>
                          )}
                          {/* Table Tennis */}
                          {cat === 'table_tennis' && (player.points ?? 0) > 0 && (
                            <View style={[styles.scorerStatBadge, { backgroundColor: `${teamColor}18` }]}>
                              <Text style={[styles.scorerStatText, { color: teamColor }]}>{player.points} pts</Text>
                            </View>
                          )}
                          {cat === 'table_tennis' && (player.aces ?? 0) > 0 && (
                            <View style={styles.scorerAssistBadge}>
                              <Text style={styles.scorerAssistText}>{player.aces} serv.</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })()}
          </View>
        )}

        {/* ─── Tab 2: Collective Team Statistics ──────────────────────────────────── */}
        {activeTab === 'team_stats' && (
          <TeamStatisticsTab
            teamAStats={statistics?.collective.team_a}
            teamBStats={statistics?.collective.team_b}
            teamAName={teamAName}
            teamBName={teamBName}
            teamAColor={teamAColor}
            teamBColor={teamBColor}
            periodScores={statistics?.period_scores || []}
            sportSlug={sportSlug}
          />
        )}

        {/* ─── Tab 3: Player Boxscores ────────────────────────────────────────────── */}
        {activeTab === 'players' && (
          <PlayerBoxscoreTab
            playersA={statistics?.players.team_a || []}
            playersB={statistics?.players.team_b || []}
            teamAName={teamAName}
            teamBName={teamBName}
            teamAColor={teamAColor}
            teamBColor={teamBColor}
            sportSlug={sportSlug}
          />
        )}

        {/* ─── Tab 4: Full Play-by-play Timeline ─────────────────────────────────── */}
        {activeTab === 'timeline' && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Historique complet des actions</Text>
            <PlayByPlayTab
              events={match.events || []}
              teamAName={teamAName}
              teamBName={teamBName}
              teamAColor={teamAColor}
              teamBColor={teamBColor}
              isOrganizer={isOrganizer}
              sportSlug={sportSlug}
              onCancelEvent={handleCancelEvent}
              actionLoading={actionLoading}
            />
          </View>
        )}
      </ScrollView>

      {/* ─── Lineup & Match Sheet Modal ────────────────────────────────────────── */}
      <Modal
        visible={showLineupModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLineupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.lineupModalContent}>
            {/* Modal Header */}
            <View style={styles.lineupModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.lineupModalTitle}>Feuille de Match & Compos</Text>
                <Text style={styles.lineupModalSub}>
                  Définissez titulaires sur le terrain, remplaçants et numéros.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowLineupModal(false)}
                style={styles.closeModalBtn}
              >
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Team Side Selector Tabs */}
            <View style={styles.lineupTeamTabs}>
              <TouchableOpacity
                style={[
                  styles.lineupTeamTab,
                  lineupSide === 'team_a' && { backgroundColor: teamAColor, borderColor: teamAColor },
                ]}
                onPress={() => setLineupSide('team_a')}
                activeOpacity={0.8}
              >
                <Shield size={14} color={lineupSide === 'team_a' ? '#FFFFFF' : teamAColor} style={{ marginRight: 6 }} />
                <Text
                  style={[
                    styles.lineupTeamTabText,
                    lineupSide === 'team_a' && styles.lineupTeamTabTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {teamAName} ({editablePlayersA.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.lineupTeamTab,
                  lineupSide === 'team_b' && { backgroundColor: teamBColor, borderColor: teamBColor },
                ]}
                onPress={() => setLineupSide('team_b')}
                activeOpacity={0.8}
              >
                <Shield size={14} color={lineupSide === 'team_b' ? '#FFFFFF' : teamBColor} style={{ marginRight: 6 }} />
                <Text
                  style={[
                    styles.lineupTeamTabText,
                    lineupSide === 'team_b' && styles.lineupTeamTabTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {teamBName} ({editablePlayersB.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Players List ScrollView */}
            <ScrollView style={styles.lineupPlayersList} contentContainerStyle={{ paddingBottom: 20 }}>
              {(lineupSide === 'team_a' ? editablePlayersA : editablePlayersB).length === 0 ? (
                <View style={styles.emptyLineupBox}>
                  <Users size={32} color={colors.muted} style={{ marginBottom: 8 }} />
                  <Text style={styles.emptyLineupText}>Aucun joueur assigné à cette équipe.</Text>
                  <Text style={styles.emptyLineupSub}>
                    Basculez un joueur de l'autre équipe en utilisant le bouton d'échange.
                  </Text>
                </View>
              ) : (
                (lineupSide === 'team_a' ? editablePlayersA : editablePlayersB).map((p, idx) => {
                  const isStarter = p.is_starter ?? true;
                  const isOnCourt = p.is_on_court ?? true;

                  return (
                    <View key={p.id} style={styles.playerEditRow}>
                      {/* Left: Avatar & Identity */}
                      <View style={styles.playerEditIdentity}>
                        <View style={[styles.playerMiniAvatar, { backgroundColor: (lineupSide === 'team_a' ? teamAColor : teamBColor) + '20' }]}>
                          <Text style={[styles.playerMiniAvatarText, { color: lineupSide === 'team_a' ? teamAColor : teamBColor }]}>
                            {p.username ? p.username.substring(0, 2).toUpperCase() : 'JO'}
                          </Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                          <Text style={styles.playerEditUsername} numberOfLines={1}>{p.username}</Text>
                          <View style={styles.playerRoleInputsRow}>
                            {/* Jersey input */}
                            <View style={styles.jerseyInputWrap}>
                              <Text style={styles.jerseyPrefix}>N°</Text>
                              <TextInput
                                style={styles.jerseyInput}
                                keyboardType="number-pad"
                                maxLength={2}
                                defaultValue={p.jersey_number ? String(p.jersey_number) : ''}
                                placeholder="--"
                                placeholderTextColor={colors.muted}
                                onChangeText={(val) => {
                                  const parsed = parseInt(val, 10);
                                  const num = isNaN(parsed) ? undefined : parsed;
                                  if (lineupSide === 'team_a') {
                                    handleUpdatePlayerA(idx, { jersey_number: num });
                                  } else {
                                    handleUpdatePlayerB(idx, { jersey_number: num });
                                  }
                                }}
                              />
                            </View>
                            {/* Position input */}
                            <TextInput
                              style={styles.positionInput}
                              defaultValue={p.position || ''}
                              placeholder="Poste (ex: Meneur, Pivot...)"
                              placeholderTextColor={colors.muted}
                              maxLength={20}
                              onChangeText={(val) => {
                                if (lineupSide === 'team_a') {
                                  handleUpdatePlayerA(idx, { position: val });
                                } else {
                                  handleUpdatePlayerB(idx, { position: val });
                                }
                              }}
                            />
                          </View>
                        </View>
                      </View>

                      {/* Right: Starter Toggle & Transfer Side */}
                      <View style={styles.playerEditActions}>
                        <TouchableOpacity
                          style={[
                            styles.rolePill,
                            isStarter && isOnCourt ? styles.rolePillStarter : styles.rolePillBench,
                          ]}
                          onPress={() => {
                            const newStarter = !isStarter;
                            if (lineupSide === 'team_a') {
                              handleUpdatePlayerA(idx, { is_starter: newStarter, is_on_court: newStarter });
                            } else {
                              handleUpdatePlayerB(idx, { is_starter: newStarter, is_on_court: newStarter });
                            }
                          }}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.rolePillText, isStarter && isOnCourt && styles.rolePillTextStarter]}>
                            {isStarter && isOnCourt ? 'Titulaire' : 'Banc'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.transferSideBtn}
                          onPress={() => handleTransferSide(p, lineupSide)}
                          activeOpacity={0.7}
                        >
                          <ArrowLeftRight size={14} color={colors.primary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>

            {/* Modal Bottom Actions */}
            <View style={styles.lineupModalBottom}>
              <TouchableOpacity
                style={styles.cancelLineupBtn}
                onPress={() => setShowLineupModal(false)}
                disabled={savingLineup}
              >
                <Text style={styles.cancelLineupBtnText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveLineupBtn, savingLineup && { opacity: 0.7 }]}
                onPress={handleSaveLineup}
                disabled={savingLineup}
                activeOpacity={0.88}
              >
                {savingLineup ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Save size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.saveLineupBtnText}>Enregistrer la feuille</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Match Share Card Modal (Story / Stat Card) ────────────────────── */}
      <MatchShareCardModal
        visible={showShareModal}
        match={match}
        statistics={statistics}
        onClose={() => setShowShareModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    color: colors.muted,
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: colors.danger,
    textAlign: 'center',
  },

  // Sync status banner
  syncStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
  },
  syncConnected: {
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
  },
  syncReconnecting: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  syncOffline: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  dotGreen: { backgroundColor: '#00E676' },
  dotYellow: { backgroundColor: '#F59E0B' },
  dotRed: { backgroundColor: '#EF4444' },
  syncStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.5,
  },

  // Segmented Tabs Row
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#0D1B2A',
    borderRadius: radius.pill,
    padding: 3,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemActive: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  tabText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#94A3B8',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  spectatorCard: {
    backgroundColor: '#0D1B2A',
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
  },
  spectatorTitle: {
    ...typography.overline,
    color: '#38BDF8',
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: 0.8,
  },
  spectatorBody: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
  },

  sectionContainer: {
    backgroundColor: '#0D1B2A',
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  seeAllText: {
    color: '#38BDF8',
    fontWeight: '700',
    fontSize: 12,
  },

  // ─── Top Scorers Widget ──────────────────────────────────────────────────────
  scorerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 8,
  },
  scorerRankBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scorerRankText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  scorerTeamDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scorerName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  scorerJersey: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginRight: 4,
  },
  scorerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scorerStatBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  scorerStatText: {
    fontSize: 10,
    fontWeight: '700',
  },
  scorerAssistBadge: {
    backgroundColor: colors.borderLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  scorerAssistText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.muted,
  },

  // ─── Top Bar & Header ──────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingRight: 8,
  },
  backBtnText: {
    ...typography.bodyStrong,
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 2,
  },
  topBarCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  dotRedPulse: {
    backgroundColor: '#DC2626',
  },
  dotOrange: {
    backgroundColor: '#F59E0B',
  },
  topBarTitle: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.8,
  },
  topBarRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rosterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  rosterBtnText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '800',
  },

  // ─── Match Finished Actions Banner ─────────────────────────────────────────
  finishedActionsCard: {
    backgroundColor: '#0F172A',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    ...shadows.card,
  },
  finishedActionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.sm + 2,
  },
  finishedActionsTitle: {
    ...typography.bodyStrong,
    color: '#F8FAFC',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  finishedButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  shareStoryBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  shareStoryBtnText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  officialPdfBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  officialPdfBtnText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '800',
  },

  // ─── Lineup Banner in Dashboard ────────────────────────────────────────────
  lineupBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  lineupBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  lineupBannerTitle: {
    ...typography.bodyStrong,
    color: '#0369A1',
    fontWeight: '800',
    fontSize: 13,
  },
  lineupBannerSub: {
    ...typography.caption,
    color: '#0284C7',
    fontSize: 11,
    marginTop: 1,
  },
  lineupEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radius.pill,
    marginLeft: spacing.sm,
  },
  lineupEditBtnText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },

  // ─── Lineup & Match Sheet Modal ───────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  lineupModalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '88%',
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    ...shadows.card,
  },
  lineupModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  lineupModalTitle: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '800',
    fontSize: 18,
  },
  lineupModalSub: {
    ...typography.caption,
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  closeModalBtn: {
    padding: 4,
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    marginLeft: spacing.sm,
  },
  lineupTeamTabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  lineupTeamTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  lineupTeamTabText: {
    ...typography.bodyStrong,
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  lineupTeamTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  lineupPlayersList: {
    maxHeight: 380,
  },
  emptyLineupBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: spacing.lg,
  },
  emptyLineupText: {
    ...typography.bodyStrong,
    color: colors.text,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyLineupSub: {
    ...typography.caption,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 4,
  },
  playerEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  playerEditIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  playerMiniAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerMiniAvatarText: {
    fontWeight: '800',
    fontSize: 13,
  },
  playerEditUsername: {
    ...typography.bodyStrong,
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  playerRoleInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  jerseyInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 5,
    height: 26,
  },
  jerseyPrefix: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    marginRight: 2,
  },
  jerseyInput: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text,
    width: 20,
    padding: 0,
    textAlign: 'center',
  },
  positionInput: {
    flex: 1,
    fontSize: 11,
    color: colors.text,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    height: 26,
  },
  playerEditActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rolePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  rolePillStarter: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A',
  },
  rolePillBench: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  rolePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
  },
  rolePillTextStarter: {
    color: '#16A34A',
  },
  transferSideBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineupModalBottom: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelLineupBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelLineupBtnText: {
    ...typography.bodyStrong,
    color: colors.muted,
    fontWeight: '700',
  },
  saveLineupBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveLineupBtnText: {
    ...typography.bodyStrong,
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
