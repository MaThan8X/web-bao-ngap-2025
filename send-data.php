<?php
// send-data.php (Ver 06 - Fix Deprecated Warning & Force No-Cache)
// Cập nhật: T00001, Mn=70, Vol=12.5...

// 1. HEADER CHỐNG CACHE (Cực mạnh)
header('Content-Type: application/json; charset=utf-8');
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
header("Expires: Sat, 26 Jul 1997 05:00:00 GMT"); // Date in the past

date_default_timezone_set('Asia/Ho_Chi_Minh');
$dataFile = __DIR__ . '/locations.json';

// 2. HÀM MÔ PHỎNG NHIỆT ĐỘ (Dùng fmod để tránh lỗi float-to-int)
function getRealTimeTemperature($lat, $lon) {
    $baseTemp = 28; 
    // Dùng fmod cho phép chia dư số thực mà không báo lỗi
    $noise = fmod(($lat + $lon) * 100, 5); 
    $temp = $baseTemp + ($noise * 0.5) - 1.5;
    return round($temp, 1);
}

// 3. PHÂN TÍCH DỮ LIỆU
$queryString = $_SERVER['QUERY_STRING'] ?? '';
$data = [];

// Ưu tiên xử lý chuỗi A7600 (phân tách bằng ;)
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
// Fix: Chấp nhận cả số thực cho mucnuoc nhưng ép về int
$mucnuoc = isset($data['mn']) ? (int)$data['mn'] : (isset($data['mucnuoc']) ? (int)$data['mucnuoc'] : null);
$vol = isset($data['vol']) ? (float)$data['vol'] : null;
$received_date = $data['date'] ?? null;
$received_time = $data['time'] ?? null;

// 4. KIỂM TRA
if (!$id) {
    http_response_code(400); 
    echo json_encode(['status' => 'error', 'message' => 'Missing ID']);
    exit;
}

// 5. ĐỌC FILE
$locations = [];
if (file_exists($dataFile)) {
    $jsonContent = @file_get_contents($dataFile);
    $locations = json_decode($jsonContent, true);
    if (!is_array($locations)) $locations = [];
}

// 6. CẬP NHẬT
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
                // Chuyen doi DD/MM/YYYY thanh YYYY-MM-DD
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
    // Nếu không tìm thấy ID, báo lỗi để biết đường config lại
    http_response_code(404);
    echo json_encode(['status' => 'error', 'message' => 'ID not found in locations.json: ' . $id]);
    exit;
}

// 7. GHI FILE
$json_flags = JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE;
if (defined('JSON_NUMERIC_CHECK')) $json_flags |= JSON_NUMERIC_CHECK;

if (@file_put_contents($dataFile, json_encode($locations, $json_flags))) {
    echo json_encode(['status' => 'success', 'message' => 'Updated ID: ' . $id, 'level' => $mucnuoc]);
} else {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Write failed']);
}
