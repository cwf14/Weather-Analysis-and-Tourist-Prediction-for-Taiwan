import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

export default function WindSpeedChart({ data }) {
  const ref = useRef();
  const [tooltip, setTooltip] = useState({ visible: false, content: "", x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 1000, height: 500 });

  // Update chart dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      const container = ref.current.parentElement;
      const containerWidth = container.clientWidth;
      const width = Math.min(containerWidth - 40, 1200);
      const height = Math.max(width * 0.5, 450);
      setDimensions({ width, height });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (!data || !data.length) return;

    d3.select(ref.current).selectAll("*").remove();

    const margin = { top: 90, right: 30, bottom: 70, left: 70 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    // Process data by month to get maximum wind speeds
    const monthly = d3.groups(data, d => d.Month)
      .map(([month, rows]) => {
        const windSpeeds = rows
          .map(r => +r.WindSpeed_Max_ms)
          .filter(w => !isNaN(w) && w != null);
        
        if (windSpeeds.length === 0) return null;
        
        return {
          month: +month,
          monthName: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][month-1],
          windSpeed: d3.max(windSpeeds), 
          max: d3.max(windSpeeds),
          min: d3.min(windSpeeds),
          // Add additional stats for tooltip
          avg: d3.mean(windSpeeds)
        };
      })
      .filter(d => d !== null)
      .sort((a, b) => a.month - b.month);

    if (monthly.length === 0) return;

    const svg = d3.select(ref.current)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .style("background", "#f8fafc")
      .style("border-radius", "8px")
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const x = d3.scalePoint()
      .domain(monthly.map(d => d.monthName))
      .range([0, width])
      .padding(0.5);

    const maxWind = d3.max(monthly, d => d.windSpeed) || 1;
    const y = d3.scaleLinear()
      .domain([0, maxWind * 1.2])
      .range([height, 0])
      .nice();

    // Create gradient for the line
    const defs = svg.append("defs");
    const lineGradient = defs.append("linearGradient")
      .attr("id", "line-gradient")
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "100%").attr("y2", "0%");
    
    lineGradient.append("stop").attr("offset", "0%").attr("stop-color", "#d32f2f"); // Darker red for maximum values
    lineGradient.append("stop").attr("offset", "100%").attr("stop-color", "#ff5252"); // Brighter red

    // Create line generator
    const line = d3.line()
      .x(d => x(d.monthName))
      .y(d => y(d.windSpeed))
      .curve(d3.curveMonotoneX);

    // Draw the line with gradient
    const linePath = svg.append("path")
      .datum(monthly)
      .attr("fill", "none")
      .attr("stroke", "url(#line-gradient)")
      .attr("stroke-width", 4)
      .attr("stroke-linecap", "round")
      .attr("d", line);

    // Add data points with MAXIMUM WIND SPEED TOOLTIP
    svg.selectAll(".wind-point")
      .data(monthly)
      .join("circle")
      .attr("class", "wind-point")
      .attr("cx", d => x(d.monthName))
      .attr("cy", d => y(d.windSpeed))
      .attr("r", 6)
      .attr("fill", "#d32f2f") // Darker red for maximum values
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .style("transition", "all 0.3s ease")
      .on("mouseover", function(event, d) {
        // Darken the point and line on hover
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", 8)
          .attr("fill", "#b71c1c"); 
        
        linePath
          .transition()
          .duration(200)
          .attr("stroke-width", 5);
        
        const rect = ref.current.getBoundingClientRect();
        setTooltip({
          visible: true,
          content: `
            <div style="font-weight: bold; margin-bottom: 5px; border-bottom: 1px solid rgba(255,255,255,0.3); padding-bottom: 3px;">${d.monthName}</div>
            <div>Maximum: <strong>${d.windSpeed.toFixed(1)} m/s</strong> </div>
            <div>Average: ${d.avg.toFixed(1)} m/s</div>
            <div>Range: ${d.min.toFixed(1)} - ${d.max.toFixed(1)} m/s</div>
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
      .on("mouseout", function() {
        // Restore original appearance
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", 6)
          .attr("fill", "#d32f2f");
        
        linePath
          .transition()
          .duration(200)
          .attr("stroke-width", 4);
        
        setTooltip({ visible: false, content: "", x: 0, y: 0 });
      });

    // Add value labels with better styling
    svg.selectAll(".wind-label")
      .data(monthly)
      .join("text")
      .attr("class", "wind-label")
      .attr("x", d => x(d.monthName))
      .attr("y", d => y(d.windSpeed) - 15)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("font-weight", "700")
      .style("fill", "#d32f2f") // Red color for maximum values
      .style("text-shadow", "0 1px 2px rgba(255,255,255,0.8)")
      .text(d => `${d.windSpeed.toFixed(1)}`);

    // Grid lines with better styling
    svg.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(y)
        .tickSize(-width)
        .tickFormat("")
      )
      .style("opacity", 0.2)
      .style("color", "#ccc");

    // Axes with better styling
    const xAxis = svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x));

    xAxis.selectAll("text")
      .style("font-size", "13px")
      .style("fill", "#666")
      .style("font-weight", "600");

    const yAxis = svg.append("g")
      .call(d3.axisLeft(y).tickFormat(d => `${d}`));

    yAxis.selectAll("text")
      .style("font-size", "13px")
      .style("fill", "#666")
      .style("font-weight", "600");

    // X Axis Label
    svg.append("text")
      .attr("transform", `translate(${width / 2}, ${height + margin.bottom - 15})`)
      .style("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .style("fill", "#333")
      .text("Month");

    // Y Axis Label
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left + 20)
      .attr("x", -height / 2)
      .style("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .style("fill", "#333")
      .text("Maximum Wind Speed (m/s)");

    // Add a subtle area under the line
    const area = d3.area()
      .x(d => x(d.monthName))
      .y0(height)
      .y1(d => y(d.windSpeed))
      .curve(d3.curveMonotoneX);

    svg.append("path")
      .datum(monthly)
      .attr("fill", "url(#line-gradient)")
      .attr("opacity", 0.1)
      .attr("d", area);

    // Add legend for maximum values
    const legend = svg.append("g")
      .attr("transform", `translate(${width - 150}, -20)`);

    legend.append("circle")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("r", 6)
      .attr("fill", "#d32f2f");

    legend.append("text")
      .attr("x", 10)
      .attr("y", 4)
      .style("font-size", "12px")
      .style("fill", "#666")
      .style("font-weight", "600")
      .text("Max Wind Speed");

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
          minHeight: "550px"
        }}
      ></div>
      
      {/* TOOLTIP */}
      {tooltip.visible && (
        <div
          style={{
            position: "absolute",
            left: tooltip.x + 15,
            top: tooltip.y - 10,
            background: "rgba(0, 0, 0, 0.9)",
            color: "white",
            padding: "12px 14px",
            borderRadius: "8px",
            fontSize: "12px",
            pointerEvents: "none",
            zIndex: 1000,
            boxShadow: "0 6px 16px rgba(0, 0, 0, 0.3)",
            lineHeight: "1.5",
            maxWidth: "200px",
            border: "1px solid rgba(255,255,255,0.3)",
            backdropFilter: "blur(2px)"
          }}
          dangerouslySetInnerHTML={{ __html: tooltip.content }}
        />
      )}
    </div>
  );
}