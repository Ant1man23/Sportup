import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Animated,
} from 'react-native';
import {
  MessageCircle as _MC,  // kept for potential future use — suppressed
  Users,
  Swords,
  Search,
  ChevronRight,
  ChevronLeft,
  Inbox,
} from 'lucide-react-native';
import { colors } from '../../../theme/colors';
import { radius, shadows, spacing } from '../../../theme/spacing';
import { chatApi, ConversationItem } from '../../../api/chatApi';

interface ConversationsListScreenProps {
  onOpenConversation: (conv: ConversationItem) => void;
  onNavigateBack?: () => void;
}

// ─── Relative time formatter ──────────────────────────────────────────────────
function relativeTime(isoString?: string): string {
  if (!isoString) return '';
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'À l\'instant';
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Il y a ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `Il y a ${diffD}j`;
}

// ─── ConversationRow ──────────────────────────────────────────────────────────
interface ConversationRowProps {
  item: ConversationItem;
  onPress: () => void;
  index: number;
}

const ConversationRow: React.FC<ConversationRowProps> = ({ item, onPress, index }) => {
  const slideAnim = useRef(new Animated.Value(24)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 320,
        delay: index * 55,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 320,
        delay: index * 55,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const isTeam = item.type === 'team';
  const IconComponent = isTeam ? Users : Swords;
  const accentColor = isTeam ? '#8B5CF6' : colors.primary;
  const accentBg = isTeam ? '#F5F3FF' : colors.primarySoft;

  const initials = item.title
    ? item.title.substring(0, 2).toUpperCase()
    : '??';

  return (
    <Animated.View style={{ opacity: opacityAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.8}>
        {/* Avatar */}
        <View style={[styles.avatarBox, { backgroundColor: accentBg }]}>
          <Text style={[styles.avatarInitials, { color: accentColor }]}>{initials}</Text>
          <View style={[styles.typePin, { backgroundColor: accentColor }]}>
            <IconComponent size={9} color="#FFF" strokeWidth={2.5} />
          </View>
        </View>

        {/* Content */}
        <View style={styles.rowContent}>
          <View style={styles.rowTopLine}>
            <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
            {item.last_message?.created_at ? (
              <Text style={styles.rowTime}>{relativeTime(item.last_message.created_at)}</Text>
            ) : null}
          </View>
          <View style={styles.rowBottomLine}>
            <Text style={styles.rowSubtitle} numberOfLines={1}>
              {item.last_message
                ? `${item.last_message.sender ? `${item.last_message.sender}: ` : ''}${item.last_message.body}`
                : item.subtitle}
            </Text>
            {(item.messages_count ?? 0) > 0 && (
              <View style={[styles.countBadge, { backgroundColor: accentColor }]}>
                <Text style={styles.countBadgeText}>{item.messages_count}</Text>
              </View>
            )}
          </View>
        </View>

        <ChevronRight size={16} color={colors.muted} />
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Empty state ──────────────────────────────────────────────────────────────
const EmptyState: React.FC = () => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIconBox}>
      <Inbox size={42} color={colors.muted} strokeWidth={1.5} />
    </View>
    <Text style={styles.emptyTitle}>Aucune conversation</Text>
    <Text style={styles.emptyText}>
      Rejoignez une session ou une équipe pour commencer à discuter avec les autres joueurs.
    </Text>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export const ConversationsListScreen: React.FC<ConversationsListScreenProps> = ({
  onOpenConversation,
  onNavigateBack,
}) => {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [filter, setFilter]               = useState<'all' | 'session' | 'team'>('all');

  const fetchConversations = useCallback(async (isRefreshing = false) => {
    try {
      if (isRefreshing) setRefreshing(true);
      else setLoading(true);
      const data = await chatApi.getUserConversations();
      setConversations(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('ConversationsList fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    // Polling léger toutes les 10 secondes pour badge de nouveaux messages
    const interval = setInterval(() => fetchConversations(), 10000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  const filtered = conversations.filter((c) => {
    if (filter === 'all') return true;
    return c.type === filter;
  });

  const sessionCount = conversations.filter((c) => c.type === 'session').length;
  const teamCount    = conversations.filter((c) => c.type === 'team').length;

  return (
    <View style={styles.root}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeftRow}>
          {onNavigateBack && (
            <TouchableOpacity
              onPress={onNavigateBack}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <ChevronLeft size={22} color={colors.navy} strokeWidth={2.4} />
              <Text style={styles.backButtonText}>Retour</Text>
            </TouchableOpacity>
          )}
          <View>
            <Text style={styles.headerTitle}>Discussions</Text>
            <Text style={styles.headerSub}>
              {conversations.length} conversation{conversations.length !== 1 ? 's' : ''} active{conversations.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        <View style={styles.headerSearchBtn}>
          <Search size={18} color={colors.muted} />
        </View>
      </View>

      {/* FILTER TABS */}
      <View style={styles.filterRow}>
        {([
          { key: 'all',     label: 'Toutes',   count: conversations.length },
          { key: 'session', label: 'Sessions', count: sessionCount },
          { key: 'team',    label: 'Équipes',  count: teamCount },
        ] as const).map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.filterTab, filter === tab.key && styles.filterTabActive]}
            onPress={() => setFilter(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterTabText, filter === tab.key && styles.filterTabTextActive]}>
              {tab.label}
            </Text>
            {tab.count > 0 && (
              <View style={[styles.filterTabBadge, { backgroundColor: filter === tab.key ? colors.primary : colors.borderLight }]}>
                <Text style={[styles.filterTabBadgeText, { color: filter === tab.key ? '#FFF' : colors.muted }]}>
                  {tab.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* CONTENT */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Chargement des conversations...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => `conv-${item.id}`}
          renderItem={({ item, index }) => (
            <ConversationRow
              item={item}
              index={index}
              onPress={() => onOpenConversation(item)}
            />
          )}
          ListEmptyComponent={<EmptyState />}
          contentContainerStyle={[
            styles.listContent,
            filtered.length === 0 && { flex: 1 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchConversations(true)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // HEADER
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 56 : spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#EEF2F6',
    borderRadius: radius.pill,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
    marginLeft: 3,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.navy,
    letterSpacing: -0.4,
  },
  headerSub: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
    marginTop: 2,
  },
  headerSearchBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },

  // FILTER TABS
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  filterTabActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
  },
  filterTabTextActive: {
    color: colors.primary,
  },
  filterTabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterTabBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },

  // LOADING
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: colors.muted,
    marginTop: spacing.sm,
  },

  // LIST
  listContent: {
    padding: spacing.md,
  },
  separator: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginLeft: 72,
  },

  // ROW
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: radius.lg,
    gap: 12,
    ...shadows.card,
    marginBottom: spacing.sm,
  },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: '900',
  },
  typePin: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  rowContent: {
    flex: 1,
    gap: 3,
  },
  rowTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.navy,
    flex: 1,
    marginRight: 8,
  },
  rowTime: {
    fontSize: 10,
    color: colors.muted,
    fontWeight: '600',
  },
  rowBottomLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowSubtitle: {
    fontSize: 12,
    color: colors.muted,
    flex: 1,
    marginRight: 8,
  },
  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFF',
  },

  // EMPTY
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIconBox: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.navy,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
  },
});
