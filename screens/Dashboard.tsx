import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, ActivityIndicator, SafeAreaView } from "react-native";
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

interface Order {
  paymentStatus?: string;
  status: string;
  totalPrice: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalOrders: 0,
    paidOrders: 0,
    totalSpent: 0,
    completedOrders: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
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
    if (token) fetchStats();
  }, [token]);

  const fetchStats = async () => {
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
        const orders: Order[] = data.orders;
        const totalOrders = orders.length;
        const paidOrders = orders.filter((o) => o.paymentStatus === "paid").length;
        const totalSpent = orders.filter((o) => o.paymentStatus === "paid").reduce((sum, o) => sum + o.totalPrice, 0);
        const completedOrders = orders.filter((o) => o.status === "completed").length;

        setStats({ totalOrders, paidOrders, totalSpent, completedOrders });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const StatCard: React.FC<{ icon: string; label: string; value: string | number; color: string }> = ({
    icon,
    label,
    value,
    color,
  }) => (
    <View className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-4">
      <View className="flex-row items-center justify-between mb-2">
        <View className={`p-3 rounded-xl bg-${color}-100 dark:bg-${color}-900/30`}>
          <FontAwesome5 name={icon as any} size={24} color={color === "blue" ? "#2563eb" : color === "purple" ? "#a855f7" : color === "green" ? "#10b981" : "#059669"} />
        </View>
        <View className="items-end">
          <Text className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</Text>
          <Text className={`text-2xl font-bold text-${color}-600 dark:text-${color}-400`}>{value}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-900">
      <UserHeader />
      <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="mb-6">
          <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Dashboard Overview</Text>
          <Text className="text-lg text-gray-600 dark:text-gray-400">
            Track your printing activity and spending insights
          </Text>
        </View>

        {loading ? (
          <View className="items-center justify-center py-16">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text className="text-gray-600 dark:text-gray-400 mt-4">Loading your dashboard...</Text>
          </View>
        ) : (
          <>
            <StatCard icon="clipboard-list" label="Total Orders" value={stats.totalOrders} color="blue" />
            <StatCard icon="money-bill-alt" label="Paid Orders" value={stats.paidOrders} color="purple" />
            <StatCard icon="check-circle" label="Completed Orders" value={stats.completedOrders} color="green" />
            <StatCard icon="rupee-sign" label="Total Spent" value={`₹${stats.totalSpent.toLocaleString()}`} color="emerald" />

            <View className="bg-white dark:bg-slate-800 rounded-xl p-6 mt-4">
              <Text className="text-xl font-bold text-gray-900 dark:text-white mb-4">Quick Insights</Text>
              <View className="flex-row flex-wrap gap-4">
                <View className="w-[48%] bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 items-center">
                  <Text className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                    {stats.totalOrders > 0 ? Math.round((stats.completedOrders / stats.totalOrders) * 100) : 0}%
                  </Text>
                  <Text className="text-sm text-gray-600 dark:text-gray-400">Completion Rate</Text>
                </View>
                <View className="w-[48%] bg-green-50 dark:bg-green-900/20 rounded-xl p-4 items-center">
                  <Text className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                    {stats.totalOrders > 0 ? Math.round((stats.paidOrders / stats.totalOrders) * 100) : 0}%
                  </Text>
                  <Text className="text-sm text-gray-600 dark:text-gray-400">Payment Rate</Text>
                </View>
                <View className="w-full bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 items-center">
                  <Text className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                    ₹{stats.paidOrders > 0 ? Math.round(stats.totalSpent / stats.paidOrders) : 0}
                  </Text>
                  <Text className="text-sm text-gray-600 dark:text-gray-400">Avg. Order Value</Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
      <BottomNavigation />
    </SafeAreaView>
  );
};

export default Dashboard;

