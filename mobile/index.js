import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './package.json';
import { registerBackgroundHandler } from './src/services/fcmService';

// ⚠️ Doit être appelé AVANT AppRegistry — gère les notifications quand l'app est fermée
registerBackgroundHandler();

AppRegistry.registerComponent(appName, () => App);
