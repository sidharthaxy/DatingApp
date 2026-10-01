/**
 * dialog.ts — makes `Alert.alert` usable in the browser.
 *
 * react-native-web ships `Alert.alert` as a no-op, so on a laptop every confirmation
 * ("Delete this wishlist?", "Activate panic mode?") and every error message silently did
 * nothing. This maps it onto window.alert / window.confirm with the same button semantics.
 * Native platforms keep the real Alert untouched.
 */
import { Alert, Platform } from 'react-native';

type Button = { text?: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' };

export const installWebDialogs = () => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;

  (Alert as any).alert = (title?: string, message?: string, buttons?: Button[]) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    const list = buttons ?? [];
    const cancel = list.find((b) => b.style === 'cancel');
    const actions = list.filter((b) => b !== cancel);

    // Defer so the click that triggered the dialog finishes painting first
    setTimeout(() => {
      if (actions.length === 0 || (list.length === 1 && !cancel)) {
        window.alert(text);
        (actions[0] ?? cancel)?.onPress?.();
        return;
      }
      if (window.confirm(text)) actions[actions.length - 1]?.onPress?.();
      else cancel?.onPress?.();
    }, 0);
  };
};

/** Simple cross-platform message box */
export const notify = (title: string, message?: string) => Alert.alert(title, message);
