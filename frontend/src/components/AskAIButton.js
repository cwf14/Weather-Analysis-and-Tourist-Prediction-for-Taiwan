import React, { useState } from 'react';
import { 
  Fab, Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, TextField, Typography, Box, Chip, CircularProgress, 
  Alert, MenuItem 
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SendIcon from '@mui/icons-material/Send';

export default function AskAIButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    city: 'Taipei',
    month: 7,
    temperature: 30,
    precipitation: 50,
    wind_speed: 5,
    humidity: 70
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAsk = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/simulation/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to get AI analysis');
      
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError('Error connecting to AI service. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <Fab 
        color="primary" 
        aria-label="ask-ai"
        onClick={() => setOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 30,
          right: 50,
          zIndex: 1000,
          bgcolor: '#dad8d8ff',
          '&:hover': { bgcolor: '#969494ff' }
        }}
      >
        <SmartToyIcon />
      </Fab>

      {/* Dialog Window */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SmartToyIcon color="primary" />
          AI Travel Advisor
        </DialogTitle>
        
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" paragraph>
            Simulate a weather scenario to get AI travel advice and safety warnings.
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 2 }}>
            <TextField
              select
              label="City"
              name="city"
              value={formData.city}
              onChange={handleChange}
              size="small"
            >
              {['Taipei', 'New Taipei', 'Taichung', 'Tainan', 'Kaohsiung'].map(c => (
                <MenuItem key={c} value={c}>{c}</MenuItem>
              ))}
            </TextField>

            <TextField
              type="number"
              label="Month"
              name="month"
              value={formData.month}
              onChange={handleChange}
              size="small"
              inputProps={{ min: 1, max: 12 }}
            />

            <TextField
              type="number"
              label="Temperature (°C)"
              name="temperature"
              value={formData.temperature}
              onChange={handleChange}
              size="small"
            />

            <TextField
              type="number"
              label="Rainfall (mm)"
              name="precipitation"
              value={formData.precipitation}
              onChange={handleChange}
              size="small"
            />
            
            <TextField
              type="number"
              label="Wind Speed (m/s)"
              name="wind_speed"
              value={formData.wind_speed}
              onChange={handleChange}
              size="small"
            />

            <TextField
              type="number"
              label="Humidity (%)"
              name="humidity"
              value={formData.humidity}
              onChange={handleChange}
              size="small"
            />
          </Box>

          {/* Loading & Results */}
          <Box sx={{ mt: 3 }}>
            {loading && <CircularProgress size={24} sx={{ display: 'block', mx: 'auto' }} />}
            
            {error && <Alert severity="error">{error}</Alert>}

            {result && (
              <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" color="primary">
                  Prediction: {result.ai_prediction}
                </Typography>
                
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {result.travel_advice}
                </Typography>

                {result.safety_warnings && result.safety_warnings.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    {result.safety_warnings.map((w, i) => (
                      <Chip key={i} label={w} color="warning" size="small" sx={{ mr: 1, mb: 1 }} />
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpen(false)} color="inherit">Close</Button>
          <Button 
            onClick={handleAsk} 
            variant="contained" 
            endIcon={<SendIcon />}
            disabled={loading}
          >
            Analyze
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}