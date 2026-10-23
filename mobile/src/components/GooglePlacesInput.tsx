import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../theme/colors';
import { radius, shadows, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { MapPin, X } from 'lucide-react-native';
import {
  googleMapsService,
  PlacePrediction,
  PlaceLocation,
} from '../services/googleMapsService';

interface GooglePlacesInputProps {
  label?: string;
  placeholder?: string;
  initialValue?: string;
  onLocationSelect: (location: PlaceLocation) => void;
  error?: string;
}

export const GooglePlacesInput: React.FC<GooglePlacesInputProps> = ({
  label = 'Lieu & Adresse (Google Maps)',
  placeholder = 'Rechercher un terrain, stade, quartier...',
  initialValue = '',
  onLocationSelect,
  error,
}) => {
  const [query, setQuery] = useState(initialValue);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (initialValue && !query) {
      setQuery(initialValue);
    }
  }, [initialValue]);

  const handleQueryChange = (text: string) => {
    setQuery(text);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (text.trim().length < 2) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await googleMapsService.searchPlaces(text);
        setPredictions(results);
        setShowDropdown(results.length > 0);
      } catch (err) {
        console.warn('Place search error:', err);
      } finally {
        setLoading(false);
      }
    }, 350);
  };

  const handleSelectPrediction = async (prediction: PlacePrediction) => {
    setQuery(prediction.primaryText);
    setShowDropdown(false);
    setLoading(true);

    try {
      const details = await googleMapsService.getPlaceDetails(prediction.placeId);
      if (details) {
        onLocationSelect(details);
      }
    } catch (err) {
      console.warn('Place details error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setPredictions([]);
    setShowDropdown(false);
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={[styles.inputWrapper, error ? styles.inputError : null]}>
        <MapPin size={16} color={colors.muted} style={styles.leadingIconView} />

        <TextInput
          style={styles.input}
          value={query}
          onChangeText={handleQueryChange}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          autoCapitalize="words"
          autoCorrect={false}
          onFocus={() => {
            if (predictions.length > 0) setShowDropdown(true);
          }}
        />

        {loading && (
          <ActivityIndicator
            size="small"
            color={colors.primary}
            style={styles.trailingIcon}
          />
        )}

        {!loading && query.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.trailingIcon}>
            <X size={14} color={colors.muted} strokeWidth={2.5} />
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Autocomplete Predictions Dropdown */}
      {showDropdown && predictions.length > 0 && (
        <View style={styles.dropdown}>
          {predictions.map((p) => (
            <TouchableOpacity
              key={p.placeId}
              style={styles.predictionItem}
              onPress={() => handleSelectPrediction(p)}
              activeOpacity={0.8}
            >
              <Text style={styles.predictionIcon}>⌖</Text>
              <View style={styles.predictionTexts}>
                <Text style={styles.primaryText} numberOfLines={1}>
                  {p.primaryText}
                </Text>
                {p.secondaryText ? (
                  <Text style={styles.secondaryText} numberOfLines={1}>
                    {p.secondaryText}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    position: 'relative',
    zIndex: 10,
  },
  label: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    height: 48,
  },
  inputError: {
    borderColor: colors.danger,
  },
  leadingIconView: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    height: '100%',
  },
  trailingIcon: {
    padding: spacing.xs,
  },
  clearText: {
    color: colors.muted,
    fontSize: 14,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    marginTop: 2,
  },
  dropdown: {
    position: 'absolute',
    top: 72,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    zIndex: 999,
    ...shadows.card,
    maxHeight: 220,
    overflow: 'hidden',
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  predictionIcon: {
    fontSize: 14,
    color: colors.primary,
    marginRight: spacing.sm,
  },
  predictionTexts: {
    flex: 1,
  },
  primaryText: {
    ...typography.bodyStrong,
    color: colors.text,
    fontSize: 14,
  },
  secondaryText: {
    ...typography.caption,
    color: colors.muted,
    fontSize: 11,
  },
});
