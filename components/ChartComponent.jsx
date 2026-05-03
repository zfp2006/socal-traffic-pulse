'use client';
import { useRef, useEffect } from 'react';
import * as d3 from 'd3';

export default function ChartComponent({ data, activeMetric, selectedRoute, setSelectedRoute }) {
  const svgRef = useRef();

  useEffect(() => {
    if (!data || !data.features) return;

    // 1. Data Wrangling
    const validData = data.features.filter(d => d.properties[activeMetric] != null);
    const routeRollup = d3.rollups(
        validData, 
        v => d3.mean(v, d => d.properties[activeMetric]), 
        d => d.properties.RTE_str
    );
    const top10 = routeRollup.sort((a, b) => d3.descending(a[1], b[1])).slice(0, 10);

    // 2. Dimensions & Scales
    const width = 500;
    const height = 400;
    const margin = { top: 40, right: 30, bottom: 50, left: 80 }; // Increased bottom/left for axis labels
    
    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('overflow', 'visible');
    
    svg.selectAll('*').remove();

    const xScale = d3.scaleLinear()
      .domain([0, d3.max(top10, d => d[1]) || 1])
      .range([margin.left, width - margin.right]);

    const yScale = d3.scaleBand()
      .domain(top10.map(d => d[0]))
      .range([margin.top, height - margin.bottom])
      .padding(0.2);

    const barColor = activeMetric === 'congestion_intensity' ? '#ef4444' : '#3b82f6';

    // 3. Draw Axes
    // X-Axis (Bottom)
    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xScale)
        .ticks(5)
        .tickFormat(d => activeMetric === 'freight_ratio' ? `${(d * 100).toFixed(0)}%` : d3.format('.2s')(d))
      )
      .attr('color', '#9ca3af') // Muted gray for axis lines/ticks
      .selectAll('text')
      .style('fill', '#9ca3af');

    // Y-Axis (Left)
    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale)
        .tickFormat(d => `Rte ${d}`)
      )
      .attr('color', '#9ca3af')
      .selectAll('text')
      .style('fill', '#e5e7eb') // Brighter white for route names
      .style('font-weight', 'bold');

    // 4. Draw Bars
    svg.append('g')
      .selectAll('rect')
      .data(top10)
      .join('rect')
      .attr('class', 'chart-bar')
      .attr('x', margin.left)
      .attr('y', d => yScale(d[0]))
      .attr('width', d => Math.max(0, xScale(d[1]) - margin.left))
      .attr('height', yScale.bandwidth())
      .attr('fill', barColor)
      .attr('rx', 4)
      .attr('cursor', 'pointer')
      .on('click', (event, d) => setSelectedRoute(prev => prev === d[0] ? null : d[0]));

    // 5. Title
    svg.append('text')
      .attr('x', margin.left)
      .attr('y', margin.top - 15)
      .attr('fill', '#9ca3af')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text(`TOP 10 ROUTES BY ${activeMetric.replace('_', ' ').toUpperCase()}`);

    // 6. Highlight Transition
    svg.selectAll('.chart-bar').transition().duration(300)
      .attr('opacity', d => !selectedRoute || d[0] === selectedRoute ? 1 : 0.2)
      .attr('stroke', d => d[0] === selectedRoute ? 'white' : 'none')
      .attr('stroke-width', 2);

  }, [data, activeMetric, selectedRoute]);

  return <svg ref={svgRef} className="w-full h-full block" />;
}