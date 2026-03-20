// ─── App-wide config ─────────────────────────────────────────
// Edit SERVER_IP to your PC's local IP before running

export const CONFIG = {
  SERVER_IP: "192.168.8.5",
  SERVER_PORT: 3001,
  ROOM: "room1",
  START_URL: "https://www.instagram.com/reels/DWEzH45guQJ/",
  LOGIN_URL: "https://www.instagram.com/accounts/login/",
  REQUIRE_LOGIN: true,
} as const;

export const TOAST_DURATION = 4500; // ms comment toast visible
export const MAX_TOASTS = 3; // max visible at once
