import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Linking from 'expo-linking';

interface CashfreeWebViewProps {
  paymentSessionId: string;
  orderId: string;
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
  const completionTriggered = useRef(false);

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

            console.log('🚀 Cashfree Payment Initialized', { paymentSessionId, returnUrl, mode, orderId });

            function showError(message) {
                document.getElementById('loading').style.display = 'none';
                const errorDiv = document.getElementById('error');
                errorDiv.style.display = 'block';
                errorDiv.innerHTML = '<p><strong>Error:</strong> ' + message + '</p>';
            }

            function initPayment() {
                if (typeof window.Cashfree === 'undefined') {
                    showError('Cashfree SDK not loaded. Please check your internet connection.');
                    return;
                }

                try {
                    const cashfreeMode = mode;
                    console.log('🔧 Initializing Cashfree SDK with mode:', cashfreeMode);
                    
                    const cashfree = window.Cashfree({
                        mode: cashfreeMode
                    });

                    const checkoutOptions = {
                        paymentSessionId: paymentSessionId,
                        returnUrl: returnUrl,
                        redirectTarget: '_self'
                    };

                    console.log('💳 Starting Cashfree checkout (redirect mode)', checkoutOptions);
                    
                    // IMPORTANT: For redirect mode (_self), do NOT handle the promise
                    // The promise resolves when redirect starts, NOT when payment completes
                    // We must wait for Cashfree to redirect back to returnUrl
                    cashfree.checkout(checkoutOptions);
                    
                    console.log('✅ Cashfree checkout initiated - waiting for payment and redirect');
                } catch (error) {
                    console.error('❌ Error initializing payment:', error);
                    showError(error.message || 'Failed to initialize payment gateway');
                }
            }

            // Wait for SDK to load
            let attempts = 0;
            const maxAttempts = 100;

            function waitForCashfree() {
                if (typeof window.Cashfree !== 'undefined') {
                    console.log('✅ Cashfree SDK loaded');
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

            waitForCashfree();
        })();
    </script>
</body>
</html>`;

  const handleShouldStartLoadWithRequest = (request: any): boolean => {
    const { url } = request;
    console.log('🔍 WebView Should Start Load:', url);

    // Check if this is the return URL (payment completed)
    if (url && !completionTriggered.current) {
      const isReturnUrl = 
        url.includes('payment-success') || 
        url.includes('printease://') ||
        url.startsWith('printease://') ||
        url.includes(returnUrl.split('?')[0]);
      
      // Also check if URL has order_id parameter (Cashfree adds this)
      const hasOrderId = url.includes('order_id=');
      
      if (isReturnUrl || (hasOrderId && (url.includes('payment') || url.includes('success')))) {
        console.log('✅ Payment redirect detected:', url);
        completionTriggered.current = true;
        
        if (onPaymentComplete) {
          onPaymentComplete(url);
        }
        
        // Prevent WebView from loading the deep link (it won't work in WebView)
        return false;
      }
    }

    // Allow all other URLs to load
    return true;
  };

  const handleNavigationStateChange = (navState: any) => {
    const { url, loading } = navState;
    console.log('🧭 Navigation State Changed:', { url, loading });
    if (
    !loading &&
    url.includes("gateway/thankyou/process") &&
    !completionTriggered.current
  ) {
    console.log("🎯 Payment Completed Stage Reached:", url);

    completionTriggered.current = true;

    // Extract orderId if present, else fallback
    const orderIdMatch = url.match(/order_id=([^&]+)/);
    const orderId = orderIdMatch ? orderIdMatch[1] : propOrderId;

    // Trigger your success navigation
    if (onPaymentComplete) {
      onPaymentComplete({ url, orderId });
    }

    return;
  }
    // Only check when navigation completes (loading = false)
    if (!loading && url && !completionTriggered.current) {
      const isReturnUrl = 
        url.includes('payment-success') || 
        url.includes('printease://') ||
        url.includes(returnUrl);
      
      const hasOrderId = url.includes('order_id=');
      
      if (isReturnUrl || (hasOrderId && (url.includes('payment') || url.includes('success')))) {
        console.log('✅ Payment redirect in navigation:', url);
        completionTriggered.current = true;
        
        if (onPaymentComplete) {
          setTimeout(() => {
            onPaymentComplete(url);
          }, 100);
        }
      }
    }
  };

  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('❌ WebView error:', nativeEvent);
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
          console.log('📨 Message from WebView:', event.nativeEvent.data);
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
        // Monitor URL changes via injected JavaScript
        injectedJavaScript={`
          (function() {
            let lastUrl = window.location.href;
            
            // Check URL every 500ms
            setInterval(function() {
              const currentUrl = window.location.href;
              if (currentUrl !== lastUrl) {
                lastUrl = currentUrl;
                console.log('📍 URL changed to:', currentUrl);
                
                // If we detect return URL patterns, log it
                // The main detection happens in onShouldStartLoadWithRequest
                if (currentUrl.includes('payment-success') || 
                    currentUrl.includes('printease://') ||
                    currentUrl.includes('order_id')) {
                  console.log('🎯 Return URL detected in injected JS');
                }
              }
            }, 500);
          })();
          
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