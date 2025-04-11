document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const excelFileInput = document.getElementById('excelFile');
    const fileNameDisplay = document.getElementById('file-name');
    const loadingIndicator = document.getElementById('loading-indicator');
    const dataSelection = document.getElementById('data-selection');
    const sheetSelect = document.getElementById('sheetSelect');
    const xAxisSelect = document.getElementById('xAxisSelect');
    const yAxisSelectors = document.getElementById('yAxisSelectors');
    const xAxisPreview = document.getElementById('xAxisPreview');
    const yAxisPreview = document.getElementById('yAxisPreview');
    const addSeriesBtn = document.getElementById('addSeries');
    const chartTypeSelection = document.getElementById('chart-type-selection');
    const chartDisplay = document.getElementById('chart-display');
    const chartCanvas = document.getElementById('chartCanvas');
    const startRowInput = document.getElementById('startRow');
    const endRowInput = document.getElementById('endRow');
    const applyRangeBtn = document.getElementById('applyRange');
    const generateChartBtn = document.getElementById('generateChartBtn');
    const filterColumnSelect = document.getElementById('filterColumn');
    const filterValueSelect = document.getElementById('filterValue');
    const filterColumn2Select = document.getElementById('filterColumn2');
    const chartFilterValue = document.getElementById('chartFilterValue');
    const chartFilterLabel = document.getElementById('chartFilterLabel');
    const chartTitleInput = document.getElementById('chartTitle');
    const xAxisLabelInput = document.getElementById('xAxisLabel');
    const yAxisLabelInput = document.getElementById('yAxisLabel');
    const applyChartTitleBtn = document.getElementById('applyChartTitle');
    const applyAxisLabelsBtn = document.getElementById('applyAxisLabels');
    const downloadImageBtn = document.getElementById('downloadImageBtn');
    const downloadCodeBtn = document.getElementById('downloadCodeBtn');
    const copyDataBtn = document.getElementById('copyDataBtn');
    
    // Y-axis range inputs
    const yMinValueInput = document.getElementById('yMinValue');
    const yMaxValueInput = document.getElementById('yMaxValue');
    const applyYAxisRangeBtn = document.getElementById('applyYAxisRange');
    const resetYAxisRangeBtn = document.getElementById('resetYAxisRange');
    
    // Chart description and sharing
    const chartDescription = document.getElementById('chartDescription');
    const chartAdditionalInfo = document.getElementById('chartAdditionalInfo');
    const shareChartBtn = document.getElementById('shareChartBtn');
    const downloadChartWithInfoBtn = document.getElementById('downloadChartWithInfoBtn');
    
    // Define a default color palette for charts
    const colorPalette = [
        '#1a4570', '#ee8939', '#f5b843', '#8b3834', '#e0ba3f',
        '#e6e770', '#4d83c5', '#d3a037', '#779c51', '#b2d571'
    ];
    
    // State variables
    let currentFileName = '';
    let currentSheetName = '';
    let sheetData = [];
    let columns = [];
    let currentChart = null;
    const selectedChartType = 'line'; // Always line chart
    
    // File upload handling
    excelFileInput.addEventListener('change', function(e) {
        if (this.files && this.files[0]) {
            const file = this.files[0];
            fileNameDisplay.textContent = file.name;
            uploadFile(file);
        }
    });
    
    // Drag and drop handling
    const dropArea = document.querySelector('.file-upload-label');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        dropArea.classList.add('highlight');
    }
    
    function unhighlight() {
        dropArea.classList.remove('highlight');
    }
    
    dropArea.addEventListener('drop', function(e) {
        const file = e.dataTransfer.files[0];
        excelFileInput.files = e.dataTransfer.files;
        fileNameDisplay.textContent = file.name;
        uploadFile(file);
    });
    
    // Function to upload the file to the server
    function uploadFile(file) {
        const formData = new FormData();
        formData.append('excelFile', file);
        
        loadingIndicator.classList.remove('hidden');
        
        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            loadingIndicator.classList.add('hidden');
            
            if (data.success) {
                currentFileName = data.filename;
                populateSheetSelect(data.sheets);
                dataSelection.classList.remove('hidden');
            } else {
                alert('Error: ' + data.error);
            }
        })
        .catch(error => {
            loadingIndicator.classList.add('hidden');
            console.error('Error:', error);
            alert('Error uploading file. Please try again.');
        });
    }
    
    // Populate sheet selector dropdown
    function populateSheetSelect(sheets) {
        sheetSelect.innerHTML = '';
        
        sheets.forEach(sheet => {
            const option = document.createElement('option');
            option.value = sheet;
            option.textContent = sheet;
            sheetSelect.appendChild(option);
        });
        
        // Trigger sheet selection to load first sheet
        sheetSelect.dispatchEvent(new Event('change'));
    }
    
    // Handle sheet selection
    sheetSelect.addEventListener('change', function() {
        currentSheetName = this.value;
        loadSheetData();
    });
    
    // Load data from selected sheet
    function loadSheetData() {
        loadingIndicator.classList.remove('hidden');
        
        fetch('/get_sheet_data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                filename: currentFileName,
                sheet: currentSheetName
            })
        })
        .then(response => response.json())
        .then(data => {
            loadingIndicator.classList.add('hidden');
            
            if (data.success) {
                columns = data.columns;
                sheetData = data.data;
                
                // Update row count
                endRowInput.value = data.rowCount + 1; // +1 for header row
                
                populateColumnSelectors();
                populateFilterColumns();
                chartTypeSelection.classList.remove('hidden');
            } else {
                alert('Error: ' + data.error);
            }
        })
        .catch(error => {
            loadingIndicator.classList.add('hidden');
            console.error('Error:', error);
            alert('Error loading sheet data. Please try again.');
        });
    }
    
    // Populate column selectors
    function populateColumnSelectors() {
        // Clear existing options
        xAxisSelect.innerHTML = '';
        document.querySelectorAll('.y-axis-select').forEach(select => {
            select.innerHTML = '';
        });
        
        // Add options for each column
        columns.forEach(column => {
            // Add to X-axis select
            const xOption = document.createElement('option');
            xOption.value = column;
            xOption.textContent = column;
            xAxisSelect.appendChild(xOption);
            
            // Add to Y-axis selects
            document.querySelectorAll('.y-axis-select').forEach(select => {
                const yOption = document.createElement('option');
                yOption.value = column;
                yOption.textContent = column;
                select.appendChild(yOption);
            });
        });
        
        // Trigger change events to update previews
        xAxisSelect.dispatchEvent(new Event('change'));
        document.querySelector('.y-axis-select').dispatchEvent(new Event('change'));
    }
    
    // Populate filter column selectors
    function populateFilterColumns() {
        // Clear existing options
        filterColumnSelect.innerHTML = '<option value="">No Filter</option>';
        filterColumn2Select.innerHTML = '<option value="">No Chart Filter</option>';
        
        // Add options for each column
        columns.forEach(column => {
            // Add to filter column select
            const filterOption = document.createElement('option');
            filterOption.value = column;
            filterOption.textContent = column;
            filterColumnSelect.appendChild(filterOption.cloneNode(true));
            
            // Add to chart filter column select
            filterColumn2Select.appendChild(filterOption.cloneNode(true));
        });
    }
    
    // Handle X-axis selection
    xAxisSelect.addEventListener('change', function() {
        updateXAxisPreview();
    });
    
    // Update X-axis preview
    function updateXAxisPreview() {
        const selectedColumn = xAxisSelect.value;
        
        if (selectedColumn && sheetData.length > 0) {
            // Display first few values
            const previewValues = sheetData.slice(0, 5).map(row => row[selectedColumn]);
            xAxisPreview.innerHTML = previewValues.map(val => `<div>${val !== null ? val : '(empty)'}</div>`).join('');
        } else {
            xAxisPreview.innerHTML = '<em>No data to preview</em>';
        }
    }
    
    // Handle Y-axis selection changes
    yAxisSelectors.addEventListener('change', function(e) {
        if (e.target.classList.contains('y-axis-select')) {
            updateYAxisPreview();
        }
    });
    
    // Update Y-axis preview
    function updateYAxisPreview() {
        const selectedColumns = Array.from(document.querySelectorAll('.y-axis-select')).map(select => select.value);
        
        if (selectedColumns.length > 0 && selectedColumns[0] && sheetData.length > 0) {
            // Display first few values of first selected Y-axis
            const previewValues = sheetData.slice(0, 5).map(row => row[selectedColumns[0]]);
            yAxisPreview.innerHTML = previewValues.map(val => `<div>${val !== null ? val : '(empty)'}</div>`).join('');
        } else {
            yAxisPreview.innerHTML = '<em>No data to preview</em>';
        }
    }
    
    // Add another Y-axis series
    addSeriesBtn.addEventListener('click', function() {
        const yAxisItem = document.createElement('div');
        yAxisItem.className = 'y-axis-item';
        
        const select = document.createElement('select');
        select.className = 'y-axis-select';
        
        // Add options to the new select
        columns.forEach(column => {
            const option = document.createElement('option');
            option.value = column;
            option.textContent = column;
            select.appendChild(option);
        });
        
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.className = 'series-color';
        colorInput.value = getRandomColor();
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-y-axis';
        removeBtn.title = 'Remove series';
        removeBtn.textContent = '✕';
        removeBtn.addEventListener('click', function() {
            yAxisItem.remove();
        });
        
        yAxisItem.appendChild(select);
        yAxisItem.appendChild(colorInput);
        yAxisItem.appendChild(removeBtn);
        
        yAxisSelectors.appendChild(yAxisItem);
    });
    
    // Generate random color
    function getRandomColor() {
        // Get color from palette if possible, otherwise generate random
        const colorIndex = document.querySelectorAll('.y-axis-item').length % colorPalette.length;
        return colorPalette[colorIndex];
    }
    
    // Handle filter column selection
    filterColumnSelect.addEventListener('change', function() {
        if (this.value) {
            filterValueSelect.disabled = false;
            loadFilterValues(this.value);
        } else {
            filterValueSelect.disabled = true;
            filterValueSelect.innerHTML = '<option value="">Select column first</option>';
        }
    });
    
    // Load filter values for selected column
    function loadFilterValues(column) {
        // Get unique values for the column
        const uniqueValues = [...new Set(sheetData.map(row => row[column]).filter(val => val !== null))];
        
        // Clear and populate the filter value select
        filterValueSelect.innerHTML = '<option value="">All Values</option>';
        
        uniqueValues.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            filterValueSelect.appendChild(option);
        });
    }
    
    // Apply data range
    applyRangeBtn.addEventListener('click', function() {
        const startRow = parseInt(startRowInput.value);
        const endRow = parseInt(endRowInput.value);
        
        if (startRow > endRow) {
            alert('Start row cannot be greater than end row');
            return;
        }
        
        applyFilters();
    });
    
    // Apply filters (both row range and column filter)
    function applyFilters() {
        loadingIndicator.classList.remove('hidden');
        
        fetch('/filter_data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                filename: currentFileName,
                sheet: currentSheetName,
                startRow: parseInt(startRowInput.value),
                endRow: parseInt(endRowInput.value),
                filterColumn: filterColumnSelect.value,
                filterValue: filterValueSelect.value
            })
        })
        .then(response => response.json())
        .then(data => {
            loadingIndicator.classList.add('hidden');
            
            if (data.success) {
                sheetData = data.data;
                
                // Update previews
                updateXAxisPreview();
                updateYAxisPreview();
                
                // Update any other filter dropdowns with new unique values
                if (filterColumn2Select.value && data.uniqueValues[filterColumn2Select.value]) {
                    // Update chart filter values
                    populateChartFilterValues(data.uniqueValues[filterColumn2Select.value]);
                }
            } else {
                alert('Error: ' + data.error);
            }
        })
        .catch(error => {
            loadingIndicator.classList.add('hidden');
            console.error('Error:', error);
            alert('Error applying filters. Please try again.');
        });
    }
    
    // Handle chart filter column selection
    filterColumn2Select.addEventListener('change', function() {
        if (this.value) {
            // Get unique values for this column
            const uniqueValues = [...new Set(sheetData.map(row => row[this.value]).filter(val => val !== null))];
            populateChartFilterValues(uniqueValues);
        } else {
            // Clear chart filter dropdown
            chartFilterValue.innerHTML = '<option value="">All Values</option>';
        }
    });
    
    // Populate chart filter values
    function populateChartFilterValues(values) {
        chartFilterValue.innerHTML = '<option value="">All Values</option>';
        
        values.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            chartFilterValue.appendChild(option);
        });
    }
    
    // Generate chart
    generateChartBtn.addEventListener('click', function() {
        // Get selected axes
        const xAxis = xAxisSelect.value;
        const yAxes = Array.from(document.querySelectorAll('.y-axis-item')).map(item => {
            return {
                column: item.querySelector('.y-axis-select').value,
                color: item.querySelector('.series-color').value
            };
        });
        
        if (!xAxis || yAxes.length === 0 || !yAxes[0].column) {
            alert('Please select both X and Y axes');
            return;
        }
        
        // Generate the chart
        loadingIndicator.classList.remove('hidden');
        
        fetch('/generate_chart', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                filename: currentFileName,
                sheet: currentSheetName,
                xAxis: xAxis,
                yAxes: yAxes,
                chartType: selectedChartType,
                startRow: parseInt(startRowInput.value),
                endRow: parseInt(endRowInput.value),
                filterColumn: filterColumnSelect.value,
                filterValue: filterValueSelect.value,
                chartFilterColumn: filterColumn2Select.value
            })
        })
        .then(response => response.json())
        .then(data => {
            loadingIndicator.classList.add('hidden');
            
            if (data.success) {
                // Show chart display section
                chartDisplay.classList.remove('hidden');
                
                // Create chart
                createChart(data.chartData);
                
                // Scroll to chart
                chartDisplay.scrollIntoView({ behavior: 'smooth' });
                
                // Update chart filter values if chart filter column is selected
                if (filterColumn2Select.value && data.chartFilterValues && data.chartFilterValues.length > 0) {
                    populateChartFilterValues(data.chartFilterValues);
                    chartFilterLabel.textContent = `Filter by ${filterColumn2Select.value}:`;
                    document.querySelector('.chart-filter-controls').classList.remove('hidden');
                } else {
                    document.querySelector('.chart-filter-controls').classList.add('hidden');
                }
            } else {
                alert('Error: ' + data.error);
            }
        })
        .catch(error => {
            loadingIndicator.classList.add('hidden');
            console.error('Error:', error);
            alert('Error generating chart. Please try again.');
        });
    });
    
    // Create line chart with Chart.js
    function createChart(chartData) {
        // Clean up existing custom legend if any
        const existingLegend = chartCanvas.parentElement.querySelector('.custom-legend');
        if (existingLegend) {
            existingLegend.remove();
        }
        
        // Destroy existing chart if there is one
        if (currentChart) {
            try {
                currentChart.destroy();
                currentChart = null;
            } catch (error) {
                console.warn('Error destroying previous chart:', error);
            }
        }
        
        // Clear the canvas
        const ctx = chartCanvas.getContext('2d');
        ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
        
        // Set appropriate height for the chart container
        chartCanvas.parentElement.style.height = '600px';
        
        // Apply color palette to datasets if not already set
        for (let i = 0; i < chartData.datasets.length; i++) {
            const dataset = chartData.datasets[i];
            if (!dataset.backgroundColor || dataset.backgroundColor === 'rgba(243, 124, 5, 0.88)' ||
                dataset.backgroundColor.startsWith('rgba(26, 69, 112,')) {
                const colorIndex = i % colorPalette.length;
                dataset.backgroundColor = colorPalette[colorIndex];
                dataset.borderColor = colorPalette[colorIndex];
            }
        }
        
        chartData.datasets.forEach(dataset => {
            dataset.fill = false;
            dataset.tension = 0; // Smooth line
            dataset.borderWidth = 1;
            dataset.pointRadius = 0;
            dataset.pointBackgroundColor = dataset.borderColor;
            dataset.pointHoverRadius = 3;
            dataset.spanGaps = false; // Don't connect points across null values
            
            // Log the dataset to check for nulls
            console.log(`Dataset ${dataset.label} values:`, dataset.data);
            
            // Make sure null values are preserved (not converted to 0)
            dataset.data = dataset.data.map(value => 
                value === null || value === undefined || Number.isNaN(value) ? null : value
            );
        });
        
        // Set chart configuration for line charts
        const config = {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 750,
                    easing: 'easeInOutQuart'
                },
                plugins: {
                    
                    legend: {
                        display: false,
                      }
                },
                scales: {
                    x: {
                        grid: {
                            display: false,
                            drawBorder: true
                        }
                    },
                    y: {
                        grid: {
                            drawBorder: false,
                        },
                        ticks: {
                            callback: function(value) {
                                return formatIndianNumber(value);
                            }
                        }
                    }
                },
                spanGaps: false // Important: this must be false to break lines at null values
            }
        };
        
        // Log the final config before creating the chart
        console.log("Final chart configuration:", config);
        
        // Create the chart
        try {
            currentChart = new Chart(ctx, config);
            console.log("Chart created successfully");
        } catch (error) {
            console.error("Error creating chart:", error);
            alert("Error creating chart: " + error.message);
        }
        
        // Create custom legend
        const legendContainer = document.createElement('div');
        legendContainer.className = 'custom-legend';
        
        chartData.datasets.forEach((dataset, index) => {
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            legendItem.style.backgroundColor = dataset.borderColor + '15';
            legendItem.style.border = '1px solid ' + dataset.borderColor + '40';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = true;
            
            const label = document.createElement('span');
            label.textContent = dataset.label;
            label.style.color = dataset.borderColor;
            
            legendItem.appendChild(checkbox);
            legendItem.appendChild(label);
            
            // Add click handlers
            [checkbox, label, legendItem].forEach(element => {
                element.addEventListener('click', (e) => {
                    if (e.target !== checkbox) {
                        checkbox.checked = !checkbox.checked;
                    }
                    
                    const meta = currentChart.getDatasetMeta(index);
                    meta.hidden = !checkbox.checked;
                    
                    // Update legend item appearance
                    legendItem.style.backgroundColor = checkbox.checked ? 
                        dataset.borderColor + '15' : 
                        '#f5f5f5';
                    label.style.color = checkbox.checked ? 
                        dataset.borderColor : 
                        '#999';
                    
                    currentChart.update();
                });
            });
            
            legendContainer.appendChild(legendItem);
        });
        
        // Add legend to the chart container
        chartCanvas.parentElement.insertBefore(legendContainer, chartCanvas);
    }
    
    // Format number in Indian format (e.g., 1,00,000)
    function formatIndianNumber(num) {
        if (num === null || num === undefined || isNaN(num)) return '';  // Return empty string for null values
        
        // Handle negative numbers
        let isNegative = false;
        if (num < 0) {
            isNegative = true;
            num = Math.abs(num);
        }
        
        // Format number to handle different magnitudes properly
        let formattedNumber;
        
        // For numbers less than 1,000, no special formatting needed
        if (num < 1000) {
            formattedNumber = num.toString();
        } else {
            // Convert to string and split at decimal point
            const parts = num.toString().split('.');
            let integerPart = parts[0];
            
            // First we get the last 3 digits
            const lastThree = integerPart.substring(integerPart.length - 3);
            // Then we get the remaining digits
            const remaining = integerPart.substring(0, integerPart.length - 3);
            
            // Now we format the remaining digits with commas after every 2 digits
            let formattedRemaining = '';
            if (remaining) {
                formattedRemaining = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
            }
            
            // Combine the parts
            formattedNumber = formattedRemaining ? formattedRemaining + ',' + lastThree : lastThree;
            
            // Add decimal part if exists
            if (parts.length > 1) {
                formattedNumber += '.' + parts[1];
            }
        }
        
        // Add negative sign if needed
        if (isNegative) {
            formattedNumber = '-' + formattedNumber;
        }
        
        return formattedNumber;
    }

    // Apply chart title
    applyChartTitleBtn.addEventListener('click', function() {
        if (currentChart) {
            currentChart.options.plugins.title.text = chartTitleInput.value;
            currentChart.options.plugins.title.display = !!chartTitleInput.value;
            currentChart.update();
        }
    });
    
    // Apply axis labels
    applyAxisLabelsBtn.addEventListener('click', function() {
        if (currentChart) {
            if (!currentChart.options.scales) {
                currentChart.options.scales = { x: {}, y: {} };
            }
            
            currentChart.options.scales.x.title = {
                display: !!xAxisLabelInput.value,
                text: xAxisLabelInput.value
            };
            
            currentChart.options.scales.y.title = {
                display: !!yAxisLabelInput.value,
                text: yAxisLabelInput.value
            };
            
            currentChart.update();
        }
    });
    
    // Filter chart by selected value
    chartFilterValue.addEventListener('change', function() {
        if (!currentChart || !filterColumn2Select.value) return;
        
        const filterValue = this.value;
        
        // Add a loading indicator
        const loadingMessage = document.createElement('div');
        loadingMessage.className = 'chart-loading-message';
        loadingMessage.textContent = 'Updating chart...';
        document.body.appendChild(loadingMessage);
        
        // Send request to apply filter
        fetch('/apply_chart_filter', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                filename: currentFileName,
                sheet: currentSheetName,
                xAxis: xAxisSelect.value,
                yAxes: Array.from(document.querySelectorAll('.y-axis-item')).map(item => {
                    return {
                        column: item.querySelector('.y-axis-select').value,
                        color: item.querySelector('.series-color').value
                    };
                }),
                chartType: selectedChartType,
                startRow: parseInt(startRowInput.value),
                endRow: parseInt(endRowInput.value),
                filterColumn: filterColumnSelect.value,
                filterValue: filterValueSelect.value,
                chartFilterColumn: filterColumn2Select.value,
                chartFilterValue: filterValue
            })
        })
        .then(response => response.json())
        .then(data => {
            // Remove loading message
            document.body.removeChild(loadingMessage);
            
            if (data.success) {
                // Update chart with filtered data
                updateChart(data.chartData);
            } else {
                alert('Error applying filter: ' + data.error);
            }
        })
        .catch(error => {
            document.body.removeChild(loadingMessage);
            console.error('Error:', error);
            alert('Error applying chart filter. Please try again.');
        });
    });
    
    // Function to update an existing chart with new data
    function updateChart(chartData) {
        if (!currentChart) return;
        
        // Update the chart data
        currentChart.data.labels = chartData.labels;
        
        // Update each dataset
        for (let i = 0; i < chartData.datasets.length; i++) {
            if (i < currentChart.data.datasets.length) {
                // Preserve hidden state
                const wasHidden = currentChart.getDatasetMeta(i).hidden;
                
                // Update data
                currentChart.data.datasets[i].data = chartData.datasets[i].data;
                
                // Restore hidden state
                currentChart.getDatasetMeta(i).hidden = wasHidden;
            }
        }
        
        // Update the chart
        currentChart.update();
    }
    
    // Download chart as image
    downloadImageBtn.addEventListener('click', function() {
        if (currentChart) {
            const link = document.createElement('a');
            link.download = 'line_chart.png';
            link.href = chartCanvas.toDataURL('image/png');
            link.click();
        }
    });
    
    // Download chart code
    downloadCodeBtn.addEventListener('click', function() {
        if (currentChart) {
            const chartConfig = currentChart.config;
            const chartTitle = chartTitleInput.value || 'Untitled Line Chart';
            const description = chartDescription.value || '';
            const additionalInfo = chartAdditionalInfo.value || '';
            
            // Get chart filter information
            const chartFilterColumn = filterColumn2Select.value;
            const chartFilterOptions = Array.from(chartFilterValue.options).map(opt => opt.value);
            const selectedFilterValue = chartFilterValue.value;
            
            // Create loading indicator message for user feedback
            const loadingDiv = document.createElement('div');
            loadingDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); color: white; padding: 20px; border-radius: 8px; z-index: 9999;';
            loadingDiv.textContent = 'Preparing chart data...';
            document.body.appendChild(loadingDiv);
            
            // Pre-generate filtered data for each filter option
            const preFilteredData = {};
            
            // Track the number of fetch operations and completions
            let fetchCount = 0;
            let completedFetches = 0;
            
            // Only process if there are filter options
            if (chartFilterColumn && chartFilterOptions.length > 0) {
                // Save current chart data and state
                const currentLabels = [...currentChart.data.labels];
                const currentDatasets = JSON.parse(JSON.stringify(currentChart.data.datasets));
                console.log(currentDatasets)
                const currentVisibility = [];
                currentChart.data.datasets.forEach((dataset, i) => {
                    currentVisibility.push(!currentChart.getDatasetMeta(i).hidden);
                });
                
                // Process each filter option sequentially for more reliable results
                const processFilterOptions = async () => {
                    // Create an array of promises for fetch operations
                    const fetchPromises = [];
                    
                    for (const filterOption of chartFilterOptions) {
                        if (!filterOption) {
                            // Skip empty option (All Values)
                            continue;
                        }
                        
                        // Create a promise for this fetch operation
                        const fetchPromise = fetch('/apply_chart_filter', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                filename: currentFileName,
                                sheet: currentSheetName,
                                xAxis: xAxisSelect.value,
                                yAxes: Array.from(document.querySelectorAll('.y-axis-item')).map(item => {
                                    return {
                                        column: item.querySelector('.y-axis-select').value,
                                        color: item.querySelector('.series-color').value
                                    };
                                }),
                                chartType: selectedChartType,
                                startRow: parseInt(startRowInput.value),
                                endRow: parseInt(endRowInput.value),
                                filterColumn: filterColumnSelect.value,
                                filterValue: filterValueSelect.value,
                                chartFilterColumn: chartFilterColumn,
                                chartFilterValue: filterOption
                            })
                        })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                // Store the filtered data
                                preFilteredData[filterOption] = data.chartData;
                            }
                            completedFetches++;
                            
                            // Update the loading message to show progress
                            loadingDiv.textContent = `Preparing chart data... (${completedFetches}/${fetchCount})`;
                        })
                        .catch(error => {
                            console.error('Error pre-filtering data for ' + filterOption, error);
                            completedFetches++;
                            loadingDiv.textContent = `Preparing chart data... (${completedFetches}/${fetchCount})`;
                        });
                        
                        fetchPromises.push(fetchPromise);
                        fetchCount++;
                    }
                    
                    // Wait for all fetch operations to complete
                    return Promise.all(fetchPromises);
                };
                
                // Execute the fetch operations and then generate the HTML
                processFilterOptions().then(() => {
                    // Remove loading message
                    document.body.removeChild(loadingDiv);
                    
                    // Restore original chart state
                    currentChart.data.labels = currentLabels;
                    currentChart.data.datasets.forEach((dataset, i) => {
                        Object.assign(dataset, currentDatasets[i]);
                        currentChart.getDatasetMeta(i).hidden = !currentVisibility[i];
                    });
                    currentChart.update();
                    
                    // Now continue with the HTML generation
                    generateAndDownloadHTML();
                });
            } else {
                // No filter options, just generate HTML
                document.body.removeChild(loadingDiv);
                generateAndDownloadHTML();
            }
            
            function generateAndDownloadHTML() {
                // Create HTML template for line chart
                const html = `
<!DOCTYPE html>
<html>
<head>
    <title>${chartTitle}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Lato:wght@400&display=swap" rel="stylesheet">
    <style>
        body { 
            font-family: Lato; 
            margin: 20px; 
            background-color: #f5f5f5;
        }
        .chart-container { 
            max-width: 1000px; 
            margin: 0 auto 20px auto; 
            background-color: white;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            border-radius: 8px;
            padding: 20px;
            position: relative;
        }
        .chart-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .chart-title {
            font-size: 20px;
            font-weight: bold;
            color: #2c3e50;
            flex-grow: 1;
            text-align: center;
             margin-left: 90px;
        }
        .chart-logo {
            width: 90px;
            height: auto;
            
        }
        .chart-filter-controls {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
           
            padding: 8px;
            border-radius: 4px;
        }
        .chart-filter-group {
            display: flex;
            align-items: center;
        }
        .chart-filter-group label {
            margin-right: 5px;
            font-size: 12px;
            color: black;
        }
        .chart-filter-group select {
            padding: 6px 5px;
            color:rgb(0, 0, 0);
            border: 1px solid #863F3F;
            font-size: 12px;
            min-width: 100px;
        }
        .chart-canvas-container {
            height: 500px;
            width: 100%;
        }
        .chart-footer {
            display: flex;
            justify-content: space-between;
            margin-top: 10px;
            padding-top: 5px;
            border-top: 1px solid #e9ecef;
        }
        .chart-info {
            flex: 1;
        }
        .chart-description {
            margin-top: 0;
            padding: 2px;
            font-size: 10px;
            padding-left: 70px;
        }
        .chart-additional-info {
            margin-top: 2px;
            padding: 2px;
            font-size: 10px;
            padding-left: 70px;
        }
        .chart-actions {
            display: flex;
            align-items: flex-start;
            margin-left: 15px;
        }
        .chart-date {
            font-size: 12px;
            color: #6c757d;
        }
        .icon-btn {
            background: none;
            border: none;
            cursor: pointer;
            color: #6c757d;
            padding: 0;
            margin: 0;
            margin-top: 7px;
        }
        .icon-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
      
       
       
    </style>
</head>
<body>
    <div class="chart-container">
        <div class="chart-header">
            <div class="chart-title">${chartTitle}</div>
            <img class="chart-logo" src="logo.png" alt="ChartFlask Logo">
        </div>
        ${chartFilterColumn ? `
        <div class="chart-filter-controls">
            <div class="chart-filter-group">
                <label for="chartFilter">${chartFilterColumn}</label>
                <select id="chartFilter" onchange="filterChartData()">
                    <option value="">All Values</option>
                    ${chartFilterOptions.map(value => value ? `<option value="${value}" ${value === selectedFilterValue ? 'selected' : ''}>${value}</option>` : '').join('')}
                </select>
            </div>
        </div>
        ` : ''}
        <div class="chart-canvas-container">
            <canvas id="myChart"></canvas>
        </div>
        <div class="chart-footer">
            <div class="chart-info">
                ${description ? `<span class="chart-description">Source: ${description}</span>` : ''}
                ${additionalInfo ? `<div class="chart-additional-info">${additionalInfo}</div>` : ''}
            </div>
            <div class="chart-actions">
                <button id="downloadChartBtn" class="icon-btn" title="Download Chart">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                </button>
            </div>
        </div>
    </div>
    
    <script>
        // Indian number formatting function
        function formatIndianNumber(num) {
            if (num === null || num === undefined || isNaN(num)) return '';  // Return empty string for null values
            
            let isNegative = false;
            if (num < 0) {
                isNegative = true;
                num = Math.abs(num);
            }
            
            let formattedNumber;
            if (num < 1000) {
                formattedNumber = num.toString();
            } else {
                const parts = num.toString().split('.');
                let integerPart = parts[0];
                
                const lastThree = integerPart.substring(integerPart.length - 3);
                const remaining = integerPart.substring(0, integerPart.length - 3);
                
                let formattedRemaining = '';
                if (remaining) {
                    formattedRemaining = remaining.replace(/\\B(?=(\\d{2})+(?!\\d))/g, ',');
                }
                
                formattedNumber = formattedRemaining ? formattedRemaining + ',' + lastThree : lastThree;
                
                if (parts.length > 1) {
                    formattedNumber += '.' + parts[1];
                }
            }
            
            return isNegative ? '-' + formattedNumber : formattedNumber;
        }

        // Store original chart data for filtering
        const originalChartData = ${JSON.stringify(chartConfig.data, null, 2)};
        
        // Pre-filtered data for each district
        const preFilteredData = ${JSON.stringify(preFilteredData, null, 2)};

        // Chart configuration
        const ctx = document.getElementById('myChart').getContext('2d');
        const chartData = ${JSON.stringify(chartConfig.data, null, 2)};
        const chartOptions = ${JSON.stringify(chartConfig.options, null, 2)};

        // Create chart with exact same configuration but remove redundant title
        const chart = new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: {
                ...chartOptions,
                plugins: {
                    ...chartOptions.plugins,
                    // Remove title from chart as it's now in the header
                    title: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'yellow', // Yellow tooltip background
                        titleColor: 'black',
                        bodyColor: 'black',
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                
                                if (context.parsed.y !== null && context.parsed.y !== undefined) {
                                    label += formatIndianNumber(context.parsed.y);
                                } else {
                                    label += 'No data'; // For null values, show 'No data' in tooltip
                                }
                                return label;
                            }
                        }
                    },
                    legend: {
                        display: true,
                        labels: {
                                    boxWidth: 20,        // Width of the color box
                                    boxHeight: 20,       // Height of the color box
                                    usePointStyle: true, // Makes it more like a round dot or checkbox
                                    pointStyle: 'rect', // Use 'circle', 'rect', 'rectRounded', 'cross', etc.
                                    padding: 15,
                                    color: '#333',       // Label text color
                                    font: {
                                    size: 12,
                                    }
                        }}
                },
                scales: {
                    ...chartOptions.scales,
                    x: {
                        ...chartOptions.scales?.x,
                        offset: true,
                        grid: {
                            drawTicks: true,
                            drawOnChartArea: false,
                        },
                        ticks: {
                            color: '#333'       // Optional: customize tick color
                            }
                    },
                    y: {
                        ...chartOptions.scales?.y,
                         offset: true,
                
                        grid: {
                            
                            drawBorder: false     // ✅ Show tick marks
                        },
                        ticks: {
                            callback: function(value) {
                                return formatIndianNumber(value);
                            },
                            color: '#333'       // Optional: customize tick color
                        }
                    }
                },
                spanGaps: false // Don't connect points across null values for line charts
            }
        });

       
        ${chartFilterColumn ? `
        // Function to filter chart data based on selected value
        function filterChartData() {
            const filterValue = document.getElementById('chartFilter').value;
            
            if (!chart || !chart.data) return;
            
            try {
                // Store current dataset visibility
                const visibility = [];
                chart.data.datasets.forEach((dataset, index) => {
                    visibility.push(!chart.getDatasetMeta(index).hidden);
                });
                
                // Handle the "All Values" option
                if (!filterValue) {
                    // Reset to full data
                    chart.data.labels = originalChartData.labels;
                    chart.data.datasets.forEach((dataset, i) => {
                        dataset.data = originalChartData.datasets[i].data;
                    });
                // Use pre-filtered data if available
                } else if (preFilteredData && preFilteredData[filterValue]) {
                    // Use pre-filtered data from the server
                    const filteredData = preFilteredData[filterValue];
                    
                    // Check if we have valid data
                    if (filteredData && filteredData.labels && filteredData.datasets) {
                        // Update labels and datasets
                        chart.data.labels = filteredData.labels;
                        
                        // Update each dataset's data while preserving other properties
                        filteredData.datasets.forEach((dataset, i) => {
                            if (i < chart.data.datasets.length) {
                                chart.data.datasets[i].data = dataset.data;
                            }
                        });
                    }
                } else {
                    // Fallback to client-side filtering if no pre-filtered data is available
                    console.log("No pre-filtered data available for " + filterValue + ", using fallback filter");
                    
                    // Try exact match in x-axis labels (categorical data)
                    const matchingIndices = [];
                    originalChartData.labels.forEach((label, i) => {
                        if (String(label).toLowerCase() === String(filterValue).toLowerCase()) {
                            matchingIndices.push(i);
                        }
                    });
                    
                    if (matchingIndices.length > 0) {
                        // Filter data to only show matching categories
                        chart.data.labels = matchingIndices.map(i => originalChartData.labels[i]);
                        chart.data.datasets.forEach((dataset, i) => {
                            dataset.data = matchingIndices.map(i => originalChartData.datasets[i].data[i]);
                        });
                    } else {
                        // No exact matches found, show message
                        displayFilterMessage(filterValue);
                    }
                }
                
                // Restore dataset visibility that wasn't specifically changed
                chart.data.datasets.forEach((dataset, index) => {
                    if (chart.getDatasetMeta(index).hidden === undefined) {
                        chart.getDatasetMeta(index).hidden = !visibility[index];
                    }
                });
                
                // Update the chart
                chart.update();
            } catch (error) {
                console.error("Error filtering chart:", error);
                // Show error message and reset to full data
                displayFilterMessage(filterValue, true);
                
                // Reset to full data
                chart.data.labels = originalChartData.labels;
                chart.data.datasets.forEach((dataset, i) => {
                    dataset.data = originalChartData.datasets[i].data;
                });
                chart.update();
            }
        }
        
        // Helper function to display filter messages
        function displayFilterMessage(filterValue, isError = false) {
            const messageDiv = document.createElement('div');
            
            if (isError) {
                messageDiv.style.cssText = 'padding: 10px; margin: 10px 0; background-color: #f8d7da; color: #721c24; border-radius: 4px; border-left: 4px solid #f5c6cb;';
                messageDiv.innerHTML = '<strong>Error:</strong> Could not filter data for "' + filterValue + 
                    '". Showing all values.';
            } else {
                messageDiv.style.cssText = 'padding: 10px; margin: 10px 0; background-color: #cfe8ff; color: #084298; border-radius: 4px; border-left: 4px solid #084298;';
                messageDiv.innerHTML = '<strong>Note:</strong> No filter data available for "' + filterValue + 
                    '". Showing all values.';
            }
            
            messageDiv.className = 'filter-message';
            
            const chartContainer = document.querySelector('.chart-container');
            const existingMessage = chartContainer.querySelector('.filter-message');
            if (existingMessage) {
                chartContainer.removeChild(existingMessage);
            }
            
            const canvasContainer = document.querySelector('.chart-canvas-container');
            chartContainer.insertBefore(messageDiv, canvasContainer);
            
            // Auto-remove after 4 seconds
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.parentNode.removeChild(messageDiv);
                }
            }, 4000);
        }
        ` : ''}

        // Add download functionality
        document.getElementById('downloadChartBtn').addEventListener('click', function() {
            const canvas = document.getElementById('myChart');
            const image = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = '${chartTitle.replace(/\\s+/g, '_')}.png';
            link.href = image;
            link.click();
        });
        
        // Apply the initial filter value if one is selected
        ${selectedFilterValue ? 'setTimeout(() => filterChartData(), 100);' : ''}
    </script>
</body>
</html>`;
                
                // Create download link
                const blob = new Blob([html], { type: 'text/html' });
                const link = document.createElement('a');
                link.download = chartTitle.replace(/\s+/g, '_') + '.html';
                link.href = URL.createObjectURL(blob);
                link.click();
            }
        }
    });
    
    // Copy chart data to clipboard
    copyDataBtn.addEventListener('click', function() {
        if (currentChart) {
            const data = currentChart.data;
            
            // Format data as CSV
            const headers = ['Label', ...data.datasets.map(ds => ds.label || 'Dataset')];
            const rows = data.labels.map((label, i) => {
                return [
                    label,
                    ...data.datasets.map(ds => ds.data[i])
                ];
            });
            
            const csv = [
                headers.join(','),
                ...rows.map(row => row.join(','))
            ].join('\n');
            
            // Copy to clipboard
            navigator.clipboard.writeText(csv)
                .then(() => alert('Chart data copied to clipboard!'))
                .catch(() => {
                    // Fallback for older browsers
                    const textarea = document.createElement('textarea');
                    textarea.value = csv;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                    alert('Chart data copied to clipboard!');
                });
        }
    });
    
    // Apply Y-axis range
    applyYAxisRangeBtn.addEventListener('click', function() {
        if (!currentChart) return;
        
        // Get min and max values
        const minValue = yMinValueInput.value.trim() === '' ? undefined : parseFloat(yMinValueInput.value);
        const maxValue = yMaxValueInput.value.trim() === '' ? undefined : parseFloat(yMaxValueInput.value);
        
        // Validate values
        if (minValue !== undefined && isNaN(minValue)) {
            alert('Min value must be a number');
            return;
        }
        
        if (maxValue !== undefined && isNaN(maxValue)) {
            alert('Max value must be a number');
            return;
        }
        
        if (minValue !== undefined && maxValue !== undefined && minValue >= maxValue) {
            alert('Min value must be less than max value');
            return;
        }
        
        // Update chart scales
        if (!currentChart.options.scales.y) {
            currentChart.options.scales.y = {};
        }
        
        currentChart.options.scales.y.min = minValue;
        currentChart.options.scales.y.max = maxValue;
        
        // Update the chart
        currentChart.update();
    });
    
    // Reset Y-axis range to auto
    resetYAxisRangeBtn.addEventListener('click', function() {
        if (!currentChart) return;
        
        yMinValueInput.value = '';
        yMaxValueInput.value = '';
        
        if (currentChart.options.scales.y) {
            delete currentChart.options.scales.y.min;
            delete currentChart.options.scales.y.max;
        }
        
        currentChart.update();
    });
    
    // Share chart
    shareChartBtn.addEventListener('click', function() {
        if (!currentChart) return;
        
        // Create a temporary hidden textarea
        const textarea = document.createElement('textarea');
        textarea.style.position = 'fixed';
        textarea.style.left = '-999999px';
        
        // Create share text with chart info
        let shareText = 'Chart: ' + (chartTitleInput.value || 'Untitled Line Chart') + '\n\n';
        
        if (chartDescription.value) {
            shareText += chartDescription.value + '\n\n';
        }
        
        if (chartAdditionalInfo.value) {
            shareText += chartAdditionalInfo.value + '\n\n';
        }
        
        shareText += 'Generated with ChartFlask Analytics Tool';
        
        // Copy to clipboard
        textarea.value = shareText;
        document.body.appendChild(textarea);
        textarea.select();
        
        try {
            document.execCommand('copy');
            alert('Chart information copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy: ', err);
            alert('Failed to copy chart information');
        }
        
        document.body.removeChild(textarea);
    });
    
    // Download chart with additional info
    downloadChartWithInfoBtn.addEventListener('click', function() {
        if (!currentChart) return;
        
        // First, render the current chart to an image
        const chartImage = chartCanvas.toDataURL('image/png');
        
        // Create HTML content with chart info
        const description = chartDescription.value || '';
        const additionalInfo = chartAdditionalInfo.value || '';
        const chartTitle = chartTitleInput.value || 'Untitled Line Chart';
        
        const html = `<!DOCTYPE html>
<html>
<head>
    <title>${chartTitle}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 20px;
            background-color: #f5f5f5;
        }
        .chart-container {
            max-width: 1000px;
            margin: 0 auto 20px auto;
            background-color: white;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            border-radius: 8px;
            padding: 20px;
        }
        .chart-title {
            text-align: center;
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 20px;
            color: #2c3e50;
        }
        .chart-image {
            width: 100%;
            max-width: 100%;
            height: auto;
            border-radius: 4px;
            margin-bottom: 30px;
        }
        .chart-description {
            margin-top: 40px;
            padding: 5px;
            border-top: 1px solid #e9ecef;
            font-size: 10px;
        }
        .chart-additional-info {
            margin-top: 10px;
            padding: 5px;
            font-size: 10px;
            color: #6c757d;
        }
        .chart-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #e9ecef;
            font-size: 12px;
            color: #6c757d;
        }
        .chart-credit {
            display: flex;
            align-items: center;
        }
        .chart-credit img {
            width: 70px;
            height: auto;
            margin-right: 8px;
        }
    </style>
    <link href="https://fonts.googleapis.com/css?family=Lato" rel="stylesheet">
</head>
<body>
    <div class="chart-container">
        <div class="chart-title">${chartTitle}</div>
        <img class="chart-image" src="${chartImage}" alt="${chartTitle}">
        <div class="chart-description">${description}</div>
        <div class="chart-additional-info">${additionalInfo}</div>
        <div class="chart-footer">
            <div class="chart-credit">
                <img src="logo.png" alt="Logo">
                <span>Generated with ChartFlask Analytics Tool</span>
            </div>
            <div class="chart-date"> 
                <button id="downloadChartWithInfoBtn" class="icon-btn" title="Download Chart with Info">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                </button>
            </div>
        </div>
    </div>
</body>
</html>`;
        
        // Create download link
        const blob = new Blob([html], { type: 'text/html' });
        const link = document.createElement('a');
        link.download = chartTitle.replace(/\s+/g, '_') + '_with_info.html';
        link.href = URL.createObjectURL(blob);
        link.click();
    });
});