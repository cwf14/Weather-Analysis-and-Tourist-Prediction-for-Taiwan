import { useState } from 'react';
import { 
  Paper, Typography, Box, IconButton, Dialog, DialogTitle, 
  DialogContent, DialogContentText, DialogActions, Button, Tooltip 
} from '@mui/material';
import { 
  WbSunny, Cloud, Thunderstorm, Groups, Person, 
  TrendingUp, InfoOutlined 
} from '@mui/icons-material';

// Base configuration for Colors and Theme
const THEME_CONFIG = {
  1: { 
    title: "HIGH SEASON",
    color: "#e8f5e9",
    border: "#4caf50",
    icon: <WbSunny sx={{ fontSize: 40, color: "#ff9800" }} />
  },
  2: { 
    title: "LOW SEASON",
    color: "#fff8e1",
    border: "#ff8f00",
    icon: <Cloud sx={{ fontSize: 40, color: "#90a4ae" }} />
  }
};

export default function SeasonClusterCard({ cluster = 2, data = {} }) {
  const [openHelp, setOpenHelp] = useState(false); // State for popup

  const theme = THEME_CONFIG[cluster] || THEME_CONFIG[2];
  const touristCount = data.tourists || 0;

  // TEXT LOGIC 
  let crowdText = "Moderate Crowds";
  if (touristCount > 2000000) crowdText = "Peak Tourist Volume";
  else if (touristCount > 0 && touristCount < 1500000) crowdText = "Fewer Crowds";
  else if (touristCount === 0) crowdText = "Calculating crowds...";

  const precip = data.precip || 0;
  const temp = data.temp || 0;
  let weatherText = "Warm & Dry Weather";
  if (precip > 100) weatherText = "Rainy & Wet";
  else if (temp < 18) weatherText = "Cool & Comfortable";
  else if (temp > 28 && precip < 50) weatherText = "Hot & Sunny";
  else if (precip > 50) weatherText = "Humid with Showers";

  return (
    <>
      <Paper
        elevation={4}
        sx={{
          p: 1.5,
          borderRadius: 4,
          bgcolor: theme.color,
          border: `3px solid ${theme.border}`,
          mt: 1,
          transition: 'all 0.3s ease',
          position: 'relative' // For positioning the icon if needed
        }}
      >
        {/* Header Row */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          
          {/* Left Side: Icon + Title */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {theme.icon}
            <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, color: cluster === 1 ? '#2e7d32' : '#ef6c00', lineHeight: 1 }}>
                  {theme.title}
                </Typography>
            </Box>
          </Box>

          {/* Right Side: Info Icon */}
          <Tooltip title="How is this determined?">
            <IconButton onClick={() => setOpenHelp(true)} size="small">
              <InfoOutlined fontSize="small" color="action" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Body Content */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {crowdText.includes("Peak") ? <Groups fontSize="small" color="action"/> : <Person fontSize="small" color="action"/>}
              <Typography variant="body1" fontWeight={600}>
              {crowdText}
              </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {weatherText.includes("Rain") ? <Thunderstorm fontSize="small" color="action"/> : <WbSunny fontSize="small" color="action"/>}
              <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
              {weatherText}
              </Typography>
          </Box>
          
          {touristCount > 0 && (
              <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1, 
                  mt: 1, 
                  pt: 1.5, 
                  borderTop: '1px dashed rgba(0,0,0,0.1)' 
              }}>
                   <TrendingUp fontSize="small" color="action" />
                   <Typography variant="body2" sx={{ color: '#555' }}>
                      Predicted Arrivals: <b>{touristCount.toLocaleString()}</b>
                   </Typography>
              </Box>
          )}
        </Box>
      </Paper>

      {/* METHODOLOGY POPUP  */}
      <Dialog open={openHelp} onClose={() => setOpenHelp(false)}>
        <DialogTitle sx={{fontWeight: 'bold'}}>
          How do we determine the season?
        </DialogTitle>
        <DialogContent>
          <DialogContentText paragraph>
            Our AI model analyzes historical weather patterns and tourist behavior to classify each month.
          </DialogContentText>
          
          <Typography variant="subtitle2" fontWeight={700} sx={{mt: 2}}>
            HIGH SEASON criteria:
          </Typography>
          <ul style={{ margin: '5px 0', paddingLeft: '20px', fontSize: '0.9rem', color: '#555' }}>
            <li><b>Volume:</b> Predicted arrivals exceed 2 Million visitors.</li>
            <li><b>Weather:</b> Typically warm (20°C-30°C) and dry precipitation levels.</li>
            <li><b>Peak Months:</b> Often includes Summer.</li>
          </ul>

          <Typography variant="subtitle2" fontWeight={700} sx={{mt: 2}}>
            LOW SEASON criteria:
          </Typography>
          <ul style={{ margin: '5px 0', paddingLeft: '20px', fontSize: '0.9rem', color: '#555' }}>
            <li><b>Volume:</b> Predicted arrivals are lower, offering a quieter experience.</li>
            <li><b>Weather:</b> May involve higher rainfall (100mm) or cooler temperatures.</li>
            <li><b>Opportunity:</b> Best for travelers avoiding crowds.</li>
          </ul>
          
          <Typography variant="caption" display="block" sx={{ mt: 2, fontStyle: 'italic' }}>
            *Data is predicted based on 5-year historical trends using Machine Learning (Random Forest & K-Means Clustering).
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenHelp(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}