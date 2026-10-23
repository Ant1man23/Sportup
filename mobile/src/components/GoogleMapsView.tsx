import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Map, MapPin } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { radius, shadows, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { googleMapsService } from '../services/googleMapsService';
import { hasValidGoogleMapsKey } from '../config/env';

interface GoogleMapsViewProps {
  latitude: number;
  longitude: number;
  title?: string;
  address?: string;
  sportColor?: string;
  height?: number;
  interactive?: boolean;
}

export const GoogleMapsView: React.FC<GoogleMapsViewProps> = ({
  latitude,
  longitude,
  title = 'Lieu de la session',
  address,
  sportColor = colors.primary,
  height = 180,
  interactive = false,
}) => {
  const [imageLoading, setImageLoading] = useState(true);
  const hasKey = hasValidGoogleMapsKey();

  const [mapUri, setMapUri] = useState<string>(() =>
    googleMapsService.getStaticMapUrl(latitude, longitude, {
      zoom: 15,
      width: 600,
      height: Math.round(height * 2),
      sportColor,
    })
  );

  const handleOpenNavigation = () => {
    googleMapsService.openInGoogleMaps(latitude, longitude, title);
  };

  const initialRegion = {
    latitude,
    longitude,
    latitudeDelta: 0.015,
    longitudeDelta: 0.015,
  };

  const handleImageError = () => {
    // If primary map URL failed (e.g. Google Static map key denied/quota), switch to OpenStreetMap
    const osmUrl = googleMapsService.getOsmStaticMapUrl(latitude, longitude, {
      zoom: 15,
      width: 600,
      height: Math.round(height * 2),
    });
    if (mapUri !== osmUrl) {
      setMapUri(osmUrl);
    }
    setImageLoading(false);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.mapCard, { height }]}>
        {/* If interactive mode and real Google key configured */}
        {interactive && hasKey ? (
          <MapView
            provider={PROVIDER_GOOGLE}
            style={StyleSheet.absoluteFillObject}
            initialRegion={initialRegion}
            region={initialRegion}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
          >
            <Marker
              coordinate={{ latitude, longitude }}
              title={title}
              description={address}
              pinColor={sportColor}
            />
          </MapView>
        ) : mapUri ? (
          <>
            <Image
              source={{ uri: mapUri }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
              onLoadStart={() => setImageLoading(true)}
              onLoadEnd={() => setImageLoading(false)}
              onError={handleImageError}
            />
            {imageLoading && (
              <View style={styles.loaderOverlay}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            )}
          </>
        ) : (
          <View style={styles.placeholderContainer}>
            <View style={styles.mapIconCircle}>
              <Map size={28} color={colors.primarySoft} strokeWidth={1.8} />
            </View>
            <Text style={styles.placeholderTitle}>Google Maps</Text>
            <Text style={styles.coordinatesText}>
              {latitude.toFixed(4)}, {longitude.toFixed(4)}
            </Text>
            {!hasKey && (
              <View style={styles.keyNotice}>
                <Text style={styles.keyNoticeText}>
                  Clé Google Maps API à renseigner dans .env
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Floating Open Directions Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.directionsButton}
          onPress={handleOpenNavigation}
        >
          <Text style={styles.directionsButtonText}>↗ Itinéraire</Text>
        </TouchableOpacity>
      </View>

      {/* Address & GPS footer */}
      {address && (
        <View style={styles.infoRow}>
          <MapPin size={14} color={colors.muted} style={{ marginRight: 6 }} />
          <Text style={styles.addressText} numberOfLines={2}>
            {address}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
  },
  mapCard: {
    width: '100%',
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.navySoft,
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 19, 43, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  mapIcon: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  placeholderTitle: {
    ...typography.bodyStrong,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  coordinatesText: {
    ...typography.caption,
    color: colors.primarySoft,
  },
  keyNotice: {
    backgroundColor: 'rgba(255, 180, 0, 0.15)',
    borderColor: '#FFB400',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginTop: spacing.xs,
  },
  keyNoticeText: {
    ...typography.caption,
    fontSize: 10,
    color: '#FFB400',
  },
  directionsButton: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    zIndex: 10,
  },
  directionsButtonText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  mapIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(20, 86, 217, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  addressText: {
    ...typography.caption,
    color: colors.muted,
    flex: 1,
  },
});
