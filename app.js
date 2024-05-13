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
    applyGrayScale(); // Asegúrate de convertir la imagen a escala de grises
    generateHistogram(ctx.getImageData(0, 0, canvas.width, canvas.height)); // Genera el histograma
}

function applyGrayScale() {
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        let avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = data[i + 1] = data[i + 2] = avg; // Aplica escala de grises a cada componente
    }
    ctx.putImageData(imageData, 0, 0);
    generateHistogram(imageData); // Actualiza el histograma después de aplicar escala de grises
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
        greyFrequencies[data[i]]++; // Suponemos que la imagen ya está en escala de grises y el valor de gris se encuentra en cada componente
    }

    var options = {
        series: [{
            name: 'Intensidad de Gris',
            data: greyFrequencies
        }],
        chart: {
            type: 'bar', // 'bar' es más adecuado para histogramas
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

