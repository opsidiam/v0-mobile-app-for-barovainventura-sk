"use client"

import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { AuthProvider, useAuth } from "./src/lib/auth-context"
import { LoginScreen } from "./src/screens/LoginScreen"
import { ScannerScreen } from "./src/screens/ScannerScreen"
import { InventoryListScreen } from "./src/screens/InventoryListScreen"
import { MissingProductsScreen } from "./src/screens/MissingProductsScreen"
import { StatusBar } from "expo-status-bar"
import { ActivityIndicator, View } from "react-native"

export type ScannedProduct = {
  ean: string
  name: string
  quantity: string
  volume?: string
  alcoholContent?: string
  scannedAt: Date
}

export type RootStackParamList = {
  Login: undefined
  Scanner: { pendingEan?: string }
  InventoryList: { products: ScannedProduct[] }
  MissingProducts: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()

function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    )
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#000" },
        headerTintColor: "#fff",
        contentStyle: { backgroundColor: "#000" },
        headerShadowVisible: false,
      }}
    >
      {!isAuthenticated ? (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen
            name="Scanner"
            component={ScannerScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="InventoryList"
            component={InventoryListScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="MissingProducts"
            component={MissingProductsScreen}
            options={{
              headerShown: false,
            }}
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
