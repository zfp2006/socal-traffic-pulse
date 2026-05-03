'use client';
import { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

export default function TreemapComponent({ data, activeMetric, selectedRoute, setSelectedRoute }) {
  const svgRef = useRef();
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: null });

  useEffect(() => {
    if (!data || !data.features || !svgRef.current) return;

    // 1. DATA WRANGLING
    // Flattening the hierarchy to just be "Root -> Routes"
    const validData = data.features
      .map(f => f.properties)
      .filter(d => d.AHEAD_AADT != null && d.RTE_str && d[activeMetric] != null);

    const routeGroups = d3.rollups(
      validData,
      v => ({
        value: d3.sum(v, s => s.AHEAD_AADT),
        metricValue: d3.mean(v, s => s[activeMetric]),
        counties: Array.from(new Set(v.map(s => s.CNTY))).join(', ')
      }),
      d => d.RTE_str
    );

    const hierarchicalData = {
      name: "SoCal Routes",
      children: routeGroups.map(([route, stats]) => ({
        name: `Rte ${route}`,
        routeId: route,
        ...stats
      }))
    };

    // 2. SETUP SVG
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    const { width, height } = svgRef.current.getBoundingClientRect();

    const root = d3.hierarchy(hierarchicalData)
      .sum(d => d.value)
      .sort((a, b) => b.value - a.value);

    d3.treemap()
      .size([width, height])
      .padding(2)
      .round(true)(root);

    // 3. SCALES
    const metricValues = root.leaves().map(d => d.data.metricValue);
    const colorScale = d3.scaleSequential(
      activeMetric === 'congestion_intensity' ? d3.interpolateYlOrRd : d3.interpolateBlues
    ).domain([0, activeMetric === 'freight_ratio' ? 0.20 : d3.quantile(metricValues.sort(d3.ascending), 0.95) || 1])
     .clamp(true);

    // 4. DRAWING
    const leaf = svg.selectAll('g')
      .data(root.leaves())
      .join('g')
      .attr('transform', d => `translate(${d.x0},${d.y0})`);

    leaf.append('rect')
      .attr('class', 'treemap-rect cursor-pointer transition-opacity duration-300')
      .attr('width', d => d.x1 - d.x0)
      .attr('height', d => d.y1 - d.y0)
      .attr('fill', d => colorScale(d.data.metricValue))
      .attr('stroke', '#111827')
      .attr('opacity', d => !selectedRoute || d.data.routeId === selectedRoute ? 1 : 0.15)
      .on('mousemove', (event, d) => {
        setTooltip({ visible: true, x: event.clientX, y: event.clientY, content: d.data });
      })
      .on('mouseleave', () => setTooltip(prev => ({ ...prev, visible: false })))
      .on('click', (event, d) => {
        setSelectedRoute(prev => prev === d.data.routeId ? null : d.data.routeId);
      });

    leaf.append('text')
      .attr('x', 5)
      .attr('y', 15)
      .attr('fill', 'white')
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .style('pointer-events', 'none')
      .text(d => (d.x1 - d.x0 > 40 && d.y1 - d.y0 > 20) ? d.data.name : "");

  }, [data, activeMetric, selectedRoute]);

  return (
    <div className="w-full h-full relative flex flex-col">
      <div className="font-bold text-gray-300 text-xs mb-2 uppercase tracking-widest flex justify-between">
        <span>Route Volume Map (Size = Traffic, Color = Intensity)</span>
      </div>
      <div className="flex-1 min-h-0 bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
        <svg ref={svgRef} className="w-full h-full block" />
      </div>

      {tooltip.visible && (
        <div 
          className="fixed z-50 bg-gray-800 border border-gray-600 text-white p-2 rounded shadow-xl pointer-events-none text-xs"
          style={{ left: tooltip.x + 10, top: tooltip.y - 20 }}
        >
          <div className="font-bold border-b border-gray-600 mb-1">{tooltip.content.name}</div>
          <div>Vol: <span className="text-gray-300 font-mono">{d3.format(',')(Math.round(tooltip.content.value))}</span></div>
          <div>{activeMetric === 'freight_ratio' ? 'Freight' : 'Congestion'}: 
            <span className="text-gray-300 font-mono ml-1">
              {activeMetric === 'freight_ratio' ? (tooltip.content.metricValue * 100).toFixed(1) + '%' : Math.round(tooltip.content.metricValue)}
            </span>
          </div>
          <div className="text-[10px] text-gray-500 mt-1 italic">Counties: {tooltip.content.counties}</div>
        </div>
      )}
    </div>
  );
}