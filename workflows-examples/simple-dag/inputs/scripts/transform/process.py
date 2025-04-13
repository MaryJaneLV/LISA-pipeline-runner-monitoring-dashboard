import pandas as pd
import numpy as np
import os
import sys

# Get operation from environment variables
operation = os.environ.get("OPERATION", "normalize")

# Load input CSV
print("Loading input data...")
df = pd.read_csv('/tmp/input/weighted_data.csv')
print(f"Input data: {df.to_string()}")

# Transform the data
print(f"Performing transformation: {operation}")
if operation == "normalize":
    # Min-max normalization of weighted_value
    min_val = df['weighted_value'].min()
    max_val = df['weighted_value'].max()
    df['normalized_value'] = (df['weighted_value'] - min_val) / (max_val - min_val)
elif operation == "standardize":
    # Z-score standardization
    mean = df['weighted_value'].mean()
    std = df['weighted_value'].std()
    df['normalized_value'] = (df['weighted_value'] - mean) / std
elif operation == "log":
    # Log transformation
    df['normalized_value'] = np.log1p(df['weighted_value'])  # log(1+x) to handle zeros
else:
    # Default to simple 0-1 scaling
    max_val = df['weighted_value'].max()
    df['normalized_value'] = df['weighted_value'] / max_val

# Round to 3 decimal places
df['normalized_value'] = df['normalized_value'].round(3)

# Save output
print(f"Transformed data: {df.to_string()}")
os.makedirs('/tmp/output', exist_ok=True)
output_path = '/tmp/output/transformed_data.csv'
df.to_csv(output_path, index=False)
print(f"Results saved to {output_path}")
