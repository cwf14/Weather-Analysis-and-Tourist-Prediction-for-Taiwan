# weather_classifier.py
import pandas as pd
import numpy as np
import os

class WeatherClassifier:
    def __init__(self, data_path='processed_Weather.csv'):
        self.data_path = data_path
        self.quantiles = None
        self.default_quantiles = {}
        self._load_and_calculate_thresholds()

    def _load_and_calculate_thresholds(self):
        """Loads historical data and calculates city-specific thresholds."""
        try:
            if not os.path.exists(self.data_path):
                print(f"Warning: {self.data_path} not found. Using default fail-safe thresholds.")
                self._set_fallback_thresholds()
                return

            df = pd.read_csv(self.data_path)
            df.rename(columns={'Station': 'City'}, inplace=True)
            
            # Filter historical range 2015-2024
            historical_df = df[(df['Year'] >= 2015) & (df['Year'] <= 2024)].copy()

            # Ensure numeric
            cols = ['WindSpeed_Max_ms', 'Precipitation_Total_mm', 'Temperature_Mean_C']
            for c in cols:
                historical_df[c] = pd.to_numeric(historical_df[c], errors='coerce')

            # Calculate city-based thresholds (W_90, P_10, P_90, T_20)
            self.quantiles = historical_df.groupby('City').agg({
                'WindSpeed_Max_ms': lambda x: x.quantile(0.90),
                'Precipitation_Total_mm': [lambda x: x.quantile(0.10), lambda x: x.quantile(0.90)],
                'Temperature_Mean_C': lambda x: x.quantile(0.20),
            }).reset_index()

            # Flatten columns
            self.quantiles.columns = ['City', 'W_90', 'P_10', 'P_90', 'T_20']

            # Calculate global defaults for fallback
            self.default_quantiles = {
                'W_90': self.quantiles['W_90'].mean(),
                'P_10': self.quantiles['P_10'].mean(),
                'P_90': self.quantiles['P_90'].mean(),
                'T_20': self.quantiles['T_20'].mean()
            }
            print("Weather Classifier initialized with historical thresholds.")

        except Exception as e:
            print(f"Error initializing classifier thresholds: {e}")
            self._set_fallback_thresholds()

    def _set_fallback_thresholds(self):
        """Safe defaults if CSV is missing."""
        self.quantiles = pd.DataFrame(columns=['City', 'W_90', 'P_10', 'P_90', 'T_20'])
        self.default_quantiles = {
            'W_90': 10.0,   # Approx high wind
            'P_10': 5.0,    # Approx low rain
            'P_90': 150.0,  # Approx heavy rain
            'T_20': 18.0    # Approx cool temp
        }

    def classify(self, city, temp, precip, wind, humidity):
        """
        Classifies a single data point based on thresholds.
        Returns: Category String
        """
        # Get thresholds for specific city
        if self.quantiles is not None and city in self.quantiles['City'].values:
            row = self.quantiles[self.quantiles['City'] == city].iloc[0]
            W_90 = row['W_90']
            P_10 = row['P_10']
            P_90 = row['P_90']
            T_20 = row['T_20']
        else:
            # Use defaults
            W_90 = self.default_quantiles['W_90']
            P_10 = self.default_quantiles['P_10']
            P_90 = self.default_quantiles['P_90']
            T_20 = self.default_quantiles['T_20']

        # Classification Logic (From your script)
        if (wind > W_90) and (precip > P_90):
            return 'High Risk Storm'
        
        elif (precip < P_10) and (humidity < 70):
            return 'Extreme Dry Month'
        
        elif (temp > T_20) and (humidity >= 85):
            return 'Abnormal Hot Humid'
        
        elif (precip > P_90):
            return 'Heavy Rainy Month'
        
        elif (temp < T_20):
            return 'Cold Month'
        
        else:
            return 'Normal Month'

# Singleton instance to load CSV only once
classifier = WeatherClassifier()