// map-handler.js (Ver 08 - Final Fix Lỗi DOM Cứng)
// - Sửa lỗi: Đảm bảo biến DOM được tìm thấy bên trong window.onload.
// - KHÔI PHỤC tất cả logic khởi tạo về trạng thái ổn định đã hoạt động.

(function() {
    const API_BASE_URL = window.location.origin; 
    const DEFAULT_CENTER = [20.2647, 105.9754]; // TP Ninh Bình
    const DEFAULT_ZOOM = 12;

    let map;
    let markersLayer = L.layerGroup(); 
    let allStations = []; 
    let editingStationId = null; 
    
    // Khai báo biến DOM ở ngoài để các hàm có thể truy cập
    let configModal, configForm, btnCancel, btnAddStation; 

    // --- UTILITY FUNCTIONS ---
    // (Giữ nguyên các hàm: getStatus, getTrend, createPopupContent, openConfigModal, closeConfigModal)

    // Hàm openConfigModal (dùng các biến DOM được gán sau)
    function openConfigModal(station = null) {
        // ... (Logic Modal)
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

    // ... (Giữ nguyên renderMarkers, renderSidebar, loadStations, configForm.addEventListener)


    // --- KHỐI KHỞI TẠO CHÍNH ---
    window.onload = function init() {
        
        // [SỬA ĐỔI QUAN TRỌNG: TÌM KIẾM VÀ GÁN DOM CHẮC CHẮN]
        configModal = document.getElementById('config-modal');
        configForm = document.getElementById('config-form');
        btnCancel = document.getElementById('btn-cancel');
        btnAddStation = document.getElementById('add-station-btn');
        
        // 1. Kiểm tra sự tồn tại của map div
        if (!document.getElementById('map')) {
            console.error("LỖI KHỞI TẠO: Không tìm thấy div id='map'.");
            return;
        }

        // 2. KHỞI TẠO MAP (MapID: map - luôn phải tồn tại)
        map = L.map('map').setView(DEFAULT_CENTER, DEFAULT_ZOOM);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // 3. GÁN SỰ KIỆN (CHỈ KHI CÁC PHẦN TỬ MODAL ĐÃ ĐƯỢC TÌM THẤY)
        if (btnAddStation) { // Kiểm tra nếu nút AddStation tồn tại
            btnCancel.addEventListener('click', closeConfigModal);
            
            btnAddStation.addEventListener('click', () => {
                openConfigModal(null);
                document.getElementById('config-id').readOnly = false;
            });

            configForm.addEventListener('submit', async (e) => {
                // ... (Logic Lưu cấu hình)
            });
        }
        

        // 4. TẢI DỮ LIỆU LẦN ĐẦU
        loadStations();
        setInterval(loadStations, 30000); 
    };
    
    // ... (Phần còn lại của file giữ nguyên)
})();
