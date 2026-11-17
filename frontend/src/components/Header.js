// src/components/Header.js
import { AppBar, Toolbar, Box, Button } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import ContactDialog from './ContactDialog';
import logo from '../assets/images/logo.png';

export default function Header() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/weather-trends', label: 'Weather Trends' },
    { to: '/tourist-trends', label: 'Tourist Trends' },
  ];

  return (
    <AppBar position="static" color="transparent" elevation={0}>
      <Toolbar sx={{ flexDirection: 'column', alignItems: 'stretch', p: 1 }}>
        {/* Logo + Navigation */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 3}}>
            <img src={logo} alt="logo" height={60} />
          </Box>

          {/* Navigation */}
          <Box sx={{ display: 'flex', gap: 3 }}>
            {navLinks.map(({ to, label }) => (
              <Button
                key={to}
                component={Link}
                to={to}
                disableRipple
                sx={{
                  color: 'black',
                  fontWeight: location.pathname === to ? 700 : 500,
                  textTransform: 'none',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    color: '#444',
                    transform: 'scale(1.05)',
                    backgroundColor: 'transparent',
                  },
                }}
              >
                {label}
              </Button>
            ))}
            <Button
              disableRipple
              onClick={() => setOpen(true)}
              sx={{
                backgroundColor: 'black',
                color: 'white',
                fontWeight: 500,
                textTransform: 'none',
                fontSize: '1rem',
                px: 2.5,
                borderRadius: '10px',
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: '#333',
                  transform: 'scale(1.05)',
                },
              }}
            >
              Contact Us
            </Button>
          </Box>
        </Box>
        <ContactDialog open={open} onClose={() => setOpen(false)} />
      </Toolbar>
    </AppBar>
  );
}