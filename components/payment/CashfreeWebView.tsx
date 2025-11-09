import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Linking from 'expo-linking';

interface CashfreeWebViewProps {
  paymentSessionId: string;
  orderId: string; // The Cashfree order_id from backend
  returnUrl: string;
  mode: 'sandbox' | 'production';
  onPaymentComplete?: (urlOrData: string | { url?: string; orderId?: string }) => void;
  onError?: (error: string) => void;
}

const CashfreeWebView: React.FC<CashfreeWebViewProps> = ({
  paymentSessionId,
  orderId: propOrderId,
  returnUrl,
  mode,
  onPaymentComplete,
  onError,
}) => {
  const webViewRef = useRef<WebView>(null);

  // Create HTML content with Cashfree SDK
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Cashfree Payment</title>
    <script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            width: 100%;
            max-width: 500px;
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .loading {
            text-align: center;
            padding: 40px;
            color: #666;
        }
        .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #2563eb;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .error {
            background: #fee;
            color: #c33;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            display: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div id="loading" class="loading">
            <div class="spinner"></div>
            <p>Loading payment gateway...</p>
        </div>
        <div id="error" class="error"></div>
    </div>

    <script>
        (function() {
            const paymentSessionId = ${JSON.stringify(paymentSessionId)};
            const orderId = ${JSON.stringify(propOrderId)};
            const returnUrl = ${JSON.stringify(returnUrl)};
            const mode = ${JSON.stringify(mode)};

            console.log('Cashfree Payment Page Initialized', { paymentSessionId, returnUrl, mode, orderId });
            console.log('🔧 Cashfree Mode:', mode, mode === 'production' ? '✅ PRODUCTION' : '⚠️ SANDBOX');

            function showError(message) {
                document.getElementById('loading').style.display = 'none';
                const errorDiv = document.getElementById('error');
                errorDiv.style.display = 'block';
                errorDiv.innerHTML = '<p><strong>Error:</strong> ' + message + '</p>';
            }

            function notifyPaymentComplete(orderId) {
                console.log('Notifying payment complete with orderId:', orderId);
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'PAYMENT_COMPLETE',
                        url: returnUrl + (returnUrl.includes('?') ? '&' : '?') + 'order_id=' + orderId,
                        orderId: orderId
                    }));
                }
            }

            function initPayment() {
                if (typeof window.Cashfree === 'undefined') {
                    showError('Cashfree SDK not loaded. Please check your internet connection.');
                    return;
                }

                try {
                    // Ensure mode is explicitly set (default to production if not specified)
                    const cashfreeMode = mode || 'production';
                    console.log('🔧 Initializing Cashfree SDK with mode:', cashfreeMode);
                    const cashfree = window.Cashfree({
                        mode: cashfreeMode
                    });

                    const checkoutOptions = {
                        paymentSessionId: paymentSessionId,
                        returnUrl: returnUrl,
                        redirectTarget: '_self'
                    };

                    console.log('Initializing Cashfree checkout', checkoutOptions);
                    cashfree.checkout(checkoutOptions);
                    console.log('Cashfree checkout initialized successfully');

                    // Monitor for payment completion indicators
                    startPaymentMonitoring();
                } catch (error) {
                    console.error('Error initializing payment:', error);
                    showError(error.message || 'Failed to initialize payment gateway');
                }
            }

            function startPaymentMonitoring() {
                // Monitor DOM for Cashfree success/completion indicators
                const observer = new MutationObserver(function(mutations) {
                    // Check for success indicators in the page
                    const successIndicators = [
                        document.querySelector('[class*="success"]'),
                        document.querySelector('[class*="completed"]'),
                        document.querySelector('[id*="success"]'),
                        document.querySelector('[id*="completed"]'),
                        document.querySelector('text*="Payment Successful"'),
                        document.querySelector('text*="Payment Complete"'),
                        document.querySelector('text*="Transaction Successful"')
                    ].filter(Boolean);

                    // Check URL for order_id parameter (Cashfree might add it)
                    const currentUrl = window.location.href;
                    const orderIdMatch = currentUrl.match(/order_id=([^&]+)/);
                    if (orderIdMatch) {
                        console.log('Order ID found in URL:', orderIdMatch[1]);
                        notifyPaymentComplete(orderIdMatch[1]);
                        observer.disconnect();
                        return;
                    }

                    // Check if page content indicates success
                    const pageText = document.body.innerText || document.body.textContent || '';
                    if (pageText.includes('Payment Successful') || 
                        pageText.includes('Transaction Successful') ||
                        pageText.includes('Payment Complete')) {
                        console.log('Payment success detected in page content');
                        // Extract order_id from page if possible
                        const orderIdFromText = pageText.match(/order[_\s]*id[:\s]*([A-Za-z0-9_-]+)/i);
                        if (orderIdFromText) {
                            notifyPaymentComplete(orderIdFromText[1]);
                        } else {
                            // Use paymentSessionId as fallback - extract order_id from it or use session ID
                            const sessionOrderId = paymentSessionId.split('_')[0] || paymentSessionId;
                            notifyPaymentComplete(sessionOrderId);
                        }
                        observer.disconnect();
                    }
                });

                // Start observing DOM changes
                observer.observe(document.body, {
                    childList: true,
                    subtree: true,
                    characterData: true
                });

                // Also monitor for iframe changes (Cashfree might use iframes)
                const iframeObserver = new MutationObserver(function(mutations) {
                    const iframes = document.querySelectorAll('iframe');
                    iframes.forEach(function(iframe) {
                        try {
                            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                            const iframeUrl = iframe.contentWindow.location.href;
                            if (iframeUrl && iframeUrl.includes('order_id')) {
                                const orderIdMatch = iframeUrl.match(/order_id=([^&]+)/);
                                if (orderIdMatch) {
                                    console.log('Order ID found in iframe URL:', orderIdMatch[1]);
                                    notifyPaymentComplete(orderIdMatch[1]);
                                    iframeObserver.disconnect();
                                    observer.disconnect();
                                }
                            }
                        } catch (e) {
                            // Cross-origin iframe, can't access
                        }
                    });
                });

                iframeObserver.observe(document.body, {
                    childList: true,
                    subtree: true
                });

                // Monitor for "Go to next step" button or completion indicators
                // Cashfree shows "checking payment" and then "taking too long? go to next step"
                // When user sees this, payment is usually complete
                let checkCount = 0;
                const completionCheckInterval = setInterval(function() {
                    checkCount++;
                    const pageText = (document.body.innerText || document.body.textContent || '').toLowerCase();
                    const currentUrl = window.location.href;
                    
                    // Check for completion indicators
                    if (pageText.includes('go to next step') || 
                        pageText.includes('taking too long') ||
                        pageText.includes('payment successful') ||
                        pageText.includes('transaction successful') ||
                        (currentUrl.includes('cashfree.com') && 
                         (currentUrl.includes('success') || currentUrl.includes('complete') || currentUrl.includes('verify')))) {
                        console.log('Payment completion detected via page content or URL');
                        // Extract order_id from URL or use paymentSessionId
                        const orderIdMatch = currentUrl.match(/order_id=([^&]+)/) || 
                                            pageText.match(/order[_\s]*id[:\s]*([a-z0-9_-]+)/i);
                        const detectedOrderId = orderIdMatch ? orderIdMatch[1] : null;
                        
                        // Use detected order_id, or the one we already have from backend
                        const finalOrderId = detectedOrderId || orderId;
                        console.log('Using orderId for completion:', finalOrderId);
                        notifyPaymentComplete(finalOrderId);
                        clearInterval(completionCheckInterval);
                        return;
                    }
                    
                    // Stop checking after 2 minutes
                    if (checkCount > 120) {
                        clearInterval(completionCheckInterval);
                    }
                }, 1000); // Check every second
            }

            // Wait for Cashfree SDK to load
            let attempts = 0;
            const maxAttempts = 100; // 10 seconds

            function waitForCashfree() {
                if (typeof window.Cashfree !== 'undefined') {
                    console.log('Cashfree SDK loaded successfully');
                    document.getElementById('loading').innerHTML = '<div class="spinner"></div><p>Initializing payment...</p>';
                    initPayment();
                } else {
                    attempts++;
                    if (attempts >= maxAttempts) {
                        showError('Payment gateway timeout. Please try again.');
                        return;
                    }
                    setTimeout(waitForCashfree, 100);
                }
            }

            // Start waiting for SDK
            waitForCashfree();

            // Monitor URL changes to detect payment completion
            let lastUrl = window.location.href;
            const urlCheckInterval = setInterval(function() {
                const currentUrl = window.location.href;
                if (currentUrl !== lastUrl) {
                    lastUrl = currentUrl;
                    console.log('URL changed to:', lastUrl);
                    
                    // Check if we've been redirected to the return URL
                    if (lastUrl.includes('payment-success') || 
                        lastUrl.includes('printease://') ||
                        lastUrl.includes('order_id')) {
                        console.log('Payment completion detected via URL change');
                        const orderIdMatch = lastUrl.match(/order_id=([^&]+)/);
                        const finalOrderId = orderIdMatch ? decodeURIComponent(orderIdMatch[1]) : orderId;
                        notifyPaymentComplete(finalOrderId);
                        clearInterval(urlCheckInterval);
                    }
                    // Also check if Cashfree redirected to a completion page
                    else if (lastUrl.includes('cashfree.com') && 
                             (lastUrl.includes('success') || lastUrl.includes('complete') || lastUrl.includes('verify'))) {
                        console.log('Cashfree completion page detected');
                        // Wait a bit for the page to load, then check for order_id
                        setTimeout(function() {
                            const orderIdMatch = lastUrl.match(/order_id=([^&]+)/) || 
                                                document.body.innerText.match(/order[_\s]*id[:\s]*([A-Za-z0-9_-]+)/i);
                            const finalOrderId = orderIdMatch ? decodeURIComponent(orderIdMatch[1]) : orderId;
                            notifyPaymentComplete(finalOrderId);
                        }, 2000);
                    }
                }
            }, 1000); // Check every second

            // Listen for Cashfree payment completion events
            window.addEventListener('message', function(event) {
                console.log('Message received:', event.data);
                if (event.data && typeof event.data === 'string') {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.type === 'PAYMENT_COMPLETE' || data.order_id) {
                            console.log('Payment completion message received');
                            if (window.ReactNativeWebView) {
                                window.ReactNativeWebView.postMessage(JSON.stringify({
                                    type: 'PAYMENT_COMPLETE',
                                    url: event.data
                                }));
                            }
                        }
                    } catch (e) {
                        // Not JSON, ignore
                    }
                }
            });

            // Also listen for hash changes (some redirects use hash)
            window.addEventListener('hashchange', function() {
                console.log('Hash changed to:', window.location.href);
                if (window.location.href.includes('payment-success') || 
                    window.location.href.includes('order_id')) {
                    if (window.ReactNativeWebView) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'PAYMENT_COMPLETE',
                            url: window.location.href
                        }));
                    }
                }
            });

            // Cleanup interval when page unloads
            window.addEventListener('beforeunload', function() {
                clearInterval(urlCheckInterval);
            });
        })();
    </script>
</body>
</html>`;

  // Intercept navigation requests to detect payment completion
  const handleShouldStartLoadWithRequest = (request: any): boolean => {
    const { url } = request;
    console.log('WebView Should Start Load:', url);

    // Check if the URL is the return URL (payment completed)
    // Cashfree redirects to the return URL after payment
    if (url && (
      url.includes('payment-success') || 
      url.includes('printease://') ||
      url.startsWith('printease://') ||
      url.includes(returnUrl.split('?')[0]) ||
      (url.includes('order_id') && (url.includes('payment') || url.includes('success') || url.includes('printease')))
    )) {
      console.log('✅ Payment redirect detected in shouldStartLoad:', url);
      if (onPaymentComplete) {
        // Call immediately when redirect is detected
        onPaymentComplete(url);
      }
      // Prevent WebView from loading the deep link URL (it won't work in WebView anyway)
      return false;
    }

    // Also check if it's a Cashfree completion page that might have a redirect button
    if (url && (
      url.includes('cashfree.com') && 
      (url.includes('success') || url.includes('complete') || url.includes('verify'))
    )) {
      console.log('Cashfree completion page detected:', url);
      // Allow it to load, but we'll monitor for redirects
    }

    // Allow other URLs to load
    return true;
  };

  const handleNavigationStateChange = (navState: any) => {
    const { url } = navState;
    console.log('WebView Navigation State Changed:', url);

    // Also check navigation state changes as a fallback
    if (url && (
      url.includes('payment-success') || 
      url.includes('printease://') ||
      url.includes(returnUrl) ||
      (url.includes('order_id') && (url.includes('payment') || url.includes('success')))
    )) {
      console.log('✅ Payment redirect detected in navigation state:', url);
      if (onPaymentComplete) {
        setTimeout(() => {
          onPaymentComplete(url);
        }, 100);
      }
    }
  };

  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView error:', nativeEvent);
    if (onError) {
      onError(nativeEvent.description || 'Failed to load payment gateway');
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={styles.webview}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onNavigationStateChange={handleNavigationStateChange}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            console.log('Message received from WebView:', data);
            if (data.type === 'PAYMENT_COMPLETE') {
              console.log('Payment completion message from WebView:', data);
              if (onPaymentComplete) {
                // Pass both URL and orderId if available
                onPaymentComplete({
                  url: data.url || '',
                  orderId: data.orderId
                });
              }
            }
          } catch (e) {
            console.log('Non-JSON message from WebView:', event.nativeEvent.data);
            // Try to detect payment completion from raw message
            const message = event.nativeEvent.data;
            if (typeof message === 'string' && (message.includes('PAYMENT_COMPLETE') || message.includes('order_id'))) {
              console.log('Potential payment completion detected in raw message');
            }
          }
        }}
        onError={handleError}
        onHttpError={handleError}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        )}
        allowsBackForwardNavigationGestures={true}
        injectedJavaScript={`
          // Make ReactNativeWebView available for communication
          window.ReactNativeWebView = window.ReactNativeWebView || window.ReactNativeWebView;
          
          // Override window.location to intercept redirects
          const originalLocation = window.location;
          let currentUrl = originalLocation.href;
          
          // Check for payment completion every 500ms
          setInterval(function() {
            if (window.location.href !== currentUrl) {
              currentUrl = window.location.href;
              if (currentUrl.includes('payment-success') || 
                  currentUrl.includes('printease://') ||
                  currentUrl.includes('order_id')) {
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'PAYMENT_COMPLETE',
                    url: currentUrl
                  }));
                }
              }
            }
          }, 500);
          
          true; // Required for injected JavaScript
        `}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});

export default CashfreeWebView;

