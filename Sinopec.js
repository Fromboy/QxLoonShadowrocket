/******************************
脚本名称: Sinopec
Version : v1.0.0
更新时间: 2026-07-09
平台: Egern（适配TF2.20.0 776及以上版本）
功能: 中国石化油价监控
脚本作者：
@Nullwhy
使用说明:
1. 添加到Egern脚本
2. 主界面右上角添加小组件
3. Env说明：
 * - PROVINCE / PROVINCE_ID / province: 省份代码或中文名，默认 31（上海）
 * - AREA: 价区序号，默认 0
 * - FUEL: 小号指定油品，如 92 / 95 / 98 / 0 / GAS_95，默认第一个
 * - FUELS: 中号/大号指定油品列表，如 92,95,98 或 GAS_92,GAS_95,CHAI_0
*******************************/

const BASE = 'https://cx.sinopecsales.com/yjkqiantai';

const PROVINCES = {
  '11':'北京','12':'天津','13':'河北','14':'山西','41':'河南','37':'山东','31':'上海','32':'江苏','33':'浙江','34':'安徽','35':'福建','36':'江西','42':'湖北','43':'湖南','44':'广东','45':'广西','53':'云南','52':'贵州','46':'海南','50':'重庆','51':'四川','65':'新疆','15':'内蒙古','21':'辽宁','22':'吉林','64':'宁夏','61':'陕西','23':'黑龙江','54':'西藏','63':'青海','62':'甘肃'
};

const getEnv = (env, names, fallback = '') => {
  for (const name of names) {
    const value = env?.[name];
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim();
  }
  return fallback;
};

const normalizeProvince = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '31';
  if (PROVINCES[raw]) return raw;
  const cleaned = raw.replace(/省|市|自治区|壮族|回族|维吾尔/g, '');
  const found = Object.entries(PROVINCES).find(([, name]) => name === cleaned || name.includes(cleaned) || cleaned.includes(name));
  return found ? found[0] : raw;
};

const NAMES = [
  ['GAS_92', '92#'],
  ['GAS_95', '95#'],
  ['GAS_98', '98#'],
  ['E92', 'E92#'],
  ['E95', 'E95#'],
  ['AIPAO95', '爱跑95#'],
  ['AIPAO98', '爱跑98#'],
  ['AIPAOE92', '爱跑E92#'],
  ['AIPAOE95', '爱跑E95#'],
  ['AIPAOE98', '爱跑E98#'],
  ['CHAI_0', '0#'],
  ['CHAI_10', '-10#'],
  ['CHAI_20', '-20#'],
  ['CHAI_35', '-35#']
];

const KEY_MAP = {
  CHAI_0: 'CHECHAI_0',
  CHAI_10: 'CHECHAI_10',
  AIPAO95: 'AIPAO_GAS_95',
  AIPAO98: 'AIPAO_GAS_98',
  AIPAOE92: 'AIPAO_GAS_E92',
  AIPAOE95: 'AIPAO_GAS_E95',
  AIPAOE98: 'AIPAO_GAS_E98'
};

const normalizeFuel = (value) => String(value || '')
  .trim()
  .toUpperCase()
  .replace(/＃/g, '#')
  .replace(/号/g, '#')
  .replace(/#/g, '')
  .replace(/\s+/g, '');

const matchFuel = (item, fuel) => {
  const target = normalizeFuel(fuel);
  if (!target) return false;
  return [item.name, item.rawKey, item.key]
    .map(normalizeFuel)
    .some((value) => value === target || value.endsWith(target));
};

const parseFuels = (value) => String(value || '')
  .split(/[,，、\s]+/)
  .map((item) => item.trim())
  .filter(Boolean);

const selectFuelItems = (items, fuels) => {
  const selected = [];
  for (const fuel of fuels) {
    const item = items.find((candidate) => matchFuel(candidate, fuel));
    if (item && !selected.includes(item)) selected.push(item);
  }
  return selected.length ? selected : items;
};

const color = {
  red: '#FF3B30',
  green: '#34C759',
  primary: { light: '#111111', dark: '#FFFFFF' },
  bg: { light: '#FFFFFF', dark: '#000000' }
};

const parseSetCookie = (headers) => {
  let values = [];
  if (headers?.getAll) {
    try {
      const v = headers.getAll('set-cookie');
      if (v) values = values.concat(v);
    } catch (_) {}
  }
  if (!values.length && headers?.get) {
    try {
      const v = headers.get('set-cookie');
      if (v) values = values.concat(Array.isArray(v) ? v : [v]);
    } catch (_) {}
  }
  return values
    .flatMap((v) => Array.isArray(v) ? v : String(v).split(/,\s*(?=[A-Za-z0-9_]+=)/))
    .map((v) => String(v).split(';')[0].trim())
    .filter(Boolean)
    .join(';');
};

const toNumber = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const stringToBase64 = (str) => {
  if (typeof Buffer !== 'undefined') return Buffer.from(str, 'utf8').toString('base64');
  const encoded = encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  return btoa(encoded);
};
const lineChartSVG = (arr, { color = '#34C759', width = 120, height = 34, lineWidth = 2 } = {}) => {
  const nums = (arr || []).map(Number).filter(Number.isFinite).slice(-24);
  if (nums.length < 2) return null;

  const pad = Math.max(3, Math.ceil(lineWidth));
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min || 1;
  const points = nums.map((n, i) => {
    const x = pad + (width - pad * 2) * (i / (nums.length - 1));
    const y = pad + (height - pad * 2) * (1 - ((n - min) / range));
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const bottom = height - pad;
  const area = `${points[0]} ${points.slice(1).join(' ')} ${width - pad},${bottom} ${pad},${bottom}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity="0.24"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><polygon points="${area}" fill="url(#fill)"/><polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="${lineWidth}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
  return `data:image/svg+xml;base64,${stringToBase64(svg)}`;
};

const nextRefresh = (minutes = 60) => new Date(Date.now() + minutes * 60 * 1000).toISOString();

const COMMON_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  'Referer': `${BASE}/index.html`,
  'Origin': 'https://cx.sinopecsales.com'
};

async function readJSONResponse(resp) {
  const textBody = await resp.text();
  try {
    return JSON.parse(textBody);
  } catch (e) {
    throw new Error(`接口返回异常 HTTP ${resp.status || ''}: ${textBody.slice(0, 80)}`);
  }
}

async function loadData(ctx, province) {
  const initResp = await ctx.http.get(`${BASE}/data/initMainData`, { headers: COMMON_HEADERS, credentials: 'include', timeout: 15000 });
  const initJSON = await readJSONResponse(initResp);
  const cookie = parseSetCookie(initResp.headers);

  let current = initJSON;
  const headers = {
    ...COMMON_HEADERS,
    'Content-Type': 'application/json;charset=UTF-8'
  };
  if (cookie) headers.Cookie = cookie;
  const resp = await ctx.http.post(`${BASE}/data/switchProvince`, {
    headers,
    body: { provinceId: String(province) },
    credentials: 'include',
    timeout: 15000
  });
  const switched = await readJSONResponse(resp);
  if (switched?.data?.provinceCheck || switched?.data?.area?.length) current = switched;

  const histResp = await ctx.http.get(`${BASE}/data/initOilPrice`, {
    headers: cookie ? { ...COMMON_HEADERS, Cookie: cookie } : COMMON_HEADERS,
    credentials: 'include',
    timeout: 15000
  });
  const history = await readJSONResponse(histResp);
  return { current, history };
}

function extractItems(current, history, province, areaIndex, maxCount) {
  let { provinceCheck, provinceData, area } = current.data || current;
  area = area || [];
  if (area.length) {
    const idx = Math.max(0, Math.min(area.length - 1, areaIndex));
    provinceCheck = area[idx].areaCheck;
    provinceData = area[idx].areaData;
  }

  const historyData = (((history.data || {}).area || []).length
    ? history.data.area[Math.max(0, Math.min(history.data.area.length - 1, areaIndex))].areaData
    : (history.data || {}).provinceData || []
  ).slice().reverse();

  const items = [];
  for (const [rawKey, name] of NAMES) {
    if (provinceCheck?.[rawKey] === 'Y') {
      const key = KEY_MAP[rawKey] || rawKey;
      const offset = Number(provinceData?.[`${key}_STATUS`] ?? 0);
      const series = historyData.map((it) => it?.[key]).map(Number).filter(Number.isFinite);
      items.push({
        rawKey,
        key,
        name,
        price: provinceData?.[key],
        offset,
        series,
        up: offset > 0
      });
    }
    if (items.length >= maxCount) break;
  }
  return {
    provinceName: provinceCheck?.PROVINCE_NAME || PROVINCES[province] || province,
    items
  };
}

const text = (value, opts = {}) => ({ type: 'text', text: String(value ?? ''), ...opts });
const spacer = (length) => length == null ? { type: 'spacer' } : { type: 'spacer', length };

function row(item, compact = false) {
  const c = item.up ? color.red : color.green;
  const sign = item.offset > 0 ? '+' : '';
  const chart = lineChartSVG(item.series, { color: c, width: compact ? 92 : 120, height: compact ? 28 : 32, lineWidth: compact ? 1.8 : 2 });
  return {
    type: 'stack',
    direction: 'row',
    alignItems: 'center',
    gap: compact ? 6 : 10,
    children: [
      text(item.up ? '▲' : '▼', { font: { size: compact ? 11 : 13, weight: 'semibold' }, textColor: c, width: compact ? 10 : 12 }),
      text(item.name, { font: { size: compact ? 13 : 16, weight: 'semibold' }, textColor: color.primary, width: compact ? 46 : 58, maxLines: 1, minScale: 0.7 }),
      chart
        ? { type: 'image', src: chart, width: compact ? 92 : 120, height: compact ? 28 : 32, resizable: true, resizeMode: 'contain', flex: 1 }
        : text('—', { font: { size: compact ? 12 : 13 }, textColor: c, flex: 1 }),
      {
        type: 'stack',
        direction: 'column',
        alignItems: 'end',
        width: compact ? 56 : 66,
        children: [
          text(`¥ ${item.price ?? '-'}`, { font: { size: compact ? 13 : 15, weight: 'semibold' }, textColor: color.primary, textAlign: 'right', maxLines: 1 }),
          text(`${sign}${item.offset || 0}`, { font: { size: compact ? 10 : 11, weight: 'medium' }, textColor: c, textAlign: 'right', maxLines: 1 })
        ]
      }
    ]
  };
}

function renderWidget(ctx, payload, pref) {
  const family = ctx.widgetFamily || 'systemMedium';
  const isSmall = family === 'systemSmall';
  const isLarge = family === 'systemLarge' || family === 'systemExtraLarge';
  const isLock = family && family.startsWith('accessory');
  const items = payload.items || [];
  const first = pref.fuel ? (items.find((item) => matchFuel(item, pref.fuel)) || items[0]) : items[0];

  if (isLock) {
    const line = first ? `${payload.provinceName} ${first.name} ¥${first.price}` : `${payload.provinceName} 油价`;
    return {
      type: 'widget',
      refreshAfter: nextRefresh(60),
      padding: family === 'accessoryInline' ? 0 : 4,
      children: [text(line, { font: { size: 'caption1', weight: 'semibold' }, maxLines: family === 'accessoryRectangular' ? 2 : 1, minScale: 0.55 })]
    };
  }

  if (isSmall && first) {
    const c = first.up ? color.red : color.green;
    const chart = lineChartSVG(first.series, { color: c, width: 142, height: 54, lineWidth: 2.2 });
    return {
      type: 'widget',
      refreshAfter: nextRefresh(60),
      padding: 14,
      gap: 8,
      backgroundColor: color.bg,
      url: BASE,
      children: [
        { type: 'stack', direction: 'row', alignItems: 'center', gap: 4, children: [
          text(first.up ? '▲' : '▼', { font: { size: 13, weight: 'semibold' }, textColor: c }),
          text(first.name, { font: { size: 17, weight: 'semibold' }, textColor: color.primary })
        ]},
        spacer(),
        chart
          ? { type: 'image', src: chart, width: 142, height: 54, resizable: true, resizeMode: 'contain' }
          : text('—', { font: { size: 19 }, textColor: c }),
        spacer(),
        { type: 'stack', direction: 'row', alignItems: 'end', children: [
          text(`¥ ${first.price ?? '-'}`, { font: { size: 22, weight: 'bold' }, textColor: color.primary, maxLines: 1, minScale: 0.6 }),
          spacer(),
          text(`${first.offset > 0 ? '+' : ''}${first.offset || 0}`, { font: { size: 13, weight: 'medium' }, textColor: c })
        ]}
      ]
    };
  }

  const visible = pref.fuels.length ? selectFuelItems(items, pref.fuels) : items.slice(0, isLarge ? 7 : 3);
  return {
    type: 'widget',
    refreshAfter: nextRefresh(60),
    padding: [12, 12, 12, 12],
    gap: isLarge ? 8 : 6,
    backgroundColor: color.bg,
    url: BASE,
    children: [
      ...visible.map((it) => row(it, !isLarge)),
      spacer()
    ]
  };
}

function errorWidget(message) {
  return {
    type: 'widget',
    refreshAfter: nextRefresh(20),
    padding: 16,
    backgroundColor: color.bg,
    children: [
      text('中国石化油价', { font: { size: 'headline', weight: 'bold' }, textColor: color.primary }),
      spacer(8),
      text(message || '加载失败', { font: { size: 'footnote' }, textColor: color.red, maxLines: 4 })
    ]
  };
}

export default async function(ctx) {
  const env = ctx.env || {};
  const pref = {
    province: normalizeProvince(getEnv(env, ['PROVINCE', 'PROVINCE_ID', 'province', 'provinceId', 'Province'], '31')),
    area: toNumber(getEnv(env, ['AREA', 'AREA_INDEX', 'area', 'areaIndex'], '0'), 0),
    fuel: getEnv(env, ['FUEL', 'fuel', 'OIL', 'oil'], ''),
    fuels: parseFuels(getEnv(env, ['FUELS', 'fuels', 'OILS', 'oils'], ''))
  };

  try {
    const { current, history } = await loadData(ctx, pref.province);
    const defaultCount = ctx.widgetFamily === 'systemLarge' || ctx.widgetFamily === 'systemExtraLarge' ? 7 : 3;
    const payload = extractItems(current, history, pref.province, pref.area, (pref.fuel || pref.fuels.length) ? NAMES.length : defaultCount);
    if (!payload.items.length) return errorWidget('未获取到当前地区油价数据');
    return renderWidget(ctx, payload, pref);
  } catch (e) {
    return errorWidget(`加载失败：${e && e.message ? e.message : e}`);
  }
}
