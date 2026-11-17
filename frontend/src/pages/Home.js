import { useState, useEffect, useRef, useMemo } from 'react'; 
import { 
  Container, Typography, Box, FormControl, InputLabel, Select, MenuItem, 
  CircularProgress, Stack, IconButton, Dialog, DialogTitle, DialogContent, 
  DialogContentText, DialogActions, Button, Link 
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

// Import components
import QuickLinks from '../components/QuickLinks';
import Hero from '../components/Hero';
import WeatherCard from '../components/WeatherOverview/WeatherCard';
import AnnualWeatherBar from '../components/WeatherOverview/AnnualWeatherBar';
import TouristHighlights from '../components/TouristHighlight/TouristHighlights';
import TouristChartCities from '../components/TouristChart-Cities';
import MapCard from '../components/Map/MapCard';
import FloatingYearControl from '../components/FloatingYearControl'; 
import AskAIButton from '../components/AskAIButton';

export default function Home() {
  // State Management
  const today = new Date();
  
  // GLOBAL YEAR STATE 
  const [year, setYear] = useState(2025); 
  const weatherSectionRef = useRef(null);
  const mapSectionRef = useRef(null);

  // UI Control State
  const [showYearControl, setShowYearControl] = useState(true);
  const trendSectionRef = useRef(null); 

  // Weather Overview Local State
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [city, setCity] = useState('Taipei'); 
  
  // Weather Data State
  const [weatherData, setWeatherData] = useState([]);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  // TREND INSIGHT STATE
  const [trendData, setTrendData] = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [highlightCity, setHighlightCity] = useState('All');
  
  // NEW: Range Selection State
  const [trendStartYear, setTrendStartYear] = useState(2015);
  const [trendEndYear, setTrendEndYear] = useState(2027);

  // Constants for Trend Range
  const TREND_MIN_YEAR = 2015;
  const TREND_MAX_YEAR = 2027;
  const yearsList = Array.from(
    { length: TREND_MAX_YEAR - TREND_MIN_YEAR + 1 }, 
    (_, i) => TREND_MIN_YEAR + i
  );

  // Config
  const cityConfig = [
    { name: 'Taipei', color: '#E63946' },
    { name: 'New Taipei', color: '#457B9D' },
    { name: 'Taichung', color: '#F4A261' },
    { name: 'Tainan', color: '#2A9D8F' },
    { name: 'Kaohsiung', color: '#E76F51' }
  ];
  
  const months = [
    { val: 1, name: 'January' }, { val: 2, name: 'February' }, { val: 3, name: 'March' },
    { val: 4, name: 'April' }, { val: 5, name: 'May' }, { val: 6, name: 'June' },
    { val: 7, name: 'July' }, { val: 8, name: 'August' }, { val: 9, name: 'September' },
    { val: 10, name: 'October' }, { val: 11, name: 'November' }, { val: 12, name: 'December' }
  ];
  const selectedMonthName = months.find(m => m.val === selectedMonth)?.name || "Unknown";

  //  Data Filtering Logic 
  const cityData = Array.isArray(weatherData) ? weatherData.filter(d => d.Station === city) : [];
  const currentCardData = cityData.find(d => d.Month === selectedMonth) || null;

  //Filter Trend Data based on selected years
  const filteredTrendData = useMemo(() => {
    return trendData.filter(item => {
      const itemYear = item.date.getFullYear();
      return itemYear >= trendStartYear && itemYear <= trendEndYear;
    });
  }, [trendData, trendStartYear, trendEndYear]);

  // Handler to prevent Start Year > End Year
  const handleStartYearChange = (e) => {
    const val = e.target.value;
    setTrendStartYear(val);
    if (val > trendEndYear) setTrendEndYear(val);
  };

  // Handler to prevent End Year < Start Year
  const handleEndYearChange = (e) => {
    const val = e.target.value;
    setTrendEndYear(val);
    if (val < trendStartYear) setTrendStartYear(val);
  };

  // State for Weather Info Dialog
  const [openWeatherInfo, setOpenWeatherInfo] = useState(false);

  // Ref to track if we already requested the trend data
  const hasFetchedTrend = useRef(false);

  // Scroll Listener 
  useEffect(() => {
    const handleScroll = () => {
      if (!weatherSectionRef.current || !mapSectionRef.current) return;

      const weatherTop = weatherSectionRef.current.getBoundingClientRect().top;
      const mapBottom = mapSectionRef.current.getBoundingClientRect().bottom;

      // When weather section is visible AND before map section ends:
      if (weatherTop < window.innerHeight * 0.5 && mapBottom > 200) {
        setShowYearControl(true);
      } else {
        setShowYearControl(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);


  // Fetch Weather Data 
  useEffect(() => {
    const fetchWeatherData = async () => {
      setWeatherLoading(true);
      setApiError(null);
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/weather/5-cities?year=${year}`);
        const data = await response.json();
        if (Array.isArray(data)) {
          setWeatherData(data);
        } else {
          setApiError("Backend is calculating models...");
          setWeatherData([]);
        }
      } catch (error) {
        console.error("Error fetching weather data:", error);
        setApiError("Network connection failed.");
        setWeatherData([]);
      } finally {
        setWeatherLoading(false);
      }
    };
    fetchWeatherData();
  }, [year]); 

  // Fetch Trend Data 
  useEffect(() => {
    // If already fetched, stop here
    if (hasFetchedTrend.current) return;
    
    const fetchTrendData = async () => {
      hasFetchedTrend.current = true; // Mark as fetched immediately
      setTrendLoading(true);
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/tourist/5-cities-trend`);
        const rawData = await response.json();

        if (Array.isArray(rawData)) {
          const formattedData = rawData.map(item => ({
            ...item,
            date: new Date(item.date)
          }));
          setTrendData(formattedData);
        } else {
          setTrendData([]);
        }
      } catch (error) {
        console.error("Error fetching trend data:", error);
        setTrendData([]);
      } finally {
        setTrendLoading(false);
      }
    };

    fetchTrendData();
  }, []); // Empty dependency array

  return (
    <>
      {/* Floating Control */}
      <Box sx={{ 
        position: 'fixed', right: 20, bottom: 20, zIndex: 999,
        opacity: showYearControl ? 1 : 0,
        pointerEvents: showYearControl ? 'auto' : 'none',
        transition: 'opacity 0.3s ease' 
      }}>
        <FloatingYearControl year={year} setYear={setYear} />
      </Box>

      {/* HERO */}
      <Box id="hero" sx={{ bgcolor: '#e7e7e9ff', py: 1 }}>
        <Container maxWidth="lg">
          <Hero />
          <QuickLinks />
        </Container>
      </Box>

      {/* WEATHER OVERVIEW */}
      <Box id="weather-overview" ref={weatherSectionRef} sx={{ py: 4, bgcolor: '#f7fcffff' }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>Weather Overview</Typography>
              <IconButton onClick={() => setOpenWeatherInfo(true)} color="primary" ria-label="weather info" size="small"
                >
                  <InfoOutlinedIcon />
                </IconButton>
            </Box>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Month</InputLabel>
              <Select 
                value={selectedMonth} 
                label="Month" 
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                {months.map((m) => <MenuItem key={m.val} value={m.val}>{m.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>

          {weatherLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>
          ) : (
            <>
              <WeatherCard 
                city={city}
                onCityChange={setCity} 
                month={selectedMonthName}
                maxTemp={currentCardData ? Math.round(currentCardData.Temperature_Max_C) : '-'}
                minTemp={currentCardData ? Math.round(currentCardData.Temperature_Min_C) : '-'}
                avgTemp={currentCardData ? Math.round(currentCardData.Temperature_Mean_C) : '-'}
                humidity={currentCardData ? Math.round(currentCardData.Humidity_Mean_perc) : '-'}
                wind={currentCardData ? Math.round(currentCardData.WindSpeed_Max_ms) : '-'}
                precipitation={currentCardData ? Math.round(currentCardData.Precipitation_Total_mm) : '-'}
                condition={currentCardData?.Precipitation_Total_mm > 100 ? "Rainy" : "Cloudy"}
              />
              <Box sx={{ mt: 6 }}>
                <AnnualWeatherBar data={cityData} city={city} selectedMonth={selectedMonth} />
              </Box>
            </>
          )}
        </Container>
      </Box>

      {/* TOURIST HIGHLIGHTS */}
      <Box id="tourist-highlights" sx={{ py: 6, bgcolor: '#f8f9fa' }}>
        <Container maxWidth="lg">
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 4 }}>
            Tourist Highlights
          </Typography>
          <Box sx={{ borderRadius: 4, overflow: 'hidden', boxShadow: 3 }}>
            <TouristHighlights year={year} globalWeatherData={weatherData} isGlobalLoading={weatherLoading} />
          </Box>
        </Container>
      </Box>
      
      {/* MAP VIEW */}
      <Box id="map-view" ref={mapSectionRef} sx={{ py: 4, bgcolor: '#f8f9fa' }}>
        <Container maxWidth="lg">
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>Map View</Typography>
          <MapCard 
            year={year} 
            weatherData={weatherData} 
            loading={weatherLoading} /> 
        </Container>
      </Box>

      {/* TREND INSIGHT */}
      <Box ref={trendSectionRef} id="trend-insight" sx={{ py: 6, bgcolor: 'white' }}>
        <Container maxWidth="lg">
          
          {/* Controls Row */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' }, 
            justifyContent: 'space-between', 
            alignItems: { xs: 'flex-start', md: 'center' }, 
            gap: 2,
            mb: 2 
          }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>Trend Insight</Typography>
            </Box>

            {/* Filters Container */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              
              {/* Time Range Selectors */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <InputLabel>From</InputLabel>
                  <Select value={trendStartYear} label="From" onChange={handleStartYearChange}>
                    {yearsList.map(y => (
                      <MenuItem key={y} value={y} disabled={y > trendEndYear}>{y}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Typography>-</Typography>
                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <InputLabel>To</InputLabel>
                  <Select value={trendEndYear} label="To" onChange={handleEndYearChange}>
                    {yearsList.map(y => (
                      <MenuItem key={y} value={y} disabled={y < trendStartYear}>{y}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Highlight City Selector */}
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Highlight City</InputLabel>
                <Select value={highlightCity} label="Highlight City" onChange={(e) => setHighlightCity(e.target.value)}>
                  <MenuItem value="All">Show All</MenuItem>
                  {cityConfig.map(c => <MenuItem key={c.name} value={c.name}>{c.name}</MenuItem>)}
                </Select>
              </FormControl>

            </Stack>
          </Box>
          <Typography sx={{ mb: 1, maxWidth: 700 }}>
            Explore the seasonal patterns and predicted growth for 5 specific cities in Taiwan. 
            Historical data prior to 2025 is aggregated from visitor counts at various tourist attractions and places within each city. 
          </Typography>

          <Box sx={{ height: 480, bgcolor: '#fff', p: 2, border: '1px solid #eee', borderRadius: 2 }}>
            {trendLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            ) : (
              <TouristChartCities 
                data={filteredTrendData} // PASS FILTERED DATA
                cityConfig={cityConfig} 
                highlightCity={highlightCity} 
              />
            )}
          </Box>
        </Container>
      </Box>

      {/* ASK AI BUTTON */}
      <AskAIButton />
      
      {/* DIALOG OF WEAHTER OVERVIEW */}
      <Dialog
        open={openWeatherInfo}
        onClose={() => setOpenWeatherInfo(false)}
        aria-labelledby="weather-info-title"
      >
        <DialogTitle id="weather-info-title" sx={{ fontWeight: 'bold' }}>
          Data Methodology & Source
        </DialogTitle>
        <DialogContent>
          <DialogContentText paragraph>
            <strong>Historical Data (2015–2024):</strong><br />
            The weather data presented for past years is aggregated from actual records provided by the 
            {' '}
            <Link 
              href="https://www.cwa.gov.tw/V8/E/C/Statistics/monthlydata.html" 
              target="_blank" 
              rel="noopener noreferrer"
              underline="hover"
            >
              Taiwan Central Weather Administration (CWA)
            </Link>.
          </DialogContentText>
          <DialogContentText paragraph>
            <strong>Future Predictions (2025–2027):</strong><br />
            Future weather conditions are estimated using our proprietary machine learning models:
          </DialogContentText>
          <ul style={{ color: '#666', paddingLeft: '1.2rem' }}>
            <li><strong>Temperature:</strong> LSTM (Long Short-Term Memory) Neural Networks.</li>
            <li><strong>Precipitation:</strong> Random Forest Regression & Prophet Time Series.</li>
            <li><strong>Wind & Humidity:</strong> XGBoost & Random Forest Ensembles.</li>
          </ul>
          <DialogContentText variant="caption" sx={{ mt: 2, display: 'block' }}>
            *Predictions are for reference only and may vary from actual conditions.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenWeatherInfo(false)} variant="contained" autoFocus>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}