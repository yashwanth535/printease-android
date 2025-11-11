import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import * as Linking from "expo-linking";
import { useEffect, useRef } from "react";
import "./global.css";

import Landing from "./screens/Landing";
import Home from "./screens/Home";
import Cart from "./screens/Cart";
import Checkout from "./screens/Checkout";
import CreateOrder from "./screens/CreateOrder";
import Vendors from "./screens/Vendors";
import Profile from "./screens/Profile";
import Dashboard from "./screens/Dashboard";
import Favourites from "./screens/Favourites";
import Notifications from "./screens/Notifications";
import PaymentsHistory from "./screens/PaymentsHistory";
import PaymentSuccess from "./screens/PaymentSuccess";
import VendorProfile from "./screens/VendorProfile";
import { RootStackParamList } from "./roots/types";
import AuthGate from "./utils/AuthGate"

const Stack = createNativeStackNavigator();

// Configure deep linking
const linking = {
  prefixes: ['printease://', 'https://printease.app'],
  config: {
    screens: {
      PaymentSuccess: 'payment-success',
      Home: 'home',
      Cart: 'cart',
      Checkout: 'checkout',
    },
  },
};

export default function App() {
  const navigationRef = useRef<any>(null);

  useEffect(() => {
    // Handle deep links when app is already running
    const subscription = Linking.addEventListener('url', (event: { url: string }) => {
      const { url } = event;
      console.log('🔗 Deep link received:', url);
      
      if (url && url.includes('payment-success')) {
        // Parse the URL
        const parsed = Linking.parse(url);
        const params = parsed.queryParams || {};
        
        if (navigationRef.current && params.order_id) {
          navigationRef.current.navigate('PaymentSuccess', {
            order_id: params.order_id as string,
            total_amount: (params.total_amount as string) || '',
          });
        }
      }
    });

    // Handle deep link when app is opened from a closed state
    Linking.getInitialURL().then((url: string | null) => {
      if (url) {
        console.log('🔗 App opened with deep link:', url);
        if (url.includes('payment-success')) {
          const parsed = Linking.parse(url);
          const params = parsed.queryParams || {};
          
          if (navigationRef.current && params.order_id) {
            // Small delay to ensure navigation is ready
            setTimeout(() => {
              navigationRef.current?.navigate('PaymentSuccess', {
                order_id: params.order_id as string,
                total_amount: (params.total_amount as string) || '',
              });
            }, 1000);
          }
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <>
      <NavigationContainer linking={linking} ref={navigationRef}>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="AuthGate" component={AuthGate} />
          <Stack.Screen name="Landing" component={Landing} />
          <Stack.Screen name="Home" component={Home} />
          <Stack.Screen name="Cart" component={Cart} />
          <Stack.Screen name="Checkout" component={Checkout} />
          <Stack.Screen name="CreateOrder" component={CreateOrder} />
          <Stack.Screen name="Vendors" component={Vendors} />
          <Stack.Screen name="Profile" component={Profile} />
          <Stack.Screen name="Dashboard" component={Dashboard} />
          <Stack.Screen name="Favourites" component={Favourites} />
          <Stack.Screen name="Notifications" component={Notifications} />
          <Stack.Screen name="Payments" component={PaymentsHistory} />
          <Stack.Screen name="PaymentSuccess" component={PaymentSuccess} />
          <Stack.Screen name="VendorProfile" component={VendorProfile} />
        </Stack.Navigator>
      </NavigationContainer>

      <StatusBar style="auto" />
    </>
  );
}
