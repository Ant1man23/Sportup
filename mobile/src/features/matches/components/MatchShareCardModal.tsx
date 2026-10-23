import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Share,
  Platform,
  Linking,
  Image,
} from 'react-native';
import {
  X,
  Share2,
  Trophy,
  Flame,
  Award,
  ShieldCheck,
  Calendar,
  MapPin,
  Sparkles,
  MessageCircle,
} from 'lucide-react-native';
import { colors } from '../../../theme/colors';
import { radius, shadows, spacing } from '../../../theme/spacing';
import { Match, MatchStatisticsResponse, PlayerBoxscore } from '../api/matchesApi';

interface MatchShareCardModalProps {
  visible: boolean;
  match: Match;
  statistics?: MatchStatisticsResponse | null;
  onClose: () => void;
}

export const MatchShareCardModal: React.FC<MatchShareCardModalProps> = ({
  visible,
  match,
  statistics,
  onClose,
}) => {
  const sportSlug = match.session?.sport?.slug || 'basketball';
  const sportName = match.session?.sport?.name || 'Sport';
  const isSetSport = sportSlug === 'volleyball' || sportSlug === 'table-tennis';

  const teamAName = match.team_a_name || match.session?.team_a?.name || 'Équipe A';
  const teamBName = match.team_b_name || match.session?.team_b?.name || 'Équipe B';
  const teamAColor = match.team_a_color || '#1456D9';
  const teamBColor = match.team_b_color || '#F28B2E';

  const scoreA = match.score_team_a;
  const scoreB = match.score_team_b;
  const setsWonA = match.sets_won_a ?? 0;
  const setsWonB = match.sets_won_b ?? 0;

  const isTeamAWinner = isSetSport ? setsWonA > setsWonB : scoreA > scoreB;
  const isTeamBWinner = isSetSport ? setsWonB > setsWonA : scoreB > scoreA;
  const isDraw = !isSetSport && scoreA === scoreB;

  const allPlayers: PlayerBoxscore[] = statistics?.players?.all || [];

  // MVP: top player from winning team (or overall if draw)
  const winningSide = isTeamAWinner ? 'team_a' : isTeamBWinner ? 'team_b' : null;
  const eligibleMvpPlayers = winningSide
    ? allPlayers.filter((p) => p.team_side === winningSide)
    : allPlayers;

  const mvpPlayer = [...eligibleMvpPlayers].sort((a, b) => {
    const scorePlayerA = (a.points || a.goals || 0) * 1.5 + (a.assists || 0) + (a.rebounds_total || 0);
    const scorePlayerB = (b.points || b.goals || 0) * 1.5 + (b.assists || 0) + (b.rebounds_total || 0);
    return scorePlayerB - scorePlayerA;
  })[0];

  // Top scorer overall
  const topScorer = [...allPlayers].sort(
    (a, b) => (b.points || b.goals || 0) - (a.points || a.goals || 0)
  )[0];

  // Best assister
  const topAssister = [...allPlayers].sort(
    (a, b) => (b.assists || 0) - (a.assists || 0)
  )[0];

  const buildShareText = (): string => {
    const winnerText = isDraw
      ? '🤝 Match Nul !'
      : `🏆 Victoire de ${isTeamAWinner ? teamAName : teamBName} !`;

    const scoreText = isSetSport
      ? `${setsWonA} - ${setsWonB} en sets`
      : `${scoreA} - ${scoreB}`;

    let breakdownText = '';
    if (isSetSport && match.set_scores && match.set_scores.length > 0) {
      breakdownText = `Sets: ${match.set_scores.map((s) => `S${s.setNumber}: ${s.scoreA}-${s.scoreB}`).join(' | ')}`;
    } else if (statistics?.period_scores && statistics.period_scores.length > 0) {
      breakdownText = `Périodes: ${statistics.period_scores.map((p) => `Q${p.period}: ${p.team_a}-${p.team_b}`).join(' | ')}`;
    }

    const sportEmoji = sportSlug.includes('foot')
      ? '⚽'
      : sportSlug.includes('basket')
      ? '🏀'
      : sportSlug.includes('volley')
      ? '🏐'
      : '🏓';

    const scorerUnit = sportSlug.includes('foot') ? 'buts' : 'pts';

    const mvpText = mvpPlayer
      ? `👑 MVP: ${mvpPlayer.username} (${mvpPlayer.points || mvpPlayer.goals || 0} ${scorerUnit})`
      : '';

    const scorerText =
      topScorer && topScorer.user_id !== mvpPlayer?.user_id
        ? `🔥 Meilleur Marqueur: ${topScorer.username} (${topScorer.points || topScorer.goals || 0} ${scorerUnit})`
        : '';

    const assisterText =
      topAssister && (topAssister.assists || 0) > 0
        ? `🎯 Passes décsives: ${topAssister.username} (${topAssister.assists} p.d.)`
        : '';

    const locationText = match.session?.location_name || match.session?.city || 'Madagascar';

    return [
      `${sportEmoji} SPORTUP MATCH SUMMARY 🇲🇬`,
      `${sportName.toUpperCase()} • ${locationText}`,
      ``,
      `${teamAName} [ ${scoreText} ] ${teamBName}`,
      winnerText,
      breakdownText ? `${breakdownText}` : '',
      mvpText ? `${mvpText}` : '',
      scorerText ? `${scorerText}` : '',
      assisterText ? `${assisterText}` : '',
      ``,
      `Retrouvez toutes les statistiques et les prochains matchs sur SportUp !`,
      `👉 https://sportup.app`,
      `#SportUpMG #${sportSlug}`,
    ].filter(Boolean).join('\n');
  };

  const handleWhatsAppShare = async () => {
    const text = buildShareText();
    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(text)}`;
    try {
      const supported = await Linking.canOpenURL(whatsappUrl);
      if (supported) {
        await Linking.openURL(whatsappUrl);
      } else {
        await Share.share({
          title: `Résultat Match: ${teamAName} vs ${teamBName}`,
          message: text,
        });
      }
    } catch {
      await Share.share({
        title: `Résultat Match: ${teamAName} vs ${teamBName}`,
        message: text,
      });
    }
  };

  const handleShare = async () => {
    try {
      const shareContent = buildShareText();
      await Share.share({
        title: `Résultat Match: ${teamAName} vs ${teamBName}`,
        message: shareContent,
      });
    } catch (e) {
      console.warn('Share error:', e);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.cardContainer}>
          {/* Header Bar */}
          <View style={styles.topBar}>
            <View style={styles.badgeLiveWrap}>
              <Sparkles size={14} color="#F59E0B" />
              <Text style={styles.badgeLiveText}>CARTE DE MATCH OFFICIELLE</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* The Visual Story Card (Designed for Instagram/WhatsApp Story) */}
            <View style={styles.storyCard}>
              {/* Card Header */}
              <View style={styles.storyCardHeader}>
                <View style={styles.sportBadge}>
                  <Text style={styles.sportBadgeText}>{sportName.toUpperCase()}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Calendar size={11} color="#94A3B8" style={{ marginRight: 4 }} />
                  <Text style={styles.metaText}>
                    {new Date(match.finished_at || Date.now()).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                  {match.session?.location_name && (
                    <>
                      <Text style={styles.metaDot}>•</Text>
                      <MapPin size={11} color="#94A3B8" style={{ marginRight: 3 }} />
                      <Text style={styles.metaText} numberOfLines={1}>
                        {match.session.location_name}
                      </Text>
                    </>
                  )}
                </View>
              </View>

              {/* Main Scoreboard Display */}
              <View style={styles.scoreRow}>
                {/* Team A */}
                <View style={styles.teamColumn}>
                  {match.team_a_logo ? (
                    <Image
                      source={{ uri: match.team_a_logo }}
                      style={styles.teamLogoImg}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.teamAvatar, { backgroundColor: teamAColor }]}>
                      <Text style={styles.teamAvatarText}>
                        {teamAName.substring(0, 2).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.teamName} numberOfLines={1}>{teamAName}</Text>
                  {isTeamAWinner && (
                    <View style={styles.winnerPill}>
                      <Trophy size={11} color="#F59E0B" style={{ marginRight: 3 }} />
                      <Text style={styles.winnerText}>VAINQUEUR</Text>
                    </View>
                  )}
                </View>

                {/* Score Center */}
                <View style={styles.scoreCenter}>
                  {isSetSport ? (
                    <>
                      <View style={styles.mainScoreRow}>
                        <Text style={[styles.mainScoreNumber, isTeamAWinner && styles.winningScore]}>
                          {setsWonA}
                        </Text>
                        <Text style={styles.mainScoreDivider}>-</Text>
                        <Text style={[styles.mainScoreNumber, isTeamBWinner && styles.winningScore]}>
                          {setsWonB}
                        </Text>
                      </View>
                      <Text style={styles.setsIndicator}>SETS GAGNANTS</Text>
                    </>
                  ) : (
                    <>
                      <View style={styles.mainScoreRow}>
                        <Text style={[styles.mainScoreNumber, isTeamAWinner && styles.winningScore]}>
                          {scoreA}
                        </Text>
                        <Text style={styles.mainScoreDivider}>-</Text>
                        <Text style={[styles.mainScoreNumber, isTeamBWinner && styles.winningScore]}>
                          {scoreB}
                        </Text>
                      </View>
                      <Text style={styles.setsIndicator}>SCORE FINAL</Text>
                    </>
                  )}
                </View>

                {/* Team B */}
                <View style={styles.teamColumn}>
                  {match.team_b_logo ? (
                    <Image
                      source={{ uri: match.team_b_logo }}
                      style={styles.teamLogoImg}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.teamAvatar, { backgroundColor: teamBColor }]}>
                      <Text style={styles.teamAvatarText}>
                        {teamBName.substring(0, 2).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.teamName} numberOfLines={1}>{teamBName}</Text>
                  {isTeamBWinner && (
                    <View style={styles.winnerPill}>
                      <Trophy size={11} color="#F59E0B" style={{ marginRight: 3 }} />
                      <Text style={styles.winnerText}>VAINQUEUR</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Set Scores or Quarter Breakdown */}
              {isSetSport && match.set_scores && match.set_scores.length > 0 ? (
                <View style={styles.breakdownBox}>
                  <Text style={styles.breakdownTitle}>DÉTAIL DES SETS</Text>
                  <View style={styles.setsPillsRow}>
                    {match.set_scores.map((set) => (
                      <View key={`set_${set.setNumber}`} style={styles.setPill}>
                        <Text style={styles.setPillLabel}>S{set.setNumber}</Text>
                        <Text style={styles.setPillScore}>
                          <Text style={set.scoreA > set.scoreB ? styles.winnerSubScore : undefined}>{set.scoreA}</Text>
                          {' - '}
                          <Text style={set.scoreB > set.scoreA ? styles.winnerSubScore : undefined}>{set.scoreB}</Text>
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : statistics?.period_scores && statistics.period_scores.length > 0 ? (
                <View style={styles.breakdownBox}>
                  <Text style={styles.breakdownTitle}>PAR QUART-TEMPS</Text>
                  <View style={styles.setsPillsRow}>
                    {statistics.period_scores.map((q) => (
                      <View key={`qt_${q.period}`} style={styles.setPill}>
                        <Text style={styles.setPillLabel}>Q{q.period}</Text>
                        <Text style={styles.setPillScore}>
                          {q.team_a} - {q.team_b}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {/* Highlights Section (MVP & Top Scorer) */}
              <View style={styles.highlightsContainer}>
                {mvpPlayer && (
                  <View style={styles.highlightCard}>
                    <View style={[styles.highlightIcon, { backgroundColor: '#FEF3C7' }]}>
                      <Award size={18} color="#D97706" />
                    </View>
                    <View style={styles.highlightTextWrap}>
                      <Text style={styles.highlightLabel}>MVP DU MATCH</Text>
                      <Text style={styles.highlightName} numberOfLines={1}>
                        #{mvpPlayer.jersey_number ?? '?'} {mvpPlayer.username}
                      </Text>
                      <Text style={styles.highlightStat}>
                        {mvpPlayer.points || mvpPlayer.goals || 0} {sportSlug.includes('foot') ? 'buts' : 'pts'} • {mvpPlayer.assists || 0} p.d.
                      </Text>
                    </View>
                  </View>
                )}

                {topScorer && (
                  <View style={styles.highlightCard}>
                    <View style={[styles.highlightIcon, { backgroundColor: '#FEE2E2' }]}>
                      <Flame size={18} color="#DC2626" />
                    </View>
                    <View style={styles.highlightTextWrap}>
                      <Text style={styles.highlightLabel}>MEILLEUR MARQUEUR</Text>
                      <Text style={styles.highlightName} numberOfLines={1}>
                        #{topScorer.jersey_number ?? '?'} {topScorer.username}
                      </Text>
                      <Text style={styles.highlightStat}>
                        {topScorer.points || topScorer.goals || 0} {sportSlug.includes('foot') ? 'buts marqués' : 'points inscrits'}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Card Footer Branding */}
              <View style={styles.storyFooter}>
                <View style={styles.brandingRow}>
                  <ShieldCheck size={14} color="#10B981" />
                  <Text style={styles.brandingText}>SportUp Madagascar 🇲🇬</Text>
                </View>
                <Text style={styles.brandingSub}>#SportUpMG • sportup.app</Text>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons: 1-Clic WhatsApp & Story Instagram */}
          <View style={styles.modalActionsRow}>
            <TouchableOpacity
              style={styles.whatsappBtn}
              onPress={handleWhatsAppShare}
              activeOpacity={0.85}
            >
              <MessageCircle size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.whatsappBtnText}>Partager sur WhatsApp 🇲🇬</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.storyShareBtn}
              onPress={handleShare}
              activeOpacity={0.85}
            >
              <Share2 size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.storyShareBtnText}>Story Instagram / Réseaux</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'flex-end',
  },
  cardContainer: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 36 : spacing.lg,
    maxHeight: '90%',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  badgeLiveWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    gap: 6,
  },
  badgeLiveText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  closeBtn: {
    padding: 6,
    borderRadius: radius.pill,
    backgroundColor: '#1E293B',
  },
  scrollContent: {
    paddingBottom: spacing.md,
  },
  storyCard: {
    backgroundColor: '#1E293B',
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#334155',
    ...shadows.floating,
  },
  storyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingBottom: spacing.sm,
    marginBottom: spacing.md,
  },
  sportBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  sportBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '65%',
  },
  metaText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  metaDot: {
    color: '#64748B',
    marginHorizontal: 4,
    fontSize: 10,
  },

  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  teamColumn: {
    flex: 1,
    alignItems: 'center',
  },
  teamLogoImg: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: '#334155',
    marginBottom: 6,
    ...shadows.card,
  },
  teamAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    ...shadows.card,
  },
  teamAvatarText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 18,
  },
  teamName: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  winnerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    marginTop: 4,
  },
  winnerText: {
    color: '#F59E0B',
    fontSize: 9,
    fontWeight: '800',
  },
  scoreCenter: {
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  mainScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mainScoreNumber: {
    fontSize: 38,
    fontWeight: '900',
    color: '#CBD5E1',
    letterSpacing: 1,
  },
  winningScore: {
    color: '#FFFFFF',
  },
  mainScoreDivider: {
    fontSize: 28,
    color: '#64748B',
    marginHorizontal: 8,
    fontWeight: '700',
  },
  setsIndicator: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 2,
  },

  breakdownBox: {
    backgroundColor: '#0F172A',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.md,
    alignItems: 'center',
  },
  breakdownTitle: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  setsPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  setPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    gap: 4,
  },
  setPillLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
  },
  setPillScore: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '800',
  },
  winnerSubScore: {
    color: '#10B981',
    fontWeight: '900',
  },

  highlightsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  highlightCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: '#334155',
  },
  highlightIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  highlightTextWrap: {
    flex: 1,
  },
  highlightLabel: {
    color: '#94A3B8',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  highlightName: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '800',
  },
  highlightStat: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '600',
  },

  storyFooter: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  brandingText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
  },
  brandingSub: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },

  modalActionsRow: {
    marginTop: spacing.md,
    gap: 10,
  },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 14,
    borderRadius: radius.pill,
    ...shadows.card,
  },
  whatsappBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  storyShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.pill,
    ...shadows.card,
  },
  storyShareBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
