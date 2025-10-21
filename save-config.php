<?php
// save-config.php (Ver 02 - Fix Cú pháp/BOM & Lỗi Ghi file)
// - Bỏ thẻ đóng ?> ở cuối file.
// - Bổ sung thông tin lỗi khi file_put_contents thất bại.

header('Content-Type: application/json; charset=utf-8');
date_default_timezone_set('Asia/Ho_Chi_Minh');

// --- 1. Định nghĩa đường dẫn file và lấy tham số (sử dụng POST hoặc GET) ---
$dataFile = __DIR__ . '/locations.json';

// Chúng ta sẽ ưu tiên sử dụng $_GET cho việc test và đơn giản hóa
$id      = trim($_GET['id'] ?? '');
$name    = trim($_GET['name'] ?? '');
$lat     = filter_var($_GET['lat'] ?? '', FILTER_VALIDATE_FLOAT);
$lon     = filter_var($_GET['lon'] ?? '', FILTER_VALIDATE_FLOAT);

// Yêu cầu bắt buộc phải có ID và Tên
if (!$id || !$name) {
    http_response_code(400); // Bad Request
    echo json_encode(['status' => 'error', 'message' => 'Missing required parameters: id or name']);
    exit;
}

// Yêu cầu bắt buộc phải có tọa độ khi lưu cấu hình
if ($lat === false || $lon === false) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid or missing lat/lon']);
    exit;
}

// --- 2. Đọc và giải mã dữ liệu hiện có ---
$locations = [];
if (file_exists($dataFile)) {
    $jsonContent = file_get_contents($dataFile);
    $locations = json_decode($jsonContent, true);
    if (!is_array($locations)) {
        $locations = [];
    }
}

// --- 3. Tìm và cập nhật cấu hình trạm ---
$stationIndex = -1;
foreach ($locations as $index => &$station) {
    if (($station['id'] ?? '') === $id) {
        $stationIndex = $index;
        // Cập nhật cấu hình
        $station['name'] = $name;
        $station['lat']  = $lat;
        $station['lon']  = $lon;
        break;
    }
}
unset($station); 

// --- 4. Thêm trạm mới nếu chưa tồn tại (chỉ thêm thông tin cấu hình) ---
if ($stationIndex === -1) {
    $locations[] = [
        'id'          => $id,
        'name'        => $name,
        'lat'         => $lat,
        'lon'         => $lon,
        // Khởi tạo các giá trị đo lường ban đầu
        'mucnuoc'     => 0,
        'vol'         => 0.0,
        'last_update' => null
    ];
}

// --- 5. Ghi dữ liệu đã cập nhật vào file ---
// Ghi lại file JSON với các cờ (flags) để đảm bảo tính an toàn
$json_flags = JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE;
// Sử dụng JSON_NUMERIC_CHECK chỉ khi nó được hỗ trợ
if (defined('JSON_NUMERIC_CHECK')) {
    $json_flags |= JSON_NUMERIC_CHECK;
}

if (file_put_contents($dataFile, json_encode($locations, $json_flags))) {
    echo json_encode(['status' => 'success', 'message' => 'Config saved for id: ' . $id]);
} else {
    http_response_code(500); // Internal Server Error
    $error = error_get_last()['message'] ?? 'Unknown write error. Check file permissions (chmod 777).';
    echo json_encode(['status' => 'error', 'message' => 'Failed to write to data file: ' . $error]);
}
// Bỏ thẻ đóng ?> để tránh lỗi BOM/khoảng trắng thừa
