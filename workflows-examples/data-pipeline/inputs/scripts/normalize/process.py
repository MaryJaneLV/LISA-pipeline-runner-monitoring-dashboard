import pandas as pd
import numpy as np
import os

# Script 2: Normalize
# This script normalizes the data by:
# - Applying min-max scaling to price and quantity
# - One-hot encoding the category
# - Encoding the customer_region

print("Starting data normalization...")

# Load transformed data
input_path = '/tmp/input/transformed-data.csv'
df = pd.read_csv(input_path)
print(f"Loaded input data with {len(df)} rows")

# Min-max scaling for numeric columns
def min_max_scale(series):
    return (series - series.min()) / (series.max() - series.min())

df['price_normalized'] = min_max_scale(df['price'])
df['quantity_normalized'] = min_max_scale(df['quantity'])
df['total_price_normalized'] = min_max_scale(df['total_price'])

# One-hot encode the category
category_dummies = pd.get_dummies(df['category'], prefix='category')
df = pd.concat([df, category_dummies], axis=1)

# Encode customer region
region_mapping = {'north': 0, 'south': 1, 'east': 2, 'west': 3}
df['region_encoded'] = df['customer_region'].map(region_mapping)

# Create output directory if it doesn't exist
os.makedirs('/tmp/output', exist_ok=True)

# Save normalized data
output_path = '/tmp/output/normalized-data.csv'
df.to_csv(output_path, index=False)
print(f"Normalization complete. Output saved to {output_path}")
print(f"Output preview:\n{df.head(3).to_string()}")