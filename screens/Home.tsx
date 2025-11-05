import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MotiView } from "moti";
import { StackNavigationProp } from "@react-navigation/stack";
import { FontAwesome5 } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { RootStackParamList } from "../roots/types";

const API_URL = process.env.API_URL as string;

type NavigationProp = StackNavigationProp<RootStackParamList, "Home">;

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
  status: "pending" | "accepted" | "in_progress" | "completed";
  createdAt: string;
  paidAt?: string;
  notes?: string;
  binding?: string;
  vendorId?: Vendor;
}

interface TokenJSON {
  email: string;
  type: string;
  user_id: string;
}

interface FetchOrdersResponse {
  success: boolean;
  message?: string;
  orders?: Order[];
}

const Home: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<"active" | "completed" | "pending">("active");
  const [deletingOrder, setDeletingOrder] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [token, setToken] = useState<TokenJSON | null>(null);

  // Load token from SecureStore
  useEffect(() => {
    const loadToken = async () => {
      const tokenString = await SecureStore.getItemAsync("accessToken");
      if (!tokenString) {
        console.log("No token found");
        return;
      }
      try {
        const parsedToken: TokenJSON = JSON.parse(tokenString);
        setToken(parsedToken);
      } catch (err) {
        console.error("Failed to parse token:", err);
      }
    };
    loadToken();
  }, []);

  // Fetch orders once token is available
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

      const data: FetchOrdersResponse = await response.json();
      if (data.success && data.orders) {
        setOrders(data.orders);
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
            const response = await fetch(`${API_URL}/api/order/${orderId}`, {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${JSON.stringify(token)}`,
              },
            });
            const data: FetchOrdersResponse = await response.json();
            if (data.success) {
              setOrders((prev) => prev.filter((o) => o._id !== orderId));
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

  const getFilteredOrders = (): Order[] => {
    return orders.filter((order) => {
      switch (selectedTab) {
        case "active":
          return order.status === "accepted" || order.status === "in_progress";
        case "completed":
          return order.status === "completed";
        case "pending":
          return order.status === "pending";
      }
    });
  };

  const ordersToShow = getFilteredOrders();

  const DetailRow: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
    <View className="flex-row justify-between items-center p-3 bg-white/30 dark:bg-slate-800/30 rounded-xl mb-2">
      <Text className="text-gray-700 dark:text-gray-300 font-medium">{label}</Text>
      <Text className="font-semibold text-gray-900 dark:text-white">{value}</Text>
    </View>
  );

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-slate-900 p-4">
      {/* Tabs */}
      <View className="flex-row justify-around mb-4">
        {(["active", "completed", "pending"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setSelectedTab(tab)}
            className={`px-4 py-2 rounded-xl ${
              selectedTab === tab ? "bg-blue-500 dark:bg-blue-700" : "bg-white/50 dark:bg-slate-800/50"
            }`}
          >
            <Text className={`${selectedTab === tab ? "text-white" : "text-gray-700 dark:text-gray-300"}`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" className="my-10" />
      ) : error ? (
        <Text className="text-red-500 text-center my-10">{error}</Text>
      ) : ordersToShow.length === 0 ? (
        <Text className="text-center text-gray-700 dark:text-gray-300 my-10">
          No {selectedTab} orders yet
        </Text>
      ) : (
        ordersToShow.map((order) => (
          <MotiView
            key={order._id}
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/60 dark:bg-slate-800/60 p-4 rounded-xl mb-4"
          >
            <View className="flex-row justify-between mb-2">
              <View>
                <Text className="font-bold text-gray-900 dark:text-white">Order #{order._id.slice(-6)}</Text>
                <Text className="text-gray-600 dark:text-gray-400">{order.vendorId?.shopName || "Unknown Vendor"}</Text>
              </View>
              <View className="flex-row items-center">
                <Text className="px-2 py-1 rounded-full text-xs bg-green-200 dark:bg-green-700 text-green-700 dark:text-green-300">
                  {order.status.toUpperCase()}
                </Text>
                {order.status === "pending" && (
                  <TouchableOpacity
                    onPress={() => handleDeleteOrder(order._id)}
                    className="ml-2 p-2 bg-red-100 dark:bg-red-900/30 rounded-full"
                  >
                    <FontAwesome5 name="trash" size={16} color="red" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Order Details */}
            <View className="grid grid-cols-2 gap-2">
              <DetailRow label="Pages" value={order.pages} />
              <DetailRow label="Copies" value={order.sets} />
              <DetailRow label="Type" value={order.color ? "Color" : "B&W"} />
              <DetailRow label="Total" value={`₹${order.totalPrice}`} />
            </View>

            <TouchableOpacity onPress={() => setSelectedOrder(order)} className="mt-3 px-4 py-2 bg-blue-500 rounded-xl">
              <Text className="text-white text-center">View Details</Text>
            </TouchableOpacity>
          </MotiView>
        ))
      )}

      {/* Selected Order Modal */}
      {selectedOrder && (
        <MotiView
          className="absolute inset-0 bg-black/60 justify-center items-center"
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 w-11/12 max-w-md">
            <Text className="text-lg font-bold mb-2">Order #{selectedOrder._id.slice(-6)}</Text>
            <DetailRow label="Pages" value={selectedOrder.pages} />
            <DetailRow label="Copies" value={selectedOrder.sets} />
            <DetailRow label="Type" value={selectedOrder.color ? "Color" : "B&W"} />
            <DetailRow label="Total" value={`₹${selectedOrder.totalPrice}`} />
            {selectedOrder.notes && <DetailRow label="Notes" value={selectedOrder.notes} />}
            <TouchableOpacity onPress={() => setSelectedOrder(null)} className="mt-4 bg-red-500 rounded-xl p-2">
              <Text className="text-white text-center">Close</Text>
            </TouchableOpacity>
          </View>
        </MotiView>
      )}
    </ScrollView>
  );
};

export default Home;
