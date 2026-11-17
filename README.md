# Assignemnt 3 - AI-Powered Prediction Web Application

**Full-Stack Web Application with React.js + FastAPI + AI Model Integratioon**
*Final Project - Full-Stack Web Development for AI Application*

A modern full-stack web application that combines **React + MUI** frontend with a **FastAPI** backend and custom-trained machine learning models to provide real-time weather insights, typhoon probability predictions, tourist trends, and travel recommendations across Taiwan.

**Video Demo:**  https://youtu.be/wOSVLxpouP8

---

### Features
- **Interactive Taiwan SVG Map** with clickable cities showing:
    - Current weather + forecast
    - **Typhoon probability** （Random FOrest)
    - Weather classification (Normal, Heavy Rain, Cold, etc.)
    - **Zoom in/out/reset controls** for detailed exploration
- **Real-Time Weather Trends (2015–2027)** using advanced models:
    - Temperature → LSTM
    - Precipitation → Prophet
    - Wind Speed → Random Forest
    - Humidity → XGBoost
- **Tourist Arrival Predictions**:
    - 5 major cities → Random Forest 
    - Taiwan total → Linear Regression models
    - **Seasonal clustering** (High / Low season detection via K-Means)
- **Floating Year Selector (2017 → 2027)** with smooth transitions
- Modern **Material UI (MUI)** design + custom **D3.js** charts

---

### Project Structures

#### Backend (FastAPI)
```bash
backend/
- __pycache__/                             # Compiled Python files
- main.py                                  # FastAPI server
- model_service.py                         # ML models service
- weather_classifier.py                    # Weather classification
- weather_clustering.py                    # Season clustering
- processed_Typhoon/ (2015-2023)           # 2015-2023 typhoon data
- processed_Weather.csv                    # Weather dataset
- processed_Tourist.csv                    # Tourist statistics
- processed_*City.csv (5 major cities)     # 5 major cities data
```

#### Frontend (React + MUI)
```bash
frontend/src/
- components/
    - Map/                                 # Taiwan map components
        - MapCard.js
        - TaiwanMap.js
    - TouristHighlight/                    # Recommendation system
        - RecommendedPlacesList.js
        - SeasonClusterCard.js
        - TouristHighlights.js
        - WeatherInfoCard.js
    - WeatherOverview/                     # Weather display
        = AnnualWeatherBar.js
        - WeatherCard.js
    - WeatherTrends/                       # D3.js analytics
        - HumidityChart.js
        - TemperatureTrenLineCharts.js
        - WeatherPrecipitationBarChart.js
        - WindSpeedChart.js
    - ContactDialog.js
    - FloatingYearControl.js
    - Header.js
    - Hero.js
    - QuickLinks.js
    - TouristChart-Cities.js
    - TouristChart-Taiwan.js
- App.js
- Index.js
```
---

### Machine Learning Models
| Task                          | Model                        | Implementation File              |
|-------------------------------|------------------------------|----------------------------------|
| Temperature                   | LSTM                         | `model_service.py`               |
| Precipitation                 | Prophet                      | `model_service.py`               |
| Wind Speed                    | Random Forest                | `model_service.py`               |
| Humidity                      | XGBoost                      | `model_service.py`               |
| Typhoon Probability          | Random Forest                 | `train_predict_typhoon_rf()`     |
| Tourist Arrivals (5 Cities)   | Random Forest                | `train_predict_tourist_rf()`     |
| Taiwan Total Tourists         | Linear Regression            | `train_predict_taiwan_tourist_lr()` |
| Travel Season Clustering     | K-Means (3 clusters)          | `weather_clustering.py`          |
| Weather Classification        | City-specific Quantile Rules | `weather_classifier.py`          |

---

### API Endpoints Documentation (FastAPI)
### API Endpoints (FastAPI – http://localhost:8000)

| Method | Endpoint                              | Parameters                                   | Description                                                                                 |
|--------|---------------------------------------|----------------------------------------------|---------------------------------------------------------------------------------------------|
| GET    | `/`                                   | —                                            | Health check + cache status                                                                 | 
| GET    | `/api/weather/5-cities`               | `year` (required)                            | Weather + typhoon prob + risk for all 5 cities (main map data)                             | 
| GET    | `/api/weather`                        | `year` (required)                            | Island-wide aggregated trends (for D3 charts)                                               | 
| GET    | `/api/tourist/5-cities-trend`         | —                                            | Pre-computed 2015–2027 tourist trends for 5 cities                                          | 
| GET    | `/api/tourist/total-trend`            | `target_year` (default 2025)                 | Taiwan total tourist prediction                                                             |
| GET    | `/api/map-view-data`                  | `year` (required)                            | Lightweight version for SVG map                                                             |
| POST   | `/api/tourist/cluster`                | JSON body                                    | Returns high/low season cluster + tourist count                                             | 
| POST   | `/api/simulation/analyze`             | JSON body                                    | What-If simulator – returns AI category + travel advice + warnings                         | 

**Example (2026 weather for all cities):**
```bash
GET http://localhost:8000/api/weather/5-cities?year=2026 HTTP/1.1
```

**Get 2026 weather for all 5 cities (with typhoon risk & classification)**

### Weather Classification Categories

- **High Risk Storm** – High wind + high precipitation  
- **Extreme Dry Month** – Low precipitation and humidity  
- **Abnormal Hot Humid** – High temperature and humidity  
- **Heavy Rainy Month** – High precipitation  
- **Cold Month** – Low temperature  
- **Normal Month** – Standard conditions  

---

### Visualization Technology
- **D3.js** – All charts & interactive visualizations
- **React + Material UI** – Layout, cards, modals, responsive design
- **SVG Taiwan Map** – Fully interactive

---

## Frontend Routing (React Router)

The app uses **React Router** for navigation.
Main routes are defined in 'src/App.js':

```jsx
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/weather-trends" element={<WeatherTrends />} />
      <Route path="/tourist-trends" element={<TouristTrends />} />
    </Routes>
```

This Provides routes for:
- Home Page
- Weather Trends Dashboard
- Tourist Trends & Forecast

## Setup & Running Instructions

### 1. Unzip the submitted folder
Extract the entire 'COS300049-ASG3' folder to your computer. For faster extraction, you may use 7-Zip, WinRAR, or the built-ion unzip tool.

---

### 2. Backend Setup (FastAPI + ML Models)

### Step 1: Open terminal → go to backend folder

```bash
cd backend
```

### Step 2: Create virtual environment

```bash
python -m venv venv
```
### Step 3: Activate vitual environment

#### Windows
```bash
venv\Scripts\activate
```

#### macOS/Linux
```bash
source venv/bin/activate
```

### Step 4: Install all required Python packages
```bash
pip install fastapi uvicorn pandas scikit-learn xgboost torch torchvision prophet imbalanced-learn python-multipart
```

This installs: 
- FastAPI (backend)
- Uvicorn (Server)
- Pandas + Scikit-learn
- XGBoost
- PyTorch (LSTM)
- Prophet (Precipitation forecasting)
- Imbalanced-learn (SMOTE)
- Multipart (file handling)

### Step 5: Start the FastAPI Server
```bash
uvicorn main:app --relaod --port 8000

(Alternative) python -m uvicorn main:app --reload --port 8000
```

Backend runs at: http://localhost:8000

---

### 3. Frontend Setup (React + MUI + D3.js)

#### Open a new terminal:

```bash
cd react-mui-demo / frontend
```

#### Install all dependencies

```bash
npm install
```

#### Start React development server:

```bash
npm start
```

Frontend opens automatically at: http://localhost:3000

Important: Better to run backend first so the frontend can fetch data.
