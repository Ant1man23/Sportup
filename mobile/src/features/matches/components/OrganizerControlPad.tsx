import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { colors } from '../../../theme/colors';
import { shadows, spacing } from '../../../theme/spacing';
import { Button } from '../../../components/Button';
import {
  MatchEventType,
  AddMatchEventPayload,
  MatchPlayer,
  ShotType,
  ReboundType,
} from '../api/matchesApi';
import {
  getSportCategory,
  formatPeriodLabel,
} from '../config/sportMatchConfig';

interface OrganizerControlPadProps {
  teamAName: string;
  teamBName: string;
  teamAColor?: string;
  teamBColor?: string;
  teamAPlayers: MatchPlayer[];
  teamBPlayers: MatchPlayer[];
  currentPeriod: number;
  isPaused: boolean;
  status: 'pending' | 'in_progress' | 'paused' | 'finished';
  actionLoading: boolean;
  sportSlug?: string;
  onAddEvent: (payload: AddMatchEventPayload) => Promise<void>;
  onPause: () => void;
  onResume: () => void;
  onNextPeriod: () => void;
  onFinishMatch: () => void;
  onUndoLastEvent?: () => void;
}

export const OrganizerControlPad: React.FC<OrganizerControlPadProps> = ({
  teamAName,
  teamBName,
  teamAColor = '#1456D9',
  teamBColor = '#F28B2E',
  teamAPlayers,
  teamBPlayers,
  currentPeriod,
  isPaused,
  status,
  actionLoading,
  sportSlug,
  onAddEvent,
  onPause,
  onResume,
  onNextPeriod,
  onFinishMatch,
  onUndoLastEvent,
}) => {
  const sportCategory = getSportCategory(sportSlug);

  // Modal state for player attribution
  const [pendingAction, setPendingAction] = useState<{
    type: MatchEventType;
    teamSide: 'team_a' | 'team_b';
    points?: number;
    shotType?: ShotType;
    reboundType?: ReboundType;
    label: string;
  } | null>(null);

  // Substitution modal state
  const [subModalSide, setSubModalSide] = useState<'team_a' | 'team_b' | null>(null);
  const [subOutPlayerId, setSubOutPlayerId] = useState<number | null>(null);
  const [subInPlayerId, setSubInPlayerId] = useState<number | null>(null);

  const isFinished = status === 'finished';

  const handleTriggerAction = (
    type: MatchEventType,
    teamSide: 'team_a' | 'team_b',
    label: string,
    points?: number,
    shotType?: ShotType,
    reboundType?: ReboundType
  ) => {
    const players = teamSide === 'team_a' ? teamAPlayers : teamBPlayers;
    // Prompt for player attribution if players are registered
    if (players && players.length > 0) {
      setPendingAction({ type, teamSide, points, shotType, reboundType, label });
    } else {
      // Execute directly without player
      onAddEvent({
        type,
        team_side: teamSide,
        points,
        shot_type: shotType,
        rebound_type: reboundType,
      });
    }
  };

  const handleSelectPlayer = (playerId?: number) => {
    if (!pendingAction) return;

    onAddEvent({
      type: pendingAction.type,
      team_side: pendingAction.teamSide,
      player_id: playerId,
      points: pendingAction.points,
      shot_type: pendingAction.shotType,
      rebound_type: pendingAction.reboundType,
    });

    setPendingAction(null);
  };

  const handleConfirmSubstitution = () => {
    if (!subModalSide || !subOutPlayerId || !subInPlayerId) return;

    onAddEvent({
      type: 'substitution',
      team_side: subModalSide,
      sub_out_player_id: subOutPlayerId,
      sub_in_player_id: subInPlayerId,
    });

    setSubModalSide(null);
    setSubOutPlayerId(null);
    setSubInPlayerId(null);
  };

  const activeModalPlayers = pendingAction
    ? pendingAction.teamSide === 'team_a'
      ? teamAPlayers
      : teamBPlayers
    : [];

  const subPlayers = subModalSide
    ? subModalSide === 'team_a'
      ? teamAPlayers
      : teamBPlayers
    : [];

  const getNextPeriodTitle = (): string => {
    switch (sportCategory) {
      case 'football':
        return 'Mi-Temps Suiv.';
      case 'volleyball':
        return 'Set Suiv.';
      case 'table_tennis':
        return 'Manche Suiv.';
      case 'basketball_3x3':
        return 'Période Suiv.';
      case 'basketball':
      default:
        return 'Q.T. Suiv.';
    }
  };

  // ─── Discipline Actions Renderers ─────────────────────────────────────────────

  const renderFootballControls = (side: 'team_a' | 'team_b', teamColor: string) => (
    <View style={styles.actionBlock}>
      {/* 1. Main Goal Button */}
      <TouchableOpacity
        style={[styles.scoreBtnBig, { backgroundColor: teamColor }]}
        onPress={() => handleTriggerAction('goal', side, '⚽ BUT ! (+1)', 1)}
        disabled={actionLoading || isFinished}
      >
        <Text style={styles.scoreBtnBigText}>⚽ +1 BUT</Text>
      </TouchableOpacity>

      {/* 2. Tactical & Match Events */}
      <View style={styles.extraBtnGrid}>
        <TouchableOpacity
          style={styles.extraPill}
          onPress={() => handleTriggerAction('assist', side, '👟 Passe Décisive')}
          disabled={actionLoading || isFinished}
        >
          <Text style={styles.extraPillText}>👟 Passe D.</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.extraPill}
          onPress={() => handleTriggerAction('shot_on_target', side, '🎯 Tir Cadré')}
          disabled={actionLoading || isFinished}
        >
          <Text style={styles.extraPillText}>🎯 Tir Cadré</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.extraPill}
          onPress={() => handleTriggerAction('shot_off_target', side, '💨 Tir Non Cadré')}
          disabled={actionLoading || isFinished}
        >
          <Text style={styles.extraPillText}>💨 Tir Non C.</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.extraPill}
          onPress={() => handleTriggerAction('save', side, '🧤 Arrêt Gardien')}
          disabled={actionLoading || isFinished}
        >
          <Text style={styles.extraPillText}>🧤 Arrêt</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.extraPill}
          onPress={() => handleTriggerAction('corner', side, '🚩 Corner')}
          disabled={actionLoading || isFinished}
        >
          <Text style={styles.extraPillText}>🚩 Corner</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.extraPill}
          onPress={() => handleTriggerAction('foul', side, '⚠️ Faute')}
          disabled={actionLoading || isFinished}
        >
          <Text style={[styles.extraPillText, { color: colors.danger }]}>⚠️ Faute</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.extraPill, { backgroundColor: '#FEF3C7' }]}
          onPress={() => handleTriggerAction('card_yellow', side, '🟨 Carton Jaune')}
          disabled={actionLoading || isFinished}
        >
          <Text style={[styles.extraPillText, { color: '#B45309' }]}>🟨 Jaune</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.extraPill, { backgroundColor: '#FEE2E2' }]}
          onPress={() => handleTriggerAction('card_red', side, '🟥 Carton Rouge')}
          disabled={actionLoading || isFinished}
        >
          <Text style={[styles.extraPillText, { color: '#DC2626' }]}>🟥 Rouge</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.extraPill}
          onPress={() => handleTriggerAction('offside', side, '🏁 Hors-jeu')}
          disabled={actionLoading || isFinished}
        >
          <Text style={styles.extraPillText}>🏁 Hors-jeu</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.extraPill, { backgroundColor: '#F1F5F9' }]}
          onPress={() => setSubModalSide(side)}
          disabled={actionLoading || isFinished}
        >
          <Text style={[styles.extraPillText, { color: colors.navy }]}>🔄 Remplac.</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderBasketball5x5Controls = (side: 'team_a' | 'team_b', teamColor: string) => (
    <View style={styles.actionBlock}>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.scoreBtn, { backgroundColor: teamColor }]}
          onPress={() => handleTriggerAction('basket', side, '+1 LF', 1, 'free_throw')}
          disabled={actionLoading || isFinished}
        >
          <Text style={styles.scoreBtnText}>+1 LF</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.scoreBtn, { backgroundColor: teamColor }]}
          onPress={() => handleTriggerAction('basket', side, '+2 Pts', 2, '2pt')}
          disabled={actionLoading || isFinished}
        >
          <Text style={styles.scoreBtnText}>+2 PTS</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.scoreBtn, { backgroundColor: teamColor }]}
          onPress={() => handleTriggerAction('basket', side, '+3 Pts', 3, '3pt')}
          disabled={actionLoading || isFinished}
        >
          <Text style={styles.scoreBtnText}>+3 PTS</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.missedBtn}
        onPress={() => handleTriggerAction('missed_shot', side, 'Tir Manqué')}
        disabled={actionLoading || isFinished}
      >
        <Text style={styles.missedBtnText}>TIR MANQUÉ</Text>
      </TouchableOpacity>

      <View style={styles.extraBtnGrid}>
        <TouchableOpacity
          style={styles.extraPill}
          onPress={() => handleTriggerAction('rebound', side, 'Rebond Offensif', undefined, undefined, 'offensive')}
        >
          <Text style={styles.extraPillText}>Reb. Off</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.extraPill}
          onPress={() => handleTriggerAction('rebound', side, 'Rebond Défensif', undefined, undefined, 'defensive')}
        >
          <Text style={styles.extraPillText}>Reb. Déf</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.extraPill}
          onPress={() => handleTriggerAction('assist', side, 'Passe Décisive')}
        >
          <Text style={styles.extraPillText}>Passe D.</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.extraPill}
          onPress={() => handleTriggerAction('foul', side, 'Faute')}
        >
          <Text style={[styles.extraPillText, { color: colors.danger }]}>Faute</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.extraPill}
          onPress={() => handleTriggerAction('steal', side, 'Interception')}
        >
          <Text style={styles.extraPillText}>Intercept.</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.extraPill}
          onPress={() => handleTriggerAction('block', side, 'Contre')}
        >
          <Text style={styles.extraPillText}>Contre</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.extraPill}
          onPress={() => handleTriggerAction('turnover', side, 'Balle Perdue')}
        >
          <Text style={styles.extraPillText}>Balle P.</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.extraPill, { backgroundColor: '#F1F5F9' }]}
          onPress={() => setSubModalSide(side)}
        >
          <Text style={[styles.extraPillText, { color: colors.navy }]}>Remplac.</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderBasketball3x3Controls = (side: 'team_a' | 'team_b', teamColor: string) => (
    <View style={styles.actionBlock}>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.scoreBtn, { flex: 1, backgroundColor: teamColor }]}
          onPress={() => handleTriggerAction('basket', side, '+1 PT (LF/Arc)', 1, '2pt')}
          disabled={actionLoading || isFinished}
        >
          <Text style={styles.scoreBtnText}>+1 PT (Arc/LF)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.scoreBtn, { flex: 1, backgroundColor: teamColor }]}
          onPress={() => handleTriggerAction('basket', side, '+2 PTS (Ext.)', 2, '3pt')}
          disabled={actionLoading || isFinished}
        >
          <Text style={styles.scoreBtnText}>+2 PTS (Ext.)</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.missedBtn}
        onPress={() => handleTriggerAction('missed_shot', side, 'Tir Manqué')}
        disabled={actionLoading || isFinished}
      >
        <Text style={styles.missedBtnText}>TIR MANQUÉ</Text>
      </TouchableOpacity>

      <View style={styles.extraBtnGrid}>
        <TouchableOpacity
          style={styles.extraPill}
          onPress={() => handleTriggerAction('rebound', side, 'Rebond')}
        >
          <Text style={styles.extraPillText}>Rebond</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.extraPill}
          onPress={() => handleTriggerAction('assist', side, 'Passe Décisive')}
        >
          <Text style={styles.extraPillText}>Passe D.</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.extraPill}
          onPress={() => handleTriggerAction('foul', side, 'Faute d\'équipe')}
        >
          <Text style={[styles.extraPillText, { color: colors.danger }]}>Faute</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.extraPill}
          onPress={() => handleTriggerAction('steal', side, 'Interception')}
        >
          <Text style={styles.extraPillText}>Intercept.</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.extraPill}
          onPress={() => handleTriggerAction('block', side, 'Contre')}
        >
          <Text style={styles.extraPillText}>Contre</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.extraPill}
          onPress={() => handleTriggerAction('turnover', side, 'Balle Perdue')}
        >
          <Text style={styles.extraPillText}>Balle P.</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.extraPill, { backgroundColor: '#F1F5F9' }]}
          onPress={() => setSubModalSide(side)}
        >
          <Text style={[styles.extraPillText, { color: colors.navy }]}>Remplac.</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderVolleyballControls = (side: 'team_a' | 'team_b', teamColor: string) => (
    <View style={styles.actionBlock}>
      <TouchableOpacity
        style={[styles.scoreBtnBig, { backgroundColor: teamColor }]}
        onPress={() => handleTriggerAction('point', side, '+1 Point', 1)}
        disabled={actionLoading || isFinished}
      >
        <Text style={styles.scoreBtnBigText}>+1 POINT</Text>
      </TouchableOpacity>

      <View style={styles.extraBtnGrid}>
        <TouchableOpacity
          style={styles.extraPill}
          onPress={() => handleTriggerAction('ace', side, '🎯 Ace (+1)', 1)}
          disabled={actionLoading || isFinished}
        >
          <Text style={styles.extraPillText}>🎯 Ace (+1)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.extraPill}
          onPress={() => handleTriggerAction('attack_kill', side, '💥 Attaque (+1)', 1)}
          disabled={actionLoading || isFinished}
        >
          <Text style={styles.extraPillText}>💥 Attaque (+1)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.extraPill}
          onPress={() => handleTriggerAction('block', side, '🛡️ Contre (+1)', 1)}
          disabled={actionLoading || isFinished}
        >
          <Text style={styles.extraPillText}>🛡️ Contre (+1)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.extraPill}
          onPress={() => handleTriggerAction('point', side, '⚠️ Faute Adv. (+1)', 1)}
          disabled={actionLoading || isFinished}
        >
          <Text style={styles.extraPillText}>⚠️ Faute Adv.</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.extraPill}
          onPress={() => handleTriggerAction('foul', side, '❌ Faute Commise')}
          disabled={actionLoading || isFinished}
        >
          <Text style={[styles.extraPillText, { color: colors.danger }]}>❌ Faute</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.extraPill, { backgroundColor: '#F1F5F9' }]}
          onPress={() => setSubModalSide(side)}
        >
          <Text style={[styles.extraPillText, { color: colors.navy }]}>Remplac.</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTableTennisControls = (side: 'team_a' | 'team_b', teamColor: string) => (
    <View style={styles.actionBlock}>
      <TouchableOpacity
        style={[styles.scoreBtnBig, { backgroundColor: teamColor }]}
        onPress={() => handleTriggerAction('point', side, '+1 Point', 1)}
        disabled={actionLoading || isFinished}
      >
        <Text style={styles.scoreBtnBigText}>+1 POINT</Text>
      </TouchableOpacity>

      <View style={styles.extraBtnGrid}>
        <TouchableOpacity
          style={styles.extraPill}
          onPress={() => handleTriggerAction('ace', side, '🎯 Service Gagnant (+1)', 1)}
          disabled={actionLoading || isFinished}
        >
          <Text style={styles.extraPillText}>🎯 Service (+1)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.extraPill}
          onPress={() => handleTriggerAction('winner', side, '⚡ Coup Gagnant (+1)', 1)}
          disabled={actionLoading || isFinished}
        >
          <Text style={styles.extraPillText}>⚡ Gagnant (+1)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.extraPill}
          onPress={() => handleTriggerAction('point', side, '⚠️ Faute Adv. (+1)', 1)}
          disabled={actionLoading || isFinished}
        >
          <Text style={styles.extraPillText}>⚠️ Faute Adv.</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.extraPill}
          onPress={() => handleTriggerAction('foul', side, '❌ Faute Directe')}
          disabled={actionLoading || isFinished}
        >
          <Text style={[styles.extraPillText, { color: colors.danger }]}>❌ Faute Dir.</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDisciplineControls = (side: 'team_a' | 'team_b', teamColor: string) => {
    switch (sportCategory) {
      case 'football':
        return renderFootballControls(side, teamColor);
      case 'basketball_3x3':
        return renderBasketball3x3Controls(side, teamColor);
      case 'volleyball':
        return renderVolleyballControls(side, teamColor);
      case 'table_tennis':
        return renderTableTennisControls(side, teamColor);
      case 'basketball':
      default:
        return renderBasketball5x5Controls(side, teamColor);
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Period & Timer Control Bar */}
      <View style={styles.controlHeader}>
        <View style={styles.controlHeaderLeft}>
          <Text style={styles.headerTitle}>COMMANDES DU MATCH</Text>
          <Text style={styles.headerSubtitle}>
            {formatPeriodLabel(sportCategory, currentPeriod).toUpperCase()}
          </Text>
        </View>

        <View style={styles.headerButtonsRow}>
          {isPaused ? (
            <Button
              title="Reprendre"
              size="sm"
              variant="primary"
              loading={actionLoading}
              onPress={onResume}
              style={styles.headerBtn}
            />
          ) : (
            <Button
              title="Pause"
              size="sm"
              variant="secondary"
              loading={actionLoading}
              onPress={onPause}
              disabled={isFinished}
              style={styles.headerBtn}
            />
          )}

          <Button
            title={getNextPeriodTitle()}
            size="sm"
            variant="ghost"
            loading={actionLoading}
            onPress={onNextPeriod}
            disabled={isFinished}
            style={styles.headerBtn}
          />
        </View>
      </View>

      {/* 2. Fast Scoring Section - Side by Side for Team A and Team B */}
      <View style={styles.scoreActionGrid}>
        {/* Team A Box */}
        <View style={[styles.teamActionCard, { borderColor: teamAColor + '50' }]}>
          <View style={[styles.teamActionHeader, { backgroundColor: teamAColor + '15' }]}>
            <View style={[styles.miniDot, { backgroundColor: teamAColor }]} />
            <Text style={[styles.teamActionTitle, { color: teamAColor }]} numberOfLines={1}>
              {teamAName}
            </Text>
          </View>
          {renderDisciplineControls('team_a', teamAColor)}
        </View>

        {/* Team B Box */}
        <View style={[styles.teamActionCard, { borderColor: teamBColor + '50' }]}>
          <View style={[styles.teamActionHeader, { backgroundColor: teamBColor + '15' }]}>
            <View style={[styles.miniDot, { backgroundColor: teamBColor }]} />
            <Text style={[styles.teamActionTitle, { color: teamBColor }]} numberOfLines={1}>
              {teamBName}
            </Text>
          </View>
          {renderDisciplineControls('team_b', teamBColor)}
        </View>
      </View>

      {/* 3. Bottom Actions: Undo & End Match */}
      <View style={styles.bottomControlRow}>
        {onUndoLastEvent && (
          <Button
            title="Annuler dernière action"
            variant="ghost"
            size="sm"
            loading={actionLoading}
            onPress={onUndoLastEvent}
            style={styles.undoBottomBtn}
          />
        )}

        <Button
          title="Terminer le match"
          variant="danger"
          size="sm"
          loading={actionLoading}
          onPress={onFinishMatch}
          disabled={isFinished}
          style={styles.finishBottomBtn}
        />
      </View>

      {/* ─── Modal 1: Player Selection for Action ─────────────────────────────────── */}
      <Modal
        visible={pendingAction !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingAction(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>ATTRIBUER L'ACTION</Text>
            <Text style={styles.modalSubtitle}>
              Action : <Text style={styles.bold}>{pendingAction?.label}</Text>
            </Text>

            <ScrollView style={styles.playerSelectionList}>
              <TouchableOpacity
                style={styles.playerSelectOption}
                onPress={() => handleSelectPlayer(undefined)}
              >
                <Text style={styles.playerSelectName}>Équipe générale (sans joueur spécifié)</Text>
              </TouchableOpacity>

              {activeModalPlayers.map((player) => (
                <TouchableOpacity
                  key={player.id}
                  style={styles.playerSelectOption}
                  onPress={() => handleSelectPlayer(player.id)}
                >
                  <View style={styles.playerOptionLeft}>
                    <View style={styles.playerMiniJersey}>
                      <Text style={styles.playerMiniJerseyText}>#{player.jersey_number ?? '?'}</Text>
                    </View>
                    <Text style={styles.playerSelectName}>{player.username}</Text>
                  </View>
                  {player.is_on_court && (
                    <Text style={styles.onCourtTag}>SUR LE TERRAIN</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Button
              title="Fermer"
              variant="secondary"
              size="sm"
              onPress={() => setPendingAction(null)}
              style={{ marginTop: spacing.md }}
            />
          </View>
        </View>
      </Modal>

      {/* ─── Modal 2: Substitution Modal ─────────────────────────────────────────── */}
      <Modal
        visible={subModalSide !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSubModalSide(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>EFFECTUER UN REMPLACEMENT</Text>
            <Text style={styles.modalSubtitle}>
              Équipe : {subModalSide === 'team_a' ? teamAName : teamBName}
            </Text>

            {/* Select player exiting (sub out) */}
            <Text style={styles.subSectionLabel}>1. JOUEUR QUI SORT DU TERRAIN :</Text>
            <ScrollView style={{ maxHeight: 110 }}>
              {subPlayers.map((p) => (
                <TouchableOpacity
                  key={`out_${p.id}`}
                  style={[
                    styles.subPickBtn,
                    subOutPlayerId === p.id && styles.subPickBtnActive
                  ]}
                  onPress={() => setSubOutPlayerId(p.id)}
                >
                  <Text style={[styles.subPickText, subOutPlayerId === p.id && styles.subPickTextActive]}>
                    #{p.jersey_number ?? '?'} {p.username} {p.is_on_court ? '(Terrain)' : '(Banc)'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Select player entering (sub in) */}
            <Text style={[styles.subSectionLabel, { marginTop: spacing.sm }]}>2. JOUEUR QUI ENTRE EN JEU :</Text>
            <ScrollView style={{ maxHeight: 110 }}>
              {subPlayers.map((p) => (
                <TouchableOpacity
                  key={`in_${p.id}`}
                  style={[
                    styles.subPickBtn,
                    subInPlayerId === p.id && styles.subPickBtnActive
                  ]}
                  onPress={() => setSubInPlayerId(p.id)}
                >
                  <Text style={[styles.subPickText, subInPlayerId === p.id && styles.subPickTextActive]}>
                    #{p.jersey_number ?? '?'} {p.username} {!p.is_on_court ? '(Banc)' : '(Terrain)'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
              <Button
                title="Annuler"
                variant="secondary"
                size="sm"
                onPress={() => setSubModalSide(null)}
                style={{ flex: 1 }}
              />
              <Button
                title="Valider"
                variant="primary"
                size="sm"
                disabled={!subOutPlayerId || !subInPlayerId}
                onPress={handleConfirmSubstitution}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0D1B2A',
    borderRadius: 18,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...shadows.card,
  },
  controlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    marginBottom: spacing.md,
  },
  controlHeaderLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 2,
  },
  headerButtonsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  headerBtn: {
    paddingHorizontal: 10,
  },

  scoreActionGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  teamActionCard: {
    flex: 1,
    backgroundColor: '#07111E',
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  teamActionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    gap: 6,
  },
  miniDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  teamActionTitle: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },

  actionBlock: {
    padding: spacing.xs,
  },
  scoreBtnBig: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreBtnBigText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  buttonRow: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 5,
  },
  scoreBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  scoreBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '900',
  },

  missedBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  missedBtnText: {
    color: '#94A3B8',
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.5,
  },

  extraBtnGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  extraPill: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '47%',
    flexGrow: 1,
  },
  extraPillText: {
    color: '#E2E8F0',
    fontSize: 10.5,
    fontWeight: '700',
  },

  bottomControlRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  undoBottomBtn: {
    flex: 1,
  },
  finishBottomBtn: {
    flex: 1,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    backgroundColor: '#0D1B2A',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: spacing.lg,
    width: '100%',
    maxWidth: 380,
    ...shadows.modal,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#F8FAFC',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.md,
  },
  bold: {
    fontWeight: '800',
    color: '#38BDF8',
  },
  playerSelectionList: {
    maxHeight: 260,
  },
  playerSelectOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  playerOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  playerMiniJersey: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerMiniJerseyText: {
    fontWeight: '900',
    color: '#38BDF8',
    fontSize: 10,
  },
  playerSelectName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  onCourtTag: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '800',
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  subSectionLabel: {
    fontWeight: '800',
    color: '#94A3B8',
    marginBottom: 6,
    fontSize: 10.5,
    letterSpacing: 0.5,
  },
  subPickBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  subPickBtnActive: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56,189,248,0.15)',
  },
  subPickText: {
    fontSize: 11.5,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  subPickTextActive: {
    color: '#38BDF8',
    fontWeight: '800',
  },
});
