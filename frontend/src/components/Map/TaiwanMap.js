import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Box, IconButton, Paper, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import RestartAltIcon from '@mui/icons-material/RestartAlt'; 

// Inline styles for labels
const D3MapStyles = () => (
  <style>{`
    .map-label {
      font-family: 'Roboto', 'Helvetica', sans-serif;
      font-size: 18px;
      font-weight: 800;
      fill: #000000;
      text-anchor: middle;
      pointer-events: none;
      stroke: white;
      stroke-width: 3px;
      paint-order: stroke;
    }
  `}</style>
);

const MAJOR_CITIES = {
  '台北市': 'Taipei',
  '新北市': 'New Taipei',
  '台中市': 'Taichung',
  '台南市': 'Tainan',
  '高雄市': 'Kaohsiung',
};

const colorMap = {
  '台北市': '#c1f3ffff',
  '新北市': '#feeeca',
  '台中市': '#e0f3db',
  '台南市': '#d0d1e6',
  '高雄市': '#ccece6',
};

const TaiwanMap = ({ onFeatureClick }) => {
  const svgRef = useRef(null);
  const gRef = useRef(null);
  const zoomBehaviorRef = useRef(null); //Store zoom behavior here

  const width = 800;
  const height = 1100;

  //  Zoom Handlers
  const handleZoomIn = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomBehaviorRef.current.scaleBy, 1.5); // Scale up by 1.5x
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomBehaviorRef.current.scaleBy, 0.6); // Scale down
    }
  };

  const handleResetZoom = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(750) // Smoother transition for reset
        .call(zoomBehaviorRef.current.transform, d3.zoomIdentity); // Reset to default
    }
  };

  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;

    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);

    g.selectAll('*').remove();

    // Define Zoom Behavior
    const zoom = d3.zoom()
      .scaleExtent([1, 8]) 
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    // Save the zoom behavior to the Ref so buttons can use it
    zoomBehaviorRef.current = zoom;

    // Attach zoom to SVG
    svg.call(zoom);

    svg.on("dblclick.zoom", null);

    fetch('https://raw.githubusercontent.com/g0v/twgeojson/master/json/twCounty2010.geo.json')
      .then(r => r.json())
      .then(geoData => {
        // Manually center on Taiwan 
        const projection = d3.geoMercator()
          .center([121, 23]) 
          .scale(10000)       
          .translate([width / 2, height / 2]); 
        const path = d3.geoPath().projection(projection);

        // Draw counties
        g.selectAll('path')
          .data(geoData.features)
          .join('path')
          .attr('d', path)
          .attr('fill', d => colorMap[d.properties.COUNTYNAME] || '#e0e0e0')
          .attr('stroke', '#999')
          .attr('stroke-width', 1)
          .style('cursor', d => MAJOR_CITIES[d.properties.COUNTYNAME] ? 'pointer' : 'default')
          .on('mouseover', function (event, d) {
            if (MAJOR_CITIES[d.properties.COUNTYNAME]) {
              // Dark hover color
              d3.select(this).attr('fill', '#455a64');
            }
          })
          .on('mouseout', function (event, d) {
            if (MAJOR_CITIES[d.properties.COUNTYNAME]) {
              d3.select(this).attr('fill', colorMap[d.properties.COUNTYNAME] || '#e0e0e0');
            }
          })
          .on('click', (event, d) => {
            event.stopPropagation();
            const cityName = MAJOR_CITIES[d.properties.COUNTYNAME];
            if (cityName && onFeatureClick) {
              onFeatureClick(cityName);
            }
          });

        // Draw labels
        g.selectAll('text')
          .data(geoData.features)
          .join('text')
          .attr('class', 'map-label')
          .attr('transform', d => {
            const centroid = path.centroid(d);
            if (isNaN(centroid[0])) return null;

            const offset = {
              '台北市': [0, -12],
              '新北市': [5, 20],
              '台中市': [10, 9],
              '台南市': [-15, 10],
              '高雄市': [10, 9],
            };
            const [dx, dy] = offset[d.properties.COUNTYNAME] || [0, 0];
            return `translate(${centroid[0] + dx}, ${centroid[1] + dy})`;
          })
          .text(d => MAJOR_CITIES[d.properties.COUNTYNAME] || '')
          .attr('opacity', d => MAJOR_CITIES[d.properties.COUNTYNAME] ? 1 : 0);
      });
  }, [onFeatureClick]);

  return (
    <>
      <D3MapStyles />
      <Box sx={{
        width: '100%',
        height: { xs: 500, md: 700 },
        bgcolor: '#f8fafc',
        borderRadius: 4,
        overflow: 'hidden',
        boxShadow: 4,
        cursor: 'grab',
        position: 'relative', // Important for absolute positioning of buttons
        '&:active': { cursor: 'grabbing' }
      }}>
        
        {/* Floating Zoom Controls */}
        <Paper 
          elevation={3}
          sx={{
            position: 'absolute',
            top: 20,
            left: 20,
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 2,
            overflow: 'hidden',
            backgroundColor: 'rgba(255, 255, 255, 0.9)'
          }}
        >
          <Tooltip title="Zoom In" placement="right">
            <IconButton onClick={handleZoomIn} aria-label="zoom in" size="small">
              <AddIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Zoom Out" placement="right">
            <IconButton onClick={handleZoomOut} aria-label="zoom out" size="small">
              <RemoveIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Reset View" placement="right">
            <IconButton onClick={handleResetZoom} aria-label="reset zoom" size="small" sx={{ borderTop: '1px solid #eee' }}>
              <RestartAltIcon />
            </IconButton>
          </Tooltip>
        </Paper>

        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: '100%' }}
        >
          <rect width="100%" height="100%" fill="#f8fafc" />
          <g ref={gRef}></g>
        </svg>
      </Box>
    </>
  );
};

export default TaiwanMap;