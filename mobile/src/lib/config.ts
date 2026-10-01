/**
 * config.ts — where the backend lives, resolved once for every platform.
 *
 * `.env` points at `http://localhost:8000`, which is right for the browser and for
 * simulators, but a physical phone's "localhost" is the phone itself. In development we
 * therefore swap a loopback host for the machine Metro is being served from, so the same
 * `.env` works on the laptop browser AND on a phone on the same Wi-Fi.
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const LOOPBACK = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/;

/** Host of the dev machine as seen by this device (e.g. "192.168.0.101"), if known. */
const devMachineHost = (): string | null => {
  if (Platform.OS === 'web') return null; // the browser can reach localhost directly
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as any).expoGoConfig?.debuggerHost ??
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ??
    null;
  if (!hostUri) return null;
  const host = String(hostUri).split(':')[0];
  return host && !LOOPBACK.test(host) ? host : null;
};

/** Rewrites a loopback URL so it is reachable from the current device. */
export const reachableUrl = (url: string): string => {
  if (!url) return url;
  const match = url.match(/^(https?:\/\/)([^/:]+)(.*)$/);
  if (!match || !LOOPBACK.test(match[2])) return url;
  if (Platform.OS === 'web') return url;
  const host = devMachineHost();
  if (host) return `${match[1]}${host}${match[3]}`;
  // Android emulator reaches the host machine through 10.0.2.2
  if (Platform.OS === 'android' && !Constants.isDevice) return `${match[1]}10.0.2.2${match[3]}`;
  return url;
};

const stripTrailingSlash = (url: string) => url.replace(/\/+$/, '');

export const API_URL = stripTrailingSlash(reachableUrl(process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'));
export const USE_EMULATOR = process.env.EXPO_PUBLIC_USE_EMULATOR === 'true';
export const EMULATOR_URL = stripTrailingSlash(reachableUrl(process.env.EXPO_PUBLIC_EMULATOR_URL || 'http://localhost:9099'));

export const PLACEHOLDER_AVATAR =
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400';

/**
 * Turns whatever the API stored for a photo / media file into something an <Image> can load:
 * absolute URLs are kept (loopback hosts fixed up for phones), bare paths are served by the API.
 */
export const mediaUrl = (raw?: string | null, fallback: string = PLACEHOLDER_AVATAR): string => {
  if (!raw) return fallback;
  if (/^(https?:|file:|blob:|data:|content:)/.test(raw)) return reachableUrl(raw);
  return `${API_URL}/${raw.replace(/^\/+/, '')}`;
};
