'use client';
import { useState, useEffect } from 'react';
import * as d3 from 'd3';
import MapComponent from './MapComponent';
import ChartComponent from './ChartComponent';
import TreemapComponent from './TreemapComponent'; // NEW IMPORT

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [activeMetric, setActiveMetric] = useState('congestion_intensity');

  useEffect(() => {
    d3.json('/REAL_LANES_SoCal_Pulse.geojson').then((geojsonData) => {
      setData(geojsonData);
    });
  }, []);

  if (!data) return <div className="p-4 text-white">Loading SoCal Pulse Data...</div>;

  return (
    <div className="flex flex-col h-screen p-4 bg-gray-900 text-white overflow-hidden">
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">The Pulse of LA</h1>
        <div className="flex gap-2">
          <button 
            className={`px-4 py-2 rounded transition-colors ${activeMetric === 'congestion_intensity' ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'}`}
            onClick={() => setActiveMetric('congestion_intensity')}
          >
            Congestion
          </button>
          <button 
            className={`px-4 py-2 rounded transition-colors ${activeMetric === 'freight_ratio' ? 'bg-blue-500' : 'bg-gray-700 hover:bg-gray-600'}`}
            onClick={() => setActiveMetric('freight_ratio')}
          >
            Freight Flow
          </button>
        </div>
      </header>

      {/* Main Dashboard Grid */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        
        {/* Left Column: The Map (takes up 2/3 width) */}
        <div className="w-2/3 bg-gray-800 rounded-lg p-2 h-full relative">
          <MapComponent data={data} activeMetric={activeMetric} />
        </div>

        {/* Right Column: The Charts (takes up 1/3 width, stacked vertically) */}
        <div className="w-1/3 flex flex-col gap-4 h-full">
          
          <div className="flex-1 bg-gray-800 rounded-lg p-2 min-h-0">
            <ChartComponent data={data} activeMetric={activeMetric} />
          </div>

          <div className="flex-1 bg-gray-800 rounded-lg p-2 min-h-0">
            <TreemapComponent data={data} activeMetric={activeMetric} />
          </div>

        </div>
      </div>
    </div>
  );
}