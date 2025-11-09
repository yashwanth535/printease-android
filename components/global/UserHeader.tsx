import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { MotiView } from "moti";
import { FontAwesome5 } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { RootStackParamList } from "../../roots/types";

type NavigationProp = StackNavigationProp<RootStackParamList>;

const UserHeader: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  // ✅ Logout handler
  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await SecureStore.deleteItemAsync("accessToken");
            navigation.reset({
              index: 0,
              routes: [{ name: "Landing" }],
            });
          } catch (error: any) {
            console.error("Logout error:", error.message);
            await SecureStore.deleteItemAsync("accessToken").catch(() => {});
            navigation.reset({
              index: 0,
              routes: [{ name: "Landing" }],
            });
          }
        },
      },
    ]);
  };

  return (
    <View className="w-full bg-white dark:bg-zinc-900 shadow-md pt-8">
      <MotiView
        from={{ opacity: 0, translateY: -20 }}
        animate={{ opacity: 1, translateY: 0 }}
        className="flex-row justify-between items-center px-5 py-3"
      >
        {/* Logo Section */}
        <TouchableOpacity
          onPress={() => navigation.navigate("Home")}
          className="flex-row items-center"
        >
          <View className="w-9 h-9 bg-blue-500 rounded-lg items-center justify-center mr-2">
            <FontAwesome5 name="print" size={18} color="white" />
          </View>
          <Text className="text-xl font-bold text-slate-900 dark:text-slate-100">
            PrintEase
          </Text>
        </TouchableOpacity>

        {/* Icon Section */}
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => navigation.navigate("Notifications")}
            className="mx-3"
          >
            <FontAwesome5 name="bell" size={18} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("Profile")}
            className="mx-3"
          >
            <FontAwesome5 name="user" size={18} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("Cart")}
            className="mx-3"
          >
            <FontAwesome5 name="shopping-cart" size={18} color="#10b981" />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleLogout} className="ml-3">
            <FontAwesome5 name="sign-out-alt" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </MotiView>
    </View>
  );
};

export default UserHeader;
