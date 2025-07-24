// app/components/LiveOrderbook3D.js
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import ControlPanel from './ControlPanel';
import OrderbookPlot from './OrderbookPlot';
import useSetRealVH from './useSetRealVH';


import {
  EXCHANGES,
  COINS,
  getDefaultSymbol,
  openSocketForExchange
} from './exchanges';

import {
  TIME_RANGES,
  filterAndBucketFrames,
  buildSurfacePQTime,
  buildPressureScatter,
  buildSearchHighlight,
} from './dataBuilders';

import { useDebouncedValue } from './hooks';

const DEFAULT_MAX_FRAMES = 60 * 10;

export default function LiveOrderbook3D() {
  useSetRealVH();
  // Controls
  const [exchange, setExchange] = useState(EXCHANGES[0].id);
  const [coin, setCoin]         = useState(COINS[0]);
  const [symbol, setSymbol]     = useState(() => getDefaultSymbol(EXCHANGES[0].id, COINS[0]) || 'BTCUSDT');

  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [qtyMin, setQtyMin]     = useState(0);
  const [timeRangeKey, setTimeRangeKey] = useState('live');
  const [mode, setMode] = useState('realtime');
  const [searchTerm, setSearchTerm] = useState('');

  const [priceTick, setPriceTick] = useState(1);
  const [qtyTick, setQtyTick]     = useState(0.1);
  const [maxFrames, setMaxFrames] = useState(DEFAULT_MAX_FRAMES);

  // Debounced
  const dPriceMin      = useDebouncedValue(priceMin, 250);
  const dPriceMax      = useDebouncedValue(priceMax, 250);
  const dQtyMin        = useDebouncedValue(qtyMin, 250);
  const dTimeRangeKey  = useDebouncedValue(timeRangeKey, 250);
  const dMode          = useDebouncedValue(mode, 250);
  const dSearchTerm    = useDebouncedValue(searchTerm, 250);
  const dPriceTick     = useDebouncedValue(priceTick, 250);
  const dQtyTick       = useDebouncedValue(qtyTick, 250);
  const dMaxFrames     = useDebouncedValue(maxFrames, 250);

  const [frames, setFrames] = useState([]);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef(null);

  const availableCoins = useMemo(() => {
    const ex = EXCHANGES.find(e => e.id === exchange);
    return ex ? Object.keys(ex.symbols || {}) : [];
  }, [exchange]);

  // auto-map symbol when exchange/coin changes
  useEffect(() => {
    const newSymbol = getDefaultSymbol(exchange, coin);
    if (!newSymbol) {
      console.warn(`No symbol for ${exchange} / ${coin}. Falling back.`);
      const fallbackCoin = availableCoins[0];
      const fallback = getDefaultSymbol(exchange, fallbackCoin);
      if (fallback && fallback !== symbol) setSymbol(fallback);
      return;
    }
    if (newSymbol !== symbol) setSymbol(newSymbol);
  }, [exchange, coin, symbol, availableCoins]);

  // open / close WS
  useEffect(() => {
    setLoading(true);

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setFrames([]);

    if (dMode === 'historical') {
      const t = setTimeout(() => setLoading(false), 400);
      return () => clearTimeout(t);
    }

    if (!symbol) {
      console.warn('Empty symbol — skipping WS connect');
      setLoading(false);
      return;
    }

    console.log('Connecting WS', { exchange, symbol });
    const { close } = openSocketForExchange(exchange, symbol, (frame) => {
      setFrames(prev => {
        const next = [...prev, frame];
        const limited = dMaxFrames ? next.slice(-Number(dMaxFrames)) : next;
        if (limited.length === 1) setLoading(false);
        return limited;
      });
    });

    wsRef.current = { close };

    return () => close?.();
  }, [exchange, symbol, dMode, dMaxFrames]);

  const now = Date.now();
  const timeRangeMs = dTimeRangeKey === 'live' ? null : TIME_RANGES[dTimeRangeKey];

  const filtered = useMemo(() => {
    return filterAndBucketFrames(frames, {
      priceMin: dPriceMin === '' ? -Infinity : Number(dPriceMin),
      priceMax: dPriceMax === '' ? Infinity : Number(dPriceMax),
      qtyMin:   dQtyMin === ''   ? 0        : Number(dQtyMin),
      timeRange: (dMode === 'historical' || dTimeRangeKey !== 'live') ? timeRangeMs : null,
      mode: dMode,
      now,
      priceTick: dPriceTick === '' ? 1   : Number(dPriceTick),
      qtyTick:   dQtyTick === ''   ? 0.1 : Number(dQtyTick),
    });
  }, [frames, dPriceMin, dPriceMax, dQtyMin, dTimeRangeKey, timeRangeMs, dMode, now, dPriceTick, dQtyTick]);

  const plotData = useMemo(() => {
    const numericSearchPrice = Number(dSearchTerm);
    const isPriceSearch = !Number.isNaN(numericSearchPrice) && dSearchTerm !== '';
    const venueSearch = !isPriceSearch && dSearchTerm.trim() !== '' ? dSearchTerm.trim().toLowerCase() : null;

    const filteredByVenue = venueSearch
      ? filtered.filter(f => (f.venue || '').toLowerCase().includes(venueSearch))
      : filtered;

    if (!filteredByVenue.length) return {};

    if (dMode === 'pressure') {
      const { xs, ys, zs } = buildPressureScatter(filteredByVenue);
      const search = isPriceSearch ? buildSearchHighlight(filteredByVenue, numericSearchPrice) : null;
      return { xs, ys, zs, search, searchPrice: isPriceSearch ? numericSearchPrice : null };
    } else {
      const { x, y, z } = buildSurfacePQTime(filteredByVenue);
      const search = isPriceSearch ? buildSearchHighlight(filteredByVenue, numericSearchPrice) : null;
      return { x, y, z, search, searchPrice: isPriceSearch ? numericSearchPrice : null };
    }
  }, [filtered, dMode, dSearchTerm]);

  useEffect(() => {
    setLoading(true);
    const id = setTimeout(() => setLoading(false), 120);
    return () => clearTimeout(id);
  }, [dPriceMin, dPriceMax, dQtyMin, dTimeRangeKey, dMode, dSearchTerm, dPriceTick, dQtyTick, dMaxFrames]);

  const titles = useMemo(() => ({
    title: `Orderbook (${exchange} • ${symbol || '—'}) — ${dMode}`,
    x: 'Price',
    y: 'Quantity',
    z: 'Time (s since start)'
  }), [exchange, symbol, dMode]);

  return (
    <div style={{ position: 'relative', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <ControlPanel
        exchanges={EXCHANGES}
        exchange={exchange}       setExchange={setExchange}
        availableCoins={availableCoins}
        coin={coin}               setCoin={setCoin}
        symbol={symbol}           setSymbol={setSymbol}
        priceMin={priceMin}       setPriceMin={setPriceMin}
        priceMax={priceMax}       setPriceMax={setPriceMax}
        qtyMin={qtyMin}           setQtyMin={setQtyMin}
        timeRangeKey={timeRangeKey} setTimeRangeKey={setTimeRangeKey}
        mode={mode}               setMode={setMode}
        searchTerm={searchTerm}   setSearchTerm={setSearchTerm}
        priceTick={priceTick}     setPriceTick={setPriceTick}
        qtyTick={qtyTick}         setQtyTick={setQtyTick}
        maxFrames={maxFrames}     setMaxFrames={setMaxFrames}
      />

      {loading && (
        <div className="loader-overlay">
          <div className="spinner"></div>
        </div>
      )}

      {filtered.length === 0
        ? <div style={{ padding: 20 }}>No data (adjust filters, wait for live data, or switch mode).</div>
        : <OrderbookPlot plotData={plotData} mode={dMode} titles={titles} />
      }
    </div>
  );
}
