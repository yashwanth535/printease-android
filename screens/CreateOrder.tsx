import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { FontAwesome5 } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { RootStackParamList } from "../roots/types";
import UserHeader from "../components/global/UserHeader";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const EXPO_PUBLIC_SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

// Helper function to decode base64 to Uint8Array (since atob might not be available in React Native)
const base64ToBytes = (base64: string): Uint8Array => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  
  // Remove data URL prefix if present
  base64 = base64.replace(/^data:.*,/, '');
  
  // Remove whitespace
  base64 = base64.replace(/\s/g, '');
  
  for (let i = 0; i < base64.length; i += 4) {
    const encoded1 = chars.indexOf(base64[i]);
    const encoded2 = chars.indexOf(base64[i + 1]);
    const encoded3 = chars.indexOf(base64[i + 2]);
    const encoded4 = chars.indexOf(base64[i + 3]);
    
    const bitmap = (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4;
    
    result += String.fromCharCode((bitmap >> 16) & 255);
    if (encoded3 !== 64) result += String.fromCharCode((bitmap >> 8) & 255);
    if (encoded4 !== 64) result += String.fromCharCode(bitmap & 255);
  }
  
  const bytes = new Uint8Array(result.length);
  for (let i = 0; i < result.length; i++) {
    bytes[i] = result.charCodeAt(i);
  }
  return bytes;
};

type NavigationProp = StackNavigationProp<RootStackParamList, "CreateOrder">;
type CreateOrderRouteProp = RouteProp<RootStackParamList, "CreateOrder">;


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
  contactNumber?: string;
  prices?: {
    color?: { [key: string]: number };
    black_white?: { [key: string]: number };
    binding?: { [key: string]: number };
  };
}

const CreateOrder: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<CreateOrderRouteProp>();
  const { vendorId } = route.params || {};
  const [token, setToken] = useState<TokenJSON | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);

  const [fileType, setFileType] = useState<string>("pdf");
  const [copies, setCopies] = useState<string>("1");
  const [printType, setPrintType] = useState<string>("color");
  const [paperSize, setPaperSize] = useState<string>("A4");
  const [binding, setBinding] = useState<string>("no");
  const [notes, setNotes] = useState<string>("");
  const [fileUrl, setFileUrl] = useState<string>("");
  const [pageCount, setPageCount] = useState<number>(1);
  const [selectedFile, setSelectedFile] = useState<any>(null);

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
    if (vendorId) {
      fetchVendorDetails();
    }
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

  const handleFilePicker = async () => {
    try {
      const mimeTypes: { [key: string]: string } = {
        pdf: "application/pdf",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        jpg: "image/jpeg",
        png: "image/png",
      };

      const result = await DocumentPicker.getDocumentAsync({
        type: mimeTypes[fileType] || "*/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedFile(file);
        setPageCount(1); // For now, set to 1. PDF page count detection would require additional libraries like react-native-pdf
        await handleFileUpload(file);
      }
    } catch (error) {
      console.error("Error picking file:", error);
      Alert.alert("Error", "Failed to pick file. Please make sure expo-document-picker is installed.");
    }
  };

  const handleFileUpload = async (file: any) => {
    if (!token) return;
    try {
      setUploading(true);
      // Get signed URL
      const signedUrlResponse = await fetch(`${API_URL}/api/user/mobile/signed-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...token,
          fileName: file.name,
          contentType: file.mimeType || "application/pdf",
        }),
      });

      const { signedUrl, path } = await signedUrlResponse.json();
      if (!signedUrl) throw new Error("Signed URL not received");

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: "base64" as any,
      });

      // Convert base64 to Uint8Array for upload
      const bytes = base64ToBytes(base64);

      // Upload to Supabase signed URL - convert Uint8Array to ArrayBuffer
      const uploadResponse = await fetch(signedUrl, {
        method: "PUT",
        headers: { 
          "Content-Type": file.mimeType || "application/pdf",
        },
        body: bytes.buffer,
      });

      if (!uploadResponse.ok) throw new Error("Upload failed");

      const fullUrl = `${EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/printease/${path}`;
      setFileUrl(fullUrl);
      Alert.alert("Success", "File uploaded successfully!");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const calculateTotal = (): number => {
    if (!vendor) return 0;
    const priceMap = vendor.prices;
    const perPageKey = printType === "color" ? "color" : "black_white";
    const pageSizePrice = priceMap?.[perPageKey as keyof typeof priceMap]?.[paperSize as keyof typeof priceMap] || 0;
    const bindingPrice = binding !== "no" ? priceMap?.binding?.[binding] || 0 : 0;
    const totalPages = pageCount * parseInt(copies);
    return totalPages * pageSizePrice + bindingPrice;
  };

  const handleSubmit = async () => {
    if (!fileUrl) {
      Alert.alert("Error", "Please upload a file before submitting.");
      return;
    }
    if (!token) return;

    const orderData = {
      fileUrl,
      totalPrice: calculateTotal(),
      pages: pageCount,
      color: printType === "color",
      sets: parseInt(copies),
      size: paperSize,
      binding: binding === "no" ? "none" : binding,
      notes,
      vendorId: vendorId || null,
    };

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/order/mobile/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...token, ...orderData }),
      });

      const data = await response.json();
      if (data.success) {
        Alert.alert("Success", "Order Created Successfully");
        navigation.navigate("Cart");
      } else {
        Alert.alert("Error", "Failed to create order");
      }
    } catch (error) {
      console.error("Error creating order:", error);
      Alert.alert("Error", "Error creating order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-900">
      <UserHeader />
      <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 100 }}>
        {loading && vendorId && (
          <View className="items-center justify-center py-4">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text className="text-gray-600 dark:text-gray-400 mt-2">Loading vendor details...</Text>
          </View>
        )}

        {vendor && (
          <View className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-4">
            <Text className="text-xl font-bold text-gray-900 dark:text-white mb-1">{vendor.shopName}</Text>
            {vendor.location?.address && (
              <Text className="text-gray-600 dark:text-gray-400 text-sm">{vendor.location.address}</Text>
            )}
          </View>
        )}

        <View className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-4">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Document Details</Text>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">File Type</Text>
            <View className="flex-row gap-2">
              {["pdf", "docx", "jpg", "png"].map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setFileType(type)}
                  className={`px-4 py-2 rounded-lg ${
                    fileType === type ? "bg-blue-500" : "bg-gray-200 dark:bg-slate-700"
                  }`}
                >
                  <Text className={fileType === type ? "text-white font-semibold" : "text-gray-700 dark:text-gray-300"}>
                    {type.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Upload File</Text>
            <TouchableOpacity
              onPress={handleFilePicker}
              disabled={uploading}
              className="border-2 border-dashed border-gray-300 dark:border-slate-600 p-6 rounded-lg items-center"
            >
              {uploading ? (
                <ActivityIndicator size="large" color="#2563eb" />
              ) : (
                <>
                  <FontAwesome5 name="upload" size={32} color="#6b7280" />
                  <Text className="text-gray-600 dark:text-gray-400 mt-2">Tap to upload file</Text>
                  {selectedFile && <Text className="text-sm text-gray-500 mt-1">{selectedFile.name}</Text>}
                </>
              )}
            </TouchableOpacity>
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Number of Copies</Text>
            <TextInput
              value={copies}
              onChangeText={setCopies}
              keyboardType="numeric"
              className="bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
            />
          </View>
        </View>

        <View className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-4">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Print Settings</Text>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Print Type</Text>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => setPrintType("color")}
                className={`flex-1 px-4 py-2 rounded-lg ${
                  printType === "color" ? "bg-blue-500" : "bg-gray-200 dark:bg-slate-700"
                }`}
              >
                <Text className={printType === "color" ? "text-white text-center font-semibold" : "text-gray-700 dark:text-gray-300 text-center"}>
                  Color
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setPrintType("bw")}
                className={`flex-1 px-4 py-2 rounded-lg ${
                  printType === "bw" ? "bg-blue-500" : "bg-gray-200 dark:bg-slate-700"
                }`}
              >
                <Text className={printType === "bw" ? "text-white text-center font-semibold" : "text-gray-700 dark:text-gray-300 text-center"}>
                  B&W
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Paper Size</Text>
            <View className="flex-row flex-wrap gap-2">
              {["A4", "A3", "Letter", "Legal"].map((size) => (
                <TouchableOpacity
                  key={size}
                  onPress={() => setPaperSize(size)}
                  className={`px-4 py-2 rounded-lg ${
                    paperSize === size ? "bg-blue-500" : "bg-gray-200 dark:bg-slate-700"
                  }`}
                >
                  <Text className={paperSize === size ? "text-white font-semibold" : "text-gray-700 dark:text-gray-300"}>
                    {size}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View>
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Binding</Text>
            <View className="flex-row flex-wrap gap-2">
              {["no", "soft", "hard"].map((bind) => (
                <TouchableOpacity
                  key={bind}
                  onPress={() => setBinding(bind)}
                  className={`px-4 py-2 rounded-lg ${
                    binding === bind ? "bg-blue-500" : "bg-gray-200 dark:bg-slate-700"
                  }`}
                >
                  <Text className={binding === bind ? "text-white font-semibold" : "text-gray-700 dark:text-gray-300"}>
                    {bind === "no" ? "No Binding" : bind === "soft" ? "Soft Binding" : "Hard Binding"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-4">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Special Instructions</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Any special instructions? (Optional)"
            multiline
            numberOfLines={4}
            className="bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
          />
        </View>

        <View className="bg-slate-900 dark:bg-slate-100 rounded-xl p-6 mb-4">
          <Text className="text-xl font-bold text-white dark:text-slate-900 mb-4">Order Summary</Text>
          <View className="space-y-2 mb-4">
            <View className="flex-row justify-between">
              <Text className="text-slate-300 dark:text-slate-600 text-sm">Pages per copy:</Text>
              <Text className="font-semibold text-white dark:text-slate-900">{pageCount}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-slate-300 dark:text-slate-600 text-sm">Total copies:</Text>
              <Text className="font-semibold text-white dark:text-slate-900">{copies}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-slate-300 dark:text-slate-600 text-sm">Print type:</Text>
              <Text className="font-semibold text-white dark:text-slate-900 capitalize">
                {printType === "bw" ? "Black & White" : "Color"}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-slate-300 dark:text-slate-600 text-sm">Paper size:</Text>
              <Text className="font-semibold text-white dark:text-slate-900">{paperSize}</Text>
            </View>
            <View className="flex-row justify-between pt-4 border-t border-slate-300/30 dark:border-slate-600/30">
              <Text className="text-lg font-bold text-white dark:text-slate-900">Total Cost:</Text>
              <Text className="text-lg font-bold text-white dark:text-slate-900">₹{calculateTotal().toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <View className="flex-row gap-4">
          <TouchableOpacity
            onPress={() => (vendorId ? navigation.navigate("Vendors") : navigation.goBack())}
            className="flex-1 bg-gray-300 dark:bg-slate-600 rounded-xl px-6 py-3 items-center"
          >
            <Text className="text-gray-900 dark:text-white font-semibold">Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading || !fileUrl}
            className={`flex-1 rounded-xl px-6 py-3 items-center ${
              loading || !fileUrl ? "bg-gray-300" : "bg-blue-500"
            }`}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white font-semibold">Submit Order</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default CreateOrder;

