/**
 * Egern widget: Subscription Traffic
 *
 * Create a Generic script with this file.
 * Required env:
 *   SUBSCRIPTION_URL=https://example.com/subscribe?token=...
 * Optional env:
 *   SUBSCRIPTION_NAME=My Subscription
 *   REFRESH_HOURS=2
 *   SUBSCRIPTION_USER_AGENT=clash.meta
 *   PLAN_TOTAL_GB=100 (default)
 */

const C = {
  bg:       { light: '#FFFFFF', dark: '#050506' },
  text:     { light: '#111114', dark: '#F7F7F8' },
  dim:      { light: '#7B7B84', dark: '#85858E' },
  panel:    { light: '#F5F5F7', dark: '#111114' },
  hairline: { light: '#E4E4E8', dark: '#242429' },
  track:    { light: '#E8E8ED', dark: '#202025' },
  accent:   { light: '#7446D8', dark: '#B765FF' },
  ok:       { light: '#2F9E58', dark: '#C7FF18' },
  warn:     { light: '#A06400', dark: '#FFBE3F' },
  fail:     { light: '#D64545', dark: '#FF626A' }
};

const GAUGE_API = 'https://quickchart.io/chart';

function numberEnv(ctx, key, fallback, min, max) {
  const value = Number(ctx.env?.[key]);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function hashString(value) {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) hash = ((hash << 5) + hash) ^ value.charCodeAt(i);
  return (hash >>> 0).toString(36);
}

function storageKey(url) {
  return `egern.subscription.traffic.v1.${hashString(url)}`;
}

function readHeader(headers, name) {
  if (!headers) return '';
  if (typeof headers.get === 'function') return headers.get(name) || '';
  const target = String(name).toLowerCase();
  const matchedKey = Object.keys(headers).find(key => key.toLowerCase() === target);
  return matchedKey ? headers[matchedKey] : '';
}

function parseUserInfo(raw) {
  const values = {};
  String(raw || '').split(';').forEach(part => {
    const index = part.indexOf('=');
    if (index < 1) return;
    const key = part.slice(0, index).trim().toLowerCase();
    const value = Number(part.slice(index + 1).trim());
    if (Number.isFinite(value)) values[key] = value;
  });

  if (!Number.isFinite(values.upload) || !Number.isFinite(values.download) || !Number.isFinite(values.total)) {
    return null;
  }

  const upload = Math.max(0, values.upload);
  const download = Math.max(0, values.download);
  const total = Math.max(0, values.total);
  const used = upload + download;
  const unlimited = total === 0;
  const remaining = unlimited ? Infinity : Math.max(0, total - used);
  const expireValue = Number(values.expire) || 0;
  const expireAt = expireValue > 1000000000000 ? expireValue : expireValue * 1000;

  return { upload, download, total, used, remaining, unlimited, expireAt };
}

function unitBytes(value, unit) {
  const powers = { B: 0, KB: 1, MB: 2, GB: 3, TB: 4, PB: 5 };
  const power = powers[String(unit || '').toUpperCase()];
  if (power == null) return null;
  return Number(value) * (1024 ** power);
}

function parseBodyInfo(body) {
  const source = String(body || '').replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
  const expireMatch = source.match(/(?:有效期|到期(?:时间)?|过期(?:时间)?)[：:\s]*([12]\d{3}[-/.]\d{1,2}[-/.]\d{1,2})/i);
  const remainingMatch = source.match(/剩余(?:流量)?[：:\s]*([0-9]+(?:\.[0-9]+)?)\s*(PB|TB|GB|MB|KB|B)/i);
  if (!remainingMatch) return null;

  const remaining = unitBytes(remainingMatch[1], remainingMatch[2]);
  if (!Number.isFinite(remaining)) return null;

  const totalMatch = source.match(/(?:总(?:流量|量)|套餐流量)[：:\s]*([0-9]+(?:\.[0-9]+)?)\s*(PB|TB|GB|MB|KB|B)/i);
  const usedMatch = source.match(/已用(?:流量)?[：:\s]*([0-9]+(?:\.[0-9]+)?)\s*(PB|TB|GB|MB|KB|B)/i);
  const total = totalMatch ? unitBytes(totalMatch[1], totalMatch[2]) : null;
  const explicitUsed = usedMatch ? unitBytes(usedMatch[1], usedMatch[2]) : null;
  const used = Number.isFinite(explicitUsed)
    ? explicitUsed
    : Number.isFinite(total)
      ? Math.max(0, total - remaining)
      : null;

  let expireAt = 0;
  if (expireMatch) {
    const normalized = expireMatch[1].replace(/[/.]/g, '-');
    const parsed = new Date(`${normalized}T23:59:59`);
    if (!Number.isNaN(parsed.getTime())) expireAt = parsed.getTime();
  }

  return {
    upload: null,
    download: null,
    total,
    used,
    remaining,
    unlimited: false,
    expireAt,
    partial: !Number.isFinite(total),
    source: 'body'
  };
}

function applyPlanTotal(ctx, traffic) {
  const configured = String(ctx.env?.PLAN_TOTAL_GB || '').trim();
  const planGB = configured ? Number(configured) : 100;
  if (!traffic || Number.isFinite(traffic.total) || !Number.isFinite(planGB) || planGB <= 0) return traffic;
  const total = planGB * (1024 ** 3);
  return {
    ...traffic,
    total,
    used: Math.max(0, total - traffic.remaining),
    partial: false,
    totalEstimated: true,
    source: `${traffic.source || 'body'}+env`
  };
}

async function fetchSubscription(ctx, url) {
  const customUA = String(ctx.env?.SUBSCRIPTION_USER_AGENT || '').trim();
  const userAgents = [...new Set([
    customUA,
    'clash.meta',
    'clash-verge/v2.2.3',
    'Surge/5.0',
    'Quantumult%20X/1.5.0'
  ].filter(Boolean))];

  const extract = async response => {
    const headerData = parseUserInfo(readHeader(response?.headers, 'subscription-userinfo'));
    if (headerData) return headerData;
    try {
      return parseBodyInfo(await response.text());
    } catch {
      return null;
    }
  };

  for (const userAgent of userAgents) {
    try {
      const response = await ctx.http.get(url, {
        timeout: 8000,
        redirect: 'manual',
        headers: { 'User-Agent': userAgent }
      });

      const direct = await extract(response);
      if (direct) return direct;

      const location = readHeader(response.headers, 'location');
      if (location && response.status >= 300 && response.status < 400) {
        const target = new URL(location, url).toString();
        const redirected = await ctx.http.get(target, {
          timeout: 8000,
          redirect: 'follow',
          headers: { 'User-Agent': userAgent }
        });
        const final = await extract(redirected);
        if (final) return final;
      }
    } catch {
      // Try the next common subscription client identity.
    }
  }

  throw new Error('订阅未返回可识别的流量信息');
}

async function loadData(ctx) {
  const url = String(ctx.env?.SUBSCRIPTION_URL || '').trim();
  const name = String(ctx.env?.SUBSCRIPTION_NAME || 'SUBSCRIPTION').trim();
  if (!url) return { mode: 'setup', name };

  const key = storageKey(url);
  try {
    const traffic = applyPlanTotal(ctx, await fetchSubscription(ctx, url));
    const result = { mode: 'live', name, traffic, updatedAt: Date.now() };
    ctx.storage?.setJSON(key, result);
    return result;
  } catch (error) {
    const cached = ctx.storage?.getJSON(key);
    if (cached?.traffic) {
      return {
        ...cached,
        traffic: applyPlanTotal(ctx, cached.traffic),
        mode: 'stale',
        name,
        error: String(error?.message || error)
      };
    }
    return { mode: 'error', name, error: String(error?.message || error || '加载失败') };
  }
}

function daysRemaining(expireAt) {
  if (!expireAt) return null;
  return Math.ceil((expireAt - Date.now()) / 86400000);
}

function statusOf(data) {
  if (data.mode === 'setup') return { label: 'SETUP', color: C.dim };
  if (data.mode === 'error') return { label: 'ERROR', color: C.fail };
  if (data.mode === 'stale') return { label: 'STALE', color: C.warn };

  const traffic = data.traffic;
  const days = daysRemaining(traffic.expireAt);
  const ratio = traffic.unlimited || !Number.isFinite(traffic.total) || traffic.total <= 0
    ? null
    : traffic.remaining / traffic.total;
  if ((!traffic.unlimited && traffic.remaining <= 0) || (days != null && days <= 0)) {
    return { label: 'EXPIRED', color: C.fail };
  }
  if ((!traffic.unlimited && ratio != null && ratio <= 0.2) ||
      (traffic.partial && traffic.remaining <= 10 * (1024 ** 3)) ||
      (days != null && days <= 7)) {
    return { label: 'LOW', color: C.warn };
  }
  return { label: 'ACTIVE', color: C.ok };
}

function formatBytes(bytes, decimals = 1) {
  if (!Number.isFinite(bytes)) return '不限量';
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / (1024 ** index);
  const digits = value >= 100 ? 0 : value >= 10 ? Math.min(1, decimals) : decimals;
  return `${value.toFixed(digits)} ${units[index]}`;
}

function formatDate(timestamp) {
  if (!timestamp) return '长期有效';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '--';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function percentRemaining(traffic) {
  if (traffic.unlimited || !Number.isFinite(traffic.total) || traffic.total <= 0) return null;
  return Math.max(0, Math.min(100, (traffic.remaining / traffic.total) * 100));
}

function optionalBytes(value) {
  return Number.isFinite(value) ? formatBytes(value) : '--';
}

function totalLabel(traffic) {
  if (traffic.unlimited) return '不限量';
  return optionalBytes(traffic.total);
}

function bytesToBase64(bytes) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const triple = (a << 16) | (b << 8) | c;
    output += alphabet[(triple >> 18) & 63];
    output += alphabet[(triple >> 12) & 63];
    output += i + 1 < bytes.length ? alphabet[(triple >> 6) & 63] : '=';
    output += i + 2 < bytes.length ? alphabet[triple & 63] : '=';
  }
  return output;
}

async function loadGaugeImage(ctx, traffic) {
  const remainingPercent = percentRemaining(traffic);
  if (remainingPercent == null) return '';
  const usedPercent = Math.round(Math.max(0, Math.min(100, 100 - remainingPercent)));
  const cacheKey = `egern.subscription.gauge.png.v4.${usedPercent}`;
  const cached = ctx.storage?.get(cacheKey);
  if (cached) return cached;

  const chart = {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [usedPercent, Math.max(0.01, 100 - usedPercent)],
        backgroundColor: ['#7446D8', '#D0D0D8'],
        borderColor: ['rgba(0,0,0,0)', 'rgba(0,0,0,0)'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: false,
      animation: false,
      rotation: 2.35619449,
      circumference: 4.71238898,
      cutoutPercentage: 82,
      legend: { display: false },
      tooltips: { enabled: false },
      plugins: {
        datalabels: { display: false },
        doughnutlabel: {
          labels: [
            { text: ' ', font: { size: 12, weight: 'normal', family: 'Helvetica Neue' }, color: 'rgba(0,0,0,0)' },
            { text: `${usedPercent}%`, font: { size: 36, weight: 'bold', family: 'Helvetica Neue' }, color: '#7446D8' },
            { text: '已用', font: { size: 14, weight: 'normal', family: 'Helvetica Neue' }, color: '#7B7B84' }
          ]
        }
      }
    }
  };

  const response = await ctx.http.post(GAUGE_API, {
    timeout: 8000,
    headers: { 'Content-Type': 'application/json' },
    body: {
      version: '2',
      width: 280,
      height: 200,
      devicePixelRatio: 2,
      format: 'png',
      backgroundColor: 'transparent',
      chart
    }
  });
  if (response.status < 200 || response.status >= 300) throw new Error(`Gauge HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.length) throw new Error('Gauge image is empty');
  const dataUri = `data:image/png;base64,${bytesToBase64(bytes)}`;
  ctx.storage?.set(cacheKey, dataUri);
  return dataUri;
}

function icon(name, color, size = 14) {
  return { type: 'image', src: `sf-symbol:${name}`, width: size, height: size, color };
}

function text(value, size, color, weight = 'regular', extra = {}) {
  return {
    type: 'text',
    text: String(value),
    font: { size, weight },
    textColor: color,
    maxLines: 1,
    ...extra
  };
}

function header(data) {
  const status = statusOf(data);
  return {
    type: 'stack',
    direction: 'row',
    alignItems: 'center',
    gap: 7,
    children: [
      icon('chart.pie.fill', C.accent, 14),
      text('SUBSCRIPTION', 10, C.dim, 'bold'),
      { type: 'spacer' },
      {
        type: 'stack',
        direction: 'row',
        alignItems: 'center',
        gap: 5,
        padding: [3, 7],
        backgroundColor: C.panel,
        borderRadius: 4,
        children: [
          { type: 'stack', width: 6, height: 6, borderRadius: 3, backgroundColor: status.color, children: [] },
          text(status.label, 9, status.color === C.dim ? C.dim : C.text, 'semibold')
        ]
      }
    ]
  };
}

function progressBar(traffic, width) {
  const percent = percentRemaining(traffic);
  const fillWidth = percent == null ? width : Math.max(5, Math.round(width * percent / 100));
  return {
    type: 'stack',
    direction: 'row',
    width,
    height: 5,
    backgroundColor: C.track,
    borderRadius: 3,
    children: [{
      type: 'stack',
      width: fillWidth,
      height: 5,
      backgroundColor: C.accent,
      borderRadius: 3,
      children: []
    }]
  };
}

function progressOrNote(traffic, width) {
  const percent = percentRemaining(traffic);
  if (percent == null && !traffic.unlimited) {
    return text('服务商仅提供剩余流量', 9, C.dim, 'medium');
  }
  return progressBar(traffic, width);
}

function fallbackGauge(traffic, size = 108) {
  const remainingPercent = percentRemaining(traffic);
  const usedPercent = remainingPercent == null ? null : Math.max(0, Math.min(100, 100 - remainingPercent));
  return {
    type: 'stack',
    direction: 'column',
    alignItems: 'center',
    width: size,
    height: size,
    gap: 3,
    children: [
      { type: 'spacer' },
      icon('gauge.with.dots.needle.33percent', C.accent, 52),
      text(usedPercent == null ? '--' : `${usedPercent.toFixed(0)}%`, 15, C.text, 'bold', {
        font: { size: 15, weight: 'bold', family: 'Menlo' }
      }),
      text('已用', 9, C.dim, 'semibold'),
      { type: 'spacer' }
    ]
  };
}

function gaugeView(data, traffic, size = 108) {
  if (!data.gaugeImage) return fallbackGauge(traffic, size);
  return {
    type: 'image',
    src: data.gaugeImage,
    width: size + 18,
    height: size,
    resizeMode: 'contain'
  };
}

function metric(label, value, color = C.text) {
  return {
    type: 'stack',
    direction: 'column',
    gap: 2,
    flex: 1,
    children: [
      text(label, 9, C.dim, 'semibold'),
      text(value, 12, color, 'semibold', { minScale: 0.68 })
    ]
  };
}

function leadingLine(child, width) {
  return {
    type: 'stack',
    direction: 'row',
    width,
    children: [child, { type: 'spacer' }]
  };
}

function emptyWidget(data, family, ctx) {
  const isSmall = family === 'systemSmall';
  const refreshHours = numberEnv(ctx, 'REFRESH_HOURS', 2, 0.5, 24);
  const setup = data.mode === 'setup';
  return {
    type: 'widget',
    backgroundColor: C.bg,
    padding: isSmall ? 14 : 16,
    gap: 8,
    refreshAfter: new Date(Date.now() + refreshHours * 3600000).toISOString(),
    children: [
      header(data),
      { type: 'spacer' },
      {
        type: 'stack',
        direction: 'row',
        children: [
          { type: 'spacer' },
          {
            type: 'stack',
            direction: 'column',
            alignItems: 'center',
            gap: 6,
            children: [
              icon(setup ? 'link.badge.plus' : 'exclamationmark.triangle', setup ? C.dim : C.fail, isSmall ? 20 : 22),
              text(setup ? '等待订阅地址' : '无法读取流量', isSmall ? 13 : 15, C.text, 'semibold'),
              text(setup ? '请配置 SUBSCRIPTION_URL' : data.error, 9, C.dim, 'medium', { minScale: 0.65 })
            ]
          },
          { type: 'spacer' }
        ]
      },
      { type: 'spacer' }
    ]
  };
}

function mediumWidget(data, ctx) {
  if (!data.traffic) return emptyWidget(data, 'systemMedium', ctx);
  const traffic = data.traffic;
  const days = daysRemaining(traffic.expireAt);
  const refreshHours = numberEnv(ctx, 'REFRESH_HOURS', 2, 0.5, 24);
  const daysText = days == null ? '长期' : `${Math.max(0, days)} 天`;

  return {
    type: 'widget',
    backgroundColor: C.bg,
    padding: [13, 16, 13, 16],
    gap: 8,
    refreshAfter: new Date(Date.now() + refreshHours * 3600000).toISOString(),
    children: [
      header(data),
      {
        type: 'stack',
        direction: 'row',
        alignItems: 'start',
        gap: 12,
        children: [
          {
            type: 'stack',
            direction: 'column',
            gap: 5,
            width: 200,
            height: 112,
            children: [
              leadingLine(text(formatBytes(traffic.remaining), 27, C.text, 'bold', {
                font: { size: 27, weight: 'bold', family: 'Menlo' },
                minScale: 0.62
              }), 200),
              leadingLine(text('剩余流量', 10, C.dim, 'medium'), 200),
              {
                type: 'stack',
                direction: 'row',
                alignItems: 'center',
                width: 200,
                children: [
                  text(`已用 ${optionalBytes(traffic.used)}`, 10, C.dim, 'medium', { minScale: 0.72 }),
                  { type: 'spacer' },
                  text(`剩余 ${daysText}`, 10, C.dim, 'medium', { minScale: 0.72 })
                ]
              },
              leadingLine(text(`到期 ${formatDate(traffic.expireAt)}`, 9, C.dim, 'medium', { minScale: 0.72 }), 200),
              { type: 'spacer' },
              leadingLine(text(data.name, 9, C.dim, 'medium', { minScale: 0.7 }), 200)
            ]
          },
          {
            type: 'stack',
            direction: 'column',
            alignItems: 'center',
            gap: 2,
            width: 118,
            height: 112,
            children: [
              gaugeView(data, traffic, 100),
              text(`套餐 ${totalLabel(traffic)}`, 9, C.dim, 'semibold', { minScale: 0.68 })
            ]
          }
        ]
      }
    ]
  };
}

function smallWidget(data, ctx) {
  if (!data.traffic) return emptyWidget(data, 'systemSmall', ctx);
  const traffic = data.traffic;
  const percent = percentRemaining(traffic);
  const refreshHours = numberEnv(ctx, 'REFRESH_HOURS', 2, 0.5, 24);
  return {
    type: 'widget',
    backgroundColor: C.bg,
    padding: 14,
    gap: 7,
    refreshAfter: new Date(Date.now() + refreshHours * 3600000).toISOString(),
    children: [
      header(data),
      { type: 'spacer' },
      text(formatBytes(traffic.remaining), 25, C.text, 'bold', {
        font: { size: 25, weight: 'bold', family: 'Menlo' },
        minScale: 0.58
      }),
      {
        type: 'stack',
        direction: 'row',
        children: [
          text('剩余流量', 10, C.dim, 'medium'),
          { type: 'spacer' },
          text(traffic.unlimited ? '∞' : percent == null ? '--' : `${percent.toFixed(0)}%`, 11, C.text, 'semibold')
        ]
      },
      progressOrNote(traffic, 126),
      { type: 'spacer' },
      text(formatDate(traffic.expireAt), 9, C.dim, 'medium')
    ]
  };
}

function largeWidget(data, ctx) {
  if (!data.traffic) return emptyWidget(data, 'systemLarge', ctx);
  const traffic = data.traffic;
  const percent = percentRemaining(traffic);
  const days = daysRemaining(traffic.expireAt);
  const refreshHours = numberEnv(ctx, 'REFRESH_HOURS', 2, 0.5, 24);
  const daily = days && days > 0 && Number.isFinite(traffic.remaining) ? traffic.remaining / days : null;

  return {
    type: 'widget',
    backgroundColor: C.bg,
    padding: 16,
    gap: 10,
    refreshAfter: new Date(Date.now() + refreshHours * 3600000).toISOString(),
    children: [
      header(data),
      {
        type: 'stack',
        direction: 'row',
        alignItems: 'center',
        gap: 12,
        padding: [11, 14],
        backgroundColor: C.panel,
        borderRadius: 8,
        children: [
          icon('arrow.up.arrow.down.circle.fill', C.accent, 28),
          {
            type: 'stack',
            direction: 'column',
            gap: 2,
            flex: 1,
            children: [
              text(formatBytes(traffic.remaining), 22, C.text, 'bold', {
                font: { size: 22, weight: 'bold', family: 'Menlo' }, minScale: 0.6
              }),
              text('剩余流量', 10, C.dim, 'medium')
            ]
          },
          text(traffic.unlimited ? '∞' : percent == null ? '--' : `${percent.toFixed(0)}%`, 18, C.text, 'bold')
        ]
      },
      progressOrNote(traffic, 300),
      {
        type: 'stack',
        direction: 'row',
        gap: 12,
        children: [
          metric('下载', optionalBytes(traffic.download)),
          metric('上传', optionalBytes(traffic.upload)),
          metric('合计已用', optionalBytes(traffic.used))
        ]
      },
      { type: 'stack', height: 1, backgroundColor: C.hairline, children: [] },
      {
        type: 'stack',
        direction: 'row',
        gap: 12,
        children: [
          metric('套餐总量', totalLabel(traffic)),
          metric('剩余天数', days == null ? '长期' : `${Math.max(0, days)} 天`),
          metric('日均可用', daily == null ? '--' : formatBytes(daily))
        ]
      },
      { type: 'spacer' },
      {
        type: 'stack',
        direction: 'row',
        children: [
          text(data.name, 9, C.dim, 'medium', { flex: 1, minScale: 0.7 }),
          text(`到期 ${formatDate(traffic.expireAt)}`, 9, C.dim, 'semibold')
        ]
      }
    ]
  };
}

function lockWidget(data, family) {
  if (!data.traffic) {
    const label = data.mode === 'setup' ? '订阅流量：待配置' : '订阅流量：读取失败';
    return { type: 'widget', children: [text(label, 12, C.text, 'semibold')] };
  }
  const traffic = data.traffic;
  const percent = percentRemaining(traffic);
  const remaining = formatBytes(traffic.remaining);
  if (family === 'accessoryInline') {
    return { type: 'widget', children: [text(`剩余 ${remaining}${percent == null ? '' : ` · ${percent.toFixed(0)}%`}`, 12, C.text, 'semibold')] };
  }
  if (family === 'accessoryCircular') {
    return {
      type: 'widget',
      padding: 4,
      children: [
        icon('chart.pie.fill', C.text, 15),
        text(traffic.unlimited ? '∞' : percent == null ? '--' : `${percent.toFixed(0)}%`, 12, C.text, 'bold', { textAlign: 'center' })
      ]
    };
  }
  return {
    type: 'widget',
    gap: 2,
    children: [
      {
        type: 'stack',
        direction: 'row',
        alignItems: 'center',
        gap: 5,
        children: [icon('chart.pie.fill', C.text, 12), text(data.name, 11, C.text, 'semibold')]
      },
      text(`剩余 ${remaining} · 到期 ${formatDate(traffic.expireAt)}`, 12, C.text, 'bold')
    ]
  };
}

export default async function(ctx) {
  const data = await loadData(ctx);
  const family = ctx.widgetFamily || 'systemMedium';
  if (family === 'systemMedium' && data.traffic) {
    try {
      data.gaugeImage = await loadGaugeImage(ctx, data.traffic);
    } catch {
      data.gaugeImage = '';
    }
  }
  if (family.startsWith('accessory')) return lockWidget(data, family);
  if (family === 'systemSmall') return smallWidget(data, ctx);
  if (family === 'systemLarge' || family === 'systemExtraLarge') return largeWidget(data, ctx);
  return mediumWidget(data, ctx);
}
