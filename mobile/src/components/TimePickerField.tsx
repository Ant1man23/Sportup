import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Clock, X } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { radius, shadows, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

const ITEM_HEIGHT = 52;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

interface TimePickerFieldProps {
  label?: string;
  value: string; // HH:mm
  onChange: (time: string) => void;
}

const WheelColumn: React.FC<{
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}> = ({ items, selectedIndex, onSelect }) => {
  const scrollRef = useRef<ScrollView>(null);
  const [pendingIndex, setPendingIndex] = useState(selectedIndex);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false });
  }, []);

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.round(y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(idx, items.length - 1));
    setPendingIndex(clamped);
    onSelect(clamped);
    scrollRef.current?.scrollTo({ y: clamped * ITEM_HEIGHT, animated: true });
  };

  return (
    <View style={wheelStyles.column}>
      {/* selection highlight */}
      <View pointerEvents="none" style={wheelStyles.highlight} />
      <ScrollView
        ref={scrollRef}
        style={{ height: PICKER_HEIGHT }}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScrollEnd}
      >
        {items.map((item, i) => {
          const active = i === pendingIndex;
          return (
            <TouchableOpacity
              key={item}
              style={wheelStyles.item}
              onPress={() => {
                setPendingIndex(i);
                onSelect(i);
                scrollRef.current?.scrollTo({ y: i * ITEM_HEIGHT, animated: true });
              }}
            >
              <Text style={[wheelStyles.itemText, active && wheelStyles.itemTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const wheelStyles = StyleSheet.create({
  column: { flex: 1, position: 'relative' },
  highlight: {
    position: 'absolute',
    top: ITEM_HEIGHT * 2,
    left: 0, right: 0,
    height: ITEM_HEIGHT,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    zIndex: 0,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontSize: 26,
    fontWeight: '400',
    color: colors.muted,
    letterSpacing: 1,
  },
  itemTextActive: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 30,
  },
});

export const TimePickerField: React.FC<TimePickerFieldProps> = ({ label, value, onChange }) => {
  const [visible, setVisible] = useState(false);
  const [tempHour, setTempHour] = useState(() => {
    if (value) return parseInt(value.split(':')[0], 10);
    return 19;
  });
  const [tempMin, setTempMin] = useState(() => {
    if (value) {
      const m = parseInt(value.split(':')[1], 10);
      return Math.round(m / 5);
    }
    return 0;
  });

  const confirm = () => {
    const h = HOURS[tempHour];
    const m = MINUTES[tempMin];
    onChange(`${h}:${m}`);
    setVisible(false);
  };

  const display = value || '--:--';

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity style={styles.trigger} onPress={() => setVisible(true)} activeOpacity={0.85}>
        <Clock size={16} color={value ? colors.primary : colors.muted} strokeWidth={2.2} />
        <Text style={[styles.triggerText, !value && styles.placeholder]}>{display}</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)} />
        <View style={styles.sheet}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setVisible(false)}>
            <X size={18} color={colors.muted} />
          </TouchableOpacity>

          <Text style={styles.sheetTitle}>Heure de debut</Text>
          <Text style={styles.previewTime}>
            {HOURS[tempHour]}:{MINUTES[tempMin]}
          </Text>

          <View style={styles.wheelsRow}>
            <WheelColumn
              items={HOURS}
              selectedIndex={tempHour}
              onSelect={setTempHour}
            />
            <Text style={styles.colon}>:</Text>
            <WheelColumn
              items={MINUTES}
              selectedIndex={tempMin}
              onSelect={setTempMin}
            />
          </View>

          <TouchableOpacity style={styles.confirmBtn} onPress={confirm} activeOpacity={0.85}>
            <Text style={styles.confirmText}>Confirmer</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: { ...typography.caption, color: colors.text, fontWeight: '600', marginBottom: spacing.xs },
  trigger: {
    height: 48,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  triggerText: { fontSize: 15, color: colors.text, fontWeight: '500', flex: 1 },
  placeholder: { color: colors.muted, fontWeight: '400' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 48,
    ...shadows.modal,
    alignItems: 'center',
  },
  closeBtn: { position: 'absolute', top: spacing.lg, right: spacing.lg, padding: spacing.xs },
  sheetTitle: { ...typography.bodyStrong, fontSize: 16, color: colors.muted, marginBottom: spacing.xs },
  previewTime: {
    fontSize: 42,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 2,
    marginBottom: spacing.lg,
  },
  wheelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.xl,
  },
  colon: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    paddingHorizontal: spacing.sm,
    marginBottom: 4,
  },
  confirmBtn: {
    width: '100%',
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
