import pandas as pd
import numpy as np
import os
import json

# Script 3: Analyze
# This script analyzes the normalized data by:
# - Calculating statistics by category
# - Identifying top-selling products
# - Performing regional analysis

print("Starting data analysis...")

# Load normalized data
input_path = '/tmp/input/normalized-data.csv'
df = pd.read_csv(input_path)
print(f"Loaded input data with {len(df)} rows")

# Analysis by category
category_stats = df.groupby('category').agg({
    'price': ['mean', 'min', 'max', 'std'],
    'quantity': ['sum', 'mean'],
    'total_price': ['sum', 'mean']
}).reset_index()

# Identify top products by total sales
top_products = df.sort_values('total_price', ascending=False).head(3)

# Regional analysis
region_analysis = df.groupby('customer_region').agg({
    'total_price': 'sum',
    'product_id': 'count'
}).reset_index()
region_analysis.columns = ['region', 'total_sales', 'order_count']

# Calculate market basket metrics
df['hour_group'] = pd.cut(df['hour'], bins=[0, 6, 12, 18, 24], 
                         labels=['night', 'morning', 'afternoon', 'evening'])
time_analysis = df.groupby('hour_group').agg({
    'total_price': 'sum',
    'product_id': 'count'
}).reset_index()
time_analysis.columns = ['time_of_day', 'total_sales', 'order_count']

# Create a single analysis results DataFrame
analysis_results = pd.DataFrame({
    'metric': [
        'total_orders', 
        'total_revenue', 
        'avg_order_value',
        'top_category',
        'top_region',
        'peak_time'
    ],
    'value': [
        len(df),
        df['total_price'].sum(),
        df['total_price'].mean(),
        df.groupby('category')['total_price'].sum().idxmax(),
        region_analysis.loc[region_analysis['total_sales'].idxmax(), 'region'],
        time_analysis.loc[time_analysis['total_sales'].idxmax(), 'time_of_day']
    ]
})

# Create output directory if it doesn't exist
os.makedirs('/tmp/output', exist_ok=True)

# Save analysis results
output_path_main = '/tmp/output/analysis-results.csv'
analysis_results.to_csv(output_path_main, index=False)

# Save detailed analyses
output_path_category = '/tmp/output/category-analysis.csv'
category_stats.to_csv(output_path_category, index=False)

output_path_region = '/tmp/output/region-analysis.csv'
region_analysis.to_csv(output_path_region, index=False)

output_path_time = '/tmp/output/time-analysis.csv'
time_analysis.to_csv(output_path_time, index=False)

print(f"Analysis complete. Main results saved to {output_path_main}")
print(f"Analysis results preview:\n{analysis_results.to_string()}")