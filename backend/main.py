from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import time
import glob 
import os 
import concurrent.futures # for Parallel Processing

# Import model service functions
from model_service import (
    train_predict_5cities_precip_rf,
    train_predict_5cities_wind_rf,
    train_predict_5cities_humidity_xgb,
    train_predict_5cities_temp_lstm,
    
    train_predict_humidity_xgboost,
    train_predict_precipitation_prophet,
    train_predict_wind_rf,
    train_predict_temperature_lstm,
    
    train_predict_taiwan_tourist_lr,
    train_predict_tourist_rf,
    train_predict_typhoon_rf 
)

# Import the CLUSTERING AND CLASSIFICATION MODEL
from weather_clustering import cluster_model
from weather_classifier import classifier 

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# GLOBAL CACHE VARIABLES
WEATHER_CACHE_5CITIES = {}
WEATHER_CACHE_TRENDS = {}
CACHE_5CITIES_TREND_DATA = None

# Standardize City Names 
def standardize_city(name):
    name = str(name).strip()
    if name in ['Taipei', 'Taipei City']: return 'Taipei'
    if name in ['New Taipei', 'New Taipei City']: return 'New Taipei'
    if name in ['Taichung', 'TaiChung', 'Taichung City']: return 'Taichung'
    if name in ['Tainan', 'TaiNan', 'Tainan City']: return 'Tainan'
    if name in ['Kaohsiung', 'Kaohsiung City']: return 'Kaohsiung'
    return name

# GLOBAL DATASETS
full_tourist_df = pd.DataFrame()
historical_df = pd.DataFrame()
taiwan_tourist_df = pd.DataFrame()
typhoon_hist_df = pd.DataFrame()
MAX_HIST_YEAR = 2024

# ==========================================
# LOAD FILES & PRE-CALCULATE MODELS
# ==========================================
@app.on_event("startup")
async def startup_event():
    global full_tourist_df, historical_df, taiwan_tourist_df, typhoon_hist_df
    global MAX_HIST_YEAR, CACHE_5CITIES_TREND_DATA

    print("Server starting... Loading datasets...")

    #Load Weather History
    try:
        historical_df = pd.read_csv("processed_Weather.csv")
        if 'Station' in historical_df.columns:
            historical_df['Station'] = historical_df['Station'].apply(standardize_city)
        MAX_HIST_YEAR = int(historical_df['Year'].max())
        print("Weather data loaded.")
    except Exception as e:
        print(f"Error loading Weather CSV: {e}")

    # Load City Tourist Data
    try:
        city_files = {
            'Taipei': 'processed_Taipei.csv',
            'New Taipei': 'processed_NewTaipei.csv', 
            'Taichung': 'processed_Taichung.csv',
            'Tainan': 'processed_Tainan.csv',
            'Kaohsiung': 'processed_Kaohsiung.csv'
        }
        tourist_dfs = []
        for city, f in city_files.items():
            if os.path.exists(f):
                tmp = pd.read_csv(f)
                cols = [c for c in tmp.columns if c not in ['Year', 'Month']]
                tmp['Total_Tourists'] = tmp[cols].sum(axis=1)
                tmp['City'] = city
                tourist_dfs.append(tmp)
        
        if tourist_dfs:
            full_tourist_df = pd.concat(tourist_dfs, ignore_index=True)
            cluster_model.train("processed_Weather.csv", city_files)
            print("Tourist city data loaded & Cluster model trained.")
    except Exception as e:
        print(f"Error loading Tourist data: {e}")

    #Load Taiwan Total Tourist Data
    try:
        taiwan_tourist_df = pd.read_csv("processed_Tourist.csv")
        print("Taiwan Total Tourist data loaded.")
    except: pass

    # Load Typhoon Data
    try:
        path = "processed_Typhoon/*.csv" 
        all_files = glob.glob(path)
        if all_files:
            df_list = [pd.read_csv(f) for f in all_files]
            typhoon_hist_df = pd.concat(df_list, ignore_index=True)
            if 'City' in typhoon_hist_df.columns:
                typhoon_hist_df['City'] = typhoon_hist_df['City'].apply(standardize_city)
            print("Typhoon data loaded.")
    except: pass

    # PRE-CALCULATE TOURIST TRENDS
    print("Pre-calculating Tourist Trends for 2025-2027... (This may take ~45s)")
    try:
        if not full_tourist_df.empty:
            hist_df = full_tourist_df[['Year', 'Month', 'City', 'Total_Tourists']].copy()
            future_frames = []
            
            # We can use ThreadPool here too to speed up startup!
            with concurrent.futures.ThreadPoolExecutor() as executor:
                futures = {executor.submit(train_predict_tourist_rf, historical_df, full_tourist_df, y): y for y in [2025, 2026, 2027]}
                for future in concurrent.futures.as_completed(futures):
                    pred_df = future.result()
                    if not pred_df.empty:
                        future_frames.append(pred_df[['Year', 'Month', 'City', 'Total_Tourists']])
            
            if future_frames:
                combined_df = pd.concat([hist_df] + future_frames, ignore_index=True)
                combined_df.drop_duplicates(subset=['Year', 'Month', 'City'], keep='last', inplace=True)
                combined_df['Date'] = pd.to_datetime(combined_df[['Year', 'Month']].assign(Day=1))
                combined_df.sort_values('Date', inplace=True)
                
                chart_data = []
                for date, group in combined_df.groupby('Date'):
                    row = {"date": date.strftime("%Y-%m-%d")}
                    for _, item in group.iterrows():
                        row[item['City']] = int(item['Total_Tourists'])
                    chart_data.append(row)
                
                CACHE_5CITIES_TREND_DATA = chart_data
                print("Tourist Trend Cache Ready!")
    except Exception as e:
        print(f"Failed to pre-calculate trends: {e}")

    print("Server is Ready")

@app.get("/")
async def root():
    return {
        "message": "Taiwan Weather AI API is running", 
        "cache_status": "Ready" if CACHE_5CITIES_TREND_DATA else "Initializing"
    }
# ==========================================
# 1. WEATHER OVERVIEW ENDPOINT (PARALLEL, CACHED)
# ==========================================
@app.get("/api/weather/5-cities")
async def get_weather_5cities(year: int):
    # Check Cache
    if year in WEATHER_CACHE_5CITIES:
        print(f"⚡ Returning cached data for {year}")
        return WEATHER_CACHE_5CITIES[year]

    print(f"Request received for 5-CITIES year: {year}")
    start_time = time.time()
    final_df = pd.DataFrame()

    # Generate Weather Data (History or Prediction)
    if year <= 2024:
        if historical_df.empty: return []
        final_df = historical_df[(historical_df['Year'] == year) & 
                                 (historical_df['Station'].isin(['Taipei', 'New Taipei', 'Taichung', 'Tainan', 'Kaohsiung']))].copy()
    else:
        # Prediction Logic
        try:
            current_year_hist = pd.DataFrame()
            if year == 2025 and not historical_df.empty:
                current_year_hist = historical_df[
                    (historical_df['Year'] == year) & 
                    (historical_df['Station'].isin(['Taipei', 'New Taipei', 'Taichung', 'Tainan', 'Kaohsiung']))
                ].copy()

            #PARALLEL EXECUTION STARTS HERE 
            print(f"Starting Parallel Training for {year}...")
            with concurrent.futures.ThreadPoolExecutor() as executor:
                # Submit all 4 model tasks at once
                f_temp = executor.submit(train_predict_5cities_temp_lstm, historical_df, year)
                f_precip = executor.submit(train_predict_5cities_precip_rf, historical_df, year)
                f_wind = executor.submit(train_predict_5cities_wind_rf, historical_df, year)
                f_humid = executor.submit(train_predict_5cities_humidity_xgb, historical_df, year)
                
                # Wait and get results
                df_temp = f_temp.result()
                df_precip = f_precip.result()
                df_wind = f_wind.result()
                df_humid = f_humid.result()
            
            merged = df_temp.merge(df_precip, on=['Year', 'Month', 'Station'], how='outer')
            merged = merged.merge(df_wind, on=['Year', 'Month', 'Station'], how='outer')
            merged = merged.merge(df_humid, on=['Year', 'Month', 'Station'], how='outer')
            
            merged.rename(columns={
                'Predicted_Temperature_Mean_C': 'Temperature_Mean_C',
                'Predicted_Temperature_Max_C': 'Temperature_Max_C',
                'Predicted_Temperature_Min_C': 'Temperature_Min_C',
                'Predicted_WindSpeed_Max_ms': 'WindSpeed_Max_ms',
                'Predicted_Humidity_Mean_perc': 'Humidity_Mean_perc'
            }, inplace=True)

            final_df = pd.concat([current_year_hist, merged], ignore_index=True)
        
        except Exception as e:
            print(f"Model generation error: {e}")
            import traceback
            traceback.print_exc()
            return []

    # Prepare Data for Typhoon & Classification
    if 'Station' in final_df.columns:
        final_df.rename(columns={'Station': 'City'}, inplace=True)
    final_df = final_df.fillna(0)

    # Run Typhoon Model
    if not typhoon_hist_df.empty and not historical_df.empty:
        typhoon_probs = train_predict_typhoon_rf(typhoon_hist_df, historical_df, final_df)
        if not typhoon_probs.empty:
            final_df = final_df.merge(typhoon_probs, on=['Year', 'Month', 'City'], how='left')
            final_df['Typhoon_Probability'] = final_df['Typhoon_Probability'].fillna(0)
        else:
            final_df['Typhoon_Probability'] = 0.0
    else:
        final_df['Typhoon_Probability'] = 0.0

    # Run Classification
    def apply_class(row):
        try:
            return classifier.classify(
                city=row['City'],
                temp=row.get('Temperature_Mean_C', 0),
                precip=row.get('Precipitation_Total_mm', 0),
                wind=row.get('WindSpeed_Max_ms', 0),
                humidity=row.get('Humidity_Mean_perc', 0)
            )
        except:
            return "Cloudy"

    final_df['Category_Class'] = final_df.apply(apply_class, axis=1)
    final_df['Station'] = final_df['City'] 
    
    final_df = final_df.sort_values(['City', 'Month'])
    
    result = final_df.to_dict(orient="records")
    
    # SAVE TO CACHE
    WEATHER_CACHE_5CITIES[year] = result
    
    print(f"5-Cities prediction done in {time.time() - start_time:.2f}s")
    
    return result

# ==========================================
# 2. WEATHER TREND ENDPOINT (PARALLEL, CACHED)
# ==========================================
@app.get("/api/weather")
async def get_weather(year: int):
    # Check Cache
    if year in WEATHER_CACHE_TRENDS:
        return WEATHER_CACHE_TRENDS[year]

    if year < MAX_HIST_YEAR:
        filtered = historical_df[historical_df['Year'] == year].copy()
        return filtered.fillna(0).to_dict(orient="records")

    start_time = time.time()
    try:
        current_year_history = pd.DataFrame()
        if not historical_df.empty:
            raw_hist = historical_df[historical_df['Year'] == year].copy()
            if not raw_hist.empty:
                grp = raw_hist.groupby(['Year', 'Month'])
                current_year_history = grp.agg({
                    'Temperature_Mean_C': 'mean', 'Temperature_Max_C': 'mean',
                    'Temperature_Min_C': 'mean', 'Precipitation_Total_mm': 'mean',
                    'Humidity_Mean_perc': 'mean', 'WindSpeed_Max_ms': 'max' 
                }).reset_index().round(2)
        
        # Parallel Processing
        with concurrent.futures.ThreadPoolExecutor() as executor:
            f_temp = executor.submit(train_predict_temperature_lstm, historical_df, year)
            f_precip = executor.submit(train_predict_precipitation_prophet, historical_df, year)
            f_wind = executor.submit(train_predict_wind_rf, historical_df, year)
            f_humid = executor.submit(train_predict_humidity_xgboost, historical_df, year)
            
            df_temp = f_temp.result()
            df_precip = f_precip.result()
            df_wind = f_wind.result()
            df_humid = f_humid.result()
        
        preds = df_temp.merge(df_precip, on=['Year', 'Month'], how='outer')
        preds = preds.merge(df_wind, on=['Year', 'Month'], how='outer')
        preds = preds.merge(df_humid, on=['Year', 'Month'], how='outer')
        
        final_df = pd.concat([current_year_history, preds], ignore_index=True)
        final_df = final_df.sort_values('Month').fillna(0)
        
        result = final_df.to_dict(orient="records")
        WEATHER_CACHE_TRENDS[year] = result
        print(f"Aggregated prediction done in {time.time() - start_time:.2f}s")
        return result

    except Exception as e:
        print(f"Error: {str(e)}")
        return {"error": str(e)}

# ==========================================
# 3. TOURIST HIGHLIGHT ENDPOINT
# ==========================================
class ClusterRequest(BaseModel):
    year: int
    month: int
    city: str
    temp: float
    precip: float
    wind: float = 0
    humidity: float = 0

@app.post("/api/tourist/cluster")
async def get_tourist_cluster(req: ClusterRequest):
    try:
        tourist_count = 0
        if not full_tourist_df.empty:
            hist_row = full_tourist_df[
                (full_tourist_df['Year'] == req.year) & 
                (full_tourist_df['Month'] == req.month) & 
                (full_tourist_df['City'] == req.city)
            ]
            if not hist_row.empty:
                tourist_count = int(hist_row.iloc[0]['Total_Tourists'])
        
        if tourist_count == 0:
            df_pred = train_predict_tourist_rf(historical_df, full_tourist_df, req.year)
            row = df_pred[(df_pred['Month'] == req.month) & (df_pred['City'] == req.city)]
            if not row.empty:
                tourist_count = int(row.iloc[0]['Total_Tourists'])

        cluster_id = cluster_model.predict_cluster(
            tourists=tourist_count, temp=req.temp, precip=req.precip, month=req.month
        )
        
        ui_condition = "Cloudy"
        if req.precip > 100: ui_condition = "Rainy"
        elif req.temp > 25 and req.precip < 50: ui_condition = "Sunny"

        return {"tourist_count": tourist_count, "cluster": cluster_id, "ui_condition": ui_condition}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# 4. TAIWAN TOURIST TREND ENDPOINT
# ==========================================
@app.get("/api/tourist/total-trend")
async def get_total_tourist_trend(target_year: int = 2025):
    try:
        if taiwan_tourist_df.empty: return []
        result_df = train_predict_taiwan_tourist_lr(taiwan_tourist_df, target_year)
        return result_df.to_dict(orient="records")
    except Exception as e:
        return []
    
# ==========================================
# 5. 5-CITIES TREND INSIGHT ENDPOINT
# ==========================================
@app.get("/api/tourist/5-cities-trend")
async def get_5cities_trend():
    if CACHE_5CITIES_TREND_DATA is not None:
        return CACHE_5CITIES_TREND_DATA
    else:
        return []

# ==========================================
# 6. MAP VIEW DATA ENDPOINT
# ==========================================
@app.get("/api/map-view-data")
async def get_map_view_data(year: int):
    # This endpoint just wraps the cached weather logic
    data = await get_weather_5cities(year) 
    
    result = []
    for row in data:
        result.append({
            "Year": int(row['Year']),
            "Month": int(row['Month']),
            "City": row['City'],
            "MeanTemp": round(float(row.get('Temperature_Mean_C', 0)), 1),
            "Precipitation": round(float(row.get('Precipitation_Total_mm', 0)), 1),
            "WindSpeed": round(float(row.get('WindSpeed_Max_ms', 0)), 1),
            "Humidity": round(float(row.get('Humidity_Mean_perc', 0)), 1),
            "Typhoon_Prob": round(float(row.get('Typhoon_Probability', 0)), 2),
            "Category": row.get('Category_Class', "Cloudy")
        })
    return result

# ==========================================
# 7. WHAT-IF SIMULATION 
# ==========================================
class SimulationRequest(BaseModel):
    city: str = "Taipei"
    month: int
    temperature: float
    precipitation: float
    humidity: float = 75.0  
    wind_speed: float = 3.0 

@app.post("/api/simulation/analyze")
async def simulate_weather_impact(sim: SimulationRequest):
    try:
        if not (1 <= sim.month <= 12):
            raise HTTPException(status_code=400, detail="Month must be between 1 and 12")

        predicted_category = classifier.classify(
            city=sim.city,
            temp=sim.temperature,
            precip=sim.precipitation,
            wind=sim.wind_speed,
            humidity=sim.humidity
        )

        advice = "Weather conditions are moderate."
        if predicted_category == "Rainy":
            advice = "High chance of rain. Recommended: Indoor museums, shopping malls."
        elif predicted_category == "Sunny":
            advice = "Great weather! Perfect for beaches and outdoor sightseeing."
        
        warnings = []
        if sim.temperature > 33: warnings.append("Extreme Heat Warning: Stay hydrated.")
        if sim.wind_speed > 15: warnings.append("High Wind Alert: Avoid coastal activities.")

        return {
            "status": "success",
            "input_scenario": sim.dict(),
            "ai_prediction": predicted_category,
            "travel_advice": advice,
            "safety_warnings": warnings
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)