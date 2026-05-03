'use client';
import { useRef, useEffect } from 'react';
import * as d3 from 'd3';

export default function CongestionChart() {
  const svgRef = useRef();

  useEffect(() => {
    const data = [
      { city: 'New York', hours: 117 },
      { city: 'Chicago', hours: 104 },
      { city: 'Los Angeles', hours: 89 },
      { city: 'Boston', hours: 88 },
      { city: 'Miami', hours: 81 }
    ];

    const width = 400;
    const height = 250;
    const margin = { top: 20, right: 20, bottom: 40, left: 80 };

    const svg = d3.select(svgRef.current).attr('viewBox', `0 0 ${width} ${height}`);
    svg.selectAll('*').remove();

    const x = d3.scaleLinear().domain([0, 120]).range([margin.left, width - margin.right]);
    const y = d3.scaleBand().domain(data.map(d => d.city)).range([margin.top, height - margin.bottom]).padding(0.2);

    // Axes
    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(5))
      .attr('color', '#9ca3af');

    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).tickSize(0))
      .attr('color', '#e5e7eb')
      .attr('font-size', '12px')
      .call(g => g.select(".domain").remove());

    // Bars
    svg.selectAll('rect')
      .data(data)
      .join('rect')
      .attr('x', x(0))
      .attr('y', d => y(d.city))
      .attr('width', d => x(d.hours) - x(0))
      .attr('height', y.bandwidth())
      .attr('fill', d => d.city === 'Los Angeles' ? '#ef4444' : '#4b5563'); // Red for LA, Gray for others

    // X-axis label
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height - 5)
      .attr('fill', '#9ca3af')
      .attr('font-size', '10px')
      .attr('text-anchor', 'middle')
      .text('Hours Lost in Traffic per Driver (Annually)');

  }, []);

  return <svg ref={svgRef} className="w-full h-auto mt-4" />;
}