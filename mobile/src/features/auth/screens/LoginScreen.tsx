import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { colors } from '../../../theme/colors';
import { radius, shadows, spacing } from '../../../theme/spacing';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { ChevronLeft, KeyRound, X, CheckCircle2, ArrowLeft } from 'lucide-react-native';
import { ErrorBanner } from '../../../components/ErrorBanner';
import { SportUpLogo } from '../../../components/SportUpLogo';
import { authApi } from '../api/authApi';
import { useAuthStore } from '../../../store/useAuthStore';
import { ApiError } from '../../../api/errorHandler';

interface LoginScreenProps {
  onNavigateRegister: () => void;
  onNavigateBack?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigateRegister, onNavigateBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // ─── Modal Mot de Passe Oublié ─────────────────────────────────────────────
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState<'request' | 'verify'>('request');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetErrorMessage, setResetErrorMessage] = useState<string | null>(null);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogin = async () => {
    setErrorMessage(null);
    setFieldErrors({});

    const cleanedEmail = email.trim().replace(/\s+/g, '');

    if (!cleanedEmail || !password) {
      setErrorMessage('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.login({ email: cleanedEmail, password });
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

  // ─── Étape 1 : Demande de code ─────────────────────────────────────────────
  const handleRequestResetCode = async () => {
    setResetErrorMessage(null);
    const cleaned = resetEmail.trim().replace(/\s+/g, '');
    if (!cleaned) {
      setResetErrorMessage('Veuillez saisir votre adresse e-mail.');
      return;
    }

    setResetLoading(true);
    try {
      const res = await authApi.forgotPassword({ email: cleaned });
      setResetStep('verify');
      if (res.debug_code) {
        setResetCode(res.debug_code);
        setResetSuccessMessage(`Code de sécurité généré : ${res.debug_code}`);
      } else {
        setResetSuccessMessage('Un code de sécurité à 6 chiffres a été envoyé à votre adresse.');
      }
    } catch (err: any) {
      setResetErrorMessage(err.message || 'Impossible d\'envoyer le code de réinitialisation.');
    } finally {
      setResetLoading(false);
    }
  };

  // ─── Étape 2 : Confirmation et mise à jour du mot de passe ──────────────────
  const handleConfirmResetPassword = async () => {
    setResetErrorMessage(null);
    const cleanedCode = resetCode.trim();
    if (!cleanedCode) {
      setResetErrorMessage('Veuillez entrer le code de sécurité reçu.');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setResetErrorMessage('Le nouveau mot de passe doit comporter au moins 8 caractères.');
      return;
    }
    if (newPassword !== newPasswordConfirmation) {
      setResetErrorMessage('La confirmation du mot de passe ne correspond pas.');
      return;
    }

    setResetLoading(true);
    try {
      await authApi.resetPassword({
        email: resetEmail.trim(),
        code: cleanedCode,
        password: newPassword,
        password_confirmation: newPasswordConfirmation,
      });

      // Remplir automatiquement le login avec le nouveau mot de passe
      setEmail(resetEmail.trim());
      setPassword(newPassword);

      Alert.alert(
        'Mot de passe réinitialisé',
        'Votre mot de passe a été mis à jour avec succès dans la base de données. Vous pouvez maintenant vous connecter.',
        [
          {
            text: 'Se connecter',
            onPress: () => {
              setShowResetModal(false);
              setResetStep('request');
              setResetCode('');
              setNewPassword('');
              setNewPasswordConfirmation('');
            },
          },
        ]
      );
    } catch (err: any) {
      setResetErrorMessage(err.message || 'Échec de la réinitialisation du mot de passe.');
    } finally {
      setResetLoading(false);
    }
  };

  const openForgotPasswordModal = () => {
    setResetEmail(email.trim());
    setResetStep('request');
    setResetCode('');
    setNewPassword('');
    setNewPasswordConfirmation('');
    setResetErrorMessage(null);
    setResetSuccessMessage(null);
    setShowResetModal(true);
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
          <Text style={styles.title}>Bon retour sur le terrain</Text>
          <Text style={styles.subtitle}>
            Connecte-toi pour retrouver ton équipe et rejoindre les matchs près de chez toi.
          </Text>
        </View>

        {errorMessage && <ErrorBanner message={errorMessage} />}

        <View style={styles.card}>
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
            label="Mot de passe"
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            error={fieldErrors.password?.[0]}
          />

          {/* Lien Mot de passe oublié */}
          <TouchableOpacity
            style={styles.forgotPasswordRow}
            onPress={openForgotPasswordModal}
            activeOpacity={0.7}
          >
            <KeyRound size={13} color={colors.primary} style={{ marginRight: 5 }} />
            <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
          </TouchableOpacity>

          <Button
            title="Se connecter"
            onPress={handleLogin}
            loading={loading}
            style={styles.submitBtn}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Pas encore de compte ? </Text>
          <TouchableOpacity onPress={onNavigateRegister} activeOpacity={0.8}>
            <Text style={styles.registerLink}>Créer un profil</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── MODALE MOT DE PASSE OUBLIÉ ── */}
      <Modal
        visible={showResetModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowResetModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            {/* Header modale */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                {resetStep === 'verify' && (
                  <TouchableOpacity
                    onPress={() => {
                      setResetStep('request');
                      setResetErrorMessage(null);
                    }}
                    style={styles.modalBackBtn}
                  >
                    <ArrowLeft size={18} color={colors.navy} />
                  </TouchableOpacity>
                )}
                <View style={styles.modalIconCircle}>
                  <KeyRound size={20} color={colors.primary} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>
                    {resetStep === 'request' ? 'Mot de passe oublié' : 'Nouveau mot de passe'}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    {resetStep === 'request'
                      ? 'Récupération sécurisée via votre adresse e-mail'
                      : 'Validation du code de sécurité et nouveau mot de passe'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setShowResetModal(false)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color={colors.muted} />
              </TouchableOpacity>
            </View>

            {/* Messages d'erreur / succès */}
            {resetErrorMessage && <ErrorBanner message={resetErrorMessage} />}
            {resetSuccessMessage && (
              <View style={styles.successBanner}>
                <CheckCircle2 size={16} color="#059669" style={{ marginRight: 6 }} />
                <Text style={styles.successBannerText}>{resetSuccessMessage}</Text>
              </View>
            )}

            {/* ÉTAPE 1 : Saisie de l'email */}
            {resetStep === 'request' ? (
              <View style={styles.modalBody}>
                <Text style={styles.stepInstruction}>
                  Saisissez l'adresse e-mail associée à votre compte SportUp. Un code de réinitialisation vous sera transmis.
                </Text>

                <Input
                  label="Adresse e-mail du compte"
                  placeholder="nom@exemple.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={resetEmail}
                  onChangeText={setResetEmail}
                />

                <Button
                  title="Envoyer le code de sécurité"
                  onPress={handleRequestResetCode}
                  loading={resetLoading}
                  style={styles.modalSubmitBtn}
                />
              </View>
            ) : (
              /* ÉTAPE 2 : Saisie du code et nouveau mot de passe */
              <View style={styles.modalBody}>
                <Text style={styles.stepInstruction}>
                  Entrez le code à 6 chiffres reçu pour <Text style={{ fontWeight: '700', color: colors.navy }}>{resetEmail}</Text>.
                </Text>

                <Input
                  label="Code de sécurité (6 chiffres)"
                  placeholder="123456"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={resetCode}
                  onChangeText={setResetCode}
                />

                <Input
                  label="Nouveau mot de passe (8+ caractères)"
                  placeholder="••••••••"
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                />

                <Input
                  label="Confirmer le nouveau mot de passe"
                  placeholder="••••••••"
                  secureTextEntry
                  value={newPasswordConfirmation}
                  onChangeText={setNewPasswordConfirmation}
                />

                <Button
                  title="Réinitialiser mon mot de passe"
                  onPress={handleConfirmResetPassword}
                  loading={resetLoading}
                  style={styles.modalSubmitBtn}
                />

                <TouchableOpacity
                  style={styles.resendCodeBtn}
                  onPress={handleRequestResetCode}
                  disabled={resetLoading}
                >
                  <Text style={styles.resendCodeText}>Renvoyer un nouveau code</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    justifyContent: 'center',
    minHeight: '100%',
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
  forgotPasswordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: -4,
    marginBottom: spacing.md,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  submitBtn: {
    marginTop: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  footerText: {
    fontSize: 14,
    color: colors.muted,
  },
  registerLink: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '800',
  },

  // ── Modale Styles ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(12, 24, 39, 0.7)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: spacing.xl,
    maxHeight: '90%',
    ...shadows.card,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  modalBackBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  modalIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy,
  },
  modalSubtitle: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalBody: {
    marginTop: spacing.xs,
  },
  stepInstruction: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: spacing.md,
  },
  modalSubmitBtn: {
    marginTop: spacing.sm,
  },
  resendCodeBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  resendCodeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: spacing.md,
  },
  successBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#065F46',
    fontWeight: '600',
  },
});
