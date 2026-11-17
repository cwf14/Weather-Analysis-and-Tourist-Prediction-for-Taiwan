import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

export default function TemperatureTrendLineCharts({ data }) {
  const ref = useRef();
  const [tooltip, setTooltip] = useState({ visible: false, content: "", x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  // Handle responsive chart sizing
  useEffect(() => {
    const updateDimensions = () => {
      const container = ref.current.parentElement;
      const containerWidth = container.clientWidth;
      const width = Math.min(containerWidth - 40, 1200);
      const height = Math.max(width * 0.6, 500);
      setDimensions({ width, height });
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  useEffect(() => {
    if (!data || data.length === 0) return;

    // Compute monthly averaged max/min temperatures
    const monthly = d3.groups(data, d => d.Month)
      .map(([month, rows]) => {
        const maxTemps = rows.map(r => +r.Temperature_Max_C).filter(t => !isNaN(t));
        const minTemps = rows.map(r => +r.Temperature_Min_C).filter(t => !isNaN(t));

        if (!maxTemps.length || !minTemps.length) return null;

        return {
          month: +month,
          monthName: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][month-1],
          maxTemp: d3.mean(maxTemps),
          minTemp: d3.mean(minTemps),
          range: d3.mean(maxTemps) - d3.mean(minTemps)
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.month - b.month);

    if (monthly.length === 0) return;

    const monthNames = monthly.map(d => d.monthName);

    // Clear previous render
    d3.select(ref.current).selectAll("*").remove();

    // Chart margins
    const margin = { top: 60, right: 150, bottom: 80, left: 80 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    // SVG root
    const svg = d3.select(ref.current)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .style("background", "#f8fafc")
      .style("border-radius", "8px")
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // X scale (months)
    const x = d3.scalePoint()
      .domain(monthNames)
      .range([0, width])
      .padding(0.5);

    // Y scale (temperature)
    const allTemps = monthly.flatMap(d => [d.maxTemp, d.minTemp]);
    const y = d3.scaleLinear()
      .domain([d3.min(allTemps) - 2, d3.max(allTemps) + 2])
      .range([height, 0])
      .nice();

    // Gradient for shaded area between lines
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
      .attr("id", "temperature-gradient")
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "0%").attr("y2", "100%");

    gradient.append("stop").attr("offset", "0%").attr("stop-color", "#ef5350").attr("stop-opacity", 0.3);
    gradient.append("stop").attr("offset", "100%").attr("stop-color", "#42a5f5").attr("stop-opacity", 0.3);

    // Area between max/min temperature lines
    const area = d3.area()
      .x(d => x(d.monthName))
      .y0(d => y(d.maxTemp))
      .y1(d => y(d.minTemp))
      .curve(d3.curveMonotoneX);

    svg.append("path")
      .datum(monthly)
      .attr("fill", "url(#temperature-gradient)")
      .attr("d", area);

    // Line generators
    const maxLine = d3.line()
      .x(d => x(d.monthName))
      .y(d => y(d.maxTemp))
      .curve(d3.curveMonotoneX);

    const minLine = d3.line()
      .x(d => x(d.monthName))
      .y(d => y(d.minTemp))
      .curve(d3.curveMonotoneX);

    // Max/Min temperature lines
    const maxLinePath = svg.append("path")
      .datum(monthly)
      .attr("fill", "none")
      .attr("stroke", "#ef5350")
      .attr("stroke-width", 4)
      .attr("stroke-linecap", "round")
      .attr("d", maxLine);

    const minLinePath = svg.append("path")
      .datum(monthly)
      .attr("fill", "none")
      .attr("stroke", "#42a5f5")
      .attr("stroke-width", 4)
      .attr("stroke-linecap", "round")
      .attr("d", minLine);

    // Data points + interactive tooltip
    monthly.forEach(d => {
      // Max temperature point
      const maxCircle = svg.append("circle")
        .attr("cx", x(d.monthName))
        .attr("cy", y(d.maxTemp))
        .attr("r", 6)
        .attr("fill", "#ef5350")
        .attr("stroke", "#fff")
        .attr("stroke-width", 2)
        .style("cursor", "pointer")
        .on("mouseover", (event) => {
          maxLinePath.attr("stroke", "#c62828");
          maxCircle.attr("fill", "#c62828").attr("r", 8);

          const rect = ref.current.getBoundingClientRect();
          setTooltip({
            visible: true,
            content: `${d.monthName}<br/>High: ${d.maxTemp.toFixed(1)}°C`,
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
          });
        })
        .on("mouseout", () => {
          maxLinePath.attr("stroke", "#ef5350");
          maxCircle.attr("fill", "#ef5350").attr("r", 6);
          setTooltip({ visible: false, content: "", x: 0, y: 0 });
        });

      // Min temperature point
      const minCircle = svg.append("circle")
        .attr("cx", x(d.monthName))
        .attr("cy", y(d.minTemp))
        .attr("r", 6)
        .attr("fill", "#42a5f5")
        .attr("stroke", "#fff")
        .attr("stroke-width", 2)
        .style("cursor", "pointer")
        .on("mouseover", (event) => {
          minLinePath.attr("stroke", "#1565c0");
          minCircle.attr("fill", "#1565c0").attr("r", 8);

          const rect = ref.current.getBoundingClientRect();
          setTooltip({
            visible: true,
            content: `${d.monthName}<br/>Low: ${d.minTemp.toFixed(1)}°C<br/>Range: ${d.range.toFixed(1)}°C`,
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
          });
        })
        .on("mouseout", () => {
          minLinePath.attr("stroke", "#42a5f5");
          minCircle.attr("fill", "#42a5f5").attr("r", 6);
          setTooltip({ visible: false, content: "", x: 0, y: 0 });
        });
    });

    // X axis
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .style("font-size", "13px")
      .style("fill", "#666");

    // Y axis
    svg.append("g")
      .call(d3.axisLeft(y))
      .selectAll("text")
      .style("font-size", "13px")
      .style("fill", "#666");

    // Horizontal grid lines
    svg.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(y).tickSize(-width).tickFormat(""))
      .style("opacity", 0.1);

    // X axis label
    svg.append("text")
      .attr("transform", `translate(${width / 2}, ${height + margin.bottom - 20})`)
      .style("text-anchor", "middle")
      .style("font-size", "15px")
      .style("font-weight", "bold")
      .style("fill", "#333")
      .text("Month");

    // Y axis label
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left + 35)
      .attr("x", -height / 2)
      .style("text-anchor", "middle")
      .style("font-size", "15px")
      .style("font-weight", "bold")
      .style("fill", "#333")
      .text("Temperature (°C)");

    // Legend (top right)
    const legend = svg.append("g")
      .attr("transform", `translate(${width - 120}, -20)`);

    legend.append("rect")
      .attr("x", -10)
      .attr("y", -10)
      .attr("width", 120)
      .attr("height", 50)
      .attr("fill", "white")
      .attr("stroke", "#ddd")
      .attr("stroke-width", 1)
      .attr("rx", 5)
      .style("opacity", 0.9);

    legend.append("circle")
      .attr("cx", 0)
      .attr("cy", 5)
      .attr("r", 6)
      .attr("fill", "#ef5350");

    legend.append("text")
      .attr("x", 15)
      .attr("y", 9)
      .style("font-size", "12px")
      .style("fill", "#333")
      .style("font-weight", "500")
      .text("High Temp");

    legend.append("circle")
      .attr("cx", 0)
      .attr("cy", 25)
      .attr("r", 6)
      .attr("fill", "#42a5f5");

    legend.append("text")
      .attr("x", 15)
      .attr("y", 29)
      .style("font-size", "12px")
      .style("fill", "#333")
      .style("font-weight", "500")
      .text("Low Temp");

  }, [data, dimensions]);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <div 
        ref={ref} 
        style={{ 
          width: "100%", 
          display: "flex", 
          justifyContent: "center",
          minHeight: "600px"
        }}
      ></div>
      
      {tooltip.visible && (
        <div
          style={{
            position: "absolute",
            left: tooltip.x + 10,
            top: tooltip.y - 10,
            background: "rgba(0, 0, 0, 0.8)",
            color: "white",
            padding: "10px 14px",
            borderRadius: "6px",
            fontSize: "13px",
            pointerEvents: "none",
            zIndex: 1000,
            transform: "translateY(-50%)",
            maxWidth: "200px",
            lineHeight: "1.4",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
          }}
          dangerouslySetInnerHTML={{ __html: tooltip.content }}
        />
      )}
    </div>
  );
}
