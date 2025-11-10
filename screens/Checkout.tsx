import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, SafeAreaView, Modal } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { FontAwesome5 } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import * as Linking from "expo-linking";
import { RootStackParamList } from "../roots/types";
import UserHeader from "../components/global/UserHeader";
import { initializeCashfreeCheckout, isCashfreeAvailable, parsePaymentResult } from "../utils/cashfree";
import CashfreeWebView from "../components/payment/CashfreeWebView";
import Constants from "expo-constants";

const API_URL = Constants.expoConfig?.extra?.API_URL as string;
// Force production mode for Cashfree
// Change to false if you want to use sandbox
const PROD_MODE = true; // Always use production mode

type NavigationProp = StackNavigationProp<RootStackParamList, "Checkout">;
type CheckoutRouteProp = RouteProp<RootStackParamList, "Checkout">;

interface TokenJSON {
  email: string;
  type: string;
  user_id: string;
}

const Checkout: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<CheckoutRouteProp>();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentSession, setPaymentSession] = useState<any>(null);
  const [token, setToken] = useState<TokenJSON | null>(null);
  const [sdkReady, setSdkReady] = useState<boolean>(false);
  const [showPaymentWebView, setShowPaymentWebView] = useState<boolean>(false);

  const selectedOrders = route.params?.selectedOrders || [];
  const totalAmount = route.params?.totalAmount || 0;

  useEffect(() => {
    const loadToken = async () => {
      const tokenString = await SecureStore.getItemAsync("accessToken");
      if (!tokenString) return;
      try {
        const parsedToken: TokenJSON = JSON.parse(tokenString);
        setToken(parsedToken);
      } catch (err) {
        console.error("Failed to parse token:", err);
      }
    };
    loadToken();
  }, []);

  useEffect(() => {
    if (selectedOrders.length === 0) {
      navigation.navigate("Cart");
    }
  }, [selectedOrders]);

  // Check Cashfree SDK availability
  useEffect(() => {
    const checkSDK = () => {
      if (isCashfreeAvailable()) {
        console.log("✅ Cashfree SDK loaded");
        setSdkReady(true);
      } else {
        console.log("❌ SDK not ready, retrying...");
        setTimeout(checkSDK, 500);
      }
    };
    checkSDK();
  }, []);

  // Set up deep linking listener for payment callback
  // Note: Deep linking is handled globally in App.tsx, but we keep this as fallback
  useEffect(() => {
    const handlePaymentCallback = async (event: { url: string }) => {
      const url = event.url;
      if (url && url.includes('payment-success')) {
        const result = parsePaymentResult(url);
        if (result && result.orderId) {
          navigation.navigate("PaymentSuccess", {
            order_id: result.orderId,
            total_amount: result.totalAmount || (totalAmount + totalAmount * 0.05).toString(),
          });
        }
      }
    };

    const subscription = Linking.addEventListener('url', handlePaymentCallback);
    
    // Check if app was opened via deep link
    Linking.getInitialURL().then((url: string | null) => {
      if (url) {
        handlePaymentCallback({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [navigation, totalAmount]);

  useEffect(() => {
    if (selectedOrders.length > 0 && token) {
      createPaymentSession();
    }
  }, [selectedOrders, token]);

  const createPaymentSession = async () => {
    if (!token || selectedOrders.length === 0) return;
    try {
      setError(null);
      setLoading(true);
      console.log("🔄 Creating payment session...", { selectedOrders, totalAmount });
      
      // Create deep link return URL for payment callback
      // Format: printease://payment-success?order_id={order_id}&total_amount={total_amount}
      const deepLinkUrl = Linking.createURL('payment-success', {
        queryParams: {
          order_id: '{order_id}', // Cashfree will replace this placeholder
          total_amount: (totalAmount + totalAmount * 0.05).toString(),
        },
      });

      console.log("📤 Sending payment request:", { orderIds: selectedOrders, returnUrl: deepLinkUrl });

      const response = await fetch(`${API_URL}/api/order/mobile/create-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ...token, 
          orderIds: selectedOrders,
          returnUrl: deepLinkUrl, // Send mobile return URL to backend
        }),
      });

      const data = await response.json();
      console.log("📥 Payment session response:", JSON.stringify(data, null, 2));
      
      if (data.success) {
        // Check if payment link indicates sandbox (for debugging)
        if (data.paymentLink) {
          const isSandboxLink = data.paymentLink.includes('sandbox.cashfree.com');
          const isProductionLink = data.paymentLink.includes('payments.cashfree.com');
          console.log("🔧 Payment Link Analysis:", {
            isSandbox: isSandboxLink,
            isProduction: isProductionLink,
            link: data.paymentLink.substring(0, 100)
          });
          if (isSandboxLink && PROD_MODE) {
            console.warn("⚠️ WARNING: Backend created sandbox session but frontend expects production!");
            console.warn("⚠️ Set PROD=true in your backend .env file to use production mode");
          }
        }
        
        setPaymentSession({
          id: data.paymentSessionId,
          orderId: data.orderId,
          paymentLink: data.paymentLink, // Use payment_link if Cashfree provides it
        });
        console.log("✅ Payment session created:", { 
          id: data.paymentSessionId, 
          orderId: data.orderId,
          hasPaymentLink: !!data.paymentLink,
          frontendMode: PROD_MODE ? 'production' : 'sandbox'
        });
      } else {
        setError(data.message || "Failed to initialize payment session");
        console.error("❌ Payment session failed:", data.message);
      }
    } catch (err) {
      console.error("❌ Error creating payment session:", err);
      setError("Error initializing payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentClick = async () => {
    if (!paymentSession?.id) {
      setError("Payment session not ready yet. Please wait...");
      return;
    }

    try {
      setError(null);
      // Show WebView modal with Cashfree payment
      setShowPaymentWebView(true);
    } catch (err: any) {
      console.error("Payment error:", err);
      setError(err.message || "Payment gateway failed to open. Please try again.");
      Alert.alert("Payment Error", err.message || "Failed to initialize payment. Please try again.");
    }
  };

  const handlePaymentComplete = (urlOrData: string | { url?: string; orderId?: string }) => {
    console.log("Payment completed, data:", urlOrData);
    setShowPaymentWebView(false);
    
    // Handle both string URL and object with orderId
    let url: string;
    let orderId: string = paymentSession.orderId; // Default to session orderId
    
    if (typeof urlOrData === 'string') {
      url = urlOrData;
    } else {
      url = urlOrData.url || '';
      if (urlOrData.orderId) {
        orderId = urlOrData.orderId;
      }
    }
    
    // Parse the payment result from the URL
    const result = url ? parsePaymentResult(url) : null;
    console.log("Parsed payment result:", result);
    
    // Extract order_id from URL if available
    if (result && result.orderId) {
      orderId = result.orderId;
    } else if (url) {
      // Try to extract order_id from URL manually
      try {
        // Handle deep link format: printease://payment-success?order_id=xxx
        const cleanUrl = url.replace('printease://', 'https://');
        const urlObj = new URL(cleanUrl);
        const orderIdParam = urlObj.searchParams.get('order_id');
        if (orderIdParam) {
          orderId = orderIdParam;
        }
      } catch (e) {
        // Try regex extraction as fallback
        const orderIdMatch = url.match(/order_id=([^&]+)/);
        if (orderIdMatch && orderIdMatch[1]) {
          orderId = orderIdMatch[1];
        }
      }
    }
    
    console.log("Navigating to PaymentSuccess with orderId:", orderId);
    
    // Navigate to payment success screen - it will automatically verify payment
    navigation.navigate("PaymentSuccess", {
      order_id: orderId,
      total_amount: result?.totalAmount || (totalAmount + totalAmount * 0.05).toString(),
    });
  };

  const handlePaymentError = (error: string) => {
    console.error("Payment error in WebView:", error);
    setError(error);
    setShowPaymentWebView(false);
    Alert.alert("Payment Error", error);
  };

  if (selectedOrders.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-900">
        <UserHeader />
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">No Orders Selected</Text>
          <Text className="text-gray-600 dark:text-gray-400 mb-6 text-center">
            No orders selected for checkout.
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Cart")} className="bg-blue-500 rounded-xl px-6 py-3">
            <Text className="text-white font-semibold">Back to Cart</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const finalTotal = totalAmount + totalAmount * 0.05;
  const isPaymentReady = paymentSession?.id && sdkReady && !loading;

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-900">
      <UserHeader />
      <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="bg-white dark:bg-slate-800 rounded-xl p-6 border-2 border-gray-200 dark:border-gray-700">
          <View className="flex-row items-center mb-4">
            <View className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl items-center justify-center mr-3">
              <FontAwesome5 name="credit-card" size={20} color="white" />
            </View>
            <View className="flex-1">
              <Text className="text-2xl font-bold text-gray-900 dark:text-white">Checkout</Text>
              <Text className="text-gray-600 dark:text-gray-400 text-sm">Complete your payment to process your orders</Text>
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-xl font-bold text-gray-900 dark:text-white mb-4">Order Summary</Text>
            <View className="space-y-3">
              <View className="flex-row justify-between">
                <Text className="text-gray-600 dark:text-gray-400">Orders:</Text>
                <Text className="font-medium text-gray-900 dark:text-white">{selectedOrders.length}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-600 dark:text-gray-400">Subtotal:</Text>
                <Text className="font-medium text-gray-900 dark:text-white">₹{totalAmount.toFixed(2)}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-600 dark:text-gray-400">Platform Fee:</Text>
                <Text className="font-medium text-gray-900 dark:text-white">₹{(totalAmount * 0.05).toFixed(2)}</Text>
              </View>
              <View className="flex-row justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <Text className="text-lg font-bold text-gray-900 dark:text-white">Total:</Text>
                <Text className="text-lg font-bold text-gray-900 dark:text-white">
                  ₹{finalTotal.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          {/* Debug Info - Remove in production */}
          {__DEV__ && (
            <View className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 mb-4">
              <Text className="text-xs text-gray-600 dark:text-gray-400">
                Debug: Session Ready: {paymentSession?.id ? 'Yes' : 'No'}, SDK Ready: {sdkReady ? 'Yes' : 'No'}, Loading: {loading ? 'Yes' : 'No'}
              </Text>
            </View>
          )}

          {error && (
            <View className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
              <View className="flex-row items-center">
                <FontAwesome5 name="exclamation-circle" size={16} color="#ef4444" />
                <Text className="text-red-600 dark:text-red-400 text-sm font-medium ml-2">{error}</Text>
              </View>
            </View>
          )}

          {/* Payment Status Indicator */}
          {!paymentSession?.id && !loading && (
            <View className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
              <View className="flex-row items-center">
                <FontAwesome5 name="clock" size={16} color="#f59e0b" />
                <Text className="text-amber-600 dark:text-amber-400 text-sm font-medium ml-2">
                  Preparing payment gateway... Please wait
                </Text>
              </View>
            </View>
          )}

          {/* Payment Button - Always Visible */}
          <View className="mt-4">
            <TouchableOpacity
              onPress={handlePaymentClick}
              disabled={!isPaymentReady}
              className={`rounded-xl p-5 flex-row items-center justify-center ${
                !isPaymentReady 
                  ? "bg-gray-300 dark:bg-gray-700" 
                  : "bg-green-500 dark:bg-green-600"
              }`}
              style={{
                shadowColor: isPaymentReady ? "#10b981" : "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isPaymentReady ? 0.4 : 0.1,
                shadowRadius: 8,
                elevation: isPaymentReady ? 8 : 2,
              }}
            >
              {loading && !paymentSession?.id ? (
                <>
                  <ActivityIndicator size="small" color={isPaymentReady ? "white" : "#9ca3af"} />
                  <Text className={`text-lg font-bold ml-3 ${
                    isPaymentReady ? "text-white" : "text-gray-500 dark:text-gray-400"
                  }`}>
                    Creating Payment Session...
                  </Text>
                </>
              ) : !sdkReady ? (
                <>
                  <ActivityIndicator size="small" color={isPaymentReady ? "white" : "#9ca3af"} />
                  <Text className={`text-lg font-bold ml-3 ${
                    isPaymentReady ? "text-white" : "text-gray-500 dark:text-gray-400"
                  }`}>
                    Loading Gateway...
                  </Text>
                </>
              ) : !paymentSession?.id ? (
                <>
                  <ActivityIndicator size="small" color={isPaymentReady ? "white" : "#9ca3af"} />
                  <Text className={`text-lg font-bold ml-3 ${
                    isPaymentReady ? "text-white" : "text-gray-500 dark:text-gray-400"
                  }`}>
                    Preparing Payment...
                  </Text>
                </>
              ) : (
                <>
                  <FontAwesome5 name="lock" size={24} color="white" />
                  <Text className="text-white text-xl font-bold ml-3">
                    Pay ₹{finalTotal.toFixed(2)}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            
            {isPaymentReady && (
              <View className="mt-3 flex-row items-center justify-center">
                <FontAwesome5 name="shield-alt" size={12} color="#10b981" />
                <Text className="text-green-600 dark:text-green-400 text-xs ml-2">
                  Secure payment gateway • Your data is protected
                </Text>
              </View>
            )}
          </View>

          <Text className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
            Secure payment • By proceeding, you agree to our terms and conditions
          </Text>
        </View>
      </ScrollView>

      {/* Payment WebView Modal */}
      <Modal
        visible={showPaymentWebView}
        animationType="slide"
        onRequestClose={() => {
          // Ask user if they want to close (payment might be in progress)
          Alert.alert(
            "Close Payment?",
            "Are you sure you want to close? Your payment may still be processing.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Close",
                style: "destructive",
                onPress: () => {
                  setShowPaymentWebView(false);
                  // Navigate to payment success to check status
                  navigation.navigate("PaymentSuccess", {
                    order_id: paymentSession.orderId,
                    total_amount: (totalAmount + totalAmount * 0.05).toString(),
                  });
                },
              },
            ]
          );
        }}
      >
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row justify-between items-center p-4 border-b border-gray-200 bg-white">
            <Text className="text-xl font-bold text-gray-900">Payment Gateway</Text>
            <View className="flex-row items-center gap-3">
              <TouchableOpacity
                onPress={() => {
                  // Allow user to manually check payment status
                  setShowPaymentWebView(false);
                  navigation.navigate("PaymentSuccess", {
                    order_id: paymentSession.orderId,
                    total_amount: (totalAmount + totalAmount * 0.05).toString(),
                  });
                }}
                className="px-3 py-2 bg-blue-100 rounded-lg"
              >
                <Text className="text-blue-600 font-medium text-sm">Check Status</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    "Close Payment?",
                    "If payment was completed, you can check status from the orders page.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Close",
                        onPress: () => setShowPaymentWebView(false),
                      },
                    ]
                  );
                }}
                className="p-2"
              >
                <FontAwesome5 name="times" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
          {paymentSession?.id && paymentSession?.orderId && (
            <CashfreeWebView
              paymentSessionId={paymentSession.id}
              orderId={paymentSession.orderId}
              returnUrl={Linking.createURL('payment-success', {
                queryParams: {
                  order_id: paymentSession.orderId,
                  total_amount: (totalAmount + totalAmount * 0.05).toString(),
                },
              })}
              mode={PROD_MODE ? 'production' : 'sandbox'}
              onPaymentComplete={handlePaymentComplete}
              onError={handlePaymentError}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default Checkout;

