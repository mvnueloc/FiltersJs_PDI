let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');
let originalImageData = null;

document.getElementById('upload').addEventListener('change', function(e) {
    let reader = new FileReader();
    reader.onload = function(event) {
        let img = new Image();
        img.onload = function() {
            // Mantener la relación de aspecto de la imagen
            let scale = Math.min(canvas.width / img.width, canvas.height / img.height);
            let width = img.width * scale;
            let height = img.height * scale;

            // Ajustar el tamaño del canvas al de la imagen
            canvas.width = width;
            canvas.height = height;

            // Dibujar la imagen en el canvas
            ctx.drawImage(img, 0, 0, width, height);
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
