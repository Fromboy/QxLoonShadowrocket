/******************************
脚本名称: SubscriptionCard
Version : v1.0.0
更新时间: 2026-06-26
平台: Egern
功能: 机场流量用量查询
脚本作者：
部分代码参考@iBL3ND    @Nullwhy
使用说明:
1. 添加到Egern脚本
2. 主界面右上角添加小组件
3. 分别添加环境变量 NAME 值为机场名称、URL 值为订阅链接、RESET 值为重置日期；大号组件支持多机场显示，分别添加 NAME1、URL1、RESET1、NAME2、URL2、RESET2、NAME3、URL3、RESET3
4. 适配小、中、大号组件，大号件支持最多3个机场同时显示；小号和中号单机场环境变量可写为 NAME、URL、RESET
5. 组件右侧热力图彩色为已用流量，灰色为未用流量；缓存为30分钟，刷新时间为组件刷新时间
**********************************/
export default async function (ctx) {
  const url = (ctx.env.URL || ctx.env.URL1 || '').trim();
  const name = (ctx.env.NAME || ctx.env.NAME1 || '').trim() || 'SUBSCRIPTION';
  const rawReset = (ctx.env.RESET || ctx.env.RESET1 || '').trim();
  const resetDay = /^\d+$/.test(rawReset) ? Number(rawReset) : null;

  const C = {
    bg: { light: '#F2F2F7', dark: '#000000' },
    card: { light: '#FFFFFF', dark: '#1C1C1E' },
    text: { light: '#111114', dark: '#F5F5F7' },
    sub: { light: '#8E8E93', dark: '#98989D' },
    weak: { light: '#AEAEB2', dark: '#636366' },
    purple: { light: '#6B5CE6', dark: '#8B7FFF' },
    green: { light: '#34C759', dark: '#5FFFB0' },
    orange: { light: '#FFB946', dark: '#FFC670' },
    red: { light: '#FF6B6B', dark: '#FF8787' },
    ringBg: { light: '#D7D7DE', dark: '#2C2C2E' }
  };

  if (ctx.widgetFamily === 'systemLarge') {
    const largeSlots = collectLargeSlots(ctx.env);
    if (largeSlots.length > 1) {
      const infos = await Promise.all(largeSlots.map(slot => fetchInfo(ctx, slot)));
      return buildLargeMultiWidget(C, infos);
    }
  }

  if (!url) return emptyWidget(C);

  const info = await fetchInfo(ctx, { url, name, resetDay });
  if (info.error) return errorWidget(C, name);

  const used = info.used || 0;
  const total = info.totalBytes || 0;
  const remain = Math.max(total - used, 0);
  const percent = total > 0 ? Math.min(Math.max((used / total) * 100, 0), 100) : 0;
  const remainPercent = 100 - percent;

  let statusColor = C.green;
  let statusText = 'ACTIVE';
  if (remainPercent <= 5) {
    statusColor = C.red;
    statusText = 'WARNING';
  } else if (remainPercent <= 20) {
    statusColor = C.orange;
    statusText = 'NOTICE';
  }

  const expireText = getExpireText(info.expire, info.remainDays);
  const daysText = info.remainDays != null ? `剩余 ${info.remainDays} 天` : '';
  const now = new Date();
  const refreshText = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  if (ctx.widgetFamily === 'systemSmall') {
    return {
      type: 'widget',
      backgroundColor: C.bg,
      padding: [12, 12],
      children: [
        {
          type: 'stack',
          direction: 'column',
          gap: 10,
          alignItems: 'center',
          children: [
            {
              type: 'stack',
              direction: 'row',
              alignItems: 'center',
              children: [
                {
                  type: 'stack',
                  direction: 'row',
                  alignItems: 'center',
                  gap: 6,
                  children: [
                    { type: 'stack', width: 13, height: 13, borderRadius: 3, backgroundColor: C.green, children: [] },
                    { type: 'text', text: name.toUpperCase(), font: { size: 11, weight: 'bold' }, textColor: C.sub, maxLines: 1 }
                  ]
                },
                { type: 'spacer' },
                {
                  type: 'stack',
                  direction: 'row',
                  alignItems: 'center',
                  gap: 5,
                  padding: [4, 8],
                  backgroundColor: { light: '#F7F7F9', dark: '#2C2C2E' },
                  borderRadius: 8,
                  children: [
                    { type: 'stack', width: 7, height: 7, borderRadius: 3.5, backgroundColor: statusColor, children: [] },
                    { type: 'text', text: statusTextZh(percent), font: { size: 11, weight: 'bold', design: 'rounded' }, textColor: statusColor, maxLines: 1 }
                  ]
                }
              ]
            },
            {
              type: 'stack',
              alignItems: 'center',
              padding: [10, 10],
              backgroundColor: C.card,
              borderRadius: 16,
              children: [buildUsageGrid(C, percent, statusColor, 12, 4)]
            }
          ]
        }
      ]
    };
  }

  return {
    type: 'widget',
    backgroundColor: C.bg,
    padding: [10, 12],
    children: [
      {
        type: 'stack',
        direction: 'column',
        gap: 10,
        children: [
          {
            type: 'stack',
            direction: 'row',
            alignItems: 'center',
            children: [
              {
                type: 'stack',
                direction: 'row',
                alignItems: 'center',
                gap: 6,
                children: [
                  { type: 'stack', width: 13, height: 13, borderRadius: 3, backgroundColor: C.green, children: [] },
                  { type: 'text', text: name.toUpperCase(), font: { size: 11, weight: 'bold' }, textColor: C.sub, maxLines: 1 }
                ]
              },
              { type: 'spacer' },
              {
                type: 'stack',
                direction: 'row',
                alignItems: 'center',
                gap: 5,
                padding: [4, 8],
                backgroundColor: { light: '#F7F7F9', dark: '#2C2C2E' },
                borderRadius: 8,
                children: [
                  { type: 'stack', width: 7, height: 7, borderRadius: 3.5, backgroundColor: statusColor, children: [] },
                  { type: 'text', text: statusTextZh(percent), font: { size: 11, weight: 'bold', design: 'rounded' }, textColor: statusColor, maxLines: 1 }
                ]
              }
            ]
          },
          {
            type: 'stack',
            direction: 'row',
            alignItems: 'center',
            gap: 10,
            children: [
              {
                type: 'stack',
                direction: 'column',
                height: 102,
                padding: [9, 10],
                backgroundColor: C.card,
                borderRadius: 14,
                flex: 1,
                children: [
                  {
                    type: 'text',
                    text: [
                      `套餐总量：${formatBytes(total)}`,
                      `剩余总量：${formatBytes(remain)}`,
                      `到期时间：${formatExpireValue(expireText)}`,
                      `到期天数：${info.remainDays != null ? `${info.remainDays} 天` : '-'}`,
                      `刷新时间：${refreshText}`
                    ].join('\n'),
                    font: { size: 11, weight: 'bold', design: 'rounded' },
                    textColor: C.text,
                    maxLines: 5
                  }
                ]
              },
              {
                type: 'stack',
                direction: 'column',
                alignItems: 'center',
                height: 102,
                padding: [9, 9],
                backgroundColor: C.card,
                borderRadius: 14,
                children: [
                  buildUsageGrid(C, percent, statusColor)
                ]
              }
            ]
          }
        ]
      }
    ]
  };
}


function collectLargeSlots(env) {
  const slots = [];
  for (let index = 1; index <= 3; index++) {
    const url = (env[`URL${index}`] || '').trim();
    if (!url) continue;
    const rawReset = (env[`RESET${index}`] || '').trim();
    slots.push({
      url,
      name: (env[`NAME${index}`] || '').trim() || `SUBSCRIPTION ${index}`,
      resetDay: /^\d+$/.test(rawReset) ? Number(rawReset) : null
    });
  }
  return slots;
}

function buildLargeMultiWidget(C, infos) {
  return {
    type: 'widget',
    backgroundColor: C.bg,
    padding: [10, 12],
    children: [
      {
        type: 'stack',
        direction: 'column',
        gap: 6,
        justifyContent: 'center',
        children: infos.slice(0, 3).map(info => buildLargeAirportCard(C, info))
      }
    ]
  };
}

function buildLargeAirportCard(C, info) {
  if (info.error) {
    return {
      type: 'stack',
      direction: 'column',
      height: 112,
      padding: [10, 12],
      backgroundColor: C.card,
      borderRadius: 18,
      children: [{ type: 'text', text: `${info.name} 获取失败`, font: { size: 13, weight: 'bold' }, textColor: C.red, maxLines: 1 }]
    };
  }

  const used = info.used || 0;
  const total = info.totalBytes || 0;
  const remain = Math.max(total - used, 0);
  const percent = total > 0 ? Math.min(Math.max((used / total) * 100, 0), 100) : 0;
  const remainPercent = 100 - percent;
  let statusColor = C.green;
  if (remainPercent <= 5) statusColor = C.red;
  else if (remainPercent <= 20) statusColor = C.orange;
  const expireText = getExpireText(info.expire, info.remainDays);

  return {
    type: 'stack',
    direction: 'column',
    height: 104,
    padding: [7, 12],
    backgroundColor: C.card,
    borderRadius: 18,
    children: [
      {
        type: 'stack',
        direction: 'row',
        alignItems: 'center',
        children: [
          {
            type: 'stack',
            direction: 'row',
            alignItems: 'center',
            gap: 7,
            children: [
              { type: 'stack', width: 13, height: 13, borderRadius: 3, backgroundColor: C.green, children: [] },
              { type: 'text', text: info.name.toUpperCase(), font: { size: 11, weight: 'bold' }, textColor: C.sub, maxLines: 1 }
            ]
          },
          { type: 'spacer' },
          {
            type: 'stack',
            direction: 'row',
            alignItems: 'center',
            gap: 5,
            padding: [4, 8],
            backgroundColor: { light: '#F7F7F9', dark: '#2C2C2E' },
            borderRadius: 8,
            children: [
              { type: 'stack', width: 7, height: 7, borderRadius: 3.5, backgroundColor: statusColor, children: [] },
              { type: 'text', text: statusTextZh(percent), font: { size: 11, weight: 'bold', design: 'rounded' }, textColor: statusColor, maxLines: 1 }
            ]
          }
        ]
      },
      {
        type: 'stack',
        direction: 'row',
        alignItems: 'center',
        gap: 10,
        children: [
          {
            type: 'text',
            text: [
              `套餐总量：${formatBytes(total)}`,
              `剩余总量：${formatBytes(remain)}`,
              `到期时间：${formatExpireValue(expireText)}`,
              `到期天数：${info.remainDays != null ? `${info.remainDays} 天` : '-'}`
            ].join('\n'),
            font: { size: 10, weight: 'bold', design: 'rounded' },
            textColor: C.text,
            maxLines: 4,
            flex: 1
          },
          {
            type: 'stack',
            direction: 'column',
            alignItems: 'center',
            children: [buildUsageGrid(C, percent, statusColor, 9, 4)]
          }
        ]
      }
    ]
  };
}

const CACHE_TIME = 30 * 60 * 1000;
const UA_LIST = [
  { 'User-Agent': 'Quantumult%20X/1.5.2' },
  { 'User-Agent': 'clash-verge-rev/2.3.1', Accept: 'application/x-yaml,text/plain,*/*' },
  { 'User-Agent': 'mihomo/1.19.3', Accept: 'application/x-yaml,text/plain,*/*' }
];

async function fetchInfo(ctx, slot) {
  const cacheKey = `sub_cache_${slot.url}`;
  const cache = await ctx.storage.get(cacheKey);
  if (cache) {
    try {
      const parsed = JSON.parse(cache);
      if (Date.now() - parsed.time < CACHE_TIME) {
        return { ...parsed.data, name: slot.name, remainDays: slot.resetDay ? getRemainingDays(slot.resetDay) : null };
      }
    } catch {}
  }

  for (const method of ['head', 'get']) {
    for (const requestUrl of buildVariants(slot.url)) {
      for (const headers of UA_LIST) {
        try {
          const resp = await ctx.http[method](requestUrl, { headers });
          const raw = resp.headers.get('subscription-userinfo') || '';
          const info = parseUserInfo(raw);
          if (!info) continue;
          const result = {
            error: null,
            used: (info.upload || 0) + (info.download || 0),
            totalBytes: info.total || 0,
            expire: info.expire || null,
            remainDays: slot.resetDay ? getRemainingDays(slot.resetDay) : null
          };
          await ctx.storage.set(cacheKey, JSON.stringify({ time: Date.now(), data: result }));
          return { ...result, name: slot.name };
        } catch {}
      }
    }
  }
  return { name: slot.name, error: true };
}

function dataLine(text, C) {
  return {
    type: 'text',
    text,
    width: 150,
    font: { size: 11, weight: 'bold', design: 'rounded' },
    textColor: C.text,
    maxLines: 1
  };
}

function statusTextZh(percent) {
  if (percent >= 95) return '告急';
  if (percent >= 80) return '偏低';
  return '充足';
}

function formatExpireValue(text) {
  return String(text || '').replace(/^到期\s*/, '');
}

function usageCellColor(index, active, C) {
  if (active <= 0) return C.green;
  const ratio = (index + 1) / active;
  if (ratio <= 0.25) return { light: '#9BE7B0', dark: '#2ECC71' };
  if (ratio <= 0.5) return { light: '#5FD37D', dark: '#5FFFB0' };
  if (ratio <= 0.75) return { light: '#FFB946', dark: '#FFC670' };
  if (ratio <= 0.9) return { light: '#FF8A4C', dark: '#FF9E64' };
  return { light: '#FF6B6B', dark: '#FF8787' };
}

function buildUsageGrid(C, percent, activeColor, cellSize = 14, cellGap = 5) {
  const total = 35;
  const active = Math.max(0, Math.min(total, Math.round((percent / 100) * total)));
  const rows = [];
  for (let row = 0; row < 5; row++) {
    const cells = [];
    for (let col = 0; col < 7; col++) {
      const index = row * 7 + col;
      cells.push({
        type: 'stack',
        width: cellSize,
        height: cellSize,
        borderRadius: Math.max(3, Math.round(cellSize / 3)),
        backgroundColor: index < active ? usageCellColor(index, active, C) : C.ringBg,
        children: []
      });
    }
    rows.push({
      type: 'stack',
      direction: 'row',
      gap: cellGap,
      children: cells
    });
  }
  return {
    type: 'stack',
    direction: 'column',
    gap: 3,
    padding: [4, 0],
    children: rows
  };
}

function emptyWidget(C) {
  return { type: 'widget', backgroundColor: C.bg, padding: 16, children: [{ type: 'text', text: '未配置订阅', font: { size: 16, weight: 'bold' }, textColor: C.text }] };
}

function errorWidget(C, name) {
  return { type: 'widget', backgroundColor: C.bg, padding: 16, children: [{ type: 'text', text: `${name} 获取失败`, font: { size: 16, weight: 'bold' }, textColor: C.red }] };
}

function buildVariants(url) {
  const seen = new Set();
  const out = [];
  const add = (value) => { if (value && !seen.has(value)) { seen.add(value); out.push(value); } };
  add(url);
  add(withParam(url, 'flag', 'clash'));
  add(withParam(url, 'flag', 'meta'));
  return out;
}

function withParam(url, key, value) {
  return `${url}${url.includes('?') ? '&' : '?'}${key}=${encodeURIComponent(value)}`;
}

function parseUserInfo(header) {
  const pairs = header.match(/\w+=[\d.eE+-]+/g) || [];
  if (!pairs.length) return null;
  return Object.fromEntries(pairs.map(pair => {
    const [key, value] = pair.split('=');
    return [key, Number(value)];
  }));
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 GB';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(1)} ${units[index]}`;
}

function getExpireText(expire, remainDays) {
  if (remainDays != null) {
    const date = new Date();
    date.setDate(date.getDate() + remainDays);
    return `到期 ${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  if (expire && Number(expire) > 0) {
    let ts = Number(expire);
    if (ts < 1e12) ts *= 1000;
    const date = new Date(ts);
    return `到期 ${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  return '到期 永久有效';
}

function getRemainingDays(resetDay) {
  const now = new Date();
  const maxDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const safeDay = Math.min(resetDay, maxDay);
  let next = new Date(now.getFullYear(), now.getMonth(), safeDay);
  if (now.getDate() >= safeDay) {
    const nextMonthMax = new Date(now.getFullYear(), now.getMonth() + 2, 0).getDate();
    next = new Date(now.getFullYear(), now.getMonth() + 1, Math.min(resetDay, nextMonthMax));
  }
  return Math.max(0, Math.ceil((next - now) / 86400000));
}
