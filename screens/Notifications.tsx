import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, ActivityIndicator, SafeAreaView } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import UserHeader from "../components/global/UserHeader";
import { API_URL } from '@env';

const API_URL_TYPED = API_URL as string;

interface TokenJSON {
  email: string;
  type: string;
  user_id: string;
}

interface Notification {
  message: string;
  type?: string;
  read: boolean;
  createdAt: string;
}

interface Log {
  message: string;
  createdAt: string;
}

const Notifications: React.FC = () => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
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
    if (token) fetchData();
  }, [token]);

  const fetchData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await fetch(`${API_URL_TYPED}/api/user/mobile/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(token),
      });

      const data = await response.json();
      if (data.success) {
        setLogs(data.logs || []);
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error("Error fetching logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getNotificationIcon = (type?: string) => {
    switch (type) {
      case "success":
        return <FontAwesome5 name="check-circle" size={20} color="#10b981" />;
      case "warning":
        return <FontAwesome5 name="exclamation-triangle" size={20} color="#f59e0b" />;
      case "error":
        return <FontAwesome5 name="times-circle" size={20} color="#ef4444" />;
      default:
        return <FontAwesome5 name="bell" size={20} color="#6b7280" />;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-900">
      <UserHeader />
      <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 100 }}>
        {loading ? (
          <View className="items-center justify-center py-16">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text className="text-gray-600 dark:text-gray-400 mt-4">Loading your notifications...</Text>
          </View>
        ) : (
          <>
            <View className="bg-white dark:bg-slate-800 rounded-xl p-6 mb-4">
              <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Notifications</Text>
              {notifications.length === 0 ? (
                <View className="items-center py-12">
                  <FontAwesome5 name="bell" size={48} color="#9ca3af" />
                  <Text className="text-gray-500 dark:text-gray-400 mt-4">No notifications yet.</Text>
                </View>
              ) : (
                <View className="space-y-3">
                  {notifications.slice(-10).reverse().map((item, idx) => (
                    <View
                      key={idx}
                      className={`p-4 rounded-xl ${
                        item.read
                          ? "bg-gray-50 dark:bg-slate-700"
                          : "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                      }`}
                    >
                      <View className="flex-row items-start">
                        <View className="mr-3 mt-0.5">{getNotificationIcon(item.type)}</View>
                        <View className="flex-1">
                          <Text className="text-gray-800 dark:text-gray-200 font-medium">{item.message}</Text>
                          <Text className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {formatDate(item.createdAt)}
                          </Text>
                          {!item.read && (
                            <View className="bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded mt-2 self-start">
                              <Text className="text-xs text-blue-800 dark:text-blue-300">New</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View className="bg-white dark:bg-slate-800 rounded-xl p-6">
              <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Activity Logs</Text>
              {logs.length === 0 ? (
                <View className="items-center py-12">
                  <FontAwesome5 name="clock" size={48} color="#9ca3af" />
                  <Text className="text-gray-500 dark:text-gray-400 mt-4">No activity logs yet.</Text>
                </View>
              ) : (
                <View className="space-y-3">
                  {logs.slice(-10).reverse().map((item, idx) => (
                    <View key={idx} className="p-4 bg-gray-50 dark:bg-slate-700 rounded-xl">
                      <View className="flex-row items-start">
                        <FontAwesome5 name="clock" size={16} color="#6b7280" className="mr-3 mt-0.5" />
                        <View className="flex-1">
                          <Text className="text-gray-800 dark:text-gray-200 text-sm">{item.message}</Text>
                          <Text className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {formatDate(item.createdAt)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Notifications;

