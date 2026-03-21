import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
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

      Alert.alert("Success", "Login successful!");
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
    <View style={styles.container}>
      <Text style={styles.title}>CleanTrack</Text>

      <TextInput
        placeholder="Email"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        style={styles.input}
        value={password}
        onChangeText={setPassword}
      />

      {/* Role Toggle (simplified instead of dropdown) */}
      <View style={styles.roleContainer}>
        <Pressable onPress={() => setRole("student")}>
          <Text style={role === "student" ? styles.activeRole : styles.role}>
            Student
          </Text>
        </Pressable>

        <Pressable onPress={() => setRole("caretaker")}>
          <Text style={role === "caretaker" ? styles.activeRole : styles.role}>
            Caretaker
          </Text>
        </Pressable>
      </View>

      <Pressable
        style={styles.button}
        onPress={handleSubmit}
        disabled={isLoggingIn}
      >
        <Text style={styles.buttonText}>
          {isLoggingIn ? "Logging in..." : "Login"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 28,
    textAlign: "center",
    marginBottom: 20,
    fontWeight: "bold",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  roleContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 10,
  },
  role: {
    fontSize: 16,
    color: "gray",
  },
  activeRole: {
    fontSize: 16,
    fontWeight: "bold",
    color: "green",
  },
  button: {
    backgroundColor: "green",
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
  },
});