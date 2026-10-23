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
} from 'react-native';
import {
  UserCheck,
  Flame,
  Calendar,
  CheckCheck,
  Bell,
  Trash2,
  ChevronLeft,
  Users,
  Check,
  X,
  MessageCircle,
  Trophy,
  Swords,
  ChevronRight,
} from 'lucide-react-native';
import { colors } from '../../../theme/colors';
import { radius, shadows, spacing } from '../../../theme/spacing';
import { notificationsApi, NotificationItem } from '../api/notificationsApi';
import { teamsApi } from '../../teams/api/teamsApi';
import { sessionsApi } from '../../sessions/api/sessionsApi';

interface NotificationsScreenProps {
  onNavigateBack?: () => void;
  onSelectSession?: (sessionId: number) => void;
  onSelectTeam?: (teamId: number) => void;
  onNavigateChat?: (sessionId?: number, teamId?: number, title?: string) => void;
  onNavigateTournaments?: () => void;
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  onNavigateBack,
  onSelectSession,
  onSelectTeam,
  onNavigateChat,
  onNavigateTournaments,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [actionFeedback, setActionFeedback] = useState<Record<number, string>>({});

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationsApi.getNotifications();
      setNotifications(res.data);
      setUnreadCount(res.unread_count);
    } catch {
      // Fallback: keep empty state if API unavailable
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const markAllAsRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // Ignore
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await notificationsApi.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (unreadCount > 0) setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // Ignore
    }
  };

  // ── Actions Interactives ──────────────────────────────────────────────────

  const handleAcceptTeamInvite = async (n: NotificationItem) => {
    setActionLoadingId(n.id);
    try {
      let invId = n.data?.invitation_id ? Number(n.data.invitation_id) : null;
      if (!invId) {
        const list = await teamsApi.getMyInvitations();
        const found = list.find((i: any) => String(i.team_id) === String(n.data?.team_id) || i.team?.name === n.title);
        invId = found?.id ?? null;
      }

      if (invId) {
        await teamsApi.respondInvitation(invId, 'accept');
        setActionFeedback((prev) => ({
          ...prev,
          [n.id]: 'Invitation acceptée ! Vous faites partie de l\'équipe.',
        }));
        setNotifications((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, is_read: true } : item))
        );
      } else {
        setActionFeedback((prev) => ({
          ...prev,
          [n.id]: 'Invitation confirmée.',
        }));
      }
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message || err.message || 'Impossible d\'accepter l\'invitation.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeclineTeamInvite = async (n: NotificationItem) => {
    setActionLoadingId(n.id);
    try {
      let invId = n.data?.invitation_id ? Number(n.data.invitation_id) : null;
      if (!invId) {
        const list = await teamsApi.getMyInvitations();
        const found = list.find((i: any) => String(i.team_id) === String(n.data?.team_id));
        invId = found?.id ?? null;
      }
      if (invId) {
        await teamsApi.respondInvitation(invId, 'decline');
      }
      await notificationsApi.deleteNotification(n.id);
      setNotifications((prev) => prev.filter((item) => item.id !== n.id));
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message || err.message || 'Impossible de refuser l\'invitation.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleJoinSession = async (n: NotificationItem) => {
    const sessionId = Number(n.data?.session_id);
    if (!sessionId) return;
    setActionLoadingId(n.id);
    try {
      await sessionsApi.joinSession(sessionId);
      setActionFeedback((prev) => ({
        ...prev,
        [n.id]: 'Session rejointe avec succès ! À vos baskets.',
      }));
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, is_read: true } : item))
      );
    } catch (err: any) {
      Alert.alert('Session', err?.response?.data?.message || err.message || 'Impossible de rejoindre la session.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const renderIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'team_invitation':
        return (
          <View style={[styles.iconBox, { backgroundColor: '#EDE9FE' }]}>
            <Users size={16} color="#7C3AED" strokeWidth={2.2} />
          </View>
        );
      case 'session_invitation':
        return (
          <View style={[styles.iconBox, { backgroundColor: colors.primarySoft }]}>
            <Swords size={16} color={colors.primary} strokeWidth={2.2} />
          </View>
        );
      case 'new_message':
        return (
          <View style={[styles.iconBox, { backgroundColor: '#E0F2FE' }]}>
            <MessageCircle size={16} color="#0284C7" strokeWidth={2.2} />
          </View>
        );
      case 'tournament_match_scheduled':
        return (
          <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
            <Trophy size={16} color="#D97706" strokeWidth={2.2} />
          </View>
        );
      case 'participant':
        return (
          <View style={[styles.iconBox, { backgroundColor: colors.primarySoft }]}>
            <UserCheck size={16} color={colors.primary} strokeWidth={2.2} />
          </View>
        );
      case 'spots':
        return (
          <View style={[styles.iconBox, { backgroundColor: colors.warningSoft }]}>
            <Flame size={16} color={colors.warning} strokeWidth={2.2} />
          </View>
        );
      case 'match_start':
        return (
          <View style={[styles.iconBox, { backgroundColor: colors.successSoft }]}>
            <Bell size={16} color={colors.success} strokeWidth={2.2} />
          </View>
        );
      case 'reminder':
      default:
        return (
          <View style={[styles.iconBox, { backgroundColor: colors.successSoft }]}>
            <Calendar size={16} color={colors.success} strokeWidth={2.2} />
          </View>
        );
    }
  };

  const renderActionButtons = (n: NotificationItem) => {
    const feedback = actionFeedback[n.id];
    const isLoading = actionLoadingId === n.id;
    const teamId = n.data?.team_id ? Number(n.data.team_id) : undefined;
    const sessionId = n.data?.session_id ? Number(n.data.session_id) : undefined;

    if (feedback) {
      return (
        <View style={styles.feedbackContainer}>
          <View style={styles.feedbackBadge}>
            <Check size={14} color="#16A34A" strokeWidth={2.6} />
            <Text style={styles.feedbackText}>{feedback}</Text>
          </View>
          {sessionId && onSelectSession && (
            <TouchableOpacity
              style={styles.actionViewBtn}
              onPress={() => onSelectSession(sessionId)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionViewText}>Voir la session</Text>
              <ChevronRight size={14} color={colors.primary} />
            </TouchableOpacity>
          )}
          {teamId && onSelectTeam && (
            <TouchableOpacity
              style={styles.actionViewBtn}
              onPress={() => onSelectTeam(teamId)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionViewText}>Voir l'équipe</Text>
              <ChevronRight size={14} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      );
    }

    if (n.type === 'team_invitation') {
      return (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.acceptBtn]}
            onPress={() => handleAcceptTeamInvite(n)}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Check size={14} color="#FFFFFF" strokeWidth={2.6} />
                <Text style={styles.acceptBtnText}>Accepter</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.declineBtn]}
            onPress={() => handleDeclineTeamInvite(n)}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            <X size={14} color={colors.muted} strokeWidth={2.4} />
            <Text style={styles.declineBtnText}>Décliner</Text>
          </TouchableOpacity>

          {teamId && onSelectTeam && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.viewDetailsBtn]}
              onPress={() => onSelectTeam(teamId)}
              activeOpacity={0.85}
            >
              <Text style={styles.viewDetailsText}>Détails</Text>
              <ChevronRight size={13} color={colors.navy} />
            </TouchableOpacity>
          )}
        </View>
      );
    }

    if (n.type === 'session_invitation' && sessionId) {
      return (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.acceptBtn]}
            onPress={() => handleJoinSession(n)}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Check size={14} color="#FFFFFF" strokeWidth={2.6} />
                <Text style={styles.acceptBtnText}>Rejoindre</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.declineBtn]}
            onPress={() => handleDelete(n.id)}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            <X size={14} color={colors.muted} strokeWidth={2.4} />
            <Text style={styles.declineBtnText}>Ignorer</Text>
          </TouchableOpacity>

          {onSelectSession && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.viewDetailsBtn]}
              onPress={() => onSelectSession(sessionId)}
              activeOpacity={0.85}
            >
              <Text style={styles.viewDetailsText}>Voir le terrain</Text>
              <ChevronRight size={13} color={colors.navy} />
            </TouchableOpacity>
          )}
        </View>
      );
    }

    if (n.type === 'new_message' && onNavigateChat) {
      return (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.chatActionBtn]}
            onPress={() => onNavigateChat(sessionId, teamId, n.title)}
            activeOpacity={0.85}
          >
            <MessageCircle size={14} color="#0284C7" strokeWidth={2.4} />
            <Text style={styles.chatActionText}>Ouvrir la discussion</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (n.type === 'tournament_match_scheduled' && onNavigateTournaments) {
      return (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.tournamentActionBtn]}
            onPress={onNavigateTournaments}
            activeOpacity={0.85}
          >
            <Trophy size={14} color="#D97706" strokeWidth={2.4} />
            <Text style={styles.tournamentActionText}>Consulter le tournoi</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
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
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {onNavigateBack && (
            <TouchableOpacity
              onPress={onNavigateBack}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <ChevronLeft size={20} color={colors.navy} strokeWidth={2.4} />
              <Text style={styles.backButtonText}>Retour</Text>
            </TouchableOpacity>
          )}
          <View>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.subtitle}>
              {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Activité de tes matchs'}
            </Text>
          </View>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={markAllAsRead}
            style={styles.markReadBtn}
            activeOpacity={0.8}
          >
            <CheckCheck size={14} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={styles.markReadText}>Tout lire</Text>
          </TouchableOpacity>
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyBox}>
          <View style={styles.emptyIconCircle}>
            <Bell size={28} color={colors.muted} strokeWidth={1.8} />
          </View>
          <Text style={styles.emptyTitle}>Aucune notification</Text>
          <Text style={styles.emptySubtitle}>
            Rejoins des sessions pour recevoir des alertes et des invitations en temps réel.
          </Text>
        </View>
      ) : (
        notifications.map((n) => (
          <View key={n.id} style={[styles.card, !n.is_read && styles.cardUnread]}>
            <View style={styles.cardTop}>
              {renderIcon(n.type)}
              <View style={styles.cardHeaderInfo}>
                <View style={styles.titleRow}>
                  <Text style={styles.notificationTitle}>{n.title}</Text>
                  <View style={styles.rightMeta}>
                    {!n.is_read && <View style={styles.unreadDot} />}
                    <TouchableOpacity onPress={() => handleDelete(n.id)} style={styles.deleteBtn}>
                      <Trash2 size={13} color={colors.muted} />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.timeAgo}>{n.time_ago}</Text>
              </View>
            </View>

            <Text style={styles.notificationBody}>{n.body}</Text>

            {/* Interactive Actions for invitations & chats */}
            {renderActionButtons(n)}
          </View>
        ))
      )}
    </ScrollView>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
    backgroundColor: '#EEF2F6',
    borderRadius: radius.pill,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
    marginLeft: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.navy,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  markReadText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md + 2,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  cardUnread: {
    borderColor: `${colors.primary}40`,
    backgroundColor: '#FAFCFF',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.navy,
    flex: 1,
  },
  rightMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  deleteBtn: {
    padding: 3,
  },
  timeAgo: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },
  notificationBody: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
    marginTop: 4,
    paddingLeft: 34 + spacing.sm,
  },
  // ── Action Buttons ────────────────────────────────────────────────────────
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    marginLeft: 34 + spacing.sm,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  acceptBtn: {
    backgroundColor: colors.primary,
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  declineBtn: {
    backgroundColor: '#F1F5F9',
  },
  declineBtnText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  viewDetailsBtn: {
    backgroundColor: '#EEF2F6',
  },
  viewDetailsText: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: '700',
  },
  chatActionBtn: {
    backgroundColor: '#E0F2FE',
  },
  chatActionText: {
    color: '#0284C7',
    fontSize: 12,
    fontWeight: '700',
  },
  tournamentActionBtn: {
    backgroundColor: '#FEF3C7',
  },
  tournamentActionText: {
    color: '#B45309',
    fontSize: 12,
    fontWeight: '700',
  },
  feedbackContainer: {
    marginTop: 10,
    marginLeft: 34 + spacing.sm,
    gap: 6,
  },
  feedbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
  },
  actionViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  actionViewText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  // ── Empty State ───────────────────────────────────────────────────────────
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: spacing.xl,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.navy,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 19,
  },
});
