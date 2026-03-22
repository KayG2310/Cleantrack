import { useEffect, useState, useRef} from "react";
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
    Alert,
    Pressable,
    TextInput,
    Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../services/api";


// ─── Flashcard Stack Component ──────────────────────────────────────────────
function TicketFlashcard({ tickets, navigation }) {
    const MAX = 4;
    const recent = tickets.slice(0, MAX);
    const [index, setIndex] = useState(0);
    const slideAnim = useRef(new Animated.Value(0)).current;
 
    const current = recent[index];
 
    const handleTap = () => {
        if (recent.length <= 1) return;
        Animated.timing(slideAnim, {
            toValue: -450,
            duration: 280,
            useNativeDriver: true,
        }).start(() => {
            const next = (index + 1) % recent.length;
            setIndex(next);
            slideAnim.setValue(450);
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 280,
                useNativeDriver: true,
            }).start();
        });
    };
 
    const statusStyle = (status) => {
        if (status === "resolved") return { badge: styles.statusResolved, text: styles.statusTextResolved };
        if (status === "in-progress") return { badge: styles.statusInProgress, text: styles.statusTextInProgress };
        return { badge: styles.statusOpen, text: styles.statusTextOpen };
    };
 
    return (
        <View>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Your Tickets</Text>
                <Pressable onPress={() => navigation.navigate("AllTickets", { tickets })}>
                    <Text style={styles.seeAll}>See all →</Text>
                </Pressable>
            </View>
 
            <View style={styles.stackWrapper}>
                {/* Decorative stacked cards behind */}
                <View style={[styles.stackCard, styles.stackCard3]} />
                <View style={[styles.stackCard, styles.stackCard2]} />
 
                {/* Animated front card */}
                <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
                    <Pressable style={styles.ticketCard} onPress={handleTap} activeOpacity={0.9}>
                        <View style={styles.ticketTop}>
                            <Text style={styles.ticketTitle} numberOfLines={1} ellipsizeMode="tail">
                                {current.title}
                            </Text>
                            <View style={[styles.statusBadge, statusStyle(current.status).badge]}>
                                <Text style={[styles.statusText, statusStyle(current.status).text]}>
                                    {current.status || "open"}
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.ticketDesc} numberOfLines={1} ellipsizeMode="tail">
                            {current.description}
                        </Text>
                        {recent.length > 1 && (
                            <Text style={styles.tapHint}>Tap to see next →</Text>
                        )}
                    </Pressable>
                </Animated.View>
            </View>
 
            {/* Dot indicators */}
            <View style={styles.dotsRow}>
                {recent.map((_, i) => (
                    <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
                ))}
            </View>
 
            {tickets.length > MAX && (
                <Pressable
                    style={styles.seeAllButton}
                    onPress={() => navigation.navigate("AllTickets", { tickets })}
                >
                    <Text style={styles.seeAllButtonText}>
                        +{tickets.length - MAX} more tickets
                    </Text>
                </Pressable>
            )}
        </View>
    );
}


// ─── Main Screen ───────────────────────────────────────────────────────────── (This is the initial main)
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
                <ActivityIndicator size="large" color="#2D6A4F" />
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
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
 
            {/* UNIFIED HERO CARD */}
            <View style={styles.heroCard}>
                <View style={styles.heroTop}>
                    <View>
                        <Text style={styles.greeting}>Welcome back 👋</Text>
                        <Text style={styles.title}>{userData.name}</Text>
                    </View>
                    <Pressable style={styles.logoutButton} onPress={handleLogout}>
                        <Text style={styles.logoutText}>Logout</Text>
                    </Pressable>
                </View>
 
                <View style={styles.heroDivider} />
 
                <View style={styles.cardRow}>
                    <View style={styles.infoBlock}>
                        <Text style={styles.label}>Caretaker</Text>
                        <Text style={styles.value}>{userData.caretaker}</Text>
                    </View>
                    <View style={styles.infoBlockDivider} />
                    <View style={styles.infoBlock}>
                        <Text style={styles.label}>Room</Text>
                        <Text style={styles.value}>{userData.roomNumber}</Text>
                    </View>
                </View>
 
                <View style={styles.lastCleanedRow}>
                    <View style={styles.lastCleanedDot} />
                    <Text style={styles.lastCleanedText}>
                        Last cleaned:{" "}
                        <Text style={styles.lastCleanedValue}>
                            {userData.lastCleaned
                                ? new Date(userData.lastCleaned).toLocaleString()
                                : "Not yet cleaned"}
                        </Text>
                    </Text>
                </View>
            </View>
 
            {/* TICKETS */}
            {tickets.length === 0 ? (
                <>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Your Tickets</Text>
                    </View>
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>🗒️</Text>
                        <Text style={styles.emptyText}>No tickets raised yet</Text>
                    </View>
                </>
            ) : (
                <TicketFlashcard tickets={tickets} navigation={navigation} />
            )}
 
            {/* RAISE TICKET BUTTON */}
            <Pressable style={styles.button} onPress={() => setShowForm(!showForm)}>
                <Text style={styles.buttonText}>
                    {showForm ? "✕  Cancel" : "+ Raise a Ticket"}
                </Text>
            </Pressable>
 
            {/* FORM */}
            {showForm && (
                <View style={styles.form}>
                    <Text style={styles.formTitle}>New Ticket</Text>
                    <TextInput
                        placeholder="Title"
                        placeholderTextColor="#A8C5B5"
                        style={styles.input}
                        value={title}
                        onChangeText={setTitle}
                    />
                    <TextInput
                        placeholder="Describe the issue..."
                        placeholderTextColor="#A8C5B5"
                        style={[styles.input, styles.textArea]}
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={4}
                    />
                    <Pressable style={styles.submitButton} onPress={handleCreateTicket}>
                        <Text style={styles.buttonText}>Submit Ticket</Text>
                    </Pressable>
                </View>
            )}
 
            <View style={{ height: 40 }} />
        </ScrollView>
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
    scrollView: { flex: 1, backgroundColor: WHITE },
    container: { padding: 20, paddingTop: 56 },
    center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: WHITE },
 
    heroCard: {
        backgroundColor: WHITE, borderRadius: 24, padding: 22, marginBottom: 28,
        shadowColor: GREEN_DARK, shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.09, shadowRadius: 16, elevation: 5,
    },
    heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
    heroDivider: { height: 1, backgroundColor: GREEN_LIGHT, marginBottom: 18 },
    greeting: { fontSize: 13, color: TEXT_GRAY, fontWeight: "500", marginBottom: 3 },
    title: { fontSize: 22, fontWeight: "700", color: TEXT_DARK, letterSpacing: -0.5 },
    logoutButton: {
        backgroundColor: "#FFF0F0", paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: 20, borderWidth: 1, borderColor: "#FFCDD2",
    },
    logoutText: { color: "#C62828", fontWeight: "600", fontSize: 13 },
    cardRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
    infoBlock: { flex: 1, alignItems: "center", justifyContent: "center" },
    infoBlockDivider: { width: 1, height: 40, backgroundColor: GREEN_LIGHT },
    label: { fontSize: 12, color: TEXT_GRAY, fontWeight: "500", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
    value: { fontSize: 17, fontWeight: "700", color: TEXT_DARK },
    lastCleanedRow: { flexDirection: "row", alignItems: "center", backgroundColor: GREEN_MINT, borderRadius: 12, padding: 12 },
    lastCleanedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN_MID, marginRight: 8 },
    lastCleanedText: { fontSize: 13, color: TEXT_GRAY, fontWeight: "500" },
    lastCleanedValue: { color: GREEN_DARK, fontWeight: "700" },
 
    sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
    sectionTitle: { fontSize: 18, fontWeight: "700", color: TEXT_DARK, letterSpacing: -0.3 },
    seeAll: { fontSize: 13, color: GREEN_MID, fontWeight: "600" },
 
    // Flashcard stack
    stackWrapper: { marginBottom: 20 },
    stackCard: {
        position: "absolute", left: 0, right: 0,
        backgroundColor: WHITE, borderRadius: 16,
        borderLeftWidth: 4, borderLeftColor: GREEN_MID,
        shadowColor: GREEN_DARK, shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, height: 90,
    },
    stackCard2: { bottom: -7, marginHorizontal: 10, opacity: 0.45 },
    stackCard3: { bottom: -14, marginHorizontal: 20, opacity: 0.2 },
    ticketCard: {
        backgroundColor: WHITE, borderRadius: 16, padding: 18,
        borderLeftWidth: 4, borderLeftColor: GREEN_MID,
        shadowColor: GREEN_DARK, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
        height: 90, justifyContent: "center",
    },
    ticketTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
    ticketTitle: { fontWeight: "700", fontSize: 15, color: TEXT_DARK, flex: 1, marginRight: 8 },
    ticketDesc: { fontSize: 13, color: TEXT_GRAY },
    tapHint: { fontSize: 11, color: GREEN_MID, fontWeight: "600", marginTop: 6, textAlign: "right" },
 
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    statusText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
    statusOpen: { backgroundColor: "#FFF9E6" },
    statusTextOpen: { color: "#B7791F" },
    statusInProgress: { backgroundColor: "#EBF4FF" },
    statusTextInProgress: { color: "#2B6CB0" },
    statusResolved: { backgroundColor: GREEN_LIGHT },
    statusTextResolved: { color: GREEN_DARK },
 
    dotsRow: { flexDirection: "row", justifyContent: "center", marginBottom: 12, gap: 6 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: GREEN_LIGHT },
    dotActive: { width: 18, backgroundColor: GREEN_MID },
 
    seeAllButton: { alignItems: "center", paddingVertical: 10, marginBottom: 4 },
    seeAllButtonText: { color: TEXT_GRAY, fontSize: 13, fontWeight: "500" },
 
    emptyState: { alignItems: "center", paddingVertical: 32, backgroundColor: WHITE, borderRadius: 20, marginBottom: 12 },
    emptyIcon: { fontSize: 36, marginBottom: 8 },
    emptyText: { color: TEXT_GRAY, fontSize: 14, fontWeight: "500" },
 
    button: {
        backgroundColor: GREEN_DARK, paddingVertical: 15, borderRadius: 16, marginTop: 16,
        shadowColor: GREEN_DARK, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
    },
    buttonText: { color: WHITE, textAlign: "center", fontWeight: "700", fontSize: 15, letterSpacing: 0.3 },
 
    form: {
        marginTop: 16, backgroundColor: WHITE, padding: 20, borderRadius: 20,
        shadowColor: GREEN_DARK, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
    },
    formTitle: { fontSize: 16, fontWeight: "700", color: TEXT_DARK, marginBottom: 14 },
    input: {
        borderWidth: 1.5, borderColor: GREEN_LIGHT, backgroundColor: GREEN_MINT,
        padding: 13, borderRadius: 12, marginBottom: 12, fontSize: 14, color: TEXT_DARK,
    },
    textArea: { height: 100, textAlignVertical: "top" },
    submitButton: { backgroundColor: GREEN_MID, paddingVertical: 14, borderRadius: 14, marginTop: 4 },
});