import { Box, Typography, Paper } from '@mui/material';
import heroImg from '../assets/images/Taiwan.jpg';

export default function Hero() {
  return (
    <Box>
      <Typography
        variant="h4"
        align="left"
        sx={{
          fontSize: { xs: '2rem', md: '2.5rem' },
          fontWeight: 800,
          mt: 2,
          mb: 2,
          color: 'black',
        }}
      >
        Taiwan Weather & Tourist Insights
      </Typography>

    <Paper
      sx={{
        position: 'relative',
        height: { xs: 300, md: 400 },
        backgroundImage: `url(${heroImg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        borderRadius: 1,
        mb: 4,
        overflow: 'hidden',
      }}
    >
      {/* Text Section Below */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          color: 'white',
          p: { xs: 2, md: 4 },
          textAlign: 'left',
        }}
      >
        <Typography variant="h5" sx={{ textShadow: '4px 4px 8px rgba(0,0,0,0.6)', mb: 1.8, fontSize: { xs: '1.2rem', md: '1.8rem' }, fontWeight: 800 }}>
          Your Guide for Weather and Tourist Updates
        </Typography>
        <Typography variant="body1" sx={{ textShadow: '2px 2px 4px rgba(0,0,0,0.6)', fontSize: { xs: '0.8rem', md: '1.2rem' } }}>
          Discover the weather conditions and tourist information for Taiwan. This web platform offers easy access to forecasts, travel tips, and safety insights, designed for tourists, tourism boards, and local authorities to plan with confidence.
        </Typography>
      </Box>
    </Paper>
  </Box>
  );
}
