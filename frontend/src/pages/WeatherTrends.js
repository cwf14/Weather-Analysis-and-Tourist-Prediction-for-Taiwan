import { useState, useEffect } from 'react'; 
import { Container, Typography, Paper, Box, MenuItem, LinearProgress, Fab} from '@mui/material';

import TemperatureTrendLineCharts from '../components/WeatherTrends/TemperatureTrendLineCharts';
import WeatherPrecipitationBarChart from '../components/WeatherTrends/WeatherPrecipitationBarChart';
import HumidityChart from '../components/WeatherTrends/HumidtyChart';
import WindSpeedChart from '../components/WeatherTrends/WindSpeedChart';
import AskAIButton from '../components/AskAIButton';

export default function WeatherTrends() {
  const [year, setYear] = useState(2025); 
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [showYearSelector, setShowYearSelector] = useState(false); // Toggle dropdown


  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setData([]); // Clear old data
      
      // Custom status messages for future years
      if (year > 2024) {
          setStatusMsg("Training AI models & generating predictions...");
      } else {
          setStatusMsg("Loading historical records...");
      }

      try {
        const response = await fetch(`http://localhost:8000/api/weather?year=${year}`);
        if (!response.ok) throw new Error("Backend Error");
        
        const jsonData = await response.json();
        
        // Process types
        const formatted = jsonData.map(d => ({
            ...d,
            Year: +d.Year,
            Month: +d.Month,
            Temperature_Max_C: +d.Temperature_Max_C,
            Temperature_Min_C: +d.Temperature_Min_C,
            Temperature_Mean_C: +d.Temperature_Mean_C,
            Precipitation_Total_mm: +d.Precipitation_Total_mm,
            WindSpeed_Max_ms: +d.WindSpeed_Max_ms,
            Humidity_Mean_perc: +d.Humidity_Mean_perc
        }));
        
        setData(formatted);
      } catch (err) {
        console.error(err);
        setStatusMsg("Failed to load data. Ensure backend is running.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [year]);

  return (
    <>
      {/* Floating Year Selector */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 25,
          left: 30,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 1
        }}
      >
        <Fab
          variant="extended"
          size="medium"
          color="primary"
          onClick={() => setShowYearSelector(!showYearSelector)}
          sx={{ borderRadius: 2, px: 3, minWidth: 'auto' }}
        >
          Year: {year}
        </Fab>

        {showYearSelector && (
          <Paper
            elevation={8}
            sx={{ p: 2, minWidth: 120, backgroundColor: 'background.paper', borderRadius: 2 }}
          >
            {[2027, 2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015].map(y => (
              <MenuItem key={y} onClick={() => { setYear(y); setShowYearSelector(false); }}>
                {y} {y > 2024 ? "(AI Prediction)" : ""}
              </MenuItem>
            ))}
          </Paper>
        )}
      </Box>

      <Container maxWidth="lg" sx={{ py: 2, bgcolor: '#f3f3ecff'}}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
          Weather Trends
        </Typography>
        <Typography variant="subtitle1" sx={{ color: '#666', mb: 5}}>
          Taiwan’s weather trends from 2015 to 2027, highlighting temperature, rainfall, wind, and humidity patterns. 
          Historical data from 2015–2024 is based on observations across the country, while predictions for 2025–2027 are generated using a Random Forest model, providing insight into seasonal and yearly changes in climate conditions.
        </Typography>

        {loading && (
          <Box sx={{ width: '100%', mb: 4 }}>
            <LinearProgress />
            <Typography sx={{ mt: 2, textAlign: 'center', color: 'text.secondary' }}>
              {statusMsg}
            </Typography>
          </Box>
        )}

        {!loading && data.length > 0 && (
          <>
            {/* Pass data to your chart components */}
            <Box sx={{ mb: 6 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2, textAlign: 'center' }}>
                Average Monthly Temperature in Taiwan {year}
              </Typography>
               <Paper elevation={1} sx={{ p: 4 }}>
                 <TemperatureTrendLineCharts data={data} />
               </Paper>
            </Box>
            <Box sx={{ mb: 6 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2, textAlign: 'center' }}>
                Total Monthly Precipitation in Taiwan {year}
              </Typography>
               <Paper elevation={1} sx={{ p: 4 }}>
                 <WeatherPrecipitationBarChart data={data} />
               </Paper>
            </Box>
             <Box sx={{ mb: 6 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2, textAlign: 'center' }}>
                  Maximum Monthly Wind Speed in Taiwan {year}
                </Typography>
               <Paper elevation={1} sx={{ p: 4 }}>
                 <WindSpeedChart data={data} />
               </Paper>
            </Box>
            <Box sx={{ mb: 6 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2, textAlign: 'center' }}>
                Average Monthly Humidity in Taiwan {year}
              </Typography>
               <Paper elevation={1} sx={{ p: 4 }}>
                 <HumidityChart data={data} />
               </Paper>
            </Box>
          </>
        )}
        <AskAIButton />
      </Container>
    </>
  );
}