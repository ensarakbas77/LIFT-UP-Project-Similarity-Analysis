/**
 * LIFT UP Admin — Data Management
 * Veritabanı sorgulama ve listeleme arayüzü kontrolcüsü
 */

document.addEventListener('DOMContentLoaded', () => {

    const tableBody = document.getElementById('projectsTableBody');
    const searchInput = document.getElementById('searchInput');
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    // Durum değişkenleri
    let allProjects = [];
    let filteredProjects = [];
    let currentPage = 1;
    const itemsPerPage = 10;

    // Verileri çek (Şablon olduğu için API'den mock veri bekleyeceğiz veya simüle edeceğiz)
    fetchProjects();

    function fetchProjects() {
        // Gerçek PostgreSQL /api/projects/ endpoint'ine giderek veritabanını tarıyoruz.
        fetch('/api/projects/')
            .then(response => {
                if(!response.ok) throw new Error('API Bağlantı Hatası');
                return response.json();
            })
            .then(data => {
                allProjects = data;
                applySearchAndPagination();
            })
            .catch(err => {
                console.log('Dummy veri ile devam ediliyor:', err);
                allProjects = generateMockData();
                applySearchAndPagination();
            });
    }

    // Arama Event Dinleyicisi
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (query.length > 0) {
            filteredProjects = allProjects.filter(p => 
                (p.title && p.title.toLowerCase().includes(query)) ||
                (p.abstract && p.abstract.toLowerCase().includes(query)) ||
                (p.keywords && p.keywords.toLowerCase().includes(query)) ||
                (p.year && p.year.includes(query))
            );
        } else {
            filteredProjects = [...allProjects];
        }
        currentPage = 1;
        renderTable();
    });

    // Sayfalama Eventleri
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    });

    nextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
        }
    });

    function applySearchAndPagination() {
        filteredProjects = [...allProjects];
        currentPage = 1;
        renderTable();
    }

    function renderTable() {
        tableBody.innerHTML = '';
        
        if (filteredProjects.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">Arama kriterlerine uygun proje bulunamadı.</td></tr>`;
            pageInfo.innerText = "Gösterilen: 0 proje";
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            return;
        }

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const currentData = filteredProjects.slice(startIndex, endIndex);

        currentData.forEach(p => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="fw-semibold text-secondary">#${p.id}</td>
                <td><span class="badge bg-light text-dark border">${p.year}</span></td>
                <td class="fw-bold" style="color: var(--tusas-navy)">${p.title}</td>
                <td class="text-center">
                    <button class="btn btn-sm text-nowrap btn-outline-info rounded-pill px-3 fw-semibold shadow-sm" onclick="showProjectDetails(${p.id})">
                        <i class="fas fa-eye me-1"></i> Detay
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Sayfa durumu
        const totalItems = filteredProjects.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        pageInfo.innerText = `Toplam ${totalItems} projeden ${startIndex + 1} - ${Math.min(endIndex, totalItems)} arası gösteriliyor`;

        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;
    }

    // Geliştirme aşaması için uydurma veri üretici
    function generateMockData() {
        const data = [];
        for (let i = 1; i <= 666; i++) {
            data.push({
                id: i + 1000,
                year: (2020 + (i % 4)) + "-" + (2021 + (i % 4)),
                title: `Havacılık ve Uzay Sanayiinde ${i}. Nesil Yapısal Tasarım Yaklaşımları`,
                abstract: `Bu projede havacılık sektöründe kullanılan kompozit malzemelerin dayanıklılık analizleri yapılmış ve sonlu elemanlar yöntemi ile modellemeler gerçekleştirilmiştir. ${i}. aşamada saptanan sonuçlar otonom yapıları iyileştirmeyi hedefler. Geliştirilen model uçuş güvenliğini artırırken aynı zamanda aerodinamik sürtünmeleri de düşürmüştür. Projenin ana hedefi sürdürülebilir, hafif ve dayanıklı bir havacılık iskeleti oluşturmaktır. LIFT UP programı kapsamında yapılmış simüle edilmiş bir özet açıklamasıdır.`,
                keywords: "Kompozit, Sonlu Elemanlar, Dayanç Analizi, Otonom, Aerodinamik"
            });
        }
        return data;
    }

    // Modal açma fonksiyonu (Global namespace'e eklenir ki inline onclick bulabilsin)
    window.showProjectDetails = function (projectId) {
        // İlgili projeyi bul
        const project = allProjects.find(p => p.id === projectId);
        if(!project) return;
        
        // Modal içeriklerini doldur
        document.getElementById('modalId').innerText = project.id;
        document.getElementById('modalYear').innerText = project.year;
        document.getElementById('modalTitle').innerText = project.title || 'Başlık Yok';
        document.getElementById('modalAbstract').innerText = project.abstract || 'Projeye ait bir özet bulunamadı.';
        
        // Etiketleri yerleştir
        const keys = (project.keywords || '').split(',').map(k => k.trim()).filter(k => k);
        const keyHtml = keys.map(k => `<span class="badge bg-primary px-3 py-2 fs-6 mb-1 me-1 shadow-sm">${k}</span>`).join('');
        document.getElementById('modalKeywords').innerHTML = keyHtml || '<span class="text-muted">Bulunamadı</span>';

        // Bootstrap JS nesnesi ile modalı aç
        const modalElement = document.getElementById('projectDetailModal');
        const modalInstance = new bootstrap.Modal(modalElement);
        modalInstance.show();
    };

});
