import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { FontAwesome5 } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { RootStackParamList } from "../roots/types";
import UserHeader from "../components/global/UserHeader";
import BottomNavigation from "../components/global/BottomNavigation";

const API_URL = process.env.API_URL as string;

type NavigationProp = StackNavigationProp<RootStackParamList, "Favourites">;

interface TokenJSON {
  email: string;
  type: string;
  user_id: string;
}

interface Vendor {
  _id: string;
  shopName: string;
  location?: {
    address?: string;
  };
}

const Favourites: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [vendors, setVendors] = useState<Vendor[]>([]);
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
    if (token) fetchFavourites();
  }, [token]);

  const fetchFavourites = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/user/mobile/favourites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(token),
      });

      const data = await response.json();
      if (data.success && data.vendors) {
        setVendors(data.vendors);
      }
    } catch (err) {
      console.error("Error fetching favourites:", err);
    } finally {
      setLoading(false);
    }
  };

  const removeFavourite = async (vendorId: string) => {
    if (!token) return;
    Alert.alert("Remove Favourite", "Are you sure you want to remove this vendor from favourites?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            const response = await fetch(`${API_URL}/api/user/mobile/favourites/remove`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...token, vendorId }),
            });

            const data = await response.json();
            if (data.success) {
              setVendors((prev) => prev.filter((v) => v._id !== vendorId));
            }
          } catch (err) {
            console.error(err);
            Alert.alert("Error", "Failed to remove favourite");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-900">
      <UserHeader />
      <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 120 }}>
        {loading ? (
          <View className="items-center justify-center py-16">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text className="text-gray-600 dark:text-gray-400 mt-4">Loading your favourite vendors...</Text>
          </View>
        ) : vendors.length === 0 ? (
          <View className="items-center justify-center py-16">
            <FontAwesome5 name="heart" size={48} color="#9ca3af" />
            <Text className="text-xl font-semibold text-gray-900 dark:text-white mt-4 mb-2">No Favourites Yet</Text>
            <Text className="text-gray-600 dark:text-gray-400 mb-6 text-center">
              You haven't added any vendors to your favourites.
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("Vendors")}
              className="bg-blue-500 rounded-xl px-6 py-3"
            >
              <Text className="text-white font-semibold">Browse Vendors</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="flex-row flex-wrap gap-4">
            {vendors.map((vendor) => (
              <View key={vendor._id} className="w-full bg-white dark:bg-slate-800 rounded-xl p-4 mb-4">
                <View className="flex-row justify-between items-start mb-4">
                  <View className="flex-1">
                    <View className="flex-row items-center mb-2">
                      <FontAwesome5 name="store" size={20} color="#2563eb" />
                      <Text className="font-bold text-gray-900 dark:text-white text-lg ml-2">
                        {vendor.shopName}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <FontAwesome5 name="heart" size={14} color="#ef4444" />
                      <Text className="text-sm text-red-600 dark:text-red-400 font-medium ml-1">Favourite</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => removeFavourite(vendor._id)} className="p-2">
                    <FontAwesome5 name="trash" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>

                {vendor.location?.address && (
                  <View className="flex-row items-start mb-4">
                    <FontAwesome5 name="map-marker-alt" size={14} color="#6b7280" />
                    <Text className="text-sm text-gray-600 dark:text-gray-400 ml-2 flex-1">
                      {vendor.location.address}
                    </Text>
                  </View>
                )}

                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={() => navigation.navigate("VendorProfile", { vendorId: vendor._id })}
                    className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-xl py-3 items-center"
                  >
                    <FontAwesome5 name="eye" size={16} color="#374151" />
                    <Text className="text-gray-700 dark:text-gray-300 text-sm font-medium mt-1">View Profile</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => navigation.navigate("CreateOrder", { vendorId: vendor._id })}
                    className="flex-1 bg-blue-500 rounded-xl py-3 items-center"
                  >
                    <FontAwesome5 name="plus" size={16} color="white" />
                    <Text className="text-white text-sm font-medium mt-1">Create Order</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      <BottomNavigation />
    </SafeAreaView>
  );
};

export default Favourites;

