                                                                                                                                                                                                                                                                                                                                   import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  StatusBar,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { radius, spacing } from '../../../theme/spacing';
import { SportUpLogo } from '../../../components/SportUpLogo';
import { ArrowRight, Sparkles } from 'lucide-react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface WelcomeScreenProps {
  onNavigateLogin: () => void;
  onNavigateRegister: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onNavigateLogin,
  onNavigateRegister,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(logoAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ImageBackground
        source={require('../assets/welcome_bg.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Dynamic Dark Gradient Overlays for optimal readability & depth */}
        <View style={styles.overlayTop} />
        <View style={styles.overlayBottom} />

        {/* Brand Header */}
        <Animated.View style={[styles.logoContainer, { opacity: logoAnim }]}>
          <SportUpLogo size="md" variant="light" />
        </Animated.View>

        {/* Hero Text & Actions */}
        <Animated.View
          style={[
            styles.bottomContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Micro-badge */}
          <View style={styles.communityBadge}>
            <Sparkles size={12} color="#10B981" style={{ marginRight: 6 }} />
            <Text style={styles.communityBadgeText}>COMMUNAUTÉ SPORTIVE #1 À MADAGASCAR</Text>
          </View>

          {/* Hero Title */}
          <Text style={styles.heroTitle}>
            Trouve ton match.{'\n'}
            <Text style={styles.heroTitleAccent}>Joue.</Text> Progresse.
          </Text>

          <Text style={styles.heroSubtitle}>
            Rejoins les matchs près de chez toi, crée ton équipe et défie les meilleurs joueurs de ton quartier.
          </Text>

          {/* CTA Buttons */}
          <View style={styles.buttonsContainer}>
            {/* Connexion Button */}
            <TouchableOpacity
              style={styles.loginButton}
              onPress={onNavigateLogin}
              activeOpacity={0.9}
            >
              <Text style={styles.loginButtonText}>Connexion</Text>
              <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.5} style={{ marginLeft: 6 }} />
            </TouchableOpacity>

            {/* Inscription Button */}
            <TouchableOpacity
              style={styles.registerButton}
              onPress={onNavigateRegister}
              activeOpacity={0.85}
            >
              <Text style={styles.registerButtonText}>Créer un compte</Text>
            </TouchableOpacity>
          </View>

          {/* Micro trust indicator */}
          <View style={styles.trustFooter}>
            <View style={styles.pulseDot} />
            <Text style={styles.trustFooterText}>+1 200 sportifs actifs chaque semaine</Text>
          </View>
        </Animated.View>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050E1A',
  },
  backgroundImage: {
    flex: 1,
    justifyContent: 'space-between',
  },
  // Top vignette fade
  overlayTop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 14, 26, 0.45)',
    height: SCREEN_HEIGHT * 0.35,
    bottom: undefined,
  },
  // Bottom rich gradient overlay
  overlayBottom: {
    ...StyleSheet.absoluteFillObject,
    top: undefined,
    height: SCREEN_HEIGHT * 0.70,
    backgroundColor: 'rgba(5, 14, 26, 0.88)',
  },

  // Logo
  logoContainer: {
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingHorizontal: spacing.xl,
    zIndex: 10,
  },

  // Bottom content area
  bottomContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 44 : 32,
    zIndex: 10,
  },
  communityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    marginBottom: spacing.md,
  },
  communityBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#34D399',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 42,
    letterSpacing: -0.6,
    marginBottom: spacing.sm,
  },
  heroTitleAccent: {
    color: '#10B981',
  },
  heroSubtitle: {
    fontSize: 15,
    color: 'rgba(226, 232, 240, 0.82)',
    lineHeight: 22,
    fontWeight: '400',
    marginBottom: spacing.xl,
  },

  // Buttons
  buttonsContainer: {
    gap: 12,
  },
  loginButton: {
    height: 54,
    borderRadius: radius.pill,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  registerButton: {
    height: 54,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  // Trust footer
  trustFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  trustFooterText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
});
