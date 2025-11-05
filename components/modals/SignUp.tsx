import { useState } from 'react';
import * as SecureStore from 'expo-secure-store';
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

interface SignUpProps {
  visible: boolean;
  onClose: () => void;
  onSwitchToSignIn: () => void;
}

const SignUp = ({ visible, onClose, onSwitchToSignIn }: SignUpProps) => {
  const API_URL = process.env.API_URL;
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);

  const handleSendOTP = async () => {
    setMessage('');
    setLoading(true);

    try {
      // Check if user exists
      const response = await fetch(`${API_URL}/api/auth/userExists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email,isVendor:false }),
      });

      const data = await response.json();

      if (response.status === 400) {
        setMessage('Email already registered');
        setLoading(false);
        return;
      }

      // Generate OTP
      const otpResponse = await fetch(`${API_URL}/api/auth/generateOTP`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          text: 'This is your one time password to register into PrintEase',
        }),
      });

      const otpData = await otpResponse.json();

      if (otpResponse.ok) {
        if (otpData.otp_token) {
          await SecureStore.setItemAsync('otp_token', otpData.otp_token);
          console.log('✅ OTP token stored securely');
        }
        setMessage('OTP sent to your email');
        setShowOtpInput(true);
      } else {
        setMessage(otpData.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('Error during signup:', error);
      setMessage('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setMessage('');
    setLoading(true);
    const otpString = otp.join('');
    const otp_token = await SecureStore.getItemAsync('otp_token');
    try {
      const response = await fetch(`${API_URL}/api/auth/verifyOTP`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          otp: otpString,
          otp_token
         }),
      });

      const data = await response.json();

      if (response.status === 400) {
        setMessage(data.message);
      } else { 
        await SecureStore.deleteItemAsync('otp_token');
        await signUpUser();
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      setMessage('Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  const signUpUser = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName, phone }),
      });

      const data = await response.json();

      if (response.status === 400) {
        await SecureStore.setItemAsync('accessToken', data.token);
        setMessage(data.message);
      } else {
        // Navigate to home or close modal
        onClose();
      }
    } catch (error) {
      console.error('Error during signup:', error);
      setMessage('Failed to create account');
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    if (value && !/^[0-9]$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
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
                    {showOtpInput ? 'Verify OTP' : 'Create Account'}
                  </Text>
                  <TouchableOpacity
                    onPress={onClose}
                    className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
                  >
                    <X color="#374151" size={20} />
                  </TouchableOpacity>
                </View>

                {!showOtpInput ? (
                  /* Sign Up Form */
                  <View className="space-y-4">
                    {/* Full Name */}
                    <View>
                      <Text className="text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </Text>
                      <TextInput
                        className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                        placeholder="Enter your full name"
                        value={fullName}
                        onChangeText={setFullName}
                        autoComplete="name"
                      />
                    </View>

                    {/* Phone */}
                    <View>
                      <Text className="text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </Text>
                      <TextInput
                        className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                        placeholder="Enter your phone number"
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                        maxLength={10}
                      />
                    </View>

                    {/* Email */}
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

                    {/* Password */}
                    <View>
                      <Text className="text-sm font-medium text-gray-700 mb-2">
                        Password
                      </Text>
                      <View className="relative">
                        <TextInput
                          className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-12 text-gray-900"
                          placeholder="Choose a password"
                          value={password}
                          onChangeText={setPassword}
                          secureTextEntry={!showPassword}
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

                    {/* Continue Button */}
                    <TouchableOpacity
                      onPress={handleSendOTP}
                      disabled={loading}
                      className={`bg-blue-600 py-4 rounded-xl mt-6 ${loading ? 'opacity-50' : ''}`}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text className="text-white text-center text-lg font-semibold">
                          Continue
                        </Text>
                      )}
                    </TouchableOpacity>

                    {/* Error Message */}
                    {message ? (
                      <View className={`p-3 rounded-xl ${
                        message.includes('sent') 
                          ? 'bg-green-50' 
                          : 'bg-red-50'
                      }`}>
                        <Text className={`text-sm text-center ${
                          message.includes('sent')
                            ? 'text-green-700'
                            : 'text-red-700'
                        }`}>
                          {message}
                        </Text>
                      </View>
                    ) : null}

                    {/* Switch to Sign In */}
                    <View className="pt-4">
                      <Text className="text-center text-gray-600">
                        Already have an account?{' '}
                        <Text 
                          onPress={onSwitchToSignIn}
                          className="text-blue-600 font-medium"
                        >
                          Sign In
                        </Text>
                      </Text>
                    </View>
                  </View>
                ) : (
                  /* OTP Verification */
                  <View className="space-y-4">
                    <Text className="text-sm text-gray-600 text-center mb-4">
                      We've sent a verification code to your email
                    </Text>

                    {/* OTP Input */}
                    <View className="flex-row justify-center gap-2 mb-6">
                      {otp.map((digit, index) => (
                        <TextInput
                          key={index}
                          className="w-12 h-12 bg-gray-50 border-2 border-gray-200 rounded-xl text-center text-lg font-semibold text-gray-900"
                          value={digit}
                          onChangeText={(value) => handleOtpChange(index, value)}
                          keyboardType="number-pad"
                          maxLength={1}
                        />
                      ))}
                    </View>

                    {/* Verify Button */}
                    <TouchableOpacity
                      onPress={handleVerifyOTP}
                      disabled={loading || otp.join('').length !== 6}
                      className={`bg-blue-600 py-4 rounded-xl ${
                        (loading || otp.join('').length !== 6) ? 'opacity-50' : ''
                      }`}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text className="text-white text-center text-lg font-semibold">
                          Verify OTP
                        </Text>
                      )}
                    </TouchableOpacity>

                    {/* Error Message */}
                    {message ? (
                      <View className="bg-red-50 p-3 rounded-xl">
                        <Text className="text-sm text-center text-red-700">
                          {message}
                        </Text>
                      </View>
                    ) : null}

                    {/* Back Button */}
                    <TouchableOpacity
                      onPress={() => setShowOtpInput(false)}
                      className="pt-4"
                    >
                      <Text className="text-center text-gray-600 font-medium">
                        ← Back
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default SignUp;