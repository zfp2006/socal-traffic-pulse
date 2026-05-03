'use client';
import { useState, useEffect } from 'react';
import * as d3 from 'd3';
import MapComponent from './MapComponent';
import ChartComponent from './ChartComponent';
import TreemapComponent from './TreemapComponent'; // Updated Import

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [activeMetric, setActiveMetric] = useState('congestion_intensity');
  const [selectedRoute, setSelectedRoute] = useState(null);

  useEffect(() => {
    d3.json('/REAL_LANES_SoCal_Pulse.geojson').then((geojsonData) => {
      setData(geojsonData);
    });
  }, []);

  if (!data) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="text-xl animate-pulse tracking-widest font-light">INITIALIZING SOCAL PULSE...</div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen p-4 bg-gray-950 text-white gap-4 overflow-hidden">
      
      {/* HEADER: Minimalist & Functional */}
      <header className="flex flex-col md:flex-row justify-between items-center bg-gray-900/50 p-4 rounded-xl border border-gray-800 shadow-2xl">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-black tracking-tighter text-white uppercase">SoCal Pulse</h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Freight & Traffic Intelligence</p>
          </div>
          
          {/* Active Selection Badge */}
          {selectedRoute && (
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-3 py-1 rounded-lg animate-in fade-in slide-in-from-left-4">
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              <span className="text-xs font-bold font-mono">ROUTE {selectedRoute}</span>
              <button 
                onClick={() => setSelectedRoute(null)}
                className="text-gray-500 hover:text-white transition-colors text-xs"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Metric Toggle */}
        <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
          <button 
            className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${
              activeMetric === 'congestion_intensity' 
              ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]' 
              : 'text-gray-500 hover:text-gray-300'
            }`}
            onClick={() => setActiveMetric('congestion_intensity')}
          >
            CONGESTION
          </button>
          <button 
            className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${
              activeMetric === 'freight_ratio' 
              ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' 
              : 'text-gray-500 hover:text-gray-300'
            }`}
            onClick={() => setActiveMetric('freight_ratio')}
          >
            FREIGHT
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col gap-4 min-h-0">
        
        {/* TOP ROW: Map and Chart (60% of remaining height) */}
        <div className="flex flex-col md:flex-row gap-4 h-[55%] min-h-0">
          <div className="flex-[2] bg-gray-900/40 rounded-2xl border border-white/5 relative overflow-hidden group shadow-inner">
            <MapComponent 
              data={data} 
              activeMetric={activeMetric} 
              selectedRoute={selectedRoute} 
              setSelectedRoute={setSelectedRoute} 
            />
            <div className="absolute top-4 left-4 pointer-events-none">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-black/60 px-2 py-1 rounded">Geospatial Distribution</span>
            </div>
          </div>
          
          <div className="flex-1 bg-gray-900/40 rounded-2xl border border-white/5 p-4 flex flex-col shadow-inner">
            <ChartComponent 
              data={data} 
              activeMetric={activeMetric} 
              selectedRoute={selectedRoute} 
              setSelectedRoute={setSelectedRoute} 
            />
          </div>
        </div>

        {/* BOTTOM ROW: The new Treemap (40% of remaining height) */}
        <div className="h-[40%] min-h-0 bg-gray-900/40 rounded-2xl border border-white/5 p-4 shadow-inner">
          <TreemapComponent 
            data={data} 
            activeMetric={activeMetric} 
            selectedRoute={selectedRoute} 
            setSelectedRoute={setSelectedRoute} 
          />
        </div>
      </main>

      <footer className="flex justify-between items-center px-2 text-[9px] text-gray-600 font-bold uppercase tracking-widest">
        <span>System Status: Optimal</span>
        <span>Data Refreshed: Real-Time GeoJSON Stream</span>
        <span>© 2024 Traffic Intelligence Lab</span>
      </footer>
    </div>
  );
}