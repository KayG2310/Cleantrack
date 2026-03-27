import { useEffect, useState, useRef } from "react";
import {
    View, Text, StyleSheet, ActivityIndicator, ScrollView, Alert, Pressable, TextInput, Animated, PanResponder,
    Modal, KeyboardAvoidingView, Platform, Svg, Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../services/api";
import { RefreshControl } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Image } from "react-native";
import Ionicons from '@expo/vector-icons/Ionicons';
import { Picker } from "@react-native-picker/picker";
const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Creative date formatter ─────────────────────────────────────────────────
function formatLastCleaned(dateStr) {
    if (!dateStr) return { line1: "Not yet", line2: "cleaned" };
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor(diffMs / (1000 * 60));

    const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const dayName = date.toLocaleDateString([], { weekday: "long" });
    const monthDay = date.toLocaleDateString([], { month: "short", day: "numeric" });

    if (diffMins < 60) return { line1: `${diffMins}m ago`, line2: `at ${timeStr}` };
    if (diffHours < 24) return { line1: `${diffHours}h ago`, line2: `at ${timeStr}` };
    if (diffDays === 1) return { line1: "Yesterday", line2: `at ${timeStr}` };
    if (diffDays < 7) return { line1: `${diffDays} days ago`, line2: `${dayName}` };
    return { line1: monthDay, line2: `at ${timeStr}` };
}

/** Newest first so dashboard flashcards and "See all" match recent activity. */
function sortTicketsNewestFirst(tickets) {
    const ts = (t) => {
        const raw = t.createdAt ?? t.updatedAt ?? t.created_at;
        if (raw) return new Date(raw).getTime();
        const id = t._id;
        if (typeof id === "string" && /^[a-f\d]{24}$/i.test(id)) {
            return parseInt(id.slice(0, 8), 16) * 1000;
        }
        return 0;
    };
    return [...tickets].sort((a, b) => ts(b) - ts(a));
}

// ─── Light SVG Background ────────────────────────────────────────────────────
function BgGraphics() {
    return (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
            {/* Top-right large circle */}
            <View style={bg.circleTopRight} />
            {/* Mid-left medium circle */}
            <View style={bg.circleMidLeft} />
            {/* Bottom-right small circle */}
            <View style={bg.circleBottomRight} />
            {/* Leaf shape top-left */}
            <View style={bg.leafTopLeft} />
        </View>
    );
}

// ─── Ticket Detail Modal ─────────────────────────────────────────────────────
function TicketModal({ ticket, visible, onClose }) {
    if (!ticket) return null;

    const statusStyle = (status) => {
        if (status === "resolved") return { badge: styles.statusResolved, text: styles.statusTextResolved };
        if (status === "in-progress") return { badge: styles.statusInProgress, text: styles.statusTextInProgress };
        return { badge: styles.statusOpen, text: styles.statusTextOpen };
    };

    const statusDotColor = (status) => {
        if (status === "resolved") return "#52B788";
        if (status === "in-progress") return "#4A9ECD";
        return "#E9A84C";
    };

    const photoUrl = ticket?.photoUrl;
    const isValidPhotoUrl =
        typeof photoUrl === "string" &&
        photoUrl.trim().length > 0 &&
        !["see more", "n/a", "na", "none", "null", "undefined"].includes(photoUrl.trim().toLowerCase()) &&
        photoUrl.trim().startsWith("http");

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.modalOverlay} onPress={onClose}>
                <Pressable style={styles.modalCard} onPress={() => { }}>
                    <View style={styles.modalHandle} />
                    <View style={styles.modalHeader}>
                        <View style={[styles.modalDot, { backgroundColor: statusDotColor(ticket.status) }]} />
                        <Text style={styles.modalTitle}>{ticket.title}</Text>
                    </View>
                    <View style={[styles.statusBadge, statusStyle(ticket.status).badge, { alignSelf: "flex-start", marginBottom: 16 }]}>
                        <Text style={[styles.statusText, statusStyle(ticket.status).text]}>
                            {ticket.status || "open"}
                        </Text>
                    </View>
                    <Text style={styles.modalDesc}>{ticket.description}</Text>

                    {isValidPhotoUrl ? (
                        <Image source={{ uri: photoUrl }} style={styles.ticketPhoto} resizeMode="cover" />
                    ) : (
                        <Text style={styles.noPhotoText}>No photo available</Text>
                    )}

                    <Pressable style={styles.modalClose} onPress={onClose}>
                        <Text style={styles.modalCloseText}>Close</Text>
                    </Pressable>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

// ─── Flashcard Stack Component ───────────────────────────────────────────────
function TicketFlashcard({ tickets, navigation }) {
    const MAX = 4;
    const recent = tickets.slice(0, MAX);
    const [index, setIndex] = useState(0);
    const [modalTicket, setModalTicket] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const slideAnim = useRef(new Animated.Value(0)).current;
    const SWIPE_THRESHOLD = 40;

    const goToIndex = (next, direction) => {
        // direction: -1 = left swipe (next), +1 = right swipe (prev)
        const outTo = direction === -1 ? -SCREEN_WIDTH : SCREEN_WIDTH;
        const inFrom = direction === -1 ? SCREEN_WIDTH : -SCREEN_WIDTH;

        Animated.timing(slideAnim, {
            toValue: outTo,
            duration: 250,
            useNativeDriver: true,
        }).start(() => {
            setIndex(next);
            slideAnim.setValue(inFrom);
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }).start();
        });
    };

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, g) =>
                Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
            onPanResponderRelease: (_, g) => {
                if (recent.length <= 1) return;
                if (g.dx < -SWIPE_THRESHOLD) {
                    // swiped left → next
                    const next = (index + 1) % recent.length;
                    goToIndex(next, -1);
                } else if (g.dx > SWIPE_THRESHOLD) {
                    // swiped right → prev
                    const prev = (index - 1 + recent.length) % recent.length;
                    goToIndex(prev, 1);
                }
            },
        })
    ).current;

    // Rebuild panResponder when index changes
    const indexRef = useRef(index);
    useEffect(() => { indexRef.current = index; }, [index]);

    const panResponderLive = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, g) =>
                Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
            onPanResponderRelease: (_, g) => {
                if (recent.length <= 1) return;
                const cur = indexRef.current;
                if (g.dx < -SWIPE_THRESHOLD) {
                    const next = (cur + 1) % recent.length;
                    goToIndex(next, -1);
                } else if (g.dx > SWIPE_THRESHOLD) {
                    const prev = (cur - 1 + recent.length) % recent.length;
                    goToIndex(prev, 1);
                }
            },
        })
    ).current;

    const current = recent[index];

    const statusStyle = (status) => {
        if (status === "resolved") return { badge: styles.statusResolved, text: styles.statusTextResolved };
        if (status === "in-progress") return { badge: styles.statusInProgress, text: styles.statusTextInProgress };
        return { badge: styles.statusOpen, text: styles.statusTextOpen };
    };

    const statusDotColor = (status) => {
        if (status === "resolved") return "#52B788";
        if (status === "in-progress") return "#4A9ECD";
        return "#E9A84C";
    };

    const handlePress = () => {
        setModalTicket(current);
        setModalVisible(true);
    };

    return (
        <View style={styles.ticketsSection}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Your Tickets</Text>
                <Pressable
                    style={styles.seeAllPill}
                    onPress={() => navigation.navigate("AllTicketsScreen", { tickets })}
                >
                    <Text style={styles.seeAll}>See all →</Text>
                </Pressable>
            </View>

            <View style={styles.stackWrapper} {...panResponderLive.panHandlers}>
                <View style={[styles.stackCard, styles.stackCard3]} />
                <View style={[styles.stackCard, styles.stackCard2]} />

                <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
                    <Pressable style={styles.ticketCard} onPress={handlePress} activeOpacity={0.92}>
                        <View
                            style={[
                                styles.ticketAccentDot,
                                { backgroundColor: statusDotColor(current.status) },
                            ]}
                        />
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
                        <Text style={styles.ticketDesc} numberOfLines={2} ellipsizeMode="tail">
                            {current.description}
                        </Text>
                        <View style={styles.ticketFooter}>
                            <Text style={styles.tapHint}>Tap to read · Swipe to browse</Text>
                        </View>
                    </Pressable>
                </Animated.View>
            </View>

            <View style={styles.dotsRow}>
                {recent.map((_, i) => (
                    <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
                ))}
            </View>

            {/* {tickets.length > MAX && (
                <Pressable
                    style={styles.seeAllButton}
                    onPress={() => navigation.navigate("AllTicketsScreen", { tickets })}
                >
                    <Text style={styles.seeAllButtonText}>+{tickets.length - MAX} more tickets</Text>
                </Pressable>
            )} */}

            <TicketModal
                ticket={modalTicket}
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
            />
        </View>
    );
}


// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function DashboardStudentScreen({ navigation, setIsLoggedIn }) {
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);
    const [tickets, setTickets] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [refreshing, setRefreshing] = useState(false);
    const [image, setImage] = useState(null);
    const [floor, setFloor] = useState("1");
    const [location, setLocation] = useState("Own Room");
    const [markingClean, setMarkingClean] = useState(false);
    const scrollRef = useRef(null);
    const [cleanReminderShown, setCleanReminderShown] = useState(false);
    const [cleanReminderVisible, setCleanReminderVisible] = useState(false);
    const formRef = useRef(null);

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
            const ticketRes = await API.get(
                `/api/tickets/student/${user.email}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setTickets(sortTicketsNewestFirst(ticketRes.data || []));
        } catch (err) {
            Alert.alert("Error", "Failed to load dashboard");
            await AsyncStorage.removeItem("token");
            setIsLoggedIn(false);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        const init = async () => {
            await fetchData();
            setLoading(false);
        };
        init();
    }, []);
    useEffect(() => {
        if (userData?.roomNumber) {
            const derivedFloor = Math.floor(Number(userData.roomNumber) / 100).toString();
            setFloor(derivedFloor);
        }
    }, [userData]);
    useEffect(() => {
        if (!userData?.lastCleaned) return;
        if (cleanReminderShown) return;

        const prevDate = new Date(userData.lastCleaned);
        const diffMs = Date.now() - prevDate.getTime();
        const diff48hMs = 2 * 24 * 60 * 60 * 1000;

        if (!Number.isNaN(diffMs) && diffMs > diff48hMs) {
            setCleanReminderShown(true);
            setCleanReminderVisible(true);
        }
    }, [userData?.lastCleaned, cleanReminderShown]);
    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await fetchData();
        } catch (err) {
            console.log(err);
        } finally {
            setRefreshing(false);   // 🔥 ALWAYS runs
        }
    };
    const handleRaiseTicket = () => {
        const next = !showForm;
        setShowForm(next);
        if (next) {
            // Scroll to bottom after state settles
            setTimeout(() => {
                scrollRef.current?.scrollToEnd({ animated: true });
            }, 120);
        }
    };

    const handleCreateTicket = async () => {
        try {
            const token = await AsyncStorage.getItem("token");
            const formData = new FormData();

            formData.append("title", title);
            formData.append("description", description);
            formData.append("roomNumber", userData.roomNumber);
            formData.append("floorSelected", floor);
            formData.append("locationSelected", location);
            if (image) {
                formData.append("photo", {
                    uri: image,
                    name: "photo.jpg",
                    type: "image/jpeg",
                });
            }
            const res = await API.post(
                "/api/tickets/create",
                formData,
                { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data", } }
            );
            const created = res.data.ticket || res.data;
            setTickets((prev) => [created, ...prev]);
            setShowForm(false);
            setTitle("");
            setDescription("");
            setImage(null);
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
                <ActivityIndicator size="large" color={GREEN_DARK} />
                <Text style={styles.loadingText}>Loading your space…</Text>
            </View>
        );
    }

    if (!userData) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>Failed to load dashboard</Text>
            </View>
        );
    }
    const pickImage = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
            Alert.alert("Permission required");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.5,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };



    const handleMarkAsClean = async () => {
        setMarkingClean(true);

        // UI update (at minimum). If your backend supports persisting this action,
        // you can add the POST call inside this try block.

        try {
            const token = await AsyncStorage.getItem("token");
            const res = await API.post(
                "/api/student/mark-clean",
                {},
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            setUserData((prev) => ({
                ...prev,
                lastCleaned: res.data.room.lastCleaned,
            }))
        } catch (e) {
            Alert.alert("Error", "Failed to mark as clean.");
        } finally {
            setMarkingClean(false);
        }
    };

    const cleaned = formatLastCleaned(userData.lastCleaned);
    
    
    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 20}
            enabled={true}
        >
            <ScrollView
                ref={scrollRef}
                style={styles.scrollView}
                contentContainerStyle={styles.container}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="always"
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                    />
                }
            >
                {/* Background graphics */}
                <BgGraphics style={{ position: "absolute", zIndex: -1 }} />

                {/* ── TOP BAR ── */}
                <View style={styles.topBar}>
                    <View>
                        <Text style={styles.greeting}>Good day 🌿</Text>
                        <Text style={styles.userName}>{userData.name}</Text>
                    </View>

                    <View style={styles.rightSection}>

                        <Pressable
                            onPress={() => navigation.navigate("Announcements")}
                            style={styles.iconButton}
                        >
                            <Ionicons name="notifications" color={GREEN_DARK} size={24} />
                        </Pressable>
                        <Pressable style={styles.logoutButton} onPress={handleLogout}>
                            <Text style={styles.logoutText}>Log out</Text>
                        </Pressable>
                    </View>
                </View>

                {/* ── HERO CARD ── */}
                <View style={styles.heroCard}>
                    <View style={styles.blobTopRight} />
                    <View style={styles.blobBottomLeft} />

                    <View style={styles.heroInner}>
                        <View style={styles.chipsRow}>
                            <View style={styles.chip}>
                                <Text style={styles.chipLabel}>ROOM</Text>
                                <Text style={styles.chipValue}>{userData.roomNumber}</Text>
                            </View>
                            <View style={[styles.chip, styles.chipAlt]}>
                                <Text style={styles.chipLabel}>CARETAKER</Text>
                                <Text style={styles.chipValue}>{userData.caretaker}</Text>
                            </View>
                        </View>

                        <View style={styles.heroDivider} />

                        {/* Last Cleaned — creative format */}
                        <View style={styles.lastCleanedRow}>
                            <View style={styles.lastCleanedIconWrap}>
                                <Text style={styles.lastCleanedIconEmoji}>🧹</Text>
                            </View>
                            <View style={styles.lastCleanedTextCol}>
                                <Text style={styles.lastCleanedLabel}>Last cleaned</Text>
                                <Text style={styles.lastCleanedLine1}>{cleaned.line1}</Text>
                                <Text style={styles.lastCleanedLine2}>{cleaned.line2}</Text>
                            </View>
                            <Pressable
                                style={({ pressed }) => [
                                    styles.lastCleanedBadge,
                                    pressed && !markingClean ? { opacity: 0.85 } : null,
                                    markingClean ? { opacity: 0.7 } : null,
                                ]}
                                onPress={handleMarkAsClean}
                                disabled={markingClean}
                            >
                                <Text style={styles.lastCleanedBadgeText}>
                                    {markingClean ? "Updating..." : "Mark as clean"}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>

                {/* ── TICKETS ── */}
                {tickets.length === 0 ? (
                    <View style={styles.ticketsSection}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Your Tickets</Text>
                        </View>
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconWrap}>
                                <Text style={styles.emptyIcon}>🗒️</Text>
                            </View>
                            <Text style={styles.emptyTitle}>No tickets yet</Text>
                            <Text style={styles.emptySubtext}>
                                Raise a ticket to report any issues with your room
                            </Text>
                        </View>
                    </View>
                ) : (
                    <TicketFlashcard tickets={tickets} navigation={navigation} />
                )}

                {/* ── RAISE TICKET BUTTON ── */}
                <Pressable
                    style={({ pressed }) => [styles.raiseButton, pressed && styles.raiseButtonPressed]}
                    onPress={handleRaiseTicket}
                >
                    <Text style={styles.raiseButtonIcon}>{showForm ? "✕" : "+"}</Text>
                    <Text style={styles.raiseButtonText}>
                        {showForm ? "Cancel" : "Raise a Ticket"}
                    </Text>
                </Pressable>

                {/* ── FORM ── */}
                {showForm && (
                    <View
                        ref={formRef}
                        style={styles.form}
                        onLayout={() => {
                            setTimeout(() => {
                                scrollRef.current?.scrollToEnd({ animated: true });
                            }, 80);
                        }}
                    >
                        <Text style={styles.formTitle}>New Ticket</Text>
                        <Text style={styles.formSubtitle}>
                            Describe your issue clearly so your caretaker can help you faster.
                        </Text>

                        <Text style={styles.inputLabel}>Title</Text>
                        <TextInput
                            placeholder="e.g. Broken tap in bathroom"
                            placeholderTextColor="#B0CCBB"
                            style={styles.input}
                            value={title}
                            onChangeText={setTitle}
                            onFocus={() => {
                                setTimeout(() => {
                                    scrollRef.current?.scrollToEnd({ animated: true });
                                }, 300);
                            }}
                        />

                        <Text style={styles.inputLabel}>Description</Text>
                        <TextInput
                            placeholder="Describe the issue in detail…"
                            placeholderTextColor="#B0CCBB"
                            style={[styles.input, styles.textArea]}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={4}
                            onFocus={() => {
                                setTimeout(() => {
                                    scrollRef.current?.scrollToEnd({ animated: true });
                                }, 300);
                            }}
                        />
                        <Text style={styles.inputLabel}>Floor</Text>
                        <View style={styles.pickerContainer}>
                            
                                <Picker
                                    selectedValue={floor}   // ✅ USE STATE (NOT recalculation)
                                    onValueChange={(itemValue) => setFloor(itemValue)}
                                >
                                    <Picker.Item label="1st Floor" value="1" />
                                    <Picker.Item label="2nd Floor" value="2" />
                                    <Picker.Item label="3rd Floor" value="3" />
                                    <Picker.Item label="4th Floor" value="4" />
                                    <Picker.Item label="5th Floor" value="5" />
                                </Picker>
                            
                        </View>

                        <Text style={styles.inputLabel}>Location</Text>
                        <View style={styles.pickerContainer}>
                           
                                <Picker
                                    selectedValue={location}   // ✅ REQUIRED
                                    onValueChange={(itemValue) => setLocation(itemValue)}
                                >
                                    <Picker.Item label="Own Room" value="Own Room" />
                                    <Picker.Item label="Left Washroom" value="Left Washroom" />
                                    <Picker.Item label="Right Washroom" value="Right Washroom" />
                                    <Picker.Item label="Balcony" value="Balcony" />
                                    <Picker.Item label="Water Cooler" value="Water Cooler" />
                                    <Picker.Item label="Staircase" value="Stairs" />
                                    <Picker.Item label="Lift" value="Lift" />
                                </Picker>
                            
                        </View>
                        <Pressable style={styles.uploadButton} onPress={pickImage}>
                            <Text style={styles.uploadButtonText}>
                                {image ? "Change Image" : "Upload Image"}
                            </Text>
                        </Pressable>

                        {image ? (
                            <View style={styles.imagePreviewWrap}>
                                <Image source={{ uri: image }} style={styles.imagePreview} resizeMode="cover" />
                                <Pressable style={styles.removeImageButton} onPress={() => setImage(null)}>
                                    <Text style={styles.removeImageButtonText}>Remove</Text>
                                </Pressable>
                            </View>
                        ) : null}
                        <Pressable style={styles.submitButton} onPress={handleCreateTicket}>
                            <Text style={styles.submitButtonText}>Submit Ticket</Text>
                        </Pressable>
                    </View>
                )}

                <View style={{ height: 48 }} />
            </ScrollView>

            <Modal
                visible={cleanReminderVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setCleanReminderVisible(false)}
            >
                <Pressable style={styles.cleanReminderOverlay} onPress={() => setCleanReminderVisible(false)}>
                    <Pressable style={styles.cleanReminderCard} onPress={() => { }}>
                        <View style={styles.cleanReminderIconWrap}>
                            <Text style={styles.cleanReminderIcon}>🧹</Text>
                        </View>
                        <Text style={styles.cleanReminderTitle}>Cleaning reminder</Text>
                        <Text style={styles.cleanReminderText}>
                            It’s been more than 2 days since your room was last cleaned. Please get it cleaned.
                        </Text>
                        <Pressable style={styles.cleanReminderSkip} onPress={() => setCleanReminderVisible(false)}>
                            <Text style={styles.cleanReminderButtonText}>Okay!</Text>
                        </Pressable>
                    </Pressable>
                </Pressable>
            </Modal>
        </KeyboardAvoidingView>
    );
}


// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const GREEN_DARK = "#1E5C3A";
const GREEN_MID = "#4CAF77";
const GREEN_LIGHT = "#D4EDE0";
const GREEN_MINT = "#EEF8F1";
const GREEN_HERO = "#2A7A4F";
const CREAM = "#F7FAF8";
const TEXT_DARK = "#152820";
const TEXT_GRAY = "#6A8C77";
const TEXT_MUTED = "#9DBDAA";
const WHITE = "#FFFFFF";


// ─── BACKGROUND GRAPHICS ────────────────────────────────────────────────────
const bg = StyleSheet.create({
    circleTopRight: {
        position: "absolute", top: -60, right: -60,
        width: 200, height: 200, borderRadius: 100,
        backgroundColor: "rgba(76,175,119,0.055)",
    },
    circleMidLeft: {
        position: "absolute", top: 320, left: -80,
        width: 180, height: 180, borderRadius: 90,
        backgroundColor: "rgba(76,175,119,0.04)",
    },
    circleBottomRight: {
        position: "absolute", top: 640, right: -50,
        width: 140, height: 140, borderRadius: 70,
        backgroundColor: "rgba(76,175,119,0.045)",
    },
    leafTopLeft: {
        position: "absolute", top: 110, left: -30,
        width: 90, height: 90, borderRadius: 45,
        borderTopLeftRadius: 0,
        backgroundColor: "rgba(76,175,119,0.035)",
        transform: [{ rotate: "45deg" }],
    },
});


// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

    scrollView: { flex: 1, backgroundColor: CREAM },
    container: { paddingHorizontal: 20, paddingTop: 36, paddingBottom: 20 },
    center: {
        flex: 1, justifyContent: "center", alignItems: "center",
        backgroundColor: CREAM, gap: 12,
    },
    loadingText: { fontSize: 14, color: TEXT_GRAY, fontWeight: "500" },
    errorText: { fontSize: 15, color: TEXT_GRAY, fontWeight: "500" },

    // Top Bar — no gap between screen title (nav header) and greeting
    topBar: {
        flexDirection: "row", justifyContent: "space-between",
        alignItems: "flex-start", marginBottom: 22,
        // paddingTop: 0 ensures it sits flush under the nav bar
        paddingTop: 0,
    },
    greeting: {
        fontSize: 13, color: TEXT_MUTED, fontWeight: "500",
        letterSpacing: 0.2, marginBottom: 2,
    },
    userName: {
        fontSize: 24, fontWeight: "800", color: TEXT_DARK, letterSpacing: -0.6,
    },
    logoutButton: {
        backgroundColor: WHITE, paddingHorizontal: 16, paddingVertical: 9,
        borderRadius: 24, borderWidth: 1.5, borderColor: GREEN_LIGHT,
        shadowColor: GREEN_DARK, shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    },
    logoutText: { color: GREEN_DARK, fontWeight: "700", fontSize: 13 },

    // Hero Card
    heroCard: {
        backgroundColor: GREEN_HERO, borderRadius: 28, marginBottom: 28,
        overflow: "hidden",
        shadowColor: GREEN_DARK, shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.22, shadowRadius: 20, elevation: 8,
    },
    blobTopRight: {
        position: "absolute", top: -30, right: -30,
        width: 120, height: 120, borderRadius: 60,
        backgroundColor: "rgba(255,255,255,0.07)",
    },
    blobBottomLeft: {
        position: "absolute", bottom: -40, left: -20,
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: "rgba(255,255,255,0.05)",
    },
    heroInner: { padding: 22 },
    chipsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
    chip: {
        flex: 1, backgroundColor: "rgba(255,255,255,0.13)",
        borderRadius: 16, padding: 14,
        borderWidth: 1, borderColor: "rgba(255,255,255,0.18)",
    },
    chipAlt: { backgroundColor: "rgba(255,255,255,0.08)" },
    chipLabel: {
        fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: "700",
        letterSpacing: 1.2, marginBottom: 5,
    },
    chipValue: {
        fontSize: 17, fontWeight: "800", color: WHITE, letterSpacing: -0.3,
    },
    heroDivider: {
        height: 1, backgroundColor: "rgba(255,255,255,0.12)", marginBottom: 18,
    },

    // Last Cleaned — creative
    lastCleanedRow: {
        flexDirection: "row", alignItems: "center", gap: 12,
    },
    lastCleanedIconWrap: {
        width: 40, height: 40, borderRadius: 14,
        backgroundColor: "rgba(255,255,255,0.15)",
        justifyContent: "center", alignItems: "center",
    },
    lastCleanedIconEmoji: { fontSize: 18 },
    lastCleanedTextCol: { flex: 1 },
    lastCleanedLabel: {
        fontSize: 10, color: "rgba(255,255,255,0.5)",
        fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: 2,
    },
    lastCleanedLine1: {
        fontSize: 17, fontWeight: "800", color: WHITE, letterSpacing: -0.3,
    },
    lastCleanedLine2: {
        fontSize: 12, color: "rgba(255,255,255,0.65)", fontWeight: "500", marginTop: 1,
    },
    lastCleanedBadge: {
        backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 20,
        paddingHorizontal: 10, paddingVertical: 5,
        borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
    },
    lastCleanedBadgeText: {
        fontSize: 11, color: WHITE, fontWeight: "700",
    },

    // Section common
    ticketsSection: { marginBottom: 6 },
    sectionHeader: {
        flexDirection: "row", justifyContent: "space-between",
        alignItems: "center", marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18, fontWeight: "800", color: TEXT_DARK, letterSpacing: -0.4,
    },
    seeAllPill: {
        backgroundColor: GREEN_MINT, paddingHorizontal: 12,
        paddingVertical: 6, borderRadius: 20,
    },
    seeAll: { fontSize: 13, color: GREEN_MID, fontWeight: "700" },

    // Flashcard Stack
    stackWrapper: { marginBottom: 16 },
    stackCard: {
        position: "absolute", left: 0, right: 0,
        backgroundColor: WHITE, borderRadius: 20,
        shadowColor: GREEN_DARK, shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, height: 110,
    },
    stackCard2: { bottom: -8, marginHorizontal: 12, opacity: 0.5 },
    stackCard3: { bottom: -16, marginHorizontal: 24, opacity: 0.25 },

    ticketCard: {
        backgroundColor: WHITE, borderRadius: 20, padding: 18,
        shadowColor: GREEN_DARK, shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.1, shadowRadius: 14, elevation: 4,
        minHeight: 110, justifyContent: "center",
    },
    ticketAccentDot: {
        position: "absolute", top: 20, left: 18,
        width: 8, height: 8, borderRadius: 4,
    },
    ticketTop: {
        flexDirection: "row", justifyContent: "space-between",
        alignItems: "center", marginBottom: 7, paddingLeft: 16,
    },
    ticketTitle: {
        fontWeight: "800", fontSize: 15, color: TEXT_DARK,
        flex: 1, marginRight: 10, letterSpacing: -0.2,
    },
    ticketDesc: { fontSize: 13, color: TEXT_GRAY, paddingLeft: 16, lineHeight: 18 },
    ticketFooter: { paddingLeft: 16, marginTop: 8 },
    tapHint: {
        fontSize: 11, color: TEXT_MUTED, fontWeight: "500", letterSpacing: 0.1,
    },

    // Status badges
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    statusText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
    statusOpen: { backgroundColor: "#FEF3D7" },
    statusTextOpen: { color: "#996A00" },
    statusInProgress: { backgroundColor: "#E0F0FA" },
    statusTextInProgress: { color: "#1D6B9B" },
    statusResolved: { backgroundColor: GREEN_LIGHT },
    statusTextResolved: { color: GREEN_DARK },

    // Dots
    dotsRow: { flexDirection: "row", justifyContent: "center", marginBottom: 14, gap: 5 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: GREEN_LIGHT },
    dotActive: { width: 20, borderRadius: 3, backgroundColor: GREEN_MID },

    seeAllButton: { alignItems: "center", paddingVertical: 10 },
    seeAllButtonText: { color: TEXT_MUTED, fontSize: 13, fontWeight: "600" },

    // Empty State
    emptyState: {
        alignItems: "center", paddingVertical: 36,
        backgroundColor: WHITE, borderRadius: 24, marginBottom: 4,
        shadowColor: GREEN_DARK, shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
    },
    emptyIconWrap: {
        width: 64, height: 64, borderRadius: 20,
        backgroundColor: GREEN_MINT, justifyContent: "center",
        alignItems: "center", marginBottom: 14,
    },
    emptyIcon: { fontSize: 30 },
    emptyTitle: { fontSize: 16, fontWeight: "800", color: TEXT_DARK, marginBottom: 6 },
    emptySubtext: {
        fontSize: 13, color: TEXT_GRAY, textAlign: "center",
        paddingHorizontal: 32, lineHeight: 19,
    },

    // Raise Ticket Button
    raiseButton: {
        backgroundColor: GREEN_DARK, paddingVertical: 17, borderRadius: 20, marginTop: 20,
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
        shadowColor: GREEN_DARK, shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.28, shadowRadius: 12, elevation: 6,
    },
    raiseButtonPressed: { opacity: 0.88 },
    raiseButtonIcon: {
        color: "rgba(255,255,255,0.7)", fontSize: 20, fontWeight: "300", lineHeight: 22,
    },
    raiseButtonText: { color: WHITE, fontWeight: "800", fontSize: 15, letterSpacing: 0.2 },

    // Form
    form: {
        marginTop: 16, backgroundColor: WHITE, padding: 22, borderRadius: 24,
        shadowColor: GREEN_DARK, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.07, shadowRadius: 14, elevation: 3,
    },
    formTitle: {
        fontSize: 18, fontWeight: "800", color: TEXT_DARK,
        letterSpacing: -0.4, marginBottom: 6,
    },
    formSubtitle: { fontSize: 13, color: TEXT_GRAY, lineHeight: 19, marginBottom: 20 },
    inputLabel: {
        fontSize: 12, fontWeight: "700", color: TEXT_GRAY,
        letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 7,
    },
    input: {
        borderWidth: 1.5, borderColor: GREEN_LIGHT, backgroundColor: GREEN_MINT,
        padding: 14, borderRadius: 14, marginBottom: 16, fontSize: 14,
        color: TEXT_DARK, fontWeight: "500",
    },
    textArea: { height: 110, textAlignVertical: "top" },
    uploadButton: {
        marginTop: 2,
        backgroundColor: GREEN_MINT,
        paddingVertical: 14,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: GREEN_LIGHT,
        shadowColor: GREEN_MID,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
        elevation: 3,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 14,
    },
    uploadButtonText: {
        color: GREEN_DARK,
        fontWeight: "800",
        fontSize: 14,
        letterSpacing: 0.2,
    },
    imagePreviewWrap: {
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: GREEN_LIGHT,
        backgroundColor: "#F8FBF9",
        overflow: "hidden",
        marginBottom: 16,
    },
    imagePreview: {
        width: "100%",
        height: 150,
    },
    removeImageButton: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        alignItems: "center",
        justifyContent: "center",
        borderTopWidth: 1,
        borderTopColor: GREEN_LIGHT,
        backgroundColor: "#FFF0F0",
    },
    removeImageButtonText: {
        color: "#C0392B",
        fontWeight: "800",
        fontSize: 13,
    },
    submitButton: {
        backgroundColor: GREEN_MID, paddingVertical: 16, borderRadius: 16, marginTop: 4,
        shadowColor: GREEN_MID, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
    },
    submitButtonText: {
        color: WHITE, textAlign: "center", fontWeight: "800", fontSize: 15, letterSpacing: 0.3,
    },

    // Ticket Modal
    modalOverlay: {
        flex: 1, backgroundColor: "rgba(15,35,25,0.45)",
        justifyContent: "flex-end",
    },
    modalCard: {
        backgroundColor: WHITE, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: 24, paddingBottom: 40,
        shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1, shadowRadius: 16, elevation: 10,
    },
    modalHandle: {
        width: 40, height: 4, borderRadius: 2, backgroundColor: GREEN_LIGHT,
        alignSelf: "center", marginBottom: 20,
    },
    modalHeader: {
        flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10,
    },
    modalDot: {
        width: 10, height: 10, borderRadius: 5, marginTop: 5,
    },
    modalTitle: {
        fontSize: 18, fontWeight: "800", color: TEXT_DARK,
        flex: 1, letterSpacing: -0.3, lineHeight: 24,
    },
    modalDesc: {
        fontSize: 14, color: TEXT_GRAY, lineHeight: 22,
        marginBottom: 24,
    },
    ticketPhoto: {
        width: "100%",
        height: 190,
        borderRadius: 18,
        marginBottom: 18,
        backgroundColor: "#F2F2F2",
    },
    noPhotoText: {
        fontSize: 13,
        color: TEXT_GRAY,
        lineHeight: 20,
        marginBottom: 18,
    },
    modalClose: {
        backgroundColor: GREEN_MINT, paddingVertical: 14, borderRadius: 16,
        borderWidth: 1.5, borderColor: GREEN_LIGHT,
    },
    modalCloseText: {
        color: GREEN_DARK, textAlign: "center", fontWeight: "700", fontSize: 14,
    },

    // Cleaning reminder popup
    cleanReminderOverlay: {
        flex: 1,
        backgroundColor: "rgba(15,35,25,0.45)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 18,
    },
    cleanReminderCard: {
        width: "100%",
        backgroundColor: WHITE,
        borderRadius: 22,
        padding: 18,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
        elevation: 8,
    },
    cleanReminderIconWrap: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: GREEN_MINT,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 10,
    },
    cleanReminderIcon: { fontSize: 20 },
    cleanReminderTitle: {
        fontSize: 17,
        fontWeight: "800",
        color: TEXT_DARK,
        marginBottom: 6,
    },
    cleanReminderText: {
        fontSize: 13,
        color: TEXT_GRAY,
        lineHeight: 19,
        marginBottom: 14,
    },
    cleanReminderButton: {
        backgroundColor: GREEN_MID,
        paddingVertical: 12,
        borderRadius: 16,
        alignItems: "center",
        marginBottom: 10,
        shadowColor: GREEN_MID,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    cleanReminderButtonText: {
        color: GREEN_MID,
        fontWeight: "800",
        fontSize: 14,
    },
    cleanReminderSkip: {
        alignItems: "center",
        paddingVertical: 6,
    },
    cleanReminderSkipText: {
        color: GREEN_DARK,
        fontWeight: "800",
        fontSize: 13,
    },
    topBar: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 15,
    },

    rightSection: {
        flexDirection: "row",
        alignItems: "center",
    },

    iconButton: {
        marginRight: 10,
    },
});