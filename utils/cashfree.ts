import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

/**
 * Initialize Cashfree checkout using web SDK via WebBrowser with HTML page
 * @param paymentSessionId - Payment session ID from backend
 * @param orderId - Order ID from backend (optional, for fallback)
 * @param returnUrl - Deep link URL to return to app after payment
 * @param mode - 'sandbox' or 'production'
 * @returns Promise that resolves when payment browser is opened
 */

export const initializeCashfreeCheckout = async (
  paymentSessionId: string,
  returnUrl: string,
  orderId?: string,
  paymentLink?: string
): Promise<void> => {
  try {
    // ✅ Determine environment from .env
    const isProd = process.env.EXPO_PUBLIC_PROD === 'true';
    const mode = isProd ? 'production' : 'sandbox';

    console.log('🛠️ Initializing Cashfree Checkout...');
    console.log('🌐 Running in:', mode.toUpperCase());
    console.log('📦 Payment Session:', paymentSessionId);
    console.log('📋 Order ID:', orderId);
    console.log('🔁 Return URL:', returnUrl);
    console.log('🔗 Payment Link from backend:', paymentLink);

    let paymentUrl: string;

    // If backend provided payment_link → always use it (most stable)
    if (paymentLink) {
      paymentUrl = paymentLink;
      console.log('✅ Using backend payment_link');
    } else {
      // Construct proper payment checkout URL (V3)
      const baseUrl = isProd
        ? 'https://payments.cashfree.com'
        : 'https://sandbox.cashfree.com';

      paymentUrl = `${baseUrl}/pg/checkout/${paymentSessionId}`;

      console.log('⚠️ Constructed fallback checkout URL:', paymentUrl);
    }

    console.log('🚀 Opening Browser Checkout:', paymentUrl);

    const result = await WebBrowser.openBrowserAsync(paymentUrl, {
      enableBarCollapsing: false,
      showInRecents: true,
    });

    console.log('🌐 Browser closed with result:', result);
    
  } catch (error: any) {
    console.error('❌ Failed to open Cashfree Checkout:', error);
    throw new Error(`Failed to open payment gateway: ${error.message || error}`);
  }
};

/**
 * Check if Cashfree web checkout is available
 * @returns {boolean} Always true for web-based approach
 */
export const isCashfreeAvailable = (): boolean => {
  // Web-based approach is always available
  return true;
};

/**
 * Parse payment result from deep link
 * @param url - Deep link URL
 * @returns Parsed payment result
 */
export const parsePaymentResult = (url: string) => {
  try {
    // Handle both deep link format and regular URL format
    let urlToParse = url;
    if (url.startsWith('printease://')) {
      // Replace deep link scheme with https for parsing
      urlToParse = url.replace('printease://', 'https://');
    }
    
    const parsed = Linking.parse(urlToParse);
    const params = parsed.queryParams || {};
    
    // Also try manual extraction from URL string as fallback
    let orderId = params.order_id as string || params.orderId as string;
    if (!orderId && url) {
      const orderIdMatch = url.match(/order_id=([^&?#]+)/);
      if (orderIdMatch && orderIdMatch[1]) {
        orderId = decodeURIComponent(orderIdMatch[1]);
      }
    }
    
    return {
      orderId: orderId,
      totalAmount: params.total_amount as string || params.totalAmount as string,
      paymentStatus: params.payment_status as string || params.paymentStatus as string,
      paymentId: params.payment_id as string || params.paymentId as string,
      txStatus: params.txStatus as string,
      txMsg: params.txMsg as string,
      txTime: params.txTime as string,
    };
  } catch (error) {
    console.error('Error parsing payment result:', error);
    // Try regex fallback
    try {
      const orderIdMatch = url.match(/order_id=([^&?#]+)/);
      if (orderIdMatch && orderIdMatch[1]) {
        return {
          orderId: decodeURIComponent(orderIdMatch[1]),
          totalAmount: '',
          paymentStatus: '',
          paymentId: '',
          txStatus: '',
          txMsg: '',
          txTime: '',
        };
      }
    } catch (e) {
      // Ignore
    }
    return null;
  }
};

