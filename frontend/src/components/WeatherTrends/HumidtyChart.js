import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

export default function HumidityChart({ data }) {
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
    if (!data || data.length === 0) {
      console.log('No data provided to HumidityChart');
      return;
    }

    // Calculate monthly averages
    const monthly = d3.groups(data, d => d.Month)
      .map(([month, rows]) => {
        const humidityValues = rows
          .map(r => +r.Humidity_Mean_perc)
          .filter(h => !isNaN(h) && h != null);
        
        if (humidityValues.length === 0) return null;
        
        return {
          month: +month,
          monthName: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][month-1],
          humidity: d3.mean(humidityValues),
          min: d3.min(humidityValues),
          max: d3.max(humidityValues)
        };
      })
      .filter(d => d !== null)
      .sort((a, b) => a.month - b.month);

    if (monthly.length === 0) {
      console.log('No valid humidity data found');
      return;
    }

    // Clear previous chart
    d3.select(ref.current).selectAll("*").remove();

    const margin = { top: 60, right: 30, bottom: 70, left: 70 }; 
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

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
      .padding(0.4);

    const y = d3.scaleLinear()
      .domain([0, 100]) // Humidity percentage range
      .range([height, 0])
      .nice();

    // Color scale for humidity levels
    const colorScale = d3.scaleSequential()
      .domain([0, 100])
      .interpolator(d3.interpolateYlGnBu); // Yellow to Green to Blue

    // Bars with hover effects
    svg.selectAll(".bar")
      .data(monthly)
      .join("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.monthName))
      .attr("y", d => y(d.humidity))
      .attr("width", x.bandwidth())
      .attr("height", d => height - y(d.humidity))
      .attr("fill", d => colorScale(d.humidity))
      .attr("rx", 3)
      .style("cursor", "pointer")
      .style("transition", "all 0.3s ease")
      .on("mouseover", function(event, d) {
        // Darken the bar on hover
        d3.select(this)
          .transition()
          .duration(200)
          .attr("opacity", 0.7)
          .attr("stroke", "#2d3748")
          .attr("stroke-width", 2);
        
        const rect = ref.current.getBoundingClientRect();
        setTooltip({
          visible: true,
          content: `
            <strong>${d.monthName}</strong><br/>
            Avg Humidity: ${d.humidity.toFixed(1)}%<br/>
            Range: ${d.min.toFixed(1)}% - ${d.max.toFixed(1)}%
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
        d3.select(this)
          .transition()
          .duration(200)
          .attr("opacity", 1)
          .attr("stroke", "none")
          .attr("stroke-width", 0);
        
        setTooltip({ visible: false, content: "", x: 0, y: 0 });
      });

    // Add value labels on bars 
    svg.selectAll(".bar-label")
      .data(monthly)
      .join("text")
      .attr("class", "bar-label")
      .attr("x", d => x(d.monthName) + x.bandwidth() / 2)
      .attr("y", d => y(d.humidity) - 10)
      .attr("text-anchor", "middle")
      .style("font-size", "13px")
      .style("font-weight", "700")
      .style("fill", "#2d3748")
      .style("text-shadow", "0 1px 2px rgba(255,255,255,0.8)")
      .text(d => `${d.humidity.toFixed(0)}%`);

    // Grid lines
    svg.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(y)
        .tickSize(-width)
        .tickFormat("")
      )
      .style("opacity", 0.15)
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
      .attr("y", -margin.left + 30)
      .attr("x", -height / 2)
      .style("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .style("fill", "#333")
      .text("Humidity (%)");

    const legendWidth = 180;

    // Legend for humidity levels
    const mainSvg = d3.select(ref.current).select("svg");
    const legend = mainSvg.append("g")
      .attr("transform", `translate(${width + margin.left - legendWidth - 5}, ${25})`);

    // Legend title
    legend.append("text")
      .attr("x", 0)
      .attr("y", -5)
      .text("Humidity Level")
      .style("font-size", "12px")
      .style("font-weight", "700")
      .style("fill", "#555");

    // Dry indicator
    legend.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 14)
      .attr("height", 14)
      .attr("fill", colorScale(30))
      .attr("rx", 2)
      .attr("stroke", "#999")
      .attr("stroke-width", 1);

    legend.append("text")
      .attr("x", 20)
      .attr("y", 10)
      .text("Dry")
      .style("font-size", "11px")
      .style("fill", "#666")
      .style("font-weight", "600");

    // Comfortable indicator
    legend.append("rect")
      .attr("x", 50)
      .attr("y", 0)
      .attr("width", 14)
      .attr("height", 14)
      .attr("fill", colorScale(60))
      .attr("rx", 2)
      .attr("stroke", "#999")
      .attr("stroke-width", 1);

    legend.append("text")
      .attr("x", 70)
      .attr("y", 10)
      .text("Comfort")
      .style("font-size", "11px")
      .style("fill", "#666")
      .style("font-weight", "600");

    // Humid indicator
    legend.append("rect")
      .attr("x", 115)
      .attr("y", 0)
      .attr("width", 14)
      .attr("height", 14)
      .attr("fill", colorScale(85))
      .attr("rx", 2)
      .attr("stroke", "#999")
      .attr("stroke-width", 1);

    legend.append("text")
      .attr("x", 135)
      .attr("y", 10)
      .text("Humid")
      .style("font-size", "11px")
      .style("fill", "#666")
      .style("font-weight", "600");

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