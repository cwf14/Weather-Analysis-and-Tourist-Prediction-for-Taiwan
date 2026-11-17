import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

export default function WeatherPrecipitationBarChart({ data }) {
  const ref = useRef();
  const [tooltip, setTooltip] = useState({ visible: false, content: "", x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 1000, height: 600 });

  useEffect(() => {
    const updateDimensions = () => {
      const container = ref.current.parentElement;
      const containerWidth = container.clientWidth;
      const width = Math.min(containerWidth - 40, 1200);
      const height = Math.max(width * 0.6, 500);
      setDimensions({ width, height });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (!data || data.length === 0) {
      console.log('No data provided to WeatherPrecipitationBarChart');
      return;
    }

    // Calculate monthly data
    const monthly = d3.groups(data, d => d.Month)
      .map(([month, rows]) => {
        const totalRain = d3.sum(rows, d => +d.Precipitation_Total_mm || 0);
        const totalDays = rows.length;
        
        return {
          month: +month,
          monthName: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][month-1],
          totalRain,
          avgDailyRain: totalDays > 0 ? totalRain / totalDays : 0
        };
      })
      .sort((a, b) => a.month - b.month);

    if (monthly.length === 0) return;

    // Clear previous chart
    d3.select(ref.current).selectAll("*").remove();

    const margin = { top: 60, right: 40, bottom: 80, left: 50 }; // Reduced top margin further
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    // Main SVG container
    const svg = d3.select(ref.current)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .style("background", "#f8fafc")
      .style("border-radius", "8px")
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const x = d3.scaleBand()
      .domain(monthly.map(d => d.monthName))
      .range([0, width])
      .padding(0.3);

    const maxRain = d3.max(monthly, d => d.totalRain) || 0;
    const y = d3.scaleLinear()
      .domain([0, maxRain * 1.1])
      .range([height, 0])
      .nice();

    // Color scale based on rain amount
    const colorScale = d3.scaleSequential()
      .domain([0, maxRain])
      .interpolator(d3.interpolateBlues);

    // Bars with hover effects
    svg.selectAll(".bar")
      .data(monthly)
      .join("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.monthName))
      .attr("y", d => y(d.totalRain))
      .attr("width", x.bandwidth())
      .attr("height", d => height - y(d.totalRain))
      .attr("fill", d => colorScale(d.totalRain))
      .attr("rx", 3)
      .style("cursor", "pointer")
      .style("transition", "all 0.3s ease")
      .on("mouseover", function(event, d) {
        // Darken the bar on hover
        d3.select(this)
          .transition()
          .duration(200)
          .attr("fill", d3.color(colorScale(d.totalRain)).darker(0.6))
          .attr("stroke", "#1a237e")
          .attr("stroke-width", 3)
          .attr("opacity", 0.9);
        
        const rect = ref.current.getBoundingClientRect();
        setTooltip({
          visible: true,
          content: `
            <strong>${d.monthName}</strong><br/>
            Total Rain: ${d.totalRain.toFixed(0)} mm<br/>
            Avg Daily: ${d.avgDailyRain.toFixed(1)} mm
          `,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top
        });
      })
      .on("mousemove", function(event) {
        const rect = ref.current.getBoundingClientRect();
        setTooltip(prev => ({
          ...prev,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top
        }));
      })
      .on("mouseout", function(event, d) {
        // Restore original color
        d3.select(this)
          .transition()
          .duration(200)
          .attr("fill", colorScale(d.totalRain))
          .attr("stroke", "none")
          .attr("stroke-width", 0)
          .attr("opacity", 1);
        
        setTooltip({ visible: false, content: "", x: 0, y: 0 });
      });

    // Add value labels
    svg.selectAll(".bar-label")
      .data(monthly)
      .join("text")
      .attr("class", "bar-label")
      .attr("x", d => x(d.monthName) + x.bandwidth() / 2)
      .attr("y", d => y(d.totalRain) - 10)
      .attr("text-anchor", "middle")
      .style("font-size", "13px")
      .style("font-weight", "700")
      .style("fill", "#1a237e")
      .style("text-shadow", "0 1px 2px rgba(255,255,255,0.8)")
      .text(d => `${d.totalRain.toFixed(0)}`);

    // Grid lines
    svg.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(y)
        .tickSize(-width)
        .tickFormat("")
      )
      .style("opacity", 0.15)
      .style("color", "#ccc");

    // Axes
    const xAxis = svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x));

    xAxis.selectAll("text")
      .style("font-size", "13px")
      .style("fill", "#666")
      .style("font-weight", "600");

    // Y-Axis
    const yAxis = svg.append("g")
      .call(d3.axisLeft(y).tickFormat(d => {
        if (d >= 1000) {
          return `${(d/1000).toFixed(0)}k`; 
        }
        return `${d}`;
      }));

    yAxis.selectAll("text")
      .style("font-size", "12px")
      .style("fill", "#666")
      .style("font-weight", "600");

    // X Axis Label
    svg.append("text")
      .attr("transform", `translate(${width / 2}, ${height + margin.bottom - 15})`)
      .style("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .style("fill", "#333")
      .text("Month");

    // Y Axis Label
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left + 17)
      .attr("x", -height / 2)
      .style("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .style("fill", "#333")
      .text("Precipitation (mm)");

    // Legend 
    const legendWidth = Math.min(200, width * 0.35);
    const legendHeight = 16;
    
    // Create legend in the main SVG 
    const mainSvg = d3.select(ref.current).select("svg");
    const legend = mainSvg.append("g")
      .attr("transform", `translate(${width + margin.left - legendWidth - 5}, ${25})`);
      
    // Legend title
    legend.append("text")
      .attr("x", 0)
      .attr("y", -5)
      .text("Rainfall Intensity")
      .style("font-size", "12px")
      .style("font-weight", "700")
      .style("fill", "#555");

    // Legend gradient
    const defs = mainSvg.append("defs");
    const legendGradient = defs.append("linearGradient")
      .attr("id", "legend-gradient")
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "100%").attr("y2", "0%");

    [0, 0.2, 0.4, 0.6, 0.8, 1].forEach(offset => {
      legendGradient.append("stop")
        .attr("offset", `${offset * 100}%`)
        .attr("stop-color", d3.interpolateBlues(offset));
    });

    legend.append("rect")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#legend-gradient)")
      .attr("rx", 2)
      .attr("stroke", "#999")
      .attr("stroke-width", 1);

    // Legend scale
    const legendScale = d3.scaleLinear()
      .domain([0, maxRain])
      .range([0, legendWidth]);

    const tickValues = [0, maxRain * 0.25, maxRain * 0.5, maxRain * 0.75, maxRain];
    
    const legendAxis = d3.axisBottom(legendScale)
      .tickValues(tickValues)
      .tickFormat(d => {
        if (d >= 1000) {
          return `${(d/1000).toFixed(0)}k`;
        }
        return `${d}`;
      })
      .tickSize(4);

    const axisGroup = legend.append("g")
      .attr("transform", `translate(0, ${legendHeight})`)
      .call(legendAxis);

    axisGroup.selectAll("text")
      .style("font-size", "9px")
      .style("fill", "#333")
      .style("font-weight", "600")
      .style("text-shadow", "0 1px 1px rgba(255,255,255,0.9)");

    axisGroup.select(".domain").remove();

    // Add unit label
    legend.append("text")
      .attr("x", legendWidth + 3)
      .attr("y", legendHeight / 2)
      .attr("text-anchor", "start")
      .style("font-size", "9px")
      .style("fill", "#666")
      .style("font-weight", "600")
      .text("mm");

  }, [data, dimensions]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div 
        ref={ref} 
        style={{ 
          width: "100%", 
          height: "100%",
          display: "flex", 
          justifyContent: "center",
          minHeight: "600px"
        }}
      ></div>
      
      {/* Tooltip */}
      {tooltip.visible && (
        <div
          style={{
            position: "absolute",
            left: tooltip.x + 15,
            top: tooltip.y - 10,
            background: "rgba(0, 0, 0, 0.9)",
            color: "white",
            padding: "12px 16px",
            borderRadius: "8px",
            fontSize: "13px",
            pointerEvents: "none",
            zIndex: 1000,
            boxShadow: "0 6px 16px rgba(0, 0, 0, 0.3)",
            lineHeight: "1.5",
            maxWidth: "220px",
            border: "1px solid rgba(255,255,255,0.3)",
            whiteSpace: "nowrap",
            fontWeight: "500"
          }}
          dangerouslySetInnerHTML={{ __html: tooltip.content }}
        />
      )}
    </div>
  );
}