// app/components/exchanges.js

/***********************
 * Exchange definitions
 ***********************/
export const EXCHANGES = [
  {
    id: 'binance',
    label: 'Binance',
    symbols: {
      BTC: 'BTCUSDT',
      ETH: 'ETHUSDT',
      SOL: 'SOLUSDT',
    },
  },
  {
    id: 'okx',
    label: 'OKX',
    symbols: {
      BTC: 'BTC-USDT',
      ETH: 'ETH-USDT',
      SOL: 'SOL-USDT',
    },
  },
  {
    id: 'bybit',
    label: 'Bybit',
    symbols: {
      BTC: 'BTCUSDT',
      ETH: 'ETHUSDT',
      SOL: 'SOLUSDT',
    },
  },
  {
    id: 'deribit',
    label: 'Deribit',
    symbols: {
      BTC: 'BTC-PERPETUAL',
      ETH: 'ETH-PERPETUAL',
      // SOL intentionally omitted
    },
  },
];

export const COINS = Array.from(
  new Set(EXCHANGES.flatMap(e => Object.keys(e.symbols || {})))
);

export function getDefaultSymbol(exchangeId, coin) {
  const ex = EXCHANGES.find(e => e.id === exchangeId);
  if (!ex) return null;
  const byCoin = ex.symbols?.[coin];
  if (byCoin) return byCoin;
  const first = Object.values(ex.symbols || {}).find(Boolean);
  return first || null;
}

export function getAvailableCoins(exchangeId) {
  const ex = EXCHANGES.find(e => e.id === exchangeId);
  return ex ? Object.keys(ex.symbols || {}) : [];
}

/***********************
 * Public WS opener
 ***********************/
export function openSocketForExchange(exchange, symbol, onFrame) {
  switch (exchange) {
    case 'binance': return openBinance(symbol, onFrame);
    case 'okx':     return openOKX(symbol, onFrame);
    case 'bybit':   return openBybit(symbol, onFrame);
    case 'deribit': return openDeribit(symbol, onFrame);
    default:
      console.error('Unknown exchange', exchange);
      return { close() {} };
  }
}

/***********************
 * Resilient WS helper
 ***********************/
let GLOBAL_CONN_ID = 0;

/**
 * Make a resilient WebSocket:
 * - retries with backoff on error/close (unless intentionally closed)
 * - logs code/reason on close
 */
function makeResilientWS({ makeUrl, label, onOpen, onMessage }) {
  let ws = null;
  let retry = 0;
  let stopped = false;     // external close requested
  let closing = false;     // we are intentionally closing this ws
  const connId = ++GLOBAL_CONN_ID;

  const connect = () => {
    if (stopped) return;
    const url = makeUrl();
    if (!url) {
      console.error(`[${label}#${connId}] empty URL`);
      return;
    }

    try {
      ws = new WebSocket(url);
    } catch (err) {
      console.error(`[${label}#${connId}] WS ctor error`, err);
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      retry = 0;
      closing = false;
      console.debug(`[${label}#${connId}] open ${url}`);
      if (onOpen) {
        try { onOpen(ws); } catch (e) { console.error(`[${label}#${connId}] onOpen error`, e); }
      }
    };

    ws.onmessage = (event) => {
      if (stopped || closing) return; // ignore late messages
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        onMessage(data);
      } catch (e) {
        console.error(`[${label}#${connId}] parse error`, e);
      }
    };

    ws.onerror = (err) => {
      if (!closing && !stopped) {
        console.debug(`[${label}#${connId}] WS error`, err);
      }
    };

    ws.onclose = (e) => {
      const info = { code: e.code, reason: e.reason, wasClean: e.wasClean };
      if (closing || stopped) {
        console.debug(`[${label}#${connId}] closed intentionally`, info);
        return;
      }
      console.warn(`[${label}#${connId}] closed unexpectedly`, info);
      scheduleReconnect();
    };
  };

  const scheduleReconnect = () => {
    if (stopped) return;
    retry += 1;
    const delay = Math.min(30000, 1000 * Math.pow(2, retry)); // 1s -> 2s -> 4s ... 30s
    setTimeout(() => {
      if (!stopped) connect();
    }, delay);
  };

  connect();

  return {
    close: () => {
      stopped = true;
      try {
        if (ws && ws.readyState === WebSocket.OPEN) {
          closing = true;
          ws.close(1000, 'client close');
        } else if (ws) {
          closing = true;
          try { ws.close(); } catch (_) {}
        }
      } catch (_) {}
    }
  };
}

/***********************
 * Per-exchange impls
 ***********************/

function openBinance(symbol, onFrame) {
  const label = 'Binance';
  if (!symbol) {
    console.error(`[${label}] empty symbol`);
    return { close() {} };
  }

  // Ensure lowercase, strip separators so ETH/ETH-USDT/etc work -> ethusdt
  const cleanSymbol = symbol.replace(/[-_]/g, '').toLowerCase();
  const depth = 10;
  const makeUrl = () => `wss://stream.binance.com:9443/ws/${cleanSymbol}@depth${depth}@100ms`;

  console.debug(`[${label}] subscribing to: ${cleanSymbol}`);

  return makeResilientWS({
    makeUrl,
    label,
    onOpen: null,
    onMessage: (d) => {
      const ts = Date.now();
      const bids = (d?.bids || []).map(([p, q]) => ({
        price: parseFloat(p),
        qty: parseFloat(q),
      }));
      if (bids.length) onFrame({ ts, bids, venue: 'binance' });
    },
  });
}

function openOKX(instId, onFrame) {
  const label = 'OKX';
  if (!instId) {
    console.error(`[${label}] empty instId`);
    return { close() {} };
  }

  const makeUrl = () => 'wss://ws.okx.com:8443/ws/v5/public';

  return makeResilientWS({
    makeUrl,
    label,
    onOpen: (ws) => {
      const msg = { op: 'subscribe', args: [{ channel: 'books5', instId }] };
      ws.send(JSON.stringify(msg));
    },
    onMessage: (d) => {
      if (!d?.data || !d.data[0]) return;
      const book = d.data[0];
      const ts = Number(book.ts) || Date.now();
      const bids = (book.bids || []).map(([p, q]) => ({ price: parseFloat(p), qty: parseFloat(q) }));
      if (bids.length) onFrame({ ts, bids, venue: 'okx' });
    }
  });
}

function openBybit(symbol, onFrame) {
  const label = 'Bybit';
  if (!symbol) {
    console.error(`[${label}] empty symbol`);
    return { close() {} };
  }

  // Spot public stream; switch if you need linear/perp
  const makeUrl = () => 'wss://stream.bybit.com/v5/public/spot';
  const depth = 50;
  const topic = `orderbook.${depth}.${symbol.toUpperCase()}`;

  return makeResilientWS({
    makeUrl,
    label,
    onOpen: (ws) => {
      ws.send(JSON.stringify({ op: 'subscribe', args: [topic] }));
    },
    onMessage: (d) => {
      if (!d?.data) return;
      const ts = d.data?.ts || Date.now();
      const bids = (d.data.b || []).map(([p, q]) => ({ price: parseFloat(p), qty: parseFloat(q) }));
      if (bids.length) onFrame({ ts, bids, venue: 'bybit' });
    }
  });
}

function openDeribit(instrument, onFrame) {
  const label = 'Deribit';
  if (!instrument) {
    console.error(`[${label}] empty instrument`);
    return { close() {} };
  }

  const makeUrl = () => 'wss://www.deribit.com/ws/api/v2';

  return makeResilientWS({
    makeUrl,
    label,
    onOpen: (ws) => {
      const msg = {
        jsonrpc: '2.0',
        id: 42,
        method: 'public/subscribe',
        params: { channels: [`book.${instrument}.none.20.100ms`] }
      };
      ws.send(JSON.stringify(msg));
    },
    onMessage: (d) => {
      if (!d?.params?.data) return;
      const payload = d.params.data;
      const ts = payload.timestamp || Date.now();

      const bids = (payload.bids || []).map(b => {
        if (Array.isArray(b)) return { price: parseFloat(b[0]), qty: parseFloat(b[1]) };
        return { price: parseFloat(b.price), qty: parseFloat(b.amount) };
      });

      if (bids.length) onFrame({ ts, bids, venue: 'deribit' });
    }
  });
}
