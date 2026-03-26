import { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, Modal, Image } from "react-native";
 
export default function AllTicketsScreen({ route, navigation }) {
    const { tickets = [] } = route.params;
    const [activeTicket, setActiveTicket] = useState(null);
    const [photoModalVisible, setPhotoModalVisible] = useState(false);

    const openTicket = (ticket) => {
        setActiveTicket(ticket);
        setPhotoModalVisible(true);
    };

    const closePhotoModal = () => {
        setPhotoModalVisible(false);
    };

    const photoUrl = activeTicket?.photoUrl;
    const isValidPhotoUrl = useMemo(() => {
        if (typeof photoUrl !== "string") return false;
        const normalized = photoUrl.trim();
        if (!normalized) return false;
        if (["see more", "n/a", "na", "none", "null", "undefined"].includes(normalized.toLowerCase())) return false;
        return normalized.startsWith("http");
    }, [photoUrl]);
 
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

    return (
        <View style={styles.screen}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back</Text>
                </Pressable>
                <Text style={styles.headerTitle}>All Tickets</Text>
                <Text style={styles.headerCount}>{tickets.length} total</Text>
            </View>
 
            <ScrollView contentContainerStyle={styles.list}>
                {tickets.map((t, index) => (
                    <Pressable key={index} style={styles.ticketCard} onPress={() => openTicket(t)}>
                        <View style={styles.ticketTop}>
                            <Text style={styles.ticketTitle} numberOfLines={1} ellipsizeMode="tail">
                                {t.title}
                            </Text>
                            <View style={[styles.statusBadge, statusStyle(t.status).badge]}>
                                <Text style={[styles.statusText, statusStyle(t.status).text]}>
                                    {t.status || "open"}
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.ticketDesc}>{t.description}</Text>
                    </Pressable>
                ))}
                <View style={{ height: 40 }} />
            </ScrollView>

            <Modal
                visible={photoModalVisible}
                transparent
                animationType="fade"
                onRequestClose={closePhotoModal}
            >
                <Pressable style={styles.modalOverlay} onPress={closePhotoModal}>
                    <Pressable style={styles.modalCard} onPress={() => {}}>
                        <View style={styles.modalHandle} />

                        <View style={styles.modalHeader}>
                            <View style={[styles.modalDot, { backgroundColor: statusDotColor(activeTicket?.status) }]} />
                            <Text style={styles.modalTitle}>{activeTicket?.title}</Text>
                        </View>

                        <View style={[styles.statusBadge, activeTicket && statusStyle(activeTicket.status).badge, { alignSelf: "flex-start", marginBottom: 14 }]}>
                            <Text style={[styles.statusText, activeTicket ? statusStyle(activeTicket.status).text : styles.statusTextOpen]}>
                                {activeTicket?.status || "open"}
                            </Text>
                        </View>

                        <Text style={styles.modalDesc}>{activeTicket?.description}</Text>

                        {isValidPhotoUrl ? (
                            <Image source={{ uri: photoUrl }} style={styles.ticketPhoto} resizeMode="cover" />
                        ) : (
                            <Text style={styles.noPhotoText}>No photo available</Text>
                        )}

                        <Pressable style={styles.modalClose} onPress={closePhotoModal}>
                            <Text style={styles.modalCloseText}>Close</Text>
                        </Pressable>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}
 
const GREEN_DARK  = "#2D6A4F";
const GREEN_MID   = "#52B788";
const GREEN_LIGHT = "#D8F3DC";
const GREEN_MINT  = "#F0FAF4";
const TEXT_DARK   = "#1B2E24";
const TEXT_GRAY   = "#6B8F7A";
const WHITE       = "#FFFFFF";
 
const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: WHITE },
 
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 56,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: GREEN_LIGHT,
        backgroundColor: WHITE,
    },
    backBtn: {
        paddingVertical: 6,
        paddingRight: 12,
    },
    backText: { color: GREEN_MID, fontWeight: "600", fontSize: 15 },
    headerTitle: { fontSize: 18, fontWeight: "700", color: TEXT_DARK },
    headerCount: { fontSize: 13, color: TEXT_GRAY, fontWeight: "500" },
 
    list: { padding: 20 },
 
    ticketCard: {
        backgroundColor: WHITE,
        borderRadius: 16,
        padding: 18,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: GREEN_MID,
        shadowColor: GREEN_DARK,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 3,
    },
    ticketTop: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    ticketTitle: { fontWeight: "700", fontSize: 15, color: TEXT_DARK, flex: 1, marginRight: 8 },
    ticketDesc: { fontSize: 13, color: TEXT_GRAY, lineHeight: 20 },
 
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    statusText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
    statusOpen: { backgroundColor: "#FFF9E6" },
    statusTextOpen: { color: "#B7791F" },
    statusInProgress: { backgroundColor: "#EBF4FF" },
    statusTextInProgress: { color: "#2B6CB0" },
    statusResolved: { backgroundColor: GREEN_LIGHT },
    statusTextResolved: { color: GREEN_DARK },

    // Ticket photo modal
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(15,35,25,0.45)",
        justifyContent: "center",
        paddingHorizontal: 18,
    },
    modalCard: {
        backgroundColor: WHITE,
        borderRadius: 22,
        padding: 18,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 8,
    },
    modalHandle: {
        width: 42,
        height: 5,
        borderRadius: 999,
        backgroundColor: GREEN_LIGHT,
        alignSelf: "center",
        marginBottom: 14,
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        marginBottom: 10,
    },
    modalDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginTop: 7,
    },
    modalTitle: { fontSize: 18, fontWeight: "800", color: TEXT_DARK, flex: 1, lineHeight: 24 },
    modalDesc: { fontSize: 14, color: TEXT_GRAY, lineHeight: 22, marginBottom: 16 },
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
        backgroundColor: GREEN_MINT,
        paddingVertical: 14,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: GREEN_LIGHT,
    },
    modalCloseText: { color: GREEN_DARK, textAlign: "center", fontWeight: "700", fontSize: 14 },
});