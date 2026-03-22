# 🎬 ReelWatch

<div align="center">

**Watch Instagram Reels together, in sync, in real time.**

[![GitHub stars](https://img.shields.io/github/stars/adelelawady/reelwatch?style=for-the-badge&logo=github&color=FFD700)](https://github.com/adelelawady/reelwatch/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/adelelawady/reelwatch?style=for-the-badge&logo=github&color=4CAF50)](https://github.com/adelelawady/reelwatch/network)
[![GitHub issues](https://img.shields.io/github/issues/adelelawady/reelwatch?style=for-the-badge&color=f44336)](https://github.com/adelelawady/reelwatch/issues)
[![Repo size](https://img.shields.io/github/repo-size/adelelawady/reelwatch?style=for-the-badge&color=007aff)](https://github.com/adelelawady/reelwatch)
[![Last commit](https://img.shields.io/github/last-commit/adelelawady/reelwatch?style=for-the-badge&color=9c27b0)](https://github.com/adelelawady/reelwatch/commits)
[![License](https://img.shields.io/github/license/adelelawady/reelwatch?style=for-the-badge&color=00bcd4)](LICENSE)

[![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev)
[![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![WebSocket](https://img.shields.io/badge/WebSocket-4CAF50?style=for-the-badge&logo=socket.io&logoColor=white)](https://github.com/adelelawady/reelwatch-server)

<br/>

> ReelWatch lets you and your friends watch Instagram Reels at exactly the same time — fully synchronized, with live comments, remote control, and room management. No screen sharing, no lag, no compromise.

<br/>

![ReelWatch Demo](https://raw.githubusercontent.com/adelelawady/reelwatch/main/assets/demo.gif)

</div>

---

## ✨ Features

| Feature                | Description                                                          |
| ---------------------- | -------------------------------------------------------------------- |
| 🔄 **Real-time sync**  | Everyone in a room watches the same reel at the same moment          |
| 🎮 **Remote Control**  | Room owner can lock control so only they scroll — others follow      |
| 💬 **Live comments**   | Send messages that pop up as toasts on everyone's screen             |
| 🏠 **Room system**     | Create or join named rooms, see who's watching                       |
| 🔐 **Instagram login** | Uses your real Instagram session via embedded WebView                |
| 👥 **Users panel**     | See all room members, their roles, and transfer the remote           |
| 📱 **iOS + Android**   | Built with Expo — runs on both platforms                             |
| ⌨️ **Custom keyboard** | Built-in keyboard that never conflicts with video playback           |
| 🛠 **Dev panel**       | In-app injected JS debug panel for development                       |
| 🌙 **Dark UI**         | Fully dark, minimal interface that stays out of the way of the video |

---

## 🧠 How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                        ReelWatch App                         │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Entrance    │───▶│  Room Lobby  │───▶│  Reel Screen │  │
│  │  (IG Login)  │    │  (Join/Create│    │  (WebView +  │  │
│  │              │    │   Rooms)     │    │   Sync)      │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│           │                  │                   │           │
│           └──────────────────┴───────────────────┘           │
│                              │                               │
│                    WebSocket (useSync)                       │
└─────────────────────────────────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  ReelWatch Server   │
                    │  (Python WebSocket) │
                    └─────────────────────┘
```

1. **Login** — The app uses an embedded WebView pointed at Instagram. Your session is saved permanently after first login.
2. **Lobby** — Connect to the server via WebSocket, choose a display name, create or join a room.
3. **Watch** — A second WebView loads Instagram Reels. Injected JavaScript intercepts navigation events and video state, sending them to the server.
4. **Sync** — The server broadcasts reel URL changes to everyone in the room. Each client navigates their WebView to match.
5. **Comments** — Text typed on the custom keyboard is broadcast as comment toasts overlaid on the video.

---

## 🛠 Tech Stack

| Layer      | Technology                                        |
| ---------- | ------------------------------------------------- |
| Framework  | React Native + Expo SDK 51                        |
| Language   | TypeScript                                        |
| Navigation | Expo Router (file-based)                          |
| Real-time  | WebSocket (`ws://` / `wss://`)                    |
| WebView    | `react-native-webview`                            |
| Animations | React Native `Animated` API                       |
| Gradients  | `expo-linear-gradient`                            |
| State      | React hooks (`useState`, `useCallback`, `useRef`) |
| Build      | EAS Build (Expo Application Services)             |

---

## 📦 Installation

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g eas-cli`)
- A running [ReelWatch Server](https://github.com/adelelawady/reelwatch-server)

### Clone and install

```bash
git clone https://github.com/adelelawady/reelwatch.git
cd reelwatch
npm install
npx expo install
```

---

## ⚙️ Configuration

Edit `constants/config.ts`:

```typescript
export const CONFIG = {
  SERVER_IP: "your-server-ip-or-domain", // e.g. "192.168.1.100" or "ws.myapp.com"
  SERVER_PORT: 3001, // WebSocket server port
  START_URL: "https://www.instagram.com/reels/xxx/",
  LOGIN_URL: "https://www.instagram.com/accounts/login/",
  REQUIRE_LOGIN: true,

  // Development flags
  DEV_MODE: false, // true = skip login check, auto-join default room
  DEV_DEFAULT_ROOM: "room1", // room to auto-join in DEV_MODE
  DEV_USERNAME: "devuser",
} as const;
```

| Variable           | Description                           | Default         |
| ------------------ | ------------------------------------- | --------------- |
| `SERVER_IP`        | IP or domain of your WebSocket server | `"192.168.8.5"` |
| `SERVER_PORT`      | WebSocket server port                 | `3001`          |
| `DEV_MODE`         | Skip Instagram login for development  | `false`         |
| `DEV_DEFAULT_ROOM` | Auto-join this room in dev mode       | `"room1"`       |

---

## 🚀 Usage

### Development (local)

```bash
# Start Metro bundler
npx expo start --clear

# With tunnel (accessible from anywhere)
npx expo start --tunnel
```

Scan the QR code with **Expo Go** on your phone.

### Production build (Android APK)

```bash
# Configure EAS
eas build:configure

# Build APK
eas build --platform android --profile preview
```

Download the APK from the EAS dashboard and install directly on any Android device.

### iOS (via Expo Go)

Install **Expo Go** from the App Store, then scan the QR from `npx expo start --tunnel`.

---

## 📂 Project Structure

```
reelwatch/
├── app/
│   ├── _layout.tsx          # Root layout (StatusBar hidden)
│   ├── index.tsx            # Entry redirect → /entrance
│   ├── entrance.tsx         # Login check + room lobby
│   └── reel.tsx             # Main reel screen (orchestrator)
│
├── components/
│   ├── reel/
│   │   ├── TopBar.tsx       # Floating buttons: back, users, sticky, dev
│   │   ├── UsersPanel.tsx   # Slide-in users list + remote transfer
│   │   └── KeyboardBar.tsx  # Input bar + custom keyboard
│   ├── CustomKeyboard.tsx   # Custom on-screen keyboard
│   ├── ReelPlaceholder.tsx  # Loading shimmer animation
│   └── ToastLayer.tsx       # Floating comment toasts
│
├── hooks/
│   ├── useSync.ts           # WebSocket sync for reel screen
│   ├── useRooms.ts          # WebSocket room management for lobby
│   └── useToasts.ts         # Toast notification state
│
├── utils/
│   ├── injected.js          # JavaScript injected into Instagram WebView
│   └── authInjected.ts      # Auth check + logout scripts for WebView
│
├── constants/
│   └── config.ts            # App-wide configuration
│
├── assets/                  # Icons, splash screens
├── app.json                 # Expo configuration
└── eas.json                 # EAS Build configuration
```

---

## 🖼 Screenshots

| Screen                                                                                                    | Description                                                           |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| ![Login](https://raw.githubusercontent.com/adelelawady/reelwatch/main/assets/screenshots/1_login.png)     | **Login screen** — Instagram WebView with session persistence         |
| ![Lobby](https://raw.githubusercontent.com/adelelawady/reelwatch/main/assets/screenshots/2_lobby.png)     | **Room lobby** — Create or join rooms, see active users               |
| ![Reel](https://raw.githubusercontent.com/adelelawady/reelwatch/main/assets/screenshots/3_reel.png)       | **Reel screen** — Synchronized Instagram Reels with overlaid controls |
| ![Users](https://raw.githubusercontent.com/adelelawady/reelwatch/main/assets/screenshots/4_users.png)     | **Users panel** — Room members, owner badges, remote transfer         |
| ![Comment](https://raw.githubusercontent.com/adelelawady/reelwatch/main/assets/screenshots/5_comment.png) | **Live comments** — Toast notifications with sender names             |

---

## 🔌 WebSocket Protocol

The app communicates with the server using a simple JSON WebSocket protocol.

### Key messages sent by the app

```jsonc
// Register with a display name
{ "type": "register", "name": "Ahmed" }

// Create a room
{ "type": "create_room", "room": "movie-night", "remote_control": true }

// Join a room
{ "type": "join", "room": "movie-night" }

// Broadcast current reel URL
{ "type": "reel_url", "url": "https://instagram.com/reels/ABC123/" }

// Send a comment
{ "type": "comment", "text": "lol this is so good" }

// Transfer remote control
{ "type": "transfer_remote", "to": "Bob" }
```

> See the full protocol in [reelwatch-server](https://github.com/adelelawady/reelwatch-server#-websocket-protocol).

---

## 🧪 Development

### Enable dev mode

Set `DEV_MODE: true` in `constants/config.ts` to:

- Skip Instagram login check entirely
- Auto-join the default room on connect
- Use `DEV_USERNAME` as display name

### Enable injected JS dev panel

Tap the `🛠` button in the top-right corner of the reel screen to toggle the in-page debug panel. It shows:

- Active video state
- Audio mute status
- Overlay count
- Tap/mute/play/pause controls
- Full injection log

### Switch injected JS to dev mode

```javascript
// In browser console or via injectJavaScript:
window.__rwSetEnv("dev");
```

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

```bash
# Fork the repo, then:
git clone https://github.com/your-username/reelwatch.git
cd reelwatch
npm install

# Create a branch
git checkout -b feature/your-feature-name

# Make your changes, then
git commit -m "feat: add your feature"
git push origin feature/your-feature-name

# Open a Pull Request on GitHub
```

### Guidelines

- Use TypeScript for all new code
- Keep components small and single-purpose
- Do not commit `DEV_MODE: true` to production
- Test on both iOS and Android before submitting

---

## 📜 License

MIT © [Adel Elawady](https://github.com/adelelawady)

---

## ⭐ Support

If ReelWatch saved you from watching reels alone, give it a star!

[![GitHub stars](https://img.shields.io/github/stars/adelelawady/reelwatch?style=social)](https://github.com/adelelawady/reelwatch/stargazers)

---

<div align="center">
Made with ❤️ by <a href="https://github.com/adelelawady">Adel Elawady</a>
<br/>
<a href="https://github.com/adelelawady/reelwatch-server">🖥 View Server Repository →</a>
</div>

# Step 1 — build Android APK (free)

eas build --platform android --profile preview

# Step 2 — configure EAS Update

npx expo install expo-updates
eas update:configure

# Step 3 — push update

eas update --branch preview --message "first release"
