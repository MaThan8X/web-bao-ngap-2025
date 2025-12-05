<?php
// send-data.php (Ver 05 - Fix Warning Float to Int Precision)
// Nhận chuỗi: ?id=F01790;date=15/05/2025;time=16:25;mucnuoc=10;vol=125;

header('Content-Type: application/json; charset=utf-8');
// Thêm header để ngăn trình duyệt cache phản hồi này
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

date_default_timezone_set('Asia/Ho_Chi_Minh');

$dataFile = __DIR__ . '/locations.json';

// --- HÀM MÔ PHỎNG NHIỆT ĐỘ (Đã Fix Lỗi) ---
function getRealTimeTemperature($lat, $lon) {
    $baseTemp = 28; 
    // [FIX]: Ép kiểu (int) để tránh lỗi "Implicit conversion from float..."
    $noise = (int)(($lat + $lon) * 100) % 5; 
    $temp = $baseTemp + ($noise * 0.5) - 1.5;
    return round($temp, 1);
}

// --- 1. PHÂN TÍCH DỮ LIỆU ---
$queryString = $_SERVER['QUERY_STRING'] ?? '';
$data = [];

if (strpos($queryString, ';') !== false) {
    $pairs = explode(';', $queryString);
    foreach ($pairs as $pair) {
        $pair = trim($pair);
        if (strpos($pair, '=') !== false) {
            list($key, $value) = explode('=', $pair, 2);
            $data[trim($key)] = trim($value);
        }
    }
} else {
    $data = $_GET;
}

$id = isset($data['id']) ? trim($data['id']) : '';
$mucnuoc = isset($data['mucnuoc']) ? filter_var($data['mucnuoc'], FILTER_VALIDATE_INT) : null;
$vol = isset($data['vol']) ? filter_var($data['vol'], FILTER_VALIDATE_FLOAT) : null;
$received_date = $data['date'] ?? null;
$received_time = $data['time'] ?? null;

// --- 2. KIỂM TRA ---
if (!$id) {
    http_response_code(400); 
    echo json_encode(['status' => 'error', 'message' => 'Missing ID']);
    exit;
}

// --- 3. ĐỌC FILE ---
$locations = [];
if (file_exists($dataFile)) {
    $jsonContent = @file_get_contents($dataFile);
    $locations = json_decode($jsonContent, true);
    if (!is_array($locations)) $locations = [];
}

// --- 4. CẬP NHẬT ---
$found = false;
foreach ($locations as &$station) {
    if (isset($station['id']) && $station['id'] === $id) {
        
        if ($mucnuoc !== null) $station['mucnuoc'] = $mucnuoc;
        if ($vol !== null) $station['vol'] = $vol;
        
        // Cập nhật Nhiệt độ
        $lat = $station['lat'] ?? 0;
        $lon = $station['lon'] ?? 0;
        $station['temp'] = getRealTimeTemperature($lat, $lon);
        
        // Thời gian
        if ($received_date && $received_time) {
            $dParts = explode('/', $received_date);
            if (count($dParts) === 3) {
                $station['last_update'] = "{$dParts[2]}-{$dParts[1]}-{$dParts[0]} {$received_time}:00";
            } else {
                $station['last_update'] = date('Y-m-d H:i:s');
            }
        } else {
            $station['last_update'] = date('Y-m-d H:i:s');
        }
        
        $found = true;
        break;
    }
}
unset($station);

if (!$found) {
    http_response_code(404);
    echo json_encode(['status' => 'error', 'message' => 'Station ID not found: ' . $id]);
    exit;
}

// --- 5. GHI FILE ---
$json_flags = JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE;
if (defined('JSON_NUMERIC_CHECK')) $json_flags |= JSON_NUMERIC_CHECK;

if (@file_put_contents($dataFile, json_encode($locations, $json_flags))) {
    echo json_encode(['status' => 'success', 'message' => 'Updated ID: ' . $id]);
} else {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Write failed']);
}
