import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

export interface DisciplineItem {
  id: number;
  name: string;
  slug: string;
  formatDefault: string;
  defaultParticipants: number;
  iconType: 'football' | 'basketball' | 'volleyball' | 'table-tennis';
  line1?: string;
  line2?: string;
}

export const DISCIPLINES: DisciplineItem[] = [
  {
    id: 1,
    name: 'Football 11',
    slug: 'football-11',
    formatDefault: '11v11',
    defaultParticipants: 22,
    iconType: 'football',
    line1: 'Football',
    line2: '11',
  },
  {
    id: 2,
    name: 'Football 5',
    slug: 'football-5',
    formatDefault: '5v5',
    defaultParticipants: 10,
    iconType: 'football',
    line1: 'Football',
    line2: '5',
  },
  {
    id: 3,
    name: 'Basket 5×5',
    slug: 'basketball-5x5',
    formatDefault: '5v5',
    defaultParticipants: 10,
    iconType: 'basketball',
    line1: 'Basket',
    line2: '5×5',
  },
  {
    id: 4,
    name: 'Basket 3×3',
    slug: 'basketball-3x3',
    formatDefault: '3v3',
    defaultParticipants: 6,
    iconType: 'basketball',
    line1: 'Basket',
    line2: '3×3',
  },
  {
    id: 5,
    name: 'Volleyball',
    slug: 'volleyball',
    formatDefault: '6v6',
    defaultParticipants: 12,
    iconType: 'volleyball',
    line1: 'Volleyball',
  },
  {
    id: 6,
    name: 'Tennis de table',
    slug: 'tennis-de-table',
    formatDefault: '1v1',
    defaultParticipants: 2,
    iconType: 'table-tennis',
    line1: 'Tennis de',
    line2: 'table',
  },
];

interface DisciplineSelectorProps {
  selectedSportId?: number | null;
  onSelectSport: (sport: DisciplineItem) => void;
  title?: string;
  badgeText?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export const DisciplineSelector: React.FC<DisciplineSelectorProps> = ({
  selectedSportId,
  onSelectSport,
  title = 'Choisis ta discipline',
  badgeText = '6 sports disponibles',
  containerStyle,
}) => {
  const renderIcon = (type: DisciplineItem['iconType'], isSelected: boolean) => {
    const strokeColor = isSelected ? '#FFFFFF' : '#7EA5D6';
    const size = 22;

    switch (type) {
      case 'football':
        return (
          <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="1.8">
            <Circle cx="12" cy="12" r="9.5" />
            <Path d="M12 6.5L15.5 9.2L14 13.5H10L8.5 9.2L12 6.5Z" />
          </Svg>
        );
      case 'basketball':
        return (
          <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="1.8">
            <Circle cx="12" cy="12" r="9.5" />
            <Path d="M2.5 12H21.5" />
            <Path d="M12 2.5V21.5" />
            <Path d="M4.93 4.93C8.5 8.5 8.5 15.5 4.93 19.07" />
            <Path d="M19.07 4.93C15.5 8.5 15.5 15.5 19.07 19.07" />
          </Svg>
        );
      case 'volleyball':
        return (
          <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="1.8">
            <Circle cx="12" cy="12" r="9.5" />
            <Path d="M12 12A9.5 9.5 0 0 0 17 3.77" />
            <Path d="M12 12A9.5 9.5 0 0 0 2.5 12" />
            <Path d="M12 12A9.5 9.5 0 0 0 17 20.23" />
            <Path d="M7 4.5A9.5 9.5 0 0 0 14 19.5" />
          </Svg>
        );
      case 'table-tennis':
        return (
          <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="1.8">
            <Circle cx="8.5" cy="8.5" r="5.5" />
            <Path d="M12.5 12.5L20.5 20.5" strokeWidth="2.5" strokeLinecap="round" />
            <Circle cx="18" cy="6.5" r="2.2" fill={strokeColor} />
          </Svg>
        );
    }
  };

  return (
    <View style={[styles.card, containerStyle]}>
      {/* ── BADGE DISPONIBILITÉ ── */}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{badgeText}</Text>
      </View>

      {/* ── TITRE ── */}
      <Text style={styles.title}>{title}</Text>

      {/* ── GRILLE DES 6 DISCIPLINES (3 colonnes x 2 lignes) ── */}
      <View style={styles.grid}>
        {DISCIPLINES.map((item) => {
          const isSelected = selectedSportId === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.tile, isSelected && styles.tileSelected]}
              onPress={() => onSelectSport(item)}
              activeOpacity={0.8}
            >
              <View style={styles.iconWrapper}>
                {renderIcon(item.iconType, isSelected)}
              </View>
              <View style={styles.labelWrapper}>
                {item.line2 ? (
                  <>
                    <Text
                      numberOfLines={1}
                      style={[styles.tileText, isSelected && styles.tileTextSelected]}
                    >
                      {item.line1}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[styles.tileText, isSelected && styles.tileTextSelected]}
                    >
                      {item.line2}
                    </Text>
                  </>
                ) : (
                  <Text
                    numberOfLines={2}
                    style={[styles.tileText, isSelected && styles.tileTextSelected]}
                  >
                    {item.name}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0F1A2E', // Dark Navy profond identique au mockup
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1C2E4C',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 20,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(30, 58, 110, 0.45)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 14,
  },
  badgeText: {
    color: '#7BA4E8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 18,
    letterSpacing: -0.3,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  tile: {
    width: '31.5%',
    minHeight: 74,
    backgroundColor: '#16233B',
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#213454',
    paddingVertical: 10,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tileSelected: {
    backgroundColor: '#1D3560',
    borderColor: '#3B82F6',
    borderWidth: 1.8,
  },
  iconWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelWrapper: {
    justifyContent: 'center',
    flexShrink: 1,
  },
  tileText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 15,
  },
  tileTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
