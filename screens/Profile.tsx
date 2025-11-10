import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, TextInput, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { FontAwesome5 } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { RootStackParamList } from "../roots/types";
import UserHeader from "../components/global/UserHeader";
import { API_URL } from '@env';

const API_URL_TYPED = API_URL as string;

type NavigationProp = StackNavigationProp<RootStackParamList, "Profile">;

interface TokenJSON {
  email: string;
  type: string;
  user_id: string;
}

interface UserData {
  email: string;
  name: string;
  phone: string;
  orders: any[];
  favourites: any[];
  logs: any[];
  notifications: any[];
  createdAt: string;
}

const Profile: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedData, setEditedData] = useState({ name: "", phone: "" });
  const [token, setToken] = useState<TokenJSON | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

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
    if (token) fetchUserData();
  }, [token]);

  const fetchUserData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await fetch(`${API_URL_TYPED}/api/user/mobile/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(token),
      });

      const data = await response.json();
      if (data.success && data.user) {
        setUserData(data.user);
        setEditedData({ name: data.user.name || "", phone: data.user.phone || "" });
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateInfo = async () => {
    if (!token) return;
    try {
      setSaving(true);
      const response = await fetch(`${API_URL_TYPED}/api/user/mobile/update-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...token, ...editedData }),
      });

      const data = await response.json();
      if (data.success) {
        setUserData({ ...userData!, ...editedData });
        setIsEditing(false);
        Alert.alert("Success", "Profile updated successfully!");
      } else {
        Alert.alert("Error", data.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-900">
        <UserHeader />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-900">
      <UserHeader />
      <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 100 }}>
        <View className="bg-white dark:bg-slate-800 rounded-xl p-6 mb-4">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-2">User Profile</Text>
          <Text className="text-gray-600 dark:text-gray-400">Manage your account and view activity</Text>
        </View>

        <View className="bg-white dark:bg-slate-800 rounded-xl p-6 mb-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">Account Information</Text>
            {!isEditing && (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <FontAwesome5 name="edit" size={18} color="#2563eb" />
              </TouchableOpacity>
            )}
          </View>

          <View className="space-y-4">
            <View>
              <Text className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Name</Text>
              {isEditing ? (
                <TextInput
                  value={editedData.name}
                  onChangeText={(text) => setEditedData({ ...editedData, name: text })}
                  className="bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                />
              ) : (
                <Text className="text-gray-900 dark:text-white">{userData?.name || "-"}</Text>
              )}
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Phone</Text>
              {isEditing ? (
                <TextInput
                  value={editedData.phone}
                  onChangeText={(text) => setEditedData({ ...editedData, phone: text })}
                  className="bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                />
              ) : (
                <Text className="text-gray-900 dark:text-white">{userData?.phone || "-"}</Text>
              )}
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Email Address</Text>
              <Text className="text-gray-900 dark:text-white">{userData?.email || "-"}</Text>
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Member Since</Text>
              <Text className="text-gray-900 dark:text-white">{formatDate(userData?.createdAt || "")}</Text>
            </View>

            {isEditing && (
              <View className="flex-row gap-3 mt-4">
                <TouchableOpacity
                  onPress={updateInfo}
                  disabled={saving}
                  className="flex-1 bg-blue-500 rounded-lg px-4 py-3 items-center"
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text className="text-white font-semibold">Save Changes</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setIsEditing(false);
                    setEditedData({ name: userData?.name || "", phone: userData?.phone || "" });
                  }}
                  className="flex-1 bg-gray-300 dark:bg-slate-600 rounded-lg px-4 py-3 items-center"
                >
                  <Text className="text-gray-900 dark:text-white font-semibold">Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <View className="bg-white dark:bg-slate-800 rounded-xl p-6">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account Statistics</Text>
          <View className="flex-row flex-wrap gap-4">
            <View className="w-[48%] bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 items-center">
              <FontAwesome5 name="shopping-bag" size={24} color="#2563eb" />
              <Text className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                {userData?.orders.length || 0}
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Orders</Text>
            </View>
            <View className="w-[48%] bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 items-center">
              <FontAwesome5 name="heart" size={24} color="#10b981" />
              <Text className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                {userData?.favourites.length || 0}
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">Favourites</Text>
            </View>
            <View className="w-[48%] bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 items-center">
              <FontAwesome5 name="bell" size={24} color="#f59e0b" />
              <Text className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">
                {userData?.notifications.filter((n: any) => !n.read).length || 0}
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">Unread Notifications</Text>
            </View>
            <View className="w-[48%] bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 items-center">
              <FontAwesome5 name="chart-line" size={24} color="#a855f7" />
              <Text className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                {userData?.logs.length || 0}
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">Activity Logs</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Profile;

