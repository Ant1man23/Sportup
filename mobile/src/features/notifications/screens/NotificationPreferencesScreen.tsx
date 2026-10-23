import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  StatusBar,
} from 'react-native';
import {
  Bell,
  ChevronLeft,
  Trophy,
  MessageSquare,
  Users,
  Clock,
  Zap,
  Check,
  Calendar,
  Shield,
} from 'lucide-react-native';
import { colors } from '../../../theme/colors';
import { radius, shadows, spacing } from '../../../theme/spacing';
import { notificationPreferencesApi } from '../../../api/notificationPreferencesApi';
import { NotificationPref } from '../../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

type NotifType =
  | 'participant'
  | 'spots'
  | 'reminder'
  | 'match_start'
  | 'tournament_match_scheduled'
  | 'new_message'
  | 'team_invitation';

interface NotifTypeConfig {
  type: NotifType;
  label: string;
  description: string;
  iconName: 'users' | 'zap' | 'clock' | 'zap_green' | 'trophy' | 'message' | 'users_pink' | 'calendar';
  section: 'sessions' | 'matches' | 'social' | 'tournaments';
  isV2?: boolean;
}

const NOTIF_CONFIGS: NotifTypeConfig[] = [
  {
    type: 'participant',
    label: 'Nouveau participant',
    description: 'Quelqu\u2019un rejoint votre session',
    iconName: 'users',
    section: 'sessions',
  },
  {
    type: 'spots',
    label: 'Alerte disponibilit\u00e9',
    description: 'Moins de 3 places restantes',
    iconName: 'zap',
    section: 'sessions',
  },
  {
    type: 'reminder',
    label: 'Rappel avant session',
    description: 'Notification avant le d\u00e9but',
    iconName: 'clock',
    section: 'sessions',
  },
  {
    type: 'match_start',
    label: 'Match en cours',
    description: 'Acc\u00e9dez au suivi en direct',
    iconName: 'zap_green',
    section: 'matches',
  },
  {
    type: 'tournament_match_scheduled',
    label: 'Match de tournoi assign\u00e9',
    description: 'Un adversaire vous est assign\u00e9',
    iconName: 'trophy',
    section: 'tournaments',
    isV2: true,
  },
  {
    type: 'new_message',
    label: 'Message de session',
    description: 'Nouveau message dans le chat',
    iconName: 'message',
    section: 'social',
    isV2: true,
  },
  {
    type: 'team_invitation',
    label: 'Invitation d\u2019\u00e9quipe',
    description: 'Rejoignez une \u00e9quipe',
    iconName: 'users_pink',
    section: 'social',
    isV2: true,
  },
];

const REMINDER_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 h' },
  { value: 120, label: '2 h' },
  { value: 1440, label: 'Veille' },
];

const SECTIONS: { key: NotifTypeConfig['section']; label: string }[] = [
  { key: 'sessions', label: 'Sessions' },
  { key: 'matches', label: 'Matchs' },
  { key: 'tournaments', label: 'Tournois' },
  { key: 'social', label: 'Social' },
];

// ─── Icon ─────────────────────────────────────────────────────────────────────

const PrefIcon: React.FC<{ name: NotifTypeConfig['iconName']; enabled: boolean }> = ({ name, enabled }) => {
  const opacity = enabled ? 1 : 0.35;
  switch (name) {
    case 'users':    return <Users size={16} color={colors.primary} strokeWidth={2} style={{ opacity }} />;
    case 'zap':      return <Zap size={16} color="#F59E0B" strokeWidth={2} style={{ opacity }} />;
    case 'clock':    return <Clock size={16} color="#8B5CF6" strokeWidth={2} style={{ opacity }} />;
    case 'zap_green':return <Zap size={16} color={colors.success} strokeWidth={2} style={{ opacity }} />;
    case 'trophy':   return <Trophy size={16} color="#F59E0B" strokeWidth={2} style={{ opacity }} />;
    case 'message':  return <MessageSquare size={16} color={colors.primary} strokeWidth={2} style={{ opacity }} />;
    case 'users_pink':return <Users size={16} color="#EC4899" strokeWidth={2} style={{ opacity }} />;
    case 'calendar': return <Calendar size={16} color={colors.primary} strokeWidth={2} style={{ opacity }} />;
    default:         return <Bell size={16} color={colors.muted} strokeWidth={2} style={{ opacity }} />;
  }
};

const iconBg: Record<NotifTypeConfig['iconName'], string> = {
  users:      '#EBF2FF',
  zap:        '#FFFBEB',
  clock:      '#F5F3FF',
  zap_green:  '#ECFDF5',
  trophy:     '#FFFBEB',
  message:    '#EBF2FF',
  users_pink: '#FDF2F8',
  calendar:   '#EBF2FF',
};

// ─── Component ────────────────────────────────────────────────────────────────

interface NotificationPreferencesScreenProps {
  onNavigateBack?: () => void;
}

export const NotificationPreferencesScreen: React.FC<NotificationPreferencesScreenProps> = ({
  onNavigateBack,
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const checkAnim = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0.6)).current;

  const [reminderMinutes, setReminderMinutes] = useState(60);
  const [prefs, setPrefs] = useState<Record<NotifType, boolean>>(() => {
    const d = {} as Record<NotifType, boolean>;
    NOTIF_CONFIGS.forEach(c => { d[c.type] = true; });
    return d;
  });

  const load = useCallback(async () => {
    try {
      const data = await notificationPreferencesApi.getPreferences();
      setReminderMinutes(data.reminder_minutes_before ?? 60);
      if (data.preferences?.length > 0) {
        const p = {} as Record<NotifType, boolean>;
        NOTIF_CONFIGS.forEach(c => { p[c.type] = true; });
        data.preferences.forEach((item: NotificationPref) => {
          if ((p as any)[item.type] !== undefined) {
            (p as any)[item.type] = item.push_enabled;
          }
        });
        setPrefs(p);
      }
    } catch {
      /* silently use defaults */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const showSaved = () => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(checkAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(checkScale, { toValue: 1, friction: 6, useNativeDriver: true }),
      ]),
      Animated.delay(1600),
      Animated.parallel([
        Animated.timing(checkAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(checkScale, { toValue: 0.6, duration: 250, useNativeDriver: true }),
      ]),
    ]).start();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const list: NotificationPref[] = NOTIF_CONFIGS.map(c => ({
        type: c.type,
        push_enabled: prefs[c.type],
      }));
      await notificationPreferencesApi.updatePreferences(reminderMinutes, list);
      showSaved();
    } catch (e: any) {
      Alert.alert('Impossible d\u2019enregistrer', e?.message || 'V\u00e9rifiez votre connexion.');
    } finally {
      setSaving(false);
    }
  };

  const togglePref = (type: NotifType) =>
    setPrefs(prev => ({ ...prev, [type]: !prev[type] }));

  // ── enabledCount ──────────────────────────────────────────────────────────
  const enabledCount = NOTIF_CONFIGS.filter(c => prefs[c.type]).length;

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* ── Header ── */}
      <View style={styles.header}>
        {onNavigateBack && (
          <TouchableOpacity onPress={onNavigateBack} style={styles.backBtn} activeOpacity={0.65}>
            <ChevronLeft size={18} color={colors.text} strokeWidth={2.2} />
          </TouchableOpacity>
        )}
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSub}>{enabledCount} sur {NOTIF_CONFIGS.length} actives</Text>
        </View>
        <Animated.View
          style={[
            styles.savedPill,
            { opacity: checkAnim, transform: [{ scale: checkScale }] },
          ]}
          pointerEvents="none"
        >
          <Check size={12} color={colors.success} strokeWidth={3} />
          <Text style={styles.savedPillText}>Enregistr\u00e9</Text>
        </Animated.View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Rappel timing ── */}
        <View style={styles.blockHeader}>
          <View style={styles.blockHeaderIcon}>
            <Clock size={14} color={colors.primary} strokeWidth={2.2} />
          </View>
          <Text style={styles.blockLabel}>D\u00e9lai du rappel</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.reminderRow}>
            {REMINDER_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.reminderChip,
                  reminderMinutes === opt.value && styles.reminderChipOn,
                ]}
                onPress={() => setReminderMinutes(opt.value)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.reminderChipText,
                  reminderMinutes === opt.value && styles.reminderChipTextOn,
                ]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.reminderHint}>
            Vous serez notifi\u00e9 {REMINDER_OPTIONS.find(o => o.value === reminderMinutes)?.label ?? ''} avant chaque session programm\u00e9e.
          </Text>
        </View>

        {/* ── Sections ── */}
        {SECTIONS.map(sec => {
          const items = NOTIF_CONFIGS.filter(c => c.section === sec.key);
          return (
            <View key={sec.key}>
              <View style={styles.blockHeader}>
                <Text style={styles.blockLabel}>{sec.label}</Text>
                {items.some(i => i.isV2) && (
                  <View style={styles.newBadge}><Text style={styles.newBadgeText}>NOUVEAU</Text></View>
                )}
              </View>

              <View style={styles.card}>
                {items.map((cfg, idx) => {
                  const isOn = prefs[cfg.type];
                  return (
                    <View key={cfg.type}>
                      {idx > 0 && <View style={styles.divider} />}
                      <TouchableOpacity
                        style={styles.prefRow}
                        onPress={() => togglePref(cfg.type)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.prefIconBox, { backgroundColor: iconBg[cfg.iconName] }]}>
                          <PrefIcon name={cfg.iconName} enabled={isOn} />
                        </View>
                        <View style={styles.prefText}>
                          <View style={styles.prefTitleRow}>
                            <Text style={[styles.prefLabel, !isOn && styles.prefLabelOff]}>{cfg.label}</Text>
                          </View>
                          <Text style={styles.prefDesc}>{cfg.description}</Text>
                        </View>
                        <Switch
                          value={isOn}
                          onValueChange={() => togglePref(cfg.type)}
                          trackColor={{ false: colors.border, true: `${colors.primary}40` }}
                          thumbColor={isOn ? colors.primary : colors.mutedLight}
                          ios_backgroundColor={colors.border}
                        />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}

        {/* ── Info footer ── */}
        <View style={styles.infoRow}>
          <Shield size={13} color={colors.muted} strokeWidth={1.8} />
          <Text style={styles.infoText}>Les alertes de s\u00e9curit\u00e9 du compte sont toujours actives.</Text>
        </View>

        {/* ── Save ── */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.82}
        >
          {saving
            ? <ActivityIndicator color="#FFF" size="small" />
            : <Text style={styles.saveBtnText}>Enregistrer les pr\u00e9f\u00e9rences</Text>
          }
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'android' ? spacing.xl : spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.md,
    ...shadows.subtle,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1 },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
  },
  headerSub: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
  },
  savedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: `${colors.success}30`,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    gap: 4,
  },
  savedPillText: { fontSize: 11, fontWeight: '700', color: colors.success },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: 48, gap: 0 },

  // Block label
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  blockHeaderIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  newBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  newBadgeText: { fontSize: 9, fontWeight: '800', color: colors.primary, letterSpacing: 0.6 },

  // Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.subtle,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderLight,
    marginLeft: 56,
  },

  // Reminder
  reminderRow: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.xs,
  },
  reminderChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  reminderChipOn: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  reminderChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
  reminderChipTextOn: {
    color: '#FFFFFF',
  },
  reminderHint: {
    fontSize: 12,
    color: colors.muted,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    lineHeight: 18,
  },

  // Pref row
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    gap: spacing.md,
  },
  prefIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefText: { flex: 1, gap: 2 },
  prefTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  prefLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: -0.1,
  },
  prefLabelOff: { color: colors.muted },
  prefDesc: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  v2Dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },

  // Info
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginTop: spacing.xl,
    paddingHorizontal: 2,
  },
  infoText: { flex: 1, fontSize: 12, color: colors.muted, lineHeight: 18 },

  // Save
  saveBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.navy,
    borderRadius: radius.xl,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.floating,
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.1 },
});
