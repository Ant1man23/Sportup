import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { radius, shadows, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS_FR = [
  'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre',
];

export function formatDateFR(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const monthShort = [
    'jan.', 'fev.', 'mars', 'avr.', 'mai', 'juin',
    'juil.', 'aout', 'sept.', 'oct.', 'nov.', 'dec.',
  ];
  return `${dayNames[dateObj.getDay()]}. ${d} ${monthShort[m - 1]} ${y}`;
}

interface DatePickerFieldProps {
  label?: string;
  value: string;
  onChange: (date: string) => void;
  minDate?: string;
}

export const DatePickerField: React.FC<DatePickerFieldProps> = ({
  label,
  value,
  onChange,
  minDate,
}) => {
  const [visible, setVisible] = useState(false);
  const today = new Date();

  const [viewYear, setViewYear] = useState(() => {
    if (value) return parseInt(value.split('-')[0], 10);
    return today.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    if (value) return parseInt(value.split('-')[1], 10) - 1;
    return today.getMonth();
  });

  const minDateObj = useMemo(() => {
    if (!minDate) return null;
    const [y, m, d] = minDate.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [minDate]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();
    const cells: Array<{ day: number; currentMonth: boolean; dateStr: string }> = [];

    for (let i = startOffset - 1; i >= 0; i--) {
      const d = daysInPrev - i;
      const m = viewMonth === 0 ? 12 : viewMonth;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      cells.push({ day: d, currentMonth: false, dateStr: `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}` });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        day: d,
        currentMonth: true,
        dateStr: `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      });
    }
    const remainder = cells.length % 7;
    if (remainder !== 0) {
      const needed = 7 - remainder;
      for (let d = 1; d <= needed; d++) {
        const m = viewMonth === 11 ? 1 : viewMonth + 2;
        const y = viewMonth === 11 ? viewYear + 1 : viewYear;
        cells.push({ day: d, currentMonth: false, dateStr: `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}` });
      }
    }
    return cells;
  }, [viewMonth, viewYear]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const isDisabled = (dateStr: string) => {
    if (!minDateObj) return false;
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d) < minDateObj;
  };

  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  const select = (dateStr: string) => {
    if (isDisabled(dateStr)) return;
    onChange(dateStr);
    setVisible(false);
  };

  const display = value ? formatDateFR(value) : 'Choisir une date';

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity style={styles.trigger} onPress={() => setVisible(true)} activeOpacity={0.85}>
        <CalendarDays size={16} color={value ? colors.primary : colors.muted} strokeWidth={2.2} />
        <Text style={[styles.triggerText, !value && styles.placeholder]}>{display}</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)} />
        <View style={styles.sheet}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setVisible(false)}>
            <X size={18} color={colors.muted} />
          </TouchableOpacity>

          <View style={styles.navRow}>
            <TouchableOpacity onPress={prevMonth} style={styles.navArrow}>
              <ChevronLeft size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{MONTHS_FR[viewMonth]} {viewYear}</Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navArrow}>
              <ChevronRight size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekHeader}>
            {DAYS_FR.map(d => (
              <Text key={d} style={styles.weekDay}>{d}</Text>
            ))}
          </View>

          <View style={styles.grid}>
            {calendarDays.map((cell, idx) => {
              const selected = cell.dateStr === value;
              const disabled = isDisabled(cell.dateStr);
              const todayCell = cell.dateStr === todayStr;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.cell,
                    selected && styles.cellSelected,
                    todayCell && !selected && styles.cellToday,
                  ]}
                  onPress={() => select(cell.dateStr)}
                  disabled={disabled}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.cellText,
                    !cell.currentMonth && styles.cellTextOtherMonth,
                    selected && styles.cellTextSelected,
                    todayCell && !selected && styles.cellTextToday,
                    disabled && styles.cellTextDisabled,
                  ]}>
                    {cell.day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.todayBtn}
            onPress={() => {
              if (!isDisabled(todayStr)) {
                select(todayStr);
                setViewYear(today.getFullYear());
                setViewMonth(today.getMonth());
              }
            }}
          >
            <Text style={styles.todayBtnText}>Aujourd'hui</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const CELL_SIZE = 38;

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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 48,
    ...shadows.modal,
  },
  closeBtn: { position: 'absolute', top: spacing.lg, right: spacing.lg, padding: spacing.xs },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    paddingRight: spacing.xl,
  },
  navArrow: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  monthTitle: { ...typography.bodyStrong, fontSize: 17, fontWeight: '700', color: colors.text },
  weekHeader: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: spacing.xs },
  weekDay: { width: CELL_SIZE, textAlign: 'center', fontSize: 12, fontWeight: '600', color: colors.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', rowGap: 4 },
  cell: { width: CELL_SIZE, height: CELL_SIZE, borderRadius: CELL_SIZE / 2, alignItems: 'center', justifyContent: 'center' },
  cellSelected: { backgroundColor: colors.primary },
  cellToday: { backgroundColor: colors.primarySoft },
  cellText: { fontSize: 14, color: colors.text, fontWeight: '500' },
  cellTextOtherMonth: { color: colors.mutedLight },
  cellTextSelected: { color: '#FFFFFF', fontWeight: '700' },
  cellTextToday: { color: colors.primary, fontWeight: '700' },
  cellTextDisabled: { color: colors.mutedLight },
  todayBtn: { marginTop: spacing.lg, alignSelf: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.xl, backgroundColor: colors.primarySoft, borderRadius: 999 },
  todayBtnText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
});
