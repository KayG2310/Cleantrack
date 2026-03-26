import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../services/api";

export default function LoginScreen({ navigation , setIsLoggedIn}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSubmit = async () => {
    setIsLoggingIn(true);

    try {
    console.log({ email, password, role });
      const res = await API.post("/api/auth/login", {
        email,
        password,
        role,
      });

      const { data } = res;

      await AsyncStorage.setItem("token", data.token);
      await AsyncStorage.setItem("role", data.user.role);

      // Alert.alert("Success", "Login successful!");
      setIsLoggedIn(true);
    } catch (err) {
        console.log("FULL ERROR:", err);
        console.log("STATUS:", err.response?.status);
        console.log("DATA:", err.response?.data);
      Alert.alert(
        "Error",
        err.response?.data?.message || err.message
      );
      setIsLoggingIn(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
 
        {/* Top decoration */}
        <View style={styles.topDecoration}>
          <View style={styles.decorCircleLarge} />
          <View style={styles.decorCircleSmall} />
        </View>
 
        {/* Logo / Brand */}
        <View style={styles.brandSection}>
          <Text style={styles.appName}>CleanTrack</Text>
          <Text style={styles.tagline}>Keep your space, clean your place</Text>
        </View>
 
        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardSubtitle}>Sign in to continue</Text>
 
          {/* Email */}
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            placeholder="you@example.com"
            placeholderTextColor="#A8C5B5"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
 
          {/* Password */}
          <Text style={styles.inputLabel}>Password</Text>
          <TextInput
            placeholder="••••••••"
            placeholderTextColor="#A8C5B5"
            secureTextEntry
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />
 
          {/* Role toggle */}
          <Text style={styles.inputLabel}>I am a</Text>
          <View style={styles.roleContainer}>
            <Pressable
              style={[styles.roleBtn, role === "student" && styles.roleBtnActive]}
              onPress={() => setRole("student")}
            >
              <Text style={[styles.roleBtnText, role === "student" && styles.roleBtnTextActive]}>
                Student
              </Text>
            </Pressable>
 
            <Pressable
              style={[styles.roleBtn, role === "caretaker" && styles.roleBtnActive]}
              onPress={() => setRole("caretaker")}
            >
              <Text style={[styles.roleBtnText, role === "caretaker" && styles.roleBtnTextActive]}>
                Caretaker
              </Text>
            </Pressable>
          </View>
 
          {/* Login button */}
          <Pressable
            style={[styles.button, isLoggingIn && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isLoggingIn}
          >
            <Text style={styles.buttonText}>
              {isLoggingIn ? "Signing in..." : "Sign In"}
            </Text>
          </Pressable>
        </View>
 
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
 
// ─── STYLES ──────────────────────────────────────────────────────────────────
 
const GREEN_DARK  = "#2D6A4F";
const GREEN_MID   = "#52B788";
const GREEN_LIGHT = "#D8F3DC";
const GREEN_MINT  = "#F0FAF4";
const TEXT_DARK   = "#1B2E24";
const TEXT_GRAY   = "#6B8F7A";
const WHITE       = "#FFFFFF";
 
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: WHITE,
  },
  container: {
    flexGrow: 1,
    paddingBottom: 40,
  },
 
  // Decorative circles top-right
  topDecoration: {
    position: "absolute",
    top: -30,
    right: -30,
    zIndex: 0,
  },
  decorCircleLarge: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: GREEN_LIGHT,
    opacity: 0.5,
  },
  decorCircleSmall: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: GREEN_MINT,
    position: "absolute",
    top: 60,
    right: 60,
  },
 
  // Brand section
  brandSection: {
    alignItems: "center",
    paddingTop: 100,
    paddingBottom: 32,
    zIndex: 1,
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: GREEN_LIGHT,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    shadowColor: GREEN_DARK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  logoIcon: { fontSize: 34 },
  appName: {
    fontSize: 30,
    fontWeight: "800",
    color: TEXT_DARK,
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 14,
    color: TEXT_GRAY,
    fontWeight: "500",
  },
 
  // Login card
  card: {
    backgroundColor: WHITE,
    marginHorizontal: 20,
    borderRadius: 28,
    padding: 24,
    shadowColor: GREEN_DARK,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
    zIndex: 1,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: TEXT_DARK,
    marginBottom: 4,
    letterSpacing: -0.4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: TEXT_GRAY,
    marginBottom: 22,
    fontWeight: "500",
  },
 
  // Inputs
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: TEXT_GRAY,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: GREEN_LIGHT,
    backgroundColor: GREEN_MINT,
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    fontSize: 15,
    color: TEXT_DARK,
  },
 
  // Role toggle
  roleContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: GREEN_LIGHT,
    backgroundColor: GREEN_MINT,
    alignItems: "center",
  },
  roleBtnActive: {
    backgroundColor: GREEN_DARK,
    borderColor: GREEN_DARK,
  },
  roleBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT_GRAY,
  },
  roleBtnTextActive: {
    color: WHITE,
  },
 
  // Button
  button: {
    backgroundColor: GREEN_DARK,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: GREEN_DARK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: WHITE,
    textAlign: "center",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.3,
  },
});