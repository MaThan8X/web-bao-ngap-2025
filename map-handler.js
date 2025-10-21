// map-handler.js (Ver 07 - Fix Lỗi DOM An toàn)
// - Sửa lỗi: Sử dụng kiểm tra tồn tại (if/else) ngay tại điểm gán sự kiện 
//   để ngăn chặn TypeError nếu bất kỳ ID nào bị thiếu (ví dụ: #config-modal).
// - Logic khởi tạo vẫn được bao bọc trong window.onload.

(function() {
    // ... (Giữ nguyên các biến toàn cục và Utility Functions)

    // Hàm loadStations, renderMarkers, renderSidebar, v.v... (giữ nguyên)
    
    // --- KHỐI KHỞI TẠO CHÍNH ---
    window.onload = function init() {
        
        // 1. KHỞI TẠO MAP
        // Map ID: map - Luôn phải tồn tại
        if (!document.getElementById('map')) {
            console.error("LỖI KHỞI TẠO: Không tìm thấy div id='map'.");
            return;
        }

        map = L.map('map').setView(DEFAULT_CENTER, DEFAULT_ZOOM);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // 2. GÁN SỰ KIỆN VÀ TÌM KIẾM DOM (An toàn tuyệt đối)
        // Dùng biến cục bộ để tìm kiếm DOM
        const configModalEl = document.getElementById('config-modal');
        const btnCancelEl = document.getElementById('btn-cancel');
        const btnAddStationEl = document.getElementById('add-station-btn');
        const configFormEl = document.getElementById('config-form');

        if (configModalEl && btnCancelEl && btnAddStationEl && configFormEl) {
            
            // Chỉ gán giá trị cho biến toàn cục khi tìm thấy
            configModal = configModalEl;
            configForm = configFormEl;
            btnCancel = btnCancelEl;
            btnAddStation = btnAddStationEl; 
            
            // Gán sự kiện (Chắc chắn các phần tử này tồn tại)
            btnCancel.addEventListener('click', closeConfigModal);
            
            btnAddStation.addEventListener('click', () => {
                openConfigModal(null);
                document.getElementById('config-id').readOnly = false;
            });

            configForm.addEventListener('submit', async (e) => {
                // ... (Logic Lưu cấu hình)
            });

        } else {
             console.error("LỖI: Một số phần tử DOM cần thiết (Modal, Form, Button) bị thiếu.");
        }
        

        // 3. TẢI DỮ LIỆU LẦN ĐẦU
        loadStations();
        setInterval(loadStations, 30000); 
    };
    
    // ... (Phần còn lại của file giữ nguyên)
})();
