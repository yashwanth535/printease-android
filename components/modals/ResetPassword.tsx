import { useState } from 'react';
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
import Constants from 'expo-constants';

interface ResetPasswordProps {
  visible: boolean;
  onClose: () => void;
  onSwitchToSignIn: () => void;
}

const ResetPassword = ({ visible, onClose, onSwitchToSignIn }: ResetPasswordProps) => {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'otp' | 'password'>('email');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);

  const handleSendOTP = async () => {
    setMessage('');
    setLoading(true);

    try {
      // Check if user exists
      const response = await fetch(`${API_URL}/api/auth/mobile/userExists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.status !== 400) {
        setMessage('Email is not registered');
        setLoading(false);
        return;
      }

      // Generate OTP
      const otpResponse = await fetch(`${API_URL}/api/auth/mobile/generateOTP`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          text: 'This is your one time password to reset password',
        }),
      });

      const otpData = await otpResponse.json();

      if (otpResponse.ok) {
        setMessage('OTP sent to your email');
        setStep('otp');
      } else {
        setMessage(otpData.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      setMessage('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setMessage('');
    setLoading(true);
    const otpString = otp.join('');

    try {
      const response = await fetch(`${API_URL}/api/auth/mobile/verifyOTP`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: otpString }),
      });

      const data = await response.json();

      if (response.status === 400) {
        setMessage(data.message);
      } else {
        setStep('password');
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      setMessage('Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (password !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }

    setMessage('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/mobile/reset_password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Password reset successful!');
        setTimeout(() => {
          onSwitchToSignIn();
        }, 2000);
      } else {
        setMessage(data.message || 'Failed to reset password.');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      setMessage('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
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
                    {step === 'email' ? 'Reset Password' : 
                     step === 'otp' ? 'Verify OTP' : 'New Password'}
                  </Text>
                  <TouchableOpacity
                    onPress={onClose}
                    className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
                  >
                    <X color="#374151" size={20} />
                  </TouchableOpacity>
                </View>

                {step === 'email' && (
                  /* Email Input */
                  <View className="space-y-4">
                    <Text className="text-sm text-gray-600 text-center mb-4">
                      Enter your email to receive a password reset code
                    </Text>

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

                    <TouchableOpacity
                      onPress={handleSendOTP}
                      disabled={loading}
                      className={`bg-blue-600 py-4 rounded-xl mt-6 ${loading ? 'opacity-50' : ''}`}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text className="text-white text-center text-lg font-semibold">
                          Send Reset Code
                        </Text>
                      )}
                    </TouchableOpacity>

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

                    <TouchableOpacity onPress={onSwitchToSignIn} className="pt-4">
                      <Text className="text-center text-gray-600 font-medium">
                        ← Back to Sign In
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {step === 'otp' && (
                  /* OTP Verification */
                  <View className="space-y-4">
                    <Text className="text-sm text-gray-600 text-center mb-4">
                      We've sent a verification code to your email
                    </Text>

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

                    {message ? (
                      <View className="bg-red-50 p-3 rounded-xl">
                        <Text className="text-sm text-center text-red-700">
                          {message}
                        </Text>
                      </View>
                    ) : null}

                    <TouchableOpacity
                      onPress={() => setStep('email')}
                      className="pt-4"
                    >
                      <Text className="text-center text-gray-600 font-medium">
                        ← Back
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {step === 'password' && (
                  /* New Password */
                  <View className="space-y-4">
                    <Text className="text-sm text-gray-600 text-center mb-4">
                      Create your new password
                    </Text>

                    {/* New Password */}
                    <View>
                      <Text className="text-sm font-medium text-gray-700 mb-2">
                        New Password
                      </Text>
                      <View className="relative">
                        <TextInput
                          className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-12 text-gray-900"
                          placeholder="Enter new password"
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

                    {/* Confirm Password */}
                    <View>
                      <Text className="text-sm font-medium text-gray-700 mb-2">
                        Confirm New Password
                      </Text>
                      <View className="relative">
                        <TextInput
                          className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-12 text-gray-900"
                          placeholder="Confirm new password"
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                          secureTextEntry={!showConfirmPassword}
                        />
                        <TouchableOpacity
                          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-4 top-3"
                        >
                          {showConfirmPassword ? (
                            <EyeOff color="#6B7280" size={20} />
                          ) : (
                            <Eye color="#6B7280" size={20} />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>

                    {password && confirmPassword && password !== confirmPassword && (
                      <View className="bg-amber-50 p-2 rounded-xl">
                        <Text className="text-xs text-center text-amber-700">
                          Passwords don't match
                        </Text>
                      </View>
                    )}

                    <TouchableOpacity
                      onPress={handleResetPassword}
                      disabled={loading || password !== confirmPassword}
                      className={`bg-blue-600 py-4 rounded-xl mt-6 ${
                        (loading || password !== confirmPassword) ? 'opacity-50' : ''
                      }`}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text className="text-white text-center text-lg font-semibold">
                          Update Password
                        </Text>
                      )}
                    </TouchableOpacity>

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

export default ResetPassword;