'use client';
import { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

export default function MapComponent({ data, activeMetric, selectedRoute, setSelectedRoute }) {
  const svgRef = useRef();
  const [basemap, setBasemap] = useState(null);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: null });

  const soCalCounties = ['Los Angeles', 'Orange', 'San Diego', 'Imperial', 'Riverside', 'San Bernardino', 'Ventura', 'Santa Barbara'];

  // 1. Fetch Basemap (California Counties)
  useEffect(() => {
    d3.json('https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/california-counties.geojson')
      .then(geoData => {
        const filtered = geoData.features.filter(feature => 
          soCalCounties.includes(feature.properties.name)
        );
        setBasemap({ type: 'FeatureCollection', features: filtered });
      })
      .catch(err => console.error("Could not load basemap:", err));
  }, []);

  // 2. Main Drawing Logic
  useEffect(() => {
    if (!data || !basemap || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clean slate

    // Get actual pixel dimensions of the container
    const container = svgRef.current.getBoundingClientRect();
    const width = container.width || 800;
    const height = container.height || 600;

    const mapGroup = svg.append('g').attr('class', 'map-group');

    // Create a projection that fits our Southern California counties
    const projection = d3.geoMercator().fitSize([width, height], basemap);
    const pathGenerator = d3.geoPath().projection(projection);

    const metricValues = data.features.map(d => d.properties[activeMetric]).filter(v => v != null);
    const colorScale = d3.scaleSequential(
    activeMetric === 'congestion_intensity' ? d3.interpolateYlOrRd : d3.interpolateBlues
  ).domain([0, d3.quantile(metricValues.sort(d3.ascending), 0.95) || 1])
   .clamp(true);

// Draw Counties
  mapGroup.append('g')
    .selectAll('path')
    .data(basemap.features)
    .join('path')
    .attr('d', pathGenerator)
    .attr('fill', '#1f2937')
    .attr('stroke', '#374151');

  // Draw Freeway Lines with colors applied immediately
  mapGroup.append('g')
    .selectAll('path')
    .data(data.features)
    .join('path')
    .attr('class', 'route-line')
    .attr('d', pathGenerator)
    .attr('fill', 'none')
    .attr('stroke', d => colorScale(d.properties[activeMetric])) // <--- FIXED: Colors applied here
    .attr('stroke-width', 2.5)
    .attr('stroke-linecap', 'round')
    .attr('opacity', 1) // Ensure they start fully visible
    .attr('cursor', 'pointer')
    .on('mousemove', (event, d) => setTooltip({ visible: true, x: event.clientX, y: event.clientY, content: d.properties }))
    .on('mouseleave', () => setTooltip(prev => ({ ...prev, visible: false })))
    .on('click', (event, d) => setSelectedRoute(prev => prev === d.properties.RTE_str ? null : d.properties.RTE_str));

  // Zoom Logic
  const zoom = d3.zoom().scaleExtent([1, 10]).on('zoom', (e) => mapGroup.attr('transform', e.transform));
  svg.call(zoom);

}, [data, basemap, activeMetric]);

  // 3. Highlight and Color Effect (Updates existing elements)
  useEffect(() => {
    if (!data || !basemap) return;

    const svg = d3.select(svgRef.current);
    const metricValues = data.features.map(d => d.properties[activeMetric]).filter(v => v != null);
    
    // Set color scale based on the metric
    const colorScale = d3.scaleSequential(
      activeMetric === 'congestion_intensity' ? d3.interpolateYlOrRd : d3.interpolateBlues
    ).domain([0, d3.quantile(metricValues.sort(d3.ascending), 0.95) || 1])
     .clamp(true);

    svg.selectAll('.route-line')
      .transition()
      .duration(400)
      .attr('stroke', d => colorScale(d.properties[activeMetric]))
      .attr('opacity', d => !selectedRoute || d.properties.RTE_str === selectedRoute ? 1 : 0.15)
      .attr('stroke-width', d => d.properties.RTE_str === selectedRoute ? 6 : 2.5);

  }, [activeMetric, selectedRoute, data]);

  return (
    <div className="w-full h-full relative bg-gray-900 rounded-xl overflow-hidden border border-gray-700">
      <svg ref={svgRef} className="w-full h-full block" />
      
      {tooltip.visible && (
        <div 
          className="fixed z-50 bg-gray-800 border border-gray-600 text-white p-2 rounded shadow-lg pointer-events-none text-xs"
          style={{ left: tooltip.x + 10, top: tooltip.y - 10 }}
        >
          <div className="font-bold border-b border-gray-600 mb-1">Route {tooltip.content.RTE_str}</div>
          <div>{activeMetric === 'congestion_intensity' ? 'Congestion' : 'Freight'}: 
            <span className="font-mono ml-1">
              {activeMetric === 'freight_ratio' 
                ? (tooltip.content[activeMetric] * 100).toFixed(1) + '%' 
                : Math.round(tooltip.content[activeMetric]).toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}