import pandas as pd
import os
from datetime import datetime

# Script 1: Transform
# This script transforms raw data by:
# - Converting timestamp to datetime
# - Calculating total price (price * quantity)
# - Standardizing category names

print("Starting data transformation...")

# Load input CSV
input_path = '/tmp/input/sample-data.csv'
df = pd.read_csv(input_path)
print(f"Loaded input data with {len(df)} rows")

# Transform timestamp to datetime and extract components
df['timestamp'] = pd.to_datetime(df['timestamp'])
df['date'] = df['timestamp'].dt.date
df['hour'] = df['timestamp'].dt.hour

# Calculate total price
df['total_price'] = df['price'] * df['quantity']

# Standardize category names (uppercase)
df['category'] = df['category'].str.upper()

# Create output directory if it doesn't exist
os.makedirs('/tmp/output', exist_ok=True)

# Save transformed data
output_path = '/tmp/output/transformed-data.csv'
df.to_csv(output_path, index=False)
print(f"Transformation complete. Output saved to {output_path}")
print(f"Output preview:\n{df.head(3).to_string()}")