import { useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from '@react-navigation/stack';
import Constants from 'expo-constants';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Pressable
} from 'react-native';
import { Eye, EyeOff, X } from 'lucide-react-native';

interface SignInProps {
  visible: boolean;
  onClose: () => void;
  onSwitchToSignUp: () => void;
  onSwitchToResetPassword: () => void;
}

type RootStackParamList = {
  Landing: undefined;
  Login: undefined;
  Home: undefined;
};

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

const SignIn = ({ visible, onClose, onSwitchToSignUp, onSwitchToResetPassword }: SignInProps) => {
  const navigation = useNavigation<LoginScreenNavigationProp>();

  const API_URL = Constants.expoConfig?.extra?.API_URL as string;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setMessage('');
    setLoading(true);
  
    try {
      const requestUrl = `${API_URL}/api/auth/signin`;
      const payload = { email, password, isVendor: false };
  
      console.log("🔗 REQUEST URL:", requestUrl);
      console.log("📨 REQUEST BODY:", payload);
  
      const response = await fetch(requestUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
  
      console.log("📥 RAW RESPONSE STATUS:", response.status);
  
      const data = await response.json().catch(() => null);
      console.log("📥 RESPONSE JSON:", data);
  
      if (response.ok && data?.success) {
        await SecureStore.setItemAsync("accessToken", JSON.stringify(data.tokens));
        console.log("✅ Access token stored successfully");
        setMessage("Login successful!");
        navigation.replace("Home");
      } else {
        console.warn("⚠️ LOGIN FAILED:", data?.message || "Unknown error");
        setMessage(data?.message || "Invalid credentials");
      }
  
    } catch (error: any) {
      console.log("❌ NETWORK / FETCH ERROR");
      console.log("   Type:", error?.name);
      console.log("   Message:", error?.message);
      console.log("   Full:", JSON.stringify(error, null, 2));
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <Pressable 
          className="flex-1 bg-black/50 justify-end"
          onPress={onClose}
        >
          <Pressable 
            className="bg-white rounded-t-3xl"
            onPress={(e) => e.stopPropagation()}
          >
            <ScrollView className="max-h-[90vh]">
              <View className="p-6">
                {/* Header */}
                <View className="flex-row justify-between items-center mb-6">
                  <Text className="text-3xl font-bold text-gray-900">
                    Welcome Back
                  </Text>
                  <TouchableOpacity
                    onPress={onClose}
                    className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
                  >
                    <X color="#374151" size={20} />
                  </TouchableOpacity>
                </View>

                {/* Form */}
                <View className="space-y-4">
                  {/* Email Input */}
                  <View>
                    <Text className="text-sm font-medium text-gray-700 mb-2">
                      Email
                    </Text>
                    <TextInput
                      className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                      placeholder="Enter your email"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                    />
                  </View>

                  {/* Password Input */}
                  <View>
                    <Text className="text-sm font-medium text-gray-700 mb-2">
                      Password
                    </Text>
                    <View className="relative">
                      <TextInput
                        className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-12 text-gray-900"
                        placeholder="Enter your password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        autoComplete="password"
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-3"
                      >
                        {showPassword ? (
                          <EyeOff color="#6B7280" size={20} />
                        ) : (
                          <Eye color="#6B7280" size={20} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Sign In Button */}
                  <TouchableOpacity
                    onPress={handleSignIn}
                    disabled={loading}
                    className={`bg-blue-600 py-4 rounded-xl mt-6 ${loading ? 'opacity-50' : ''}`}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text className="text-white text-center text-lg font-semibold">
                        Sign In
                      </Text>
                    )}
                  </TouchableOpacity>

                  {/* Error Message */}
                  {message ? (
                    <View className={`p-3 rounded-xl ${
                      message.includes('successful') 
                        ? 'bg-green-50' 
                        : 'bg-red-50'
                    }`}>
                      <Text className={`text-sm text-center ${
                        message.includes('successful')
                          ? 'text-green-700'
                          : 'text-red-700'
                      }`}>
                        {message}
                      </Text>
                    </View>
                  ) : null}

                  {/* Links */}
                  <View className="flex-row justify-between pt-4">
                    <TouchableOpacity onPress={onSwitchToResetPassword}>
                      <Text className="text-gray-600 font-medium">
                        Forgot password?
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onSwitchToSignUp}>
                      <Text className="text-gray-600 font-medium">
                        Create account
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default SignIn;