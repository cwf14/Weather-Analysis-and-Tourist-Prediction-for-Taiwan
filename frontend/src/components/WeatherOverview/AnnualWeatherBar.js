import { Box, Typography, Paper } from '@mui/material';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import CloudIcon from '@mui/icons-material/Cloud';
import OpacityIcon from '@mui/icons-material/Opacity';
import ThunderstormIcon from '@mui/icons-material/Thunderstorm';

// Helper to pick icon based on rain data
const getWeatherIcon = (precip) => {
  if (precip > 200) return <ThunderstormIcon />;
  if (precip > 100) return <OpacityIcon />;
  if (precip > 50) return <CloudIcon />;
  return <WbSunnyIcon />;
};

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function AnnualWeatherBar({ data, city, selectedMonth }) {
  // If data isn't loaded yet, show a skeleton or placeholder
  if (!data || data.length === 0) {
    return (
      <Paper sx={{ p: 3, borderRadius: 6, background: '#48cdc0ff', textAlign: 'center', color: 'white' }}>
        <Typography>Loading Annual Data...</Typography>
      </Paper>
    );
  }

  // Sort data by month to ensure Jan-Dec order
  const sortedData = [...data].sort((a, b) => a.Month - b.Month);

  return (
    <Paper sx={{ p: 3, borderRadius: 6, background: '#48cdc0ff' }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'white' }}>
        Annual Average Weather in {city}
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))', // Responsive Grid
          gap: 1.5,
          mt: 2,
        }}
      >
        {sortedData.map((row) => {
          // Check if this box corresponds to the selected month
          const isSelected = row.Month === selectedMonth;

          return (
            <Paper
              key={row.Month}
              elevation={isSelected ? 6 : 1} // Lift up selected month
              sx={{
                p: 1.5,
                borderRadius: 4,
                textAlign: 'center',
                // Change background if selected
                background: isSelected ? '#fff9c4' : '#e0f7fa', 
                // Add border if selected
                border: isSelected ? '2px solid #fbc02d' : '2px solid transparent', 
                color: '#013c36ff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                transform: isSelected ? 'scale(1.05)' : 'scale(1)', // Slight zoom effect
                transition: 'all 0.3s ease',
                cursor: 'default'
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                {monthNames[row.Month - 1]}
              </Typography>
              
              <Box sx={{ my: 0.5, color: isSelected ? '#f57f17' : '#00bcd4' }}>
                {getWeatherIcon(row.Precipitation_Total_mm)}
              </Box>
              
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {Math.round(row.Temperature_Mean_C)}°C
              </Typography>
              
              <Typography variant="caption" color="text.secondary">
                {Math.round(row.WindSpeed_Max_ms)} m/s
              </Typography>
            </Paper>
          );
        })}
      </Box>
    </Paper>
  );
}