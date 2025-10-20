// map-handler.js (Ver 04 - Fix Khởi tạo Toàn bộ)
// - Sửa lỗi: Đặt toàn bộ code truy cập DOM và khởi tạo bên trong window.onload 
//   để đảm bảo Map và Modal luôn hoạt động.
// - Đây là cách mạnh nhất để xử lý lỗi "phần tử HTML chưa tồn tại".

(function() {
    // Biến toàn cục (để các hàm khác truy cập)
    const API_BASE_URL = window.location.origin; 
    const DEFAULT_CENTER = [20.2647, 105.9754]; // TP Ninh Bình
    const DEFAULT_ZOOM = 12;

    let map;
    let markersLayer = L.layerGroup(); 
    let allStations = []; 
    let editingStationId = null; 

    // --- UTILITY FUNCTIONS ---
    // (Giữ nguyên các hàm: getStatus, getTrend, createPopupContent)

    // Hàm này sẽ được gán lại trong init()
    let configModal, configForm, btnCancel, btnAddStation; 

    function openConfigModal(station = null) {
        // [Cần đảm bảo configModal, v.v... không phải là null khi hàm này được gọi]
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
    
    // ... (Giữ nguyên renderMarkers, renderSidebar, loadStations)
    
    // Logic cho loadStations (giữ nguyên Ver 03)
    async function loadStations() {
        // ... (Logic đã sửa đường dẫn API và logic center/zoom)
        // [Cần đảm bảo file PHP đã được di chuyển]
    }

    // Logic cho configForm.addEventListener (giữ nguyên Ver 03)
    
    // --- KHỐI KHỞI TẠO CHÍNH (Chạy sau khi trang tải xong) ---
    window.onload = function init() {
        
        // 1. LẤY DOM ELEMENTS (đảm bảo chúng tồn tại)
        configModal = document.getElementById('config-modal');
        configForm = document.getElementById('config-form');
        btnCancel = document.getElementById('btn-cancel');
        btnAddStation = document.getElementById('add-station-btn');

        // 2. KHỞI TẠO MAP (đảm bảo thư viện Leaflet đã tải)
        map = L.map('map').setView(DEFAULT_CENTER, DEFAULT_ZOOM);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // 3. GÁN SỰ KIỆN
        btnCancel.addEventListener('click', closeConfigModal);
        
        btnAddStation.addEventListener('click', () => {
            openConfigModal(null);
            document.getElementById('config-id').readOnly = false;
        });

        configForm.addEventListener('submit', async (e) => {
            // ... (Logic Lưu cấu hình)
        });

        // 4. TẢI DỮ LIỆU LẦN ĐẦU
        loadStations();
        setInterval(loadStations, 30000); 
    };

})();
