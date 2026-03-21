import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StatusBar as RNStatusBar,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";

import { CONFIG } from "../constants/config";
import { RoomInfo, useRooms } from "../hooks/useRooms";
import { AUTH_CHECK_JS } from "../utils/authInjected";

type Phase =
  | "checking_login"
  | "need_login"
  | "enter_name"
  | "lobby"
  | "create_room";

// ── Instagram logout injected script ─────────────────────────
const LOGOUT_JS = `
(function() {
  try {
    // Clear all IG cookies
    document.cookie.split(';').forEach(function(c) {
      document.cookie = c.replace(/^ +/, '')
        .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/;domain=.instagram.com');
    });
    // Navigate to logout endpoint
    window.location.href = 'https://www.instagram.com/accounts/logout/';
  } catch(e) {}
})();
true;
`;

export default function EntranceScreen() {
  const router = useRouter();
  const webviewRef = useRef<WebView>(null);

  const [phase, setPhase] = useState<Phase>(
    CONFIG.DEV_MODE ? "enter_name" : "checking_login",
  );
  const [igUsername, setIgUsername] = useState(
    CONFIG.DEV_MODE ? CONFIG.DEV_USERNAME : "",
  );
  const [displayName, setDisplayName] = useState(
    CONFIG.DEV_MODE ? CONFIG.DEV_USERNAME : "",
  );
  const [nameError, setNameError] = useState("");
  const [serverError, setServerError] = useState("");

  // Create room state
  const [newRoomId, setNewRoomId] = useState("");
  const [newRoomRemote, setNewRoomRemote] = useState(false);
  const [roomError, setRoomError] = useState("");

  // Only set after name is confirmed — triggers useRooms connection
  const [activeUsername, setActiveUsername] = useState(
    CONFIG.DEV_MODE ? CONFIG.DEV_USERNAME : "",
  );

  // Instagram account info shown in lobby
  const [igStats, setIgStats] = useState<{
    username: string;
    fullName?: string;
  } | null>(null);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const devAutoJoinDone = useRef(false);

  const fadeTransition = useCallback(
    (next: Phase) => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(() => {
        setPhase(next);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }).start();
      });
    },
    [fadeAnim],
  );

  // ─── Rooms hook ────────────────────────────────────────────
  const { rooms, connected, registered, createRoom, joinRoom } = useRooms({
    username: activeUsername,
    onJoined: (roomId) => {
      router.replace({
        pathname: "/reel",
        params: { room: roomId, username: activeUsername },
      });
    },
    onRoomDeleted: () => setServerError("The room was deleted."),
    onError: (msg) => setServerError(msg),
  });

  // ─── DEV auto-join ─────────────────────────────────────────
  useEffect(() => {
    if (!CONFIG.DEV_MODE || !registered || devAutoJoinDone.current) return;
    const t = setTimeout(() => {
      if (devAutoJoinDone.current) return;
      devAutoJoinDone.current = true;
      const existing = rooms.find((r) => r.id === CONFIG.DEV_DEFAULT_ROOM);
      if (existing) joinRoom(CONFIG.DEV_DEFAULT_ROOM);
      else createRoom(CONFIG.DEV_DEFAULT_ROOM, false);
    }, 600);
    return () => clearTimeout(t);
  }, [registered, rooms.length]);

  // ─── WebView auth result ───────────────────────────────────
  const onWebViewMessage = useCallback(
    ({ nativeEvent }: WebViewMessageEvent) => {
      try {
        const msg = JSON.parse(nativeEvent.data);
        if (msg.type === "auth_result") {
          if (msg.loggedIn) {
            const uname = msg.username || "instagram_user";
            setIgUsername(uname);
            setIgStats({ username: uname });
            setDisplayName(uname);
            fadeTransition("enter_name");
          } else {
            setIgStats(null);
            fadeTransition("need_login");
          }
        }
      } catch {}
    },
    [fadeTransition],
  );

  const onNavStateChange = useCallback(
    (navState: any) => {
      if (!navState.url || navState.loading) return;

      // Logged out — landed back on login page
      if (
        navState.url.includes("/accounts/login") ||
        navState.url.includes("/accounts/logout")
      ) {
        setIgStats(null);
        setIgUsername("");
        setDisplayName("");
        setActiveUsername("");
        setPhase("need_login");
        return;
      }

      // Just completed login — re-check auth
      if (
        phase === "need_login" &&
        navState.url.includes("instagram.com") &&
        !navState.url.includes("login")
      ) {
        setPhase("checking_login");
        setTimeout(() => {
          webviewRef.current?.injectJavaScript(AUTH_CHECK_JS);
        }, 1200);
      }
    },
    [phase],
  );

  // ─── Logout handler ────────────────────────────────────────
  const handleLogout = useCallback(() => {
    setIgStats(null);
    setIgUsername("");
    setDisplayName("");
    setActiveUsername("");
    devAutoJoinDone.current = false;
    // Inject logout into the hidden WebView
    webviewRef.current?.injectJavaScript(LOGOUT_JS);
    setTimeout(() => fadeTransition("need_login"), 800);
  }, [fadeTransition]);

  // ─── Confirm name ──────────────────────────────────────────
  const confirmName = useCallback(() => {
    const name = displayName.trim();
    if (name.length < 2) {
      setNameError("At least 2 characters");
      return;
    }
    if (name.length > 20) {
      setNameError("Max 20 characters");
      return;
    }
    if (!/^[a-zA-Z0-9_. ]+$/.test(name)) {
      setNameError("Letters, numbers, spaces, _ and . only");
      return;
    }
    setNameError("");
    setActiveUsername(name);
    fadeTransition("lobby");
  }, [displayName]);

  // ─── Create room submit ────────────────────────────────────
  const submitCreateRoom = useCallback(() => {
    const id = newRoomId.trim();
    if (id.length < 2) {
      setRoomError("At least 2 characters");
      return;
    }
    if (id.length > 24) {
      setRoomError("Max 24 characters");
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      setRoomError("Letters, numbers, _ and - only");
      return;
    }
    setRoomError("");
    createRoom(id, newRoomRemote);
    setPhase("lobby");
  }, [newRoomId, newRoomRemote, createRoom]);

  // ══════════════════════════════════════════════════════════
  return (
    <View style={styles.root}>
      {/* ── WebView: always mounted, visible only for login ── */}
      <View
        style={[
          styles.webviewContainer,
          phase === "need_login" && styles.webviewVisible,
        ]}
        pointerEvents={phase === "need_login" ? "auto" : "none"}
      >
        {phase === "need_login" && (
          <View style={styles.loginBanner}>
            <Text style={styles.loginBannerText}>
              🔐 Log in to Instagram to continue
            </Text>
          </View>
        )}
        <WebView
          ref={webviewRef}
          source={{
            uri:
              phase === "need_login"
                ? CONFIG.LOGIN_URL
                : "https://www.instagram.com/",
          }}
          injectedJavaScript={AUTH_CHECK_JS}
          onMessage={onWebViewMessage}
          onNavigationStateChange={onNavStateChange}
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          style={[styles.webview, phase === "need_login" && { marginTop: 52 }]}
        />
      </View>

      {/* ── Checking login ── */}
      {phase === "checking_login" && (
        <Animated.View style={[styles.centered, { opacity: fadeAnim }]}>
          <Text style={styles.logoEmoji}>🎬</Text>
          <Text style={styles.logoText}>ReelWatch</Text>
          <View style={styles.statusRow}>
            <ActivityIndicator color="rgba(255,255,255,0.5)" size="small" />
            <Text style={styles.statusText}>Checking login…</Text>
          </View>
        </Animated.View>
      )}

      {/* ── Enter name ── */}
      {phase === "enter_name" && (
        <Animated.View style={[styles.centered, { opacity: fadeAnim }]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.card}
          >
            <Text style={styles.logoEmoji}>🎬</Text>
            <Text style={styles.logoText}>ReelWatch</Text>

            {/* ── Instagram account card ── */}
            <View style={styles.igCard}>
              <View style={styles.igAvatar}>
                <Text style={styles.igAvatarText}>
                  {igUsername ? igUsername[0].toUpperCase() : "?"}
                </Text>
              </View>
              <View style={styles.igInfo}>
                <Text style={styles.igHandle}>@{igUsername || "unknown"}</Text>
                <Text style={styles.igVerified}>✓ Instagram verified</Text>
              </View>
              {/* Logout button */}
              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Text style={styles.logoutBtnText}>Log out</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Your display name in rooms</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={(t) => {
                setDisplayName(t);
                setNameError("");
              }}
              placeholder="e.g. Ahmed"
              placeholderTextColor="rgba(255,255,255,0.35)"
              autoFocus
              maxLength={20}
              returnKeyType="done"
              onSubmitEditing={confirmName}
              autoCapitalize="none"
              autoCorrect={false}
              selectionColor="#007aff"
            />
            {!!nameError && <Text style={styles.errorText}>{nameError}</Text>}

            {/* ── FIX: button has explicit text, correct styles ── */}
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={confirmName}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Continue →</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Animated.View>
      )}

      {/* ── Lobby ── */}
      {phase === "lobby" && (
        <Animated.View style={[styles.fill, { opacity: fadeAnim }]}>
          {/* Header */}
          <View style={styles.lobbyHeader}>
            <View style={styles.lobbyHeaderLeft}>
              <Text style={styles.logoText}>🎬 ReelWatch</Text>
              {/* ── Instagram stats row ── */}
              {igStats && (
                <View style={styles.igStatsRow}>
                  <View style={styles.igStatsDot} />
                  <Text style={styles.igStatsText}>@{igStats.username}</Text>
                  <Text style={styles.igStatsSep}>·</Text>
                  <Text style={styles.igStatsVerified}>Instagram ✓</Text>
                </View>
              )}
            </View>

            <View style={styles.headerRight}>
              <View style={styles.connPill}>
                <View
                  style={[
                    styles.connDot,
                    {
                      backgroundColor: registered
                        ? "#4caf50"
                        : connected
                          ? "#ff9800"
                          : "#f44336",
                    },
                  ]}
                />
                <Text style={styles.connText}>
                  {registered
                    ? `@${activeUsername}`
                    : connected
                      ? "Registering…"
                      : "Offline"}
                </Text>
              </View>

              {/* Change name */}
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => {
                  setActiveUsername("");
                  setDisplayName(igUsername || "");
                  setNameError("");
                  fadeTransition("enter_name");
                }}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={styles.iconBtnText}>✎</Text>
              </TouchableOpacity>

              {/* Logout */}
              <TouchableOpacity
                style={[styles.iconBtn, styles.iconBtnRed]}
                onPress={handleLogout}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={styles.iconBtnText}>⏏</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Error banner */}
          {!!serverError && (
            <TouchableOpacity
              style={styles.errorBanner}
              onPress={() => setServerError("")}
            >
              <Text style={styles.errorBannerText}>⚠ {serverError} ✕</Text>
            </TouchableOpacity>
          )}

          {/* Room list */}
          <ScrollView
            style={styles.roomList}
            contentContainerStyle={styles.roomListContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.sectionLabel}>
              {rooms.length > 0
                ? `${rooms.length} Room${rooms.length !== 1 ? "s" : ""}`
                : "No rooms yet"}
            </Text>

            {rooms.length === 0 ? (
              <View style={styles.emptyRooms}>
                <Text style={styles.emptyText}>It's quiet here…</Text>
                <Text style={styles.emptySubText}>
                  Tap "New Room" below to create one
                </Text>
              </View>
            ) : (
              rooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  currentUsername={activeUsername}
                  onJoin={() => joinRoom(room.id)}
                />
              ))
            )}
          </ScrollView>

          {/* FAB */}
          <TouchableOpacity
            style={[styles.fab, !registered && styles.fabDisabled]}
            onPress={() => {
              if (!registered) return;
              setNewRoomId("");
              setNewRoomRemote(false);
              setRoomError("");
              setPhase("create_room");
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.fabText}>＋ New Room</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ══════════════════════════════════════════════════════
          CREATE ROOM MODAL — complete rewrite for visibility
      ══════════════════════════════════════════════════════ */}
      <Modal
        visible={phase === "create_room"}
        transparent
        animationType="slide"
        onRequestClose={() => setPhase("lobby")}
        statusBarTranslucent
      >
        {/*
          KeyboardAvoidingView wraps the whole modal so the keyboard
          pushes the sheet up on iOS and Android alike.
        */}
        <KeyboardAvoidingView
          style={styles.modalOuter}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          {/* Backdrop tap to dismiss */}
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setPhase("lobby")}
          />

          {/* Sheet */}
          <View style={styles.modalSheet}>
            {/* Drag handle */}
            <View style={styles.modalHandle} />

            <Text style={styles.modalTitle}>New Room</Text>

            {/* ── Room name input — explicitly styled ── */}
            <Text style={styles.fieldLabel}>Room ID</Text>
            <View style={styles.inputBorder}>
              <TextInput
                style={styles.modalInput}
                value={newRoomId}
                onChangeText={(t) => {
                  setNewRoomId(t.replace(/\s/g, "-"));
                  setRoomError("");
                }}
                placeholder="e.g. movie-night"
                placeholderTextColor="#666"
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={24}
                returnKeyType="done"
                onSubmitEditing={submitCreateRoom}
                keyboardAppearance="dark"
                selectionColor="#007aff"
              />
            </View>
            {!!roomError && <Text style={styles.errorText}>{roomError}</Text>}

            {/* ── Remote Control toggle — completely standalone ── */}
            <View style={styles.toggleCard}>
              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setNewRoomRemote((v) => !v)}
                activeOpacity={0.7}
              >
                {/* Checkbox — big, always visible */}
                <View
                  style={[
                    styles.checkbox,
                    newRoomRemote && styles.checkboxChecked,
                  ]}
                >
                  {newRoomRemote && <Text style={styles.checkmark}>✓</Text>}
                </View>

                <View style={styles.toggleContent}>
                  <Text style={styles.toggleTitle}>🎮 Remote Control</Text>
                  <Text style={styles.toggleDesc}>
                    Only you control which reel plays.{"\n"}
                    Others watch and follow your scroll.
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Buttons */}
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setPhase("lobby")}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.createBtn}
                onPress={submitCreateRoom}
                activeOpacity={0.85}
              >
                <Text style={styles.createBtnText}>Create Room</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Room Card ─────────────────────────────────────────────────
function RoomCard({
  room,
  currentUsername,
  onJoin,
}: {
  room: RoomInfo;
  currentUsername: string;
  onJoin: () => void;
}) {
  const isInRoom = room.users.includes(currentUsername);
  return (
    <View style={styles.roomCard}>
      <View style={styles.roomCardLeft}>
        <View style={styles.roomCardTitleRow}>
          <Text style={styles.roomName}>{room.id}</Text>
          {room.remote_control && (
            <View style={styles.remoteBadge}>
              <Text style={styles.remoteBadgeText}>🎮</Text>
            </View>
          )}
          {isInRoom && (
            <View style={styles.inRoomBadge}>
              <Text style={styles.inRoomBadgeText}>● IN</Text>
            </View>
          )}
        </View>
        <Text style={styles.roomMeta}>
          Owner: {room.owner} · {room.user_count} viewer
          {room.user_count !== 1 ? "s" : ""}
        </Text>
        {room.users.length > 0 && (
          <Text style={styles.roomUsers} numberOfLines={1}>
            {room.users.slice(0, 5).join(", ")}
            {room.users.length > 5 ? ` +${room.users.length - 5}` : ""}
          </Text>
        )}
      </View>
      <TouchableOpacity style={styles.joinBtn} onPress={onJoin}>
        <Text style={styles.joinBtnText}>{isInRoom ? "Rejoin" : "Join"}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────
const SAFE_TOP =
  Platform.OS === "android" ? (RNStatusBar.currentHeight ?? 24) : 52;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080808" },
  fill: { flex: 1 },

  // WebView
  webviewContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    zIndex: -1,
  },
  webviewVisible: { opacity: 1, zIndex: 10 },
  webview: { flex: 1 },
  loginBanner: {
    position: "absolute",
    top: SAFE_TOP,
    left: 0,
    right: 0,
    zIndex: 20,
    backgroundColor: "rgba(0,0,0,0.92)",
    paddingVertical: 13,
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  loginBannerText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontWeight: "600",
  },

  // Centered
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    paddingTop: SAFE_TOP + 20,
  },
  card: { width: "100%", maxWidth: 380, alignItems: "stretch" },
  logoEmoji: { fontSize: 52, textAlign: "center", marginBottom: 4 },
  logoText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 24,
  },
  statusText: { color: "rgba(255,255,255,0.4)", fontSize: 15 },

  // ── Instagram card on enter_name screen ──
  igCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 14,
    padding: 12,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.1)",
    gap: 10,
  },
  igAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#007aff",
    alignItems: "center",
    justifyContent: "center",
  },
  igAvatarText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  igInfo: { flex: 1 },
  igHandle: { color: "#fff", fontSize: 15, fontWeight: "700" },
  igVerified: { color: "#4caf50", fontSize: 12, marginTop: 2 },
  logoutBtn: {
    backgroundColor: "rgba(244,67,54,0.15)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(244,67,54,0.3)",
  },
  logoutBtnText: { color: "#f44336", fontSize: 12, fontWeight: "700" },

  // Form
  fieldLabel: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 16,
  },
  // Standard input used on enter_name screen
  input: {
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 11,
    color: "#fff",
    fontSize: 16,
    minHeight: 50,
  },
  errorText: {
    color: "#ff5252",
    fontSize: 12,
    marginTop: 5,
    marginLeft: 2,
    marginBottom: 2,
  },
  primaryBtn: {
    backgroundColor: "#007aff",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    minHeight: 50,
  },
  primaryBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
    // Android: explicit lineHeight prevents text clipping
    lineHeight: 20,
  },

  // Lobby header
  lobbyHeader: {
    paddingTop: SAFE_TOP + 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  lobbyHeaderLeft: { flex: 1, marginRight: 10 },
  igStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 5,
  },
  igStatsDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4caf50",
  },
  igStatsText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "600",
  },
  igStatsSep: { color: "rgba(255,255,255,0.2)", fontSize: 12 },
  igStatsVerified: { color: "#4caf50", fontSize: 11 },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  connPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  connDot: { width: 7, height: 7, borderRadius: 4 },
  connText: { color: "rgba(255,255,255,0.4)", fontSize: 11 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnRed: { backgroundColor: "rgba(244,67,54,0.15)" },
  iconBtnText: { color: "#fff", fontSize: 14 },

  // Error banner
  errorBanner: {
    backgroundColor: "rgba(244,67,54,0.12)",
    borderWidth: 1,
    borderColor: "rgba(244,67,54,0.25)",
    margin: 12,
    borderRadius: 10,
    padding: 11,
  },
  errorBannerText: { color: "#f44336", fontSize: 13 },

  // Room list
  roomList: { flex: 1 },
  roomListContent: { padding: 14, paddingBottom: 20, gap: 10 },
  sectionLabel: {
    color: "rgba(255,255,255,0.22)",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  emptyRooms: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyText: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 17,
    fontWeight: "600",
  },
  emptySubText: { color: "rgba(255,255,255,0.18)", fontSize: 14 },

  // Room card
  roomCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
  },
  roomCardLeft: { flex: 1 },
  roomCardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 4,
    flexWrap: "wrap",
  },
  roomName: { color: "#fff", fontSize: 16, fontWeight: "700" },
  remoteBadge: {
    backgroundColor: "rgba(0,122,255,0.18)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  remoteBadgeText: { fontSize: 11 },
  inRoomBadge: {
    backgroundColor: "rgba(76,175,80,0.18)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  inRoomBadgeText: { color: "#4caf50", fontSize: 10, fontWeight: "800" },
  roomMeta: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 12,
    marginBottom: 3,
  },
  roomUsers: { color: "rgba(255,255,255,0.2)", fontSize: 11 },
  joinBtn: {
    backgroundColor: "#007aff",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    marginLeft: 12,
  },
  joinBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // FAB
  fab: {
    margin: 16,
    backgroundColor: "#007aff",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    shadowColor: "#007aff",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  fabDisabled: { backgroundColor: "rgba(0,122,255,0.3)" },
  fabText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.3,
  },

  // ══════════════════════════════════════════════════════════
  // CREATE ROOM MODAL — fully rewritten for visibility
  // ══════════════════════════════════════════════════════════
  modalOuter: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalSheet: {
    backgroundColor: "#1c1c1e", // solid — never transparent
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 44 : 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
    // Android elevation so it renders above everything
    elevation: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignSelf: "center",
    marginBottom: 18,
  },
  modalTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 4,
  },

  // ── Modal input — highly visible ──
  inputBorder: {
    borderWidth: 1.5,
    borderColor: "#007aff", // blue border — impossible to miss
    borderRadius: 12,
    backgroundColor: "#2c2c2e", // solid dark bg — never transparent
    marginBottom: 4,
  },
  modalInput: {
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 11,
    color: "#ffffff", // explicit white text
    fontSize: 16,
    minHeight: 50,
  },

  // ── Checkbox toggle — visible card ──
  toggleCard: {
    backgroundColor: "#2c2c2e", // solid background
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    gap: 14,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    // Force render on Android
    overflow: "hidden",
  },
  checkboxChecked: {
    backgroundColor: "#007aff",
    borderColor: "#007aff",
  },
  checkmark: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
    // Android text sometimes clips — force it
    includeFontPadding: false,
    lineHeight: 20,
  },
  toggleContent: { flex: 1 },
  toggleTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  toggleDesc: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },

  // Modal buttons
  modalBtns: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  cancelBtnText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 20,
  },
  createBtn: {
    flex: 2,
    backgroundColor: "#007aff",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  createBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 20,
  },
});
