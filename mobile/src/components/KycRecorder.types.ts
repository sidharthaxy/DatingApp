import type { StyleProp, ViewStyle } from 'react-native';

/** A finished KYC recording, ready to upload. */
export interface KycClip {
  /** file:// URI on native, blob: URL in the browser */
  uri: string;
  /** Clean MIME type without codec parameters, e.g. "video/mp4" or "video/webm" */
  mimeType: string;
  /** Suggested upload filename (extension matches the MIME type) */
  name: string;
  /** Browser only: the recorded data itself */
  blob?: Blob;
}

export type KycRecorderStatus =
  | { state: 'loading' }
  /** Permission has not been asked yet — call `requestPermission()` from a button press */
  | { state: 'needs-permission' }
  /** The user (or OS / browser settings) blocked the camera */
  | { state: 'denied'; message: string }
  | { state: 'error'; message: string }
  | { state: 'ready' };

export interface KycRecorderHandle {
  /** Records for `seconds` and resolves with the clip. Rejects with a user-readable Error. */
  record: (seconds: number) => Promise<KycClip>;
  /** Ask for camera (and microphone) access. */
  requestPermission: () => Promise<void>;
}

export interface KycRecorderProps {
  onStatusChange: (status: KycRecorderStatus) => void;
  style?: StyleProp<ViewStyle>;
}
