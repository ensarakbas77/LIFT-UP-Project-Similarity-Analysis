/**
 * LIFT UP Admin — Reports & Analytics Logic
 * Grafikleri Chart.js kullanarak doldurur.
 */

document.addEventListener('DOMContentLoaded', () => {

    // Ortak Chart.js Ayarları
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = "#64748b";
    
    // Animasyonla değerleri say (Top cards)
    animateValue("metricUsage", 0, 1284, 1500, "");
    animateValue("metricSim", 0, 42, 1500, "%");
    animateValue("metricDB", 0, 246, 1500, " MB");

    // Inline plugin to show values on top of bars
    const barValuePlugin = {
        id: 'barValuePlugin',
        afterDatasetsDraw(chart, args, pluginOptions) {
            const { ctx } = chart;
            chart.data.datasets.forEach((dataset, i) => {
                const meta = chart.getDatasetMeta(i);
                meta.data.forEach((bar, index) => {
                    const data = dataset.data[index];
                    ctx.save();
                    ctx.fillStyle = '#334155'; // koyu gri/mavi metin rengi
                    ctx.font = '500 13px Inter';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    ctx.fillText(data, bar.x, bar.y - 6);
                    ctx.restore();
                });
            });
        }
    };

    // 1. Bar Chart - Yıllara Göre Makale Sayısı
    const ctxYearly = document.getElementById('yearlyChart').getContext('2d');
    new Chart(ctxYearly, {
        type: 'bar',
        data: {
            labels: ['2020-2021', '2021-2022', '2022-2023', '2023-2024'],
            datasets: [{
                label: 'Makale Sayısı',
                data: [132, 98, 154, 282],
                backgroundColor: '#5a7bb0', // Görseldeki soft mavi-lacivert tonu
                borderRadius: 2,
                borderWidth: 0,
                barPercentage: 0.8,
                categoryPercentage: 0.9
            }]
        },
        plugins: [barValuePlugin],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: { top: 20 } // Yazıların üste taşmaması için pay
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) { return '  Makale: ' + context.parsed.y; }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Makale Sayısı',
                        font: { size: 14, weight: '500' },
                        color: '#334155'
                    },
                    grid: { color: 'rgba(0,0,0,0.08)', drawBorder: false }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Yıl',
                        font: { size: 14, weight: '500' },
                        color: '#334155'
                    },
                    grid: { display: false, drawBorder: false },
                    ticks: {
                        font: { size: 13, color: '#334155' }
                    }
                }
            }
        }
    });

    // 2. Doughnut Chart - Dil Dağılımı
    const ctxLang = document.getElementById('langChart').getContext('2d');
    new Chart(ctxLang, {
        type: 'doughnut',
        data: {
            labels: ['Türkçe', 'İngilizce', 'Diğer'],
            datasets: [{
                data: [68, 28, 4],
                backgroundColor: [
                    '#10b981', // Yeşil
                    '#00a3e0', // Mavi
                    '#f59e0b'  // Sarı
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });

    // 3. Line Chart - API İstek Yoğunluğu
    const ctxActivity = document.getElementById('activityChart').getContext('2d');
    
    // Gradient for line chart
    let gradientLine = ctxActivity.createLinearGradient(0, 0, 0, 300);
    gradientLine.addColorStop(0, 'rgba(0, 163, 224, 0.5)');
    gradientLine.addColorStop(1, 'rgba(0, 163, 224, 0.0)');

    new Chart(ctxActivity, {
        type: 'line',
        data: {
            labels: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'],
            datasets: [{
                label: 'İstek Sayısı',
                data: [120, 190, 150, 320, 210, 45, 60],
                borderColor: '#00a3e0',
                backgroundColor: gradientLine,
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#00a3e0',
                pointBorderWidth: 2,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false }
                },
                x: {
                    grid: { display: false, drawBorder: false }
                }
            }
        }
    });

    // 4. Radar Chart - Kategori Analizi
    const ctxRadar = document.getElementById('radarChart').getContext('2d');
    new Chart(ctxRadar, {
        type: 'radar',
        data: {
            labels: ['Yapay Zeka', 'Malzeme', 'Aviyonik', 'Yapısal', 'İtki', 'Sistem Müh.'],
            datasets: [{
                label: 'Proje Sayısı',
                data: [85, 45, 60, 50, 40, 75],
                backgroundColor: 'rgba(245, 158, 11, 0.2)',
                borderColor: '#f59e0b',
                pointBackgroundColor: '#f59e0b',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#f59e0b'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                r: {
                    angleLines: { color: 'rgba(0,0,0,0.05)' },
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    pointLabels: {
                        font: { family: "'Inter', sans-serif", size: 11 },
                        color: '#64748b'
                    },
                    ticks: { display: false }
                }
            }
        }
    });
});

// Sayı sayma efekti fonksiyonu
function animateValue(id, start, end, duration, suffix) {
    const obj = document.getElementById(id);
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const currentVal = Math.floor(progress * (end - start) + start);
        obj.innerHTML = currentVal.toLocaleString('tr-TR') + suffix;
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// Global scope attach download
window.downloadChart = function(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    // Geçici bir arka plan ekleyerek şeffaflığı siyah olmaktan kurtarmak için
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const ctx = tempCanvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    ctx.drawImage(canvas, 0, 0);

    const link = document.createElement('a');
    link.download = `liftup-rapor-${canvasId}-${new Date().getTime()}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
};
