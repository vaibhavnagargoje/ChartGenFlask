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
    const showGridLinesCheckbox = document.getElementById('showGridLines');
    const showLegendCheckbox = document.getElementById('showLegend');
    
    // Add this after the DOM elements declarations at the top
    const yMinValueInput = document.getElementById('yMinValue');
    const yMaxValueInput = document.getElementById('yMaxValue');
    const applyYAxisRangeBtn = document.getElementById('applyYAxisRange');
    const resetYAxisRangeBtn = document.getElementById('resetYAxisRange');
    
    // Add these variables after the other DOM element declarations
    const chartDescription = document.getElementById('chartDescription');
    const chartAdditionalInfo = document.getElementById('chartAdditionalInfo');
    const shareChartBtn = document.getElementById('shareChartBtn');
    const downloadChartWithInfoBtn = document.getElementById('downloadChartWithInfoBtn');
    
    // Define a default color palette for charts
    const colorPalette = [
        '#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b',
        '#6f42c1', '#5a5c69', '#858796', '#4287f5', '#41e169'
    ];
    
    // State variables
    let currentFileName = '';
    let currentSheetName = '';
    let sheetData = [];
    let columns = [];
    let currentChart = null;
    let selectedChartType = '';
    let legendItems = [];
    
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
    
    // Chart type selection
    document.querySelectorAll('.chart-type-card').forEach(card => {
        card.addEventListener('click', function() {
            // Remove selected class from all cards
            document.querySelectorAll('.chart-type-card').forEach(c => {
                c.classList.remove('selected');
            });
            
            // Add selected class to clicked card
            this.classList.add('selected');
            
            // Store selected chart type
            selectedChartType = this.dataset.type;
        });
    });
    
    // Generate chart
    generateChartBtn.addEventListener('click', function() {
        if (!selectedChartType) {
            alert('Please select a chart type');
            return;
        }
        
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
                createChart(data.chartData, data.chartType);
                
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
    
    // Create chart with Chart.js
    function createChart(chartData, chartType) {
        // Destroy existing chart if there is one
        if (currentChart) {
            currentChart.destroy();
        }
        
        // Apply color palette to datasets if not already set
        for (let i = 0; i < chartData.datasets.length; i++) {
            const dataset = chartData.datasets[i];
            if (!dataset.backgroundColor || dataset.backgroundColor === 'rgba(75, 192, 192, 0.8)' ||
                dataset.backgroundColor.startsWith('rgba(75, 192, 192,')) {
                const colorIndex = i % colorPalette.length;
                dataset.backgroundColor = colorPalette[colorIndex];
                dataset.borderColor = colorPalette[colorIndex];
            }
        }
        
        // For pie/doughnut/polarArea charts, set multiple background colors from palette
        if (['pie', 'doughnut', 'polarArea'].includes(getChartJsType(chartType)) && 
            chartData.datasets && chartData.datasets[0]) {
            const count = chartData.labels.length;
            const colors = [];
            for (let i = 0; i < count; i++) {
                colors.push(colorPalette[i % colorPalette.length]);
            }
            chartData.datasets[0].backgroundColor = colors;
        }
        
        // Set chart configuration based on chart type
        let config = {
            type: getChartJsType(chartType),
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: false,
                        text: ''
                    },
                    legend: {
                        display: showLegendCheckbox.checked,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            generateLabels: function(chart) {
                                const data = chart.data;
                                if (data.datasets.length) {
                                    return data.datasets.map(function(dataset, i) {
                                        return {
                                            text: dataset.label,
                                            fillStyle: dataset.backgroundColor,
                                            strokeStyle: dataset.borderColor,
                                            lineWidth: dataset.borderWidth,
                                            hidden: !chart.isDatasetVisible(i),
                                            index: i
                                        };
                                    });
                                }
                                return [];
                            }
                        },
                        onClick: function(e, legendItem, legend) {
                            const index = legendItem.index;
                            const chart = legend.chart;
                            
                            // Toggle visibility
                            chart.setDatasetVisibility(index, !chart.isDatasetVisible(index));
                            
                            // For percentage stacked bar, recalculate percentages
                            if (selectedChartType === 'percentStackedBar') {
                                recalculatePercentages(chart);
                            }
                            
                            chart.update();
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                
                                if (chartType === 'percentStackedBar') {
                                    label += Math.round(context.parsed.y) + '%';
                                } else if (context.parsed.y !== null) {
                                    label += formatIndianNumber(context.parsed.y);
                                } else if (context.parsed.x !== null && context.parsed.y !== null) {
                                    label += `(${formatIndianNumber(context.parsed.x)}, ${formatIndianNumber(context.parsed.y)})`;
                                }
                                return label;
                            }
                        }
                    },
                    datalabels: {
                        display: chartType === 'percentStackedBar',
                        color: 'white',
                        font: {
                            weight: 'normal' // Regular style as requested
                        },
                        formatter: function(value) {
                            if (chartType === 'percentStackedBar') {
                                return Math.round(value) + '%';
                            }
                            return formatIndianNumber(value);
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: showGridLinesCheckbox.checked
                        }
                    },
                    y: {
                        grid: {
                            display: showGridLinesCheckbox.checked
                        },
                        ticks: {
                            callback: function(value) {
                                if (chartType === 'percentStackedBar') {
                                    return value + '%';
                                } else {
                                    return formatIndianNumber(value);
                                }
                            }
                        }
                    }
                }
            }
        };
        
        // Add special configurations for certain chart types
        if (chartType === 'horizontalBar') {
            config.type = 'bar';
            config.options.indexAxis = 'y'; // This makes the bar chart horizontal
        } else if (chartType === 'stackedBar') {
            config.type = 'bar';
            config.options.scales = {
                x: {
                    stacked: true,
                    grid: {
                        display: showGridLinesCheckbox.checked
                    }
                },
                y: {
                    stacked: true,
                    grid: {
                        display: showGridLinesCheckbox.checked
                    },
                    ticks: {
                        callback: function(value) {
                            return formatIndianNumber(value);
                        }
                    }
                }
            };
        } else if (chartType === 'percentStackedBar') {
            config.type = 'bar';
            config.options.scales = {
                x: {
                    stacked: true,
                    grid: {
                        display: showGridLinesCheckbox.checked
                    }
                },
                y: {
                    stacked: true,
                    min: 0,
                    max: 100,
                    grid: {
                        display: showGridLinesCheckbox.checked
                    },
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            };
            
            // Add custom plugin for percentage calculation
            const percentageRecalculationPlugin = {
                id: 'percentageRecalculation',
                beforeInit: function(chart) {
                    // Save the original data
                    chart.originalData = JSON.parse(JSON.stringify(chartData));
                }
            };
            
            // Add the plugin to config
            if (!config.plugins) {
                config.plugins = [];
            }
            config.plugins.push(percentageRecalculationPlugin);
        }
        
        // For scatter and bubble charts, format axes
        if (['scatter', 'bubble'].includes(chartType)) {
            config.options.scales = {
                x: {
                    grid: {
                        display: showGridLinesCheckbox.checked
                    },
                    ticks: {
                        callback: function(value) {
                            return formatIndianNumber(value);
                        }
                    }
                },
                y: {
                    grid: {
                        display: showGridLinesCheckbox.checked
                    },
                    ticks: {
                        callback: function(value) {
                            return formatIndianNumber(value);
                        }
                    }
                }
            };
        }
        
        // Register ChartDataLabels plugin if present and using percentage stacked bar
        if (window.ChartDataLabels && chartType === 'percentStackedBar') {
            Chart.register(ChartDataLabels);
        }
        
        // Special handling for pie/doughnut/polarArea charts
        if (['pie', 'doughnut', 'polarArea'].includes(getChartJsType(chartType))) {
            config.options.plugins.tooltip = {
                callbacks: {
                    label: function(context) {
                        const label = context.label || '';
                        const value = context.raw;
                        const percentage = ((value / context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0)) * 100).toFixed(1);
                        return `${label}: ${formatIndianNumber(value)} (${percentage}%)`;
                    }
                }
            };
        }
        
        // Create the chart
        currentChart = new Chart(chartCanvas, config);
        
        // Store original data for recalculation when needed
        if (chartType === 'percentStackedBar') {
            currentChart.originalData = JSON.parse(JSON.stringify(chartData));
        }
        
        // Create custom legend with checkboxes if needed
        createCustomLegend(chartData);
    }
    
    // Create custom legend with checkboxes
    function createCustomLegend(chartData) {
        // Check if we already have a legend container
        let legendContainer = document.querySelector('.legend-checkbox-container');
        if (!legendContainer) {
            // Create a container for the legend checkboxes
            legendContainer = document.createElement('div');
            legendContainer.className = 'legend-checkbox-container';
            
            // Insert after chart container
            const chartContainer = document.querySelector('.chart-container');
            chartContainer.parentNode.insertBefore(legendContainer, chartContainer.nextSibling);
        } else {
            // Clear existing legend
            legendContainer.innerHTML = '';
        }
        
        // Create legend items
        legendItems = [];
        chartData.datasets.forEach((dataset, index) => {
            const item = document.createElement('div');
            item.className = 'legend-checkbox-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = true;
            checkbox.dataset.index = index;
            checkbox.id = `legend-checkbox-${index}`;
            
            const colorBox = document.createElement('span');
            colorBox.className = 'legend-color';
            colorBox.style.backgroundColor = dataset.backgroundColor;
            
            const label = document.createElement('label');
            label.textContent = dataset.label;
            label.htmlFor = `legend-checkbox-${index}`;
            
            item.appendChild(checkbox);
            item.appendChild(colorBox);
            item.appendChild(label);
            legendContainer.appendChild(item);
            
            // Add event listener
            checkbox.addEventListener('change', function() {
                const index = parseInt(this.dataset.index);
                
                // Toggle visibility in the chart
                currentChart.setDatasetVisibility(index, this.checked);
                
                // For percentage stacked bar, recalculate percentages
                if (selectedChartType === 'percentStackedBar') {
                    recalculatePercentages(currentChart);
                }
                
                currentChart.update();
            });
            
            legendItems.push({
                checkbox: checkbox,
                dataset: dataset,
                index: index
            });
        });
    }
    
    // Add function to recalculate percentages when toggling legend items
    function recalculatePercentages(chart) {
        // Get indices of visible datasets
        const visibleDatasets = [];
        chart.data.datasets.forEach((dataset, index) => {
            if (!chart.getDatasetMeta(index).hidden) {
                visibleDatasets.push(index);
            }
        });
        
        // Calculate totals for each data point using only visible datasets
        const totals = Array(chart.data.labels.length).fill(0);
        visibleDatasets.forEach(datasetIndex => {
            const dataset = chart.data.datasets[datasetIndex];
            dataset.data.forEach((value, index) => {
                totals[index] += Math.abs(parseFloat(value) || 0);
            });
        });
        
        // Update percentages for visible datasets
        chart.data.datasets.forEach((dataset, datasetIndex) => {
            const meta = chart.getDatasetMeta(datasetIndex);
            if (!meta.hidden) {
                dataset.data = dataset.data.map((value, index) => {
                    return totals[index] ? (Math.abs(parseFloat(value) || 0) / totals[index]) * 100 : 0;
                });
            }
        });
        
        chart.update();
    }
    
    // Map chart types to Chart.js types
    function getChartJsType(type) {
        const typeMap = {
            'bar': 'bar',
            'horizontalBar': 'bar', // Will use indexAxis: 'y' for horizontal
            'stackedBar': 'bar',
            'percentStackedBar': 'bar',
            'line': 'line',
            'pie': 'pie',
            'doughnut': 'doughnut',
            'scatter': 'scatter',
            'radar': 'radar',
            'polarArea': 'polarArea',
            'bubble': 'bubble'
        };
        
        return typeMap[type] || 'bar';
    }
    
    // Format number in Indian format (e.g., 1,00,000)
    function formatIndianNumber(num) {
        if (num === null || num === undefined || isNaN(num)) return '0';
        
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
            // Only apply to chart types that have axes
            const chartType = currentChart.config.type;
            if (['bar', 'line', 'scatter', 'bubble'].includes(chartType)) {
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
        }
    });
    
    // Toggle grid lines
    showGridLinesCheckbox.addEventListener('change', function() {
        if (currentChart) {
            // Update grid display for all scales
            if (currentChart.options.scales) {
                Object.keys(currentChart.options.scales).forEach(scaleKey => {
                    if (!currentChart.options.scales[scaleKey].grid) {
                        currentChart.options.scales[scaleKey].grid = {};
                    }
                    currentChart.options.scales[scaleKey].grid.display = this.checked;
                });
            }
            
            currentChart.update();
        }
    });
    
    // Toggle legend
    showLegendCheckbox.addEventListener('change', function() {
        if (currentChart) {
            currentChart.options.plugins.legend.display = this.checked;
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
        
        // Get visible datasets
        const visibleDatasets = [];
        if (currentChart && selectedChartType === 'percentStackedBar') {
            currentChart.data.datasets.forEach((dataset, index) => {
                if (!currentChart.getDatasetMeta(index).hidden) {
                    visibleDatasets.push(index);
                }
            });
        }
        
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
                chartFilterValue: filterValue,
                visibleDatasets: visibleDatasets // Pass visible datasets for percentage calculation
            })
        })
        .then(response => response.json())
        .then(data => {
            // Remove loading message
            document.body.removeChild(loadingMessage);
            
            if (data.success) {
                // Update chart with filtered data
                updateChart(data.chartData);
                
                // If it's a percentage stacked bar and we have hidden datasets, recalculate
                if (selectedChartType === 'percentStackedBar' && currentChart) {
                    // Store updated original data
                    currentChart.originalData = JSON.parse(JSON.stringify(data.chartData));
                    
                    // Apply visibility from current chart to new data
                    currentChart.data.datasets.forEach((dataset, index) => {
                        const meta = currentChart.getDatasetMeta(index);
                        meta.hidden = meta.hidden || false; // Ensure value is defined
                    });
                    
                    // Recalculate percentages based on visible datasets
                    recalculatePercentages(currentChart);
                }
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
    
    // Update an existing chart with new data
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
        
        // Update custom legend if needed
        updateCustomLegend();
    }
    
    // Update custom legend checkboxes to match chart visibility
    function updateCustomLegend() {
        if (!currentChart || !legendItems.length) return;
        
        legendItems.forEach(item => {
            const isVisible = currentChart.isDatasetVisible(item.index);
            item.checkbox.checked = isVisible;
        });
    }
    
    // Download chart as image
    downloadImageBtn.addEventListener('click', function() {
        if (currentChart) {
            const link = document.createElement('a');
            link.download = 'chart.png';
            link.href = chartCanvas.toDataURL('image/png');
            link.click();
        }
    });
    
    // Download chart code
    downloadCodeBtn.addEventListener('click', function() {
        if (currentChart) {
            const chartConfig = currentChart.config;
            const chartType = chartConfig.type;
            const chartTitle = chartTitleInput.value || 'Untitled Chart';
            const description = chartDescription.value || '';
            const additionalInfo = chartAdditionalInfo.value || '';
            
            // Send request to generate and download chart code
            fetch('/download_chart_code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chartType: selectedChartType,
                    chartData: chartConfig.data,
                    chartOptions: chartConfig.options
                })
            })
            .then(response => {
                if (response.ok) {
                    return response.blob();
                }
                throw new Error('Network response was not ok.');
            })
            .then(blob => {
                // Create a link to download the blob
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `${chartTitle.replace(/\s+/g, '_')}.html`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
            })
            .catch(error => {
                console.error('Error downloading chart code:', error);
                alert('Error downloading chart code. Please try again.');
            });
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
        
        const chartType = getChartJsType(selectedChartType);
        
        // Skip for chart types that don't have a standard y-axis
        if (['pie', 'doughnut', 'polarArea'].includes(chartType)) {
            alert('Y-axis range is not applicable for this chart type');
            return;
        }
        
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
        
        // Special handling for percentage stacked bar chart
        if (selectedChartType === 'percentStackedBar') {
            alert('Y-axis range is fixed from 0% to 100% for percentage stacked bar charts');
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
        let shareText = `Chart: ${chartTitleInput.value || 'Untitled Chart'}\n\n`;
        
        if (chartDescription.value) {
            shareText += `${chartDescription.value}\n\n`;
        }
        
        if (chartAdditionalInfo.value) {
            shareText += `${chartAdditionalInfo.value}\n\n`;
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
        const chartTitle = chartTitleInput.value || 'Untitled Chart';
        
        const html = `
<!DOCTYPE html>
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
        }
        .chart-description {
            margin-top: 20px;
            padding: 10px;
            border-top: 1px solid #e9ecef;
            font-size: 16px;
        }
        .chart-additional-info {
            margin-top: 10px;
            font-size: 14px;
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
            width: 24px;
            height: 24px;
            margin-right: 8px;
        }
    </style>
</head>
<body>
    <div class="chart-container">
        <div class="chart-title">${chartTitle}</div>
        <img class="chart-image" src="${chartImage}" alt="${chartTitle}">
        <div class="chart-description">${description}</div>
        <div class="chart-additional-info">${additionalInfo}</div>
        <div class="chart-footer">
            <div class="chart-credit">
                <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAABmJLR0QA/wD/AP+gvaeTAAABIUlEQVRIie2UMUoDQRSGv9nZLGgKFSy8gYiVpZVYegMvIHgJjyD2XkFIZ2FtZ2FhYWMRsVE3M2NhAmtYdiU7RQI/DPPefP/7HzMwD/8aAdAqfFC7GG+vpnef+5u98+STVgvgcntLnU9M0y3gMUm01LYSsRxGFAMV28DU9JdWpYecn9ygLEbqWL2oPYxnqqbGJSILQFlTu5OI4uMXwRrQr4nHKKvQBlA/Hm6QDsAbmMskUQPQCrHD6CdMsgrOa34sqxAHlMXofyEuiAtaLbCKu6inNZcJ4BEw5AHGKDZWcRelp0GdT9rAZHkCuxgfiItWRVXfDmO1R16e8E2OJF2Lm5xcJDfr9/7iq/oL0Ktk9I6y6N3eVgKs9f8KlecFQOt/jxdTl5u584+QKAAAAABJRU5ErkJggg==" alt="Logo">
                <span>Generated with ChartFlask Analytics Tool</span>
            </div>
            <div class="chart-date">${new Date().toLocaleDateString()}</div>
        </div>
    </div>
</body>
</html>`;
        
        // Create download link
        const blob = new Blob([html], { type: 'text/html' });
        const link = document.createElement('a');
        link.download = `${chartTitle.replace(/\s+/g, '_')}_with_info.html`;
        link.href = URL.createObjectURL(blob);
        link.click();
    });
});