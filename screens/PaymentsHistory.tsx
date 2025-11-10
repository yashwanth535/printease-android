import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, Modal } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import UserHeader from "../components/global/UserHeader";
import BottomNavigation from "../components/global/BottomNavigation";
import { API_URL } from '@env';

const API_URL_TYPED = API_URL as string;

interface TokenJSON {
  email: string;
  type: string;
  user_id: string;
}

interface Vendor {
  shopName?: string;
}

interface Order {
  _id: string;
  pages: number;
  sets: number;
  color: boolean;
  size: string;
  binding?: string;
  totalPrice: number;
  paidAt?: string;
  vendorId?: Vendor;
}

const PaymentsHistory: React.FC = () => {
  const [paidOrders, setPaidOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [token, setToken] = useState<TokenJSON | null>(null);

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
    if (token) fetchPaidOrders();
  }, [token]);

  const fetchPaidOrders = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await fetch(`${API_URL_TYPED}/api/order/mobile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(token),
      });

      const data = await response.json();
      if (data.success && data.orders) {
        const paid = data.orders.filter((o: Order) => o.paidAt);
        setPaidOrders(paid);
      } else {
        setError(data.message || "Failed to fetch payments");
      }
    } catch (err) {
      console.error("Error fetching payments:", err);
      setError("Error fetching payments");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-900">
      <UserHeader />
      <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 120 }}>
        {loading ? (
          <View className="items-center justify-center py-16">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text className="text-gray-600 dark:text-gray-400 mt-4">Loading your payments...</Text>
          </View>
        ) : error ? (
          <View className="items-center justify-center py-16">
            <Text className="text-red-500 mb-4">{error}</Text>
          </View>
        ) : paidOrders.length === 0 ? (
          <View className="items-center justify-center py-16">
            <FontAwesome5 name="receipt" size={48} color="#9ca3af" />
            <Text className="text-xl font-semibold text-gray-900 dark:text-white mt-4 mb-2">No Payments Yet</Text>
            <Text className="text-gray-600 dark:text-gray-400 text-center">
              You haven't made any payments yet. Your completed payments will appear here once you place and pay for
              orders.
            </Text>
          </View>
        ) : (
          <View className="space-y-4">
            {paidOrders.map((order) => (
              <View key={order._id} className="bg-white dark:bg-slate-800 rounded-xl p-4">
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-1">
                    <Text className="font-bold text-gray-900 dark:text-white text-lg">
                      Order #{order._id.slice(-6)}
                    </Text>
                    <View className="flex-row items-center mt-1">
                      <FontAwesome5 name="check-circle" size={14} color="#10b981" />
                      <Text className="text-sm font-semibold text-green-600 dark:text-green-400 ml-1 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
                        PAID
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedOrder(order)}
                    className="bg-blue-500 rounded-lg px-4 py-2"
                  >
                    <Text className="text-white text-sm font-medium">View Details</Text>
                  </TouchableOpacity>
                </View>

                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-600 dark:text-gray-400 text-sm">Paid:</Text>
                  <Text className="text-gray-900 dark:text-white text-sm">
                    {order.paidAt ? new Date(order.paidAt).toLocaleDateString() : "-"}
                  </Text>
                </View>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-600 dark:text-gray-400 text-sm">Vendor:</Text>
                  <Text className="text-gray-900 dark:text-white text-sm">
                    {order.vendorId?.shopName || "Unknown"}
                  </Text>
                </View>
                <View className="flex-row justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                  <Text className="text-lg font-bold text-gray-900 dark:text-white">Total:</Text>
                  <Text className="text-lg font-bold text-gray-900 dark:text-white">₹{order.totalPrice}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={selectedOrder !== null} transparent animationType="fade" onRequestClose={() => setSelectedOrder(null)}>
        <View className="flex-1 bg-black/60 justify-center items-center p-4">
          <View className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md">
            <Text className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
              Order #{selectedOrder?._id.slice(-6)}
            </Text>
            {selectedOrder && (
              <View className="space-y-3">
                <View className="flex-row justify-between">
                  <Text className="text-gray-600 dark:text-gray-400">Pages</Text>
                  <Text className="font-medium text-gray-900 dark:text-white">{selectedOrder.pages}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-gray-600 dark:text-gray-400">Copies</Text>
                  <Text className="font-medium text-gray-900 dark:text-white">{selectedOrder.sets}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-gray-600 dark:text-gray-400">Print</Text>
                  <Text className="font-medium text-gray-900 dark:text-white">
                    {selectedOrder.color ? "Color" : "B/W"}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-gray-600 dark:text-gray-400">Binding</Text>
                  <Text className="font-medium text-gray-900 dark:text-white">
                    {selectedOrder.binding === "none" ? "None" : selectedOrder.binding || "None"}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-gray-600 dark:text-gray-400">Size</Text>
                  <Text className="font-medium text-gray-900 dark:text-white">{selectedOrder.size}</Text>
                </View>
                <View className="flex-row justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
                  <Text className="text-gray-600 dark:text-gray-400 font-medium">Total Paid</Text>
                  <Text className="text-xl font-bold text-green-600 dark:text-green-400">₹{selectedOrder.totalPrice}</Text>
                </View>
              </View>
            )}
            <TouchableOpacity
              onPress={() => setSelectedOrder(null)}
              className="mt-6 bg-red-500 rounded-xl p-3"
            >
              <Text className="text-white text-center font-semibold">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <BottomNavigation />
    </SafeAreaView>
  );
};

export default PaymentsHistory;

