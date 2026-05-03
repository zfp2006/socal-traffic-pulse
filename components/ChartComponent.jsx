'use client';
import { useRef, useEffect } from 'react';
import * as d3 from 'd3';

export default function ChartComponent({ data, activeMetric }) {
  const svgRef = useRef();

  useEffect(() => {
    // Wait until the data actually loads
    if (!data || !data.features) return;

    // ==========================================
    // 1. DATA WRANGLING
    // ==========================================
    
    // Filter out any points that are missing data for the active metric
    const validData = data.features.filter(
      d => d.properties[activeMetric] !== null && d.properties[activeMetric] !== undefined
    );

    // Group by Route + County and calculate the average
    const routeRollup = d3.rollups(
      validData,
      (v) => d3.mean(v, d => d.properties[activeMetric]), 
      (d) => `Route ${d.properties.RTE_str} (${d.properties.CNTY})`
    );

    // Sort descending and grab the Top 10
    const top10 = routeRollup
      .sort((a, b) => d3.descending(a[1], b[1]))
      .slice(0, 10);

    // ==========================================
    // 2. SVG SETUP
    // ==========================================
    const width = 500;
    const height = 400;
    // We need a large left margin so the Route names don't get cut off
    const margin = { top: 40, right: 30, bottom: 40, left: 120 };

    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('overflow', 'visible');

    svg.selectAll('*').remove(); // Clear previous render when metric changes

    // ==========================================
    // 3. SCALES
    // ==========================================
    const xScale = d3.scaleLinear()
      .domain([0, d3.max(top10, d => d[1])])
      .range([margin.left, width - margin.right]);

    const yScale = d3.scaleBand()
      .domain(top10.map(d => d[0]))
      .range([margin.top, height - margin.bottom])
      .padding(0.2); // Spacing between bars

    // ==========================================
    // 4. DRAW BARS
    // ==========================================
    const barColor = activeMetric === 'congestion_intensity' ? '#ef4444' : '#3b82f6';

    svg.append('g')
      .selectAll('rect')
      .data(top10)
      .join('rect')
      .attr('x', margin.left)
      .attr('y', d => yScale(d[0]))
      .attr('width', d => Math.max(0, xScale(d[1]) - margin.left))
      .attr('height', yScale.bandwidth())
      .attr('fill', barColor)
      .attr('rx', 4) // Rounded corners!
      .style('opacity', 0.8)
      .on('mouseover', function() { d3.select(this).style('opacity', 1); })
      .on('mouseout', function() { d3.select(this).style('opacity', 0.8); });

    // ==========================================
    // 5. DRAW AXES
    // ==========================================
    
    // X-Axis (Bottom)
    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xScale)
        .ticks(5)
        .tickFormat(d => activeMetric === 'freight_ratio' ? d3.format('.0%')(d) : d3.format('.2s')(d))
      )
      .attr('color', '#9ca3af') // Subtle gray text
      .attr('font-size', '12px')
      .call(g => g.select(".domain").attr("stroke", "#4b5563")); // Darker axis line

    // Y-Axis (Left)
    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale).tickSize(0)) // Hide tick lines, keep text
      .attr('color', '#e5e7eb') // Light gray text
      .attr('font-size', '12px')
      .call(g => g.select(".domain").remove()); // Hide the vertical line entirely for a modern look

    // ==========================================
    // 6. CHART TITLE
    // ==========================================
    svg.append('text')
      .attr('x', margin.left)
      .attr('y', margin.top - 15)
      .attr('fill', '#ffffff')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .text(activeMetric === 'congestion_intensity' 
        ? 'Top 10 Most Congested Routes' 
        : 'Top 10 Freight Corridors');

  }, [data, activeMetric]); // This array tells React to redraw when the toggle is clicked!

  return <svg ref={svgRef} className="w-full h-full block" />;
}