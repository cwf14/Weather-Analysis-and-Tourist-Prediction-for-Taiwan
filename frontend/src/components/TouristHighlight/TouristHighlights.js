import { useState, useEffect } from 'react';
import {Container, Grid, FormControl, InputLabel, Select, MenuItem,Box, CircularProgress} from '@mui/material';
import WeatherInfoCard from './WeatherInfoCard';
import SeasonClusterCard from './SeasonClusterCard';
import RecommendedPlacesList from './RecommendedPlacesList';

// map Month Names to Numbers (1-12)
const MONTH_MAP = {
  "January": 1, "February": 2, "March": 3, "April": 4, "May": 5, "June": 6,
  "July": 7, "August": 8, "September": 9, "October": 10, "November": 11, "December": 12
};

export default function TouristHighlights({ year, globalWeatherData, isGlobalLoading }) {
  
  const [month, setMonth] = useState("November");
  const [city, setCity] = useState("Taipei");
  
  // Local state for the specific card display
  const [displayWeather, setDisplayWeather] = useState(null);
  const [cluster, setCluster] = useState(2); 
  const [classifying, setClassifying] = useState(false);

  useEffect(() => {
    //  Ensure global data exists before processing
    if (isGlobalLoading || !globalWeatherData || globalWeatherData.length === 0) {
      return; 
    }

    const processData = async () => {
      setClassifying(true);
      
      // FIND DATA 
      const monthNum = MONTH_MAP[month];
      
      const targetRow = globalWeatherData.find(
        d => d.Station === city && d.Month === monthNum
      );

      if (!targetRow) {
        console.warn("No data found for selection");
        setClassifying(false);
        return;
      }

      // Extract raw numbers (Round them for UI)
      const weatherObj = {
        temp: Math.round(targetRow.Temperature_Mean_C || targetRow.Predicted_Temperature_Mean_C || 0),
        max: Math.round(targetRow.Temperature_Max_C || targetRow.Predicted_Temperature_Max_C || 0),
        min: Math.round(targetRow.Temperature_Min_C || targetRow.Predicted_Temperature_Min_C || 0),
        precip: Math.round(targetRow.Precipitation_Total_mm || targetRow.Predicted_Precipitation_Total_mm || 0),
        wind: Math.round(targetRow.WindSpeed_Max_ms || targetRow.Predicted_WindSpeed_Max_ms || 0),
        humidity: Math.round(targetRow.Humidity_Mean_perc || targetRow.Predicted_Humidity_Mean_perc || 0),
      };

      // CALL BACKEND FOR CLUSTERING
      // The backend needs Weather + Year/Month to predict Tourist Count first, then Cluster.
      try {
        const response = await fetch('http://127.0.0.1:8000/api/tourist/cluster', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            // Context for Tourist Model
            year: parseInt(year), 
            month: monthNum, 
            city: city,
            // Weather Data for Clustering
            temp: weatherObj.temp,
            precip: weatherObj.precip
          })
        });

        const result = await response.json();

        // Update State
        setDisplayWeather({
          ...weatherObj,
          tourists: result.tourist_count, 
          condition: result.ui_condition 
        });
        
        // Result from K-Means (1=High, 2=Low)
        setCluster(result.cluster);

      } catch (error) {
        console.error("Clustering failed:", error);
        setDisplayWeather({ ...weatherObj, condition: 'Cloudy' });
        setCluster(2);
      } finally {
        setClassifying(false);
      }
    };

    processData();

  }, [year, month, city, globalWeatherData, isGlobalLoading]);

  const isLoading = isGlobalLoading || classifying;
  const weatherToShow = displayWeather || { 
    temp: '-', max: '-', min: '-', humidity: '-', wind: '-', precip: '-', condition: 'Cloudy' 
  };

  return (
    <Box id="tourist-highlights" sx={{ py: { xs: 6, md: 3 }, bgcolor: '#fafafa' }}>
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* LEFT COLUMN */}
          <Grid item xs={12} md={5} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            
            {/* Filters */}
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Month</InputLabel>
                  <Select value={month} onChange={(e) => setMonth(e.target.value)} label="Month">
                    {Object.keys(MONTH_MAP).map(m => (
                      <MenuItem key={m} value={m}>{m}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>City</InputLabel>
                  <Select value={city} onChange={(e) => setCity(e.target.value)} label="Municipality">
                    {["Taipei", "New Taipei", "Taichung", "Tainan", "Kaohsiung"].map(c => (
                      <MenuItem key={c} value={c}>{c}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {/* Cards */}
            {isLoading ? (
               <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                 <CircularProgress />
               </Box>
            ) : (
              <>
                <WeatherInfoCard month={month} city={city} weather={weatherToShow} />
                <SeasonClusterCard cluster={cluster} data={weatherToShow}/>
                
              </>
            )}

          </Grid>
          {/* RIGHT COLUMN */}
          <Grid item xs={12} md={7} sx={{ minWidth: 0 }}>
            <RecommendedPlacesList cluster={cluster} city={city} />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}