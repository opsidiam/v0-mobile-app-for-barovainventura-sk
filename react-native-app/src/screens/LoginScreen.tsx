"use client"

import { useState } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Linking,
} from "react-native"
import { useAuth } from "../lib/auth-context"
import { Logo } from "../components/Logo"

export function LoginScreen() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const { login } = useAuth()

  async function handleLogin() {
    if (!username || !password) {
      setError("Zadajte prihlasovací kód a heslo")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      if (Platform.OS === 'web') {
        // Web-specific login wrapper if needed or just straight call
        await login(username, password)
      } else {
        await login(username, password)
      }
    } catch (err) {
      setError("Boli zadané zlé prihlasovacie údaje")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Logo
            width={180}
            height={60}
            url="https://barovainventura.sk/img/V1%20alt%20-%20W.svg"
          />
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Warning block removed */}

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>API ID:</Text>
            <TextInput
              style={styles.input}
              placeholder="123 456"
              placeholderTextColor="#64748b"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Heslo:</Text>
            <TextInput
              style={styles.input}
              placeholder="zadajte heslo"
              placeholderTextColor="#64748b"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.loginButtonText}>Prihlásiť sa</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.helpButton}
            onPress={() => Linking.openURL("https://barovainventura.sk/navody")}
          >
            <Text style={styles.helpButtonText}>Návody</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2024 Barová inventúra</Text>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    maxWidth: 400,
    width: "100%",
    alignSelf: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 48,
  },
  logoTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 4,
  },
  logoSubtitle: {
    fontSize: 18,
    color: "#ffffff",
    letterSpacing: 4,
  },
  warningContainer: {
    backgroundColor: "rgba(239, 68, 68, 0.1)", // Red with low opacity
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  warningText: {
    color: "#ef4444", // Red text
    fontSize: 14,
    textAlign: "center",
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "bold", // "Bold" in mockup
    color: "#ffffff",
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#1e293b", // Dark slate
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: "#ffffff",
    borderWidth: 1,
    borderColor: "#334155",
  },
  loginButton: {
    backgroundColor: "#22c55e", // Green button
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  loginButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  errorContainer: {
    backgroundColor: "#fecaca",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: "#dc2626",
    textAlign: "center",
  },
  footer: {
    padding: 24,
    paddingBottom: 48, // Increased padding to move text up
    alignItems: "center",
  },
  footerText: {
    color: "#64748b",
    fontSize: 12,
  },
  helpButton: {
    backgroundColor: "#334155", // Slate 700
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  helpButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
})
