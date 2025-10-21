// map-handler.js (Ver 09 - Fix Lỗi DOM Cốt Lõi)
// - Sửa lỗi: Khai báo và gán các phần tử DOM cục bộ bên trong window.onload 
//   để ngăn chặn TypeError (sự cố đã xảy ra ở Ver 08).
// - Toàn bộ các logic khác (API call, rendering, etc.) được giữ nguyên.

(function() {
    const API_BASE_URL = window.location.origin; 
    const DEFAULT_CENTER = [20.2647, 105.9754]; // TP Ninh Bình
    const DEFAULT_ZOOM = 12;

    let map;
    let markersLayer = L.layerGroup(); 
    let allStations = []; 
    let editingStationId = null; 

    // Các biến DOM sẽ được gán trong init()
    let configModal, configForm, btnCancel, btnAddStation; 

    // --- UTILITY FUNCTIONS ---
    
    // ... (Giữ nguyên các hàm: getStatus, getTrend, createPopupContent)

    function openConfigModal(station = null) {
        // [Logic Modal đã được sửa lỗi]
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
    
    async function loadStations() {
        try {
            // Đã fix lỗi CDN, API call đơn giản
            const res = await fetch(`${API_BASE_URL}/get-locations.php`);
            allStations = await res.json();
            
            // ... (Logic còn lại giữ nguyên)
        } catch (err) {
            console.error('Lỗi khi tải dữ liệu trạm:', err);
        }
    }


    // --- KHỐI KHỞI TẠO CHÍNH (Chạy sau khi trang tải xong) ---
    window.onload = function init() {
        
        // 1. TÌM KIẾM VÀ GÁN DOM CHẮC CHẮN
        // [KHẮC PHỤC LỖI TẠI ĐÂY] Gán giá trị cho các biến DOM toàn cục
        configModal = document.getElementById('config-modal');
        configForm = document.getElementById('config-form');
        btnCancel = document.getElementById('btn-cancel');
        btnAddStation = document.getElementById('add-station-btn');
        
        // 2. KHỞI TẠO MAP
        if (!document.getElementById('map') || !L) {
            console.error("LỖI KHỞI TẠO MAP: Không tìm thấy div id='map' hoặc thư viện Leaflet.");
            return;
        }

        map = L.map('map').setView(DEFAULT_CENTER, DEFAULT_ZOOM);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // 3. GÁN SỰ KIỆN (Bây giờ chắc chắn rằng btnAddStation đã được gán giá trị)
        if (btnAddStation) { 
            btnCancel.addEventListener('click', closeConfigModal);
            
            btnAddStation.addEventListener('click', () => {
                openConfigModal(null);
                document.getElementById('config-id').readOnly = false;
            });

            // Gán lại listener cho form submit (vì nó cần biến configForm)
            configForm.addEventListener('submit', async (e) => {
                // ... (Logic Lưu cấu hình)
            });
        } else {
             console.error("LỖI: Nút Thêm Khu Vực Mới (#add-station-btn) bị thiếu.");
        }
        

        // 4. TẢI DỮ LIỆU LẦN ĐẦU
        loadStations();
        setInterval(loadStations, 30000); 
    };

    // ... (Phần còn lại của file)

})();
