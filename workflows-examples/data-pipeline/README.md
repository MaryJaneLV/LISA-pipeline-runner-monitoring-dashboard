# Data Pipeline Workflow Example

This workflow demonstrates a multi-stage data processing pipeline with four distinct stages, each performing different transformations on the data.

## Workflow Stages

1. **Transform**: Initial data transformation
   - Converts timestamp to datetime components
   - Calculates total price (price * quantity)
   - Standardizes category names

2. **Normalize**: Data normalization
   - Applies min-max scaling to numeric columns
   - One-hot encodes categorical data
   - Encodes regions numerically

3. **Analyze**: Statistical analysis
   - Generates category statistics
   - Performs regional analysis
   - Creates time-based analysis

4. **Visualize**: Data visualization
   - Creates charts for category, region, and time analyses
   - Generates a sales summary report
   - Outputs both data and visualizations

## Input Data

The workflow uses sample sales data with the following structure:
- timestamp: The time of the sale
- product_id: Unique product identifier
- category: Product category (electronics, clothing, home)
- price: Product price
- quantity: Number of items purchased
- customer_region: Geographic region (north, south, east, west)

## Pipeline Outputs

The workflow produces multiple artifacts:
- Transformed data CSV
- Normalized data CSV  
- Analysis results (multiple CSVs)
- Visualization outputs (PNG files)
- Summary report (JSON and CSV)

## Running the Workflow

To run this workflow, make sure all the scripts and the sample data are uploaded to the corresponding S3 paths. The workflow will run through all four stages sequentially, with each stage depending on the output of the previous stage.

You can customize the input and output paths by modifying the workflow parameters.

## Notes

This example demonstrates:
- Multi-stage data processing
- Script dependencies between stages
- Complex artifact management
- Data transformation, analysis, and visualization
- Using the `archive: none: {}` setting to prevent file compression of output artifacts