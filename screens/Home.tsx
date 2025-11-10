import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MotiView } from "moti";
import { StackNavigationProp } from "@react-navigation/stack";
import { FontAwesome5 } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { RootStackParamList } from "../roots/types";
import UserHeader from "../components/global/UserHeader";
import BottomNavigation from "../components/global/BottomNavigation";
import Constants from "expo-constants";

const API_URL = Constants.expoConfig?.extra?.API_URL as string;

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<"active" | "completed" | "pending">("active");
  const [deletingOrder, setDeletingOrder] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [token, setToken] = useState<TokenJSON | null>(null);

  // Load token
  useEffect(() => {
    const loadToken = async () => {
      const tokenString = await SecureStore.getItemAsync("accessToken");
      if (!tokenString) return;
      try {
        setToken(JSON.parse(tokenString));
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
      const res = await fetch(`${API_URL}/api/order/mobile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(token),
      });
      const data: FetchOrdersResponse = await res.json();
      if (data.success && data.orders) setOrders(data.orders);
      else setError(data.message || "Failed to fetch orders");
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
            const res = await fetch(`${API_URL}/api/order/mobile/delete`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...token, orderId }),
            });
            const data: FetchOrdersResponse = await res.json();
            if (data.success) setOrders((prev) => prev.filter((o) => o._id !== orderId));
            else Alert.alert("Error", data.message || "Failed to delete order");
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

  const filteredOrders = orders.filter((o) =>
    selectedTab === "active"
      ? o.status === "accepted" || o.status === "in_progress"
      : selectedTab === "completed"
      ? o.status === "completed"
      : o.status === "pending"
  );

  const pendingOrders = orders.filter((o) => o.status === "pending");

  const DetailRow: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        backgroundColor: "#f9fafb",
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
        marginBottom: 6,
        elevation: Platform.OS === "android" ? 1 : 0,
      }}
    >
      <Text style={{ color: "#555", fontWeight: "500" }}>{label}</Text>
      <Text style={{ fontWeight: "700", color: "#111" }}>{value}</Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
      <UserHeader />
      <ScrollView style={{ flex: 1, paddingHorizontal: 16 }} contentContainerStyle={{ paddingBottom: 140 }}>
        {/* Tabs */}
        <View style={{ flexDirection: "row", justifyContent: "space-around", marginVertical: 12 }}>
          {(["active", "completed", "pending"] as const).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setSelectedTab(tab)}
              android_ripple={{ color: "#c7d2fe", borderless: false }}
              style={{
                flex: 1,
                marginHorizontal: 4,
                borderRadius: 12,
                backgroundColor: selectedTab === tab ? "#2563eb" : "#e5e7eb",
                paddingVertical: 10,
                alignItems: "center",
                elevation: selectedTab === tab ? 2 : 0,
              }}
            >
              <Text style={{ color: selectedTab === tab ? "white" : "#374151", fontWeight: "600" }}>
                {tab.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Orders */}
        {loading ? (
          <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 60 }} />
        ) : error ? (
          <Text style={{ textAlign: "center", color: "red", marginTop: 60 }}>{error}</Text>
        ) : filteredOrders.length === 0 ? (
          <Text style={{ textAlign: "center", color: "#555", marginTop: 60 }}>No {selectedTab} orders yet</Text>
        ) : (
          filteredOrders.map((order) => (
            <MotiView
              key={order._id}
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: 0.1 }}
              style={{
                backgroundColor: "white",
                borderRadius: 14,
                padding: 16,
                marginBottom: 12,
                elevation: 3,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                <View>
                  <Text style={{ fontWeight: "bold", color: "#111" }}>Order #{order._id.slice(-6)}</Text>
                  <Text style={{ color: "#666" }}>{order.vendorId?.shopName || "Unknown Vendor"}</Text>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      backgroundColor:
                        order.status === "completed"
                          ? "#dcfce7"
                          : order.status === "pending"
                          ? "#fef9c3"
                          : "#dbeafe",
                      borderRadius: 12,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "600",
                        color:
                          order.status === "completed"
                            ? "#166534"
                            : order.status === "pending"
                            ? "#92400e"
                            : "#1d4ed8",
                      }}
                    >
                      {order.status.replace("_", " ").toUpperCase()}
                    </Text>
                  </View>

                  {order.status === "pending" && (
                    <Pressable
                      onPress={() => handleDeleteOrder(order._id)}
                      android_ripple={{ color: "#fee2e2", borderless: true }}
                      style={{
                        marginLeft: 8,
                        backgroundColor: "#fee2e2",
                        borderRadius: 50,
                        padding: 6,
                      }}
                    >
                      <FontAwesome5 name="trash" size={16} color="#b91c1c" />
                    </Pressable>
                  )}
                </View>
              </View>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <View style={{ width: "48%" }}>
                  <DetailRow label="Pages" value={order.pages} />
                </View>
                <View style={{ width: "48%" }}>
                  <DetailRow label="Copies" value={order.sets} />
                </View>
                <View style={{ width: "48%" }}>
                  <DetailRow label="Type" value={order.color ? "Color" : "B&W"} />
                </View>
                <View style={{ width: "48%" }}>
                  <DetailRow label="Total" value={`₹${order.totalPrice}`} />
                </View>
              </View>

              <Pressable
                onPress={() => setSelectedOrder(order)}
                android_ripple={{ color: "#bfdbfe" }}
                style={{
                  marginTop: 12,
                  backgroundColor: "#2563eb",
                  paddingVertical: 10,
                  borderRadius: 10,
                  alignItems: "center",
                  elevation: 2,
                }}
              >
                <Text style={{ color: "white", fontWeight: "600" }}>View Details</Text>
              </Pressable>
            </MotiView>
          ))
        )}

        {/* Checkout button */}
        {selectedTab === "pending" && pendingOrders.length > 0 && (
          <Pressable
            onPress={() => navigation.navigate("Cart")}
            android_ripple={{ color: "#86efac" }}
            style={{
              backgroundColor: "#16a34a",
              borderRadius: 14,
              paddingVertical: 14,
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              marginTop: 12,
              elevation: 4,
            }}
          >
            <FontAwesome5 name="shopping-cart" size={20} color="white" />
            <Text style={{ color: "white", fontSize: 16, fontWeight: "700", marginLeft: 8 }}>
              Proceed to Checkout ({pendingOrders.length})
            </Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Order Details Modal */}
      <Modal visible={!!selectedOrder} transparent animationType="slide" onRequestClose={() => setSelectedOrder(null)}>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              maxHeight: "75%",
              elevation: 10,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "bold", color: "#111", marginBottom: 10 }}>
              Order #{selectedOrder?._id.slice(-6)}
            </Text>
            {selectedOrder && (
              <>
                <DetailRow label="Pages" value={selectedOrder.pages} />
                <DetailRow label="Copies" value={selectedOrder.sets} />
                <DetailRow label="Type" value={selectedOrder.color ? "Color" : "B&W"} />
                <DetailRow label="Size" value={selectedOrder.size} />
                {selectedOrder.binding && (
                  <DetailRow label="Binding" value={selectedOrder.binding === "none" ? "None" : selectedOrder.binding} />
                )}
                <DetailRow label="Total" value={`₹${selectedOrder.totalPrice}`} />
                {selectedOrder.notes && <DetailRow label="Notes" value={selectedOrder.notes} />}
                {selectedOrder.vendorId?.shopName && (
                  <DetailRow label="Vendor" value={selectedOrder.vendorId.shopName} />
                )}
              </>
            )}
            <Pressable
              onPress={() => setSelectedOrder(null)}
              android_ripple={{ color: "#fecaca" }}
              style={{
                backgroundColor: "#ef4444",
                borderRadius: 12,
                paddingVertical: 12,
                marginTop: 16,
                alignItems: "center",
                elevation: 3,
              }}
            >
              <Text style={{ color: "white", fontWeight: "600" }}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <BottomNavigation />
    </SafeAreaView>
  );
};

export default Home;
