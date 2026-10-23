import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  Alert,
  PermissionsAndroid,
} from 'react-native';
import {
  ChevronLeft,
  Send,
  MessageCircle,
  Users,
  Camera,
  Image as ImageIcon,
  X,
  Maximize2,
} from 'lucide-react-native';
import { launchCamera, launchImageLibrary, Asset } from 'react-native-image-picker';
import { colors } from '../../../theme/colors';
import { radius, spacing } from '../../../theme/spacing';
import { chatApi } from '../../../api/chatApi';
import { ConversationMessage } from '../../../types';
import { useAuthStore } from '../../../store/useAuthStore';
import { websocketService } from '../../../services/websocketService';

interface ChatScreenProps {
  sessionId?: number;
  teamId?: number;
  conversationId?: number;
  sessionTitle?: string;
  onNavigateBack: () => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  sessionId,
  teamId,
  conversationId: initialConversationId,
  sessionTitle = 'Discussion',
  onNavigateBack,
}) => {
  const currentUser = useAuthStore((state) => state.user);
  const [conversationId, setConversationId] = useState<number | null>(initialConversationId || null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [mediaModalVisible, setMediaModalVisible] = useState(false);
  const [fullscreenImageUrl, setFullscreenImageUrl] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const loadConversation = async () => {
    try {
      setLoading(true);
      if (teamId) {
        const conv = await chatApi.getTeamConversation(teamId);
        setConversationId(conv.id);
        setMessages(conv.messages || []);
      } else if (sessionId) {
        const conv = await chatApi.getSessionConversation(sessionId);
        setConversationId(conv.id);
        setMessages(conv.messages || []);
      } else if (initialConversationId) {
        setConversationId(initialConversationId);
        const msgs = await chatApi.getMessages(initialConversationId);
        setMessages(msgs || []);
      }
    } catch (e) {
      console.warn('Chat load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversation();
  }, [sessionId, teamId, initialConversationId]);

  // Real-time synchronization: WebSockets (instant push) + Adaptive Polling fallback
  useEffect(() => {
    if (!conversationId) return;

    // 1. WebSocket Realtime Subscription
    const unsubscribeWs = websocketService.subscribe(
      `conversation.${conversationId}`,
      'ChatMessageSent',
      (incomingMsg: any) => {
        if (!incomingMsg || !incomingMsg.id) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === incomingMsg.id)) {
            return prev;
          }
          return [
            ...prev,
            {
              id: incomingMsg.id,
              conversation_id: incomingMsg.conversation_id,
              body: incomingMsg.body,
              image_url: incomingMsg.image_url,
              sender_id: incomingMsg.sender_id,
              created_at: incomingMsg.created_at,
              sender: {
                id: incomingMsg.sender_id,
                username: incomingMsg.sender_name || 'Joueur',
                photo_path: incomingMsg.sender_photo || null,
              },
            },
          ];
        });
      }
    );

    // 2. Adaptive Polling (Heartbeat guard if WS active, otherwise 2.5s)
    const intervalMs = websocketService.connected ? 15000 : 2500;
    const interval = setInterval(() => {
      chatApi.getMessages(conversationId)
        .then((fresh) => {
          if (Array.isArray(fresh)) {
            setMessages((prev) => {
              if (fresh.length !== prev.length || (fresh[fresh.length - 1]?.id !== prev[prev.length - 1]?.id)) {
                return fresh;
              }
              return prev;
            });
          }
        })
        .catch(() => {});
    }, intervalMs);

    return () => {
      unsubscribeWs();
      clearInterval(interval);
    };
  }, [conversationId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Permission Caméra',
          message: 'SportUp a besoin d’accès à votre appareil photo pour envoyer des photos de terrain ou vestiaires.',
          buttonPositive: 'Autoriser',
          buttonNegative: 'Annuler',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  };

  const handleTakePhoto = async () => {
    setMediaModalVisible(false);
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert('Permission refusée', 'Accès caméra requis.');
      return;
    }

    launchCamera(
      {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1200,
        maxHeight: 1200,
      },
      (response) => {
        if (response.didCancel || response.errorCode) return;
        if (response.assets && response.assets.length > 0) {
          setSelectedAsset(response.assets[0]);
        }
      }
    );
  };

  const handleChooseFromGallery = () => {
    setMediaModalVisible(false);
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1200,
        maxHeight: 1200,
      },
      (response) => {
        if (response.didCancel || response.errorCode) return;
        if (response.assets && response.assets.length > 0) {
          setSelectedAsset(response.assets[0]);
        }
      }
    );
  };

  const handleSend = async () => {
    if ((!inputText.trim() && !selectedAsset) || !conversationId) return;
    const body = inputText.trim();
    const assetToSend = selectedAsset;
    setInputText('');
    setSelectedAsset(null);
    setSending(true);

    // Optimistic message
    const tempId = Date.now();
    const tempMsg: ConversationMessage = {
      id: tempId,
      body,
      image_url: assetToSend?.uri || null,
      sender_id: currentUser?.id || 0,
      sender: {
        id: currentUser?.id || 0,
        username: currentUser?.username || 'Moi',
      },
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const savedMsg = await chatApi.sendMessage(
        conversationId,
        body,
        assetToSend?.uri
          ? {
              uri: assetToSend.uri,
              type: assetToSend.type,
              fileName: assetToSend.fileName,
            }
          : undefined
      );
      setMessages((prev) => prev.map((m) => (m.id === tempId ? savedMsg : m)));
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message || e.message || 'Impossible d\'envoyer le message.');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch {
      return '';
    }
  };

  const renderMessage = ({ item }: { item: ConversationMessage }) => {
    const isMe = item.sender_id === currentUser?.id;
    const timeStr = formatTime(item.created_at);

    return (
      <View style={[styles.msgRow, isMe ? styles.msgMe : styles.msgOther]}>
        {!isMe && (
          <View style={styles.senderAvatar}>
            <Text style={styles.senderAvatarText}>
              {item.sender?.username ? item.sender.username.substring(0, 2).toUpperCase() : 'SP'}
            </Text>
          </View>
        )}
        <View style={[styles.msgBubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          {!isMe && <Text style={styles.senderName}>{item.sender?.username || 'Coéquipier'}</Text>}

          {/* Image Bubble Preview */}
          {item.image_url ? (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setFullscreenImageUrl(item.image_url || null)}
              style={styles.imageWrapper}
            >
              <Image
                source={{ uri: item.image_url }}
                style={styles.messageImage}
                resizeMode="cover"
              />
              <View style={styles.expandIconBadge}>
                <Maximize2 size={12} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          ) : null}

          {/* Text body if available */}
          {!!item.body && (
            <Text style={[styles.msgBody, isMe ? styles.bodyMe : styles.bodyOther]}>
              {item.body}
            </Text>
          )}

          <Text style={[styles.msgTime, isMe ? styles.timeMe : styles.timeOther]}>
            {timeStr}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Connexion au salon de discussion...</Text>
      </View>
    );
  }

  const canSend = (inputText.trim().length > 0 || selectedAsset !== null) && !sending;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onNavigateBack} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronLeft size={24} color={colors.navy} />
        </TouchableOpacity>

        <View style={styles.headerTitleBox}>
          <View style={styles.titleRow}>
            {teamId ? (
              <Users size={16} color={colors.primary} style={{ marginRight: 6 }} />
            ) : (
              <MessageCircle size={16} color={colors.primary} style={{ marginRight: 6 }} />
            )}
            <Text style={styles.headerTitle} numberOfLines={1}>{sessionTitle}</Text>
          </View>
          <View style={styles.liveIndicatorRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveStatusText}>
              {teamId ? 'Discussion d\'équipe en direct' : 'Chat de la rencontre sportive'}
            </Text>
          </View>
        </View>
      </View>

      {/* Messages list */}
      {messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MessageCircle size={44} color={colors.muted} strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>Lancez la discussion !</Text>
          <Text style={styles.emptyText}>
            Partagez des photos de l'état du terrain, tableau tactique ou confirmez votre venue avec vos coéquipiers.
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      {/* Image Preview bar before sending */}
      {selectedAsset && (
        <View style={styles.selectedAssetBar}>
          <Image source={{ uri: selectedAsset.uri }} style={styles.previewThumb} />
          <View style={styles.previewInfo}>
            <Text style={styles.previewTitle}>Photo prête à envoyer</Text>
            <Text style={styles.previewSub}>Ajoutez un commentaire si besoin</Text>
          </View>
          <TouchableOpacity
            style={styles.removeAssetBtn}
            onPress={() => setSelectedAsset(null)}
            activeOpacity={0.8}
          >
            <X size={16} color={colors.danger} />
          </TouchableOpacity>
        </View>
      )}

      {/* Input row */}
      <View style={styles.inputRow}>
        <TouchableOpacity
          style={styles.attachBtn}
          onPress={() => setMediaModalVisible(true)}
          disabled={sending}
          activeOpacity={0.75}
        >
          <Camera size={20} color={colors.primary} />
        </TouchableOpacity>

        <TextInput
          style={styles.textInput}
          placeholder={selectedAsset ? "Ajouter une légende..." : "Écrire un message..."}
          placeholderTextColor={colors.muted}
          value={inputText}
          onChangeText={setInputText}
          multiline
        />

        <TouchableOpacity
          style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Send size={18} color="#FFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* Media Source Modal (Camera vs Gallery) */}
      <Modal
        visible={mediaModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMediaModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMediaModalVisible(false)}
        >
          <View style={styles.mediaSheet}>
            <Text style={styles.sheetTitle}>Envoyer une photo</Text>
            <Text style={styles.sheetSubtitle}>
              Terrain, vestiaires, tableau tactique ou maillots
            </Text>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={handleTakePhoto}
              activeOpacity={0.7}
            >
              <View style={[styles.sheetIconBox, { backgroundColor: '#EEF2FF' }]}>
                <Camera size={22} color={colors.primary} />
              </View>
              <View style={styles.sheetOptionText}>
                <Text style={styles.sheetOptionTitle}>Prendre une photo</Text>
                <Text style={styles.sheetOptionSub}>Ouvrir l'appareil photo</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={handleChooseFromGallery}
              activeOpacity={0.7}
            >
              <View style={[styles.sheetIconBox, { backgroundColor: '#F0FDF4' }]}>
                <ImageIcon size={22} color="#16A34A" />
              </View>
              <View style={styles.sheetOptionText}>
                <Text style={styles.sheetOptionTitle}>Choisir depuis la galerie</Text>
                <Text style={styles.sheetOptionSub}>Photos et captures d'écran</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetCancelBtn}
              onPress={() => setMediaModalVisible(false)}
            >
              <Text style={styles.sheetCancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Fullscreen Image Preview Modal */}
      <Modal
        visible={!!fullscreenImageUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setFullscreenImageUrl(null)}
      >
        <View style={styles.fullscreenContainer}>
          <TouchableOpacity
            style={styles.fullscreenCloseBtn}
            onPress={() => setFullscreenImageUrl(null)}
            activeOpacity={0.8}
          >
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
          {fullscreenImageUrl && (
            <Image
              source={{ uri: fullscreenImageUrl }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  loadingText: { fontSize: 13, color: colors.muted, marginTop: spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 44 : spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backBtn: { padding: spacing.xs, marginRight: spacing.xs },
  headerTitleBox: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: colors.navy, flex: 1 },
  liveIndicatorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 5 },
  liveStatusText: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.navy, marginTop: spacing.md },
  emptyText: { color: colors.muted, textAlign: 'center', fontSize: 13, marginTop: 4, lineHeight: 18, maxWidth: 280 },
  listContent: { padding: spacing.md, paddingBottom: spacing.lg },
  msgRow: { flexDirection: 'row', marginBottom: spacing.md, alignItems: 'flex-end' },
  msgMe: { justifyContent: 'flex-end' },
  msgOther: { justifyContent: 'flex-start' },
  senderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  senderAvatarText: { fontSize: 11, fontWeight: '800', color: colors.primary },
  msgBubble: { maxWidth: '80%', borderRadius: radius.lg, padding: spacing.sm },
  bubbleMe: { backgroundColor: colors.primary, borderBottomRightRadius: 2 },
  bubbleOther: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight, borderBottomLeftRadius: 2 },
  senderName: { fontSize: 11, fontWeight: '800', color: colors.primary, marginBottom: 4 },
  imageWrapper: {
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: 4,
    position: 'relative',
  },
  messageImage: {
    width: 220,
    height: 160,
    borderRadius: radius.md,
  },
  expandIconBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 4,
    borderRadius: 4,
  },
  msgBody: { fontSize: 14, lineHeight: 19, paddingHorizontal: 4, paddingTop: 2 },
  bodyMe: { color: '#FFFFFF' },
  bodyOther: { color: colors.navy },
  msgTime: { fontSize: 10, alignSelf: 'flex-end', marginTop: 4, paddingHorizontal: 4 },
  timeMe: { color: 'rgba(255, 255, 255, 0.75)' },
  timeOther: { color: colors.muted },
  selectedAssetBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  previewThumb: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: '#E2E8F0',
  },
  previewInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy,
  },
  previewSub: {
    fontSize: 11,
    color: colors.muted,
  },
  removeAssetBtn: {
    padding: spacing.xs,
    backgroundColor: '#FEE2E2',
    borderRadius: radius.pill,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.navy,
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  sendBtnDisabled: { opacity: 0.4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  mediaSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 36 : spacing.lg,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.navy,
  },
  sheetSubtitle: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: spacing.md,
    marginTop: 2,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  sheetIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  sheetOptionText: {
    flex: 1,
  },
  sheetOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy,
  },
  sheetOptionSub: {
    fontSize: 12,
    color: colors.muted,
  },
  sheetCancelBtn: {
    marginTop: spacing.md,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: radius.md,
  },
  sheetCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy,
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 48 : 20,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    padding: 8,
    borderRadius: 20,
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
});
