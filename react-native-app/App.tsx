"use client"
import { StatusBar } from "expo-status-bar"
import { View, ActivityIndicator, StyleSheet } from "react-native"
import { AuthProvider, useAuth } from "./src/lib/auth-context"
import { LoginScreen } from "./src/screens/LoginScreen"
import { HomeScreen } from "./src/screens/HomeScreen"

function AppContent() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    )
  }

  return user ? <HomeScreen /> : <LoginScreen />
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <AppContent />
    </AuthProvider>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f172a",
  },
})
