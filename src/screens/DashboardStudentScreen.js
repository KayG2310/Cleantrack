import { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
    Alert,
    Pressable,
    TextInput,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../services/api";

export default function DashboardStudentScreen({ navigation , setIsLoggedIn}) {
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);
    const [tickets, setTickets] = useState([]);

    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = await AsyncStorage.getItem("token");

                const res = await API.get("/api/student/dashboard-student", {
                    headers: { Authorization: `Bearer ${token}` },
                });

                const payload = res.data || {};
                const user = payload.user || {};
                const room = payload.room || {};

                setUserData({
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    roomNumber: user.roomNumber || room.roomNumber,
                    caretaker: room.caretaker || "Unassigned",
                    lastCleaned: room.lastCleaned || null,
                });

                // ✅ fetch tickets
                const ticketRes = await API.get(
                    `/api/tickets/student/${user.email}`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );

                setTickets(ticketRes.data || []);
            } catch (err) {
                Alert.alert("Error", "Failed to load dashboard");
                navigation.navigate("Login");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleCreateTicket = async () => {
        try {
            const token = await AsyncStorage.getItem("token");
            const res = await API.post(
                "/api/tickets/create",
                {
                    studentId: userData.id,
                    studentEmail: userData.email,
                    roomNumber: userData.roomNumber,
                    title,
                    description,
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            const created = res.data.ticket || res.data;

            setTickets((prev) => [created, ...prev]);
            setShowForm(false);
            setTitle("");
            setDescription("");

            Alert.alert("Success", "Ticket created!");
        } catch (err) {
            Alert.alert("Error", "Failed to create ticket");
        }
    };
    const handleLogout = async () => {
        await AsyncStorage.removeItem("token");
        setIsLoggedIn(false);
    };
    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (!userData) {
        return (
            <View style={styles.center}>
                <Text>Failed to load dashboard</Text>
            </View>
        );
    }
    // UI
    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Student Dashboard</Text>
            <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
            {/* USER INFO */}
            <View style={styles.card}>
                <Text style={styles.label}>Name</Text>
                <Text style={styles.value}>{userData.name}</Text>

                <Text style={styles.label}>Room</Text>
                <Text style={styles.value}>{userData.roomNumber}</Text>

                <Text style={styles.label}>Caretaker</Text>
                <Text style={styles.value}>{userData.caretaker}</Text>

                <Text style={styles.label}>Last Cleaned</Text>
                <Text style={styles.value}>
                    {userData.lastCleaned
                        ? new Date(userData.lastCleaned).toLocaleString()
                        : "Not yet cleaned"}
                </Text>
            </View>

            {/* TICKETS */}
            <Text style={styles.sectionTitle}>Your Tickets</Text>

            {tickets.length === 0 ? (
                <Text>No tickets yet</Text>
            ) : (
                tickets.map((t, index) => (
                    <View key={index} style={styles.ticketCard}>
                        <Text style={styles.ticketTitle}>{t.title}</Text>
                        <Text>{t.description}</Text>
                        <Text>Status: {t.status}</Text>
                    </View>
                ))
            )}

            {/* BUTTON */}
            <Pressable style={styles.button} onPress={() => setShowForm(true)}>
                <Text style={styles.buttonText}>+ Raise Ticket</Text>
            </Pressable>

            {/* FORM */}
            {showForm && (
                <View style={styles.form}>
                    <TextInput
                        placeholder="Title"
                        style={styles.input}
                        value={title}
                        onChangeText={setTitle}
                    />

                    <TextInput
                        placeholder="Description"
                        style={styles.input}
                        value={description}
                        onChangeText={setDescription}
                    />

                    <Pressable style={styles.button} onPress={handleCreateTicket}>
                        <Text style={styles.buttonText}>Submit</Text>
                    </Pressable>
                </View>
            )}
        </ScrollView>
    );
}

// STYLES
const styles = StyleSheet.create({
    container: {
        padding: 20,
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 20,
    },
    card: {
        backgroundColor: "#fff",
        padding: 20,
        borderRadius: 10,
        elevation: 3,
    },
    label: {
        fontSize: 14,
        color: "gray",
        marginTop: 10,
    },
    value: {
        fontSize: 16,
        fontWeight: "bold",
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "bold",
        marginTop: 20,
    },
    ticketCard: {
        backgroundColor: "#f2f2f2",
        padding: 15,
        borderRadius: 10,
        marginTop: 10,
    },
    ticketTitle: {
        fontWeight: "bold",
    },
    button: {
        backgroundColor: "green",
        padding: 12,
        borderRadius: 8,
        marginTop: 15,
    },
    buttonText: {
        color: "white",
        textAlign: "center",
        fontWeight: "bold",
    },
    form: {
        marginTop: 15,
        backgroundColor: "#fff",
        padding: 15,
        borderRadius: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        padding: 10,
        borderRadius: 8,
        marginBottom: 10,
    },
    logoutButton: {
        backgroundColor: "red",
        padding: 10,
        borderRadius: 8,
        marginBottom: 15,
    },
    logoutText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
    },
});