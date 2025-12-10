"use client"

import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { AuthProvider, useAuth } from "./src/lib/auth-context"
import { LoginScreen } from "./src/screens/LoginScreen"
import { HomeScreen } from "./src/screens/HomeScreen"
import { ScannerScreen } from "./src/screens/ScannerScreen"
import { InventoryListScreen } from "./src/screens/InventoryListScreen"
import { MissingProductsScreen } from "./src/screens/MissingProductsScreen"
import { StatusBar } from "expo-status-bar"
import { ActivityIndicator, View } from "react-native"

export type RootStackParamList = {
  Login: undefined
  Home: undefined
  Scanner: { pendingEan?: string }
  InventoryList: undefined
  MissingProducts: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()

function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1a1a2e" }}>
        <ActivityIndicator size="large" color="#4f9cff" />
      </View>
    )
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#1a1a2e" },
        headerTintColor: "#fff",
        contentStyle: { backgroundColor: "#1a1a2e" },
      }}
    >
      {!isAuthenticated ? (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: "Inventúra" }} />
          <Stack.Screen name="Scanner" component={ScannerScreen} options={{ title: "Skenovanie" }} />
          <Stack.Screen name="InventoryList" component={InventoryListScreen} options={{ title: "Prehľad inventúry" }} />
          <Stack.Screen
            name="MissingProducts"
            component={MissingProductsScreen}
            options={{ title: "Nenaskenované produkty" }}
          />
        </>
      )}
    </Stack.Navigator>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  )
}
