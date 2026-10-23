import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Server, Wifi, Globe, Check, AlertCircle, RefreshCw, X } from 'lucide-react-native';
import axios from 'axios';
import { colors } from '../theme/colors';
import { radius, shadows, spacing } from '../theme/spacing';
import { getActiveApiUrl, setCustomApiUrl } from '../api/client';
import { ENV } from '../config/env';

interface ApiServerModalProps {
  visible: boolean;
  onClose: () => void;
  onUrlChanged?: (newUrl: string) => void;
}

export const ApiServerModal: React.FC<ApiServerModalProps> = ({
  visible,
  onClose,
  onUrlChanged,
}) => {
  const [inputUrl, setInputUrl] = useState(getActiveApiUrl());
  const [pingStatus, setPingStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [latency, setLatency] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const presets = [
    {
      id: 'tunnel',
      label: 'Tunnel Cloudflare (En ligne)',
      icon: Globe,
      url: ENV.API_BASE_URL,
    },
    {
      id: 'local_wifi',
      label: 'Wi-Fi Local (192.168.0.194)',
      icon: Wifi,
      url: ENV.FALLBACK_API_BASE_URL,
    },
    {
      id: 'emulator',
      label: 'Émulateur Android (10.0.2.2)',
      icon: Server,
      url: 'http://10.0.2.2:8000/api/v1',
    },
  ];

  useEffect(() => {
    if (visible) {
      const active = getActiveApiUrl();
      setInputUrl(active);
      setPingStatus('idle');
      setLatency(null);
    }
  }, [visible]);

  const testConnection = async (targetUrl: string) => {
    setPingStatus('testing');
    setLatency(null);
    const start = Date.now();
    try {
      const cleanUrl = targetUrl.trim().replace(/\/+$/, '');
      const response = await axios.get(`${cleanUrl}/sports`, { timeout: 6000 });
      const elapsed = Date.now() - start;
      if (response.status === 200) {
        setPingStatus('success');
        setLatency(elapsed);
      } else {
        setPingStatus('error');
      }
    } catch {
      setPingStatus('error');
    }
  };

  const handleApply = async () => {
    setSaving(true);
    try {
      await setCustomApiUrl(inputUrl);
      onUrlChanged?.(inputUrl);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Server size={20} color={colors.primary} />
              <Text style={styles.title}>Serveur API & Réseau</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.description}>
            Sélectionnez ou modifiez l'URL de l'API sans réinstaller l'application.
          </Text>

          {/* Presets */}
          <Text style={styles.sectionLabel}>Raccourcis préconfigurés</Text>
          <View style={styles.presetsList}>
            {presets.map((preset) => {
              const Icon = preset.icon;
              const isSelected = inputUrl === preset.url;
              return (
                <TouchableOpacity
                  key={preset.id}
                  style={[styles.presetCard, isSelected && styles.presetCardActive]}
                  onPress={() => {
                    setInputUrl(preset.url);
                    testConnection(preset.url);
                  }}
                >
                  <Icon size={18} color={isSelected ? colors.primary : colors.muted} />
                  <View style={styles.presetTextContainer}>
                    <Text style={[styles.presetLabel, isSelected && styles.presetLabelActive]}>
                      {preset.label}
                    </Text>
                    <Text style={styles.presetUrl} numberOfLines={1}>
                      {preset.url}
                    </Text>
                  </View>
                  {isSelected && <Check size={18} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom Input */}
          <Text style={styles.sectionLabel}>URL active de l'API</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={inputUrl}
              onChangeText={(text) => {
                setInputUrl(text);
                setPingStatus('idle');
              }}
              placeholder="https://.../api/v1"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.testBtn}
              onPress={() => testConnection(inputUrl)}
              disabled={pingStatus === 'testing'}
            >
              {pingStatus === 'testing' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <RefreshCw size={16} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>

          {/* Test Status Badge */}
          {pingStatus !== 'idle' && (
            <View style={[styles.statusBanner, pingStatus === 'success' ? styles.statusSuccess : styles.statusError]}>
              {pingStatus === 'success' ? (
                <>
                  <Check size={16} color="#10B981" />
                  <Text style={styles.statusSuccessText}>
                    Connexion établie avec succès {latency ? `(${latency}ms)` : ''}
                  </Text>
                </>
              ) : pingStatus === 'error' ? (
                <>
                  <AlertCircle size={16} color="#EF4444" />
                  <Text style={styles.statusErrorText}>Serveur injoignable à cette adresse.</Text>
                </>
              ) : null}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleApply} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>Appliquer</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(12, 28, 52, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 420,
    ...shadows.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  description: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  presetsList: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  presetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: '#E4E7EC',
    backgroundColor: '#F8FAFC',
    gap: spacing.sm,
  },
  presetCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#EAF1FE',
  },
  presetTextContainer: {
    flex: 1,
  },
  presetLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  presetLabelActive: {
    color: colors.primary,
  },
  presetUrl: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1.5,
    borderColor: '#E4E7EC',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    fontSize: 13,
    color: colors.text,
    backgroundColor: '#F8FAFC',
  },
  testBtn: {
    width: 44,
    height: 44,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radius.sm,
    marginBottom: spacing.md,
  },
  statusSuccess: {
    backgroundColor: '#ECFDF5',
  },
  statusSuccessText: {
    fontSize: 12,
    color: '#065F46',
    fontWeight: '600',
  },
  statusError: {
    backgroundColor: '#FEF2F2',
  },
  statusErrorText: {
    fontSize: 12,
    color: '#991B1B',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  cancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E4E7EC',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
  },
  saveBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
