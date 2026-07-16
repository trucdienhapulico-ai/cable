const SPREADSHEET_ID = '1TD2JsMVwRk0KXUCPbtRiKF4UePzfyiw5LX5FKzJwlHU';

function doGet() {
  try {
    initializeSheets();
  } catch (e) {
    // Ignore initialization errors
  }
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Ultimate Cable Sizing Tool')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

function getInitialData(forceReload) {
  const cache = CacheService.getScriptCache();
  if (!forceReload) {
    const cached = cache.get('initial_data');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        // Fallback
      }
    }
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  const readSheet = (name) => {
    const sheet = ss.getSheetByName(name);
    if (!sheet || sheet.getLastRow() < 2) return [];
    const values = sheet.getDataRange().getValues();
    const headers = values.shift().map(h => String(h).trim());
    return values
      .filter(row => row.some(v => v !== ''))
      .map(row => Object.fromEntries(headers.map((h, i) => [h, row[i]])));
  };

  const data = {
    settings: readSheet('Settings'),
    cables: readSheet('CableCatalog').filter(r => truthy_(r['Hoạt động'])),
    temperatureFactors: readSheet('TemperatureFactor'),
    groupingFactors: readSheet('GroupingFactor'),
    conduits: readSheet('ConduitCatalog').filter(r => truthy_(r['Hoạt động'])),
    breakers: readSheet('BreakerCatalog').filter(r => truthy_(r['Hoạt động'])),
    trays: readSheet('CableTrayCatalog').filter(r => truthy_(r['Hoạt động'])),
    projects: readSheet('Projects')
  };

  try {
    cache.put('initial_data', JSON.stringify(data), 900); // 15 mins cache
  } catch (e) {
    // Skip caching if payload too large
  }
  
  return data;
}

function getCableRecords() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('CableData');
  if (!sheet || sheet.getLastRow() < 2) return [];
  
  const values = sheet.getDataRange().getValues();
  const headers = values.shift().map(h => String(h).trim());
  const rows = values
    .filter(row => row.some(v => v !== ''))
    .map(row => Object.fromEntries(headers.map((h, i) => [h, row[i]])));
  
  // Group by id and select the latest version
  const latestRecords = {};
  rows.forEach(row => {
    const id = row['id'];
    const version = Number(row['version'] || 1);
    if (!latestRecords[id] || Number(latestRecords[id]['version'] || 0) < version) {
      latestRecords[id] = row;
    }
  });
  
  // Exclude canceled rows
  return Object.values(latestRecords).filter(r => r['status'] !== 'Hủy').reverse();
}

function saveCableRecord(data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('CableData');
    if (!sheet) {
      throw new Error('Sheet CableData không tồn tại.');
    }
    
    const now = new Date();
    const user = Session.getActiveUser().getEmail() || 'anonymous';
    const id = data.id || Utilities.getUuid();
    
    // Calculate version
    let version = 1;
    const values = sheet.getDataRange().getValues();
    if (values.length > 1) {
      const headers = values[0].map(h => String(h).trim());
      const idIdx = headers.indexOf('id');
      const verIdx = headers.indexOf('version');
      if (idIdx !== -1 && verIdx !== -1) {
        let maxVer = 0;
        for (let i = 1; i < values.length; i++) {
          if (values[i][idIdx] === id) {
            const v = Number(values[i][verIdx]);
            if (v > maxVer) maxVer = v;
          }
        }
        if (maxVer > 0) {
          version = maxVer + 1;
        }
      }
    }
    
    const row = [
      id,                                     // 1: id
      version,                                // 2: version
      now,                                    // 3: date
      user,                                   // 4: user
      safe_(data.project),                    // 5: project
      safe_(data.cableCode),                  // 6: cableCode
      safe_(data.loadName),                   // 7: loadName
      safe_(data.sourcePanel),                // 8: sourcePanel
      safe_(data.destinationPanel),           // 9: destinationPanel
      safe_(data.phase),                      // 10: phase
      num_(data.voltageV),                    // 11: voltageV
      num_(data.powerKw),                     // 12: powerKw
      num_(data.powerFactor),                 // 13: powerFactor
      num_(data.efficiency),                  // 14: efficiency
      num_(data.lengthM),                     // 15: lengthM
      safe_(data.material),                   // 16: material
      safe_(data.insulation),                 // 17: insulation
      num_(data.reserveFactor),               // 18: reserveFactor
      num_(data.ambientC),                    // 19: ambientC
      num_(data.groupedCircuits),             // 20: groupedCircuits
      num_(data.loadCurrentA),                // 21: loadCurrentA
      num_(data.designCurrentA),              // 22: designCurrentA
      num_(data.cableSizeMm2),                // 23: cableSizeMm2
      num_(data.parallelRuns),                // 24: parallelRuns
      safe_(data.cableConfiguration),         // 25: cableConfiguration
      num_(data.correctedAmpacityA),          // 26: correctedAmpacityA
      num_(data.voltageDropV),                // 27: voltageDropV
      num_(data.voltageDropPercent),          // 28: voltageDropPercent
      safe_(data.conduitSize),                // 29: conduitSize
      safe_(data.status || 'Dự kiến'),        // 30: status
      safe_(data.notes),                      // 31: notes
      num_(data.neutralSize),                 // 32: Tiết diện trung tính (mm²)
      num_(data.peSize),                      // 33: Tiết diện PE (mm²)
      num_(data.breakerIn),                   // 34: Dòng định mức MCCB (A)
      safe_(data.breakerBrand),               // 35: Hãng MCCB
      safe_(data.breakerPoles),               // 36: Số cực MCCB
      num_(data.breakerIcu),                  // 37: Icu MCCB (kA)
      safe_(data.breakerType),                // 38: Loại MCCB
      safe_(data.trayName),                   // 39: Tên máng cáp
      num_(data.fillRate)                     // 40: Tỉ lệ lấp đầy (%)
    ];
    
    sheet.appendRow(row);
    
    // Save log entry
    const action = version === 1 ? 'CREATE' : (data.status === 'Hủy' ? 'CANCEL' : 'UPDATE');
    const logSheet = ss.getSheetByName('ChangeLog');
    if (logSheet) {
      logSheet.appendRow([
        now, user, action, 'CableData', id, version,
        JSON.stringify({
          cableCode: data.cableCode,
          configuration: data.cableConfiguration,
          loadName: data.loadName,
          status: data.status
        })
      ]);
    }
    
    return { ok: true, id, version };
  } finally {
    lock.releaseLock();
  }
}

function cancelCableRecord(id) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('CableData');
    if (!sheet) throw new Error('Sheet CableData không tồn tại.');
    
    const values = sheet.getDataRange().getValues();
    if (values.length <= 1) throw new Error('Không tìm thấy dữ liệu.');
    
    const headers = values[0].map(h => String(h).trim());
    const idIdx = headers.indexOf('id');
    const verIdx = headers.indexOf('version');
    
    if (idIdx === -1 || verIdx !== -1) {
      // Find indexes
    }
    
    const actualIdIdx = headers.indexOf('id') !== -1 ? headers.indexOf('id') : 0;
    const actualVerIdx = headers.indexOf('version') !== -1 ? headers.indexOf('version') : 1;
    
    let lastRowValues = null;
    let maxVer = 0;
    
    for (let i = 1; i < values.length; i++) {
      if (values[i][actualIdIdx] === id) {
        const v = Number(values[i][actualVerIdx]);
        if (v > maxVer) {
          maxVer = v;
          lastRowValues = values[i];
        }
      }
    }
    
    if (!lastRowValues) throw new Error('Không tìm thấy tuyến cáp có ID: ' + id);
    
    const now = new Date();
    const user = Session.getActiveUser().getEmail() || 'anonymous';
    const version = maxVer + 1;
    
    const newRow = [...lastRowValues];
    newRow[1] = version;
    newRow[2] = now;
    newRow[3] = user;
    
    const statusIdx = headers.indexOf('status');
    if (statusIdx !== -1) {
      newRow[statusIdx] = 'Hủy';
    } else {
      newRow[29] = 'Hủy';
    }
    
    sheet.appendRow(newRow);
    
    const logSheet = ss.getSheetByName('ChangeLog');
    if (logSheet) {
      logSheet.appendRow([
        now, user, 'CANCEL', 'CableData', id, version,
        JSON.stringify({
          cableCode: lastRowValues[headers.indexOf('cableCode') !== -1 ? headers.indexOf('cableCode') : 5],
          loadName: lastRowValues[headers.indexOf('loadName') !== -1 ? headers.indexOf('loadName') : 6],
          status: 'Hủy'
        })
      ]);
    }
    
    return { ok: true, id, version };
  } finally {
    lock.releaseLock();
  }
}

function generatePdfReport(id) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('CableData');
  if (!sheet) throw new Error('Sheet CableData không tồn tại.');
  
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) throw new Error('Không tìm thấy dữ liệu.');
  
  const headers = values[0].map(h => String(h).trim());
  const idIdx = headers.indexOf('id');
  const verIdx = headers.indexOf('version');
  
  let record = null;
  let maxVer = 0;
  
  const actualIdIdx = idIdx !== -1 ? idIdx : 0;
  const actualVerIdx = verIdx !== -1 ? verIdx : 1;
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][actualIdIdx] === id) {
      const v = Number(values[i][actualVerIdx]);
      if (v > maxVer) {
        maxVer = v;
        record = Object.fromEntries(headers.map((h, idx) => [h, values[i][idx]]));
      }
    }
  }
  
  if (!record) throw new Error('Không tìm thấy tuyến cáp có ID: ' + id);

  const formatDate = (dateVal) => {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const formattedDate = formatDate(record.date);
  
  const runs = Number(record.parallelRuns || 1);
  const len = Number(record.lengthM || 0);
  const phaseSize = Number(record.cableSizeMm2 || 0);
  const neutralSize = Number(record.neutralSize || 0);
  const peSize = Number(record.peSize || 0);
  const is3Phase = String(record.phase).includes('3');
  const phasePoles = is3Phase ? 3 : 1;
  
  const cuDensity = 0.00896; 
  const alDensity = 0.00270; 
  const density = record.material === 'CU' ? cuDensity : alDensity;
  
  const phaseWeight = runs * len * phasePoles * phaseSize * density;
  const neutralWeight = runs * len * (neutralSize > 0 ? 1 : 0) * neutralSize * density;
  const peWeight = runs * len * (peSize > 0 ? 1 : 0) * peSize * density;
  const totalMetalWeight = phaseWeight + neutralWeight + peWeight;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Báo cáo chọn cáp - ${record.cableCode}</title>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #17232d; margin: 40px; line-height: 1.5; font-size: 13px; }
    .header-table { width: 100%; border-bottom: 3px solid #08705c; margin-bottom: 20px; padding-bottom: 10px; }
    .header-title { font-size: 22px; font-weight: bold; color: #08705c; text-transform: uppercase; margin: 0; }
    .header-sub { font-size: 10px; color: #667684; margin: 5px 0 0 0; letter-spacing: 1px; font-weight: bold; }
    .meta-table { width: 100%; margin-bottom: 25px; border-collapse: collapse; }
    .meta-table td { padding: 6px 8px; vertical-align: top; border-bottom: 1px solid #edf3f6; }
    .section-title { font-size: 14px; font-weight: bold; color: #08705c; border-left: 4px solid #08705c; padding-left: 8px; margin: 25px 0 12px 0; text-transform: uppercase; }
    .data-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
    .data-table th, .data-table td { border: 1px solid #dbe4e9; padding: 10px 12px; text-align: left; }
    .data-table th { background-color: #edf3f6; font-weight: bold; color: #17232d; }
    .data-table tr:nth-child(even) { background-color: #fafafa; }
    .warning-box { background-color: #fff9e6; border-left: 4px solid #ffcc00; padding: 12px; margin: 20px 0; border-radius: 6px; color: #806000; font-size: 12.5px; }
    .footer-table { width: 100%; margin-top: 60px; border-collapse: collapse; }
    .footer-table td { text-align: center; width: 50%; height: 120px; vertical-align: top; }
    .signature-title { font-weight: bold; margin-bottom: 80px; }
    .signature-line { border-bottom: 1px solid #17232d; width: 160px; margin: 0 auto; }
    .highlight-val { font-weight: bold; color: #08705c; }
  </style>
</head>
<body>
  <table class="header-table">
    <tr>
      <td>
        <h1 class="header-title">BÁO CÁO KẾT QUẢ TÍNH CHỌN CÁP</h1>
        <p class="header-sub">ELECTRICAL ENGINEERING TOOLKIT — ULTIMATE CABLE SIZING TOOL</p>
      </td>
      <td style="text-align: right; vertical-align: bottom;">
        <span style="font-size: 11px; color: #667684; font-weight: bold;">Phiên bản: V${record.version}</span>
      </td>
    </tr>
  </table>

  <table class="meta-table">
    <tr>
      <td style="width: 15%;"><strong>Dự án:</strong></td>
      <td style="width: 35%;">${record.project}</td>
      <td style="width: 15%;"><strong>Mã tuyến:</strong></td>
      <td style="width: 35%;" class="highlight-val">${record.cableCode}</td>
    </tr>
    <tr>
      <td><strong>Tên tải:</strong></td>
      <td>${record.loadName}</td>
      <td><strong>Thời gian lập:</strong></td>
      <td>${formattedDate}</td>
    </tr>
    <tr>
      <td><strong>Tủ nguồn:</strong></td>
      <td>${record.sourcePanel}</td>
      <td><strong>Người thực hiện:</strong></td>
      <td>${record.user}</td>
    </tr>
    <tr>
      <td><strong>Thiết bị đích:</strong></td>
      <td>${record.destinationPanel}</td>
      <td><strong>Trạng thái:</strong></td>
      <td><span style="padding: 2px 6px; border-radius: 4px; background: #08705c; color: #fff; font-size:11px; font-weight:bold;">${record.status}</span></td>
    </tr>
  </table>

  <div class="section-title">1. Thông số tải thiết kế</div>
  <table class="data-table">
    <tr>
      <th>Thông số đầu vào</th>
      <th>Giá trị</th>
      <th>Thông số đầu vào</th>
      <th>Giá trị</th>
    </tr>
    <tr>
      <td>Hệ thống điện</td>
      <td>${record.phase}</td>
      <td>Hệ số công suất (cosφ)</td>
      <td>${record.powerFactor}</td>
    </tr>
    <tr>
      <td>Điện áp hệ thống ($V$)</td>
      <td>${record.voltageV} V</td>
      <td>Hiệu suất tải ($\eta$)</td>
      <td>${record.efficiency}</td>
    </tr>
    <tr>
      <td>Công suất tải ($P$)</td>
      <td>${record.powerKw} kW</td>
      <td>Chiều dài một chiều ($L$)</td>
      <td>${record.lengthM} m</td>
    </tr>
    <tr>
      <td>Dòng điện tải ($I_{load}$)</td>
      <td class="highlight-val">${Number(record.loadCurrentA).toFixed(2)} A</td>
      <td>Hệ số dự phòng ($K_{df}$)</td>
      <td>${record.reserveFactor}</td>
    </tr>
    <tr>
      <td>Dòng điện thiết kế ($I_b$)</td>
      <td class="highlight-val">${Number(record.designCurrentA).toFixed(2)} A</td>
      <td>Nhiệt độ / Số mạch đi chung</td>
      <td>${record.ambientC} °C / ${record.groupedCircuits} mạch</td>
    </tr>
  </table>

  <div class="section-title">2. Phương án cáp đề xuất</div>
  <table class="data-table">
    <tr>
      <th style="width: 30%;">Hạng mục kỹ thuật</th>
      <th style="width: 70%;">Chi tiết đề xuất</th>
    </tr>
    <tr>
      <td><strong>Cấu hình cáp pha đề xuất</strong></td>
      <td class="highlight-val" style="font-size: 14px;">${record.cableConfiguration}</td>
    </tr>
    <tr>
      <td>Chất liệu ruột dẫn & Cách điện</td>
      <td>Cáp ruột ${record.material === 'CU' ? 'Đồng (Cu)' : 'Nhôm (Al)'}, cách điện ${record.insulation}</td>
    </tr>
    <tr>
      <td>Dòng cơ sở cáp ($I_{base}$)</td>
      <td>${Number(record.correctedAmpacityA / (runs || 1)).toFixed(1)} A (Theo Catalog cáp đơn)</td>
    </tr>
    <tr>
      <td>Dòng cho phép sau hiệu chỉnh ($I_z$)</td>
      <td class="highlight-val">${Number(record.correctedAmpacityA).toFixed(2)} A</td>
    </tr>
    <tr>
      <td>Sụt áp tính toán ($\Delta V$)</td>
      <td class="highlight-val">${Number(record.voltageDropV).toFixed(2)} V (${Number(record.voltageDropPercent).toFixed(2)}%)</td>
    </tr>
    <tr>
      <td>Ước lượng khối lượng kim loại dẫn</td>
      <td>~ ${totalMetalWeight.toFixed(1)} kg (${record.material}: Pha ~${phaseWeight.toFixed(1)}kg, N ~${neutralWeight.toFixed(1)}kg, PE ~${peWeight.toFixed(1)}kg)</td>
    </tr>
  </table>

  <div class="section-title">3. Thiết bị bảo vệ và hệ thống phụ trợ</div>
  <table class="data-table">
    <tr>
      <th>Hạng mục</th>
      <th>Thông số kỹ thuật đề xuất</th>
      <th>Điều kiện phối hợp bảo vệ / Ghi chú</th>
    </tr>
    <tr>
      <td><strong>Thiết bị bảo vệ (MCCB)</strong></td>
      <td class="highlight-val">${record.breakerBrand || '—'} ${record.breakerIn || '—'}A (${record.breakerPoles || '—'}, Icu: ${record.breakerIcu || '—'}kA)</td>
      <td>Kiểm tra: $I_b \le I_n \le I_z$ $\rightarrow$ ${Number(record.designCurrentA).toFixed(1)}A $\le$ ${record.breakerIn}A $\le$ ${Number(record.correctedAmpacityA).toFixed(1)}A (Đạt)</td>
    </tr>
    <tr>
      <td><strong>Dây trung tính (Neutral)</strong></td>
      <td>Tiết diện: ${record.neutralSize || '0'} mm²</td>
      <td>Cấu hình hệ thống pha: $S_{pha} = ${record.cableSizeMm2} mm² \rightarrow S_n = ${record.neutralSize} mm²$</td>
    </tr>
    <tr>
      <td><strong>Dây bảo vệ (PE)</strong></td>
      <td>Tiết diện: ${record.peSize || '0'} mm²</td>
      <td>Đáp ứng tiêu chuẩn IEC 60364-5-54 ($S_{pe} = ${record.peSize} mm²$)</td>
    </tr>
    <tr>
      <td><strong>Ống luồn cáp</strong></td>
      <td>${record.conduitSize || '—'}</td>
      <td>Số lượng tuyến: ${runs} ống. Tỷ lệ lấp đầy tối đa $\le$ 40%</td>
    </tr>
    <tr>
      <td><strong>Máng cáp (Cable Tray)</strong></td>
      <td>${record.trayName || '—'}</td>
      <td>Tỷ lệ lấp đầy thực tế: <span class="highlight-val">${Number(record.fillRate || 0).toFixed(1)}%</span> (Giới hạn tối đa $\le$ 50%)</td>
    </tr>
  </table>

  ${runs >= 2 || phaseSize >= 120 ? `
  <div class="warning-box">
    <strong>CẢNH BÁO AN TOÀN & THI CÔNG:</strong><br>
    Tuyến cáp sử dụng nhiều sợi song song (${runs} tuyến) hoặc tiết diện cáp pha lớn ($\ge 120$ mm²). Yêu cầu đơn vị thi công:
    <ul>
      <li>Chiều dài của các sợi cáp song song bắt buộc phải bằng nhau tuyệt đối để tránh mất cân bằng dòng điện (lệch dòng).</li>
      <li>Bố trí các cáp pha trên máng cáp đối xứng, kẹp chặt cố định và giữ khoảng cách tản nhiệt tiêu chuẩn.</li>
    </ul>
  </div>
  ` : ''}

  <table class="footer-table">
    <tr>
      <td>
        <div class="signature-title">Người lập báo cáo</div>
        <div style="font-size: 11px; color:#667684; margin-bottom:50px;">(Ký và ghi rõ họ tên)</div>
        <div class="signature-line"></div>
        <div style="margin-top: 10px; font-weight:bold;">${record.user ? record.user.split('@')[0] : 'anonymous'}</div>
      </td>
      <td>
        <div class="signature-title">Phê duyệt (Bộ phận M&E)</div>
        <div style="font-size: 11px; color:#667684; margin-bottom:50px;">(Ký tên và đóng dấu)</div>
        <div class="signature-line"></div>
        <div style="margin-top: 10px; font-weight:bold;">Trưởng phòng Thiết kế</div>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const blob = Utilities.newBlob(html, 'text/html', `report_${record.cableCode}.html`);
  const pdfBlob = blob.getAs('application/pdf');
  return Utilities.base64Encode(pdfBlob.getBytes());
}

function safe_(v) {
  if (v === undefined || v === null) return '';
  const s = String(v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function num_(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : '';
}

function truthy_(v) {
  return v === true || String(v).toLowerCase() === 'true' || Number(v) === 1;
}

function initializeSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  const requiredSheets = {
    'CableData': [
      'id', 'version', 'date', 'user', 'project', 'cableCode', 'loadName', 
      'sourcePanel', 'destinationPanel', 'phase', 'voltageV', 'powerKw', 
      'powerFactor', 'efficiency', 'lengthM', 'material', 'insulation', 
      'reserveFactor', 'ambientC', 'groupedCircuits', 'loadCurrentA', 
      'designCurrentA', 'cableSizeMm2', 'parallelRuns', 'cableConfiguration', 
      'correctedAmpacityA', 'voltageDropV', 'voltageDropPercent', 'conduitSize', 
      'status', 'notes', 'neutralSize', 'peSize', 'breakerIn', 
      'breakerBrand', 'breakerPoles', 'breakerIcu', 'breakerType', 
      'trayName', 'fillRate'
    ],
    'CableCatalog': [
      'Vật liệu', 'Cách điện', 'Tiết diện (mm²)', 'Dòng cơ sở (A)', 
      'Điện trở quy đổi (Ω·mm²/m)', 'Điện kháng (Ω/km)', 'Đường kính ngoài (mm)', 'Hoạt động'
    ],
    'TemperatureFactor': ['Cách điện', 'Nhiệt độ (°C)', 'Hệ số'],
    'GroupingFactor': ['Số mạch đi chung', 'Hệ số'],
    'ConduitCatalog': ['Tên ống', 'Đường kính trong (mm)', 'Hoạt động'],
    'BreakerCatalog': ['Hãng', 'Dòng định mức (A)', 'Số cực', 'Icu (kA)', 'Loại', 'Hoạt động'],
    'CableTrayCatalog': ['Tên máng', 'Rộng (mm)', 'Cao (mm)', 'Hoạt động'],
    'Settings': ['Khóa', 'Giá trị'],
    'Projects': ['Tên dự án', 'Mã dự án'],
    'ChangeLog': ['Timestamp', 'User', 'Action', 'Table', 'Record ID', 'Version', 'Details']
  };

  const defaultData = {
    'Settings': [
      ['DEFAULT_RESERVE_FACTOR', '1.25'],
      ['MAX_VOLTAGE_DROP', '5'],
      ['MAX_PARALLEL_RUNS', '6'],
      ['MAX_CONDUIT_FILL_RATE', '0.40'],
      ['MAX_TRAY_FILL_RATE', '0.50']
    ],
    'Projects': [
      ['Dự án Cable Sizing M&E', 'PROJ-CABLE-01'],
      ['Dự án Trạm biến áp 110kV', 'PROJ-SUB-02'],
      ['Nhà máy sản xuất Hapulico', 'PROJ-FAC-03']
    ],
    'TemperatureFactor': [
      ['XLPE', '25', '1.04'],
      ['XLPE', '30', '1.00'],
      ['XLPE', '35', '0.96'],
      ['XLPE', '40', '0.91'],
      ['XLPE', '45', '0.87'],
      ['XLPE', '50', '0.82'],
      ['PVC', '25', '1.06'],
      ['PVC', '30', '1.00'],
      ['PVC', '35', '0.94'],
      ['PVC', '40', '0.87'],
      ['PVC', '45', '0.79'],
      ['PVC', '50', '0.71']
    ],
    'GroupingFactor': [
      ['1', '1.00'],
      ['2', '0.80'],
      ['3', '0.70'],
      ['4', '0.65'],
      ['5', '0.60'],
      ['6', '0.57'],
      ['7', '0.54'],
      ['8', '0.52'],
      ['9', '0.50']
    ],
    'ConduitCatalog': [
      ['PVC D20', '16.0', 'TRUE'],
      ['PVC D25', '21.0', 'TRUE'],
      ['PVC D32', '27.0', 'TRUE'],
      ['PVC D40', '35.0', 'TRUE'],
      ['PVC D50', '44.0', 'TRUE'],
      ['PVC D63', '56.0', 'TRUE'],
      ['PVC D75', '67.0', 'TRUE'],
      ['PVC D90', '81.0', 'TRUE'],
      ['PVC D110', '99.0', 'TRUE'],
      ['PVC D125', '113.0', 'TRUE'],
      ['PVC D160', '145.0', 'TRUE']
    ],
    'CableTrayCatalog': [
      ['Máng cáp 100x50', '100', '50', 'TRUE'],
      ['Máng cáp 150x100', '150', '100', 'TRUE'],
      ['Máng cáp 200x100', '200', '100', 'TRUE'],
      ['Máng cáp 300x100', '300', '100', 'TRUE'],
      ['Máng cáp 400x100', '400', '100', 'TRUE'],
      ['Máng cáp 500x100', '500', '100', 'TRUE'],
      ['Máng cáp 600x100', '600', '100', 'TRUE'],
      ['Máng cáp 800x100', '800', '100', 'TRUE']
    ],
    'BreakerCatalog': [
      ['Schneider', '16', '1P', '10', 'MCB', 'TRUE'],
      ['Schneider', '20', '1P', '10', 'MCB', 'TRUE'],
      ['Schneider', '25', '1P', '10', 'MCB', 'TRUE'],
      ['Schneider', '32', '1P', '10', 'MCB', 'TRUE'],
      ['Schneider', '40', '1P', '10', 'MCB', 'TRUE'],
      ['Schneider', '50', '1P', '10', 'MCB', 'TRUE'],
      ['Schneider', '63', '1P', '10', 'MCB', 'TRUE'],
      ['Schneider', '100', '3P', '25', 'MCCB', 'TRUE'],
      ['Schneider', '125', '3P', '25', 'MCCB', 'TRUE'],
      ['Schneider', '160', '3P', '36', 'MCCB', 'TRUE'],
      ['Schneider', '200', '3P', '36', 'MCCB', 'TRUE'],
      ['Schneider', '250', '3P', '36', 'MCCB', 'TRUE'],
      ['Schneider', '320', '3P', '50', 'MCCB', 'TRUE'],
      ['Schneider', '400', '3P', '50', 'MCCB', 'TRUE'],
      ['Schneider', '500', '3P', '50', 'MCCB', 'TRUE'],
      ['Schneider', '630', '3P', '50', 'MCCB', 'TRUE'],
      ['Schneider', '800', '3P', '70', 'MCCB', 'TRUE']
    ],
    'CableCatalog': [
      ['CU', 'XLPE', '1.5', '24', '0.0172', '0.10', '5.2', 'TRUE'],
      ['CU', 'XLPE', '2.5', '32', '0.0172', '0.095', '6.0', 'TRUE'],
      ['CU', 'XLPE', '4', '42', '0.0172', '0.090', '7.0', 'TRUE'],
      ['CU', 'XLPE', '6', '54', '0.0172', '0.085', '8.0', 'TRUE'],
      ['CU', 'XLPE', '10', '75', '0.0172', '0.080', '9.5', 'TRUE'],
      ['CU', 'XLPE', '16', '100', '0.0172', '0.077', '11.0', 'TRUE'],
      ['CU', 'XLPE', '25', '135', '0.0172', '0.075', '13.5', 'TRUE'],
      ['CU', 'XLPE', '35', '165', '0.0172', '0.073', '15.0', 'TRUE'],
      ['CU', 'XLPE', '50', '200', '0.0172', '0.072', '17.0', 'TRUE'],
      ['CU', 'XLPE', '70', '255', '0.0172', '0.071', '20.0', 'TRUE'],
      ['CU', 'XLPE', '95', '315', '0.0172', '0.070', '23.0', 'TRUE'],
      ['CU', 'XLPE', '120', '365', '0.0172', '0.069', '25.5', 'TRUE'],
      ['CU', 'XLPE', '150', '420', '0.0172', '0.069', '28.0', 'TRUE'],
      ['CU', 'XLPE', '185', '480', '0.0172', '0.068', '31.5', 'TRUE'],
      ['CU', 'XLPE', '240', '570', '0.0172', '0.068', '35.5', 'TRUE'],
      ['CU', 'XLPE', '300', '650', '0.0172', '0.067', '39.5', 'TRUE'],
      ['CU', 'PVC', '1.5', '19', '0.0172', '0.10', '5.5', 'TRUE'],
      ['CU', 'PVC', '2.5', '26', '0.0172', '0.095', '6.3', 'TRUE'],
      ['CU', 'PVC', '4', '35', '0.0172', '0.090', '7.2', 'TRUE'],
      ['CU', 'PVC', '6', '45', '0.0172', '0.085', '8.2', 'TRUE'],
      ['CU', 'PVC', '10', '61', '0.0172', '0.080', '9.8', 'TRUE'],
      ['CU', 'PVC', '16', '81', '0.0172', '0.077', '11.5', 'TRUE'],
      ['CU', 'PVC', '25', '108', '0.0172', '0.075', '14.0', 'TRUE'],
      ['CU', 'PVC', '35', '133', '0.0172', '0.073', '15.6', 'TRUE'],
      ['CU', 'PVC', '50', '161', '0.0172', '0.072', '17.8', 'TRUE'],
      ['CU', 'PVC', '70', '207', '0.0172', '0.071', '20.8', 'TRUE'],
      ['CU', 'PVC', '95', '256', '0.0172', '0.070', '24.0', 'TRUE'],
      ['CU', 'PVC', '120', '299', '0.0172', '0.069', '26.8', 'TRUE'],
      ['CU', 'PVC', '150', '344', '0.0172', '0.069', '29.5', 'TRUE'],
      ['CU', 'PVC', '185', '396', '0.0172', '0.068', '33.0', 'TRUE'],
      ['CU', 'PVC', '240', '470', '0.0172', '0.068', '37.0', 'TRUE'],
      ['CU', 'PVC', '300', '540', '0.0172', '0.067', '41.0', 'TRUE'],
      ['AL', 'XLPE', '10', '58', '0.0282', '0.080', '9.5', 'TRUE'],
      ['AL', 'XLPE', '16', '77', '0.0282', '0.077', '11.0', 'TRUE'],
      ['AL', 'XLPE', '25', '104', '0.0282', '0.075', '13.5', 'TRUE'],
      ['AL', 'XLPE', '35', '127', '0.0282', '0.073', '15.0', 'TRUE'],
      ['AL', 'XLPE', '50', '154', '0.0282', '0.072', '17.0', 'TRUE'],
      ['AL', 'XLPE', '70', '196', '0.0282', '0.071', '20.0', 'TRUE'],
      ['AL', 'XLPE', '95', '242', '0.0282', '0.070', '23.0', 'TRUE'],
      ['AL', 'XLPE', '120', '280', '0.0282', '0.069', '25.5', 'TRUE'],
      ['AL', 'XLPE', '150', '322', '0.0282', '0.069', '28.0', 'TRUE'],
      ['AL', 'XLPE', '185', '368', '0.0282', '0.068', '31.5', 'TRUE'],
      ['AL', 'XLPE', '240', '437', '0.0282', '0.068', '35.5', 'TRUE'],
      ['AL', 'XLPE', '300', '498', '0.0282', '0.067', '39.5', 'TRUE']
    ]
  };

  for (let sheetName in requiredSheets) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    
    // Check if the sheet is empty
    if (sheet.getLastRow() === 0) {
      // Add headers
      sheet.appendRow(requiredSheets[sheetName]);
      
      // Add default data if present
      if (defaultData[sheetName]) {
        const rows = defaultData[sheetName];
        sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
      }
    }
  }
}