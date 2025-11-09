import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import type { RouteProp } from "@react-navigation/native";
import { FontAwesome5 } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { RootStackParamList } from "../roots/types";
import UserHeader from "../components/global/UserHeader";

const API_URL = process.env.API_URL as string;

type NavigationProp = StackNavigationProp<RootStackParamList, "PaymentSuccess">;
type PaymentSuccessRouteProp = RouteProp<RootStackParamList, "PaymentSuccess">;

interface TokenJSON {
  email: string;
  type: string;
  user_id: string;
}

const PaymentSuccess: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PaymentSuccessRouteProp>();
  const [loading, setLoading] = useState<boolean>(true);
  const [paymentStatus, setPaymentStatus] = useState<"success" | "pending" | "error" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<TokenJSON | null>(null);

  const orderId = route.params?.order_id;
  const totalAmount = route.params?.total_amount;

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
    if (orderId && token) {
      verifyPayment();
    } else {
      setError("No order ID found");
      setLoading(false);
    }
  }, [orderId, token]);

  const checkOrderStatusDirectly = async () => {
    // Check order status directly from our database as fallback
    if (!token || !orderId) return;
    try {
      const response = await fetch(`${API_URL}/api/order/mobile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...token }),
      });
      const data = await response.json();
      if (data.success && data.orders) {
        // Check if any order with this paymentOrderId has status 'accepted'
        const paidOrder = data.orders.find((o: any) => 
          o.paymentOrderId === orderId && 
          (o.status === 'accepted' || o.status === 'in_progress' || o.paymentStatus === 'paid')
        );
        if (paidOrder) {
          console.log("Order found in accepted status - payment succeeded!");
          setPaymentStatus("success");
          return;
        }
      }
      setPaymentStatus("pending");
    } catch (error) {
      console.error("Error checking order status:", error);
      setPaymentStatus("pending");
    }
  };

  const verifyPayment = async (retryCount = 0) => {
    if (!token || !orderId) return;
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_URL}/api/order/mobile/verify-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...token, orderId, totalAmount }),
      });

      const data = await response.json();
      console.log("Payment verification response:", data);
      
      if (data.success) {
        // If payment is paid, show success
        if (data.isPaid) {
          setPaymentStatus("success");
        } 
        // If payment is pending, check order status in our database
        else if (data.orderStatus === 'PAID' || data.orderStatus === 'ACTIVE') {
          setPaymentStatus("success");
        }
        // If order status shows it's being processed, it might be paid
        else if (retryCount < 3) {
          // Retry after a delay - payment might still be processing
          console.log(`Payment not confirmed yet, retrying... (${retryCount + 1}/3)`);
          setTimeout(() => {
            verifyPayment(retryCount + 1);
          }, 3000); // Wait 3 seconds before retry
          return;
        } else {
          // After 3 retries, check database directly - order might already be updated
          console.log("Cashfree says not paid after retries, checking database order status...");
          await checkOrderStatusDirectly();
        }
      } else {
        // If verification fails, check if orders are already updated (payment might have succeeded)
        // This handles the case where Cashfree API fails but payment actually succeeded
        if (retryCount < 2) {
          console.log(`Verification failed, retrying... (${retryCount + 1}/2)`);
          setTimeout(() => {
            verifyPayment(retryCount + 1);
          }, 2000);
          return;
        }
        // After retries, check database directly
        console.log("Verification failed after retries, checking database order status...");
        await checkOrderStatusDirectly();
      }
    } catch (error) {
      console.error("Error verifying payment:", error);
      // Retry on network errors
      if (retryCount < 3) {
        setTimeout(() => {
          verifyPayment(retryCount + 1);
        }, 2000);
        return;
      }
      setError("Error verifying payment. Please check your orders to confirm payment status.");
      setPaymentStatus("error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-900">
        <UserHeader />
        <View className="flex-1 items-center justify-center p-4">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="text-xl font-semibold text-gray-900 dark:text-white mt-4">Verifying Payment</Text>
          <Text className="text-gray-600 dark:text-gray-400 mt-2 text-center">
            Please wait while we verify your payment...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-900">
      <UserHeader />
      <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 100 }}>
        {paymentStatus === "success" && (
          <View className="bg-white dark:bg-slate-800 rounded-xl p-6 items-center">
            <View className="w-20 h-20 bg-green-500 rounded-full items-center justify-center mb-4">
              <FontAwesome5 name="check-circle" size={40} color="white" />
            </View>
            <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Payment Successful!</Text>
            <Text className="text-gray-600 dark:text-gray-400 text-center mb-6">
              Your payment has been processed successfully. Your orders have been moved to active status and will be
              processed by the vendors.
            </Text>
            <View className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 w-full mb-6">
              <Text className="text-green-800 dark:text-green-200 font-semibold text-center">
                Order ID: {orderId}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate("Home")}
              className="bg-blue-500 rounded-xl px-8 py-4 w-full items-center"
            >
              <Text className="text-white text-lg font-semibold">View My Orders</Text>
            </TouchableOpacity>
          </View>
        )}

        {paymentStatus === "pending" && (
          <View className="bg-white dark:bg-slate-800 rounded-xl p-6 items-center">
            <View className="w-20 h-20 bg-amber-500 rounded-full items-center justify-center mb-4">
              <FontAwesome5 name="clock" size={40} color="white" />
            </View>
            <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Payment Pending</Text>
            <Text className="text-gray-600 dark:text-gray-400 text-center mb-6">
              Your payment is still being processed. Please wait a few minutes and check again.
            </Text>
            <View className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 w-full mb-6">
              <Text className="text-amber-800 dark:text-amber-200 font-semibold text-center">
                Order ID: {orderId}
              </Text>
            </View>
            <View className="flex-row gap-4 w-full">
              <TouchableOpacity
                onPress={() => verifyPayment(0)}
                className="flex-1 bg-gray-300 dark:bg-slate-600 rounded-xl px-6 py-3 items-center"
              >
                <Text className="text-gray-900 dark:text-white font-semibold">Check Again</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate("Home")}
                className="flex-1 bg-blue-500 rounded-xl px-6 py-3 items-center"
              >
                <Text className="text-white font-semibold">View Orders</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {paymentStatus === "error" && (
          <View className="bg-white dark:bg-slate-800 rounded-xl p-6 items-center">
            <View className="w-20 h-20 bg-red-500 rounded-full items-center justify-center mb-4">
              <FontAwesome5 name="times-circle" size={40} color="white" />
            </View>
            <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Payment Verification Failed
            </Text>
            <Text className="text-gray-600 dark:text-gray-400 text-center mb-6">
              {error || "We couldn't verify your payment. Please contact support if you believe this is an error."}
            </Text>
            <View className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 w-full mb-6">
              <Text className="text-red-800 dark:text-red-200 font-semibold text-center">
                Order ID: {orderId}
              </Text>
            </View>
            <View className="flex-row gap-4 w-full">
              <TouchableOpacity
                onPress={() => verifyPayment(0)}
                className="flex-1 bg-gray-300 dark:bg-slate-600 rounded-xl px-6 py-3 items-center"
              >
                <Text className="text-gray-900 dark:text-white font-semibold">Try Again</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate("Home")}
                className="flex-1 bg-blue-500 rounded-xl px-6 py-3 items-center"
              >
                <Text className="text-white font-semibold">View Orders</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default PaymentSuccess;

