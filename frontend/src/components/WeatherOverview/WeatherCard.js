import {Paper, Box, Typography, Select, MenuItem, FormControl, InputLabel} from '@mui/material';
import { WiStrongWind, WiRain, WiHumidity, WiDaySunny, WiCloud, WiThunderstorm} from 'react-icons/wi';

//Dynamic Weather Icon Based on Condition 
const getWeatherIcon = (precip) => {
    if (precip > 200) return <WiThunderstorm size={50} style={{ color: '#f44336', mb: 0.5 }} />;
    if (precip > 100) return <WiRain size={50} style={{ color: '#2196f3', mb: 0.5 }} />;
    if (precip > 50) return <WiCloud size={50} style={{ color: '#90caf9', mb: 0.5 }} />;
    return <WiDaySunny size={50} style={{ color: '#ffb300', mb: 0.5 }} />;
  };

export default function WeatherCard({
  city,
  onCityChange,
  month, // This will now receive the dynamic current month
  maxTemp,
  minTemp,
  avgTemp,
  condition,
  humidity,
  wind,
  precipitation,
}) {
  return (
    <Paper
      sx={{
        p: { xs: 2, md: 3 },
        borderRadius: 6,
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        background: '#ffffff',
        maxWidth: 900,
        mx: 'auto',
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: { xs: 3, md: 4 },
      }}
    >
      {/* Left section - Month & City*/}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minWidth: { xs: '100%', md: 180 },
          alignItems: { xs: 'center', md: 'center' },
          gap: 1,
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontSize: { xs: '30px', md: '34px' },
            fontWeight: 800,
            color: '#333',
            fontFamily: 'Poppins, sans-serif',
            lineHeight: 1,
            textTransform: 'uppercase', // Makes the month look cleaner
            letterSpacing: 1,
          }}
        >
          {month}
        </Typography>

        <FormControl size="small" sx={{ width: '100%', maxWidth: 160, mt: 1 }}>
          <InputLabel>City</InputLabel>
          <Select
            value={city}
            label="City"
            onChange={(e) => onCityChange(e.target.value)}
          >
            <MenuItem value="Taipei">Taipei</MenuItem>
            <MenuItem value="New Taipei">New Taipei</MenuItem>
            <MenuItem value="Taichung">Taichung</MenuItem>
            <MenuItem value="Tainan">Tainan</MenuItem>
            <MenuItem value="Kaohsiung">Kaohsiung</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Middle section -Compact Condition */}
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          borderRadius: 4,
          background: '#f5fbff',
          border: '1px solid #e3f2fd',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 130, // Kept small to save space
        }}
      >
        {getWeatherIcon(precipitation)}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#555' }}>
          {condition}
        </Typography>
        <Typography variant="subtitle2" color="text.secondary" sx={{ pt: 1, fontWeight: 800 }}>
          Avg: {avgTemp}°C
        </Typography>
      </Paper>

      {/* Right section -Data metrics  */}
      <Box
        sx={{
          flex: 1,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {/* Temp Row */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            gap: 4,
            borderBottom: '1px solid #f0f0f0',
            pb: 1,
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#d32f2f' }}>
              {maxTemp}°
            </Typography>
            <Typography variant="caption" color="text.secondary">Max</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#1976d2' }}>
              {minTemp}°
            </Typography>
            <Typography variant="caption" color="text.secondary">Min</Typography>
          </Box>
        </Box>

        {/* Metrics Row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-around' }}>
          <Box sx={{ textAlign: 'center' }}>
            <WiRain size={32} style={{ color: '#2196f3', verticalAlign: 'bottom' }} />
            <Typography variant="body2" fontWeight={600}>{precipitation}mm</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <WiStrongWind size={32} style={{ color: '#4caf50', verticalAlign: 'bottom' }} />
            <Typography variant="body2" fontWeight={600}>{wind}m/s</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <WiHumidity size={32} style={{ color: '#2196f3', verticalAlign: 'bottom' }} />
            <Typography variant="body2" fontWeight={600}>{humidity}%</Typography>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}