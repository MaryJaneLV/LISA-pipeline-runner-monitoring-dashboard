# Simple DAG Workflow Example

This example demonstrates a simple Directed Acyclic Graph (DAG) workflow pattern with three sequential processing steps:

1. **Generate**: Takes raw data and applies category-specific weights
2. **Transform**: Normalizes or transforms the weighted data
3. **Analyze**: Produces statistics and visualizations from the transformed data

## Workflow Structure

The workflow is organized as a DAG with the following steps:

```
Generate → Transform → Analyze
```

Each step in the workflow:
- Reads input data from the previous step
- Processes the data according to its specific task
- Produces output that becomes input for the next step

## Parameters

### Main Workflow Parameters
- `dataInput`: Path to the input data CSV file
- `artifactOutputPath`: Base output path for artifacts
- `transformOperation`: Transformation operation (normalize, standardize, log)

### Script Paths Parameters
Each step (generate, transform, analyze) has three script path parameters:
- `*ScriptKey`: Path to the main Python script
- `*RequirementsKey`: Path to requirements.txt
- `*EntrypointKey`: Path to the entrypoint.sh script

## Input Data

The input data is a simple CSV with ID, category, and value columns:

```
id,category,value
1,A,10
2,B,15
...
```

## Processing Steps

### 1. Generate
- Assigns weights to each category
- Multiplies original values by the category weights
- Outputs a CSV with weighted values

### 2. Transform
- Takes weighted values as input
- Applies specified transformation (normalize, standardize, log)
- Outputs a CSV with normalized values

### 3. Analyze
- Computes statistics for each category
- Creates data visualizations
- Produces a summary report

## Outputs

The workflow produces several artifacts:
- `weighted_data.csv`: Data with category weights applied
- `transformed_data.csv`: Normalized/transformed data
- `category_stats.csv`: Statistical analysis by category
- `summary_report.txt`: Human-readable summary of findings
- `analysis_plots.png`: Visualization of the results