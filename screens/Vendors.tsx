import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  TextInput,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { FontAwesome5 } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { RootStackParamList } from "../roots/types";
import UserHeader from "../components/global/UserHeader";
import BottomNavigation from "../components/global/BottomNavigation";
import Constants from "expo-constants";

const API_URL = Constants.expoConfig?.extra?.API_URL as string;

type NavigationProp = StackNavigationProp<RootStackParamList, "Vendors">;

interface TokenJSON {
  email: string;
  type: string;
  user_id: string;
}

interface Vendor {
  _id: string;
  shopName: string;
  location?: { address?: string; lat?: number; lng?: number };
  services?: {
    colorPrinting?: boolean;
    blackWhitePrinting?: boolean;
    binding?: boolean;
  };
  distance?: number;
}

const Vendors: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [favourites, setFavourites] = useState<string[]>([]);
  const [token, setToken] = useState<TokenJSON | null>(null);

  // Load token
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

  // Fetch data
  useEffect(() => {
    fetchVendors();
    if (token) fetchFavourites();
  }, [token]);

  useEffect(() => {
    filterAndSortVendors();
  }, [vendors, selectedServices, searchTerm]);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/vendors`);
      const data = await response.json();
      if (data.success) setVendors(data.vendors);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFavourites = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/user/mobile/favourites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(token),
      });
      const data = await response.json();
      if (data.success) setFavourites(data.vendors.map((v: Vendor) => v._id));
    } catch (err) {
      console.error("Error fetching favourites:", err);
    }
  };

  const toggleFavourite = async (vendorId: string) => {
    if (!token) return;
    try {
      const endpoint = favourites.includes(vendorId)
        ? "remove"
        : "add";
      await fetch(`${API_URL}/api/user/mobile/favourites/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...token, vendorId }),
      });
      setFavourites((prev) =>
        favourites.includes(vendorId)
          ? prev.filter((id) => id !== vendorId)
          : [...prev, vendorId]
      );
    } catch (err) {
      console.error("Error toggling favourite:", err);
    }
  };

  const filterAndSortVendors = () => {
    let filtered = vendors;
    if (searchTerm.trim() !== "") {
      filtered = filtered.filter((v) =>
        v.shopName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (selectedServices.length > 0) {
      filtered = filtered.filter((vendor) =>
        selectedServices.some(
          (service) => vendor.services?.[service as keyof typeof vendor.services]
        )
      );
    }
    filtered = filtered.sort((a, b) => {
      if (a.distance == null) return 1;
      if (b.distance == null) return -1;
      return a.distance - b.distance;
    });
    setFilteredVendors(filtered);
  };

  const formatDistance = (distance?: number) => {
    if (distance == null) return "N/A";
    if (distance < 1) return `${(distance * 1000).toFixed(0)}m`;
    return `${distance.toFixed(1)}km`;
  };

  const serviceOptions = [
    { value: "colorPrinting", label: "Color Printing" },
    { value: "blackWhitePrinting", label: "Black & White" },
    { value: "binding", label: "Binding" },
  ];

  const handleServiceToggle = (serviceValue: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceValue)
        ? prev.filter((s) => s !== serviceValue)
        : [...prev, serviceValue]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-900">
      <UserHeader />
      <ScrollView
        className="flex-1 px-4 pt-2"
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {loading ? (
          <View className="items-center justify-center py-20">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text className="text-gray-600 dark:text-gray-400 mt-4">
              Loading vendors...
            </Text>
          </View>
        ) : (
          <>
            {/* 🔍 Search and Filters */}
            <View className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm mb-4">
              <View className="relative mb-3">
                <FontAwesome5
                  name="search"
                  size={16}
                  color="#9ca3af"
                  style={{
                    position: "absolute",
                    left: 12,
                    top: 13,
                    zIndex: 1,
                  }}
                />
                <TextInput
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  placeholder="Search vendors..."
                  placeholderTextColor="#9ca3af"
                  className="bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-full pl-10 pr-4 py-2.5 text-gray-900 dark:text-white"
                />
              </View>

              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Filter by Services
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {serviceOptions.map((service) => (
                  <TouchableOpacity
                    key={service.value}
                    onPress={() => handleServiceToggle(service.value)}
                    className={`px-4 py-2 rounded-full ${
                      selectedServices.includes(service.value)
                        ? "bg-blue-500"
                        : "bg-gray-200 dark:bg-slate-700"
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        selectedServices.includes(service.value)
                          ? "text-white"
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {service.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 🧾 Vendor Cards */}
            {filteredVendors.length === 0 ? (
              <View className="items-center py-20">
                <Text className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                  No vendors found
                </Text>
                <Text className="text-gray-500 dark:text-gray-400 text-center mt-2">
                  Try adjusting your filters or search
                </Text>
              </View>
            ) : (
              <View className="space-y-4">
                {filteredVendors.map((vendor) => (
                  <View
                    key={vendor._id}
                    className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-md border border-gray-100 dark:border-slate-700"
                  >
                    <View className="flex-row justify-between items-start mb-3">
                      <View className="flex-1">
                        <Text className="text-lg font-bold text-gray-900 dark:text-white">
                          {vendor.shopName}
                        </Text>
                        {vendor.location?.address && (
                          <View className="flex-row items-center mt-1">
                            <FontAwesome5
                              name="map-marker-alt"
                              size={12}
                              color="#ef4444"
                            />
                            <Text className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                              {vendor.location.address}
                            </Text>
                          </View>
                        )}
                        {vendor.distance !== undefined && (
                          <View className="bg-blue-100 dark:bg-blue-900/30 rounded-full px-3 py-1 self-start mt-2">
                            <Text className="text-blue-700 dark:text-blue-400 text-xs font-medium">
                              📍 {formatDistance(vendor.distance)}
                            </Text>
                          </View>
                        )}
                      </View>
                      <TouchableOpacity
                        onPress={() => toggleFavourite(vendor._id)}
                        className="p-2"
                      >
                        <FontAwesome5
                          name="star"
                          size={20}
                          color={
                            favourites.includes(vendor._id)
                              ? "#fbbf24"
                              : "#9ca3af"
                          }
                          solid={favourites.includes(vendor._id)}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Services */}
                    {vendor.services && (
                      <View className="mb-3">
                        <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Available Services
                        </Text>
                        <View className="flex-row flex-wrap gap-2">
                          {Object.entries(vendor.services)
                            .filter(([_, val]) => val)
                            .map(([key]) => (
                              <View
                                key={key}
                                className="bg-gray-100 dark:bg-slate-700 px-3 py-1 rounded-full"
                              >
                                <Text className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                  {key
                                    .replace(/([A-Z])/g, " $1")
                                    .replace(/^./, (s) => s.toUpperCase())}
                                </Text>
                              </View>
                            ))}
                        </View>
                      </View>
                    )}

                    {/* Buttons */}
                    <View className="flex-row gap-3">
                      <TouchableOpacity
                        onPress={() =>
                          navigation.navigate("VendorProfile", {
                            vendorId: vendor._id,
                          })
                        }
                        className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-xl py-3 items-center"
                      >
                        <FontAwesome5 name="eye" size={16} color="#374151" />
                        <Text className="text-gray-700 dark:text-gray-300 text-sm mt-1">
                          View
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() =>
                          navigation.navigate("CreateOrder", {
                            vendorId: vendor._id,
                          })
                        }
                        className="flex-1 bg-blue-600 rounded-xl py-3 items-center"
                      >
                        <FontAwesome5 name="plus" size={16} color="white" />
                        <Text className="text-white text-sm mt-1">
                          Order
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
      <BottomNavigation />
    </SafeAreaView>
  );
};

export default Vendors;
