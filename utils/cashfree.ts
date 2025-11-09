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
  mode: 'sandbox' | 'production' = 'production', // Default to production
  orderId?: string,
  paymentLink?: string
): Promise<void> => {
  try {
    console.log('🛠️ Initializing Cashfree Checkout (Web SDK via Browser)...');
    console.log('📦 Payment Session ID:', paymentSessionId);
    console.log('📋 Order ID:', orderId);
    console.log('🔗 Payment Link (from backend):', paymentLink);
    console.log('🔁 Return URL:', returnUrl);
    console.log('🌐 Mode:', mode);

    let paymentUrl: string;
    
    // If Cashfree provided a payment_link, use it directly (most reliable)
    if (paymentLink) {
      paymentUrl = paymentLink;
      console.log('✅ Using payment_link from Cashfree response');
    } else {
      // Construct Cashfree payment URL
      // Based on Cashfree documentation, the payment gateway URL format should be:
      // For direct payment page access, we need to use the correct endpoint
      const baseUrl = mode === 'production' 
        ? 'https://payments.cashfree.com'
        : 'https://sandbox.cashfree.com';
      
      // Try the correct Cashfree payment URL format
      // According to Cashfree docs, the payment page URL is:
      // https://payments.cashfree.com/pg/checkout/{payment_session_id}
      // OR it might require using the payment link API endpoint
      // Let's try the most common format first
      paymentUrl = `${baseUrl}/pg/checkout/${paymentSessionId}`;
      
      console.log('⚠️ Constructing payment URL manually');
      console.log('📝 Using format: /pg/checkout/{payment_session_id}');
      console.log('💡 Note: If this fails, check backend logs for Cashfree response structure');
    }
    
    // The returnUrl is already set in order_meta when creating the payment session on backend
    // Cashfree will automatically redirect to that URL after payment

    console.log('🚀 Opening payment URL:', paymentUrl.substring(0, 100) + '...');
    console.log('📋 URL Details:', { 
      hasPaymentLink: !!paymentLink,
      paymentSessionId: paymentSessionId?.substring(0, 30) + '...', 
      orderId,
      method: paymentLink ? 'direct_link' : 'html_page_with_sdk'
    });

    // Open payment page in browser
    // When payment is complete, Cashfree will redirect to returnUrl
    // which will be caught by our deep linking handler
    const result = await WebBrowser.openBrowserAsync(paymentUrl, {
      enableBarCollapsing: false,
      showInRecents: true,
    });

    console.log('🌐 Browser result:', result);
    
    // Note: The actual payment result will be handled via deep linking
    // when Cashfree redirects to our returnUrl
  } catch (error: any) {
    console.error('❌ Failed to open payment browser:', error);
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

