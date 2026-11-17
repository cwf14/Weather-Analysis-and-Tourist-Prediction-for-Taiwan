import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder, MinMaxScaler
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from imblearn.over_sampling import SMOTE
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
from prophet import Prophet
import random

# Set seeds
seed = 42
np.random.seed(seed)
random.seed(seed)
torch.manual_seed(seed)

# Determine Prediction Start Month 
def get_prediction_range(df, target_year):
    max_year = df['Year'].max()
    max_month = df[df['Year'] == max_year]['Month'].max()
    
    if target_year == max_year:
        return range(int(max_month) + 1, 13)
    elif target_year > max_year:
        return range(1, 13)
    else:
        return range(1, 1)
    
# ==========================================
# 1. WIND SPEED MODEL (Random Forest)
# ==========================================
def train_predict_wind_rf(df, target_year):
    print(f"--- Training Wind Speed Model (RF) for {target_year} ---")
    
    # Filter training data (History Only)
    train_df = df[df['Year'] < target_year].copy()
    if train_df.empty: train_df = df.copy()

    le_station = LabelEncoder()
    # Use full df for fitting to ensure all stations are known
    le_station.fit(df['Station'])
    train_df['Station_encoded'] = le_station.transform(train_df['Station'])

    # Define feature columns and target variable for the model
    features = ['Year', 'Month', 'Station_encoded', 'Temperature_Mean_C', 
               'Temperature_Max_C', 'Temperature_Min_C', 'Precipitation_Total_mm',
               'Humidity_Mean_perc', 'Pressure_Mean_hPa', 'Precipitation_Days_ge_0_1mm']
    target = 'WindSpeed_Max_ms'

    # Remove rows where target is missing
    df_clean = train_df.dropna(subset=[target])
    X = df_clean[features]
    y = df_clean[target]

    # Train the model (using exact parameters from your script)
    model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
    model.fit(X, y)

    # Determine prediction range (dynamic for your app)
    pred_months = get_prediction_range(df, target_year)
    if len(pred_months) == 0: return pd.DataFrame()

    future_predictions = []
    
    # Calculate monthly statistics for realistic variations
    monthly_stats = df.groupby(['Station', 'Month']).agg({
        'Temperature_Mean_C': ['mean', 'std'],
        'Temperature_Max_C': ['mean', 'std'],
        'Temperature_Min_C': ['mean', 'std'],
        'Precipitation_Total_mm': ['mean', 'std'],
        'Humidity_Mean_perc': ['mean', 'std'],
        'Pressure_Mean_hPa': ['mean', 'std'],
        'Precipitation_Days_ge_0_1mm': ['mean', 'std'],
        'WindSpeed_Max_ms': ['mean', 'std']
    }).round(3)
    
    unique_stations = df['Station'].unique()
    
    for station_name in unique_stations:
        try:
            station_code = le_station.transform([station_name])[0]
        except:
            continue

        for month in pred_months:
            # Get stats for this specific station and month
            try:
                stats = monthly_stats.loc[(station_name, month)]
            except KeyError:
                continue
            
            feature_row = {
                'Year': target_year,
                'Month': month,
                'Station_encoded': station_code
            }
            
            # Add weather features with realistic seasonal patterns and variations
            for feature in ['Temperature_Mean_C', 'Temperature_Max_C', 'Temperature_Min_C',
                           'Humidity_Mean_perc', 'Pressure_Mean_hPa', 'Precipitation_Total_mm',
                           'Precipitation_Days_ge_0_1mm']:
                
                base_value = stats[feature]['mean']
                std_value = stats[feature]['std']
                if pd.isna(std_value): std_value = 0
                
                # Add year-specific variations
                climate_trend = 0
                if feature.startswith('Temperature'):
                    climate_trend = (target_year - 2024) * 0.1  # 0.1°C increase per year
                
                # Year-specific variation factors
                year_variation_factors = 0.2 
                if target_year == 2026: year_variation_factors = 0.3
                if target_year == 2027: year_variation_factors = 0.4
                
                # Add random variation within historical range
                random_variation = np.random.normal(0, std_value * year_variation_factors)
                
                final_value = base_value + climate_trend + random_variation
                
                # Ensure values stay within reasonable bounds
                if feature.startswith('Temperature'):
                    final_value = max(min(final_value, base_value + 10), base_value - 10)
                elif feature == 'Humidity_Mean_perc':
                    final_value = max(min(final_value, 100), 30)
                elif feature == 'Pressure_Mean_hPa':
                    final_value = max(min(final_value, 1030), 980)
                elif feature == 'Precipitation_Total_mm':
                    final_value = max(0, final_value)
                elif feature == 'Precipitation_Days_ge_0_1mm':
                    final_value = max(0, min(31, final_value))
                
                feature_row[feature] = final_value
            
            # Convert to DataFrame for prediction
            feature_df = pd.DataFrame([feature_row], columns=features)
            
            # Make prediction
            base_prediction = model.predict(feature_df)[0]
            
            # Add small random variation to final wind speed prediction
            wind_std = stats['WindSpeed_Max_ms']['std']
            if pd.isna(wind_std): wind_std = base_prediction * 0.1
            
            wind_variation = np.random.normal(0, wind_std * 0.2)
            final_prediction = max(0, round(base_prediction + wind_variation, 2))
            
            future_predictions.append({
                'Year': target_year,
                'Month': month,
                'Predicted_WindSpeed_Max_ms': final_prediction
            })

    if not future_predictions: return pd.DataFrame()
    
    future_predictions_df = pd.DataFrame(future_predictions)
    
    # Calculate monthly MAXIMUM for Taiwan (across all stations)
    taiwan_monthly_max = future_predictions_df.groupby(['Year', 'Month'])['Predicted_WindSpeed_Max_ms'].agg([
        'max'
    ]).reset_index()

    taiwan_monthly_max.rename(columns={'max': 'WindSpeed_Max_ms'}, inplace=True)
    
    return taiwan_monthly_max

# ==========================================
# 2. TEMPERATURE MODEL (LSTM)
# ==========================================
class LSTMModel(nn.Module):
    def __init__(self, input_size, hidden_size, num_layers, output_size):
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_size, output_size)
    def forward(self, x):
        out, _ = self.lstm(x)
        return self.fc(out[:, -1, :])

def train_predict_temperature_lstm(df, target_year):
    print(f"--- Training Temperature Model (LSTM) for {target_year} ---")
    
    # Aggregate Whole Taiwan Monthly Mean
    monthly_df = df.groupby(['Year', 'Month']).mean(numeric_only=True).reset_index()
    
    predict_cols = ['Temperature_Mean_C', 'Temperature_Max_C', 'Temperature_Min_C']
    feature_cols = ['Year', 'Month'] + [col for col in predict_cols if col != 'Temperature_Mean_C']
    lookback = 12
    input_size = len(feature_cols)
    
    # Prepare Future DataFrame Base
    last_year = int(monthly_df['Year'].max())
    last_month = int(monthly_df[monthly_df['Year'] == last_year]['Month'].max())
    
    future_dates = []
    curr_y, curr_m = last_year, last_month
    
    while True:
        curr_m += 1
        if curr_m > 12:
            curr_m = 1
            curr_y += 1
        future_dates.append({'Year': curr_y, 'Month': curr_m})
        if curr_y == target_year and curr_m == 12: break
            
    future_df_base = pd.DataFrame(future_dates)
    final_results = future_df_base.copy()
    
    monthly_means = monthly_df.groupby('Month').mean(numeric_only=True)

    for col in predict_cols:
        # Data Prep
        df_sorted = monthly_df.sort_values(['Year', 'Month'])
        X = df_sorted[feature_cols].values
        y = df_sorted[col].values.reshape(-1, 1)
        
        scaler_X = MinMaxScaler()
        scaler_y = MinMaxScaler()
        X_scaled = scaler_X.fit_transform(X)
        y_scaled = scaler_y.fit_transform(y)
        
        X_seq, y_seq = [], []
        for i in range(len(X_scaled) - lookback):
            X_seq.append(X_scaled[i:i+lookback])
            y_seq.append(y_scaled[i+lookback])
            
        if not X_seq: continue

        X_tensor = torch.tensor(np.array(X_seq), dtype=torch.float32)
        y_tensor = torch.tensor(np.array(y_seq), dtype=torch.float32)
        
        # DataLoader
        train_loader = DataLoader(list(zip(X_tensor, y_tensor)), batch_size=16, shuffle=True)
        
        # Model Init 
        hidden_size = 64
        num_layers = 2
        model = LSTMModel(input_size, hidden_size, num_layers, 1)
        criterion = nn.MSELoss()
        optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
        
        # Training 
        model.train()
        for epoch in range(100):
            for X_batch, y_batch in train_loader:
                optimizer.zero_grad()
                # Fix dimension issue for single batch
                if X_batch.ndim == 2: X_batch = X_batch.unsqueeze(0)
                output = model(X_batch).squeeze()
                loss = criterion(output, y_batch.squeeze())
                loss.backward()
                optimizer.step()
                
        # Prediction
        model.eval()
        
        # Fill future features with averages
        temp_future = future_df_base.copy()
        for f in feature_cols:
            if f not in ['Year', 'Month']:
                temp_future[f] = temp_future['Month'].map(monthly_means[f])
        
        future_X_scaled = scaler_X.transform(temp_future[feature_cols].values)
        
        # Use last known sequence
        current_seq = X_scaled[-lookback:].reshape(1, lookback, input_size)
        
        preds = []
        with torch.no_grad():
            for i in range(len(temp_future)):
                p_scaled = model(torch.tensor(current_seq, dtype=torch.float32)).squeeze().numpy()
                p_val = scaler_y.inverse_transform(p_scaled.reshape(-1, 1)).flatten()[0]
                preds.append(round(p_val, 2))
                
                # Update sequence
                next_feats = future_X_scaled[i].reshape(1, -1)
                # Update autoregressive target if it exists in features
                if col in feature_cols:
                    idx = feature_cols.index(col)
                    next_feats[0, idx] = scaler_y.transform([[p_val]])[0, 0]
                    
                current_seq = np.concatenate((current_seq[:, 1:, :], next_feats.reshape(1, 1, input_size)), axis=1)
        
        final_results[col] = preds

    # Return only required months
    pred_months = list(get_prediction_range(df, target_year))
    return final_results[(final_results['Year'] == target_year) & (final_results['Month'].isin(pred_months))]

# ==========================================
# 3. PRECIPITATION MODEL (Prophet)
# ==========================================
def train_predict_precipitation_prophet(df, target_year):
    print(f"--- Training Precipitation Model (Prophet) for {target_year} ---")
    
    # Aggregate monthly averages (Whole Taiwan)
    monthly_df = df.groupby(['Year', 'Month']).mean(numeric_only=True).reset_index()
    monthly_df['ds'] = pd.to_datetime(monthly_df[['Year', 'Month']].assign(Day=1))
    
    # Cap extreme outliers
    precip_cap = monthly_df['Precipitation_Total_mm'].quantile(0.99)
    monthly_df['Precipitation_Total_mm'] = np.minimum(monthly_df['Precipitation_Total_mm'], precip_cap)
    monthly_df['y'] = np.log1p(monthly_df['Precipitation_Total_mm'])
    
    # Feature engineering
    monthly_df['Wet_Season'] = monthly_df['Month'].isin([5, 6, 7, 8, 9, 10]).astype(int)
    monthly_df['Typhoon_Season'] = monthly_df['Month'].isin([6, 7, 8, 9, 10]).astype(int)
    monthly_df['Precip_Lag1'] = monthly_df['Precipitation_Total_mm'].shift(1)
    monthly_df['Precip_Lag2'] = monthly_df['Precipitation_Total_mm'].shift(2)
    monthly_df['Precipitation_Days_Lag1'] = monthly_df['Precipitation_Days_ge_0_1mm'].shift(1)
    monthly_df['Wind_Dir_Sin'] = np.sin(2 * np.pi * monthly_df['WindSpeed_Max_Dir'] / 360)
    monthly_df['Wind_Dir_Cos'] = np.cos(2 * np.pi * monthly_df['WindSpeed_Max_Dir'] / 360)
    
    # Drop NaN created by lags
    monthly_df = monthly_df.dropna()

    # Filter Training Data (Use everything BEFORE target_year)
    train_df = monthly_df[monthly_df['Year'] < target_year].reset_index(drop=True)
    
    # Fallback if empty (e.g. user selects a past year)
    if train_df.empty: train_df = monthly_df.copy()

    # Add external regressors
    regressors = [
        'Temperature_Mean_C', 'Humidity_Mean_perc', 'Pressure_Mean_hPa',
        'WindSpeed_Max_ms', 'Wet_Season', 'Typhoon_Season',
        'Precip_Lag1', 'Precip_Lag2', 'Precipitation_Days_ge_0_1mm',
        'Precipitation_Days_Lag1', 'Wind_Dir_Sin', 'Wind_Dir_Cos'
    ]

    # Prophet model
    model = Prophet(
        yearly_seasonality=40,
        weekly_seasonality=False,
        daily_seasonality=False,
        changepoint_prior_scale=0.4,
        seasonality_prior_scale=8.0,
    )
    model.add_seasonality(name='monthly', period=30.42, fourier_order=5)
    
    for reg in regressors:
        model.add_regressor(reg)

    # Train Prophet model
    model.fit(train_df[['ds', 'y'] + regressors])

    # Future Prediction Logic 
    
    # Determine which months need prediction
    pred_range = get_prediction_range(df, target_year)
    if len(pred_range) == 0: return pd.DataFrame()
    
    # Create future dates
    future_dates = [f"{target_year}-{m:02d}-01" for m in pred_range]
    future_df = pd.DataFrame({'ds': pd.to_datetime(future_dates)})
    future_df['Year'] = future_df['ds'].dt.year
    future_df['Month'] = future_df['ds'].dt.month
    
    # Feature Engineering for Future
    future_df['Wet_Season'] = future_df['Month'].isin([5, 6, 7, 8, 9, 10]).astype(int)
    future_df['Typhoon_Season'] = future_df['Month'].isin([6, 7, 8, 9, 10]).astype(int)
    
    # Monthly averages for regressors (from training data)
    monthly_means = train_df.groupby('Month').mean(numeric_only=True)
    
    # Lag features for future predictions (using historical means)
    future_df['Temperature_Mean_C'] = future_df['Month'].map(monthly_means['Temperature_Mean_C'])
    future_df['Humidity_Mean_perc'] = future_df['Month'].map(monthly_means['Humidity_Mean_perc'])
    future_df['Pressure_Mean_hPa'] = future_df['Month'].map(monthly_means['Pressure_Mean_hPa'])
    future_df['WindSpeed_Max_ms'] = future_df['Month'].map(monthly_means['WindSpeed_Max_ms'])
    future_df['Precipitation_Days_ge_0_1mm'] = future_df['Month'].map(monthly_means['Precipitation_Days_ge_0_1mm'])
    
    future_df['Precip_Lag1'] = future_df['Month'].map(monthly_means['Precipitation_Total_mm'])
    # Simplified logic: For future years, lag2 approx equals lag1 or mean
    future_df['Precip_Lag2'] = future_df['Precip_Lag1'].shift(1).fillna(method='bfill')
    
    future_df['Precipitation_Days_Lag1'] = future_df['Month'].map(monthly_means['Precipitation_Days_ge_0_1mm']).shift(1).fillna(method='bfill')
    
    # Encode wind direction
    full_means = monthly_df.groupby('Month')['WindSpeed_Max_Dir'].mean()
    
    future_df['Wind_Dir_Sin'] = np.sin(2 * np.pi * future_df['Month'].map(full_means) / 360)
    future_df['Wind_Dir_Cos'] = np.cos(2 * np.pi * future_df['Month'].map(full_means) / 360)

    # Generate future forecasts
    forecast_future = model.predict(future_df)
    
    # Inverse Transform
    future_df['Precipitation_Total_mm'] = np.expm1(forecast_future['yhat']).round(2)
    
    # Ensure non-negative
    future_df['Precipitation_Total_mm'] = future_df['Precipitation_Total_mm'].clip(lower=0)

    return future_df[['Year', 'Month', 'Precipitation_Total_mm']]

# ==========================================
# 4. HUMIDITY MODEL (XGBoost)
# ==========================================
def train_predict_humidity_xgboost(df, target_year):
    print(f"--- Training Humidity Model (XGBoost) for {target_year} ---")
    
    train_df = df.copy()
    
    df_proc = pd.get_dummies(train_df, columns=['Station'], prefix='Station')
    df_proc['month_sin'] = np.sin(2 * np.pi * df_proc['Month'] / 12)
    df_proc['month_cos'] = np.cos(2 * np.pi * df_proc['Month'] / 12)
    df_proc = df_proc.sort_values(['Year', 'Month'])
    
    station_cols = [c for c in df_proc.columns if 'Station_' in c]
    df_proc['humidity_lag_1'] = df_proc.groupby(station_cols)['Humidity_Mean_perc'].shift(1)
    df_proc.dropna(subset=['humidity_lag_1'], inplace=True)
    
    features = ['Year', 'month_sin', 'month_cos', 'humidity_lag_1',
                'Temperature_Mean_C', 'Temperature_Max_C', 'Temperature_Min_C',
                'Precipitation_Total_mm', 'Precipitation_Days_ge_0_1mm',
                'WindSpeed_Max_ms', 'Pressure_Mean_hPa'] + station_cols
    
    model = xgb.XGBRegressor(objective='reg:squarederror', n_estimators=100, max_depth=6, n_jobs=-1)
    model.fit(df_proc[features], df_proc['Humidity_Mean_perc'])

    pred_months = get_prediction_range(df, target_year)
    if len(pred_months) == 0: return pd.DataFrame()

    unique_stations = df['Station'].unique()
    last_known = {}
    
    for s in unique_stations:
        d = df[df['Station'] == s].sort_values(['Year', 'Month'])
        if not d.empty: last_known[s] = d.iloc[-1]['Humidity_Mean_perc']
        else: last_known[s] = 75.0
            
    monthly_means = df.groupby(['Station', 'Month']).mean(numeric_only=True)
    taiwan_preds = []
    
    for month in pred_months:
        month_preds = []
        for station in unique_stations:
            try:
                means = monthly_means.loc[(station, month)]
                row = {
                    'Year': target_year,
                    'month_sin': np.sin(2*np.pi*month/12),
                    'month_cos': np.cos(2*np.pi*month/12),
                    'humidity_lag_1': last_known[station]
                }
                for f in ['Temperature_Mean_C','Temperature_Max_C','Temperature_Min_C',
                          'Precipitation_Total_mm','Precipitation_Days_ge_0_1mm',
                          'WindSpeed_Max_ms','Pressure_Mean_hPa']:
                    row[f] = means[f]
                
                for c in station_cols: row[c] = 1 if c == f'Station_{station}' else 0
                
                pred = model.predict(pd.DataFrame([row], columns=features))[0]
                last_known[station] = pred
                month_preds.append(pred)
            except: continue
            
        if month_preds:
            taiwan_preds.append({
                'Year': target_year,
                'Month': month,
                'Humidity_Mean_perc': np.mean(month_preds)
            })
    return pd.DataFrame(taiwan_preds).round(2)


# ==============================================================================
#  5 CITIES SPECIFIC MODELS (Taipei, New Taipei, Taichung, Tainan, Kaohsiung)
# ==============================================================================
TARGET_STATIONS = ['Taipei', 'New Taipei', 'Taichung', 'Tainan', 'Kaohsiung']

# 5 Cities Prediction Range
def get_5cities_future_dates(target_year):
    # Generates list of months to predict
    future_dates = []
    start_m = 9 if target_year == 2025 else 1
    for m in range(start_m, 13):
        future_dates.append({'Year': target_year, 'Month': m})
    return pd.DataFrame(future_dates)

# ==============================================================================
#  1. 5-CITIES PRECIPITATION (Random Forest)
# ==============================================================================
def train_predict_5cities_precip_rf(df, target_year):
    print(f"--- Training 5-Cities Precipitation Model (RF) for {target_year} ---")
    
    # Filter & Preprocess
    df_filtered = df[df['Station'].isin(TARGET_STATIONS)].copy()
    
    # Train on historical data strictly before the target year
    train_df = df_filtered[df_filtered['Year'] < target_year].copy()
    if train_df.empty: 
        train_df = df_filtered.copy()

    # Label Encoder 
    le = LabelEncoder()
    # Fit on all stations
    le.fit(df['Station']) 
    train_df['Station_encoded'] = le.transform(train_df['Station'])
    
    # Features 
    features = ['Year', 'Month', 'Station_encoded', 'Temperature_Mean_C', 
               'Temperature_Max_C', 'Temperature_Min_C', 
               'Humidity_Mean_perc', 'Pressure_Mean_hPa', 'Precipitation_Days_ge_0_1mm',
               'WindSpeed_Max_ms', 'WindSpeed_Max_Dir']
    target = 'Precipitation_Total_mm'
    
    # Drop missing targets
    train_df = train_df.dropna(subset=[target])
    
    # Model Definition 
    model = RandomForestRegressor(
        n_estimators=50, 
        max_depth=15, 
        min_samples_split=10, 
        min_samples_leaf=5, 
        max_features='sqrt', 
        bootstrap=True,
        random_state=42, 
        n_jobs=-1
    )
    
    # Train
    model.fit(train_df[features], train_df[target])
    
    # Prediction Logic
    future_df = get_5cities_future_dates(target_year)
    if future_df.empty: return pd.DataFrame()
    
    predictions = []
    
    # Iterate through the specific 5 stations
    for station_name in TARGET_STATIONS:
        if station_name not in le.classes_:
            continue
            
        station_code = le.transform([station_name])[0]
        
        # Get historical patterns for this SPECIFIC station
        station_data = df[df['Station'] == station_name]
        
        for _, row in future_df.iterrows():
            target_month = row['Month']
            target_year_val = row['Year']
            
            # Filter for that specific month to get history 
            month_data = station_data[station_data['Month'] == target_month]
            
            feature_row = {}
            feature_row['Year'] = target_year_val
            feature_row['Month'] = target_month
            feature_row['Station_encoded'] = station_code
            
            # Feature Generation Logic 
            if len(month_data) > 0:
                # Use monthly medians with randomness based on historical STD
                for feature in features[3:]: # Skip Year, Month, Station_encoded
                    if feature in month_data.columns:
                        median_val = month_data[feature].median()
                        std_val = month_data[feature].std()
                        
                        # Handle case where std is NaN 
                        if pd.isna(std_val): std_val = 0
                        
                        # Add realistic variability
                        feature_row[feature] = np.random.normal(median_val, std_val * 0.2)
                    else:
                        # Fallback if column missing
                        feature_row[feature] = station_data[feature].median()
            else:
                # Fallback to general station averages if no data for that month exists
                for feature in features[3:]:
                    feature_row[feature] = station_data[feature].median()

            # Create DataFrame for single prediction
            input_df = pd.DataFrame([feature_row], columns=features)
            
            # Predict
            pred = model.predict(input_df)[0]
            pred = max(0, pred) # Ensure non-negative
            
            predictions.append({
                'Year': target_year_val, 
                'Month': target_month, 
                'Station': station_name,
                'Precipitation_Total_mm': round(pred, 2)
            })
            
    return pd.DataFrame(predictions)

# ==============================================================================
#  2. 5-CITIES WIND SPEED (Random Forest)
# ==============================================================================
def train_predict_5cities_wind_rf(df, target_year):
    print(f"--- Training 5-Cities Wind Model (RF) for {target_year} ---")
    
    # Filter & Preprocess
    df_filtered = df[df['Station'].isin(TARGET_STATIONS)].copy()
    
    # Train on all historical data before target_year
    train_df = df_filtered[df_filtered['Year'] < target_year].copy()
    if train_df.empty: train_df = df_filtered.copy()

    le = LabelEncoder()
    le.fit(df['Station']) # Fit on all stations
    train_df['Station_encoded'] = le.transform(train_df['Station'])
    
    # 
    features = ['Year', 'Month', 'Station_encoded', 'Temperature_Mean_C', 
               'Temperature_Max_C', 'Temperature_Min_C', 'Precipitation_Total_mm',
               'Humidity_Mean_perc', 'Pressure_Mean_hPa', 'Precipitation_Days_ge_0_1mm']
    target = 'WindSpeed_Max_ms'
    
    train_df = train_df.dropna(subset=[target])
    
    # Train Model 
    model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
    model.fit(train_df[features], train_df[target])
    
    # Prediction Logic
    future_df = get_5cities_future_dates(target_year)
    if future_df.empty: return pd.DataFrame()
    
    predictions = []
    
    for station_name in TARGET_STATIONS:
        if station_name not in le.classes_: continue
        station_code = le.transform([station_name])[0]
        
        # Get historical data for THIS specific station to calculate stats
        station_data = df[df['Station'] == station_name].copy()
        
        # Calculate monthly averages and variations
        monthly_stats = station_data.groupby('Month').agg({
            'Temperature_Mean_C': ['mean', 'std'],
            'Temperature_Max_C': ['mean', 'std'],
            'Temperature_Min_C': ['mean', 'std'],
            'Humidity_Mean_perc': ['mean', 'std'],
            'Pressure_Mean_hPa': ['mean', 'std'],
            'Precipitation_Total_mm': ['mean', 'std'],
            'Precipitation_Days_ge_0_1mm': ['mean', 'std'],
            'WindSpeed_Max_ms': ['mean', 'std']
        }).round(3)
        
        for _, row in future_df.iterrows():
            year = row['Year']
            month = row['Month']
            
            # Year variation logic
            year_variation = 1.0 + (year - 2025) * 0.01
            
            feature_row = {
                'Year': year,
                'Month': month,
                'Station_encoded': station_code
            }
            
            # add weather features with seasonal patterns and random noise
            for feature in features[3:]: # Skip Year, Month, Station_encoded
                if feature in monthly_stats.columns:
                    base_value = monthly_stats[feature]['mean'][month]
                    std_value = monthly_stats[feature]['std'][month]
                    if pd.isna(std_value): std_value = 0
                    
                    # Variation Scale Logic 
                    if feature == 'Pressure_Mean_hPa':
                        variation_scale = 0.1
                    elif feature == 'Humidity_Mean_perc':
                        variation_scale = 0.3
                    else:
                        variation_scale = 0.5
                        
                    # Random variation
                    random_variation = np.random.normal(0, std_value * variation_scale)
                    final_value = base_value * year_variation + random_variation
                    
                    # Bounds Checking 
                    if feature.startswith('Temperature'):
                        final_value = max(min(final_value, base_value + 10), base_value - 10)
                    elif feature == 'Humidity_Mean_perc':
                        final_value = max(min(final_value, 100), 30)
                    elif feature == 'Pressure_Mean_hPa':
                        final_value = max(min(final_value, 1030), 980)
                    
                    feature_row[feature] = final_value
                else:
                    # Fallback if feature somehow missing from stats
                    feature_row[feature] = 0

            # Make prediction
            input_df = pd.DataFrame([feature_row], columns=features)
            pred = model.predict(input_df)[0]
            
            # Add small random variation to final prediction
            prediction_variation = np.random.normal(1.0, 0.03) # 3% variation
            final_prediction = round(max(0, pred * prediction_variation), 2)
            
            predictions.append({
                'Year': year, 
                'Month': month, 
                'Station': station_name,
                'WindSpeed_Max_ms': final_prediction
            })
            
    return pd.DataFrame(predictions)

# ==============================================================================
#  3. 5-CITIES HUMIDITY (XGBoost)
# ==============================================================================
def train_predict_5cities_humidity_xgb(df, target_year):
    print(f"--- Training 5-Cities Humidity Model (XGBoost) for {target_year} ---")
    
    # Filter & Preprocess
    df_filtered = df[df['Station'].isin(TARGET_STATIONS)].copy()
    
    # Train on historical data (before target year)
    train_df = df_filtered[df_filtered['Year'] < target_year].copy()
    if train_df.empty: train_df = df_filtered.copy()
    
    # Feature Engineering: One-Hot Encoding for Station 
    df_processed = pd.get_dummies(train_df, columns=['Station'], prefix='Station')
    
    # Define features
    features = [
        'Year', 'Month', 
        'Temperature_Mean_C', 'Temperature_Max_C', 'Temperature_Min_C',
        'Precipitation_Total_mm', 'Precipitation_Days_ge_0_1mm',
        'WindSpeed_Max_ms',
        'Pressure_Mean_hPa'
    ] + [col for col in df_processed.columns if 'Station_' in col]
    
    target = 'Humidity_Mean_perc'
    
    # Model Training (Matches script hyperparameters exactly)
    xgb_reg = xgb.XGBRegressor(
        objective='reg:squarederror', 
        n_estimators=200,
        learning_rate=0.05,
        max_depth=6,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        n_jobs=-1
    )
    
    xgb_reg.fit(df_processed[features], df_processed[target])
    
    # Future Prediction Logic
    future_data = []
    
    # Determine months to predict based on target_year
    if target_year == 2025:
        months = range(9, 13) # Sept to Dec
    else:
        months = range(1, 13) # Full year
        
    # Year-specific variation factors 
    year_variation_factor = {2025: 0.3, 2026: 0.4, 2027: 0.5}
    # Default to 0.5 if year is beyond 2027
    current_year_factor = year_variation_factor.get(target_year, 0.5)
    
    for station in TARGET_STATIONS:
        # Get historical data for this station to understand patterns
        station_historical = df_filtered[df_filtered['Station'] == station].copy()
        
        # Calculate monthly statistics 
        monthly_stats = station_historical.groupby('Month').agg({
            'Temperature_Mean_C': ['mean', 'std'],
            'Temperature_Max_C': ['mean', 'std'],
            'Temperature_Min_C': ['mean', 'std'],
            'Precipitation_Total_mm': ['mean', 'std'],
            'Precipitation_Days_ge_0_1mm': ['mean', 'std'],
            'WindSpeed_Max_ms': ['mean', 'std'],
            'Pressure_Mean_hPa': ['mean', 'std'],
            'Humidity_Mean_perc': ['mean', 'std']
        }).round(3)
        
        for month in months:
            # Add small climate trend + randomness 
            climate_trend = (target_year - 2024) * 0.2 + np.random.normal(0, 0.1)
            
            # Get base values for this month
            try:
                base_temp_mean = monthly_stats[('Temperature_Mean_C', 'mean')][month]
                base_temp_max = monthly_stats[('Temperature_Max_C', 'mean')][month]
                base_temp_min = monthly_stats[('Temperature_Min_C', 'mean')][month]
                base_precip = monthly_stats[('Precipitation_Total_mm', 'mean')][month]
                base_precip_days = monthly_stats[('Precipitation_Days_ge_0_1mm', 'mean')][month]
                base_windspeed = monthly_stats[('WindSpeed_Max_ms', 'mean')][month]
                base_pressure = monthly_stats[('Pressure_Mean_hPa', 'mean')][month]
                
                # Add random variations within historical ranges
                temp_std = monthly_stats[('Temperature_Mean_C', 'std')][month]
                precip_std = monthly_stats[('Precipitation_Total_mm', 'std')][month]
                windspeed_std = monthly_stats[('WindSpeed_Max_ms', 'std')][month]
                pressure_std = monthly_stats[('Pressure_Mean_hPa', 'std')][month]
            except KeyError:
                continue # Skip if data missing for month
            
            # Apply variations 
            temp_variation = np.random.normal(0, temp_std * current_year_factor)
            precip_variation = np.random.normal(0, precip_std * current_year_factor)
            windspeed_variation = np.random.normal(0, windspeed_std * current_year_factor)
            pressure_variation = np.random.normal(0, pressure_std * current_year_factor)
            
            # Calculate Features
            temp_mean = base_temp_mean + temp_variation
            temp_max = base_temp_max + temp_variation + np.random.normal(2, 0.5)
            temp_min = base_temp_min + temp_variation - np.random.normal(2, 0.5)
            precip_total = max(0, base_precip + precip_variation)
            precip_days = max(0, min(31, base_precip_days + np.random.normal(0, 2)))
            windspeed = max(0, base_windspeed + windspeed_variation)
            pressure = base_pressure + pressure_variation
            
            # Append row
            future_data.append({
                'Year': target_year, 'Month': month, 'Station': station,
                'Temperature_Mean_C': temp_mean,
                'Temperature_Max_C': temp_max,
                'Temperature_Min_C': temp_min,
                'Precipitation_Total_mm': precip_total,
                'Precipitation_Days_ge_0_1mm': precip_days,
                'WindSpeed_Max_ms': windspeed,
                'Pressure_Mean_hPa': pressure
            })
            
    # Convert future data to DataFrame
    if not future_data: return pd.DataFrame()
    
    future_df = pd.DataFrame(future_data)
    future_df_processed = pd.get_dummies(future_df, columns=['Station'], prefix='Station')
    
    # Align columns with the training set (Matches script)
    for c in features:
        if c not in future_df_processed.columns:
            future_df_processed[c] = 0
            
    # Ensure order matches training features
    future_df_processed = future_df_processed[features]
    
    # Predict
    future_df['Humidity_Mean_perc'] = xgb_reg.predict(future_df_processed)
    
    # Post-Processing: Add noise and bounds (Matches script)
    for i in range(len(future_df)):
        # Add 1-3% random variation
        random_variation = np.random.normal(0, 1.5)
        future_df.loc[i, 'Humidity_Mean_perc'] += random_variation
        
        # Ensure humidity stays within reasonable bounds 
        current_hum = future_df.loc[i, 'Humidity_Mean_perc']
        future_df.loc[i, 'Humidity_Mean_perc'] = max(30, min(100, current_hum))
        
    return future_df[['Year', 'Month', 'Station', 'Humidity_Mean_perc']]

# ==============================================================================
#  4. 5-CITIES TEMPERATURE (LSTM)
# ==============================================================================
# Define specific LSTM architecture with Dropout matching the script
class LSTMModel5Cities(nn.Module):
    def __init__(self, input_size, hidden_size, num_layers, output_size):
        super().__init__()
        # batch_first=True, dropout=0.2
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True, dropout=0.2)
        # dropout(0.3) before fc
        self.dropout = nn.Dropout(0.3)
        self.fc = nn.Linear(hidden_size, output_size)
        
    def forward(self, x):
        out, (hidden, cell) = self.lstm(x)
        # take last time step
        out = self.dropout(out[:, -1, :])
        return self.fc(out)

def train_predict_5cities_temp_lstm(df, target_year):
    print(f"--- Training 5-Cities Temperature Model (LSTM) for {target_year} ---")
    
    # Filter & Map Data
    df_filtered = df[df['Station'].isin(TARGET_STATIONS)].copy()
    
    # Predict Columns
    predict_cols = ['Temperature_Mean_C', 'Temperature_Max_C', 'Temperature_Min_C']
    feature_cols = ['Year', 'Month'] + predict_cols
    lookback = 12
    input_size = len(feature_cols)
    
    # Test years for validation split
    test_years = [2018, 2019]
    
    # run the prediction loop starting from known data up to target_year
    # The script logic predicts 2025 -> 2026 -> 2027 sequentially.
    final_results = []

    for station in TARGET_STATIONS:
        # Prepare Station Data
        station_data = df_filtered[df_filtered['Station'] == station].sort_values(['Year', 'Month']).reset_index(drop=True)
        
        # Get Historical Stats for Feature Engineering
        monthly_stats = station_data.groupby('Month').agg({
            'Temperature_Mean_C': ['mean', 'std'],
            'Temperature_Max_C': ['mean', 'std'],
            'Temperature_Min_C': ['mean', 'std']
        }).round(3)
        
        station_preds = {} # Store predictions for Mean, Max, Min
        
        for col in predict_cols:
            # Data Prep for this column
            X = station_data[feature_cols].values
            y = station_data[col].values.reshape(-1, 1)
            
            scaler_X = MinMaxScaler()
            scaler_y = MinMaxScaler()
            X_scaled = scaler_X.fit_transform(X)
            y_scaled = scaler_y.fit_transform(y)
            
            X_seq, y_seq = [], []
            for i in range(len(X_scaled) - lookback):
                X_seq.append(X_scaled[i:i+lookback])
                y_seq.append(y_scaled[i+lookback])
            
            X_seq = np.array(X_seq)
            y_seq = np.array(y_seq)
            
            # Train/Test Split (Matches script)
            train_indices = []
            for i in range(len(X_seq)):
                # Check the year of the target value (index + lookback)
                actual_idx = i + lookback
                if actual_idx < len(station_data):
                    if station_data.iloc[actual_idx]['Year'] not in test_years:
                        train_indices.append(i)
            
            # If empty, use all
            if not train_indices: train_indices = list(range(len(X_seq)))
                
            X_train = torch.tensor(X_seq[train_indices], dtype=torch.float32)
            y_train = torch.tensor(y_seq[train_indices], dtype=torch.float32)
            
            # Training
            train_loader = DataLoader(TensorDataset(X_train, y_train), batch_size=16, shuffle=True)
            
            model = LSTMModel5Cities(input_size, 32, 2, 1) 
            criterion = nn.MSELoss()
            optimizer = torch.optim.Adam(model.parameters(), lr=0.01)
            
            model.train()
            best_loss = float('inf')
            patience = 15
            patience_counter = 0
            
            for epoch in range(30):
                epoch_loss = 0
                for X_b, y_b in train_loader:
                    optimizer.zero_grad()
                    out = model(X_b)
                    loss = criterion(out, y_b)
                    loss.backward()
                    optimizer.step()
                    epoch_loss += loss.item()
                
                epoch_loss /= len(train_loader)
                if epoch_loss < best_loss:
                    best_loss = epoch_loss
                    patience_counter = 0
                else:
                    patience_counter += 1
                    if patience_counter >= patience: break
            
            # Future Prediction Logic
            #simulate the timeline 2025 -> 2026 -> Target Year
            model.eval()
            
            future_vals = []
            
            # Generate timeline to predict
            # Matches script: predict 2025(9-12), 2026(1-12), 2027(1-12)
            sim_dates = []
            for y in [2025, 2026, 2027]:
                start_m = 9 if y == 2025 else 1
                for m in range(start_m, 13):
                    sim_dates.append({'Year': y, 'Month': m})
            
            #Last 'lookback' records from real data
            current_seq_df = station_data[feature_cols].iloc[-lookback:].copy()
            
            with torch.no_grad():
                for date_info in sim_dates:
                    sim_year = date_info['Year']
                    sim_month = date_info['Month']
                    
                    #Feature Engineering (Matches script predict_future) 
                    
                    # Base Trend
                    base_trend = (sim_year - 2024) * 0.1
                    climate_trend = base_trend + np.random.normal(0, 0.05)
                    
                    # Year Variation Factor
                    factors = {2025: 0.2, 2026: 0.3, 2027: 0.4}
                    y_factor = factors.get(sim_year, 0.4)
                    
                    # Stats for this month
                    base_mean = monthly_stats[col]['mean'][sim_month]
                    std_val = monthly_stats[col]['std'][sim_month]
                    random_var = np.random.normal(0, std_val * y_factor)
                    
                    # Update features in the rolling window that are "future" dates
                    for idx in range(len(current_seq_df)):
                        r_year = current_seq_df.iloc[idx]['Year']
                        r_month = current_seq_df.iloc[idx]['Month']
                        
                        if r_year >= 2025: # future row
                            # Recalculate temperature components based on the Model Type being trained
                            seasonal_base = monthly_stats[col]['mean'][r_month]
                            year_adj = (r_year - 2025) * 0.15
                            
                            # It uses the stats of the *current model column* to set the baseline for the row
                            pred_temp_approx = seasonal_base + climate_trend + random_var + year_adj
                            
                            # Update the specific columns in the window to maintain relationships
                            if col == 'Temperature_Mean_C':
                                current_seq_df.iloc[idx, current_seq_df.columns.get_loc('Temperature_Mean_C')] = pred_temp_approx
                                current_seq_df.iloc[idx, current_seq_df.columns.get_loc('Temperature_Max_C')] = pred_temp_approx + np.random.normal(5.0, 0.5)
                                current_seq_df.iloc[idx, current_seq_df.columns.get_loc('Temperature_Min_C')] = pred_temp_approx - np.random.normal(5.0, 0.5)
                            elif col == 'Temperature_Max_C':
                                current_seq_df.iloc[idx, current_seq_df.columns.get_loc('Temperature_Max_C')] = pred_temp_approx
                                current_seq_df.iloc[idx, current_seq_df.columns.get_loc('Temperature_Mean_C')] = pred_temp_approx - np.random.normal(4.0, 0.5)
                                current_seq_df.iloc[idx, current_seq_df.columns.get_loc('Temperature_Min_C')] = pred_temp_approx - np.random.normal(8.0, 0.5)
                            elif col == 'Temperature_Min_C':
                                current_seq_df.iloc[idx, current_seq_df.columns.get_loc('Temperature_Min_C')] = pred_temp_approx
                                current_seq_df.iloc[idx, current_seq_df.columns.get_loc('Temperature_Mean_C')] = pred_temp_approx + np.random.normal(4.0, 0.5)
                                current_seq_df.iloc[idx, current_seq_df.columns.get_loc('Temperature_Max_C')] = pred_temp_approx + np.random.normal(8.0, 0.5)

                    # Prepare Input Tensor
                    X_input = scaler_X.transform(current_seq_df.values)
                    X_tensor = torch.tensor(X_input.reshape(1, lookback, input_size), dtype=torch.float32)
                    
                    # Predict
                    pred_scaled = model(X_tensor).numpy()
                    pred_val = scaler_y.inverse_transform(pred_scaled).flatten()[0]
                    
                    # Bounds Check (Matches script)
                    hist_max = station_data[col].max()
                    hist_min = station_data[col].min()
                    pred_val = max(min(pred_val, hist_max + 2), hist_min - 2)
                    
                    # Store if matches target year
                    if sim_year == target_year:
                        future_vals.append({
                            'Year': sim_year, 'Month': sim_month, 
                            col: round(pred_val, 2)
                        })
                    
                    # Update Window for Next Step
                    new_row = current_seq_df.iloc[-1:].copy()
                    new_row['Year'] = sim_year
                    new_row['Month'] = sim_month
                    new_row[col] = pred_val
                    
                    # Fill dependent columns (Matches script 'Main Execution' loop logic inside predict_future)
                    if col == 'Temperature_Mean_C':
                        new_row['Temperature_Max_C'] = pred_val + np.random.normal(4.5, 0.8)
                        new_row['Temperature_Min_C'] = pred_val - np.random.normal(4.5, 0.8)
                    elif col == 'Temperature_Max_C':
                        new_row['Temperature_Mean_C'] = pred_val - np.random.normal(4.0, 0.6)
                        new_row['Temperature_Min_C'] = pred_val - np.random.normal(8.0, 0.8)
                    elif col == 'Temperature_Min_C':
                        new_row['Temperature_Mean_C'] = pred_val + np.random.normal(4.0, 0.6)
                        new_row['Temperature_Max_C'] = pred_val + np.random.normal(8.0, 0.8)
                        
                    current_seq_df = pd.concat([current_seq_df.iloc[1:], new_row], ignore_index=True)

            station_preds[col] = pd.DataFrame(future_vals)

        # Merge Mean, Max, Min predictions for this station
        if station_preds:
            # Merge on Year/Month
            merged = station_preds['Temperature_Mean_C']
            if 'Temperature_Max_C' in station_preds:
                merged = pd.merge(merged, station_preds['Temperature_Max_C'], on=['Year', 'Month'], how='left')
            if 'Temperature_Min_C' in station_preds:
                merged = pd.merge(merged, station_preds['Temperature_Min_C'], on=['Year', 'Month'], how='left')
            
            merged['Station'] = station
            final_results.append(merged)

    if not final_results: return pd.DataFrame()
    return pd.concat(final_results)

# ==============================================================================
#  6. TOTAL TAIWAN TOURIST MODEL (Linear Regression)
# ==============================================================================

def train_predict_taiwan_tourist_lr(df_tourist, target_year):
    """
    Predicts total tourist visits for the WHOLE of Taiwan using Linear Regression.
    Combines historical data with future predictions into a single timeline.
    """
    print(f"--- Training Total Taiwan Tourist Model (LR) for {target_year} ---")
    
    # Preprocessing
    df = df_tourist.copy()
    
    # Combine regions into total if 'Total' doesn't exist
    if 'Total' not in df.columns:
        regions = ['Asia', 'Europe', 'Americas', 'Africa', 'Oceania', 'Unknow']
        # Ensure columns exist before summing
        existing_cols = [c for c in regions if c in df.columns]
        df['Total'] = df[existing_cols].sum(axis=1)
    
    # Date sorting
    # Create a sortable column
    df['SortDate'] = df['Year'] * 100 + df['Month']
    df = df.sort_values('SortDate').reset_index(drop=True)

    # Feature Engineering (Matches script)
    df['Time_Index'] = range(len(df))
    # Quarter calculation (Month-1)//3 + 1
    df['Quarter'] = (df['Month'] - 1) // 3 + 1
    
    df['Month_sin'] = np.sin(2 * np.pi * df['Month']/12)
    df['Month_cos'] = np.cos(2 * np.pi * df['Month']/12)
    
    # Lag features
    lags = [1, 3, 6, 12]
    for lag in lags:
        df[f'Total_lag_{lag}'] = df['Total'].shift(lag)

    # Rolling features 
    for window in [3, 6, 12]:
        df[f'Total_roll_mean_{window}'] = df['Total'].rolling(window=window).mean()
        
    # Drop NaN created by lags 
    df_clean = df.dropna().copy()
    
    # Features
    feature_columns = ['Year', 'Month', 'Quarter', 'Time_Index', 'Month_sin', 'Month_cos'] + \
                      [f'Total_lag_{lag}' for lag in lags] + \
                      [f'Total_roll_mean_{w}' for w in [3,6,12]]

    X = df_clean[feature_columns]
    y = df_clean['Total']
    
    #  Train Model
    # Using StandardScaler as per script reference
    from sklearn.preprocessing import StandardScaler
    scaler = StandardScaler()
    
    X_scaled = scaler.fit_transform(X)
    
    model = LinearRegression()
    model.fit(X_scaled, y)
    
    # Predict Future
    future_results = []
    
    # Determine start date for prediction (Month after last data)
    last_row = df_clean.iloc[-1]
    last_time_idx = int(last_row['Time_Index'])
    
    # Prediction horizon: from now until end of target_year
    current_year = int(last_row['Year'])
    current_month = int(last_row['Month'])
    
    # Loop until target year end
    while True:
        current_month += 1
        if current_month > 12:
            current_month = 1
            current_year += 1
        
        last_time_idx += 1
        
        # Build Feature Row for Next Month
        row_dict = {
            'Year': current_year,
            'Month': current_month,
            'Quarter': (current_month - 1) // 3 + 1,
            'Time_Index': last_time_idx,
            'Month_sin': np.sin(2 * np.pi * current_month/12),
            'Month_cos': np.cos(2 * np.pi * current_month/12)
        }
        
        # Add Lags
        # create a temporary series of 'Total' values to look back into
        current_history = pd.concat([
            df_clean['Total'], 
            pd.Series([r['Total'] for r in future_results])
        ], ignore_index=True)
        
        for lag in lags:
            if len(current_history) >= lag:
                row_dict[f'Total_lag_{lag}'] = current_history.iloc[-lag]
            else:
                row_dict[f'Total_lag_{lag}'] = 0 
        
        # Add Rolling
        for w in [3, 6, 12]:
             if len(current_history) >= w:
                row_dict[f'Total_roll_mean_{w}'] = current_history.iloc[-w:].mean()
             else:
                row_dict[f'Total_roll_mean_{w}'] = 0
        
        # Create DF and Scale
        feat_df = pd.DataFrame([row_dict])[feature_columns]
        feat_scaled = scaler.transform(feat_df)
        
        # Predict
        pred_val = model.predict(feat_scaled)[0]
        pred_val = max(0, int(pred_val)) # Ensure positive integer
        
        future_results.append({
            'Year': current_year,
            'Month': current_month,
            'Total': pred_val
        })
        
        # Stop condition, Reached end of target year
        if current_year == target_year and current_month == 12:
            break
    
    # Combine History, Future into Final Result
    # Keep only relevant columns
    history_df = df_clean[['Year', 'Month', 'Total']].copy()
    future_df = pd.DataFrame(future_results)
    
    # Concatenate to make one continuous timeline (2015 -> Target Year)
    full_df = pd.concat([history_df, future_df], ignore_index=True)
    
    return full_df

# ==============================================================================
#  5. 5 CITIES TOTAL TOURIST VISITS MODEL (Random Forest)
# ==============================================================================
def train_predict_tourist_rf(df_weather, df_tourist, target_year):
    """
    Predicts total tourist visits for 5 cities.
    df_weather: The processed weather data (processed_Weather.csv)
    df_tourist: The processed tourist data (e.g. processed_Taipei.csv combined)
    """
    print(f"--- Training Tourist Arrival Model (RF) for {target_year} ---")
    
    #  Prepare Training Data
    # Merge
    # Rename Station to City in weather if needed
    if 'Station' in df_weather.columns:
        df_weather = df_weather.rename(columns={'Station': 'City'})
        
    # Merge
    train_df = pd.merge(df_weather, df_tourist, on=['Year', 'Month', 'City'], how='inner')
    
    # Features from your notebook: Time_Index, Month, sin/cos, City_encoded
    train_df['Time_Index'] = (train_df['Year'] - train_df['Year'].min()) * 12 + train_df['Month']
    train_df['Month_sin'] = np.sin(2 * np.pi * train_df['Month'] / 12)
    train_df['Month_cos'] = np.cos(2 * np.pi * train_df['Month'] / 12)
    
    le = LabelEncoder()
    train_df['City_encoded'] = le.fit_transform(train_df['City'])
    
    features = ['Time_Index', 'Month', 'Month_sin', 'Month_cos', 'City_encoded']
    target = 'Total_Tourists' # Ensure this matches your CSV column name (e.g. 'Total')
    
    # Drop N/A
    train_df = train_df.dropna(subset=features + [target])
    
    # Train Model
    model = RandomForestRegressor(
        n_estimators=100, max_depth=15, min_samples_split=5, 
        min_samples_leaf=2, random_state=42, n_jobs=-1
    )
    model.fit(train_df[features], train_df[target])
    
    # Predict Future
    # Generate future dates for 5 cities
    future_dates = []
    base_year = train_df['Year'].min()
    
    start_m = 7 if target_year == 2025 else 1
    months = range(start_m, 13)
    
    predictions = []
    
    for city in TARGET_STATIONS: # ['Taipei', 'New Taipei', ...]
        if city not in le.classes_: continue
        city_code = le.transform([city])[0]
        
        for m in months:
            time_idx = (target_year - base_year) * 12 + m
            
            feat_row = pd.DataFrame([{
                'Time_Index': time_idx,
                'Month': m,
                'Month_sin': np.sin(2 * np.pi * m / 12),
                'Month_cos': np.cos(2 * np.pi * m / 12),
                'City_encoded': city_code
            }])
            
            pred = model.predict(feat_row)[0]
            
            predictions.append({
                'Year': target_year,
                'Month': m,
                'City': city,
                'Total_Tourists': max(0, round(pred))
            })
            
    return pd.DataFrame(predictions)

# ==============================================================================
#  7. TYPHOON PREDICTION MODEL (Random Forest)
# ==============================================================================
def train_predict_typhoon_rf(typhoon_hist_df, historical_weather_df, future_weather_df):
    """
    typhoon_hist_df: Dataframe containing ONLY typhoon events (processed_Typhoon/*.csv)
    historical_weather_df: Dataframe containing ALL history (processed_Weather.csv)
    future_weather_df: Dataframe of predicted weather (2025-2027)
    """
    print(f"--- Training Typhoon Model (RF) with Class Balancing ---")

    if historical_weather_df.empty or future_weather_df.empty:
        return pd.DataFrame()

    # PREPARE TRAINING DATA (Merge History + Typhoon Labels)
    
    #  Prepare General History (The Base)
    train_df = historical_weather_df.copy()
    
    # Rename 'Station' to 'City' if needed
    if 'Station' in train_df.columns:
        train_df.rename(columns={'Station': 'City'}, inplace=True)

    # Ensure required columns exist in History
    required_cols = ['Temperature_Mean_C', 'Precipitation_Total_mm', 'WindSpeed_Max_ms', 'Humidity_Mean_perc', 'Pressure_Mean_hPa']
    for c in required_cols:
        if c not in train_df.columns: train_df[c] = 0

    # Prepare Typhoon Labels
    # Create a set of (Year, Month, City) where typhoons happened
    typhoon_events = set()
    if not typhoon_hist_df.empty:
        # Handle Date parsing for typhoon CSV
        t_df = typhoon_hist_df.copy()
        if 'Date' in t_df.columns:
             t_df['Date'] = pd.to_datetime(t_df['Date'].astype(str), format='%Y%m%d', errors='coerce')
             t_df['Year'] = t_df['Date'].dt.year
             t_df['Month'] = t_df['Date'].dt.month
        
        # Normalize City names
        if 'City' in t_df.columns:
             t_df['City'] = t_df['City'].replace({
                 'Taipei City': 'Taipei', 'New Taipei City': 'New Taipei', 
                 'Taichung City': 'Taichung', 'Tainan City': 'Tainan', 'Kaohsiung City': 'Kaohsiung'
             })
        
        # Create lookup set
        for _, row in t_df.iterrows():
            typhoon_events.add((int(row['Year']), int(row['Month']), row['City']))

    # Label the Training Data
    # If the row in historical weather matches a typhoon event, Flag = 1, else 0
    def get_label(row):
        key = (int(row['Year']), int(row['Month']), row['City'])
        return 1 if key in typhoon_events else 0

    train_df['Typhoon_Flag'] = train_df.apply(get_label, axis=1)

    # FEATURE ENGINEERING (Lags & Codes) 
    
    # Encode City
    le_city = LabelEncoder()
    # Fit on combined list of cities to be safe
    all_cities = list(train_df['City'].unique()) + list(future_weather_df['City'].unique())
    le_city.fit(all_cities)
    
    train_df['City_Code'] = le_city.transform(train_df['City'])
    
    # Sort for Lag creation
    train_df.sort_values(['City', 'Year', 'Month'], inplace=True)
    
    # Create Lags
    train_df['Prev_Typhoon'] = train_df.groupby('City')['Typhoon_Flag'].shift(1).fillna(0)
    train_df['Prev_Precip'] = train_df.groupby('City')['Precipitation_Total_mm'].shift(1).fillna(0)

    # Final Feature Selection
    feature_cols = required_cols + ['City_Code', 'Prev_Typhoon', 'Prev_Precip']
    
    # Drop NAs created by lags or missing history
    train_data = train_df.dropna(subset=feature_cols + ['Typhoon_Flag'])

    X = train_data[feature_cols]
    y = train_data['Typhoon_Flag']

    # Check if we actually have positive cases
    if y.sum() == 0:
        print("Warning: No Typhoons found in merged history. Returning 0 probability.")
        return pd.DataFrame()

    #  MODEL TRAINING (SMOTE + RF) 
    
    # Scale
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # SMOTE (Handle Imbalance)
    # Only run SMOTE if we have enough samples
    if len(y) > 20 and y.sum() > 1:
        try:
            smote = SMOTE(random_state=42, k_neighbors=min(y.sum()-1, 5))
            X_res, y_res = smote.fit_resample(X_scaled, y)
        except:
            X_res, y_res = X_scaled, y
    else:
        X_res, y_res = X_scaled, y

    # Random Forest
    rf = RandomForestClassifier(
        n_estimators=100, 
        max_depth=4, 
        min_samples_split=10,
        min_samples_leaf=10,
        class_weight='balanced', 
        random_state=42,
        n_jobs=-1
    )
    rf.fit(X_res, y_res)

    # PREDICT FUTURE 
    
    future = future_weather_df.copy()
    
    # Ensure columns
    for c in required_cols:
        if c not in future.columns: future[c] = 0
        
    # Encode City
    future['City_Code'] = future['City'].apply(lambda x: le_city.transform([x])[0] if x in le_city.classes_ else 0)
    
    # Create Lags for Future
    # Simplified: Prev_Typhoon = 0 (assume clear), Prev_Precip = current precip (approx)
    future['Prev_Typhoon'] = 0
    future['Prev_Precip'] = future['Precipitation_Total_mm']
    
    # Select & Scale
    X_future = future[feature_cols].fillna(0)
    X_future_scaled = scaler.transform(X_future)
    
    # Predict Probability
    if hasattr(rf, "classes_") and len(rf.classes_) > 1:
        probs = rf.predict_proba(X_future_scaled)[:, 1]
    else:
        # Fallback if model didn't learn classes correctly
        probs = np.zeros(len(future))
        
    future['Typhoon_Probability'] = probs
    
    return future[['Year', 'Month', 'City', 'Typhoon_Probability']]