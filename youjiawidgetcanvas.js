/*
 * Egern 油价小组件（Canvas 绘制）
 *
 * 环境变量（在小组件或脚本配置中设置）：
 *   CITY      - 省份名称，如 "北京"、"福建"、"广东"（默认：北京）
 *   TYPE      - 油种代号，直接填数字：
 *               89 / 92 / 95 / 98 / 0（0=柴油）
 *               （默认：95）
 *
 * 配置示例：
 *   widgets:
 *     - name: "油价小组件"
 *       script_name: "youjia-widget-canvas"
 *       env:
 *         CITY: "广东"
 *         TYPE: "92"
 */

export default async function(ctx) {
  const API_BASE = 'https://datacenter.cngold.org';

  const REGION_MAP = {
    '北京': 2, '天津': 3, '上海': 4, '重庆': 5, '河北': 6, '山西': 7,
    '辽宁': 8, '吉林': 9, '黑龙江': 10, '江苏': 11, '浙江': 12, '安徽': 13,
    '福建': 14, '江西': 15, '山东': 16, '河南': 17, '湖北': 18, '湖南': 19,
    '广东': 20, '海南': 21, '四川': 22, '贵州': 23, '云南': 24, '陕西': 25,
    '甘肃': 26, '内蒙古': 28, '宁夏': 29, '新疆': 30, '广西': 31,
    '西藏': 405, '青海': 441,
  };

  const OIL_CFG = {
    '89': { field: 'n89', label: '89#' },
    '92': { field: 'n92', label: '92#' },
    '95': { field: 'n95', label: '95#' },
    '98': { field: 'n98', label: '98#' },
    '0':  { field: 'n0',  label: '0#柴油' },
  };

  const city = ctx.env.CITY || '北京';
  const typeNum = (ctx.env.TYPE || '95').replace(/[^0-9]/g, '');
  const oilCfg = OIL_CFG[typeNum] || OIL_CFG['95'];
  const oilLabel = oilCfg.label;
  const field = oilCfg.field;

  /* 油泵图标 64x64 像素数据 */
  const FUEL_PUMP_B64 = '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';


  /* ═══════════════════════════════════════════
     获取数据
     ═══════════════════════════════════════════ */
  let price = null, nextDateStr = '—', adjDir = '', adjAmt = '', hist = [];

  try {
    const year = new Date().getFullYear();
    const apiHeaders = { 'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36', 'Referer': 'https://quote.cngold.org/' };

    const regionId = REGION_MAP[city];
    if (!regionId) return; /* 省份不支持 */

    const [datesResp, priceResp] = await Promise.all([
      ctx.http.get(API_BASE + '/city_oil/near_time/', { headers: apiHeaders }),
      ctx.http.get(API_BASE + '/city_oil/price_history/?regionId=' + regionId, { headers: apiHeaders }),
    ]);
    const datesJson = await datesResp.json();
    const priceJson = await priceResp.json();

    const dates = (datesJson.returnCode === 0) ? datesJson.data : null;
    const allData = (priceJson.returnCode === 0) ? priceJson.data : null;

    const records = allData ? [...allData] : [];
    records.sort((a, b) => a.date.localeCompare(b.date));

    if (records.length > 0) {
      const latest = records[records.length - 1];
      price = latest[field] || 0;
      hist = records.map(r => ({ d: r.date, p: r[field] }));

      if (dates && dates.length >= 2) {
        nextDateStr = dates[1].date;
      }
      if (records.length >= 2) {
        const diff = +(latest[field + 'Change'] || 0);
        if (Math.abs(diff) >= 0.01) {
          adjDir = diff > 0 ? '↑' : '↓';
          adjAmt = Math.abs(diff).toFixed(2);
        }
      }
    }
  } catch (e) {
    // API 失败，使用默认值
  }

  /* ═══════════════════════════════════════════
     Canvas 绘制油价 UI
     ═══════════════════════════════════════════ */
  const SYS  = '-apple-system,system-ui,sans-serif';
  const MONO = '"SF Mono","Menlo",monospace';
  const PAT = [0x3f,0x06,0x5b,0x4f,0x66,0x6d,0x7d,0x07,0x7f,0x6f];

  const W = 412, H = 188;
  const DPR = 3;

  /* 加载油泵图标 */
  const pumpBlob = await (await fetch('data:image/png;base64,' + FUEL_PUMP_B64)).blob();
  const pumpImg = await createImageBitmap(pumpBlob);

  const canvas = new OffscreenCanvas(W * DPR, H * DPR);
  const cx = canvas.getContext('2d');
  cx.setTransform(1, 0, 0, 1, 0, 0);
  cx.scale(DPR, DPR);

  /* 背景 + 网格（填满全画布） */
  cx.fillStyle = '#1b2838';
  cx.fillRect(0, 0, W, H);
  const sp = 10;
  cx.strokeStyle = 'rgba(201,209,217,0.1)'; cx.lineWidth = 0.5;
  for (let x = 0; x <= W; x += sp) { cx.beginPath(); cx.moveTo(x, 0); cx.lineTo(x, H); cx.stroke(); }
  for (let y = 0; y <= H; y += sp) { cx.beginPath(); cx.moveTo(0, y); cx.lineTo(W, y); cx.stroke(); }

  /* ═══════════════════════════════════════════
     UI 元素（32px 内边距，坐标直接计算）
     ═══════════════════════════════════════════ */

  /* 顶部 Header 容器：412×188 下硬编码 */
  const headerX = 18, headerY = 18, headerW = 376, headerH = 24, headerCY = 30;

  /* 左侧：油泵 + 油种 */
  const iconSize = 19;
  cx.drawImage(pumpImg, headerX, headerY, iconSize, iconSize);
  cx.fillStyle = '#c9d1d9'; cx.font = '600 17px ' + SYS; cx.textAlign = 'left'; cx.textBaseline = 'middle';
  cx.fillText(oilLabel, 43, headerCY);

  /* 右侧：地区 */
  cx.textAlign = 'right'; cx.font = '500 13px ' + SYS;
  cx.fillText(city, headerX + headerW, headerCY);

  /* 左侧 PriceBlock：七段数码管价格 */
  const priceBlockX = 18, priceBlockY = 79, priceBlockW = 172, priceBlockH = 54;
  const digW = 30, digGap = 10, digH = priceBlockH, digTop = priceBlockY;
  let curX = priceBlockX;
  if (price != null) {
    const padded = price.toFixed(2).padStart(5, '0');
    let lit = false;
    for (let i = 0; i < padded.length; i++) {
      const ch = padded[i];
      if (ch === '.') { lit = true; }
      if (ch === '.') {
        const dotX = curX - digGap / 2, dotY = digTop + digH - 8;
        const dotGrad = cx.createLinearGradient(dotX - 2, dotY + 2, dotX + 2, dotY - 2);
        dotGrad.addColorStop(0, '#1e3048');
        dotGrad.addColorStop(0.5, '#6b7b8e');
        dotGrad.addColorStop(1, '#ffffff');
        cx.beginPath(); cx.arc(dotX, dotY, 4, 0, Math.PI * 2);
        cx.fillStyle = dotGrad; cx.fill();
      } else {
        const d = parseInt(ch);
        const bright = d !== 0 || lit;
        if (d > 0) lit = true;
        drawSegDigit(cx, curX, digTop, digW, digH, d,
          bright ? '#4a9eff' : 'rgba(74,158,255,0.07)',
          'rgba(74,158,255,0.07)');
        curX += digW + digGap;
      }
    }
    curX -= digGap;
  } else {
    cx.fillStyle = '#6e7681'; cx.font = '500 34px ' + SYS; cx.textAlign = 'left'; cx.textBaseline = 'middle';
    cx.fillText('—', priceBlockX, digTop + digH / 2);
    curX = 44;
  }
  const totW = curX - 15;

  /* 右侧 ChartBlock：最近三次调价折线图 */
  const chartBlockX = 206, chartBlockY = 55, chartBlockW = 188, chartBlockH = 100;
  const mx = chartBlockX, my = chartBlockY, mw = chartBlockW, mh = 83;
  const hlen = hist.length;
  if (hlen >= 2) {
    const start = Math.max(0, hlen - 11);
    const subset = hist.slice(start);
    const n = subset.length;
    if (n < 2) return;  /* 数据不足 */
    const maxP = Math.max(...subset.map(h => h.p));
    const yHi = Math.floor(maxP) + 1;
    const ticks = [0, Math.round(yHi / 2), yHi];
    const formatTick = v => String(v);
    const dateX = [mx + 14, mx + 14 + (mw - 28) / 2, mx + mw - 14];
    const tx = i => mx + (i / (n - 1)) * mw;
    const ty = p => my + mh - (p / yHi) * mh;

    cx.font = '500 11px ' + MONO; cx.textAlign = 'right'; cx.textBaseline = 'middle';
    for (const v of ticks) {
      const py = ty(v);
      if (py < my || py > my + mh) continue;
      cx.strokeStyle = 'rgba(201,209,217,0.15)'; cx.lineWidth = 0.5;
      cx.beginPath(); cx.moveTo(mx, py); cx.lineTo(mx + mw, py); cx.stroke();
      cx.fillStyle = '#c9d1d9'; cx.fillText(formatTick(v), mx - 7, py);
    }

    /* 横坐标日期：曲线绘制 11 个点，但只显示首/中/尾 3 个日期 */
    cx.textAlign = 'center'; cx.textBaseline = 'top'; cx.font = '400 8px ' + MONO; cx.fillStyle = '#c9d1d9';
    const dateIdx = n >= 3 ? [0, Math.floor((n - 1) / 2), n - 1] : [0, n - 1];
    const dateLabelX = n >= 3 ? dateX : [dateX[0], dateX[2]];
    for (let i = 0; i < dateIdx.length; i++) {
      cx.fillText(subset[dateIdx[i]].d.slice(5), dateLabelX[i], my + mh + 6);
    }

    /* 填充 */
    const gf = cx.createLinearGradient(mx, my, mx, my + mh);
    gf.addColorStop(0, 'rgba(74,158,255,0.28)'); gf.addColorStop(0.6, 'rgba(74,158,255,0.04)'); gf.addColorStop(1, 'rgba(74,158,255,0)');
    cx.beginPath(); cx.moveTo(tx(0), ty(subset[0].p));
    for (let i = 1; i < n; i++) cx.lineTo(tx(i), ty(subset[i].p));
    cx.lineTo(tx(n - 1), my + mh); cx.lineTo(tx(0), my + mh); cx.closePath(); cx.fillStyle = gf; cx.fill();

    /* 折线 */
    cx.beginPath(); cx.moveTo(tx(0), ty(subset[0].p));
    for (let i = 1; i < n; i++) cx.lineTo(tx(i), ty(subset[i].p));
    cx.strokeStyle = '#4a9eff'; cx.lineWidth = 1.2; cx.lineJoin = 'round'; cx.lineCap = 'round'; cx.stroke();

    /* 终点圆点 */
    const lx = tx(n - 1), ly = ty(subset[n - 1].p);
    cx.beginPath(); cx.arc(lx, ly, 4, 0, Math.PI * 2); cx.fillStyle = 'rgba(74,158,255,0.18)'; cx.fill();
    cx.beginPath(); cx.arc(lx, ly, 3, 0, Math.PI * 2); cx.fillStyle = '#4a9eff'; cx.fill();
    cx.strokeStyle = '#e6edf3'; cx.lineWidth = 1; cx.stroke();
  }

  /* 底部 Footer 容器：左侧下次调价，右侧上次调价 */
  const footerX = 18, footerY = H - 18, footerW = 376;
  cx.font = '500 11px ' + SYS; cx.textBaseline = 'alphabetic';

  cx.fillStyle = '#e8940e'; cx.textAlign = 'left';
  cx.fillText('下次调整：' + nextDateStr, footerX, footerY);

  cx.textAlign = 'right';
  const adjText = adjDir ? adjDir + adjAmt : '—';
  if (adjDir) {
    cx.fillStyle = '#c9d1d9'; cx.fillText('上次涨跌：', footerX + footerW - 28, footerY);
    cx.fillStyle = adjDir === '↑' ? '#ff5555' : '#55cc88';
    cx.fillText(adjText, footerX + footerW, footerY);
  } else {
    cx.fillStyle = '#c9d1d9'; cx.fillText('上次涨跌：—', footerX + footerW, footerY);
  }

  /* ═══ 导出 base64 ═══ */

  const blob = await canvas.convertToBlob({ type: 'image/png' });
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  const dataUri = 'data:image/png;base64,' + btoa(binary);

  /* ═══ 返回小组件 ═══ */
  const refreshAfter = getRefreshAfter(nextDateStr);
  return {
    type: 'widget',
    refreshAfter: refreshAfter,
    backgroundImage: dataUri,
    padding: 0,
    children: [],
  };

  /* ═══════════════════════════════════════════
     刷新时间辅助函数
     ═══════════════════════════════════════════ */

  function getRefreshAfter(nextDate) {
    const now = new Date();
    const today = localDateString(now);

    if (!nextDate || nextDate === '—') {
      return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    }

    if (today < nextDate) {
      return new Date(nextDate + 'T08:30:00').toISOString();
    }

    if (today === nextDate) {
      return new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
    }

    return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  }

  function localDateString(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  /* ═══════════════════════════════════════════
     绘图辅助函数
     ═══════════════════════════════════════════ */

  function drawSegDigit(c, x, y, w, h, n, onColor, offColor) {
    const gap = Math.max(2, Math.round(w * 0.06));
    const segThick = Math.round(h * 0.09);
    const tip = Math.round(segThick * 0.9);
    const bits = (n >= 0 && n <= 9) ? PAT[n] : 0;
    const poly = (pts, active, color) => {
      c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
      c.closePath(); c.fillStyle = active ? color : offColor; c.fill();
    };
    const t = y + gap, b = y + h - gap, m = y + h / 2;
    const l = x + gap, r = x + w - gap;
    const halfT = segThick / 2;
    const segGap = segThick * 0.35;
    const grad = c.createLinearGradient(l, b, r, t);
    grad.addColorStop(0, '#1e3048');
    grad.addColorStop(0.5, '#6b7b8e');
    grad.addColorStop(1, '#ffffff');
    const aY = t + segGap;
    poly([[l, aY], [l + tip, aY - halfT], [r - tip, aY - halfT], [r, aY], [r - tip, aY + halfT], [l + tip, aY + halfT]], bits & 0x01, grad);
    const dY = b - segGap;
    poly([[l, dY], [l + tip, dY - halfT], [r - tip, dY - halfT], [r, dY], [r - tip, dY + halfT], [l + tip, dY + halfT]], bits & 0x08, grad);
    poly([[l, m], [l + tip, m - halfT], [r - tip, m - halfT], [r, m], [r - tip, m + halfT], [l + tip, m + halfT]], bits & 0x40, grad);
    const vTop_center = (aY + m) / 2;
    const vTop_half = (m - aY) / 2 - segGap;
    poly([[l, vTop_center - vTop_half], [l + halfT, vTop_center - vTop_half + tip], [l + halfT, vTop_center + vTop_half - tip], [l, vTop_center + vTop_half], [l - halfT, vTop_center + vTop_half - tip], [l - halfT, vTop_center - vTop_half + tip]], bits & 0x20, grad);
    poly([[r, vTop_center - vTop_half], [r + halfT, vTop_center - vTop_half + tip], [r + halfT, vTop_center + vTop_half - tip], [r, vTop_center + vTop_half], [r - halfT, vTop_center + vTop_half - tip], [r - halfT, vTop_center - vTop_half + tip]], bits & 0x02, grad);
    const vBot_center = (m + dY) / 2;
    const vBot_half = (dY - m) / 2 - segGap;
    poly([[l, vBot_center - vBot_half], [l + halfT, vBot_center - vBot_half + tip], [l + halfT, vBot_center + vBot_half - tip], [l, vBot_center + vBot_half], [l - halfT, vBot_center + vBot_half - tip], [l - halfT, vBot_center - vBot_half + tip]], bits & 0x10, grad);
    poly([[r, vBot_center - vBot_half], [r + halfT, vBot_center - vBot_half + tip], [r + halfT, vBot_center + vBot_half - tip], [r, vBot_center + vBot_half], [r - halfT, vBot_center + vBot_half - tip], [r - halfT, vBot_center - vBot_half + tip]], bits & 0x04, grad);
  }
}
