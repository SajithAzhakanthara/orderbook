// app/components/OrderbookPlot.js
'use client';

import { useEffect, useRef } from 'react';
import { useRafThrottle } from './hooks';
const loadPlotly = () => import('plotly.js-dist-min');

export default function OrderbookPlot({
  plotData,
  mode,
  titles,
  height = 600,
  hideModeBarOnMobile = true,
}) {
  const divRef = useRef(null);
  const plotlyRef = useRef(null);
  const cameraRef = useRef(null);
  const isInteractingRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const mod = await loadPlotly();
      const Plotly = mod.default ?? mod;
      if (!mounted || !divRef.current) return;

      plotlyRef.current = Plotly;

      const { traces, layout } = makePlotConfig(mode, titles, plotData, cameraRef.current, height);
      await Plotly.newPlot(divRef.current, traces, layout, {
        responsive: true,
        scrollZoom: true,
        doubleClick: 'reset',
        displaylogo: false,
        modeBarButtonsToRemove: hideModeBarOnMobile ? ['toImage', 'toggleSpikelines'] : [],
      });

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const throttledReact = useRafThrottle(() => {
    const Plotly = plotlyRef.current;
    const el = divRef.current;
    if (!Plotly || !el) return;
    if (isInteractingRef.current) return;

    const { traces, layout } = makePlotConfig(mode, titles, plotData, cameraRef.current, height);
    Plotly.react(el, traces, layout, {
      responsive: true,
      scrollZoom: true,
      displaylogo: false,
    });
  });

  useEffect(() => {
    throttledReact();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plotData, mode, titles, height]);

  return <div ref={divRef} style={{ width: '100%', height }} />;
}

/* ----------------------------
   Helpers
----------------------------- */
function makePlotConfig(mode, titles, plotData, camera, height) {
  const sceneTitles = {
    x: titles?.x || 'Price',
    y: titles?.y || 'Quantity',
    z: titles?.z || 'Time (s since start)',
  };

  const layout = {
    title: titles?.title || '3D Orderbook Visualization',
    scene: {
      xaxis: { title: sceneTitles.x },
      yaxis: { title: sceneTitles.y },
      zaxis: { title: sceneTitles.z },
      dragmode: 'orbit',
      camera: camera || undefined,
      aspectmode: 'cube',
    },
    autosize: true,
    height,
    margin: { l: 0, r: 0, b: 0, t: 40 },
    showlegend: true,
    legend: {
      x: 0.02,
      y: 0.98,
      bgcolor: 'rgba(255,255,255,0.6)',
      bordercolor: '#ccc',
      borderwidth: 1,
      font: { size: 12 },
    },
  };

  const traces = buildTraces(mode, plotData, sceneTitles);
  return { traces, layout };
}

function buildTraces(mode, plotData, sceneTitles) {
  const traces = [];

  // Add axis descriptions as dummy legend entries
  traces.push({
    type: 'scatter3d',
    x: [null],
    y: [null],
    z: [null],
    mode: 'markers',
    marker: { size: 0 },
    name: `X-Axis: ${sceneTitles.x}`,
    showlegend: true,
    hoverinfo: 'skip',
  });
  traces.push({
    type: 'scatter3d',
    x: [null],
    y: [null],
    z: [null],
    mode: 'markers',
    marker: { size: 0 },
    name: `Y-Axis: ${sceneTitles.y}`,
    showlegend: true,
    hoverinfo: 'skip',
  });
  traces.push({
    type: 'scatter3d',
    x: [null],
    y: [null],
    z: [null],
    mode: 'markers',
    marker: { size: 0 },
    name: `Z-Axis: ${sceneTitles.z}`,
    showlegend: true,
    hoverinfo: 'skip',
  });

  // Color meaning
  traces.push({
    type: 'scatter3d',
    x: [null],
    y: [null],
    z: [null],
    mode: 'markers',
    marker: { size: 6, color: 'green' },
    name: 'Low Quantity (Green)',
    showlegend: true,
    hoverinfo: 'skip',
  });
  traces.push({
    type: 'scatter3d',
    x: [null],
    y: [null],
    z: [null],
    mode: 'markers',
    marker: { size: 6, color: 'red' },
    name: 'High Quantity (Red)',
    showlegend: true,
    hoverinfo: 'skip',
  });

  // Add data traces
  if (mode === 'pressure') {
    const { xs = [], ys = [], zs = [] } = plotData || {};
    traces.push({
      type: 'scatter3d',
      mode: 'markers',
      x: xs,
      y: ys,
      z: zs,
      marker: { size: 3, opacity: 0.6, color: 'green' },
      name: 'Pressure Points',
      showlegend: true,
    });
  } else {
    const { x = [], y = [], z = [] } = plotData || {};
    traces.push({
      type: 'surface',
      x,
      y,
      z,
      colorscale: [
        [0, 'green'],
        [1, 'red'],
      ],
      name: 'Orderbook Surface',
      showscale: true,
      showlegend: true,
    });
  }

  return traces;
}
