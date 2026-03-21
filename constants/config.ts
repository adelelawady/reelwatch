export const CONFIG = {
  SERVER_IP: "192.168.8.5",
  SERVER_PORT: 3001,
  START_URL: "https://www.instagram.com/reels/DWEzH45guQJ/",
  LOGIN_URL: "https://www.instagram.com/accounts/login/",
  REQUIRE_LOGIN: true,

  // ─── DEV FLAGS ───────────────────────────────────────────
  DEV_MODE: false,
  DEV_DEFAULT_ROOM: "room1",
  DEV_USERNAME: "devuser",
} as const;

export const TOAST_DURATION = 8500;
export const MAX_TOASTS = 5;
