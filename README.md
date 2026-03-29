# Blap - Clipboard & File Transfer

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)

**Blap** is a peer-to-peer file and clipboard sharing web app. Transfer files and text directly between devices without uploading to the cloud.

## ✨ Features

- 🔒 **End-to-End Encrypted** - Direct P2P connection, no server storage
- 📱 **Cross-Platform** - Works on Desktop, iOS, Android via browser
- 📋 **Clipboard Sync** - Share text instantly between devices
- 📁 **Fast File Transfer** - Send large files (up to 100MB) with progress tracking
- 📷 **QR Code Pairing** - Easy device connection via QR scan

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/7sadakonr/Blap-Clipboard-and-File-Transfer-Web-App.git

# Navigate to project
cd Blap-Clipboard-and-File-Transfer-Web-App

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build for Production

```bash
npm run build
```

## 🔧 Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | React 18, Vite |
| Styling | Tailwind CSS |
| State | Zustand |
| P2P | PeerJS (WebRTC) |
| Routing | React Router v6 |

## 📖 How It Works

```
Device A                    Device B
   │                           │
   ├──── Signaling Server ─────┤
   │    (PeerJS Cloud)         │
   │                           │
   └═══════ Direct P2P ════════┘
         (No Cloud Storage)
```

1. **Connect** - Scan QR code or enter Peer ID
2. **Transfer** - Share clipboard or send files
3. **Done** - Data transferred directly, nothing stored

## 📁 Project Structure

```
src/
├── components/     # UI Components
├── hooks/          # Custom React Hooks
│   ├── usePeerConnection.js
│   ├── useFileTransfer.js
│   └── useClipboardSync.js
├── pages/          # Route Pages
│   ├── ConnectPage.jsx
│   └── TransferPage.jsx
├── stores/         # Zustand State
└── utils/          # Helper Functions
```

## 🌐 Deployment

Deploy to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/7sadakonr/Blap-Clipboard-and-File-Transfer-Web-App)

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

---

Made with ❤️ by [@7sadakonr](https://github.com/7sadakonr)
