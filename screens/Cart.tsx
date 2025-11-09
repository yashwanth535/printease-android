import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, SafeAreaView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { MotiView } from "moti";
import { FontAwesome5 } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { RootStackParamList } from "../roots/types";
import UserHeader from "../components/global/UserHeader";

const API_URL = process.env.API_URL as string;

type NavigationProp = StackNavigationProp<RootStackParamList, "Cart">;

interface Vendor {
  shopName?: string;
}

interface Order {
  _id: string;
  pages: number;
  sets: number;
  color: boolean;
  size: string;
  totalPrice: number;
  status: string;
  createdAt: string;
  notes?: string;
  binding?: string;
  vendorId?: Vendor;
}

interface TokenJSON {
  email: string;
  type: string;
  user_id: string;
}

const Cart: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [deletingOrder, setDeletingOrder] = useState<string | null>(null);
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
    if (token) fetchOrders();
  }, [token]);

  const fetchOrders = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/order/mobile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(token),
      });

      const data = await response.json();
      if (data.success && data.orders) {
        const pendingOrders = data.orders.filter((order: Order) => order.status === "pending");
        setOrders(pendingOrders);
      } else {
        setError(data.message || "Failed to fetch orders");
      }
    } catch (err) {
      console.error(err);
      setError("Error fetching orders");
    } finally {
      setLoading(false);
    }
  };

  const calculateSubtotal = (): number => {
    return Array.from(selectedOrders)
      .reduce((total, orderId) => {
        const order = orders.find((o) => o._id === orderId);
        return total + (order?.totalPrice || 0);
      }, 0);
  };

  const calculateTax = (): number => {
    return calculateSubtotal() * 0.05;
  };

  const calculateTotal = (): number => {
    return calculateSubtotal() + calculateTax();
  };

  const handleOrderSelection = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedOrders.size === orders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(orders.map((order) => order._id)));
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    Alert.alert("Delete Order", "Are you sure you want to delete this order?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (!token) return;
          try {
            setDeletingOrder(orderId);
            const response = await fetch(`${API_URL}/api/order/mobile/delete`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...token, orderId }),
            });

            const data = await response.json();
            if (data.success) {
              setOrders((prev) => prev.filter((o) => o._id !== orderId));
              const newSelected = new Set(selectedOrders);
              newSelected.delete(orderId);
              setSelectedOrders(newSelected);
            } else {
              Alert.alert("Error", data.message || "Failed to delete order");
            }
          } catch (err) {
            console.error(err);
            Alert.alert("Error", "Failed to delete order");
          } finally {
            setDeletingOrder(null);
          }
        },
      },
    ]);
  };

  const handleCheckout = () => {
    if (selectedOrders.size === 0) {
      Alert.alert("Error", "Please select at least one order to checkout!");
      return;
    }

    const selectedOrderIds = Array.from(selectedOrders);
    const totalAmount = calculateSubtotal();

    navigation.navigate("Checkout", {
      selectedOrders: selectedOrderIds,
      totalAmount: totalAmount,
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-900">
      <UserHeader />
      <ScrollView 
        className="flex-1 p-4" 
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={true}
      >
        {loading ? (
          <View className="items-center justify-center py-16">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text className="text-gray-600 dark:text-gray-400 mt-4">Loading your cart...</Text>
          </View>
        ) : error ? (
          <View className="items-center justify-center py-16">
            <Text className="text-red-500 mb-4">{error}</Text>
            <TouchableOpacity onPress={fetchOrders} className="bg-blue-500 rounded-xl px-6 py-3">
              <Text className="text-white font-semibold">Retry</Text>
            </TouchableOpacity>
          </View>
        ) : orders.length === 0 ? (
          <View className="items-center justify-center py-16">
            <FontAwesome5 name="shopping-cart" size={48} color="#9ca3af" />
            <Text className="text-xl font-semibold text-gray-900 dark:text-white mt-4 mb-2">
              Your cart is empty
            </Text>
            <Text className="text-gray-600 dark:text-gray-400 mb-6 text-center">
              No pending orders found. Create a new order to get started.
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("Vendors")}
              className="bg-blue-500 rounded-xl px-6 py-3"
            >
              <Text className="text-white font-semibold">Browse Vendors</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-gray-900 dark:text-white">
                Pending Orders ({orders.length})
              </Text>
              {orders.length > 0 && (
                <TouchableOpacity onPress={handleSelectAll} className="bg-blue-500 rounded-lg px-4 py-2">
                  <Text className="text-white text-sm font-medium">
                    {selectedOrders.size === orders.length ? "Deselect All" : "Select All"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {orders.map((order, index) => (
              <MotiView
                key={order._id}
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-white dark:bg-slate-800 rounded-xl p-4 mb-4 ${
                  selectedOrders.has(order._id) ? "border-2 border-blue-500" : ""
                }`}
              >
                <View className="flex-row items-start justify-between mb-4">
                  <View className="flex-row items-center flex-1">
                    <TouchableOpacity
                      onPress={() => handleOrderSelection(order._id)}
                      className="w-6 h-6 border-2 border-gray-300 dark:border-gray-600 rounded items-center justify-center mr-3"
                    >
                      {selectedOrders.has(order._id) && (
                        <FontAwesome5 name="check" size={14} color="#2563eb" />
                      )}
                    </TouchableOpacity>
                    <View className="flex-1">
                      <Text className="font-bold text-gray-900 dark:text-white text-lg">
                        Order #{order._id.slice(-6)}
                      </Text>
                      <Text className="text-gray-600 dark:text-gray-400 text-sm">
                        {order.vendorId?.shopName || "Unknown Vendor"}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center">
                    <View className="bg-amber-100 dark:bg-amber-900/30 px-3 py-1 rounded-full mr-2">
                      <Text className="text-amber-800 dark:text-amber-400 text-xs font-medium">PENDING</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteOrder(order._id)}
                      disabled={deletingOrder === order._id}
                      className="p-2"
                    >
                      {deletingOrder === order._id ? (
                        <ActivityIndicator size="small" color="red" />
                      ) : (
                        <FontAwesome5 name="trash" size={16} color="red" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <View className="flex-row flex-wrap gap-2 mb-3">
                  <View className="w-[48%] bg-gray-50 dark:bg-slate-700 rounded-lg p-3">
                    <Text className="text-gray-500 dark:text-gray-400 text-xs mb-1">Pages</Text>
                    <Text className="font-semibold text-gray-900 dark:text-white">{order.pages}</Text>
                  </View>
                  <View className="w-[48%] bg-gray-50 dark:bg-slate-700 rounded-lg p-3">
                    <Text className="text-gray-500 dark:text-gray-400 text-xs mb-1">Copies</Text>
                    <Text className="font-semibold text-gray-900 dark:text-white">{order.sets}</Text>
                  </View>
                  <View className="w-[48%] bg-gray-50 dark:bg-slate-700 rounded-lg p-3">
                    <Text className="text-gray-500 dark:text-gray-400 text-xs mb-1">Type</Text>
                    <Text className="font-semibold text-gray-900 dark:text-white">
                      {order.color ? "Color" : "B&W"}
                    </Text>
                  </View>
                  <View className="w-[48%] bg-gray-50 dark:bg-slate-700 rounded-lg p-3">
                    <Text className="text-gray-500 dark:text-gray-400 text-xs mb-1">Size</Text>
                    <Text className="font-semibold text-gray-900 dark:text-white">{order.size}</Text>
                  </View>
                </View>

                <View className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-3">
                  <Text className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Pricing Breakdown</Text>
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-gray-600 dark:text-gray-400 text-sm">Base Price:</Text>
                    <Text className="font-medium text-gray-900 dark:text-white">₹{order.totalPrice.toFixed(2)}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-gray-600 dark:text-gray-400 text-sm">Platform Fee (5%):</Text>
                    <Text className="font-medium text-gray-900 dark:text-white">
                      ₹{(order.totalPrice * 0.05).toFixed(2)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <Text className="font-semibold text-gray-900 dark:text-white">Total:</Text>
                    <Text className="font-semibold text-gray-900 dark:text-white">
                      ₹{(order.totalPrice + order.totalPrice * 0.05).toFixed(2)}
                    </Text>
                  </View>
                </View>

                {order.notes && (
                  <View className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                    <Text className="text-sm text-blue-800 dark:text-blue-200">
                      <Text className="font-semibold">Notes:</Text> {order.notes}
                    </Text>
                  </View>
                )}
              </MotiView>
            ))}

            {/* Order Summary - Sticky at bottom */}
            <View className="bg-white dark:bg-slate-800 rounded-xl p-6 mt-4 mb-4 border-2 border-gray-200 dark:border-gray-700">
              <View className="flex-row items-center mb-4">
                <FontAwesome5 name="credit-card" size={20} color="#2563eb" />
                <Text className="text-xl font-bold text-gray-900 dark:text-white ml-2">Order Summary</Text>
              </View>
              
              <View className="space-y-3 mb-4">
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-600 dark:text-gray-400">Selected Items:</Text>
                  <Text className="font-semibold text-gray-900 dark:text-white">
                    {selectedOrders.size} of {orders.length}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-600 dark:text-gray-400">Subtotal:</Text>
                  <Text className="font-semibold text-gray-900 dark:text-white">₹{calculateSubtotal().toFixed(2)}</Text>
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-600 dark:text-gray-400">Platform Fee (5%):</Text>
                  <Text className="font-semibold text-gray-900 dark:text-white">₹{calculateTax().toFixed(2)}</Text>
                </View>
                <View className="flex-row justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
                  <Text className="text-lg font-bold text-gray-900 dark:text-white">Total:</Text>
                  <Text className="text-lg font-bold text-green-600 dark:text-green-400">₹{calculateTotal().toFixed(2)}</Text>
                </View>
              </View>

              {selectedOrders.size === 0 ? (
                <View className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
                  <Text className="text-amber-600 dark:text-amber-400 text-sm text-center font-medium">
                    Please select at least one order to proceed
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity
                onPress={handleCheckout}
                disabled={selectedOrders.size === 0}
                className={`rounded-xl p-4 flex-row items-center justify-center ${
                  selectedOrders.size === 0 
                    ? "bg-gray-300 dark:bg-gray-700 opacity-60" 
                    : "bg-green-500 dark:bg-green-600"
                }`}
                style={{
                  shadowColor: selectedOrders.size > 0 ? "#10b981" : "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: selectedOrders.size > 0 ? 0.3 : 0.1,
                  shadowRadius: 4,
                  elevation: selectedOrders.size > 0 ? 5 : 2,
                }}
              >
                <FontAwesome5 
                  name="credit-card" 
                  size={20} 
                  color={selectedOrders.size === 0 ? "#9ca3af" : "white"} 
                />
                <Text className={`text-lg font-semibold ml-2 ${
                  selectedOrders.size === 0 
                    ? "text-gray-500 dark:text-gray-400" 
                    : "text-white"
                }`}>
                  {selectedOrders.size === 0 
                    ? "Select Orders to Checkout" 
                    : `Proceed to Checkout (${selectedOrders.size} ${selectedOrders.size === 1 ? 'order' : 'orders'})`}
                </Text>
              </TouchableOpacity>

              <Text className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
                By proceeding, you agree to our terms and conditions
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Cart;

