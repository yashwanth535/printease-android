import React, { useState } from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { MotiView } from "moti";
import { Feather, FontAwesome5 } from "@expo/vector-icons";
// import AnimatedThemeToggler from "../../pages/global/animated-theme";

// 1️⃣ Define your RootStackParamList
export type RootStackParamList = {
  Landing: undefined;
  Home: undefined;
  Orders: undefined;
  Vendors: undefined;
  Payments: undefined;
  Dashboard: undefined;
  Favourites: undefined;
  Notifications: undefined;
  Profile: undefined;
  Cart: undefined;
};

// 2️⃣ Define navigation and route types
type NavigationProp = StackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<RootStackParamList, keyof RootStackParamList>;

// 3️⃣ Type for bottom nav items
interface NavItem {
  path: keyof RootStackParamList;
  icon: React.ComponentProps<typeof FontAwesome5>["name"];
  label: string;
  color: string;
}

const API_URL = process.env.API_URL;

const UserHeader: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoutePropType>();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // ✅ Logout handler
  const handleLogout = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Logout failed");
      const data = await response.json();
      if (data.success) navigation.navigate("Landing");
    } catch (error: any) {
      console.error("Logout error:", error.message);
    }
  };

  // ✅ Check active route
  const isActive = (path: keyof RootStackParamList) => route.name === path;

  // ✅ Bottom navigation items
  const navItems: NavItem[] = [
    { path: "Orders", icon: "clipboard-list", label: "My Orders", color: "blue" },
    { path: "Vendors", icon: "plus", label: "New Order", color: "emerald" },
    { path: "Payments", icon: "money-check-alt", label: "Payments", color: "purple" },
    { path: "Dashboard", icon: "chart-line", label: "Dashboard", color: "indigo" },
    { path: "Favourites", icon: "heart", label: "Favorites", color: "rose" },
  ];

  return (
    <View className="w-full bg-white dark:bg-zinc-900 shadow-md">
      {/* Header */}
      <MotiView
        from={{ opacity: 0, translateY: -20 }}
        animate={{ opacity: 1, translateY: 0 }}
        className="flex-row justify-between items-center px-4 py-3"
      >
        {/* Logo */}
        <TouchableOpacity
          onPress={() => navigation.navigate("Home")}
          className="flex-row items-center space-x-2"
        >
          <Image source={require("../../../assets/printer.png")} className="h-6 w-6" />
          <Text className="text-xl font-bold text-slate-900 dark:text-slate-100">PrintEase</Text>
        </TouchableOpacity>

        {/* Right Icons */}
        <View className="flex-row items-center space-x-3">
          <TouchableOpacity onPress={() => navigation.navigate("Notifications")}>
            <FontAwesome5 name="bell" size={18} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
            <FontAwesome5 name="user" size={18} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate("Cart")}>
            <FontAwesome5 name="shopping-cart" size={18} color="#10b981" />
          </TouchableOpacity>

          {/* <AnimatedThemeToggler /> */}

          <TouchableOpacity onPress={handleLogout}>
            <FontAwesome5 name="sign-out-alt" size={18} color="#ef4444" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsMenuOpen(!isMenuOpen)}>
            <Feather name={isMenuOpen ? "x" : "menu"} size={22} color="#334155" />
          </TouchableOpacity>
        </View>
      </MotiView>

      {/* Mobile Dropdown */}
      {isMenuOpen && (
        <MotiView
          from={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 300 }}
          className="border-t border-slate-200 dark:border-slate-700 px-4 py-3"
        >
          {["Notifications", "Profile", "Favourites"].map((item) => (
            <TouchableOpacity
              key={item}
              onPress={() => {
                navigation.navigate(item as keyof RootStackParamList);
                setIsMenuOpen(false);
              }}
              className="flex-row items-center py-2"
            >
              <FontAwesome5
                name={item === "Notifications" ? "bell" : item === "Profile" ? "user" : "heart"}
                size={16}
                color={item === "Favourites" ? "#ef4444" : "#475569"}
              />
              <Text className="ml-2 text-slate-700 dark:text-slate-200">{item}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            onPress={() => {
              handleLogout();
              setIsMenuOpen(false);
            }}
            className="flex-row items-center py-2"
          >
            <FontAwesome5 name="sign-out-alt" size={16} color="#ef4444" />
            <Text className="ml-2 text-red-600 dark:text-red-400">Logout</Text>
          </TouchableOpacity>
        </MotiView>
      )}

      {/* Bottom Navigation */}
      <View className="flex-row justify-around py-2 border-t border-slate-200 dark:border-slate-700">
        {navItems.map((item) => (
          <TouchableOpacity
            key={item.path}
            onPress={() => navigation.navigate(item.path)}
            className={`items-center p-2 ${
              isActive(item.path) ? "bg-slate-100 dark:bg-slate-800 rounded-xl" : "opacity-80"
            }`}
          >
            <FontAwesome5
              name={item.icon}
              size={16}
              color={isActive(item.path) ? "#2563eb" : "#64748b"}
            />
            <Text className="text-xs mt-1 text-slate-700 dark:text-slate-300">{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default UserHeader;
