import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Platform,
  Alert,
  Share,
} from 'react-native';
import { Search, X, UserPlus, Check, User, MapPin, Award, Share2 } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { chatApi, UserSummary } from '../api/chatApi';

interface InviteModalProps {
  visible: boolean;
  onClose: () => void;
  targetType: 'team' | 'session';
  targetId: number;
  targetTitle: string;
  onSuccess?: () => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({
  visible,
  onClose,
  targetType,
  targetId,
  targetTitle,
  onSuccess,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [invitingId, setInvitingId] = useState<number | null>(null);
  const [invitedIds, setInvitedIds] = useState<number[]>([]);
  const [customInput, setCustomInput] = useState('');

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setResults([]);
      setInvitedIds([]);
      setCustomInput('');
      return;
    }
  }, [visible]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const data = await chatApi.searchUsers(query);
        setResults(data);
      } catch (e) {
        console.warn('User search error:', e);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  const handleInviteUser = async (user: UserSummary) => {
    if (invitedIds.includes(user.id)) return;
    try {
      setInvitingId(user.id);
      if (targetType === 'team') {
        await chatApi.inviteToTeam(targetId, { user_id: user.id });
      } else {
        await chatApi.inviteToSession(targetId, { user_id: user.id });
      }
      setInvitedIds((prev) => [...prev, user.id]);
      onSuccess && onSuccess();
    } catch (e: any) {
      Alert.alert('Invitation', e.response?.data?.message || e.message || 'Impossible d\'envoyer l\'invitation.');
    } finally {
      setInvitingId(null);
    }
  };

  const handleInviteCustom = async () => {
    if (!customInput.trim()) return;
    const isEmail = customInput.includes('@');
    try {
      setLoading(true);
      if (targetType === 'team') {
        await chatApi.inviteToTeam(
          targetId,
          isEmail ? { email: customInput.trim() } : { username: customInput.trim() }
        );
      } else {
        await chatApi.inviteToSession(
          targetId,
          isEmail ? { email: customInput.trim() } : { username: customInput.trim() }
        );
      }
      Alert.alert('Succès', `Invitation envoyée à ${customInput.trim()} !`);
      setCustomInput('');
      onSuccess && onSuccess();
    } catch (e: any) {
      Alert.alert('Erreur', e.response?.data?.message || e.message || 'Impossible d\'envoyer l\'invitation.');
    } finally {
      setLoading(false);
    }
  };

  const handleShareExternally = async () => {
    const isTeam = targetType === 'team';
    const message = isTeam
      ? `Rejoins mon équipe "${targetTitle}" sur SportUp !\nTélécharge l'application et rejoins-nous directement : https://sportup.app/join-team/${targetId}`
      : `Rejoins ma session sportive "${targetTitle}" sur SportUp !\nTélécharge l'application et rejoins la partie : https://sportup.app/s/${targetId}`;

    try {
      await Share.share({
        title: `Invitation SportUp — ${targetTitle}`,
        message,
      });
    } catch (e) {
      console.warn('Share modal error:', e);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>
                Inviter à {targetType === 'team' ? 'l\'équipe' : 'la session'}
              </Text>
              <Text style={styles.subtitle} numberOfLines={1}>{targetTitle}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={20} color={colors.navy} />
            </TouchableOpacity>
          </View>

          {/* External Quick Share Button (WhatsApp / SMS) */}
          <TouchableOpacity
            style={styles.shareBanner}
            onPress={handleShareExternally}
            activeOpacity={0.8}
          >
            <Share2 size={16} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.shareBannerText}>
              Partager l'invitation (WhatsApp, SMS, Messenger...)
            </Text>
          </TouchableOpacity>

          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Search size={18} color={colors.muted} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher par nom, pseudo ou ville..."
              placeholderTextColor={colors.muted}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {loading && <ActivityIndicator size="small" color={colors.primary} />}
          </View>

          {/* Results List or Fallback */}
          <View style={styles.listContainer}>
            {loading && results.length === 0 ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Recherche de sportifs...</Text>
              </View>
            ) : results.length > 0 ? (
              <FlatList
                data={results}
                keyExtractor={(item) => String(item.id)}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const isInvited = invitedIds.includes(item.id);
                  const isPending = invitingId === item.id;
                  const initials = item.username.substring(0, 2).toUpperCase();

                  return (
                    <View style={styles.userCard}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{initials}</Text>
                      </View>

                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{item.username}</Text>
                        <View style={styles.metaRow}>
                          {item.city ? (
                            <View style={styles.metaItem}>
                              <MapPin size={11} color={colors.muted} style={{ marginRight: 2 }} />
                              <Text style={styles.metaText}>{item.city}</Text>
                            </View>
                          ) : null}
                          {item.level ? (
                            <View style={styles.metaItem}>
                              <Award size={11} color={colors.primary} style={{ marginRight: 2 }} />
                              <Text style={[styles.metaText, { color: colors.primary, textTransform: 'capitalize' }]}>
                                {item.level}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.actionBtn,
                          isInvited && styles.actionBtnDone,
                        ]}
                        disabled={isInvited || isPending}
                        onPress={() => handleInviteUser(item)}
                        activeOpacity={0.8}
                      >
                        {isPending ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : isInvited ? (
                          <>
                            <Check size={14} color="#FFFFFF" strokeWidth={3} style={{ marginRight: 4 }} />
                            <Text style={styles.actionBtnText}>Invité</Text>
                          </>
                        ) : (
                          <>
                            <UserPlus size={14} color="#FFFFFF" strokeWidth={2.4} style={{ marginRight: 4 }} />
                            <Text style={styles.actionBtnText}>Inviter</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                }}
              />
            ) : query.trim().length >= 2 ? (
              <View style={styles.centerBox}>
                <User size={36} color={colors.muted} />
                <Text style={styles.emptyTitle}>Aucun joueur trouvé pour "{query}"</Text>
                <Text style={styles.emptySub}>Vous pouvez l'inviter directement ci-dessous avec son email.</Text>
              </View>
            ) : (
              <View style={styles.centerBox}>
                <UserPlus size={36} color={colors.primary} />
                <Text style={styles.emptyTitle}>Trouvez vos coéquipiers</Text>
                <Text style={styles.emptySub}>
                  Tapez le pseudo ou le nom d'un joueur pour l'inviter instantanément.
                </Text>
              </View>
            )}
          </View>

          {/* Direct Invite by Email / Username footer */}
          <View style={styles.footer}>
            <Text style={styles.footerTitle}>Inviter par email ou pseudo direct</Text>
            <View style={styles.footerRow}>
              <TextInput
                style={styles.footerInput}
                placeholder="ex: ami@sportup.app ou johndoe"
                placeholderTextColor={colors.muted}
                value={customInput}
                onChangeText={setCustomInput}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[styles.footerSendBtn, !customInput.trim() && styles.footerSendBtnDisabled]}
                disabled={!customInput.trim() || loading}
                onPress={handleInviteCustom}
                activeOpacity={0.8}
              >
                <Text style={styles.footerSendText}>Envoyer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 36 : spacing.lg,
    maxHeight: '85%',
    minHeight: 450,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(20, 86, 217, 0.15)',
  },
  shareBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 0,
  },
  listContainer: {
    flex: 1,
    minHeight: 220,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    fontSize: 13,
    color: colors.muted,
    marginTop: spacing.sm,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.xs,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 11,
    color: colors.muted,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  actionBtnDone: {
    backgroundColor: '#10B981',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
  },
  footerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerInput: {
    flex: 1,
    height: 40,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 13,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  footerSendBtn: {
    backgroundColor: colors.navy,
    paddingHorizontal: 16,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerSendBtnDisabled: {
    opacity: 0.4,
  },
  footerSendText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
