'use client';
import { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

export default function MapComponent({ data, activeMetric }) {
  const svgRef = useRef();
  const [basemap, setBasemap] = useState(null);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: null });

  const soCalCounties = [
    'Los Angeles', 'Orange', 'San Diego', 'Imperial', 
    'Riverside', 'San Bernardino', 'Ventura', 'Santa Barbara'
  ];

  // Fetch Basemap
  useEffect(() => {
    d3.json('https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/california-counties.geojson')
      .then(geoData => {
        geoData.features = geoData.features.filter(feature => 
          soCalCounties.includes(feature.properties.name)
        );
        setBasemap(geoData);
      });
  }, []);

  // ==========================================
  // EFFECT 1: HEAVY GEOMETRY SETUP (Runs Once)
  // ==========================================
  useEffect(() => {
    if (!data || !basemap) return;

    const width = 800;
    const height = 600;
    const svg = d3.select(svgRef.current).attr('viewBox', `0 0 ${width} ${height}`);
    
    // Clear out strict mode double-renders, but only do this on initial data load
    svg.selectAll('*').remove(); 

    const mapGroup = svg.append('g').attr('class', 'map-group');
    const projection = d3.geoMercator().fitSize([width, height], basemap);
    const pathGenerator = d3.geoPath().projection(projection);

    // Draw Basemap
    mapGroup.append('g')
      .selectAll('path')
      .data(basemap.features)
      .join('path')
      .attr('d', pathGenerator)
      .attr('fill', '#1f2937')
      .attr('stroke', '#374151')
      .attr('stroke-width', 1);

    // Draw Labels
    mapGroup.append('g')
      .selectAll('text')
      .data(basemap.features)
      .join('text')
      .attr('transform', d => `translate(${pathGenerator.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .attr('fill', '#6b7280')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('pointer-events', 'none')
      .text(d => d.properties.name);

    // Segment Generation (Heavy Math)
    const segments = [];
    const groupedRoutes = d3.group(data.features, d => `${d.properties.RTE_str}-${d.properties.CNTY}-${d.properties.DIR}`);
    
    groupedRoutes.forEach(points => {
      points.sort((a, b) => (a.properties.POSTMILE || 0) - (b.properties.POSTMILE || 0));
      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i].geometry.coordinates;
        const p2 = points[i + 1].geometry.coordinates;
        const dist = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
        
        if (dist < 0.1) {
          segments.push({
            x1: projection(p1)[0], y1: projection(p1)[1],
            x2: projection(p2)[0], y2: projection(p2)[1],
            props: points[i].properties 
          });
        }
      }
    });

    const laneExtent = d3.extent(data.features, d => d.properties.total_lanes || 2);
    const laneScale = d3.scaleLinear().domain(laneExtent).range([1, 8]); 

    // Draw Lines (Geometry only, NO COLORS YET)
    const lines = mapGroup.append('g').attr('class', 'lines-group')
      .selectAll('line')
      .data(segments)
      .join('line')
      .attr('class', 'route-line') // Crucial for Effect 2 to find them!
      .attr('x1', d => d.x1)
      .attr('y1', d => d.y1)
      .attr('x2', d => d.x2)
      .attr('y2', d => d.y2)
      .attr('stroke-width', d => laneScale(d.props.total_lanes || 2))
      .attr('stroke-linecap', 'round')
      .attr('opacity', 0.9)
      .attr('cursor', 'crosshair')
      .on('mousemove', (event, d) => {
        d3.select(event.currentTarget).attr('stroke', '#ffffff').attr('opacity', 1);
        setTooltip({ visible: true, x: event.clientX, y: event.clientY, content: d.props });
      })
      .on('mouseout', (event) => {
        // Reads the custom attribute we set in Effect 2 to revert to the correct color
        const node = d3.select(event.currentTarget);
        node.attr('stroke', node.attr('data-original-color')).attr('opacity', 0.9);
        setTooltip(prev => ({ ...prev, visible: false }));
      });

    // Zoom Behavior
    const zoom = d3.zoom()
      .scaleExtent([1, 10]) 
      .translateExtent([[0, 0], [width, height]]) 
      .on('zoom', (event) => {
        mapGroup.attr('transform', event.transform);
        lines.attr('stroke-width', d => laneScale(d.props.total_lanes || 2) / event.transform.k);
        mapGroup.selectAll('path').attr('stroke-width', 1 / event.transform.k); 
        mapGroup.selectAll('text').attr('font-size', `${12 / event.transform.k}px`);
      });

    svg.call(zoom);

  }, [data, basemap]); // <--- ONLY RUNS WHEN DATA LOADS

  // ==========================================
  // EFFECT 2: COLOR UPDATES (Runs on Toggle)
  // ==========================================
  useEffect(() => {
    if (!data || !basemap) return;

    // Recalculate Scales
    const metricValues = data.features
      .map(d => d.properties[activeMetric])
      .filter(v => v !== null && v > 0)
      .sort(d3.ascending);
    const maxDomainValue = d3.quantile(metricValues, 0.95) || 1; 

    const colorScale = d3.scaleSequential(
      activeMetric === 'congestion_intensity' ? d3.interpolateYlOrRd : d3.interpolateBlues
    ).domain([0, maxDomainValue]);

    // Select existing lines and smoothly update colors
    d3.select(svgRef.current)
      .selectAll('.route-line')
      .transition()
      .duration(400)
      .attr('stroke', d => colorScale(d.props[activeMetric]))
      // Save the specific color to the DOM element so mouseout events know what to revert to
      .attr('data-original-color', d => colorScale(d.props[activeMetric]));

  }, [activeMetric, data, basemap]); // <--- RUNS WHEN METRIC CHANGES

  return (
    <div className="relative w-full h-full">
      <svg ref={svgRef} className="w-full h-full block rounded-lg bg-gray-900 cursor-grab active:cursor-grabbing" />

      {tooltip.visible && tooltip.content && (
        <div 
          className="fixed z-50 bg-gray-800 border border-gray-600 text-white p-3 rounded shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full mb-4"
          style={{ left: tooltip.x, top: tooltip.y - 10 }}
        >
          <div className="font-bold border-b border-gray-600 pb-1 mb-1">
            Route {tooltip.content.RTE_str} ({tooltip.content.CNTY})
          </div>
          <div className="text-sm">
            <span className="text-gray-400">Postmile:</span> {tooltip.content.POSTMILE || 'N/A'}
          </div>
          <div className="text-sm">
            <span className="text-gray-400">Lanes:</span> {tooltip.content.total_lanes || 'Unknown'}
          </div>
          <div className="text-sm">
            <span className="text-gray-400">
              {activeMetric === 'congestion_intensity' ? 'Congestion:' : 'Freight %:'}
            </span>{' '}
            {activeMetric === 'congestion_intensity' 
              ? Math.round(tooltip.content[activeMetric] || 0).toLocaleString() + ' veh/lane'
              : Math.round((tooltip.content[activeMetric] || 0) * 100) + '%'
            }
          </div>
        </div>
      )}
    </div>
  );
}