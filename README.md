# What Trick Was That? 

> **Work in progress** — actively being developed. Expect bugs and missing features.

An AI-powered skateboarding trick analyzer built with React Native (Expo). Pick a clip from your camera roll, scrub to the exact frame of the trick, and get an instant AI breakdown.

## Features

- **Frame scrubber** — pick any frame from a video clip to analyze
- **AI trick identification** — powered by Groq's Llama 4 vision model
- **Style rating** — Sketchy / Decent / Clean / Textbook / Gnarly
- **Confidence level** — high / medium / low based on frame clarity
- **Trick history** — all analyzed clips saved locally with thumbnail, trick name, style, and date
- **Dark theme** throughout

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo (managed workflow) |
| Language | TypeScript |
| Navigation | React Navigation v7 (bottom tabs) |
| AI Vision | [Groq API](https://groq.com) — `meta-llama/llama-4-scout-17b-16e-instruct` |
| Frame extraction | `expo-video-thumbnails` + `expo-image-manipulator` |
| Storage | `@react-native-async-storage/async-storage` |
| Video picker | `expo-image-picker` |

## Setup

### 1. Clone and install

```bash
git clone https://github.com/DannyWright93/whattrickwasthat.git
cd whattrickwasthat
npm install
```

### 2. Add your Groq API key

Create a `.env` file in the project root:

```
EXPO_PUBLIC_GROQ_API_KEY=your_groq_api_key_here
```

Get a free API key at [console.groq.com/keys](https://console.groq.com/keys).

### 3. Run

```bash
npx expo start --clear
```

Scan the QR code with [Expo Go](https://expo.dev/go) on your iPhone or Android device.

> **Note:** Both your phone and Mac must be on the same Wi-Fi network.

## How It Works

1. Tap **Pick a Clip** and select a video from your camera roll
2. Use the **scrubber** to find the frame where the trick is most visible (peak of the jump, clearest board position, etc.)
3. Tap **Analyze This Frame** — the frame is resized to 768px, encoded as base64, and sent to Groq's vision API
4. The AI returns a structured JSON response with trick name, description, style rating, and confidence
5. The result is saved to local history with the thumbnail

## Project Structure

```
wtwt/
├── app/
│   ├── index.tsx          # Home screen — video picker + scrubber + result
│   └── history.tsx        # Trick history list
├── components/
│   ├── TrickResult.tsx    # AI result card with colored style badge
│   └── HistoryItem.tsx    # Single history row
├── services/
│   └── claudeVision.ts    # Frame extraction + Groq API call
└── storage/
    └── trickHistory.ts    # AsyncStorage wrapper
```

## Screenshots

> _Add your own screenshots here_

## Limitations

- Analyzes a single still frame — not full video motion
- Trick identification accuracy depends on frame clarity and board/foot visibility
- Some tricks (grabs, crooked grinds) require scrubbing to the right moment for best results
- Requires Expo Go or a custom dev build to run on device


