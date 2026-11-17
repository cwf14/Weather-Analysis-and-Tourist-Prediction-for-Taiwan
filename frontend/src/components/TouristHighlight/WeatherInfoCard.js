import { Paper, Typography, Box, Grid } from '@mui/material';

const format = (val) => (typeof val === 'number' ? Math.round(val) : val);

export default function WeatherInfoCard({ month, city, weather }) {
  return (
    <Paper 
      sx={{ p: 3, borderRadius: 4, bgcolor: 'white', boxShadow: '0 8px 32px rgba(0,0,0,0.08)',display: 'flex',
            flexDirection: 'column',gap: 1 }}
    >
      <Typography variant="h6" sx={{ mb: 1 }}>
        {month} Average Weather Near {city}
      </Typography>

      {/* UPPER SECTION: Icon | Avg Temp | Max/Min */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 6 }}>

        {/* Average Temp */}
        <Box sx={{ textAlign: 'center'}}>
          <Typography variant="h3" sx={{ fontWeight: 700, lineHeight: 1, px: 1}}>
            {format(weather.temp)}°
          </Typography>
          <Typography variant="caption" color="text.secondary">Avg</Typography>
        </Box>

        {/* Max / Min Vertical Stack */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, borderLeft: '2px solid #f0f0f0', pl: 3 }}>
            <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                <strong>Max:</strong> {format(weather.max)}°
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                <strong>Min:</strong> {format(weather.min)}°
            </Typography>
        </Box>
      </Box>

      {/* LOWER SECTION: Metrics (Rain, Humidity, Wind) */}
      <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #f5f5f5', display: 'flex', justifyContent: 'center' }}>
        <Grid container spacing={2} sx={{ textAlign: 'center' }}>
            <Grid item xs={4}>
                <Typography variant="body2" color="text.secondary">Rain</Typography>
                <Typography variant="subtitle1" fontWeight="bold">
                    {format(weather.precip)} mm
                </Typography>
            </Grid>
            <Grid item xs={4}>
                <Typography variant="body2" color="text.secondary">Wind</Typography>
                <Typography variant="subtitle1" fontWeight="bold">
                    {format(weather.wind)} km/h
                </Typography>
            </Grid>
            <Grid item xs={4}>
                <Typography variant="body2" color="text.secondary">Humidity</Typography>
                <Typography variant="subtitle1" fontWeight="bold">
                    {format(weather.humidity)}%
                </Typography>
            </Grid>
        </Grid>
      </Box>

    </Paper>
  );
}