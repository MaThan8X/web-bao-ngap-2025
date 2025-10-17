<?php
// send-data.php (Ver 01 - Dự án Web Báo Ngập 2025)
// Nhiệm vụ:
// - Nhận dữ liệu từ module SIM (id, lat, lon, mucnuoc, vol).
// - Đọc file locations.json.
// - Cập nhật trạng thái của trạm tương ứng hoặc thêm mới nếu chưa có.
// - Ghi lại toàn bộ dữ liệu vào locations.json.

header('Content-Type: application/json; charset=utf-8');
date_default_timezone_set('Asia/Ho_Chi_Minh');

// --- 1. Định nghĩa đường dẫn file và lấy tham số ---
$dataFile = __DIR__ . '/locations.json';

// Lấy các tham số từ URL, có kiểm tra sự tồn tại
$id = $_GET['id'] ?? null;
$lat = $_GET['lat'] ?? null;
$lon = $_GET['lon'] ?? null;
$mucnuoc = $_GET['mucnuoc'] ?? 0;
$vol = $_GET['vol'] ?? 0;

// Yêu cầu bắt buộc phải có ID
if (!$id) {
    http_response_code(400); // Bad Request
    echo json_encode(['status' => 'error', 'message' => 'Missing required parameter: id']);
    exit;
}

// --- 2. Đọc và giải mã dữ liệu hiện có ---
$locations = [];
if (file_exists($dataFile)) {
    $jsonContent = file_get_contents($dataFile);
    $locations = json_decode($jsonContent, true);
    // Xử lý trường hợp file JSON bị lỗi hoặc trống
    if (!is_array($locations)) {
        $locations = [];
    }
}

// --- 3. Tìm và cập nhật trạng thái trạm ---
$stationExists = false;
foreach ($locations as &$station) {
    // Nếu tìm thấy trạm với ID tương ứng
    if ($station['id'] === $id) {
        $station['mucnuoc'] = (int)$mucnuoc;
        $station['vol'] = (float)$vol;
        $station['last_update'] = date('Y-m-d H:i:s');
        // Chỉ cập nhật lat/lon nếu chúng được gửi lên
        if ($lat !== null) $station['lat'] = (float)$lat;
        if ($lon !== null) $station['lon'] = (float)$lon;
        
        $stationExists = true;
        break;
    }
}
// Giải phóng tham chiếu
unset($station);

// --- 4. Thêm trạm mới nếu chưa tồn tại ---
if (!$stationExists) {
    // Yêu cầu phải có lat, lon khi tạo trạm mới
    if ($lat === null || $lon === null) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Missing lat/lon for new station']);
        exit;
    }
    $locations[] = [
        'id' => $id,
        'lat' => (float)$lat,
        'lon' => (float)$lon,
        'mucnuoc' => (int)$mucnuoc,
        'vol' => (float)$vol,
        'last_update' => date('Y-m-d H:i:s')
    ];
}

// --- 5. Ghi dữ liệu đã cập nhật vào file ---
// Ghi lại file JSON với định dạng đẹp mắt (dễ debug)
if (file_put_contents($dataFile, json_encode($locations, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
    echo json_encode(['status' => 'success', 'message' => 'Data updated for id: ' . $id]);
} else {
    http_response_code(500); // Internal Server Error
    echo json_encode(['status' => 'error', 'message' => 'Failed to write to data file']);
}

?>
