import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Share,
  Linking,
} from 'react-native';
import { MessageSquare, MessageCircle, Star, Calendar, MapPin, Clock, UserPlus, ChevronLeft, Share2 } from 'lucide-react-native';
import { colors } from '../../../theme/colors';
import { radius, shadows, spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';
import { Button } from '../../../components/Button';
import { Avatar } from '../../../components/Avatar';
import { ErrorBanner } from '../../../components/ErrorBanner';
import { GoogleMapsView } from '../../../components/GoogleMapsView';
import { InviteModal } from '../../../components/InviteModal';
import { Session, sessionsApi } from '../api/sessionsApi';
import { matchesApi } from '../../matches/api/matchesApi';
import { useAuthStore } from '../../../store/useAuthStore';

interface SessionDetailsScreenProps {
  sessionId: number;
  onNavigateBack?: () => void;
  onNavigateMatch?: (matchId: number) => void;
  onNavigateChat?: (sessionId: number, title?: string) => void;
}

export const SessionDetailsScreen: React.FC<SessionDetailsScreenProps> = ({
  sessionId,
  onNavigateBack,
  onNavigateMatch,
  onNavigateChat,
}) => {
  const currentUser = useAuthStore((state) => state.user);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const fetchSession = async () => {
    try {
      setLoading(true);
      const data = await sessionsApi.getSessionDetails(sessionId);
      setSession(data);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger le détail de la session.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [sessionId]);

  const handleShareSession = async () => {
    if (!session) return;
    try {
      const remaining = session.max_participants - session.current_participants;
      const message = `🏆 Rejoins notre match de ${session.sport.name} (${session.format || 'Partie libre'}) sur SportUp !\n📅 Date : ${session.session_date} à ${session.start_time.substring(0, 5)}\n📍 Lieu : ${session.address || session.city || 'Antananarivo'}\n👥 Places restantes : ${remaining > 0 ? remaining : 'Complet'}\n\nRejoins la session directement sur l'application SportUp : https://sportup.mg/s/${session.id}`;
      await Share.share({
        message,
        title: `Match ${session.sport.name} sur SportUp`,
      });
    } catch {
      // User cancelled or error
    }
  };

  const handleShareWhatsApp = async () => {
    if (!session) return;
    const remaining = session.max_participants - session.current_participants;
    const spotsText = remaining > 0 ? `Il reste ${remaining} place${remaining > 1 ? 's' : ''} !` : 'Match complet !';
    const isFoot = session.sport.slug?.includes('foot');
    const isBasket = session.sport.slug?.includes('basket');
    const isVolley = session.sport.slug?.includes('volley');
    const sportEmoji = isFoot ? '⚽' : isBasket ? '🏀' : isVolley ? '🏐' : '🏆';

    const text = `${sportEmoji} *Match SportUp à ${session.city || 'Tana'} !*\nRejoins notre partie de *${session.sport.name}* (${session.format || 'Partie libre'}).\n\n📅 Date : *${session.session_date}* à *${session.start_time.substring(0, 5)}*\n📍 Lieu : *${session.address || session.city || 'Antananarivo'}*\n👥 Places : *${spotsText}*\n\n👉 *Rejoins la feuille de match sur SportUp :*\nhttps://sportup.mg/s/${session.id}`;

    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(text)}`;
    try {
      const supported = await Linking.canOpenURL(whatsappUrl);
      if (supported) {
        await Linking.openURL(whatsappUrl);
      } else {
        await Share.share({ message: text, title: `Match ${session.sport.name} sur SportUp` });
      }
    } catch {
      await Share.share({ message: text, title: `Match ${session.sport.name} sur SportUp` });
    }
  };

  const isJoined = session?.participants?.some((p) => p.id === currentUser?.id);
  const isOrganizer = session?.organizer.id === currentUser?.id;

  const handleToggleJoin = async () => {
    if (!session) return;
    setActionLoading(true);
    setError(null);
    try {
      if (isJoined) {
        const updated = await sessionsApi.leaveSession(session.id);
        setSession(updated);
      } else {
        const updated = await sessionsApi.joinSession(session.id);
        setSession(updated);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartMatch = async () => {
    if (!session) return;
    setActionLoading(true);
    setError(null);
    try {
      if (session.match?.id) {
        onNavigateMatch && onNavigateMatch(session.match.id);
      } else {
        const createdMatch = await matchesApi.startMatch(session.id);
        onNavigateMatch && onNavigateMatch(createdMatch.id);
      }
    } catch (err: any) {
      setError(err.message || 'Impossible de démarrer le match.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Session introuvable.</Text>
      </View>
    );
  }

  const spotsLeft = session.max_participants - session.current_participants;
  const isFootball = session.sport.slug === 'football';
  const sportColor = session.sport.color_hex || (isFootball ? colors.primary : '#FF7A29');

  return (
    <View style={styles.root}>
      {/* ── TOP NAV BAR ── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onNavigateBack}
          activeOpacity={0.8}
        >
          <ChevronLeft size={20} color={colors.navy} />
          <Text style={styles.backBtnText}>Retour</Text>
        </TouchableOpacity>

        <View style={styles.topActionsRow}>
          <TouchableOpacity
            style={styles.shareShortcutBtn}
            onPress={handleShareSession}
            activeOpacity={0.8}
          >
            <Share2 size={16} color={colors.navy} strokeWidth={2.2} />
          </TouchableOpacity>

          {onNavigateChat && (
            <TouchableOpacity
              style={styles.chatShortcutBtn}
              onPress={() => onNavigateChat(session.id, session.description || session.sport.name)}
              activeOpacity={0.85}
            >
              <MessageSquare size={16} color={colors.primary} />
              <Text style={styles.chatShortcutText}>Discussion</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {error && <ErrorBanner message={error} />}

        {/* ── HEADER CARD ── */}
        <View style={styles.mainCard}>
          <View style={styles.sportBadge}>
            <View style={[styles.sportDot, { backgroundColor: sportColor }]} />
            <Text style={[styles.sportBadgeText, { color: sportColor }]}>
              {session.sport.name.toUpperCase()} · {session.format || '5V5'}
            </Text>
          </View>

          <Text style={styles.title}>
            {session.description || `${session.sport.name} à ${session.city}`}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaBlock}>
              <View style={styles.metaLabelRow}>
                <Calendar size={12} color="rgba(255, 255, 255, 0.6)" style={{ marginRight: 4 }} />
                <Text style={styles.metaLabel}>Date & Heure</Text>
              </View>
              <Text style={styles.metaValue}>{session.session_date}</Text>
              <View style={styles.metaSubRow}>
                <Clock size={11} color="rgba(255, 255, 255, 0.6)" style={{ marginRight: 3 }} />
                <Text style={styles.metaSub}>{session.start_time.substring(0, 5)}</Text>
              </View>
            </View>

            <View style={styles.metaBlock}>
              <View style={styles.metaLabelRow}>
                <MapPin size={12} color="rgba(255, 255, 255, 0.6)" style={{ marginRight: 4 }} />
                <Text style={styles.metaLabel}>Lieu</Text>
              </View>
              <Text style={styles.metaValue} numberOfLines={1}>{session.address || session.city}</Text>
              <Text style={styles.metaSub}>
                {session.city || 'Antananarivo'}{session.distance_km ? ` · ${session.distance_km.toFixed(1)} km` : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* ── BANNIÈRE PARTAGE VIRAL WHATSAPP ── */}
        <TouchableOpacity
          style={styles.whatsappCard}
          onPress={handleShareWhatsApp}
          activeOpacity={0.88}
        >
          <View style={styles.whatsappIconCircle}>
            <MessageCircle size={20} color="#FFFFFF" strokeWidth={2.4} />
          </View>
          <View style={styles.whatsappInfo}>
            <Text style={styles.whatsappTitle}>Inviter sur WhatsApp</Text>
            <Text style={styles.whatsappSub}>
              Envoie l'invitation sur ton groupe de sport en 1 clic
            </Text>
          </View>
          <View style={styles.whatsappBadge}>
            <Text style={styles.whatsappBadgeText}>Partager</Text>
          </View>
        </TouchableOpacity>

        {/* ── ORGANISÉ PAR ── */}
        <View style={styles.organizerCard}>
          <Avatar name={session.organizer.username} size={46} />
          <View style={styles.organizerInfo}>
            <Text style={styles.organizerLabel}>Organisé par</Text>
            <Text style={styles.organizerName}>{session.organizer.username}</Text>
            <View style={styles.organizerRatingRow}>
              <Star size={13} color="#F59E0B" fill="#F59E0B" style={{ marginRight: 4 }} />
              <Text style={styles.organizerRating}>4,9 · 28 matchs organisés</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.chatBubbleBtn}
            activeOpacity={0.8}
            onPress={() => onNavigateChat && onNavigateChat(session.id, session.description || session.sport.name)}
          >
            <MessageSquare size={18} color={colors.primary} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        {/* ── PARTICIPANTS ── */}
        <View style={styles.sectionCard}>
          <View style={styles.participantsHeader}>
            <Text style={styles.sectionTitle}>Participants</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.participantsCount}>
                {session.current_participants} / {session.max_participants}
              </Text>
              {spotsLeft > 0 && (
                <TouchableOpacity
                  style={styles.inviteBtn}
                  onPress={() => setShowInviteModal(true)}
                  activeOpacity={0.8}
                >
                  <UserPlus size={13} color="#FFFFFF" strokeWidth={2.4} style={{ marginRight: 3 }} />
                  <Text style={styles.inviteBtnText}>Inviter</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.participantsGrid}>
            {session.participants?.map((p) => {
              const initials = p.username.substring(0, 2).toUpperCase();
              return (
                <View key={p.id} style={styles.participantItem}>
                  <View style={styles.participantAvatar}>
                    <Text style={styles.participantAvatarText}>{initials}</Text>
                  </View>
                  <Text style={styles.participantName} numberOfLines={1}>{p.username}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.infoBadge}>
            <Text style={styles.infoBadgeText}>
              {spotsLeft > 0 ? `Encore ${spotsLeft} place${spotsLeft > 1 ? 's' : ''} disponible${spotsLeft > 1 ? 's' : ''}` : 'Session complète'}
            </Text>
            <Text style={styles.levelBadgeText}>
              Niveau {session.level || 'intermédiaire'}
            </Text>
          </View>
        </View>

        {/* ── LOCALISATION GOOGLE MAPS ── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Localisation du terrain</Text>
          <Text style={styles.addressText}>{session.address || session.city}</Text>
          <GoogleMapsView
            latitude={session.latitude}
            longitude={session.longitude}
            title={session.description || `${session.sport.name} - ${session.address || session.city}`}
            address={`${session.address || session.city}, Madagascar`}
            sportColor={sportColor}
            height={190}
            interactive={true}
          />
        </View>
      </ScrollView>

      {/* ── FIXED BOTTOM CTA ── */}
      <View style={styles.bottomBar}>
        {!isOrganizer ? (
          session.status === 'in_progress' || session.match ? (
            <View style={{ flexDirection: 'row', gap: spacing.sm, width: '100%' }}>
              <Button
                title="Suivre le match en direct"
                variant="accent"
                onPress={() => onNavigateMatch && onNavigateMatch(session.match?.id || session.id)}
                size="lg"
                style={{ flex: 1 }}
              />
              {isJoined && (
                <Button
                  title="Quitter"
                  variant="danger"
                  loading={actionLoading}
                  onPress={handleToggleJoin}
                  size="lg"
                  style={{ width: 100 }}
                />
              )}
            </View>
          ) : (
            <Button
              title={isJoined ? 'Quitter la session' : spotsLeft === 0 ? 'Session complète' : 'Rejoindre la session'}
              variant={isJoined ? 'danger' : spotsLeft === 0 ? 'secondary' : 'primary'}
              loading={actionLoading}
              disabled={spotsLeft === 0 && !isJoined}
              onPress={handleToggleJoin}
              size="lg"
              style={styles.fullBtn}
            />
          )
        ) : (
          <Button
            title={session.status === 'in_progress' || session.match ? 'Reprendre le match' : 'Démarrer le match'}
            variant="primary"
            loading={actionLoading}
            onPress={handleStartMatch}
            size="lg"
            style={styles.fullBtn}
          />
        )}
      </View>

      {/* ── MODAL INVITATION JOUEURS ── */}
      <InviteModal
        visible={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        targetType="session"
        targetId={session.id}
        targetTitle={session.description || `${session.sport.name} à ${session.city || 'Madagascar'}`}
        onSuccess={fetchSession}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#EEF2F6',
    borderRadius: radius.pill,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
    marginLeft: 2,
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  shareShortcutBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    gap: 6,
  },
  chatShortcutText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 100 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  errorText: { ...typography.body, color: colors.danger },
  mainCard: { backgroundColor: colors.navy, borderRadius: radius.xxl, padding: spacing.xl, marginBottom: spacing.lg, ...shadows.card },
  sportBadge: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  sportDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  sportBadgeText: { ...typography.overline, fontWeight: '800', fontSize: 11, letterSpacing: 0.8 },
  title: { ...typography.display, color: '#FFFFFF', fontSize: 24, fontWeight: '800', marginVertical: spacing.sm },
  metaRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  metaBlock: { backgroundColor: colors.navySoft, borderRadius: radius.md, padding: spacing.md, flex: 1 },
  metaLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  metaLabel: { ...typography.caption, color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  metaValue: { ...typography.bodyStrong, color: '#FFFFFF', fontSize: 14 },
  metaSubRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  metaSub: { ...typography.caption, color: 'rgba(255,255,255,0.7)' },
  organizerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border, ...shadows.card },
  organizerInfo: { flex: 1, marginLeft: spacing.md },
  organizerLabel: { ...typography.caption, color: colors.muted, fontSize: 11 },
  organizerName: { ...typography.h2, color: colors.text, fontSize: 16, fontWeight: '700' },
  organizerRatingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  organizerRating: { ...typography.caption, color: '#D97706', fontWeight: '700' },
  chatBubbleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  sectionCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border, ...shadows.card },
  participantsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { ...typography.h2, color: colors.text, fontSize: 17, fontWeight: '700' },
  participantsCount: { ...typography.bodyStrong, color: colors.primary, fontSize: 14, fontWeight: '700' },
  participantsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  participantItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, width: '48%', borderWidth: 1, borderColor: colors.border },
  participantAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  participantAvatarText: { ...typography.caption, fontWeight: '800', color: colors.primary, fontSize: 11 },
  participantName: { ...typography.bodyStrong, color: colors.text, fontSize: 13, flex: 1 },
  infoBadge: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.xs },
  infoBadgeText: { ...typography.bodyStrong, color: colors.text, fontSize: 12 },
  levelBadgeText: { ...typography.bodyStrong, color: colors.primary, fontWeight: '700', fontSize: 12 },
  addressText: { ...typography.caption, color: colors.muted, marginBottom: spacing.sm },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  fullBtn: { width: '100%' },
  inviteBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  inviteBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  whatsappCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1.5,
    borderColor: '#22C55E',
    ...shadows.card,
  },
  whatsappIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  whatsappInfo: {
    flex: 1,
  },
  whatsappTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#15803D',
  },
  whatsappSub: {
    fontSize: 11,
    color: '#166534',
    marginTop: 2,
    lineHeight: 15,
  },
  whatsappBadge: {
    backgroundColor: '#25D366',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  whatsappBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
});
