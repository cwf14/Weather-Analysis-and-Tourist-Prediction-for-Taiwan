import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import RobustScaler
import os

class TourismWeatherCluster:
    def __init__(self):
        self.kmeans = None
        self.scaler = None
        self.cluster_map = {} # Maps the mathematical cluster ID (0,1,2) to UI ID (1=High, 2=Low)
        self.is_ready = False

    def train(self, weather_csv_path, city_tourist_files):
        """
        Loads data, merges it, and trains a K-Means clustering model 
        exactly as described in the Tourism_weather_clusters notebook.
        """
        print("--- Training Tourism-Weather Clustering Model (K-Means) ---")
        
        try:
            # Load Weather Data
            if not os.path.exists(weather_csv_path):
                print(f"Error: Weather file {weather_csv_path} not found.")
                return

            df_weather = pd.read_csv(weather_csv_path)
            # Standardize column names
            if 'Station' in df_weather.columns:
                df_weather = df_weather.rename(columns={'Station': 'City'})
            
            # Load and Combine Tourist Data
            tourist_dfs = []
            for city, path in city_tourist_files.items():
                if os.path.exists(path):
                    tmp = pd.read_csv(path)
                    # Sum all columns except Year/Month to get Total
                    cols = [c for c in tmp.columns if c not in ['Year', 'Month']]
                    tmp['Total_Tourists'] = tmp[cols].sum(axis=1)
                    tmp['City'] = city
                    tourist_dfs.append(tmp[['Year', 'Month', 'City', 'Total_Tourists']])
            
            if not tourist_dfs:
                print("Error: No tourist data loaded.")
                return

            df_tourist = pd.concat(tourist_dfs, ignore_index=True)

            # Merge Datasets
            # Inner join ensures we only train on rows where we have both weather and tourist info
            df_merged = pd.merge(df_tourist, df_weather, on=['Year', 'Month', 'City'], how='inner')

            # High Season Flag (Jan, Feb, Jul, Aug, Dec)
            df_merged['High_Season'] = df_merged['Month'].isin([1, 2, 7, 8, 12]).astype(int)

            # Log Transformation for Tourist Counts (Handles skewness)
            df_merged['Log_Tourists'] = np.log1p(df_merged['Total_Tourists'])

            # Select Features
            # Using: Tourists (Log), Temperature, Precipitation, Seasonality
            self.features_list = ['Log_Tourists', 'Temperature_Mean_C', 'Precipitation_Total_mm', 'High_Season']
            
            X = df_merged[self.features_list].fillna(0)

            # Data Scaling (RobustScaler)
            self.scaler = RobustScaler()
            X_scaled = self.scaler.fit_transform(X)

            # Train K-Means
            # Notebook found K=3 was the best configuration
            self.kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
            clusters = self.kmeans.fit_predict(X_scaled)
            
            # Assign clusters back to DF to analyze them
            df_merged['Cluster'] = clusters

            # Map Clusters to Business Logic (High vs Low Season)
            cluster_stats = df_merged.groupby('Cluster')['Total_Tourists'].mean().sort_values()
            
            sorted_clusters = cluster_stats.index.tolist()
            
            self.cluster_map = {
                sorted_clusters[0]: 2, # Lowest tourist count -> Low Season
                sorted_clusters[1]: 1, # Middle -> High Season
                sorted_clusters[2]: 1  # Highest -> High Season
            }

            self.is_ready = True
            print(f"Clustering Model Trained. Mappings: {self.cluster_map}")
            print(f"Cluster Averages: {cluster_stats.to_dict()}")

        except Exception as e:
            print(f"Clustering training crashed: {e}")
            import traceback
            traceback.print_exc()

    def predict_cluster(self, tourists, temp, precip, month):
        """
        Predicts the cluster (1 or 2) for a specific set of conditions.
        """
        if not self.is_ready:
            print("Cluster model not ready, returning default (2)")
            return 2 # Default to Low Season if model failed
        
        try:
            # Prepare Input Features matching training exactly
            high_season = 1 if month in [1, 2, 7, 8, 12] else 0
            log_tourists = np.log1p(tourists) # Apply Log transform
            
            # Order must match self.features_list
            # ['Log_Tourists', 'Temperature_Mean_C', 'Precipitation_Total_mm', 'High_Season']
            input_data = pd.DataFrame([{
                'Log_Tourists': log_tourists,
                'Temperature_Mean_C': temp,
                'Precipitation_Total_mm': precip,
                'High_Season': high_season
            }])
            
            # Scale
            input_scaled = self.scaler.transform(input_data)
            
            # Predict Cluster ID 
            raw_cluster_id = self.kmeans.predict(input_scaled)[0]
            
            # Map to UI 
            return self.cluster_map.get(raw_cluster_id, 2)
            
        except Exception as e:
            print(f"Prediction error: {e}")
            return 2

# Initialize singleton
cluster_model = TourismWeatherCluster()