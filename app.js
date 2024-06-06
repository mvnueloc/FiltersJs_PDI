let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');
let originalImageData = null;

document.getElementById('upload').addEventListener('change', function(e) {
    let reader = new FileReader();
    reader.onload = function(event) {
        let img = new Image();
        img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        }
        img.src = event.target.result;
    }
    reader.readAsDataURL(e.target.files[0]);
});

img.onload = function() {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    applyGrayScale(); 
    generateHistogram(ctx.getImageData(0, 0, canvas.width, canvas.height)); 
}

function applyGrayScale() {
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        let avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = data[i + 1] = data[i + 2] = avg; 
    }
    ctx.putImageData(imageData, 0, 0);
    generateHistogram(imageData); 
}

function applyThreshold() {
    let threshold = document.getElementById('thresholdSlider').value;
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        let avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        let binary = (avg > threshold) ? 255 : 0;
        data[i] = binary;
        data[i + 1] = binary;
        data[i + 2] = binary;
    }
    ctx.putImageData(imageData, 0, 0);
    generateHistogram(imageData);
}

function applyExponentialEqualization() {
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;
    const constant = 1.0; 

    let maxVal = 0;
    for (let i = 0; i < data.length; i += 4) {
        maxVal = Math.max(data[i], data[i+1], data[i+2], maxVal);
    }

    for (let i = 0; i < data.length; i += 4) {
        data[i] = 255 * (1 - Math.exp(-constant * data[i] / maxVal)); // red
        data[i + 1] = 255 * (1 - Math.exp(-constant * data[i + 1] / maxVal)); // green
        data[i + 2] = 255 * (1 - Math.exp(-constant * data[i + 2] / maxVal)); // blue
    }

    ctx.putImageData(imageData, 0, 0);

    generateHistogram(imageData);
}

function resetFilters() {
    if (originalImageData) {
        ctx.putImageData(originalImageData, 0, 0);
    }
}

function generateHistogram(imageData) {
    let greyFrequencies = new Array(256).fill(0);
    let data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        greyFrequencies[data[i]]++; 
    }

    var options = {
        series: [{
            name: 'Intensidad de Gris',
            data: greyFrequencies
        }],
        chart: {
            type: 'bar', 
            height: 350
        },
        title: {
            text: 'Histograma de Intensidad de Gris',
            align: 'left'
        },
        xaxis: {
            categories: [...Array(256).keys()],
            labels: {
                show: false, // esto oculta las etiquetas
            },
            title: {
                text: 'Intensidad de Gris'
            }
        },
        yaxis: {
            title: {
                text: 'Frecuencia'
            }
        },
        tooltip: {
            shared: true,
            intersect: false
        },
        dataLabels: {
            enabled: false
        },
    };

    var chart = new ApexCharts(document.querySelector("#chart"), options);
    chart.render();
}

function applyMediaFilter() {
    let windowSize = parseInt(document.getElementById('windowSize').value);
    if (windowSize % 2 === 0) {
        alert("El tamaño de la ventana debe ser un número impar.");
        return;
    }

    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;
    let width = imageData.width;
    let height = imageData.height;

    let outputData = new Uint8ClampedArray(data.length);
    let halfWindowSize = Math.floor(windowSize / 2);

    function getWindow(x, y, channel) {
        let window = [];
        for (let j = -halfWindowSize; j <= halfWindowSize; j++) {
            for (let i = -halfWindowSize; i <= halfWindowSize; i++) {
                let pixelIndex = ((y + j) * width + (x + i)) * 4;
                if (pixelIndex >= 0 && pixelIndex < data.length) {
                    window.push(data[pixelIndex + channel]);
                } else {
                    window.push(0);
                }
            }
        }
        return window;
    }

    for (let y = halfWindowSize; y < height - halfWindowSize; y++) {
        for (let x = halfWindowSize; x < width - halfWindowSize; x++) {
            let redWindow = getWindow(x, y, 0);
            let greenWindow = getWindow(x, y, 1);
            let blueWindow = getWindow(x, y, 2);

            let meanRed = redWindow.reduce((a, b) => a + b, 0) / redWindow.length;
            let meanGreen = greenWindow.reduce((a, b) => a + b, 0) / greenWindow.length;
            let meanBlue = blueWindow.reduce((a, b) => a + b, 0) / blueWindow.length;

            let index = (y * width + x) * 4;
            outputData[index] = meanRed;
            outputData[index + 1] = meanGreen;
            outputData[index + 2] = meanBlue;
            outputData[index + 3] = 255; 
        }
    }

    ctx.putImageData(new ImageData(outputData, width, height), 0, 0);
    generateHistogram(new ImageData(outputData, width, height));
}



function applySobelFilter() {
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;
    let width = imageData.width;
    let height = imageData.height;

    // Kernels de Sobel

    let sobelX = [
        [-1, 0, 1],
        [-2, 0, 2],
        [-1, 0, 1]
    ];

    let sobelY = [
        [-1, -2, -1],
        [0, 0, 0],
        [1, 2, 1]
    ];

    let grayscaleData = [];
    for (let i = 0; i < data.length; i += 4) {
        grayscaleData.push(data[i]);
    }

    let gradientData = new Uint8ClampedArray(data.length);

    function getPixel(x, y) {
        return grayscaleData[y * width + x];
    }

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let pixelX = (
                (sobelX[0][0] * getPixel(x - 1, y - 1)) +
                (sobelX[0][1] * getPixel(x, y - 1)) +
                (sobelX[0][2] * getPixel(x + 1, y - 1)) +
                (sobelX[1][0] * getPixel(x - 1, y)) +
                (sobelX[1][2] * getPixel(x + 1, y)) +
                (sobelX[2][0] * getPixel(x - 1, y + 1)) +
                (sobelX[2][1] * getPixel(x, y + 1)) +
                (sobelX[2][2] * getPixel(x + 1, y + 1))
            );

            let pixelY = (
                (sobelY[0][0] * getPixel(x - 1, y - 1)) +
                (sobelY[0][1] * getPixel(x, y - 1)) +
                (sobelY[0][2] * getPixel(x + 1, y - 1)) +
                (sobelY[1][0] * getPixel(x - 1, y)) +
                (sobelY[1][2] * getPixel(x + 1, y)) +
                (sobelY[2][0] * getPixel(x - 1, y + 1)) +
                (sobelY[2][1] * getPixel(x, y + 1)) +
                (sobelY[2][2] * getPixel(x + 1, y + 1))
            );

            let magnitude = Math.sqrt((pixelX * pixelX) + (pixelY * pixelY)) >>> 0;

            let index = (y * width + x) * 4;
            gradientData[index] = gradientData[index + 1] = gradientData[index + 2] = magnitude;
            gradientData[index + 3] = 255; // Alpha channel
        }
    }

    ctx.putImageData(new ImageData(gradientData, width, height), 0, 0);
    generateHistogram(imageData);
}
