// app/components/ControlPanel.js
'use client';

import { TIME_RANGES } from './dataBuilders';

export default function ControlPanel({
  exchanges,
  exchange,
  setExchange,
  availableCoins,
  coin,
  setCoin,
  symbol,
  setSymbol,
  priceMin,
  setPriceMin,
  priceMax,
  setPriceMax,
  qtyMin,
  setQtyMin,
  timeRangeKey,
  setTimeRangeKey,
  mode,
  setMode,
  searchTerm,
  setSearchTerm,
  priceTick,
  setPriceTick,
  qtyTick,
  setQtyTick,
  maxFrames,
  setMaxFrames,
}) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: 12,
      marginBottom: 12,
      alignItems: 'end'
    }}>
      <div>
        <label>Venue</label>
        <select value={exchange} onChange={e => setExchange(e.target.value)} style={{ width: '100%' }}>
          {exchanges.map(e => (
            <option key={e.id} value={e.id}>{e.label}</option>
          ))}
        </select>
      </div>

      {/* <div>
        <label>Coin</label>
        <select value={coin} onChange={e => setCoin(e.target.value)} style={{ width: '100%' }}>
          {availableCoins.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div> */}

      <div>
        <label>Symbol</label>
        <input value={symbol} onChange={e => setSymbol(e.target.value)} style={{ width: '100%' }} />
      </div>

      <div>
        <label>Price Min</label>
        <input type="number" value={priceMin}
          onChange={e => setPriceMin(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder="min" style={{ width: '100%' }} />
      </div>

      <div>
        <label>Price Max</label>
        <input type="number" value={priceMax}
          onChange={e => setPriceMax(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder="max" style={{ width: '100%' }} />
      </div>

      <div>
        <label>Qty Min</label>
        <input type="number" value={qtyMin}
          onChange={e => setQtyMin(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder="0" style={{ width: '100%' }} />
      </div>

      <div>
        <label>Time Range</label>
        <select value={timeRangeKey} onChange={e => setTimeRangeKey(e.target.value)} style={{ width: '100%' }}>
          <option value="live">Live (no cut)</option>
          {Object.keys(TIME_RANGES).map(k => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
      </div>

      <div>
        <label>Mode</label>
        <select value={mode} onChange={e => setMode(e.target.value)} style={{ width: '100%' }}>
          <option value="realtime">Real-time (surface)</option>
          <option value="historical">Historical (surface)</option>
          <option value="pressure">Pressure zones (scatter3d)</option>
        </select>
      </div>

      <div>
        <label>Search (price or venue)</label>
        <input
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="e.g. 68000 / binance"
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label>Price Tick (bucket)</label>
        <input type="number" value={priceTick}
          onChange={e => setPriceTick(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder="1" style={{ width: '100%' }} />
      </div>

      <div>
        <label>Qty Tick (bucket)</label>
        <input type="number" value={qtyTick}
          onChange={e => setQtyTick(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder="0.1" style={{ width: '100%' }} />
      </div>

      <div>
        <label>Max Frames (rolling)</label>
        <input type="number" value={maxFrames}
          onChange={e => setMaxFrames(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder="600" style={{ width: '100%' }} />
      </div>
    </div>
  );
}
