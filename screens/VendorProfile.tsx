import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { FontAwesome5 } from "@expo/vector-icons";
import { RootStackParamList } from "../roots/types";
import UserHeader from "../components/global/UserHeader";
import Constants from "expo-constants";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

type NavigationProp = StackNavigationProp<RootStackParamList, "VendorProfile">;
type RouteProp = RouteProp<RootStackParamList, "VendorProfile">;

interface Vendor {
  _id: string;
  shopName: string;
  email: string;
  contactNumber?: string;
  location?: {
    address?: string;
    pincode?: string;
    lat?: number;
    lng?: number;
  };
  prices?: {
    color?: { [key: string]: number };
    black_white?: { [key: string]: number };
    binding?: { [key: string]: number };
  };
  services?: {
    colorPrinting?: boolean;
    blackWhitePrinting?: boolean;
    binding?: boolean;
  };
  openHours?: {
    open?: string;
    close?: string;
  };
  isVerified?: boolean;
  createdAt?: string;
}

const VendorProfile: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  const { vendorId } = route.params;
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchVendorDetails();
  }, [vendorId]);

  const fetchVendorDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/vendors/${vendorId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (data.success) {
        setVendor(data.vendor);
      }
    } catch (error) {
      console.error("Error fetching vendor details:", error);
    } finally {
      setLoading(false);
    }
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

  if (!vendor) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-900">
        <UserHeader />
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-xl font-semibold text-gray-900 dark:text-white">Vendor not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-900">
      <UserHeader />
      <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 100 }}>
        <View className="bg-white dark:bg-slate-800 rounded-xl p-6 mb-4">
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-1">
              <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{vendor.shopName}</Text>
              <Text className="text-gray-600 dark:text-gray-400">View vendor details and create orders</Text>
            </View>
            {vendor.isVerified ? (
              <View className="bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full">
                <Text className="text-green-700 dark:text-green-400 text-sm font-medium">Verified</Text>
              </View>
            ) : (
              <View className="bg-amber-100 dark:bg-amber-900/30 px-3 py-1 rounded-full">
                <Text className="text-amber-700 dark:text-amber-400 text-sm font-medium">Unverified</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate("CreateOrder", { vendorId: vendor._id })}
            className="bg-blue-500 rounded-xl px-6 py-3 items-center mt-4"
          >
            <Text className="text-white font-semibold">Create Order</Text>
          </TouchableOpacity>
        </View>

        <View className="bg-white dark:bg-slate-800 rounded-xl p-6 mb-4">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Shop Information</Text>
          <View className="space-y-3">
            <View>
              <Text className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Shop Name</Text>
              <Text className="text-gray-900 dark:text-white">{vendor.shopName || "-"}</Text>
            </View>
            <View>
              <Text className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Email Address</Text>
              <Text className="text-gray-900 dark:text-white">{vendor.email || "-"}</Text>
            </View>
            <View>
              <Text className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Contact Number</Text>
              <Text className="text-gray-900 dark:text-white">{vendor.contactNumber || "-"}</Text>
            </View>
          </View>
        </View>

        {vendor.location && (
          <View className="bg-white dark:bg-slate-800 rounded-xl p-6 mb-4">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Location Details</Text>
            <View className="space-y-3">
              <View>
                <Text className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Address</Text>
                <Text className="text-gray-900 dark:text-white">{vendor.location.address || "-"}</Text>
              </View>
              <View>
                <Text className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Pincode</Text>
                <Text className="text-gray-900 dark:text-white">{vendor.location.pincode || "-"}</Text>
              </View>
            </View>
          </View>
        )}

        {vendor.prices && (
          <View className="bg-white dark:bg-slate-800 rounded-xl p-6 mb-4">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pricing</Text>
            {vendor.prices.color && (
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Color Printing</Text>
                {Object.entries(vendor.prices.color).map(([size, price]) => (
                  <View key={size} className="flex-row justify-between py-2">
                    <Text className="text-gray-600 dark:text-gray-400">{size}</Text>
                    <Text className="font-semibold text-gray-900 dark:text-white">₹{price}</Text>
                  </View>
                ))}
              </View>
            )}
            {vendor.prices.black_white && (
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Black & White</Text>
                {Object.entries(vendor.prices.black_white).map(([size, price]) => (
                  <View key={size} className="flex-row justify-between py-2">
                    <Text className="text-gray-600 dark:text-gray-400">{size}</Text>
                    <Text className="font-semibold text-gray-900 dark:text-white">₹{price}</Text>
                  </View>
                ))}
              </View>
            )}
            {vendor.prices.binding && (
              <View>
                <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Binding Services</Text>
                {Object.entries(vendor.prices.binding).map(([type, price]) => (
                  <View key={type} className="flex-row justify-between py-2">
                    <Text className="text-gray-600 dark:text-gray-400 capitalize">{type}</Text>
                    <Text className="font-semibold text-gray-900 dark:text-white">₹{price}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {vendor.services && (
          <View className="bg-white dark:bg-slate-800 rounded-xl p-6">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Services Offered</Text>
            <View className="space-y-3">
              <View className="flex-row items-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                <View
                  className={`w-3 h-3 rounded-full mr-3 ${
                    vendor.services.colorPrinting ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                />
                <Text className="text-gray-700 dark:text-gray-300 font-medium">Color Printing</Text>
              </View>
              <View className="flex-row items-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                <View
                  className={`w-3 h-3 rounded-full mr-3 ${
                    vendor.services.blackWhitePrinting ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                />
                <Text className="text-gray-700 dark:text-gray-300 font-medium">Black & White Printing</Text>
              </View>
              <View className="flex-row items-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                <View
                  className={`w-3 h-3 rounded-full mr-3 ${
                    vendor.services.binding ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                />
                <Text className="text-gray-700 dark:text-gray-300 font-medium">Binding Services</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default VendorProfile;

