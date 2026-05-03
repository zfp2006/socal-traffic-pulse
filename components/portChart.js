'use client';
import { useRef, useEffect } from 'react';
import * as d3 from 'd3';

export default function PortChart() {
  const svgRef = useRef();

  useEffect(() => {
    const data = [
      { year: 2010, la: 14.1, ny: 5.3, sav: 2.8 },
      { year: 2015, la: 15.3, ny: 6.3, sav: 3.7 },
      { year: 2020, la: 17.3, ny: 7.5, sav: 4.6 },
      { year: 2023, la: 19.0, ny: 7.8, sav: 4.9 }
    ];

    const width = 400;
    const height = 250;
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };

    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('overflow', 'visible');
    
    svg.selectAll('*').remove();

    const x = d3.scaleLinear().domain([2010, 2023]).range([margin.left, width - margin.right]);
    const y = d3.scaleLinear().domain([0, 20]).range([height - margin.bottom, margin.top]);

    // Axes
    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(4).tickFormat(d3.format('d')))
      .attr('color', '#9ca3af');

    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5))
      .attr('color', '#9ca3af');

    // Lines
    const drawLine = (key, color) => {
      const line = d3.line().x(d => x(d.year)).y(d => y(d[key])).curve(d3.curveMonotoneX);
      svg.append('path').datum(data).attr('fill', 'none').attr('stroke', color).attr('stroke-width', 3).attr('d', line);
      
      // Label at the end of the line
      svg.append('text')
        .attr('x', x(2023) + 5)
        .attr('y', y(data[3][key]) + 4)
        .attr('fill', color)
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .text(key.toUpperCase());
    };

    drawLine('la', '#60a5fa'); // Blue for LA/LB
    drawLine('ny', '#9ca3af'); // Gray for others
    drawLine('sav', '#9ca3af');

    // Y-axis label
    svg.append('text')
      .attr('x', margin.left)
      .attr('y', margin.top - 10)
      .attr('fill', '#9ca3af')
      .attr('font-size', '10px')
      .text('Millions of TEUs');

  }, []);

  return <svg ref={svgRef} className="w-full h-auto mt-4" />;
}