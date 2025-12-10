"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useAuth } from "../lib/auth-context"

const LOGO_URL = "/images/v2-20alt-20-20w.png"

export function LoginScreen() {
  const [userId, setUserId] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  async function handleLogin() {
    if (!userId || !password) {
      setError("Vyplňte prihlasovacie údaje")
      return
    }

    setError(null)
    setLoading(true)

    try {
      await login(userId, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prihlásenie zlyhalo")
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image source={{ uri: LOGO_URL }} style={styles.logo} resizeMode="contain" />
        </View>

        {/* Error message */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={16} color="#f87171" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>API ID:</Text>
            <TextInput
              style={styles.input}
              placeholder="123456"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={userId}
              onChangeText={(text) => setUserId(text.replace(/[^0-9]/g, ""))}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Heslo:</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="zadajte heslo"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.buttonText}>Prihlasujem...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Prihlásiť sa</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.infoText}>
            Prihlasovacie údaje sú jednorázové!{"\n"}V prípade potreby kontaktujte svojho administrátora
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 48,
  },
  logo: {
    width: 220,
    height: 60,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239,68,68,0.2)",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: "#f87171",
    fontSize: 14,
    flex: 1,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
  },
  input: {
    height: 48,
    backgroundColor: "#2e2e38",
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#fff",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2e2e38",
    borderRadius: 8,
  },
  passwordInput: {
    flex: 1,
    height: 48,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#fff",
  },
  eyeButton: {
    padding: 12,
  },
  button: {
    height: 48,
    backgroundColor: "#3a3a44",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  infoText: {
    textAlign: "center",
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    marginTop: 16,
    lineHeight: 18,
  },
})
