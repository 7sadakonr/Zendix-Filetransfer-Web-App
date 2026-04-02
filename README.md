# Zendix - Clipboard & File Transfer

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)

**Zendix** is a peer-to-peer file and clipboard sharing web app. Transfer files and text directly between devices without uploading anything to the cloud.

## Features

- **End-to-End Encrypted** - Direct P2P connection with no server-side file storage
- **Cross-Platform** - Works on desktop, iOS, and Android in modern browsers
- **Clipboard Sync** - Share text instantly between connected devices
- **Fast File Transfer** - Send files up to 100MB with live progress feedback
- **QR Code Pairing** - Connect devices quickly with a QR code

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
git clone <your-zendix-repository-url>
cd zendix
npm install
npm run dev
```

### Build for Production

```bash
npm run build
```

## Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | React 18, Vite |
| Styling | Tailwind CSS |
| State | Zustand |
| P2P | PeerJS (WebRTC) |
| Routing | React Router |

## How It Works

1. **Connect** - Scan a QR code or enter a peer ID.
2. **Transfer** - Share clipboard content or send files directly.
3. **Done** - Data moves device-to-device without cloud storage.

## Project Structure

```text
src/
|-- components/
|-- hooks/
|-- pages/
|-- stores/
`-- utils/
```

## Deployment

Deploy Zendix to Vercel or any static hosting platform that supports the required WebRTC flow and HTTPS.

## License

MIT License - feel free to use this project for personal or commercial purposes.

Made by [@7sadakonr](https://github.com/7sadakonr)
