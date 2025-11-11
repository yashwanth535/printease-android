import React, { useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";

import Landing from "../screens/Landing";
import Home from "../screens/Home";

export default function AuthGate({ navigation }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkToken = async () => {
      const token = await SecureStore.getItemAsync("accessToken");
      setIsLoggedIn(!!token); // true if token exists
      setIsLoading(false);
    };

    checkToken();
  }, []);

  if (isLoading) return null; // Or show splash loader

  return isLoggedIn ? <Home /> : <Landing />;
}
