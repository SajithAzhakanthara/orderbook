# Orderbook Depth 3D Visualizer

A Next.js application that displays a **real-time 3D surface graph** of cryptocurrency orderbook data with:
- Live updates via Binance WebSocket API.
- Venue and coin selection (BTC, ETH, SOL).
- 3D interactive rotation (drag to orbit).
- Control panel for filters, price range, and quantity thresholds.

---

## **Features**
- **Real-time 3D Visualization** of bids over time.
- **Interactive Rotation** using Plotly's `orbit` mode.
- **Venue Selection** (Binance, OKX, Bybit, Deribit).
- **Coin Filters** (BTC, ETH, SOL).
- **Time Range Selector** (1m, 5m, 15m, 1h).
- **Search Price Levels**.
- **Loader UI** for filter changes.

---

## **APIs Used**
- **Binance WebSocket Depth API**:  
  `wss://stream.binance.com:9443/ws/{symbol}@depth10@100ms`
- **OKX, Bybit, Deribit WebSocket APIs** for real-time orderbook.

---

## **Technical Decisions**
- **Next.js (JS)**: Chosen for SSR and React component structure.
- **Plotly.js**: Used for 3D surface rendering (instead of Three.js) because it offers built-in 3D plotting and interactivity.
- **WebSocket Hooks**: Implemented `useEffect` hooks to maintain live data streams.
- **Data Batching**: We store the last 20 frames of orderbook snapshots for the surface plot.

---

## **Assumptions**
- Users have **Node.js (>= 16)** installed.
- Only **top 10 bids** are visualized (as returned by Binance Depth API).
- Surface plot uses **price on X-axis**, **time on Y-axis**, **quantity on Z-axis**.

---

## **Local Setup**
```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
npm install
npm run dev
