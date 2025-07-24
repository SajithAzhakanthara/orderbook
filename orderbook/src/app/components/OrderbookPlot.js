// app/components/OrderbookPlot.js
'use client';

import { useEffect, useRef } from 'react';
import { useRafThrottle } from './hooks';
const loadPlotly = () => import('plotly.js-dist-min');

export default function OrderbookPlot({ plotData, mode, titles }) {
  const divRef = useRef(null);
  const plotlyRef = useRef(null);
  const cameraRef = useRef(null);
  const isInteractingRef = useRef(false);

  // Create once
  useEffect(() => {
    let mounted = true;

    (async () => {
      const mod = await loadPlotly();
      const Plotly = mod.default ?? mod;
      if (!mounted || !divRef.current) return;

      plotlyRef.current = Plotly;

      const { traces, layout } = makePlotConfig(mode, titles, plotData, cameraRef.current);

      await Plotly.newPlot(divRef.current, traces, layout, { responsive: true });

      divRef.current.on('plotly_relayout', (e) => {
        if (e['scene.camera']) cameraRef.current = e['scene.camera'];
        isInteractingRef.current = false;
      });

      divRef.current.on('plotly_relayouting', () => {
        isInteractingRef.current = true;
      });

      const onResize = () => Plotly.Plots.resize(divRef.current);
      window.addEventListener('resize', onResize);
      return () => {
        window.removeEventListener('resize', onResize);
        Plotly.purge(divRef.current);
      };
    })();

    return () => { mounted = false; };
  }, []);

  const throttledReact = useRafThrottle(() => {
    const Plotly = plotlyRef.current;
    const el = divRef.current;
    if (!Plotly || !el) return;
    if (isInteractingRef.current) return;

    const { traces, layout } = makePlotConfig(mode, titles, plotData, cameraRef.current);
    Plotly.react(el, traces, layout, { responsive: true });
  });

  useEffect(() => {
    throttledReact();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plotData, mode, titles]);

  return <div ref={divRef} style={{ width: '100%', height: 600 }} />;
}

function makePlotConfig(mode, titles, plotData, camera) {
  const layout = {
    title: titles?.title || '',
    scene: {
      xaxis: { title: titles?.x || 'Price' },
      yaxis: { title: titles?.y || 'Quantity' },
      zaxis: { title: titles?.z || 'Time (s since start)' },
      dragmode: 'orbit',
      camera: camera || undefined,
    },
    autosize: true,
    margin: { l: 0, r: 0, b: 0, t: 40 }
  };

  let traces = [];
  if (mode === 'pressure') {
    const { xs = [], ys = [], zs = [], search, searchPrice } = plotData || {};
    traces.push({
      type: 'scatter3d',
      mode: 'markers',
      x: xs,
      y: ys,
      z: zs,
      marker: { size: 3, opacity: 0.6 },
      name: 'Pressure points'
    });

    if (search && search.xs?.length) {
      traces.push({
        type: 'scatter3d',
        mode: 'markers',
        x: search.xs,
        y: search.ys,
        z: search.zs,
        marker: { size: 5, opacity: 0.9, symbol: 'diamond' },
        name: `Search: ${searchPrice}`
      });
    }

  } else {
    const { x = [], y = [], z = [], search, searchPrice } = plotData || {};
    traces.push({
      type: 'surface',
      x,
      y,
      z,
      colorscale: 'Viridis',
      name: 'Surface'
    });

    if (search && search.xs?.length) {
      traces.push({
        type: 'scatter3d',
        mode: 'markers',
        x: search.xs,
        y: search.ys,
        z: search.zs,
        marker: { size: 5, opacity: 0.9, symbol: 'diamond' },
        name: `Search: ${searchPrice}`
      });
    }
  }

  return { traces, layout };
}
