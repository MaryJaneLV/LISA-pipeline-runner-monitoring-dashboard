import pandas as pd
import os
import sys

# Get operation and factor from environment variables
operation = os.environ.get("OPERATION", "multiply")
factor = float(os.environ.get("FACTOR", "2"))

# Load input CSV
print("Loading input data...")
df = pd.read_csv('/tmp/input/numbers.csv')
print(f"Input data: {df.to_string()}")

# Process the numbers
print(f"Performing operation: {operation} with factor {factor}")
if operation == "multiply":
    df['result'] = df['value'] * factor
elif operation == "square":
    df['result'] = df['value'] ** 2
elif operation == "sum":
    total = df['value'].sum()
    df = pd.DataFrame({'id': [1], 'value': [0], 'result': [total]})
else:
    # Default to multiply by 2
    df['result'] = df['value'] * 2

# Save output
print(f"Processed data: {df.to_string()}")
os.makedirs('/tmp/output', exist_ok=True)
output_path = '/tmp/output/results.csv'
df.to_csv(output_path, index=False)
print(f"Results saved to {output_path}")