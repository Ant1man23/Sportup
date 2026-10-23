import React, { useState, useEffect, useRef, Component, ReactNode, useCallback } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  AppState,
  Platform,
  Animated,
  BackHandler,
} from 'react-native';
import { Home, Compass, Plus, Users, User } from 'lucide-react-native';
import { QueryClient, QueryClientProvider, onlineManager, focusManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { colors } from './src/theme/colors';
import { spacing, shadows } from './src/theme/spacing';
import { useAuthStore } from './src/store/useAuthStore';
import { notificationPolling } from './src/services/notificationPolling';
import { requestNotificationPermission } from './src/services/localNotifications';
import { fcmService } from './src/services/fcmService';
import { deepLinkService } from './src/services/deepLinkService';

// Screens
import { HomeScreen } from './src/features/home/screens/HomeScreen';
import { ExploreMapScreen } from './src/features/sessions/screens/ExploreMapScreen';
import { TeamsListScreen } from './src/features/teams/screens/TeamsListScreen';
import { CreateSessionScreen } from './src/features/sessions/screens/CreateSessionScreen';
import { SessionDetailsScreen } from './src/features/sessions/screens/SessionDetailsScreen';
import { LiveMatchScreen } from './src/features/matches/screens/LiveMatchScreen';
import { MatchSummaryScreen } from './src/features/matches/screens/MatchSummaryScreen';
import { StatisticsScreen } from './src/features/statistics/screens/StatisticsScreen';
import { ProfileScreen } from './src/features/profile/screens/ProfileScreen';
import { LoginScreen } from './src/features/auth/screens/LoginScreen';
import { RegisterScreen } from './src/features/auth/screens/RegisterScreen';
import { WelcomeScreen } from './src/features/auth/screens/WelcomeScreen';
import { TournamentsScreen } from './src/features/tournaments/screens/TournamentsScreen';
import { NotificationsScreen } from './src/features/notifications/screens/NotificationsScreen';
import { ChatScreen } from './src/features/chat/screens/ChatScreen';
import { ConversationsListScreen } from './src/features/chat/screens/ConversationsListScreen';
import { NotificationPreferencesScreen } from './src/features/notifications/screens/NotificationPreferencesScreen';
import { CalendarScreen } from './src/features/sessions/screens/CalendarScreen';
import { TeamDetailScreen } from './src/features/teams/screens/TeamDetailScreen';
import { VenuesScreen } from './src/features/venues/screens/VenuesScreen';

// ErrorBoundary
interface ErrorBoundaryProps {
  children: ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.log('SportUp Render Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1827', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ color: colors.primary, fontSize: 24, fontWeight: 'bold', marginBottom: 10 }}>SportUp</Text>
          <Text style={{ color: '#FFFFFF', textAlign: 'center', marginBottom: 20 }}>
            {this.state.error?.message || 'Une erreur inattendue est survenue.'}
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 }}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Réessayer</Text>
          </TouchableOpacity>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,
    },
  },
});

type TabType = 'home' | 'map' | 'teams' | 'profile';
type ScreenState =
  | { name: 'tabs'; tab: TabType }
  | { name: 'create_session' }
  | { name: 'session_detail'; id: number }
  | { name: 'live_match'; matchId: number }
  | { name: 'match_summary'; matchId: number }
  | { name: 'stats' }
  | { name: 'tournaments' }
  | { name: 'notifications' }
  | { name: 'chat'; sessionId?: number; teamId?: number; conversationId?: number; sessionTitle?: string }
  | { name: 'notification_preferences' }
  | { name: 'calendar' }
  | { name: 'team_detail'; teamId: number }
  | { name: 'conversations' }
  | { name: 'venues' };

// ─── In-App Toast Component ────────────────────────────────────────────────
function InAppToast({ title, body, onDismiss }: { title: string; body: string; onDismiss: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(3500),
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => onDismiss());
  }, []);

  return (
    <Animated.View style={{
      position: 'absolute', top: 16, left: 16, right: 16, zIndex: 9999,
      backgroundColor: '#1A2E3B', borderRadius: 14, padding: 14,
      borderLeftWidth: 3, borderLeftColor: '#00D4AA',
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35, shadowRadius: 12, elevation: 10,
      opacity,
    }}>
      <Text style={{ color: '#00D4AA', fontWeight: '700', fontSize: 13, marginBottom: 3 }}>{title}</Text>
      <Text style={{ color: '#CBD5E1', fontSize: 12, lineHeight: 17 }} numberOfLines={2}>{body}</Text>
    </Animated.View>
  );
}

function MainAppContent() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [authMode, setAuthMode] = useState<'welcome' | 'login' | 'register'>('welcome');
  const [screenState, setScreenState] = useState<ScreenState>({
    name: 'tabs',
    tab: 'home',
  });
  const screenStateRef = useRef<ScreenState>(screenState);
  screenStateRef.current = screenState;

  // History stack for back navigation
  const historyRef = useRef<ScreenState[]>([]);

  const navigateTo = useCallback((nextScreen: ScreenState) => {
    const current = screenStateRef.current;
    if (JSON.stringify(current) !== JSON.stringify(nextScreen)) {
      historyRef.current.push(current);
    }
    setScreenState(nextScreen);
  }, []);

  const goBack = useCallback((): boolean => {
    if (historyRef.current.length > 0) {
      const prev = historyRef.current.pop()!;
      setScreenState(prev);
      return true;
    }
    // If on a secondary tab, return to home tab
    if (screenStateRef.current.name === 'tabs' && screenStateRef.current.tab !== 'home') {
      setScreenState({ name: 'tabs', tab: 'home' });
      return true;
    }
    // If on any sub-screen without history, return to home tab
    if (screenStateRef.current.name !== 'tabs') {
      setScreenState({ name: 'tabs', tab: 'home' });
      return true;
    }
    return false; // On home tab: let Android system exit app
  }, []);

  const switchTab = useCallback((tab: TabType) => {
    if (screenStateRef.current.name === 'tabs' && screenStateRef.current.tab === tab) {
      return;
    }
    navigateTo({ name: 'tabs', tab });
  }, [navigateTo]);

  const [toast, setToast] = useState<{ title: string; body: string } | null>(null);

  // ─── Hardware Back Button (Android UX) ──────────────────────────────────────
  useEffect(() => {
    const onBackPress = () => {
      if (!isAuthenticated) {
        if (authMode !== 'welcome') {
          setAuthMode('welcome');
          return true;
        }
        return false;
      }
      return goBack();
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [isAuthenticated, authMode, goBack]);

  // ─── Notifications (Polling + FCM) ──────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) {
      notificationPolling.stop();
      fcmService.destroy(true);
      return;
    }

    // 1. Polling (fallback / foreground in-app)
    requestNotificationPermission().then(() => {
      notificationPolling.start();
    });

    const unsubscribePolling = notificationPolling.onForegroundNotification((n) => {
      setToast({ title: n.title, body: n.body });
    });

    // 2. FCM (push natif background + killed)
    fcmService.init();
    const unsubscribeFcm = fcmService.onForegroundMessage((title, body) => {
      setToast({ title, body });
    });

    const unsubscribeFcmClick = fcmService.onNotificationOpened((data) => {
      console.log('[App] Clic notification FCM avec données:', data);
      if (data.team_id || data.type === 'team_invitation') {
        const teamId = Number(data.team_id);
        if (!isNaN(teamId) && teamId > 0) {
          navigateTo({ name: 'team_detail', teamId });
        }
      } else if (data.session_id || data.related_session_id || data.type === 'session_reminder') {
        const sessionId = Number(data.session_id || data.related_session_id);
        if (!isNaN(sessionId) && sessionId > 0) {
          navigateTo({ name: 'session_detail', id: sessionId });
        }
      } else if (data.conversation_id || data.type === 'new_message') {
        navigateTo({
          name: 'chat',
          sessionId: data.session_id ? Number(data.session_id) : undefined,
          teamId: data.team_id ? Number(data.team_id) : undefined,
        });
      } else if (data.tournament_id || data.type === 'tournament_invitation' || data.type === 'tournament_registration') {
        navigateTo({ name: 'tournaments' });
      } else if (data.match_id || data.related_match_id) {
        const matchId = Number(data.match_id || data.related_match_id);
        if (!isNaN(matchId) && matchId > 0) {
          navigateTo({ name: 'live_match', matchId });
        }
      }
    });

    return () => {
      unsubscribePolling();
      notificationPolling.stop();
      unsubscribeFcm();
      unsubscribeFcmClick();
      fcmService.destroy(false); // Ne pas désinscrire le token à chaque démontage
    };
  }, [isAuthenticated, navigateTo]);

  // ─── Deep Linking (sportup:// & https://sportup.app) ────────────────────────
  useEffect(() => {
    const unsubscribeDeepLink = deepLinkService.init((target) => {
      switch (target.type) {
        case 'team':
          navigateTo({ name: 'team_detail', teamId: target.teamId });
          break;
        case 'session':
          navigateTo({ name: 'session_detail', id: target.sessionId });
          break;
        case 'match':
          navigateTo({ name: 'live_match', matchId: target.matchId });
          break;
        case 'chat':
          navigateTo({
            name: 'chat',
            sessionId: target.sessionId,
            teamId: target.teamId,
          });
          break;
        case 'tournaments':
          navigateTo({ name: 'tournaments' });
          break;
      }
    });

    return () => {
      unsubscribeDeepLink();
    };
  }, [navigateTo]);

  React.useEffect(() => {
    try {
      if (typeof NetInfo?.addEventListener === 'function') {
        onlineManager.setEventListener((setOnline) => {
          return NetInfo.addEventListener((state) => {
            setOnline(!!state.isConnected);
          });
        });
      }

      focusManager.setEventListener((handleFocus) => {
        const subscription = AppState.addEventListener('change', (state) => {
          handleFocus(state === 'active');
        });
        return () => subscription?.remove?.();
      });
    } catch (e) {
      console.warn('React Query network/focus listeners init warning:', e);
    }
  }, []);

  if (!isAuthenticated) {
    if (authMode === 'welcome') {
      return (
        <WelcomeScreen
          onNavigateLogin={() => setAuthMode('login')}
          onNavigateRegister={() => setAuthMode('register')}
        />
      );
    }
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.navy} />
        {authMode === 'login' ? (
          <LoginScreen
            onNavigateRegister={() => setAuthMode('register')}
            onNavigateBack={() => setAuthMode('welcome')}
          />
        ) : (
          <RegisterScreen
            onNavigateLogin={() => setAuthMode('login')}
            onNavigateBack={() => setAuthMode('welcome')}
          />
        )}
      </SafeAreaView>
    );
  }

  const currentTab = screenState.name === 'tabs' ? screenState.tab : 'home';

  const renderCurrentScreen = () => {
    switch (screenState.name) {
      case 'create_session':
        return (
          <CreateSessionScreen
            onSuccess={(sessionId) => navigateTo({ name: 'session_detail', id: sessionId })}
            onCancel={goBack}
          />
        );

      case 'session_detail':
        return (
          <SessionDetailsScreen
            sessionId={screenState.id}
            onNavigateBack={goBack}
            onNavigateMatch={(matchId) => navigateTo({ name: 'live_match', matchId })}
            onNavigateChat={(sessionId, title) => navigateTo({ name: 'chat', sessionId, sessionTitle: title })}
          />
        );

      case 'chat':
        return (
          <ChatScreen
            sessionId={screenState.sessionId}
            teamId={screenState.teamId}
            conversationId={screenState.conversationId}
            sessionTitle={screenState.sessionTitle}
            onNavigateBack={goBack}
          />
        );

      case 'live_match':
        return (
          <LiveMatchScreen
            matchId={screenState.matchId}
            onFinishMatch={(matchId) => navigateTo({ name: 'match_summary', matchId })}
            onNavigateBack={goBack}
          />
        );

      case 'match_summary':
        return (
          <MatchSummaryScreen
            matchId={screenState.matchId}
            onNavigateHome={() => setScreenState({ name: 'tabs', tab: 'home' })}
            onNavigateStats={() => navigateTo({ name: 'stats' })}
            onNavigateBack={goBack}
          />
        );

      case 'stats':
        return (
          <StatisticsScreen
            onNavigateBack={goBack}
          />
        );

      case 'tournaments':
        return (
          <TournamentsScreen
            onNavigateBack={goBack}
            onNavigateMatch={(matchId) => navigateTo({ name: 'live_match', matchId })}
          />
        );

      case 'notifications':
        return (
          <NotificationsScreen
            onNavigateBack={goBack}
            onSelectSession={(id) => navigateTo({ name: 'session_detail', id })}
            onSelectTeam={(teamId) => navigateTo({ name: 'team_detail', teamId })}
            onNavigateTournaments={() => navigateTo({ name: 'tournaments' })}
            onNavigateChat={(sessionId, teamId, title) => {
              if (sessionId) {
                navigateTo({ name: 'chat', sessionId, sessionTitle: title });
              } else if (teamId) {
                navigateTo({ name: 'chat', teamId, sessionTitle: title });
              } else {
                navigateTo({ name: 'conversations' });
              }
            }}
          />
        );

      case 'notification_preferences':
        return (
          <NotificationPreferencesScreen
            onNavigateBack={goBack}
          />
        );

      case 'calendar':
        return (
          <CalendarScreen
            onSelectSession={(id) => navigateTo({ name: 'session_detail', id })}
            onNavigateBack={goBack}
          />
        );

      case 'team_detail':
        return (
          <TeamDetailScreen
            teamId={screenState.teamId}
            onNavigateBack={goBack}
            onNavigateChat={(teamId, teamName) =>
              navigateTo({ name: 'chat', teamId, sessionTitle: teamName })
            }
          />
        );

      case 'conversations':
        return (
          <ConversationsListScreen
            onNavigateBack={goBack}
            onOpenConversation={(conv) => {
              if (conv.session_id) {
                navigateTo({ name: 'chat', sessionId: conv.session_id, conversationId: conv.id, sessionTitle: conv.title });
              } else if (conv.team_id) {
                navigateTo({ name: 'chat', teamId: conv.team_id, conversationId: conv.id, sessionTitle: conv.title });
              } else {
                navigateTo({ name: 'chat', conversationId: conv.id, sessionTitle: conv.title });
              }
            }}
          />
        );

      case 'venues':
        return (
          <VenuesScreen
            onNavigateBack={goBack}
          />
        );

      case 'tabs':
      default:
        switch (screenState.tab) {
          case 'map':
            return (
              <ExploreMapScreen
                onSelectSession={(id) => navigateTo({ name: 'session_detail', id })}
                onNavigateCreate={() => navigateTo({ name: 'create_session' })}
                onNavigateBack={() => setScreenState({ name: 'tabs', tab: 'home' })}
              />
            );
          case 'teams':
            return (
              <TeamsListScreen
                onSelectTeam={(teamId) => navigateTo({ name: 'team_detail', teamId })}
                onNavigateTeamChat={(teamId, teamName) =>
                  navigateTo({ name: 'chat', teamId, sessionTitle: teamName })
                }
                onNavigateBack={() => setScreenState({ name: 'tabs', tab: 'home' })}
              />
            );
          case 'profile':
            return (
              <ProfileScreen
                onNavigateStats={() => navigateTo({ name: 'stats' })}
                onNavigateNotifications={() => navigateTo({ name: 'notification_preferences' })}
                onNavigateBack={() => setScreenState({ name: 'tabs', tab: 'home' })}
              />
            );
          case 'home':
          default:
            return (
              <HomeScreen
                onSelectSession={(id) => navigateTo({ name: 'session_detail', id })}
                onNavigateExplore={() => switchTab('map')}
                onNavigateTournaments={() => navigateTo({ name: 'tournaments' })}
                onNavigateNotifications={() => navigateTo({ name: 'notifications' })}
                onNavigateCalendar={() => navigateTo({ name: 'calendar' })}
                onNavigateConversations={() => navigateTo({ name: 'conversations' })}
                onNavigateVenues={() => navigateTo({ name: 'venues' })}
              />
            );
        }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* In-app notification toast */}
      {toast && (
        <InAppToast
          title={toast.title}
          body={toast.body}
          onDismiss={() => setToast(null)}
        />
      )}

      {/* Main Content Area */}
      <View style={styles.body}>{renderCurrentScreen()}</View>

      {/* BOTTOM TAB BAR */}
      {screenState.name === 'tabs' && (
        <View style={styles.tabBar}>
          {/* 1. ACCUEIL */}
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => switchTab('home')}
            activeOpacity={0.8}
          >
            <Home
              size={22}
              color={currentTab === 'home' ? colors.primary : colors.muted}
              strokeWidth={currentTab === 'home' ? 2.4 : 1.8}
            />
            <Text style={[styles.tabLabel, currentTab === 'home' && styles.tabLabelActive]}>
              Accueil
            </Text>
            {currentTab === 'home' && <View style={styles.activeDot} />}
          </TouchableOpacity>

          {/* 2. CARTE */}
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => switchTab('map')}
            activeOpacity={0.8}
          >
            <Compass
              size={22}
              color={currentTab === 'map' ? colors.primary : colors.muted}
              strokeWidth={currentTab === 'map' ? 2.4 : 1.8}
            />
            <Text style={[styles.tabLabel, currentTab === 'map' && styles.tabLabelActive]}>
              Carte
            </Text>
            {currentTab === 'map' && <View style={styles.activeDot} />}
          </TouchableOpacity>

          {/* 3. CRÉER (+) */}
          <View style={styles.createTabContainer}>
            <TouchableOpacity
              style={styles.createTabItem}
              onPress={() => navigateTo({ name: 'create_session' })}
              activeOpacity={0.88}
            >
              <Plus size={24} color="#FFFFFF" strokeWidth={2.8} />
            </TouchableOpacity>
          </View>

          {/* 4. ÉQUIPES */}
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => switchTab('teams')}
            activeOpacity={0.8}
          >
            <Users
              size={22}
              color={currentTab === 'teams' ? colors.primary : colors.muted}
              strokeWidth={currentTab === 'teams' ? 2.4 : 1.8}
            />
            <Text style={[styles.tabLabel, currentTab === 'teams' && styles.tabLabelActive]}>
              Équipes
            </Text>
            {currentTab === 'teams' && <View style={styles.activeDot} />}
          </TouchableOpacity>

          {/* 5. PROFIL */}
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => switchTab('profile')}
            activeOpacity={0.8}
          >
            <User
              size={22}
              color={currentTab === 'profile' ? colors.primary : colors.muted}
              strokeWidth={currentTab === 'profile' ? 2.4 : 1.8}
            />
            <Text style={[styles.tabLabel, currentTab === 'profile' && styles.tabLabelActive]}>
              Profil
            </Text>
            {currentTab === 'profile' && <View style={styles.activeDot} />}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <MainAppContent />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    height: 64,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.xs,
    paddingBottom: Platform.OS === 'ios' ? 16 : 4,
    ...shadows.tabBar,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 6,
    position: 'relative',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
    marginTop: 4,
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 2,
  },
  createTabContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
  },
  createTabItem: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
});
