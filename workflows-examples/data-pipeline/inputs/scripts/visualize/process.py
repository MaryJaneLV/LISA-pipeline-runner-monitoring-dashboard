import pandas as pd
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns
import os
import json

# Script 4: Visualize
# This script creates visualizations from the analyzed data

print("Starting data visualization...")

# Load analysis results
category_analysis_path = '/tmp/input/category-analysis.csv'
region_analysis_path = '/tmp/input/region-analysis.csv'
time_analysis_path = '/tmp/input/time-analysis.csv'
normalized_data_path = '/tmp/input/normalized-data.csv'

category_stats = pd.read_csv(category_analysis_path)
region_analysis = pd.read_csv(region_analysis_path)
time_analysis = pd.read_csv(time_analysis_path)
df = pd.read_csv(normalized_data_path)

print(f"Loaded input data for visualization")

# Create output directory if it doesn't exist
os.makedirs('/tmp/output', exist_ok=True)

# Generate report data
report_data = {
    'total_sales': df['total_price'].sum(),
    'total_orders': len(df),
    'average_order_value': df['total_price'].mean(),
    'category_breakdown': {},
    'region_breakdown': {},
    'time_breakdown': {}
}

# Format category data
for category in df['category'].unique():
    category_df = df[df['category'] == category]
    report_data['category_breakdown'][category] = {
        'sales': category_df['total_price'].sum(),
        'orders': len(category_df),
        'average_price': category_df['price'].mean()
    }

# Format region data
for _, row in region_analysis.iterrows():
    report_data['region_breakdown'][row['region']] = {
        'sales': row['total_sales'],
        'orders': row['order_count']
    }

# Format time data
for _, row in time_analysis.iterrows():
    report_data['time_breakdown'][row['time_of_day']] = {
        'sales': row['total_sales'],
        'orders': row['order_count']
    }

# Create a sales summary CSV
sales_summary = pd.DataFrame([{
    'total_sales': report_data['total_sales'],
    'total_orders': report_data['total_orders'],
    'average_order_value': report_data['average_order_value'],
    'top_category': max(report_data['category_breakdown'].items(), key=lambda x: x[1]['sales'])[0],
    'top_region': max(report_data['region_breakdown'].items(), key=lambda x: x[1]['sales'])[0],
    'peak_time': max(report_data['time_breakdown'].items(), key=lambda x: x[1]['sales'])[0]
}])

# Save report data as JSON and CSV
with open('/tmp/output/report-data.json', 'w') as f:
    json.dump(report_data, f, indent=2)

sales_summary.to_csv('/tmp/output/sales-summary.csv', index=False)

# Create visualizations
plt.figure(figsize=(10, 6))

# 1. Category Sales Chart (Simple bar chart using CSV data)
plt.figure(figsize=(10, 6))
categories = list(report_data['category_breakdown'].keys())
sales = [report_data['category_breakdown'][cat]['sales'] for cat in categories]
plt.bar(categories, sales)
plt.title('Sales by Category')
plt.xlabel('Category')
plt.ylabel('Sales ($)')
plt.tight_layout()
plt.savefig('/tmp/output/category-sales.png')
plt.close()

# 2. Regional Sales Chart
plt.figure(figsize=(10, 6))
regions = list(report_data['region_breakdown'].keys())
region_sales = [report_data['region_breakdown'][reg]['sales'] for reg in regions]
plt.pie(region_sales, labels=regions, autopct='%1.1f%%')
plt.title('Sales by Region')
plt.tight_layout()
plt.savefig('/tmp/output/region-sales.png')
plt.close()

# 3. Time of Day Analysis
plt.figure(figsize=(10, 6))
times = list(report_data['time_breakdown'].keys())
time_sales = [report_data['time_breakdown'][t]['sales'] for t in times]
plt.bar(times, time_sales)
plt.title('Sales by Time of Day')
plt.xlabel('Time of Day')
plt.ylabel('Sales ($)')
plt.tight_layout()
plt.savefig('/tmp/output/time-sales.png')
plt.close()

print("Visualization complete. Results saved to output directory")
print(f"Generated report data and {3} visualization charts")
print(f"Sales summary:\n{sales_summary.to_string(index=False)}")