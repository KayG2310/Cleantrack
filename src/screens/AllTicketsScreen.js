import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
 
export default function AllTicketsScreen({ route, navigation }) {
    const { tickets = [] } = route.params;
 
    const statusStyle = (status) => {
        if (status === "resolved") return { badge: styles.statusResolved, text: styles.statusTextResolved };
        if (status === "in-progress") return { badge: styles.statusInProgress, text: styles.statusTextInProgress };
        return { badge: styles.statusOpen, text: styles.statusTextOpen };
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
                    <View key={index} style={styles.ticketCard}>
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
                    </View>
                ))}
                <View style={{ height: 40 }} />
            </ScrollView>
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
});