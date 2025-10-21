// map-handler.js (Ver 06 - Fix Lỗi DOM 'addEventListener')
// - Sửa lỗi: Di chuyển việc tìm kiếm các phần tử DOM (configModal, btnAddStation,...) 
//   vào bên trong khối init (window.onload) để đảm bảo chúng đã tồn tại.

(function() {
    // ... (Giữ nguyên các biến toàn cục: API_BASE_URL, DEFAULT_CENTER, map, markersLayer, etc.)

    // --- UTILITY FUNCTIONS ---
    // (Giữ nguyên getStatus, getTrend, createPopupContent)

    // Khai báo biến DOM ở cấp toàn cục (nhưng không gán giá trị ở đây)
    let configModal, configForm, btnCancel, btnAddStation; 

    // Hàm openConfigModal, closeConfigModal (sẽ dùng các biến DOM ở cấp toàn cục)
    function openConfigModal(station = null) {
        // ... (Logic Modal, giữ nguyên)
    }

    function closeConfigModal() {
        // ... (Logic Modal, giữ nguyên)
    }
    
    // ... (Giữ nguyên renderMarkers, renderSidebar, loadStations)

    // Logic cho configForm.addEventListener (giữ nguyên Ver 05)

    // --- KHỐI KHỞI TẠO CHÍNH (Chạy sau khi trang tải xong) ---
    window.onload = function init() {
        
        // [SỬA ĐỔI QUAN TRỌNG TẠI ĐÂY: TÌM DOM SAU KHI TRANG LOAD]
        configModal = document.getElementById('config-modal');
        configForm = document.getElementById('config-form');
        btnCancel = document.getElementById('btn-cancel');
        btnAddStation = document.getElementById('add-station-btn');

        // 1. Kiểm tra sự tồn tại (để tránh lỗi nếu có thay đổi HTML)
        if (!configModal || !configForm || !btnCancel || !btnAddStation) {
            console.error("LỖI: Không tìm thấy tất cả các phần tử DOM cần thiết (Modal/Button/Form).");
            // Tạm thời chỉ khởi tạo Map và thoát
        }

        // 2. KHỞI TẠO MAP 
        map = L.map('map').setView(DEFAULT_CENTER, DEFAULT_ZOOM);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // 3. GÁN SỰ KIỆN (CHỈ KHI CÁC PHẦN TỬ ĐÃ ĐƯỢC TÌM THẤY)
        if (btnAddStation) {
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

})();
