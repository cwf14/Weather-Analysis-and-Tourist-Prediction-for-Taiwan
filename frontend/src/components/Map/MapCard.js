import React, { useState, useMemo } from 'react';
import {
  Box, Typography, FormControl, InputLabel, Select, MenuItem, Paper, Divider, Alert, AlertTitle, CircularProgress,
  LinearProgress, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import { InfoOutlined } from '@mui/icons-material';
import { FaMapPin } from 'react-icons/fa';
import { WiDaySunny, WiStrongWind, WiWindBeaufort11, WiSnow, WiCloud, WiRain, WiHumidity, WiThunderstorm } from 'react-icons/wi';
import TaiwanMap from './TaiwanMap';

const CITY_COLORS = {
  'Taipei': '#33FF57',  
  'New Taipei': '#00BFFF', 
  'Taichung': '#3357FF', 
  'Tainan': '#FFBD33',  
  'Kaohsiung': '#8A33FF', 
};

const MapCard = ({ year, weatherData, loading }) => {
  const [selectedMonth, setSelectedMonth] = useState(1); 
  const [selectedCity, setSelectedCity] = useState('Taipei');
  
  const months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
  ];

  //Filter Data from Props 
  const currentData = useMemo(() => {
    if (!weatherData || weatherData.length === 0) return null;
    return weatherData.find(d => 
      parseInt(d.Year) === parseInt(year) &&
      parseInt(d.Month) === parseInt(selectedMonth) && 
      (d.City === selectedCity || d.Station === selectedCity)
    );
  }, [weatherData, year, selectedMonth, selectedCity]);

  // Identify High Risk Cities 
  const highRiskCities = useMemo(() => {
    const risks = [];
    if (!weatherData) return risks;
    weatherData.forEach(d => {
      if (parseInt(d.Year) === parseInt(year) && 
          parseInt(d.Month) === parseInt(selectedMonth) && 
          d.Typhoon_Probability > 0.5) {
        if(CITY_COLORS[d.City]) risks.push(d.City);
      }
    });
    return risks;
  }, [weatherData, year, selectedMonth]);

  const getCategoryIcon = (cat) => {
    if (!cat) return <WiCloud style={{ color: '#9e9e9e', fontSize: '26px' }} />;
    const lowerCat = cat.toLowerCase();
    if (lowerCat.includes('hot') || lowerCat.includes('sunny')) return <WiDaySunny style={{ color: '#ff9800', fontSize: '26px' }} />;
    if (lowerCat.includes('rain')) return <WiRain style={{ color: '#2196f3', fontSize: '26px' }} />;
    if (lowerCat.includes('storm') || lowerCat.includes('thunder')) return <WiThunderstorm style={{ color: '#f44336', fontSize: '26px' }} />;
    if (lowerCat.includes('cold') || lowerCat.includes('snow')) return <WiSnow style={{ color: '#00bcd4', fontSize: '26px' }} />;
    return <WiCloud style={{ color: '#4caf50', fontSize: '26px' }} />;
  };

  // Determine Risk Level & Color
  const getRiskLevel = (prob) => {
    const p = prob * 100;
    if (p < 20) return { label: "Low Risk", color: "success", desc: "Safe for travel." };
    if (p < 50) return { label: "Moderate", color: "warning", desc: "Keep an eye on forecasts." };
    return { label: "High Risk", color: "error", desc: "Prepare for potential disruption." };
  };

  // Controls Popup State 
  const [infoDialog, setInfoDialog] = useState(null); 

  // Dialog Content Logic
  const renderDialogContent = () => {
    if (infoDialog === 'classification') {
      return (
        <>
          <DialogTitle>Weather Classification Guide</DialogTitle>
          <DialogContent>
            <DialogContentText paragraph>
              We categorize months based on historical averages and predictions:
            </DialogContentText>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    <TableCell><strong>Category</strong></TableCell>
                    <TableCell><strong>Criteria</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow><TableCell>⛈️ Stormy month</TableCell><TableCell>Very strong winds and very heavy rain</TableCell></TableRow>
                  <TableRow><TableCell>🌵 Dry month</TableCell><TableCell>Very little rain and low humidity</TableCell></TableRow>
                  <TableRow><TableCell>🔥 Hot & Humid month</TableCell><TableCell>Warm temperatures with high humidity</TableCell></TableRow>
                  <TableRow><TableCell>🌧️ Rainy month</TableCell><TableCell>Heavy rainfall</TableCell></TableRow>
                  <TableRow><TableCell>❄️ Cold month</TableCell><TableCell>Chilly or cool temperatures</TableCell></TableRow>
                  <TableRow><TableCell>☁️ Normal month</TableCell><TableCell>Typical weather conditions</TableCell></TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
        </>
      );
    } else if (infoDialog === 'typhoon') {
      return (
        <>
          <DialogTitle>Typhoon Prediction Model</DialogTitle>
          <DialogContent>
            <DialogContentText paragraph>
              This probability is calculated using a <strong>Machine Learning Model</strong> trained on 10 years of historical data.
            </DialogContentText>
            <Typography variant="body2" gutterBottom>
              <strong>How it works:</strong> The model analyzes patterns in Sea Level Pressure, Wind Speed, and Precipitation from our historical database combined with current forecasts to estimate risk.
            </Typography>
          </DialogContent>
        </>
      );
    }
    return null;
  };
  return (
    <div>
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        <Box sx={{ p: { xs: 3, md: 5 }, bgcolor: 'white', borderRadius: 4, boxShadow: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 5 }}>
            
            {/* LEFT: Map */}
            <Box sx={{ flex: '0 0 40%', height: 500, bgcolor: '#f8fafc', borderRadius: 4, overflow: 'hidden', boxShadow: 5 }}>
              <TaiwanMap
                selectedYear={String(year)}
                selectedMonth={String(selectedMonth)}
                onFeatureClick={setSelectedCity}
                cityColors={CITY_COLORS}
                highRiskCities={highRiskCities}
              />
            </Box>

            {/* RIGHT: Controls & Info */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              
              <Box sx={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <Typography variant="h5" color="text.secondary">
                   Year: <strong>{year}</strong>
                </Typography>
                <FormControl sx={{ minWidth: 160 }}>
                  <InputLabel>Month</InputLabel>
                  <Select value={selectedMonth} label="Month" onChange={(e) => setSelectedMonth(e.target.value)}
                          sx={{height: 42, '& .MuiSelect-select': {display: 'flex', alignItems: 'center'
                          }
                        }}>
                    {months.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>
              
              <Divider sx={{ my: -1, borderColor: '#e0e0e0' }} />

              {selectedCity && (
                <Paper elevation={0} sx={{ p: 0 }}>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent:'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <FaMapPin style={{ color: '#e91e63', fontSize: '24px' }} />
                      <Typography variant="h4" fontWeight="bold" color="#222">{selectedCity}</Typography>
                    </Box>
                    {loading && <CircularProgress size={24} />}
                  </Box>

                  {loading ? (
                    <Typography color="text.secondary">Syncing weather data...</Typography>
                  ) : currentData ? (
                    <>
                      <Box sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant="h6" color="primary" sx={{ display:'flex', alignItems:'center', gap: 1, textTransform: 'capitalize' }}>
                              {currentData.Category_Class || "Cloudy"} {getCategoryIcon(currentData.Category_Class)}
                            </Typography>
                            <IconButton size="small" onClick={() => setInfoDialog('classification')} sx={{ color: 'text.secondary' }}>
                              <InfoOutlined fontSize="small" />
                            </IconButton>
                         </Box>
                      </Box>

                      {/* Weather Grid */}
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, mb: 4 }}>
                        <Box>
                           <Typography color="text.secondary" variant="caption">Temperature</Typography>
                           <Typography variant="h5" fontWeight="500">
                             {Math.round(currentData.Temperature_Mean_C)}°C <WiDaySunny style={{ color: '#ffb300', verticalAlign: 'bottom' }} />
                           </Typography>
                        </Box>
                        <Box>
                           <Typography color="text.secondary" variant="caption">Rain</Typography>
                           <Typography variant="h5" fontWeight="500">
                             {Math.round(currentData.Precipitation_Total_mm)} mm <WiRain style={{ color: '#2196f3', verticalAlign: 'bottom' }} />
                           </Typography>
                        </Box>
                        <Box>
                           <Typography color="text.secondary" variant="caption">Wind Speed</Typography>
                           <Typography variant="h5" fontWeight="500">
                             {Math.round(currentData.WindSpeed_Max_ms)} m/s <WiStrongWind style={{ color: '#4caf50', verticalAlign: 'bottom' }} />
                           </Typography>
                        </Box>
                        <Box>
                           <Typography color="text.secondary" variant="caption">Humidity</Typography>
                           <Typography variant="h5" fontWeight="500">
                             {Math.round(currentData.Humidity_Mean_perc)}% <WiHumidity style={{ color: '#2196f3', verticalAlign: 'bottom' }} />
                           </Typography>
                        </Box>
                      </Box>

                      <Divider sx={{ mb: 1 }} />

                      {/*  TYPHOON SECTION */}
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="subtitle1" fontWeight="600" color="text.primary">
                              Typhoon Probability
                            </Typography>
                            <IconButton size="small" onClick={() => setInfoDialog('typhoon')} sx={{ color: 'text.secondary' }}>
                              <InfoOutlined fontSize="small" />
                            </IconButton>
                          </Box>

                          <Chip 
                            label={getRiskLevel(currentData.Typhoon_Probability).label} 
                            color={getRiskLevel(currentData.Typhoon_Probability).color} 
                            size="small"
                            variant={currentData.Typhoon_Probability < 0.2 ? "outlined" : "filled"}
                          />
                        </Box>
                        
                        {/* Visual Progress Bar */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                          <Box sx={{ width: '100%' }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={currentData.Typhoon_Probability * 100} 
                              color={getRiskLevel(currentData.Typhoon_Probability).color}
                              sx={{ height: 10, borderRadius: 5, bgcolor: '#f0f0f0' }}
                            />
                          </Box>
                          <Typography variant="body2" fontWeight="bold" color="text.secondary" sx={{ minWidth: 45 }}>
                            {(currentData.Typhoon_Probability * 100).toFixed(1)}%
                          </Typography>
                        </Box>

                        {/* Only show large Alert box if RISK IS HIGH */}
                        {(currentData.Typhoon_Probability > 0.5 || currentData.WindSpeed_Max_ms > 15) && (
                          <Alert severity="error" icon={<WiWindBeaufort11 fontSize="inherit" />} sx={{ mt: 2 }}>
                            <AlertTitle>Weather Alert</AlertTitle>
                            High risk of Typhoon or extreme winds. Outdoor activities discouraged.
                          </Alert>
                        )}
                      </Box>

                    </>
                  ) : (
                    <Typography color="text.secondary" sx={{ mt: 4 }}>
                      No data available for {selectedCity} in {months.find(m=>m.value===selectedMonth)?.label} {year}.
                    </Typography>
                  )}
                </Paper>
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* INFO DIALOG  */}
      <Dialog 
        open={Boolean(infoDialog)} 
        onClose={() => setInfoDialog(null)}
        maxWidth="sm"
        fullWidth
      >
        {renderDialogContent()}
        <DialogActions>
          <Button onClick={() => setInfoDialog(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default MapCard;