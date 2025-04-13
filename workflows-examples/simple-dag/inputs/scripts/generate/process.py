import pandas as pd
import numpy as np
import os
import sys

# Load input CSV
print("Loading input data...")
df = pd.read_csv('/tmp/input/data.csv')
print(f"Input data: {df.to_string()}")

# Generate random weights for each category
np.random.seed(42)  # For reproducibility
categories = df['category'].unique()
category_weights = {cat: np.random.uniform(0.8, 1.2) for cat in categories}

print(f"Generated weights: {category_weights}")

# Apply weights based on category
df['weighted_value'] = df.apply(
    lambda row: row['value'] * category_weights[row['category']], axis=1
)

# Round to 2 decimal places
df['weighted_value'] = df['weighted_value'].round(2)

# Save output
print(f"Generated weighted values: {df.to_string()}")
os.makedirs('/tmp/output', exist_ok=True)
output_path = '/tmp/output/weighted_data.csv'
df.to_csv(output_path, index=False)
print(f"Results saved to {output_path}")
