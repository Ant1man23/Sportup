                                                                                                import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors } from '../theme/colors';

interface SportUpLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
  showText?: boolean;
}

export const SportUpLogo: React.FC<SportUpLogoProps> = ({
  size = 'md',
  variant = 'light',
  showText = true,
}) => {
  const iconSizes = {
    sm: 28,
    md: 38,
    lg: 52,
  };

  const textSizes = {
    sm: 18,
    md: 24,
    lg: 32,
  };

  const currentSize = iconSizes[size];
  const textColor = variant === 'light' ? '#FFFFFF' : colors.navy;

  return (
    <View style={styles.container}>
      {/* Dynamic Geometric Sport Emblem (Vivid Athletic Peak / Chevron) */}
      <View style={[styles.emblemContainer, { width: currentSize, height: currentSize }]}>
        <Svg width={currentSize} height={currentSize} viewBox="0 0 48 48" fill="none">
          <Defs>
            <LinearGradient id="sportGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#2563EB" />
              <Stop offset="100%" stopColor="#10B981" />
            </LinearGradient>
            <LinearGradient id="sportGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#10B981" />
              <Stop offset="100%" stopColor="#38BDF8" />
            </LinearGradient>
          </Defs>
          {/* Athletic forward motion arrows */}
          <Path
            d="M8 36L22 14L30 26L24 36H8Z"
            fill="url(#sportGrad1)"
            opacity={0.95}
          />
          <Path                                                                                                                                                                
            d="M22 14L34 14L42 26L30 26L22 14Z"
            fill="url(#sportGrad2)"
          />
          <Path                                                                                                                                
            d="M24 36L30 26L38 36H24Z"
            fill="#10B981"
            opacity={0.8}
          />                                                                                               
        </Svg>
      </View>

      {showText && (              
        <View style={styles.textContainer}>
          <Text style={[styles.brandText, { fontSize: textSizes[size], color: textColor }]}>
            Sport<Text style={styles.accentText}>Up</Text>
          </Text>         
          <View style={styles.dotIndicator} />
        </View>
      )}
    </View>         
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emblemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  brandText: {
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  accentText: {
    color: '#10B981',
    fontWeight: '900',
  },
  dotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginLeft: 3,
    marginBottom: 4,
  },
});
