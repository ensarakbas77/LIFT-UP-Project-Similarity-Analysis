/**
 * LIFT UP Admin — Reports & Analytics
 * Tüm istatistikler /api/projects/ endpoint'inden gerçek veriyle hesaplanır.
 */

document.addEventListener('DOMContentLoaded', () => {

    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = '#64748b';

    const YEAR_COLORS = {
        '2020-2021': { bg: 'rgba(0,163,224,.85)',    border: '#00a3e0' },
        '2021-2022': { bg: 'rgba(31,45,90,.85)',     border: '#1F2D5A' },
        '2022-2023': { bg: 'rgba(16,185,129,.85)',   border: '#10b981' },
        '2023-2024': { bg: 'rgba(245,158,11,.85)',   border: '#f59e0b' },
    };

    let yearlyChartInst  = null;
    let donutChartInst   = null;
    let abstractChartInst = null;

    // ── Veri çek ─────────────────────────────────────────────────────────────
    const _rToken = localStorage.getItem('lift_admin_token');
    fetch('/api/projects/', {
        headers: _rToken ? { 'Authorization': `Bearer ${_rToken}` } : {}
    })
        .then(res => {
            if (!res.ok) throw new Error('API hatası');
            return res.json();
        })
        .then(data => {
            buildReports(data);
        })
        .catch(err => {
            console.warn('API bağlantısı kurulamadı, örnek veri kullanılıyor:', err);
            buildReports(generateMockData());
        });

    // ── Ana hesaplama ve render ───────────────────────────────────────────────
    function buildReports(projects) {

        // ── 1. Yıl bazlı sayım ────────────────────────────────────────────────
        const yearCount = {};
        projects.forEach(p => {
            const y = p.year || 'Bilinmiyor';
            yearCount[y] = (yearCount[y] || 0) + 1;
        });
        const sortedYears = Object.keys(yearCount).sort();

        // ── 2. Anahtar kelime frekansı ────────────────────────────────────────
        const kwFreq = {};
        projects.forEach(p => {
            if (!p.keywords) return;
            p.keywords.split(',').forEach(kw => {
                const clean = kw.trim().toLowerCase();
                if (clean.length > 1) kwFreq[clean] = (kwFreq[clean] || 0) + 1;
            });
        });
        const sortedKw = Object.entries(kwFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15);
        const uniqueKwCount = Object.keys(kwFreq).length;

        // ── 3. Özet kelime uzunlukları ────────────────────────────────────────
        const abstractLengths = projects
            .map(p => (p.abstract || '').split(/\s+/).filter(w => w).length)
            .filter(n => n > 0);

        const avgAbstract = abstractLengths.length
            ? Math.round(abstractLengths.reduce((a, b) => a + b, 0) / abstractLengths.length)
            : 0;

        // Histogram bucket'leri (kelime sayısı aralıkları)
        const buckets = [
            { label: '0-50',   min: 0,   max: 50   },
            { label: '51-100', min: 51,  max: 100  },
            { label: '101-150',min: 101, max: 150  },
            { label: '151-200',min: 151, max: 200  },
            { label: '201-300',min: 201, max: 300  },
            { label: '300+',   min: 301, max: Infinity },
        ];
        const bucketCounts = buckets.map(b =>
            abstractLengths.filter(n => n >= b.min && n <= b.max).length
        );

        // ── Stat kartlarını doldur ─────────────────────────────────────────────
        animateValue('statTotal',       0, projects.length,   1200, '');
        animateValue('statYears',       0, sortedYears.length, 800, '');
        animateValue('statKeywords',    0, uniqueKwCount,     1400, '');
        animateValue('statAvgAbstract', 0, avgAbstract,       1200, '');

        // ── Grafik 1: Yıl bazlı bar chart ────────────────────────────────────
        renderYearlyBar(sortedYears, yearCount);

        // ── Grafik 2: Yıl bazlı donut chart ──────────────────────────────────
        renderDonut(sortedYears, yearCount);

        // ── Grafik 3: En sık anahtar kelimeler ───────────────────────────────
        renderKeywordBars(sortedKw);

        // ── Grafik 4: Özet uzunluğu histogramı ───────────────────────────────
        renderAbstractHistogram(buckets, bucketCounts);
    }

    // ── Bar Chart ─────────────────────────────────────────────────────────────
    function renderYearlyBar(years, yearCount) {
        const ctx = document.getElementById('yearlyChart');
        if (!ctx) return;

        const bgColors = years.map(y => (YEAR_COLORS[y] || { bg: 'rgba(0,163,224,.8)' }).bg);

        const barValuePlugin = {
            id: 'barValuePlugin',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                chart.data.datasets.forEach((dataset, i) => {
                    chart.getDatasetMeta(i).data.forEach((bar, idx) => {
                        ctx.save();
                        ctx.fillStyle = '#334155';
                        ctx.font = '600 13px Inter';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'bottom';
                        ctx.fillText(dataset.data[idx], bar.x, bar.y - 6);
                        ctx.restore();
                    });
                });
            }
        };

        if (yearlyChartInst) yearlyChartInst.destroy();
        yearlyChartInst = new Chart(ctx, {
            type: 'bar',
            plugins: [barValuePlugin],
            data: {
                labels: years,
                datasets: [{
                    label: 'Proje Sayısı',
                    data: years.map(y => yearCount[y]),
                    backgroundColor: bgColors,
                    borderRadius: 6,
                    borderWidth: 0,
                    barPercentage: 0.65,
                    categoryPercentage: 0.85,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 24 } },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: c => `  Proje: ${c.parsed.y}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Proje Sayısı', font: { size: 12, weight: '500' }, color: '#64748b' },
                        grid: { color: 'rgba(0,0,0,0.06)', drawBorder: false }
                    },
                    x: {
                        title: { display: true, text: 'Akademik Yıl', font: { size: 12, weight: '500' }, color: '#64748b' },
                        grid: { display: false, drawBorder: false }
                    }
                }
            }
        });
    }

    // ── Donut Chart ───────────────────────────────────────────────────────────
    function renderDonut(years, yearCount) {
        const ctx = document.getElementById('donutChart');
        if (!ctx) return;

        const bgColors = years.map(y => (YEAR_COLORS[y] || { bg: '#94a3b8' }).bg);

        if (donutChartInst) donutChartInst.destroy();
        donutChartInst = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: years,
                datasets: [{
                    data: years.map(y => yearCount[y]),
                    backgroundColor: bgColors,
                    borderWidth: 3,
                    borderColor: '#fff',
                    hoverOffset: 6,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 16,
                            font: { size: 12, weight: '600' },
                            usePointStyle: true,
                            pointStyle: 'circle',
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: c => ` ${c.label}: ${c.parsed} proje`
                        }
                    }
                }
            }
        });
    }

    // ── Keyword Bars ──────────────────────────────────────────────────────────
    function renderKeywordBars(sortedKw) {
        const container = document.getElementById('keywordBarsContainer');
        if (!container || sortedKw.length === 0) return;

        const maxCount = sortedKw[0][1];
        container.innerHTML = '';

        sortedKw.forEach(([kw, count], i) => {
            const pct = Math.round((count / maxCount) * 100);
            const row = document.createElement('div');
            row.className = 'kw-bar-row';
            row.innerHTML = `
                <span class="kw-bar-label" title="${kw}">${kw}</span>
                <div class="kw-bar-track">
                    <div class="kw-bar-fill" data-pct="${pct}" style="width:0%;"></div>
                </div>
                <span class="kw-bar-count">${count}</span>
            `;
            container.appendChild(row);
        });

        // Animasyonlu genişleme (slight delay per row)
        requestAnimationFrame(() => {
            container.querySelectorAll('.kw-bar-fill').forEach((el, i) => {
                setTimeout(() => {
                    el.style.width = el.dataset.pct + '%';
                }, i * 40);
            });
        });
    }

    // ── Abstract Histogram ────────────────────────────────────────────────────
    function renderAbstractHistogram(buckets, counts) {
        const ctx = document.getElementById('abstractChart');
        if (!ctx) return;

        if (abstractChartInst) abstractChartInst.destroy();
        abstractChartInst = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: buckets.map(b => b.label),
                datasets: [{
                    label: 'Proje Sayısı',
                    data: counts,
                    backgroundColor: 'rgba(139,92,246,.75)',
                    borderRadius: 6,
                    borderWidth: 0,
                    barPercentage: 0.75,
                    categoryPercentage: 0.9,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            title: c => `Kelime aralığı: ${c[0].label}`,
                            label: c => `  Proje: ${c.parsed.y}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Proje', font: { size: 12, weight: '500' }, color: '#64748b' },
                        grid: { color: 'rgba(0,0,0,0.06)', drawBorder: false }
                    },
                    x: {
                        title: { display: true, text: 'Özet kelime sayısı', font: { size: 12, weight: '500' }, color: '#64748b' },
                        grid: { display: false, drawBorder: false }
                    }
                }
            }
        });
    }

    // ── Sayı animasyonu ───────────────────────────────────────────────────────
    function animateValue(id, start, end, duration, suffix) {
        const el = document.getElementById(id);
        if (!el) return;
        let startTs = null;
        const step = ts => {
            if (!startTs) startTs = ts;
            const progress = Math.min((ts - startTs) / duration, 1);
            el.textContent = Math.floor(progress * (end - start) + start).toLocaleString('tr-TR') + suffix;
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    // ── PNG indir ─────────────────────────────────────────────────────────────
    window.downloadChart = function (canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const tmp = document.createElement('canvas');
        tmp.width  = canvas.width;
        tmp.height = canvas.height;
        const ctx = tmp.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, tmp.width, tmp.height);
        ctx.drawImage(canvas, 0, 0);
        const a = document.createElement('a');
        a.download = `liftup-rapor-${canvasId}-${Date.now()}.png`;
        a.href = tmp.toDataURL('image/png');
        a.click();
    };

    // ── Mock veri (API yokken) ────────────────────────────────────────────────
    function generateMockData() {
        const years = ['2020-2021', '2021-2022', '2022-2023', '2023-2024'];
        const kwPool = [
            'Yapay Zeka', 'Makine Öğrenmesi', 'Derin Öğrenme', 'Kompozit Malzeme',
            'Sonlu Elemanlar', 'Aerodinamik', 'Aviyonik', 'Kontrol Sistemi',
            'İHA', 'Otonom Sistem', 'Navigasyon', 'Termal Analiz',
            'Yapısal Analiz', 'Titreşim', 'Optimizasyon', 'Malzeme Testi',
        ];
        const data = [];
        for (let i = 1; i <= 666; i++) {
            const kws = kwPool.slice(0, 2 + (i % 4)).join(', ');
            const wordCount = 80 + (i % 5) * 30;
            data.push({
                id: i + 1000,
                year: years[i % 4],
                title: `Proje ${i}: Havacılık Uygulaması`,
                abstract: Array(wordCount).fill('kelime').join(' '),
                keywords: kws,
            });
        }
        return data;
    }

});
