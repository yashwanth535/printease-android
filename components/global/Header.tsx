import { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Modal } from 'react-native';
import { Menu, X, Home, Info } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

interface HeaderProps {
  onAuthPress: (type: 'signin' | 'signup') => void;
}
export type RootStackParamList = {
  Landing: undefined;
  Home: undefined;
};
type NavigationProp = StackNavigationProp<RootStackParamList>;

const Header = ({ onAuthPress }: HeaderProps) => {
  const navigation = useNavigation<NavigationProp>();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'About', path: '/about', icon: Info }
  ];

  const handleNavigation = (path: string) => {
    setIsMenuOpen(false);
    if (path === '/') {
      navigation.navigate('Landing');
    } 
    // else {
    //   router.push(path);
    // }
  };

  return (
    <>
      {/* Header */}
      <View className="bg-white/80 backdrop-blur-xl rounded-2xl mx-4 mt-4 shadow-lg border border-gray-200">
        <View className="px-6 py-4">
          {/* Main Header Row */}
          <View className="flex-row justify-between items-center">
            {/* Logo */}
            <TouchableOpacity 
              className="flex-row items-center gap-3"
              onPress={() => handleNavigation('/')}
            >
              <View className="w-10 h-10 bg-blue-100 rounded-xl items-center justify-center">
                <Text className="text-2xl">🖨️</Text>
              </View>
              <Text className="text-xl font-bold text-gray-900">
                PrintEase
              </Text>
            </TouchableOpacity>

            {/* Desktop Buttons - Hidden on mobile */}
            <View className="hidden md:flex flex-row items-center gap-3">
              <TouchableOpacity
                className="px-4 py-2 bg-gray-100 rounded-lg active:scale-95"
                onPress={() => onAuthPress('signin')}
              >
                <Text className="text-sm font-semibold text-gray-700">
                  Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="px-4 py-2 bg-blue-600 rounded-lg active:scale-95"
                onPress={() => onAuthPress('signup')}
              >
                <Text className="text-sm font-semibold text-white">
                  Get Started
                </Text>
              </TouchableOpacity>
            </View>

            {/* Mobile Menu Button */}
            <TouchableOpacity
              className="p-2 bg-gray-100 rounded-xl active:scale-95"
              onPress={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X color="#1f2937" size={20} />
              ) : (
                <Menu color="#1f2937" size={20} />
              )}
            </TouchableOpacity>
          </View>

          {/* Mobile Menu - Expandable */}
          {isMenuOpen && (
            <View className="mt-4 pt-4 border-t border-gray-200">
              {/* Navigation Links */}
              <View className="gap-3 mb-4">
                {navItems.map((item) => (
                  <TouchableOpacity
                    key={item.name}
                    className="flex-row items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg active:bg-gray-100"
                    onPress={() => handleNavigation(item.path)}
                  >
                    <item.icon color="#4b5563" size={18} />
                    <Text className="text-base font-medium text-gray-700">
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Auth Buttons */}
              <View className="gap-3 pt-3 border-t border-gray-200">
                <TouchableOpacity
                  className="w-full px-4 py-3 bg-gray-100 rounded-lg active:scale-98"
                  onPress={() => {
                    setIsMenuOpen(false);
                    onAuthPress('signin');
                  }}
                >
                  <Text className="text-sm font-semibold text-gray-700 text-center">
                    Sign In
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="w-full px-4 py-3 bg-blue-600 rounded-lg active:scale-98"
                  onPress={() => {
                    setIsMenuOpen(false);
                    onAuthPress('signup');
                  }}
                >
                  <Text className="text-sm font-semibold text-white text-center">
                    Get Started
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </>
  );
};

export default Header;