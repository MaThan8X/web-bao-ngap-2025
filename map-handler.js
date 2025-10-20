// map-handler.js (Ver 03 - Fix Khởi tạo Map và Lỗi Modal)
// - Sửa lỗi: Loại bỏ DOMContentLoaded và dùng IIFE (để đảm bảo script chạy).
// - Sửa lỗi: Đơn giản hóa đường dẫn API.
// - Sửa lỗi: Đảm bảo Modal được gán sự kiện chính xác.

(function() {
    const API_BASE_URL = window.location.origin; 
    const DEFAULT_CENTER = [20.2647, 105.9754]; // TP Ninh Bình
    const DEFAULT_ZOOM = 12;

    let map;
    let markersLayer = L.layerGroup(); 
    let allStations = []; 
    let editingStationId = null; 

    // DOM ELEMENTS
    const configModal = document.getElementById('config-modal');
    const configForm = document.getElementById('config-form');
    const btnCancel = document.getElementById('btn-cancel');
    const btnAddStation = document.getElementById('add-station-btn');
    // --- UTILITY FUNCTIONS ---
    
    // ... (Giữ nguyên getStatus, getTrend, createPopupContent)

    function openConfigModal(station = null) {
        // Log để debug: Kiểm tra xem hàm có được gọi không
        console.log('Opening Modal for:', station); 

        editingStationId = station ? station.id : null;
        document.getElementById('config-name').value = station?.name || '';
        document.getElementById('config-id').value = station?.id || '';
        document.getElementById('config-lat-lon').value = station ? `${station.lat}, ${station.lon}` : '';
        
        document.getElementById('config-id').readOnly = !!station;
        document.getElementById('config-id').placeholder = station ? '' : 'ID Duy nhất (VD: F01234)';
        
        configModal.querySelector('h2').textContent = station ? `Sửa Cấu Hình: ${station.name}` : 'Thêm Khu Vực Mới';
        
        configModal.style.display = 'flex';
    }

    function closeConfigModal() {
        configModal.style.display = 'none';
        configForm.reset();
        editingStationId = null;
    }

    // --- RENDERING & MAP LOGIC ---
    
    // ... (Giữ nguyên renderMarkers, renderSidebar)

    async function loadStations() {
        try {
            // [Đường dẫn đã được sửa trong Ver 02, giữ nguyên logic gọi API đơn giản]
            const res = await fetch(`${API_BASE_URL}/get-locations.php`);
            allStations = await res.json();
            
            allStations.sort((a, b) => a.id.localeCompare(b.id));

            renderSidebar();
            renderMarkers();
            
            // ... (Giữ nguyên logic thiết lập center/zoom)
            
            let center = DEFAULT_CENTER;
            let zoom = DEFAULT_ZOOM;
            
            if (allStations.length > 0) {
                const khuVuc1 = allStations.find(s => s.lat && s.lon); 
                if (khuVuc1) {
                    center = [khuVuc1.lat, khuVuc1.lon];
                    zoom = 16; 
                }
            }
            map.setView(center, zoom); 
            
        } catch (err) {
            console.error('Lỗi khi tải dữ liệu trạm:', err);
        }
    }

    // --- FORM HANDLING ---

    configForm.addEventListener('submit', async (e) => {
        // ... (Giữ nguyên logic Lưu cấu hình)
    });

    // --- INITIALIZATION (CHẠY NGAY) ---

    // 1. Khởi tạo Bản đồ: Phải nằm trong khối code này
    map = L.map('map').setView(DEFAULT_CENTER, DEFAULT_ZOOM);

    // Thêm Tile Layer (OpenStreetMap)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // 2. Gán sự kiện cho Modal
    btnCancel.addEventListener('click', closeConfigModal);

    // Gán sự kiện cho nút "Thêm Khu Vực Mới"
    btnAddStation.addEventListener('click', () => {
        openConfigModal(null);
        document.getElementById('config-id').readOnly = false;
    });

    // 3. Tải dữ liệu trạm lần đầu và thiết lập Interval
    loadStations();
    setInterval(loadStations, 30000); 

})();
