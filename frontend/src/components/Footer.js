import React from 'react';
import { Box, Container, Grid, Typography, Stack, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export default function Footer() {
  return (
    <Box 
      component="footer" 
      sx={{ 
        bgcolor: '#e7e7e9ff', 
        color: '#141414ff', 
        py: 4, 
        mt: 'auto' 
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={6}>
          
          {/* Column 1: Brand & Description */}
          <Grid item xs={12} md={4}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: '#27b4a6ff' }}>
              Taiwan Insights
            </Typography>
            <Typography variant="body2" sx={{ color: '#3a3a3aff', lineHeight: 1.8, maxWidth: 300 }}>
              An AI-powered dashboard providing weather predictions and tourism analytics for Taiwan's major cities. 
              Helping travelers plan smarter.
            </Typography>
          </Grid>

          {/* Column 2: Quick Links */}
          <Grid item xs={12} md={4}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
              Explore
            </Typography>
            <Stack spacing={1.5}>
              {[
                { name: 'Home', path: '/' },
                { name: 'Weather Trends', path: '/weather-trends' },
                { name: 'Tourist Trends', path: '/tourist-trends' },
              ].map((link) => (
                <Link 
                  key={link.name}
                  component={RouterLink} 
                  to={link.path} 
                  color="inherit" 
                  underline="hover" 
                  sx={{ color: '#3a3a3aff', fontSize: '0.95rem', '&:hover': { color: '#48cdc0' } }}
                >
                  {link.name}
                </Link>
              ))}
            </Stack>
          </Grid>

          {/* Column 3: Data Sources*/}
          <Grid item xs={12} md={4}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
              Data Sources
            </Typography>
            <Stack spacing={2}>
              {/* Weather Group */}
              <Box>
                <Typography variant="subtitle2" sx={{ color: '#141414ff', fontWeight: 'bold', mb: 0.5 }}>
                  Weather Data:
                </Typography>
                <Stack spacing={0.5}>
                  <Link 
                    href="https://www.cwa.gov.tw/V8/E/C/Statistics/monthlydata.html" 
                    target="_blank" rel="noopener" color="inherit" underline="hover" sx={{ color: '#3a3a3aff', fontSize: '0.85rem' }}
                  >
                    • Central Weather Admin (Monthly)
                  </Link>
                  <Link 
                    href="https://rdc28.cwa.gov.tw/TDB/" 
                    target="_blank" rel="noopener" color="inherit" underline="hover" sx={{ color: '#3a3a3aff', fontSize: '0.85rem' }}
                  >
                    • Taiwan Typhoon Database
                  </Link>
                </Stack>
              </Box>

              {/* Tourism Group */}
              <Box>
                <Typography variant="subtitle2" sx={{ color: '#141414ff', fontWeight: 'bold', mb: 0.5 }}>
                  Tourism Statistics:
                </Typography>
                <Stack spacing={0.5}>
                  <Link 
                    href="https://stat.taiwan.net.tw/scenicSpot" 
                    target="_blank" rel="noopener" color="inherit" underline="hover" sx={{ color: '#3a3a3aff', fontSize: '0.85rem' }}
                  >
                    • Scenic Spot Visits (By City)
                  </Link>
                  <Link 
                    href="https://stat.taiwan.net.tw/inboundSearch" 
                    target="_blank" rel="noopener" color="inherit" underline="hover" sx={{ color: '#3a3a3aff', fontSize: '0.85rem' }}
                  >
                    • International Tourist Arrivals
                  </Link>
                </Stack>
              </Box>
            </Stack>
          </Grid>
        </Grid>

      </Container>
    </Box>
  );
}