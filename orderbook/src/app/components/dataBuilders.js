// app/components/dataBuilders.js

export const TIME_RANGES = {
  '1m': 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
};

export function bucket(value, tick) {
  if (!tick || tick <= 0) return value;
  return Math.round(value / tick) * tick;
}

export function filterAndBucketFrames(frames, {
  priceMin = -Infinity,
  priceMax = Infinity,
  qtyMin = 0,
  timeRange = null,
  mode = 'realtime',
  now = Date.now(),
  priceTick = 1,
  qtyTick = 0.1,
}) {
  if (!frames.length) return [];

  const startTs = timeRange ? now - timeRange : frames[0].ts;

  const filtered = frames
    .filter(f => f.ts >= startTs)
    .map(f => {
      const bucketed = new Map();
      for (const b of f.bids) {
        const p = bucket(b.price, priceTick);
        const q = bucket(b.qty, qtyTick);
        if (p < priceMin || p > priceMax || q < qtyMin) continue;
        const key = `${p}|${q}`;
        if (!bucketed.has(key)) bucketed.set(key, { price: p, qty: q });
      }
      return { ...f, bids: Array.from(bucketed.values()) };
    })
    .filter(f => f.bids.length > 0);

  return filtered;
}

export function buildSurfacePQTime(frames) {
  if (!frames.length) return { x: [], y: [], z: [], startTime: null };

  const startTime = frames[0].ts;
  const priceSet = new Set();
  const qtySet = new Set();

  for (const f of frames) {
    for (const b of f.bids) {
      priceSet.add(b.price);
      qtySet.add(b.qty);
    }
  }

  const x = Array.from(priceSet).sort((a, b) => a - b);
  const y = Array.from(qtySet).sort((a, b) => a - b);

  const reversed = [...frames].reverse();

  const z = y.map(qty =>
    x.map(price => {
      const lastFrame = reversed.find(frame =>
        frame.bids.some(b => b.price === price && b.qty === qty)
      );
      if (!lastFrame) return 0;
      return (lastFrame.ts - startTime) / 1000;
    })
  );

  return { x, y, z, startTime };
}

export function buildPressureScatter(frames) {
  if (!frames.length) return { xs: [], ys: [], zs: [], startTime: null };
  const startTime = frames[0].ts;

  const xs = [];
  const ys = [];
  const zs = [];

  for (const f of frames) {
    const t = (f.ts - startTime) / 1000;
    for (const b of f.bids) {
      xs.push(b.price);
      ys.push(b.qty);
      zs.push(t);
    }
  }

  return { xs, ys, zs, startTime };
}

export function buildSearchHighlight(frames, searchPrice) {
  if (searchPrice == null || !frames.length) return null;

  const startTime = frames[0].ts;
  const xs = [];
  const ys = [];
  const zs = [];

  frames.forEach(f => {
    const t = (f.ts - startTime) / 1000;
    f.bids.forEach(b => {
      if (b.price === searchPrice) {
        xs.push(b.price);
        ys.push(b.qty);
        zs.push(t);
      }
    });
  });

  if (!xs.length) return null;
  return { xs, ys, zs };
}
