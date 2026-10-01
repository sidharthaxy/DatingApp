/**
 * razorpay.ts — one checkout call for every platform.
 *
 *  - Browser: Razorpay's hosted Checkout script (the native SDK does not exist on web)
 *  - iOS / Android dev build: react-native-razorpay
 *  - Expo Go: no native SDK available → a clear error instead of a crash
 */
import { Platform } from 'react-native';

export interface RazorpayResult {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

/** Thrown when the member closes the payment sheet. Not an error worth alerting about. */
export class PaymentCancelled extends Error {
  constructor() {
    super('Payment cancelled');
    this.name = 'PaymentCancelled';
  }
}

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';
let scriptPromise: Promise<void> | null = null;

const loadCheckoutScript = (): Promise<void> => {
  if ((window as any).Razorpay) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = CHECKOUT_SRC;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error('Could not load the payment page. Check your connection and try again.'));
      };
      document.body.appendChild(script);
    });
  }
  return scriptPromise;
};

export const openRazorpayCheckout = async (options: Record<string, any>): Promise<RazorpayResult> => {
  if (Platform.OS === 'web') {
    await loadCheckoutScript();
    return new Promise<RazorpayResult>((resolve, reject) => {
      const checkout = new (window as any).Razorpay({
        ...options,
        handler: (response: RazorpayResult) => resolve(response),
        modal: { ondismiss: () => reject(new PaymentCancelled()) },
      });
      checkout.on('payment.failed', (response: any) =>
        reject(new Error(response?.error?.description || 'The payment failed. You have not been charged.'))
      );
      checkout.open();
    });
  }

  let RazorpayCheckout: any = null;
  try {
    const mod = require('react-native-razorpay');
    RazorpayCheckout = mod.default ?? mod;
  } catch {
    RazorpayCheckout = null;
  }
  if (!RazorpayCheckout?.open) {
    throw new Error('Payments need a development build of the app — they are not available in Expo Go.');
  }

  try {
    return await RazorpayCheckout.open(options);
  } catch (error: any) {
    // react-native-razorpay reports a dismissed sheet as code 0 (Android) / 2 (iOS)
    if (error?.code === 0 || error?.code === 2) throw new PaymentCancelled();
    throw new Error(error?.description || error?.message || 'An error occurred during payment.');
  }
};
