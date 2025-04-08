from flask import Flask, render_template, request, jsonify, send_file
import pandas as pd
import io
import os
import json
import numpy as np
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB max upload
app.config['ALLOWED_EXTENSIONS'] = {'xlsx', 'xls'}

# Create uploads folder if it doesn't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

# Function to replace NaN with None in nested structures (dict, list)
def replace_nan_with_none(obj):
    if isinstance(obj, dict):
        return {k: replace_nan_with_none(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [replace_nan_with_none(item) for item in obj]
    elif isinstance(obj, (float, np.float64, np.float32)) and np.isnan(obj):
        return None
    elif pd and pd.isna(obj):  # Check if it's a pandas NA value
        return None
    else:
        return obj

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'excelFile' not in request.files:
        return jsonify({'success': False, 'error': 'No file part'})
    
    file = request.files['excelFile']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No file selected'})
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            # Get all sheet names (without loading data)
            xls = pd.ExcelFile(filepath)  # Just reads metadata
            sheet_names = xls.sheet_names
            
            return jsonify({
                'success': True, 
                'filename': filename,
                'sheets': sheet_names
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)})
    
    return jsonify({'success': False, 'error': 'Invalid file type'})

@app.route('/get_sheet_data', methods=['POST'])
def get_sheet_data():
    data = request.json
    filename = data.get('filename')
    sheet_name = data.get('sheet')
    
    if not filename or not sheet_name:
        return jsonify({'success': False, 'error': 'Missing filename or sheet name'})
    
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if not os.path.exists(filepath):
        return jsonify({'success': False, 'error': 'File not found'})
    
    try:
        # Read the sheet data with pandas - keep NaN values
        df = pd.read_excel(filepath, sheet_name=sheet_name, keep_default_na=True)
        
        # Convert NaN to None explicitly
        df = df.replace({np.nan: None})
        
        # Get column names
        columns = df.columns.tolist()
        
        # Convert data to a list of dictionaries for easier processing in JavaScript
        # NaN values are already converted to None
        data = df.to_dict('records')
        
        # Double-check to ensure all NaN values are converted to None
        data = replace_nan_with_none(data)
        
        return jsonify({
            'success': True,
            'columns': columns,
            'data': data,
            'rowCount': len(data)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/generate_chart', methods=['POST'])
def generate_chart():
    data = request.json
    filename = data.get('filename')
    sheet_name = data.get('sheet')
    x_axis = data.get('xAxis')
    y_axes = data.get('yAxes', [])
    chart_type = data.get('chartType')
    filter_column = data.get('filterColumn')
    filter_value = data.get('filterValue')
    chart_filter_column = data.get('chartFilterColumn')
    start_row = data.get('startRow', 0)
    end_row = data.get('endRow')
    
    if not filename or not sheet_name or not x_axis or not y_axes or not chart_type:
        return jsonify({
            'success': False, 
            'error': 'Missing required parameters'
        })
    
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if not os.path.exists(filepath):
        return jsonify({'success': False, 'error': 'File not found'})
    
    try:
        # Read the data with keep_default_na=True to properly handle empty cells
        df = pd.read_excel(filepath, sheet_name=sheet_name, keep_default_na=True)
        
        # Apply row range filter
        if start_row > 0:
            start_row = start_row - 2  # Adjust for Excel row numbering
            if start_row < 0:
                start_row = 0
        
        if end_row:
            end_row = end_row - 1
            df = df.iloc[start_row:end_row]
        else:
            df = df.iloc[start_row:]
        
        # Apply column filter if specified
        if filter_column and filter_value:
            df = df[df[filter_column] == filter_value]
        
        # Process data for chart (empty/zero preserved)
        chart_data = process_chart_data(df, x_axis, y_axes, chart_type)
        
        # Ensure all NaN values are converted to None
        chart_data = replace_nan_with_none(chart_data)
        
        # Prepare chart filter values
        chart_filter_values = []
        if chart_filter_column:
            chart_filter_values = df[chart_filter_column].dropna().unique().tolist()
            # Also handle NaN in filter values
            chart_filter_values = replace_nan_with_none(chart_filter_values)
        
        # Verify the chart data structure before sending
        print("Chart data before sending:")
        print(json.dumps(chart_data, default=str))
        
        return jsonify({
            'success': True,
            'chartData': chart_data,
            'chartType': chart_type,
            'chartFilterValues': chart_filter_values
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)})

# Helper function to generate colors for pie/doughnut charts
def generate_colors(count):
    # Use a predefined color palette for better visual appeal
    color_palette = [
        '#1a4570', '#ee8939', '#f5b843', '#8b3834', '#e0ba3f',
        '#e6e770', '#4d83c5', '#d3a037', '#779c51', '#b2d571'
    ]
    
    colors = []
    for i in range(count):
        colors.append(color_palette[i % len(color_palette)])
    return colors

# Helper function to calculate percentage data for stacked bar charts
def calculate_percentage_data(datasets, labels, visible_indices=None):
    # For each label/category, calculate the sum of all dataset values
    totals = [0] * len(labels)
    
    # If visible_indices is not provided, use all datasets
    if visible_indices is None:
        visible_indices = list(range(len(datasets)))
    
    # Sum only the visible datasets
    for idx in visible_indices:
        if idx < len(datasets):
            dataset = datasets[idx]
            for i, value in enumerate(dataset['data']):
                if i < len(totals):  # Ensure we don't go out of bounds
                    totals[i] += abs(float(value)) if value is not None else 0
    
    # Convert each dataset value to a percentage of the total
    percentage_datasets = []
    for idx, dataset in enumerate(datasets):
        percentage_data = []
        
        # Only process visible datasets for the result
        if idx in visible_indices:
            for i, value in enumerate(dataset['data']):
                if i < len(totals) and totals[i] > 0:
                    val = abs(float(value)) if value is not None else 0
                    percentage_data.append((val / totals[i]) * 100)
                else:
                    percentage_data.append(0)
            
            percentage_dataset = dataset.copy()
            percentage_dataset['data'] = percentage_data
            percentage_datasets.append(percentage_dataset)
        else:
            # For hidden datasets, include them with zeros
            percentage_dataset = dataset.copy()
            percentage_dataset['data'] = [0] * len(dataset['data'])
            percentage_datasets.append(percentage_dataset)
    
    return percentage_datasets

@app.route('/apply_chart_filter', methods=['POST'])
def apply_chart_filter():
    data = request.json
    filename = data.get('filename')
    sheet_name = data.get('sheet')
    x_axis = data.get('xAxis')
    y_axes = data.get('yAxes', [])
    chart_type = data.get('chartType')
    filter_column = data.get('filterColumn')
    filter_value = data.get('filterValue')
    chart_filter_column = data.get('chartFilterColumn')
    chart_filter_value = data.get('chartFilterValue')
    start_row = data.get('startRow', 0)
    end_row = data.get('endRow')
    
    if not filename or not sheet_name:
        return jsonify({
            'success': False, 
            'error': 'Missing required parameters'
        })
    
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if not os.path.exists(filepath):
        return jsonify({'success': False, 'error': 'File not found'})
    
    try:
        # Read the sheet data with pandas - add keep_default_na=True
        df = pd.read_excel(filepath, sheet_name=sheet_name, keep_default_na=True)
        
        # Apply row range filter
        if start_row > 0:
            start_row = start_row - 2
            if start_row < 0:
                start_row = 0
        
        if end_row:
            end_row = end_row - 1
            df = df.iloc[start_row:end_row]
        else:
            df = df.iloc[start_row:]
        
        # Apply main filter if specified
        if filter_column and filter_value:
            df = df[df[filter_column] == filter_value]
            
        # Apply chart filter if specified
        if chart_filter_column and chart_filter_value:
            df = df[df[chart_filter_column] == chart_filter_value]
        
        # Process data for chart
        chart_data = process_chart_data(df, x_axis, y_axes, chart_type)
        
        # Ensure all NaN values are converted to None
        chart_data = replace_nan_with_none(chart_data)
        
        # Add information about visible datasets
        visible_indices = data.get('visibleDatasets')
        
        # For percentage stacked bar, ensure we always show 100%
        if chart_type == 'percentStackedBar' and chart_data and 'datasets' in chart_data:
            # If we have information about which datasets are visible, use it
            if visible_indices is not None:
                chart_data['datasets'] = calculate_percentage_data(
                    chart_data['datasets'], 
                    chart_data['labels'],
                    visible_indices
                )
            else:
                # Otherwise recalculate with all datasets
                chart_data['datasets'] = calculate_percentage_data(
                    chart_data['datasets'], 
                    chart_data['labels']
                )
        
        return jsonify({
            'success': True,
            'chartData': chart_data,
            'filteredRowCount': len(df)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# Helper function to process chart data
def process_chart_data(df, x_axis, y_axes, chart_type):
    if chart_type in ['line']:
        if df.empty:
            return {'labels': [], 'datasets': []}
            
        # Get the unique x-axis values and sort them
        x_values = sorted(df[x_axis].dropna().unique().tolist())
        
        chart_data = {
            'labels': x_values,
            'datasets': []
        }
        
        for i, y_axis_info in enumerate(y_axes):
            y_axis = y_axis_info.get('column')
            color = y_axis_info.get('color', f'rgba(26, 19, 142, {0.8 if i == 0 else 0.6})')
            
            # Create a new dataframe for this dataset
            y_data = []
            
            for x_val in x_values:
                # Get rows matching this x value
                matching_rows = df[df[x_axis] == x_val]
                
                # Check if we have data for this point
                if matching_rows.empty or matching_rows[y_axis].isna().all():
                    # No data or all NaN values
                    y_data.append(None)  # Use None for missing data
                else:
                    # We have some data, sum it (ignoring NaNs)
                    y_data.append(matching_rows[y_axis].sum(skipna=True))
            
            # Create dataset with explicit None values for missing data
            dataset = {
                'label': y_axis,
                'data': y_data,
                'backgroundColor': color,
                'borderColor': color,
                'borderWidth': 1,
                'fill': False,
                'tension': 0,
                'spanGaps': False  # Don't connect points across null values
            }
            
            chart_data['datasets'].append(dataset)
        
        # Print for debugging
        print("Chart data structure:")
        print(chart_data)
        
        return chart_data

@app.route('/download_chart_code', methods=['POST'])
def download_chart_code():
    data = request.json
    chart_type = data.get('chartType')
    chart_data = data.get('chartData')
    
    if not chart_type or not chart_data:
        return jsonify({'success': False, 'error': 'Missing chart data'})
    
    return jsonify({'success': False, 'error': str('')})

if __name__ == '__main__':
    app.run(debug=True)