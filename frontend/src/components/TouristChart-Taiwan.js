import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Box, Typography, CircularProgress, Slider, Grid
} from '@mui/material';

const TOTAL_COLOR = '#4A4A4A';

// Updated Slider Marks to include 2027
const MARKS = [
  { value: 2015, label: "2015" },
  { value: 2019, label: "2019" },
  { value: 2023, label: "2023" },
  { value: 2027, label: "2027" }
];

const TouristLineChart = () => { 
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Default range: 2015 to 2027 (Full View)
  const [yearRange, setYearRange] = useState([2015, 2027]);

  const handleYearChange = (e, newValue) => {
    setYearRange(newValue);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch total trend from API (Requesting up to 2027)
        // Backend logic combines History + Prediction 
        const response = await fetch(`http://127.0.0.1:8000/api/tourist/total-trend?target_year=2027`);
        if (!response.ok) throw new Error("Failed to fetch tourist trend data");
        
        const jsonData = await response.json();

        const processedData = jsonData.map(item => ({
            ...item,
            // Create formatted date string for chart
            date: `${item.Year}-${String(item.Month).padStart(2, '0')}`,
            // Ensure numeric for chart
            Total: parseInt(item.Total, 10)
        }));

        setData(processedData);
      } catch (error) {
        console.error('Error loading Tourist Data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter data based on the slider
  const filteredData = data.filter(d => {
    const yr = parseInt(d.Year, 10);
    return yr >= yearRange[0] && yr <= yearRange[1];
  });

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Chart Title */}
      <Typography 
        variant="h6" 
        fontWeight="bold" 
        sx={{ color: '#000', mb: 2, textAlign: 'center' }}
      >
        International Tourist Arrivals to Taiwan (History + Forecast)
      </Typography>
      
      {/* Line Chart */}
      <Box sx={{ width: '100%', height: 450 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={filteredData}
            margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              minTickGap={40}
              tickMargin={10}
              label={{ value: 'Date (Year-Month)', position: 'insideBottom', offset: -20, fill: '#666', fontSize: 12             
  }}
            />
            <YAxis
              tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
              tick={{ fontSize: 12 }}
              label={{
                value: 'Arrivals (Millions)', angle: -90, position: 'insideLeft',
                offset: 0, fill: '#666', fontSize: 12, style: { textAnchor: 'middle' }
              }}
            />
            <Tooltip 
              formatter={(value) => [new Intl.NumberFormat('en-US').format(value), "Tourists"]}
              labelStyle={{ color: '#333', fontWeight: 'bold' }}
            />
            <Legend verticalAlign="top" height={36}/>

            <Line
              type="monotone"
              dataKey="Total"
              stroke={TOTAL_COLOR}
              strokeWidth={2.5}
              activeDot={{ r: 6 }}
              dot={false}
              name="Total Tourist Arrivals"
              isAnimationActive={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
      
      {/* Year Range Slider */}
      <Grid container justifyContent="center" spacing={2} sx={{ mb: 4, mt: 1 }}>
        <Grid item xs={12}>
          <Typography
            gutterBottom
            sx={{
              color: '#666', mb: 1, fontSize: '0.9rem', textAlign: 'center',
              textTransform: 'uppercase', letterSpacing: '1px', px: 1 
            }}
          >
            Filter Time Range (Year)
          </Typography>
          
          <Box sx={{ px:4, mx: 'auto' }}>
            <Slider
              value={yearRange}
              onChange={handleYearChange}
              valueLabelDisplay="auto"
              marks={MARKS}
              min={2015}
              max={2027} 
              step={1}
              sx={{
                color: '#1f77b4',
                height: 6,
                '& .MuiSlider-track': { border: 'none' },
                '& .MuiSlider-rail': { opacity: 0.3, backgroundColor: '#ddd' },
                '& .MuiSlider-thumb': {
                  height: 20, width: 20, backgroundColor: '#fff', border: '4px solid currentColor',
                  '&:hover, &.Mui-focusVisible': { boxShadow: '0 0 0 8px rgba(31, 119, 180, 0.16)' },
                },
                '& .MuiSlider-valueLabel': {
                  backgroundColor: '#1f77b4', fontWeight: 'bold', borderRadius: '4px',
                },
                '& .MuiSlider-markLabel': { fontSize: '0.85rem', marginTop: '8px' },
                '& .MuiSlider-markLabelActive': { color: '#1e1e1e', fontWeight: 'bold' }
              }}
            />
          </Box>
        </Grid>
      </Grid>
      
    </Box>
  );
};

export default TouristLineChart;