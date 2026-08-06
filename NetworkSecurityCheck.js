/**
 * Egern widget: Network Security Check
 *
 * Create a Generic script with this file, then add it in Widget Gallery.
 * Optional env values:
 *   MONITOR_POLICY=Proxy
 *   SHOW_IP=false
 *   REFRESH_MINUTES=10
 */

const RULE_STATS_KEY = 'egern.rule-shield.stats.v1';
const TRACE_URL = 'https://www.cloudflare.com/cdn-cgi/trace';
const CAPTIVE_URL = 'https://cp.cloudflare.com/generate_204';
const IPV6_URL = 'https://api6.ipify.org?format=json';

const C = {
  bg:       { light: '#FFFFFF', dark: '#050506' },
  text:     { light: '#111114', dark: '#F7F7F8' },
  dim:      { light: '#7B7B84', dark: '#85858E' },
  panel:    { light: '#F5F5F7', dark: '#111114' },
  hairline: { light: '#E4E4E8', dark: '#242429' },
  accent:   { light: '#7446D8', dark: '#B765FF' },
  ok:       { light: '#2F9E58', dark: '#C7FF18' },
  warn:     { light: '#A06400', dark: '#FFBE3F' },
  fail:     { light: '#D64545', dark: '#FF626A' }
};

function boolEnv(ctx, key, fallback) {
  const value = ctx.env?.[key];
  if (value == null || value === '') return fallback;
  return /^(1|true|yes|on)$/i.test(value);
}

function numberEnv(ctx, key, fallback, min, max) {
  const value = Number(ctx.env?.[key]);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function parseTrace(body) {
  return String(body || '')
    .split('\n')
    .reduce((result, line) => {
      const index = line.indexOf('=');
      if (index > 0) result[line.slice(0, index)] = line.slice(index + 1).trim();
      return result;
    }, {});
}

async function trace(ctx, policy) {
  try {
    const options = { timeout: 4500 };
    if (policy) options.policy = policy;
    const response = await ctx.http.get(TRACE_URL, options);
    const data = parseTrace(await response.text());
    return data.ip ? { ok: true, data } : { ok: false, data: {} };
  } catch {
    return { ok: false, data: {} };
  }
}

async function captiveCheck(ctx, policy) {
  try {
    const options = { timeout: 4000, redirect: 'manual' };
    if (policy) options.policy = policy;
    const response = await ctx.http.get(CAPTIVE_URL, options);
    return { ok: true, clear: response.status === 204, status: response.status };
  } catch {
    return { ok: false, clear: false, status: 0 };
  }
}

async function ipv6Address(ctx, policy) {
  try {
    const options = { timeout: 3500 };
    if (policy) options.policy = policy;
    const response = await ctx.http.get(IPV6_URL, options);
    const data = JSON.parse(await response.text());
    return typeof data.ip === 'string' && data.ip.includes(':') ? data.ip : '';
  } catch {
    return '';
  }
}

function check(id, label, value, state, detail) {
  return { id, label, value, state, detail };
}

function stateColor(state) {
  if (state === 'pass') return C.ok;
  if (state === 'warn') return C.warn;
  if (state === 'fail') return C.fail;
  return C.dim;
}

function maskIp(ip) {
  if (!ip) return '--';
  if (ip.includes(':')) {
    const parts = ip.split(':');
    return `${parts.slice(0, 2).join(':')}:••••:${parts.slice(-1)}`;
  }
  const parts = ip.split('.');
  return parts.length === 4 ? `${parts[0]}.${parts[1]}.•••.${parts[3]}` : ip;
}

function filterCheck(ctx) {
  const stats = ctx.storage?.getJSON(RULE_STATS_KEY);
  if (!stats || !Number(stats.totalRequests)) {
    return check('filter', '规则过滤', '未连接', 'unknown', '未读取到规则防护统计');
  }
  return check(
    'filter',
    '规则过滤',
    '运行中',
    'pass',
    `今日检查 ${Number(stats.totalRequests) || 0} 次，拦截 ${Number(stats.blocked) || 0} 次`
  );
}

function tunnelCheck(egress, direct, forcedPolicy) {
  if (!egress.ok) return check('tunnel', '出口隔离', '不可用', 'fail', '无法读取代理出口');
  if (!direct.ok) return check('tunnel', '出口隔离', '待确认', 'unknown', '直连出口不可用，无法比较');
  if (egress.data.ip !== direct.data.ip) {
    return check('tunnel', '出口隔离', '已保护', 'pass', forcedPolicy ? `策略 ${forcedPolicy}` : '代理出口与直连出口不同');
  }
  return check('tunnel', '出口隔离', '直连', 'warn', '代理出口与直连出口相同');
}

function tlsCheck(egress) {
  if (!egress.ok) return check('tls', 'TLS 传输', '不可用', 'fail', '安全连接测试失败');
  const tls = String(egress.data.tls || '').toLowerCase();
  if (tls.includes('1.3')) return check('tls', 'TLS 传输', 'TLS 1.3', 'pass', '使用当前推荐的 TLS 版本');
  if (tls.includes('1.2')) return check('tls', 'TLS 传输', 'TLS 1.2', 'pass', '连接仍符合通用安全要求');
  if (tls) return check('tls', 'TLS 传输', tls.toUpperCase(), 'warn', '检测到较旧的 TLS 版本');
  return check('tls', 'TLS 传输', '未知', 'unknown', '服务未返回 TLS 信息');
}

function portalCheck(result) {
  if (!result.ok) return check('portal', '强制门户', '待确认', 'unknown', '连通性探针失败');
  if (result.clear) return check('portal', '强制门户', '无', 'pass', 'HTTPS 204 探针正常');
  return check('portal', '强制门户', '需检查', 'warn', `探针返回 HTTP ${result.status}`);
}

function ipv6Check(egressV6, directV6, tunnel) {
  if (!egressV6) return check('ipv6', 'IPv6 路由', '未暴露', 'pass', '当前出口未检测到 IPv6');
  if (tunnel.state !== 'pass') {
    return check('ipv6', 'IPv6 路由', '直连', 'warn', '检测到 IPv6，但出口未隔离');
  }
  if (!directV6 || egressV6 !== directV6) {
    return check('ipv6', 'IPv6 路由', '已保护', 'pass', 'IPv6 已通过代理出口');
  }
  return check('ipv6', 'IPv6 路由', '疑似泄漏', 'warn', '代理与直连返回相同 IPv6');
}

async function loadSecurity(ctx) {
  const policy = String(ctx.env?.MONITOR_POLICY || '').trim();
  const [egress, direct, captive, egressV6, directV6] = await Promise.all([
    trace(ctx, policy),
    trace(ctx, 'DIRECT'),
    captiveCheck(ctx, policy),
    ipv6Address(ctx, policy),
    ipv6Address(ctx, 'DIRECT')
  ]);

  const tunnel = tunnelCheck(egress, direct, policy);
  const checks = [
    tunnel,
    tlsCheck(egress),
    portalCheck(captive),
    ipv6Check(egressV6, directV6, tunnel),
    filterCheck(ctx)
  ];
  const passed = checks.filter(item => item.state === 'pass').length;
  const warnings = checks.filter(item => item.state === 'warn').length;
  const failures = checks.filter(item => item.state === 'fail').length;
  const unknown = checks.filter(item => item.state === 'unknown').length;
  const dnsServers = Array.isArray(ctx.device?.dnsServers) ? ctx.device.dnsServers : [];

  let summary = { label: 'SECURE', color: C.ok };
  if (failures) summary = { label: 'RISK', color: C.fail };
  else if (warnings) summary = { label: 'REVIEW', color: C.warn };
  else if (unknown) summary = { label: 'PARTIAL', color: C.dim };

  return {
    checks,
    passed,
    total: checks.length,
    warnings,
    failures,
    unknown,
    summary,
    publicIp: egress.data.ip || '',
    directIp: direct.data.ip || '',
    countryCode: egress.data.loc || '--',
    colo: egress.data.colo || '--',
    dnsCount: dnsServers.length,
    dns: dnsServers[0] || '--',
    appVersion: ctx.app?.version || '--'
  };
}

function icon(name, color, size = 14) {
  return {
    type: 'image',
    src: `sf-symbol:${name}`,
    width: size,
    height: size,
    color
  };
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
  return {
    type: 'stack',
    direction: 'row',
    alignItems: 'center',
    gap: 7,
    children: [
      icon('checkmark.shield', C.accent, 14),
      text('SECURITY CHECK', 10, C.dim, 'bold'),
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
          { type: 'stack', width: 6, height: 6, borderRadius: 3, backgroundColor: data.summary.color, children: [] },
          text(data.summary.label, 9, data.summary.color === C.dim ? C.dim : C.text, 'semibold')
        ]
      }
    ]
  };
}

function checkCell(item) {
  const valueColor = item.state === 'pass' ? C.text : stateColor(item.state);
  return {
    type: 'stack',
    direction: 'column',
    gap: 3,
    flex: 1,
    children: [
      text(item.label, 9, C.dim, 'semibold'),
      text(item.value, 11, valueColor, 'semibold', { minScale: 0.72 })
    ]
  };
}

function mediumWidget(data, ctx) {
  const showIp = boolEnv(ctx, 'SHOW_IP', false);
  const refreshMinutes = numberEnv(ctx, 'REFRESH_MINUTES', 10, 5, 60);
  const ip = showIp ? data.publicIp || '--' : maskIp(data.publicIp);
  const portal = data.checks[2];
  const filter = data.checks[4];
  const secondaryColor = [portal, filter].some(item => item.state === 'fail')
    ? C.fail
    : [portal, filter].some(item => item.state === 'warn')
      ? C.warn
      : C.dim;
  return {
    type: 'widget',
    backgroundColor: C.bg,
    padding: [13, 16, 13, 16],
    gap: 6,
    refreshAfter: new Date(Date.now() + refreshMinutes * 60 * 1000).toISOString(),
    children: [
      header(data),
      {
        type: 'stack',
        direction: 'row',
        alignItems: 'end',
        children: [
          {
            type: 'stack',
            direction: 'column',
            gap: 1,
            children: [
              text(`${data.passed}/${data.total}`, 28, C.text, 'bold', {
                font: { size: 28, weight: 'bold', family: 'Menlo' }
              }),
              text('项检查通过', 10, C.dim, 'medium')
            ]
          },
          { type: 'spacer' },
          {
            type: 'stack',
            direction: 'column',
            alignItems: 'end',
            gap: 2,
            children: [
              text(`${data.countryCode} · ${data.colo}`, 11, C.text, 'semibold'),
              text(ip, 9, C.dim, 'medium', { font: { size: 9, weight: 'medium', family: 'Menlo' }, minScale: 0.7 })
            ]
          }
        ]
      },
      { type: 'stack', height: 1, backgroundColor: C.hairline, children: [] },
      {
        type: 'stack',
        direction: 'row',
        gap: 12,
        children: [
          checkCell(data.checks[0]),
          checkCell(data.checks[1]),
          checkCell(data.checks[3])
        ]
      },
      {
        type: 'stack',
        direction: 'row',
        alignItems: 'center',
        children: [
          text(`门户 ${portal.value} · 过滤 ${filter.value}`, 9, secondaryColor, 'medium', { flex: 1 }),
          text(`DNS ${data.dnsCount}`, 9, C.dim, 'semibold')
        ]
      }
    ]
  };
}

function smallWidget(data, ctx) {
  const refreshMinutes = numberEnv(ctx, 'REFRESH_MINUTES', 10, 5, 60);
  return {
    type: 'widget',
    backgroundColor: C.bg,
    padding: 14,
    gap: 5,
    refreshAfter: new Date(Date.now() + refreshMinutes * 60 * 1000).toISOString(),
    children: [
      header(data),
      { type: 'spacer' },
      text(`${data.passed}/${data.total}`, 32, C.text, 'bold', {
        font: { size: 32, weight: 'bold', family: 'Menlo' }
      }),
      text('项检查通过', 10, C.dim, 'medium'),
      { type: 'spacer' },
      checkCell(data.checks[0]),
      checkCell(data.checks[1])
    ]
  };
}

function detailRow(item) {
  const symbols = {
    tunnel: 'point.3.connected.trianglepath.dotted',
    tls: 'lock.shield',
    portal: 'rectangle.connected.to.line.below',
    ipv6: 'network',
    filter: 'shield.lefthalf.filled'
  };
  return {
    type: 'stack',
    direction: 'row',
    alignItems: 'center',
    gap: 8,
    children: [
      icon(symbols[item.id] || 'checkmark.circle', stateColor(item.state), 12),
      {
        type: 'stack',
        direction: 'column',
        gap: 1,
        flex: 1,
        children: [
          text(item.label, 10, C.text, 'semibold'),
          text(item.detail, 9, C.dim, 'medium', { minScale: 0.68 })
        ]
      },
      text(item.value, 10, stateColor(item.state), 'semibold')
    ]
  };
}

function largeWidget(data, ctx) {
  const showIp = boolEnv(ctx, 'SHOW_IP', false);
  const refreshMinutes = numberEnv(ctx, 'REFRESH_MINUTES', 10, 5, 60);
  return {
    type: 'widget',
    backgroundColor: C.bg,
    padding: 16,
    gap: 9,
    refreshAfter: new Date(Date.now() + refreshMinutes * 60 * 1000).toISOString(),
    children: [
      header(data),
      {
        type: 'stack',
        direction: 'row',
        alignItems: 'center',
        gap: 12,
        padding: [10, 14],
        backgroundColor: C.panel,
        borderRadius: 8,
        children: [
          icon('checkmark.shield.fill', C.accent, 28),
          {
            type: 'stack',
            direction: 'column',
            gap: 2,
            flex: 1,
            children: [
              text(`${data.passed}/${data.total} 项检查通过`, 16, C.text, 'bold'),
              text(`${data.countryCode} · ${data.colo} · ${showIp ? data.publicIp : maskIp(data.publicIp)}`, 9, C.dim, 'medium', { minScale: 0.65 })
            ]
          },
          text(data.summary.label, 10, data.summary.color, 'bold')
        ]
      },
      text('SECURITY DETAIL', 9, C.dim, 'bold'),
      ...data.checks.map(detailRow),
      { type: 'stack', height: 1, backgroundColor: C.hairline, children: [] },
      {
        type: 'stack',
        direction: 'row',
        children: [
          text(`DNS ${data.dnsCount} · EGERN ${data.appVersion}`, 8, C.dim, 'semibold'),
          { type: 'spacer' },
          text(`${refreshMinutes} MIN REFRESH`, 8, C.dim, 'semibold')
        ]
      }
    ]
  };
}

function lockWidget(data, family) {
  if (family === 'accessoryInline') {
    return { type: 'widget', children: [text(`安全检查 ${data.passed}/${data.total} · ${data.summary.label}`, 12, C.text, 'semibold')] };
  }
  if (family === 'accessoryCircular') {
    return {
      type: 'widget',
      padding: 4,
      children: [
        icon('checkmark.shield', C.text, 15),
        text(`${data.passed}/${data.total}`, 13, C.text, 'bold', {
          textAlign: 'center',
          font: { size: 13, weight: 'bold', family: 'Menlo' }
        })
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
        children: [icon('checkmark.shield', C.text, 12), text('网络安全检查', 11, C.text, 'semibold')]
      },
      text(`${data.passed}/${data.total} 通过 · ${data.summary.label}`, 12, C.text, 'bold')
    ]
  };
}

export default async function(ctx) {
  const data = await loadSecurity(ctx);
  const family = ctx.widgetFamily || 'systemMedium';
  if (family.startsWith('accessory')) return lockWidget(data, family);
  if (family === 'systemSmall') return smallWidget(data, ctx);
  if (family === 'systemLarge' || family === 'systemExtraLarge') return largeWidget(data, ctx);
  return mediumWidget(data, ctx);
}
