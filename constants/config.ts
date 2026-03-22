export const CONFIG = {
  SERVER_IP: "reelwatch.adelelawady.org",
  SERVER_PORT: 443,

  START_URL: "https://www.instagram.com/reels/DWEzH45guQJ/",
  LOGIN_URL: "https://www.instagram.com/accounts/login/",
  REQUIRE_LOGIN: false, // if true, will check cookies for logged-in status and block access if not logged in

  // ─── DEV FLAGS ───────────────────────────────────────────
  DEV_MODE: false,
  DEV_DEFAULT_ROOM: "room1",
  DEV_USERNAME: "devuser",
} as const;

export const TOAST_DURATION = 8500;
export const MAX_TOASTS = 5;
