<div align="center">

# Zendix

### Peer-to-Peer Clipboard and File Transfer

Transfer text, files, and folders directly between browsers without storing transfer content in cloud storage.

[![Live Demo](https://img.shields.io/badge/Live_Demo-8B5CF6?style=for-the-badge&logo=vercel&logoColor=white)](https://zendix-file.vercel.app/)
[![React](https://img.shields.io/badge/React_18-61DAFB?style=for-the-badge&logo=react&logoColor=111827)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite_5-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)

</div>

---

## Overview

**Zendix** is a browser-based peer-to-peer transfer application. Devices connect through PeerJS and WebRTC data channels, while clipboard text and file data move directly between connected peers.

The application does not upload transferred clipboard content or files to application storage. PeerJS infrastructure is used for peer discovery and connection signaling, while the transfer itself uses WebRTC.

---

## Features

- Direct peer-to-peer clipboard sharing
- Chunked file and folder transfer through WebRTC data channels
- Multiple-file transfer queue
- Live transfer progress, speed, and estimated remaining time
- Transfer cancellation and connection-loss handling
- QR-code generation and scanning for device pairing
- Peer-ID connection flow
- Installable Progressive Web App with automatic service-worker updates
- Web Share Target support for shared text and URLs
- Transfer start and completion sounds
- Responsive interface with animated interactions
- Vercel Analytics and Speed Insights

No fixed 100 MB file-size limit is enforced by the current application code. Practical limits depend on the browsers, devices, memory, and network connection involved.

---

## Verified Technology Stack

| Category | Technology | Current Usage |
|---|---|---|
| UI | React 18.2 | Components and application interface |
| Build Tool | Vite 5 | Development server and production builds |
| Language | JavaScript and JSX | Application logic and components |
| Styling | Tailwind CSS 3.4 and custom CSS | Responsive interface and visual styling |
| Routing | React Router 7.11 | Client-side application routing |
| P2P Connection | PeerJS 1.5.2 | Peer discovery, signaling, and WebRTC connections |
| Data Transfer | WebRTC DataChannel | Direct clipboard, file, and folder transfer |
| State Management | Zustand 4.4.7 | Connections, transfers, and application state |
| Animation | Framer Motion 12 | Interface transitions and motion |
| QR Generation | qrcode.react 3.1 | Pairing QR-code generation |
| QR Scanning | html5-qrcode 2.3.8 and jsQR 1.4 | Camera and image-based QR scanning |
| Clipboard | Clipboard API and clipboard-polyfill | Reading and writing clipboard content |
| PWA | vite-plugin-pwa 1.3 | Manifest, service worker, offline shell, and installation |
| Testing | Vitest 4.1.6 and jsdom | Automated test environment |
| Monitoring | Vercel Analytics and Speed Insights | Usage and performance measurements |
| Deployment | Vercel | Production hosting |

---

## Transfer Flow

1. One device creates a PeerJS identity.
2. A second device connects by scanning the QR code or entering the peer ID.
3. PeerJS establishes the WebRTC connection.
4. Clipboard messages and chunked file data travel through the WebRTC data channel.
5. Zendix rebuilds received files in the browser and reports transfer progress.

---

## Installation

### Prerequisites

- Node.js 18 or newer
- npm
- A modern browser with WebRTC support

### Setup

```bash
git clone https://github.com/7sadakonr/Zendix-Filetransfer-Web-App.git
cd Zendix-Filetransfer-Web-App
npm install
npm run dev
```

The development server uses HTTPS because browser features such as clipboard access, camera-based QR scanning, service workers, and PWA installation require a secure context.

---

## Available Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite HTTPS development server on the local network |
| `npm run build` | Create a production build |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Vitest test suite |

---

## Project Structure

```text
src/
├── components/    # Reusable interface components
├── hooks/         # Peer connection, clipboard, and file-transfer logic
├── pages/         # Application routes
├── stores/        # Zustand application state
├── utils/         # File chunking, QR, clipboard, and sound utilities
├── index.css      # Tailwind and custom styles
└── main.jsx       # Application entry point
```

---

## License

Licensed under the MIT License.

Developed by [@7sadakonr](https://github.com/7sadakonr)
