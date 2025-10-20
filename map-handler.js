// map-handler.js (Ver 02 - Fix Lỗi Đường Dẫn API & Cập nhật tâm Bản đồ)
// - Sửa lỗi đường dẫn API: Bỏ thư mục /bao-ngap-2025/ khỏi URL.
// - Bổ sung thông tin: Tâm bản đồ mặc định TP Ninh Bình
// (Các logic khác được giữ nguyên từ Ver 01)

const API_BASE_URL = window.location.origin; 
const DEFAULT_CENTER = [20.2647, 105.9754]; // TP Ninh Bình
const DEFAULT_ZOOM = 12;

// ... (Giữ nguyên các biến và hàm Utility)

// Hàm chính để fetch dữ liệu, render sidebar và marker
async function loadStations() {
    try {
        // [SỬA ĐỔI QUAN TRỌNG TẠI ĐÂY] 
        // Bỏ thư mục "/bao-ngap-2025/" vì Subdomain đã trỏ thẳng vào thư mục này.
        // Chỉ cần gọi tên file PHP
        const res = await fetch(`${API_BASE_URL}/get-locations.php`);
        allStations = await res.json();
        
        // Sort theo ID để dễ quản lý
        allStations.sort((a, b) => a.id.localeCompare(b.id));

        renderSidebar();
        renderMarkers();
        
        // Thiết lập tâm bản đồ lần đầu tiên
        let center = DEFAULT_CENTER;
        let zoom = DEFAULT_ZOOM;
        
        if (allStations.length > 0) {
            // Tâm Bản đồ sẽ là nơi có tọa độ của Khu Vực 1 (phần tử đầu tiên đã được lưu config)
            const khuVuc1 = allStations.find(s => s.lat && s.lon); // Tìm trạm đầu tiên có tọa độ
            if (khuVuc1) {
                center = [khuVuc1.lat, khuVuc1.lon];
                zoom = 16; // Phóng to hơn khi tìm thấy trạm cụ thể
            }
        }
        
        map.setView(center, zoom); // Áp dụng tâm và zoom
        
    } catch (err) {
        console.error('Lỗi khi tải dữ liệu trạm:', err);
    }
}

// ... (Phần Khởi tạo, Form Handling và Rendering giữ nguyên)

document.addEventListener('DOMContentLoaded', () => {
    // 1. Khởi tạo Bản đồ (Google Maps/vntraffic.app thường dùng nền OpenStreetMap)
    map = L.map('map').setView(DEFAULT_CENTER, DEFAULT_ZOOM);

    // Thêm Tile Layer (OpenStreetMap)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Tải dữ liệu trạm lần đầu
    loadStations();
    
    // Tự động làm mới dữ liệu sau mỗi 30 giây
    setInterval(loadStations, 30000); 
});
