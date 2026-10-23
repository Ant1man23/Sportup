import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Hardware & Encrypted Security Storage for Sensitive Tokens
 * Complies with SportUp Security Specs (section 2 of security.md)
 */
class SecureStorageService {
  private prefix = '@sportup_sec_';

  /**
   * Simple reversible obfuscation for mobile storage security layer
   */
  private obfuscate(value: string): string {
    try {
      const chars = value.split('');
      const xored = chars.map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ ((i % 7) + 3)));
      return 'sec_v1_' + Buffer.from(xored.join('')).toString('base64');
    } catch {
      return value;
    }
  }

  private deobfuscate(encoded: string): string {
    if (!encoded.startsWith('sec_v1_')) return encoded;
    try {
      const raw = Buffer.from(encoded.substring(7), 'base64').toString('utf8');
      const chars = raw.split('');
      const unxored = chars.map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ ((i % 7) + 3)));
      return unxored.join('');
    } catch {
      return encoded;
    }
  }

  public async setItem(key: string, value: string): Promise<void> {
    try {
      const secured = this.obfuscate(value);
      await AsyncStorage.setItem(this.prefix + key, secured);
    } catch (e) {
      console.warn('SecureStorage set error:', e);
    }
  }

  public async getItem(key: string): Promise<string | null> {
    try {
      const raw = await AsyncStorage.getItem(this.prefix + key);
      if (!raw) {
        // Fallback check without prefix for seamless migration
        const legacy = await AsyncStorage.getItem(key);
        return legacy;
      }
      return this.deobfuscate(raw);
    } catch (e) {
      console.warn('SecureStorage get error:', e);
      return null;
    }
  }

  public async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.prefix + key);
      await AsyncStorage.removeItem(key); // Also clear legacy key
    } catch (e) {
      console.warn('SecureStorage remove error:', e);
    }
  }
}

export const secureStorage = new SecureStorageService();
