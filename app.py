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
            # Get all sheet names
            xls = pd.ExcelFile(filepath)
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
        # Read the sheet data with pandas
        df = pd.read_excel(filepath, sheet_name=sheet_name)
        
        # Clean the data for JSON serialization
        df = df.replace({np.nan: None})
        
        # Get column names
        columns = df.columns.tolist()
        
        # Convert data to a list of dictionaries for easier processing in JavaScript
        data = df.to_dict('records')
        
        return jsonify({
            'success': True,
            'columns': columns,
            'data': data,
            'rowCount': len(data)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/filter_data', methods=['POST'])
def filter_data():
    data = request.json
    filename = data.get('filename')
    sheet_name = data.get('sheet')
    filter_column = data.get('filterColumn')
    filter_value = data.get('filterValue')
    start_row = data.get('startRow', 0)
    end_row = data.get('endRow')
    
    if not filename or not sheet_name:
        return jsonify({'success': False, 'error': 'Missing filename or sheet name'})
    
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if not os.path.exists(filepath):
        return jsonify({'success': False, 'error': 'File not found'})
    
    try:
        # Read the sheet data with pandas
        df = pd.read_excel(filepath, sheet_name=sheet_name)
        
        # Apply row range filter
        if start_row > 0:
            start_row = start_row - 2  # Adjust for Excel row numbering
            if start_row < 0:
                start_row = 0
        
        if end_row:
            end_row = end_row - 1  # Adjust for Excel row numbering
            df = df.iloc[start_row:end_row]
        else:
            df = df.iloc[start_row:]
        
        # Apply column filter if specified
        if filter_column and filter_value:
            df = df[df[filter_column] == filter_value]
        
        # Clean data for JSON serialization
        df = df.replace({np.nan: None})
        
        # Get unique values for chart filter
        unique_values = {}
        for col in df.columns:
            if df[col].dtype == object:  # Only get unique values for string columns
                unique_values[col] = df[col].dropna().unique().tolist()
        
        # Convert data to a list of dictionaries
        data = df.to_dict('records')
        
        return jsonify({
            'success': True,
            'data': data,
            'uniqueValues': unique_values
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
        # Read the sheet data with pandas
        df = pd.read_excel(filepath, sheet_name=sheet_name)
        
        # Apply row range filter
        if start_row > 0:
            start_row = start_row - 2  # Adjust for Excel row numbering
            if start_row < 0:
                start_row = 0
        
        if end_row:
            end_row = end_row - 1  # Adjust for Excel row numbering
            df = df.iloc[start_row:end_row]
        else:
            df = df.iloc[start_row:]
        
        # Apply column filter if specified
        if filter_column and filter_value:
            df = df[df[filter_column] == filter_value]
        
        # Process data for chart
        if chart_type in ['pie', 'doughnut', 'polarArea']:
            # For single-series charts, only use the first y-axis
            if len(y_axes) > 0:
                y_axis = y_axes[0]['column']
                color = y_axes[0]['color']
                
                # Group by x-axis and sum y-values
                pie_data = df.groupby(x_axis)[y_axis].sum().reset_index()
                
                chart_data = {
                    'labels': pie_data[x_axis].tolist(),
                    'datasets': [{
                        'label': y_axis,
                        'data': pie_data[y_axis].tolist(),
                        'backgroundColor': generate_colors(len(pie_data)),
                        'borderColor': 'white',
                        'borderWidth': 1
                    }]
                }
        elif chart_type in ['scatter', 'bubble']:
            # For coordinate-based charts
            chart_data = {
                'datasets': []
            }
            
            for i, y_axis_info in enumerate(y_axes):
                y_axis = y_axis_info.get('column')
                color = y_axis_info.get('color', f'rgba(75, 192, 192, {0.8 if i == 0 else 0.6})')
                
                dataset = {
                    'label': y_axis,
                    'backgroundColor': color,
                    'borderColor': color,
                    'borderWidth': 1,
                    'data': []
                }
                
                # Create data points with x,y coordinates
                for _, row in df.iterrows():
                    x_val = row[x_axis]
                    y_val = row[y_axis]
                    
                    if pd.notna(x_val) and pd.notna(y_val):
                        if chart_type == 'bubble':
                            # Use a third column for bubble size if available
                            size = 10  # Default size
                            if i + 1 < len(y_axes):
                                size_col = y_axes[i+1].get('column')
                                if size_col in row and pd.notna(row[size_col]):
                                    size = float(row[size_col])
                            point = {'x': float(x_val), 'y': float(y_val), 'r': size}
                        else:
                            point = {'x': float(x_val), 'y': float(y_val)}
                        dataset['data'].append(point)
                
                chart_data['datasets'].append(dataset)
        elif chart_type in ['stackedBar', 'percentStackedBar']:
            # For stacked bar charts
            # Group by x-axis and calculate sum for each y-axis
            pivoted_data = pd.pivot_table(df, values=y_axes[0]['column'], index=x_axis, aggfunc='sum')
            
            for i in range(1, len(y_axes)):
                y_axis = y_axes[i]['column']
                temp_pivot = pd.pivot_table(df, values=y_axis, index=x_axis, aggfunc='sum')
                pivoted_data = pd.merge(pivoted_data, temp_pivot, left_index=True, right_index=True)
            
            pivoted_data = pivoted_data.reset_index()
            
            # Create chart data structure
            chart_data = {
                'labels': pivoted_data[x_axis].tolist(),
                'datasets': []
            }
            
            # For each y-axis, create a dataset
            for i, y_axis_info in enumerate(y_axes):
                y_axis = y_axis_info.get('column')
                color = y_axis_info.get('color', f'rgba(75, 192, 192, {0.8 if i == 0 else 0.6})')
                
                values = pivoted_data[y_axis].tolist()
                
                # For percentage stacked bars, convert to percentages
                if chart_type == 'percentStackedBar':
                    # Calculate totals for each x-axis label
                    totals = [0] * len(pivoted_data)
                    for j, y_info in enumerate(y_axes):
                        y_col = y_info.get('column')
                        for k, val in enumerate(pivoted_data[y_col].tolist()):
                            if not pd.isna(val):
                                totals[k] += abs(val)
                    
                    # Convert to percentages
                    percent_values = []
                    for j, val in enumerate(values):
                        if totals[j] > 0:
                            percent_values.append((abs(val) / totals[j]) * 100)
                        else:
                            percent_values.append(0)
                    
                    values = percent_values
                
                dataset = {
                    'label': y_axis,
                    'data': values,
                    'backgroundColor': color,
                    'borderColor': color,
                    'borderWidth': 1
                }
                
                chart_data['datasets'].append(dataset)
        else:
            # For standard charts (bar, line, radar)
            # Group by x-axis and calculate sum for each y-axis
            chart_data = {
                'labels': df[x_axis].unique().tolist(),
                'datasets': []
            }
            
            # Add datasets based on y-axes
            for i, y_axis_info in enumerate(y_axes):
                y_axis = y_axis_info.get('column')
                color = y_axis_info.get('color', f'rgba(75, 192, 192, {0.8 if i == 0 else 0.6})')
                
                # Group by x-axis and sum y-values
                grouped_data = df.groupby(x_axis)[y_axis].sum().reset_index()
                
                # Create a dataframe with all possible x-axis values to handle missing values
                all_x = pd.DataFrame({x_axis: chart_data['labels']})
                merged_data = pd.merge(all_x, grouped_data, on=x_axis, how='left').fillna(0)
                
                dataset = {
                    'label': y_axis,
                    'data': merged_data[y_axis].tolist(),
                    'backgroundColor': color,
                    'borderColor': color,
                    'borderWidth': 1
                }
                
                # Additional properties for line charts
                if chart_type == 'line':
                    dataset['fill'] = False
                    dataset['tension'] = 0.1
                
                # Additional properties for radar charts
                if chart_type == 'radar':
                    dataset['fill'] = True
                    color_with_opacity = color.replace(')', ', 0.2)').replace('rgb', 'rgba')
                    dataset['backgroundColor'] = color_with_opacity
                
                chart_data['datasets'].append(dataset)
        
        # Prepare chart filter values if specified
        chart_filter_values = []
        if chart_filter_column:
            chart_filter_values = df[chart_filter_column].dropna().unique().tolist()
        
        return jsonify({
            'success': True,
            'chartData': chart_data,
            'chartType': chart_type,
            'chartFilterValues': chart_filter_values
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# Helper function to generate colors for pie/doughnut charts
def generate_colors(count):
    colors = []
    for i in range(count):
        hue = (i * 137.5) % 360  # Use golden ratio for better color distribution
        colors.append(f'hsl({hue}, 70%, 60%)')
    return colors

# Helper function to calculate percentage data for stacked bar charts
def calculate_percentage_data(datasets, labels):
    # For each label/category, calculate the sum of all dataset values
    totals = [0] * len(labels)
    
    for dataset in datasets:
        for i, value in enumerate(dataset['data']):
            totals[i] += abs(value)
    
    # Convert each dataset value to a percentage of the total
    percentage_datasets = []
    for dataset in datasets:
        percentage_data = []
        for i, value in enumerate(dataset['data']):
            if totals[i] > 0:
                percentage_data.append((abs(value) / totals[i]) * 100)
            else:
                percentage_data.append(0)
        
        percentage_dataset = dataset.copy()
        percentage_dataset['data'] = percentage_data
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
        # Read the sheet data with pandas
        df = pd.read_excel(filepath, sheet_name=sheet_name)
        
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
        
        # For percentage stacked bar, ensure we always show 100%
        if chart_type == 'percentStackedBar' and chart_data and 'datasets' in chart_data:
            chart_data['datasets'] = calculate_percentage_data(chart_data['datasets'], chart_data['labels'])
        
        return jsonify({
            'success': True,
            'chartData': chart_data,
            'filteredRowCount': len(df)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# Helper function to process chart data
def process_chart_data(df, x_axis, y_axes, chart_type):
    # Common chart processing logic extracted from generate_chart
    if chart_type in ['pie', 'doughnut', 'polarArea']:
        # For single-series charts, only use the first y-axis
        if len(y_axes) > 0:
            y_axis = y_axes[0]['column']
            
            # Group by x-axis and sum y-values
            pie_data = df.groupby(x_axis)[y_axis].sum().reset_index()
            
            chart_data = {
                'labels': pie_data[x_axis].tolist(),
                'datasets': [{
                    'label': y_axis,
                    'data': pie_data[y_axis].tolist(),
                    'backgroundColor': generate_colors(len(pie_data)),
                    'borderColor': 'white',
                    'borderWidth': 1
                }]
            }
            
            return chart_data
    
    elif chart_type in ['scatter', 'bubble']:
        # For coordinate-based charts
        chart_data = {
            'datasets': []
        }
        
        for i, y_axis_info in enumerate(y_axes):
            y_axis = y_axis_info.get('column')
            color = y_axis_info.get('color', f'rgba(75, 192, 192, {0.8 if i == 0 else 0.6})')
            
            dataset = {
                'label': y_axis,
                'backgroundColor': color,
                'borderColor': color,
                'borderWidth': 1,
                'data': []
            }
            
            # Create data points with x,y coordinates
            for _, row in df.iterrows():
                x_val = row[x_axis]
                y_val = row[y_axis]
                
                if pd.notna(x_val) and pd.notna(y_val):
                    if chart_type == 'bubble':
                        # Use a third column for bubble size if available
                        size = 10  # Default size
                        if i + 1 < len(y_axes):
                            size_col = y_axes[i+1].get('column')
                            if size_col in row and pd.notna(row[size_col]):
                                size = float(row[size_col])
                        point = {'x': float(x_val), 'y': float(y_val), 'r': size}
                    else:
                        point = {'x': float(x_val), 'y': float(y_val)}
                    dataset['data'].append(point)
            
            chart_data['datasets'].append(dataset)
            
        return chart_data
    
    elif chart_type in ['stackedBar', 'percentStackedBar']:
        # For stacked bar charts
        # Group by x-axis and calculate sum for each y-axis
        if not y_axes:
            return {'labels': [], 'datasets': []}
            
        pivoted_data = pd.pivot_table(df, values=y_axes[0]['column'], index=x_axis, aggfunc='sum')
        
        for i in range(1, len(y_axes)):
            y_axis = y_axes[i]['column']
            temp_pivot = pd.pivot_table(df, values=y_axis, index=x_axis, aggfunc='sum')
            pivoted_data = pd.merge(pivoted_data, temp_pivot, left_index=True, right_index=True)
        
        pivoted_data = pivoted_data.reset_index()
        
        # Create chart data structure
        chart_data = {
            'labels': pivoted_data[x_axis].tolist(),
            'datasets': []
        }
        
        # For each y-axis, create a dataset
        for i, y_axis_info in enumerate(y_axes):
            y_axis = y_axis_info.get('column')
            color = y_axis_info.get('color', f'rgba(75, 192, 192, {0.8 if i == 0 else 0.6})')
            
            values = pivoted_data[y_axis].tolist()
            
            # For percentage stacked bars, convert to percentages
            if chart_type == 'percentStackedBar':
                # Calculate totals for each x-axis label
                totals = [0] * len(pivoted_data)
                for j, y_info in enumerate(y_axes):
                    y_col = y_info.get('column')
                    for k, val in enumerate(pivoted_data[y_col].tolist()):
                        if not pd.isna(val):
                            totals[k] += abs(val)
                
                # Convert to percentages
                percent_values = []
                for j, val in enumerate(values):
                    if totals[j] > 0:
                        percent_values.append((abs(val) / totals[j]) * 100)
                    else:
                        percent_values.append(0)
                
                values = percent_values
            
            dataset = {
                'label': y_axis,
                'data': values,
                'backgroundColor': color,
                'borderColor': color,
                'borderWidth': 1
            }
            
            chart_data['datasets'].append(dataset)
            
        return chart_data
    
    else:
        # For standard charts (bar, line, radar)
        # Group by x-axis and calculate sum for each y-axis
        if df.empty:
            return {'labels': [], 'datasets': []}
            
        chart_data = {
            'labels': df[x_axis].unique().tolist(),
            'datasets': []
        }
        
        # Add datasets based on y-axes
        for i, y_axis_info in enumerate(y_axes):
            y_axis = y_axis_info.get('column')
            color = y_axis_info.get('color', f'rgba(75, 192, 192, {0.8 if i == 0 else 0.6})')
            
            # Group by x-axis and sum y-values
            grouped_data = df.groupby(x_axis)[y_axis].sum().reset_index()
            
            # Create a dataframe with all possible x-axis values to handle missing values
            all_x = pd.DataFrame({x_axis: chart_data['labels']})
            merged_data = pd.merge(all_x, grouped_data, on=x_axis, how='left').fillna(0)
            
            dataset = {
                'label': y_axis,
                'data': merged_data[y_axis].tolist(),
                'backgroundColor': color,
                'borderColor': color,
                'borderWidth': 1
            }
            
            # Additional properties for line charts
            if chart_type == 'line':
                dataset['fill'] = False
                dataset['tension'] = 0.1
            
            # Additional properties for radar charts
            if chart_type == 'radar':
                dataset['fill'] = True
                color_with_opacity = color.replace(')', ', 0.2)').replace('rgb', 'rgba')
                dataset['backgroundColor'] = color_with_opacity
            
            chart_data['datasets'].append(dataset)
            
        return chart_data

@app.route('/download_chart_code', methods=['POST'])
def download_chart_code():
    data = request.json
    chart_type = data.get('chartType')
    chart_data = data.get('chartData')
    chart_options = data.get('chartOptions')
    
    if not chart_type or not chart_data:
        return jsonify({'success': False, 'error': 'Missing chart data'})
    
    try:
        # Create HTML template with chart code
        html_template = f"""<!DOCTYPE html>
<html>
<head>
    <title>Embedded Chart</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        .chart-container {{ width: 800px; height: 500px; margin: 0 auto; }}
    </style>
</head>
<body>
    <div class="chart-container">
        <canvas id="myChart"></canvas>
    </div>
    
    <script>
        // Initialize chart when the page loads
        document.addEventListener('DOMContentLoaded', function() {{
            const ctx = document.getElementById('myChart').getContext('2d');
            
            // Chart data
            const data = {json.dumps(chart_data, indent=2)};
            
            // Chart options
            const options = {json.dumps(chart_options, indent=2)};
            
            // Create chart
            const chart = new Chart(ctx, {{
                type: '{chart_type}',
                data: data,
                options: options
            }});
        }});
    </script>
</body>
</html>"""
        
        # Create a BytesIO object
        html_bytes = io.BytesIO()
        html_bytes.write(html_template.encode('utf-8'))
        html_bytes.seek(0)
        
        return send_file(
            html_bytes,
            mimetype='text/html',
            as_attachment=True,
            download_name='chart.html'
        )
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

if __name__ == '__main__':
    app.run(debug=True)