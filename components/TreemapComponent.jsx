'use client';
import { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

export default function TreemapComponent({ data, activeMetric }) {
  const svgRef = useRef();
  // React State for our Tooltip (consistent with MapComponent style)
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: null });

  useEffect(() => {
    if (!data || !data.features) return;

    // ==========================================
    // 1. DATA WRANGLING & HIERARCHY
    // ==========================================

    // Filter features that have valid traffic volume (AADT) and geo info
    const validData = data.features
      .map(f => f.properties)
      .filter(d => d.AHEAD_AADT != null && d.CNTY && d.RTE_str);

    // Group data by County then by Route string
    const groupedData = d3.group(validData, d => d.CNTY, d => d.RTE_str);

    // Transform Map structure into D3 hierarchy JSON format
    const hierarchicalData = {
      name: "Southern California",
      children: Array.from(groupedData, ([county, routes]) => ({
        name: county,
        children: Array.from(routes, ([route, segments]) => ({
          name: `RTE ${route}`,
          children: segments.map(seg => ({
            name: `PM ${seg.POSTMILE || 'N/A'}`,
            value: seg.AHEAD_AADT, // Size mapped to Traffic Volume
            metricValue: seg[activeMetric] || 0, // Color mapped to active metric
            raw: seg
          }))
        }))
      }))
    };

    // ==========================================
    // 2. SVG SETUP
    // ==========================================
    const width = 800;
    const height = 500;
    const svg = d3.select(svgRef.current).attr('viewBox', `0 0 ${width} ${height}`);
    svg.selectAll('*').remove();

    // Setup color scale based on active metric (Red for Congestion, Blue for Freight)
    const domainMax = activeMetric === 'congestion_intensity'
      ? d3.max(validData, d => d.congestion_intensity)
      : 0.25;
    const colorScale = activeMetric === 'congestion_intensity'
      ? d3.scaleSequential(d3.interpolateYlOrRd).domain([0, domainMax])
      : d3.scaleSequential(t => d3.interpolateBlues(0.2 + 0.8 * t)).domain([0, domainMax]);

    // ==========================================
    // 3. TREEMAP LAYOUT
    // ==========================================
    const root = d3.hierarchy(hierarchicalData)
      .sum(d => d.value)
      .sort((a, b) => b.value - a.value);

    d3.treemap()
      .size([width, height])
      .paddingOuter(2)
      .paddingTop(d => d.depth === 1 ? 20 : 2)
      .paddingInner(1)
      .round(true)
      (root);

    // ==========================================
    // 4. RENDERING ELEMENTS
    // ==========================================

    // Draw leaf nodes (Specific Highway Segments)
    const leaf = svg.selectAll('.leaf')
      .data(root.leaves())
      .join('g')
      .attr('transform', d => `translate(${d.x0},${d.y0})`);

    leaf.append('rect')
      .attr('width', d => Math.max(0, d.x1 - d.x0))
      .attr('height', d => Math.max(0, d.y1 - d.y0))
      .attr('fill', d => {
        const rawValue = d.data.raw[activeMetric];
        // if (rawValue === null || rawValue === undefined) {
        //   return '#374151';
        // }
        return colorScale(d.data.metricValue);
      })
      .attr('stroke', '#1f2937')
      .attr('stroke-width', 0.5)
      .on('mouseover', (event, d) => {
        d3.select(event.currentTarget).attr('stroke', '#ffffff').attr('stroke-width', 2);
        setTooltip({
          visible: true,
          x: event.clientX,
          y: event.clientY,
          content: d.data.raw
        });
      })
      .on('mousemove', (event) => {
        setTooltip(prev => ({ ...prev, x: event.clientX, y: event.clientY }));
      })
      .on('mouseout', (event) => {
        d3.select(event.currentTarget).attr('stroke', '#1f2937').attr('stroke-width', 0.5);
        setTooltip({ visible: false, x: 0, y: 0, content: null });
      });

    // Add labels for larger rectangles
    leaf.append('text')
      .attr('x', 3)
      .attr('y', 12)
      .attr('font-size', '9px')
      .attr('fill', '#ffffff')
      .style('pointer-events', 'none')
      .text(d => {
        const w = d.x1 - d.x0;
        const h = d.y1 - d.y0;
        return (w > 45 && h > 20) ? d.parent.data.name : '';
      });

    // Draw County headers
    svg.selectAll('.county-label')
      .data(root.descendants().filter(d => d.depth === 1))
      .join('text')
      .attr('x', d => d.x0 + 5)
      .attr('y', d => d.y0 + 15)
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('fill', '#9ca3af')
      .text(d => d.data.name);

  }, [data, activeMetric]);

  return (
    <div className="relative w-full h-full bg-gray-900 rounded-lg p-2">
      <div className="text-center font-bold text-gray-300 text-sm mb-2 uppercase tracking-wider">
        Volume Hierarchy: {activeMetric === 'congestion_intensity' ? 'Congestion Intensity' : 'Freight Ratio'}
      </div>

      <svg ref={svgRef} className="w-full h-[calc(100%-2rem)] block" />

      {/* Tooltip Overlay */}
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
            <span className="text-gray-400">AADT (Volume):</span> {d3.format(',')(tooltip.content.AHEAD_AADT)}
          </div>
          <div className="text-sm">
            <span className="text-gray-400">
              {activeMetric === 'congestion_intensity' ? 'Congestion:' : 'Freight %:'}
            </span>{' '}
            {activeMetric === 'congestion_intensity'
              ? Math.round(tooltip.content.congestion_intensity)
              : d3.format('.1%')(tooltip.content.freight_ratio || 0)}
          </div>
        </div>
      )}
    </div>
  );
}