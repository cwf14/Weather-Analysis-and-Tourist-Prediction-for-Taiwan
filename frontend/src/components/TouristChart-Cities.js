import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const TouristChartCities = ({ data, cityConfig, highlightCity }) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;

    // Chart dimensions and margins
    const margin = { top: 20, right: 100, bottom: 50, left: 60 };
    const width = 1000 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    // Clear previous chart
    const svgEl = d3.select(svgRef.current);
    svgEl.selectAll("*").remove();

    const svg = svgEl
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .classed("chart-svg", true)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const x = d3.scaleTime()
      .domain(d3.extent(data, d => d.date))
      .range([0, width]);

    // Dynamic Y scale based on visible data
    const maxVal = d3.max(data, d => {
        if(highlightCity !== 'All') return d[highlightCity];
        return Math.max(...cityConfig.map(c => d[c.name] || 0));
    });

    const y = d3.scaleLinear()
      .domain([0, maxVal * 1.1])
      .range([height, 0]);

    // Axes and gridlines
    const xAxis = d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat("%Y"));
    const yAxis = d3.axisLeft(y).tickFormat(d => `${d/1000000}M`);

    // Horizontal gridlines
    svg.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(6).tickSize(-height).tickFormat(""))
      .attr("opacity", 0.3)
      .attr("color", "#e0e0e0");

    // Vertical gridlines
    svg.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(""))
      .attr("opacity", 0.3)
      .attr("color", "#e0e0e0");

    // X axis
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis)
      .attr("color", "#666")
      .style("font-size", "14px")
      .select(".domain")
      .attr("stroke", "#999");

    // Y axis
    svg.append("g")
      .call(yAxis)
      .attr("color", "#666")
      .style("font-size", "14px")
      .select(".domain")
      .attr("stroke", "#999");

    // Axis labels
    svg.append("text")
      .attr("transform", `translate(${width / 2}, ${height + margin.bottom - 10})`)
      .style("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .style("fill", "#333")
      .text("Year");

    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left + 15)
      .attr("x", -height / 2)
      .style("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .style("fill", "#333")
      .text("Number of Tourists");

    // Line generator
    const lineGenerator = d3.line()
      .x(d => x(d.date))
      .y(d => y(d.value))
      .curve(d3.curveMonotoneX);

    // Draw city lines
    cityConfig.forEach(city => {
      const isSelected = highlightCity === 'All' || highlightCity === city.name;
      const opacity = isSelected ? 1 : 0.1;
      const strokeWidth = isSelected ? 2.5 : 1;

      const cityData = data.map(d => ({ date: d.date, value: d[city.name] || 0 }));

      svg.append("path")
        .datum(cityData)
        .attr("fill", "none")
        .attr("stroke", city.color)
        .attr("stroke-width", strokeWidth)
        .attr("opacity", opacity)
        .attr("d", lineGenerator)
        .style("transition", "opacity 0.3s ease");
    });

    // Tooltip setup
    const tooltip = d3.select("body").append("div")
      .style("position", "absolute")
      .style("background", "rgba(255, 255, 255, 0.95)")
      .style("border", "1px solid #ccc")
      .style("color", "#333")
      .style("padding", "10px")
      .style("border-radius", "4px")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("font-size", "12px")
      .style("box-shadow", "0 2px 10px rgba(0,0,0,0.1)");

    // Hover vertical line
    const hoverLine = svg.append("line")
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", "#666")
      .attr("stroke-dasharray", "4,4")
      .attr("opacity", 0);

    // Mouse tracking overlay
    svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "transparent")
      .on("mousemove", (event) => {
        const [mx] = d3.pointer(event);
        const dateVal = x.invert(mx);
        
        // Find closest data point
        const bisect = d3.bisector(d => d.date).left;
        const i = bisect(data, dateVal, 1);
        const d0 = data[i - 1];
        const d1 = data[i];
        const d = (d1 && dateVal - d0.date > d1.date - dateVal) ? d1 : d0;

        if(!d) return;

        // Show hover line
        hoverLine
          .attr("x1", x(d.date))
          .attr("x2", x(d.date))
          .attr("opacity", 1);

        const dateStr = d3.timeFormat("%B %Y")(d.date);
        
        // Build tooltip content
        let html = `<div style="font-weight:bold; margin-bottom:5px; border-bottom:1px solid #ddd; padding-bottom:3px; color: #333;">${dateStr}</div>`;
        
        // Sort cities by value for tooltip display
        const sorted = [...cityConfig].sort((a,b) => (d[b.name]||0) - (d[a.name]||0));
        
        sorted.forEach(c => {
            if(highlightCity === 'All' || highlightCity === c.name) {
                html += `
                <div style="display:flex; align-items:center; justify-content:space-between; gap:15px;">
                    <span style="color:${c.color}">● ${c.name}</span>
                    <span style="color: #333;">${d3.format(",")(Math.round(d[c.name]||0))}</span>
                </div>`;
            }
        });

        tooltip
          .html(html)
          .style("left", (event.pageX + 15) + "px")
          .style("top", (event.pageY - 15) + "px")
          .style("opacity", 1);
      })
      .on("mouseleave", () => {
        tooltip.style("opacity", 0);
        hoverLine.attr("opacity", 0);
      });

    return () => tooltip.remove();

  }, [data, highlightCity, cityConfig]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
        <svg ref={svgRef} style={{ width: '100%', height: '90%' }}></svg>
        
        {/* Legend */}
        <div style={{ display:'flex', justifyContent:'center', gap:'15px', marginTop:'5px' }}>
            {cityConfig.map(c => (
                <div key={c.name} style={{ 
                    display: 'flex', alignItems:'center',
                    opacity: (highlightCity === 'All' || highlightCity === c.name) ? 1 : 0.3 
                }}>
                    <div style={{ width:10, height:10, backgroundColor:c.color, marginRight:5, borderRadius:'50%' }}></div>
                    <span style={{ color:'#666', fontSize:'12px' }}>{c.name}</span>
                </div>
            ))}
        </div>
    </div>
  );
};

export default TouristChartCities;