'use client';
import { useState, useEffect } from 'react';
import * as d3 from 'd3';
import MapComponent from './MapComponent';
import ChartComponent from './ChartComponent';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [activeMetric, setActiveMetric] = useState('congestion_intensity'); // or 'freight_ratio'

  useEffect(() => {
    // Load the GeoJSON file from your Next.js public/ folder
    d3.json('/REAL_LANES_SoCal_Pulse.geojson').then((geojsonData) => {
      setData(geojsonData);
    });
  }, []);

  if (!data) return <div>Loading SoCal Pulse Data...</div>;

  return (
    <div className="flex flex-col h-screen p-4 bg-gray-900 text-white">
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">The Pulse of LA</h1>
        <div className="flex gap-2">
          <button 
            className={`px-4 py-2 rounded ${activeMetric === 'congestion_intensity' ? 'bg-red-500' : 'bg-gray-700'}`}
            onClick={() => setActiveMetric('congestion_intensity')}
          >
            Congestion
          </button>
          <button 
            className={`px-4 py-2 rounded ${activeMetric === 'freight_ratio' ? 'bg-blue-500' : 'bg-gray-700'}`}
            onClick={() => setActiveMetric('freight_ratio')}
          >
            Freight Flow
          </button>
        </div>
      </header>

      <div className="flex flex-1 gap-4">
        {/* Pass data and state to Leo and Zach's components */}
        <div className="w-2/3 bg-gray-800 rounded-lg p-2">
          <MapComponent data={data} activeMetric={activeMetric} />
        </div>
        <div className="w-1/3 bg-gray-800 rounded-lg p-2">
          <ChartComponent data={data} activeMetric={activeMetric} />
        </div>
      </div>
    </div>
  );
}