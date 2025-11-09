import React from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { FontAwesome5 } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList } from "../../roots/types";

type NavigationProp = StackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<RootStackParamList, keyof RootStackParamList>;

interface NavItem {
  path: keyof RootStackParamList;
  icon: React.ComponentProps<typeof FontAwesome5>["name"];
  label: string;
  color: string;
}

const BottomNavigation: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoutePropType>();
  const insets = useSafeAreaInsets();

  // Check active route
  const isActive = (path: keyof RootStackParamList) => route.name === path;

  // Bottom navigation items
  const navItems: NavItem[] = [
    { path: "Home", icon: "clipboard-list", label: "Orders", color: "blue" },
    { path: "Vendors", icon: "plus", label: "New Order", color: "emerald" },
    { path: "Payments", icon: "money-check-alt", label: "Payments", color: "purple" },
    { path: "Dashboard", icon: "chart-line", label: "Dashboard", color: "indigo" },
    { path: "Favourites", icon: "heart", label: "Favorites", color: "rose" },
  ];

  return (
    <View 
      className="absolute bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t border-slate-200 dark:border-slate-700"
      style={{ paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 0 : 8) }}
    >
      <View className="flex-row justify-around py-3">
        {navItems.map((item) => (
          <TouchableOpacity
            key={item.path}
            onPress={() => navigation.navigate(item.path)}
            className={`items-center px-2 py-1 flex-1 ${
              isActive(item.path) ? "bg-slate-100 dark:bg-slate-800 rounded-xl" : ""
            }`}
          >
            <FontAwesome5
              name={item.icon}
              size={18}
              color={isActive(item.path) ? "#2563eb" : "#64748b"}
            />
            <Text
              className={`text-xs mt-1 ${
                isActive(item.path)
                  ? "text-blue-600 dark:text-blue-400 font-semibold"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default BottomNavigation;

