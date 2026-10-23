import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { colors } from '../../../theme/colors';
import { radius, shadows, spacing } from '../../../theme/spacing';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { ChevronLeft } from 'lucide-react-native';
import { ErrorBanner } from '../../../components/ErrorBanner';
import { SportUpLogo } from '../../../components/SportUpLogo';
import { authApi } from '../api/authApi';
import { useAuthStore } from '../../../store/useAuthStore';
import { ApiError } from '../../../api/errorHandler';

interface RegisterScreenProps {
  onNavigateLogin: () => void;
  onNavigateBack?: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ onNavigateLogin, onNavigateBack }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const setAuth = useAuthStore((state) => state.setAuth);

  const handleRegister = async () => {
    setErrorMessage(null);
    setFieldErrors({});

    const cleanedEmail = email.trim().replace(/\s+/g, '');
    const cleanedUsername = username.trim();

    if (!cleanedUsername || !cleanedEmail || !password || !passwordConfirmation) {
      setErrorMessage('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    if (password !== passwordConfirmation) {
      setFieldErrors({ password_confirmation: ['Les mots de passe ne correspondent pas.'] });
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.register({
        username: cleanedUsername,
        email: cleanedEmail,
        password,
        password_confirmation: passwordConfirmation,
        city: city.trim() || undefined,
      });
      setAuth(response.token, response.user);
    } catch (err: any) {
      const apiError = err as ApiError;
      setErrorMessage(apiError.message);
      if (apiError.fieldErrors) {
        setFieldErrors(apiError.fieldErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topNavRow}>
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
          <View style={styles.brandHeader}>
            <SportUpLogo size="sm" variant="dark" />
          </View>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Rejoins la communauté</Text>
          <Text style={styles.subtitle}>
            Crée ton profil sportif en 1 minute et défie les équipes de ta ville.
          </Text>
        </View>

        {errorMessage && <ErrorBanner message={errorMessage} />}

        <View style={styles.card}>
          <Input
            label="Nom d'utilisateur"
            placeholder="Ex. Fenosoa Rakoto"
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
            error={fieldErrors.username?.[0]}
          />

          <Input
            label="Adresse e-mail"
            placeholder="nom@exemple.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            error={fieldErrors.email?.[0]}
          />

          <Input
            label="Ville (Madagascar)"
            placeholder="Ex. Antananarivo, Tamatave..."
            value={city}
            onChangeText={setCity}
            error={fieldErrors.city?.[0]}
          />

          <Input
            label="Mot de passe"
            placeholder="Minimum 8 caractères"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            error={fieldErrors.password?.[0]}
          />

          <Input
            label="Confirmer le mot de passe"
            placeholder="Confirmer votre mot de passe"
            secureTextEntry
            value={passwordConfirmation}
            onChangeText={setPasswordConfirmation}
            error={fieldErrors.password_confirmation?.[0]}
          />

          <Button
            title="Créer mon compte"
            onPress={handleRegister}
            loading={loading}
            style={styles.submitBtn}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Déjà membre ? </Text>
          <TouchableOpacity onPress={onNavigateLogin} activeOpacity={0.8}>
            <Text style={styles.loginLink}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: '#EEF2F6',
    borderRadius: radius.pill,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
    marginLeft: 2,
  },
  brandHeader: {
    alignItems: 'flex-end',
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.navy,
    letterSpacing: -0.6,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  submitBtn: {
    marginTop: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  footerText: {
    fontSize: 14,
    color: colors.muted,
  },
  loginLink: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '800',
  },
});
