import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Pressable,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../services/api";
import AntDesign from "@expo/vector-icons/AntDesign";

const GREEN_DARK  = "#2D6A4F";
const GREEN_MID   = "#52B788";
const GREEN_LIGHT = "#D8F3DC";
const GREEN_MINT  = "#F0FAF4";
const TEXT_DARK   = "#1B2E24";
const TEXT_GRAY   = "#6B8F7A";
const WHITE       = "#FFFFFF";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function BgGraphics() {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <View style={bg.circleTopRight} />
      <View style={bg.circleMidLeft} />
      <View style={bg.circleBottomRight} />
      <View style={bg.leafTopLeft} />
    </View>
  );
}

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

export default function AnnouncementsScreen({ navigation }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAnnouncements = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await API.get("/api/caretaker/announcements", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const now = Date.now();
      const recent = (res.data.announcements || []).filter(
        (a) => now - new Date(a.createdAt).getTime() <= SEVEN_DAYS_MS
      );

      setAnnouncements(recent);
    } catch (err) {
      Alert.alert("Error", "Failed to load announcements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // ── Push everything into the native nav header ──────────────────
  useEffect(() => {
    navigation.setOptions({
      title: "Announcements",
      headerStyle: {
        backgroundColor: WHITE,
        borderBottomColor: GREEN_LIGHT,
        borderBottomWidth: 1,
        elevation: 0,
        shadowOpacity: 0,
      },
      headerTitleStyle: {
        fontSize: 18,
        fontWeight: "700",
        color: TEXT_DARK,
      },
      headerTintColor: GREEN_MID,           // colours the back arrow + label
      headerBackTitle: "",              // iOS back label
    //   headerRight: () => (
    //     <Text style={styles.headerCount}>
    //       {announcements.length} total
    //     </Text>
    //   ),
    });
  }, [announcements.length]);              // re-runs when count changes

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={GREEN_MID} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <BgGraphics />

      {/* No custom header View — it's all in the nav bar now */}
      <ScrollView contentContainerStyle={styles.list}>
        {announcements.length === 0 ? (
          <View style={styles.emptyState}>
            <AntDesign name="inbox" size={40} color={GREEN_LIGHT} />
            <Text style={styles.emptyText}>No announcements in the last 7 days</Text>
          </View>
        ) : (
          announcements.map((a, index) => (
            <View key={index} style={styles.card}>

              <View style={styles.cardTop}>
                <Text style={styles.heading} numberOfLines={2}>
                  {a.title}
                </Text>
                {a.priority && (
                  <View style={[
                    styles.priorityBadge,
                    a.priority === "high"   && styles.high,
                    a.priority === "medium" && styles.medium,
                    a.priority === "low"    && styles.low,
                  ]}>
                    <Text style={[
                      styles.priorityText,
                      a.priority === "high"   && styles.priorityTextHigh,
                      a.priority === "medium" && styles.priorityTextMedium,
                      a.priority === "low"    && styles.priorityTextLow,
                    ]}>
                      {a.priority.toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={styles.content}>{a.content}</Text>
              <View style={styles.divider} />

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <AntDesign name="user" size={11} color={TEXT_GRAY} />
                  <Text style={styles.meta}>{a.postedByName}</Text>
                </View>
                <View style={styles.metaItem}>
                  {/* <AntDesign name="clockcircleo" size={11} color={TEXT_GRAY} /> */}
                  <Text style={styles.meta}>
                    {new Date(a.createdAt).toLocaleString()}
                  </Text>
                </View>
              </View>

            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: WHITE,
  },

  // count shown in nav bar right side
  headerCount: {
    fontSize: 13,
    color: TEXT_GRAY,
    fontWeight: "500",
    marginRight: 16,
    justifyContent: "center",
    alignContent: "center",
  },

  list: { padding: 20 },

  card: {
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
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  heading: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT_DARK,
    flex: 1,
    marginRight: 8,
    lineHeight: 22,
  },
  content: {
    fontSize: 13,
    color: TEXT_GRAY,
    lineHeight: 20,
    marginBottom: 12,
  },

  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  priorityText: { fontSize: 11, fontWeight: "700" },
  high:               { backgroundColor: "#FEE2E2" },
  priorityTextHigh:   { color: "#B91C1C" },
  medium:             { backgroundColor: "#FFF9E6" },
  priorityTextMedium: { color: "#B7791F" },
  low:                { backgroundColor: GREEN_LIGHT },
  priorityTextLow:    { color: GREEN_DARK },

  divider: {
    height: 1,
    backgroundColor: GREEN_LIGHT,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 6,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  meta: { fontSize: 11, color: TEXT_GRAY, fontWeight: "500" },

  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyText: { fontSize: 14, color: TEXT_GRAY, fontWeight: "500" },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});