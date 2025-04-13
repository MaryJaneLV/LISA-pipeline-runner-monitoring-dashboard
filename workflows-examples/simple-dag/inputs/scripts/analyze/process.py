import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import os

# Load transformed data
print("Loading transformed data...")
df = pd.read_csv('/tmp/input/transformed_data.csv')
print(f"Input data: {df.to_string()}")

# Create output directory
os.makedirs('/tmp/output', exist_ok=True)

# Analyze data by category
print("Analyzing data by category...")
category_stats = df.groupby('category').agg({
    'value': ['mean', 'std', 'min', 'max', 'count'],
    'weighted_value': ['mean', 'std', 'min', 'max'],
    'normalized_value': ['mean', 'std', 'min', 'max']
})

# Flatten the column hierarchy
category_stats.columns = ['_'.join(col).strip() for col in category_stats.columns.values]
category_stats = category_stats.reset_index()

print(f"Category statistics: {category_stats.to_string()}")
category_stats.to_csv('/tmp/output/category_stats.csv', index=False)

# Create a summary visualization
plt.figure(figsize=(10, 6))

# Plot original vs weighted values
plt.subplot(1, 2, 1)
for category in df['category'].unique():
    category_data = df[df['category'] == category]
    plt.scatter(category_data['value'], category_data['weighted_value'], 
                label=f'Category {category}')
plt.xlabel('Original Value')
plt.ylabel('Weighted Value')
plt.title('Original vs Weighted Values by Category')
plt.legend()
plt.grid(True, linestyle='--', alpha=0.7)

# Plot distribution of normalized values by category
plt.subplot(1, 2, 2)
for category in df['category'].unique():
    category_data = df[df['category'] == category]
    plt.hist(category_data['normalized_value'], alpha=0.5, bins=5, 
             label=f'Category {category}')
plt.xlabel('Normalized Value')
plt.ylabel('Frequency')
plt.title('Distribution of Normalized Values')
plt.legend()
plt.grid(True, linestyle='--', alpha=0.7)

# Adjust layout and save figure
plt.tight_layout()
plt.savefig('/tmp/output/analysis_plots.png')

# Save a summary report text file
with open('/tmp/output/summary_report.txt', 'w') as f:
    f.write("=== DATA ANALYSIS SUMMARY ===\n\n")
    f.write(f"Total records: {len(df)}\n")
    f.write(f"Number of categories: {df['category'].nunique()}\n\n")
    
    f.write("=== CATEGORY STATISTICS ===\n")
    for category in df['category'].unique():
        cat_data = df[df['category'] == category]
        f.write(f"\nCategory {category} (Count: {len(cat_data)}):\n")
        f.write(f"  Original values: avg={cat_data['value'].mean():.2f}, range=[{cat_data['value'].min()}-{cat_data['value'].max()}]\n")
        f.write(f"  Weighted values: avg={cat_data['weighted_value'].mean():.2f}, range=[{cat_data['weighted_value'].min():.2f}-{cat_data['weighted_value'].max():.2f}]\n")
        f.write(f"  Normalized values: avg={cat_data['normalized_value'].mean():.3f}, range=[{cat_data['normalized_value'].min():.3f}-{cat_data['normalized_value'].max():.3f}]\n")

print("Analysis complete. Results saved to output directory.")
