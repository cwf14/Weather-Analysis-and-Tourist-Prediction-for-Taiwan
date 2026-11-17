import React from 'react';
import { Container, Typography, Paper, Box} from '@mui/material';
import TouristLineChart from '../components/TouristChart-Taiwan';
import AskAIButton from '../components/AskAIButton';

const TouristTrend = () => {
  return (
    <div style={{ backgroundColor: '#f3f3ecff', minHeight: '100vh', paddingBottom: '2rem', color: '#1e1e1e' }}>
      
      <Container maxWidth="lg" sx={{ pt: 4 }}>
        
        {/* Title Section */}
        <Box sx={{ mb: 4, textAlign: 'left' }}>
            <Typography variant="h4" component="h1" fontWeight="bold" sx={{ color: '#1e1e1e' }}>
                Tourist Trends
            </Typography>
            <Typography variant="subtitle1" sx={{ color: '#666' }}>
                This chart shows the trend of international tourist arrivals to Taiwan, combining historical data from 2015 to August 2025 with forecasts extending to 2027. The forecast is generated using an AI model that analyzes patterns from the historical dataset. The chart highlights yearly growth, seasonal patterns, and peak travel periods, providing insights into Taiwan’s appeal as a global tourist destination.
            </Typography>
        </Box>

        {/* Chart Area */}
        <Paper sx={{ p: 3, backgroundColor: '#fff', border: '1px solid #e0e0e0', borderRadius: 2 }}>
             <TouristLineChart />
        </Paper>

      </Container>
      <AskAIButton />
    </div>
  );
};
export default TouristTrend;