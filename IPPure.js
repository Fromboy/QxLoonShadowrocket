/*
 * IPPure - 节点 IP 纯净度检测
 * Egern Widget 版本
 *
 * 数据源：https://my.ippure.com/v1/info
 *
 * env 参数：
 *   MARK_IP=true/false       是否打码 IP，默认 true
 *   REFRESH_MINUTES=10       刷新间隔，默认 10 分钟
 *   LABEL=IP PURITY          自定义标题
 */

const API_URL = 'https://my.ippure.com/v1/info'

const C = {
  bg0: { light: '#F6F8FA', dark: '#0D1117' },
  bg1: { light: '#FFFFFF', dark: '#161B22' },
  card: { light: '#FFFFFF', dark: '#1C1C1E' },
  hairline: { light: '#D0D7DE', dark: '#30363D' },
  text: { light: '#24292F', dark: '#F0F6FC' },
  muted: { light: '#57606A', dark: '#8B949E' },
  faint: { light: '#6E7781', dark: '#6E7681' },
  icon: { light: '#6E7781', dark: '#8E8E93' },

  green: { light: '#1A7F37', dark: '#30D158' },
  amber: { light: '#9A6700', dark: '#FF9F0A' },
  yellow: { light: '#B08800', dark: '#FFD60A' },
  red: { light: '#CF222E', dark: '#FF453A' },
  gray: { light: '#6E7781', dark: '#8E8E93' },
  blue: { light: '#0969DA', dark: '#58A6FF' },

  greenSoft: { light: '#DAFBE1', dark: '#30D15822' },
  amberSoft: { light: '#FFF8C5', dark: '#FF9F0A22' },
  yellowSoft: { light: '#FFF8C5', dark: '#FFD60A22' },
  redSoft: { light: '#FFEBE9', dark: '#FF453A22' },
  graySoft: { light: '#F6F8FA', dark: '#8E8E9322' },
  blueSoft: { light: '#DDF4FF', dark: '#58A6FF22' },
}

export default async function(ctx) {
  const env = ctx.env || {}
  const family = ctx.widgetFamily || 'systemMedium'
  const markIP = String(env.MARK_IP || 'true').toLowerCase() === 'true'
  const refreshMinutes = readNumber(env.REFRESH_MINUTES, 10)
  const title = env.LABEL || 'IP PURITY'

  let data
  try {
    const resp = await ctx.http.get(API_URL, { timeout: 8000 })
    data = await resp.json()
  } catch (e) {
    return errorWidget(title, '请求失败', String(e), refreshMinutes)
  }

  const ip = data?.ip || ''
  if (!ip) {
    return errorWidget(title, '未获取到 IP', '接口返回数据缺少 ip 字段', refreshMinutes)
  }

  const ipLabel = ip.includes(':') ? 'IPv6' : 'IPv4'
  const showIP = markIP ? maskIP(ip) : ip
  const countryCode = data?.countryCode || ''
  const flag = flagEmoji(countryCode)
  const location = compactLocation(data, flag)
  const asnText = data?.asn ? `AS${data.asn}` : 'AS-'
  const orgText = data?.asOrganization || '-'
  const risk = extractRisk(data)
  const hasRiskScore = Number.isFinite(risk)
  const displayRisk = hasRiskScore ? risk : 0
  const level = riskLevel(displayRisk)
  const isResidential = Boolean(data?.isResidential)
  const residentialLabel = isResidential ? '住宅/家宽' : '机房/商业'
  const residentialIcon = isResidential ? 'house.fill' : 'building.2.fill'
  const residentialColor = isResidential ? C.green : C.amber
  const display = displayState(displayRisk, isResidential, hasRiskScore)

  const model = {
    title,
    ip,
    showIP,
    ipLabel,
    location: location || '-',
    countryCode: countryCode || '--',
    asnText,
    orgText,
    risk: displayRisk,
    hasRiskScore,
    level,
    display,
    isResidential,
    residentialLabel,
    residentialIcon,
    residentialColor,
    refreshMinutes,
    now: new Date().toISOString(),
  }

  if (family === 'accessoryInline') return inlineWidget(model)
  if (family === 'accessoryCircular') return circularWidget(model)
  if (family === 'accessoryRectangular') return rectangularWidget(model)
  if (family === 'systemSmall') return smallWidget(model)

  return mainWidget(model, family === 'systemLarge' || family === 'systemExtraLarge')
}

function errorWidget(title, msg, detail, refreshMinutes) {
  return {
    type: 'widget',
    refreshAfter: nextRefresh(refreshMinutes),
    backgroundGradient: backgroundGradient(),
    padding: 14,
    gap: 8,
    children: [
      {
        type: 'stack',
        direction: 'row',
        alignItems: 'center',
        gap: 7,
        children: [
          { type: 'image', src: 'sf-symbol:network.slash', color: C.red, width: 16, height: 16 },
          { type: 'text', text: title, font: { size: 'subheadline', weight: 'semibold' }, textColor: C.text },
        ],
      },
      { type: 'spacer' },
      { type: 'text', text: msg, font: { size: 'footnote', weight: 'semibold' }, textColor: C.red, maxLines: 1 },
      { type: 'text', text: detail || '-', font: { size: 'caption2' }, textColor: C.muted, maxLines: 2, minScale: 0.75 },
    ],
  }
}

function inlineWidget(m) {
  return {
    type: 'widget',
    refreshAfter: nextRefresh(m.refreshMinutes),
    children: [{
      type: 'text',
      text: `${m.countryCode} · ${m.display.shortText} · ${m.showIP}`,
      font: { size: 'caption1', weight: 'semibold' },
    }],
  }
}

function circularWidget(m) {
  return {
    type: 'widget',
    refreshAfter: nextRefresh(m.refreshMinutes),
    padding: 4,
    gap: 1,
    children: [
      { type: 'spacer' },
      { type: 'image', src: `sf-symbol:${m.display.icon}`, color: m.display.color, width: 22, height: 22 },
      {
        type: 'text',
        text: m.display.value,
        font: { size: 'title3', weight: 'black', family: 'Menlo' },
        textColor: m.display.color,
        textAlign: 'center',
        maxLines: 1,
        minScale: 0.75,
      },
      { type: 'text', text: m.display.label, font: { size: 'caption2' }, textColor: C.muted, textAlign: 'center' },
      { type: 'spacer' },
    ],
  }
}

function rectangularWidget(m) {
  return {
    type: 'widget',
    refreshAfter: nextRefresh(m.refreshMinutes),
    padding: [3, 8],
    gap: 3,
    children: [
      {
        type: 'stack',
        direction: 'row',
        alignItems: 'center',
        gap: 5,
        children: [
          { type: 'image', src: `sf-symbol:${m.display.icon}`, color: m.display.color, width: 12, height: 12 },
          {
            type: 'text',
            text: `${m.countryCode} · ${m.display.label}`,
            font: { size: 11, weight: 'semibold' },
            textColor: m.display.color,
            maxLines: 1,
          },
          { type: 'spacer' },
          { type: 'text', text: m.display.value, font: { size: 11, weight: 'bold', family: 'Menlo' }, textColor: m.display.color },
        ],
      },
      {
        type: 'text',
        text: `${m.ipLabel}: ${m.showIP}`,
        font: { size: 12, weight: 'semibold', family: 'Menlo' },
        textColor: C.text,
        maxLines: 1,
        minScale: 0.65,
      },
      {
        type: 'text',
        text: `${m.asnText} · ${truncate(m.orgText, 26)}`,
        font: { size: 10 },
        textColor: C.muted,
        maxLines: 1,
        minScale: 0.75,
      },
    ],
  }
}

function smallWidget(m) {
  return {
    type: 'widget',
    refreshAfter: nextRefresh(m.refreshMinutes),
    backgroundGradient: backgroundGradient(),
    padding: 13,
    gap: 7,
    url: 'egern://',
    children: [
      headerLine(m.title, m.display),
      {
        type: 'stack',
        direction: 'row',
        alignItems: 'center',
        children: [
          { type: 'text', text: m.countryCode, font: { size: 'title3', weight: 'bold', family: 'Menlo' }, textColor: C.text },
          { type: 'spacer' },
          {
            type: 'stack',
            direction: 'column',
            alignItems: 'end',
            gap: 0,
            children: [
              { type: 'text', text: m.display.value, font: { size: 'title', weight: 'black', family: 'Menlo' }, textColor: m.display.color },
              { type: 'text', text: m.display.label, font: { size: 'caption2', weight: 'semibold' }, textColor: m.display.color },
            ],
          },
        ],
      },
      capsule(`${m.ipLabel}  ${m.showIP}`, m.display.soft, C.text),
      { type: 'spacer' },
      { type: 'text', text: m.location, font: { size: 'caption2' }, textColor: C.muted, maxLines: 1 },
      { type: 'text', text: `${m.asnText} · ${truncate(m.orgText, 18)}`, font: { size: 'caption2', family: 'Menlo' }, textColor: C.faint, maxLines: 1, minScale: 0.75 },
    ],
  }
}

function mainWidget(m, isLarge) {
  return {
    type: 'widget',
    refreshAfter: nextRefresh(m.refreshMinutes),
    backgroundGradient: backgroundGradient(),
    padding: 14,
    gap: 0,
    url: 'egern://',
    children: [
      {
        type: 'stack',
        direction: 'row',
        alignItems: 'center',
        gap: 8,
        children: [
          { type: 'image', src: `sf-symbol:${m.display.icon}`, color: m.display.color, width: 15, height: 15 },
          { type: 'text', text: m.title, font: { size: 12, weight: 'heavy', family: 'Menlo' }, textColor: C.muted, maxLines: 1 },
          statusBadge(m),
        ],
      },

      { type: 'spacer', length: 9 },

      {
        type: 'stack',
        direction: 'row',
        alignItems: 'start',
        gap: 12,
        children: [
          {
            type: 'stack',
            direction: 'column',
            alignItems: 'start',
            gap: 4,
            flex: 1,
            children: [
              {
                type: 'text',
                text: 'RISK SCORE',
                font: { size: 8, weight: 'semibold', family: 'Menlo' },
                textColor: C.faint,
                maxLines: 1,
              },
              {
                type: 'stack',
                direction: 'row',
                alignItems: 'center',
                gap: 8,
                children: [
                  {
                    type: 'text',
                    text: m.display.value,
                    font: { size: 28, weight: 'black', family: 'Menlo' },
                    textColor: m.display.color,
                    maxLines: 1,
                    minScale: 0.72,
                  },
                  {
                    type: 'text',
                    text: m.display.label,
                    font: { size: 12, weight: 'semibold' },
                    textColor: C.muted,
                    maxLines: 1,
                  },
                ],
              },
            ],
          },
          {
            type: 'stack',
            direction: 'column',
            alignItems: 'end',
            gap: 5,
            flex: 1,
            children: [
              compactInfo('位置', m.location, C.text),
              compactInfo('ASN', m.asnText, C.text),
              compactInfo('类型', m.residentialLabel, m.residentialColor),
            ],
          },
        ],
      },

      { type: 'spacer', length: 2 },

      ipLine(m),

      { type: 'spacer' },
      {
        type: 'stack',
        direction: 'row',
        alignItems: 'center',
        gap: 4,
        children: [
          { type: 'image', src: 'sf-symbol:clock', color: C.faint, width: 10, height: 10 },
          { type: 'text', text: `每 ${m.refreshMinutes} 分钟刷新`, font: { size: 'caption2' }, textColor: C.faint },
          { type: 'spacer' },
          { type: 'text', text: '更新于 ', font: { size: 'caption2' }, textColor: C.faint },
          { type: 'date', date: m.now, format: 'relative', font: { size: 'caption2' }, textColor: C.faint },
        ],
      },
    ],
  }
}

function headerLine(title, level) {
  return {
    type: 'stack',
    direction: 'row',
    alignItems: 'center',
    gap: 6,
    children: [
      { type: 'image', src: `sf-symbol:${level.icon}`, color: level.color, width: 14, height: 14 },
      { type: 'text', text: title, font: { size: 'caption1', weight: 'semibold' }, textColor: C.muted, maxLines: 1 },
      { type: 'spacer' },
      {
        type: 'stack',
        direction: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: level.soft,
        borderRadius: 5,
        padding: [2, 6],
        children: [
          { type: 'stack', width: 6, height: 6, borderRadius: 3, backgroundColor: level.color },
          { type: 'text', text: level.label, font: { size: 9, weight: 'semibold' }, textColor: level.color, maxLines: 1 },
        ],
      },
    ],
  }
}

function statusBadge(m) {
  return {
    type: 'stack',
    direction: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: m.display.soft,
    borderRadius: 6,
    padding: [2, 8],
    children: [
      { type: 'stack', width: 6, height: 6, borderRadius: 3, backgroundColor: m.display.color },
      {
        type: 'text',
        text: badgeText(m),
        font: { size: 10, weight: 'semibold', family: 'Menlo' },
        textColor: m.display.color,
        maxLines: 1,
      },
    ],
  }
}

function badgeText(m) {
  if (m.risk >= 80) return 'CRITICAL'
  if (m.risk >= 70) return 'HIGH RISK'
  if (m.risk >= 40) return 'MID RISK'
  return 'LOW RISK'
}

function miniMetric(label, value, color) {
  return {
    type: 'stack',
    direction: 'column',
    alignItems: 'center',
    gap: 1,
    flex: 1,
    children: [
      { type: 'text', text: label, font: { size: 9, weight: 'semibold', family: 'Menlo' }, textColor: C.faint, maxLines: 1 },
      { type: 'text', text: value || '-', font: { size: 11, weight: 'bold', family: 'Menlo' }, textColor: color || C.text, maxLines: 1, minScale: 0.75 },
    ],
  }
}

function compactInfo(label, value, color) {
  return {
    type: 'stack',
    direction: 'row',
    alignItems: 'center',
    gap: 6,
    width: 166,
    children: [
      {
        type: 'text',
        text: label,
        font: { size: 10, weight: 'medium' },
        textColor: C.muted,
        maxLines: 1,
        width: 28,
      },
      {
        type: 'text',
        text: value || '-',
        font: { size: 11, weight: 'semibold' },
        textColor: color || C.text,
        flex: 1,
        maxLines: 1,
        minScale: 0.72,
        textAlign: 'left',
      },
    ],
  }
}

function ipLine(m) {
  return {
    type: 'stack',
    direction: 'row',
    alignItems: 'center',
    gap: 7,
    children: [
      { type: 'image', src: 'sf-symbol:network', color: C.icon, width: 12, height: 12 },
      { type: 'text', text: m.ipLabel, font: { size: 10, weight: 'semibold', family: 'Menlo' }, textColor: C.muted, maxLines: 1 },
      {
        type: 'text',
        text: m.showIP,
        font: { size: 12, weight: 'bold', family: 'Menlo' },
        textColor: C.text,
        flex: 1,
        maxLines: 1,
        minScale: 0.62,
        textAlign: 'right',
      },
    ],
  }
}

function capsule(text, bg, color) {
  return {
    type: 'stack',
    direction: 'row',
    backgroundColor: bg,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: C.hairline,
    padding: [5, 7],
    children: [{
      type: 'text',
      text,
      font: { size: 11, weight: 'medium', family: 'Menlo' },
      textColor: color,
      maxLines: 1,
      minScale: 0.68,
      flex: 1,
    }],
  }
}

function row(icon, iconColor, label, value, valueColor) {
  return {
    type: 'stack',
    direction: 'row',
    alignItems: 'center',
    gap: 7,
    children: [
      { type: 'image', src: `sf-symbol:${icon}`, color: iconColor, width: 13, height: 13 },
      { type: 'text', text: label, font: { size: 'caption1' }, textColor: C.muted, flex: 1 },
      {
        type: 'text',
        text: value || '-',
        font: { size: 'caption1', weight: 'medium', family: 'Menlo' },
        textColor: valueColor || C.text,
        maxLines: 1,
        minScale: 0.68,
        textAlign: 'right',
      },
    ],
  }
}

function asnRow(m) {
  return {
    type: 'stack',
    direction: 'row',
    alignItems: 'center',
    gap: 7,
    children: [
      { type: 'image', src: 'sf-symbol:building.2.fill', color: C.icon, width: 13, height: 13 },
      { type: 'text', text: 'ASN', font: { size: 'caption1' }, textColor: C.muted, flex: 1 },
      {
        type: 'stack',
        direction: 'row',
        alignItems: 'center',
        gap: 5,
        children: [
          {
            type: 'text',
            text: m.asnText,
            font: { size: 'caption1', weight: 'semibold', family: 'Menlo' },
            textColor: C.text,
            maxLines: 1,
          },
          {
            type: 'text',
            text: truncate(m.orgText, 22),
            font: { size: 'caption1', weight: 'medium' },
            textColor: C.text,
            maxLines: 1,
            minScale: 0.72,
            textAlign: 'right',
          },
        ],
      },
    ],
  }
}

function backgroundGradient() {
  return {
    type: 'linear',
    colors: [C.bg0, C.bg1],
    startPoint: { x: 0, y: 0 },
    endPoint: { x: 1, y: 1 },
  }
}

function riskLevel(risk) {
  if (!Number.isFinite(risk)) {
    return {
      label: '未知',
      icon: 'questionmark.circle.fill',
      color: C.gray,
      soft: C.graySoft,
    }
  }
  if (risk >= 80) {
    return {
      label: '极高风险',
      icon: 'exclamationmark.octagon.fill',
      color: C.red,
      soft: C.redSoft,
    }
  }
  if (risk >= 70) {
    return {
      label: '高风险',
      icon: 'exclamationmark.triangle.fill',
      color: C.amber,
      soft: C.amberSoft,
    }
  }
  if (risk >= 40) {
    return {
      label: '中等风险',
      icon: 'exclamationmark.circle.fill',
      color: C.yellow,
      soft: C.yellowSoft,
    }
  }
  return {
    label: '低风险',
    icon: 'checkmark.seal.fill',
    color: C.green,
    soft: C.greenSoft,
  }
}

function displayState(risk, isResidential, hasRiskScore) {
  if (Number.isFinite(risk)) {
    const level = riskLevel(risk)
    return {
      value: riskText(risk),
      label: level.label,
      shortText: riskText(risk),
      icon: level.icon,
      color: level.color,
      soft: level.soft,
      hasScore: hasRiskScore,
    }
  }

  if (isResidential) {
    return {
      value: '住宅',
      label: '无评分',
      shortText: '住宅',
      icon: 'house.fill',
      color: C.green,
      soft: C.greenSoft,
      hasScore: false,
    }
  }

  return {
    value: '机房',
    label: '无评分',
    shortText: '机房',
    icon: 'building.2.fill',
    color: C.amber,
    soft: C.amberSoft,
    hasScore: false,
  }
}

function parseRisk(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN
  if (value === null || value === undefined || value === '') return NaN
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : NaN
}

function extractRisk(source) {
  const paths = [
    'fraudScore',
    'fraud_score',
    'riskScore',
    'risk_score',
    'score',
    'risk',
    'risk.score',
    'risk.value',
    'risk.fraudScore',
    'risk.fraud_score',
    'security.score',
    'security.riskScore',
    'security.risk_score',
    'security.fraudScore',
    'security.fraud_score',
    'privacy.score',
    'privacy.riskScore',
    'privacy.fraudScore',
    'ip.fraudScore',
    'ip.riskScore',
  ]

  for (const path of paths) {
    const risk = parseRisk(readPath(source, path))
    if (Number.isFinite(risk)) return risk
  }

  return scanRisk(source, 0, false)
}

function readPath(source, path) {
  if (!source) return undefined
  return path.split('.').reduce((current, key) => {
    if (current === null || current === undefined) return undefined
    return current[key]
  }, source)
}

function scanRisk(value, depth, inRiskBranch) {
  if (!value || typeof value !== 'object' || depth > 4) return NaN

  for (const [key, child] of Object.entries(value)) {
    const keyLooksRelevant = /fraud|risk|score/i.test(key)
    if (keyLooksRelevant || inRiskBranch) {
      const direct = parseRisk(child)
      if (Number.isFinite(direct)) return direct
    }

    if (child && typeof child === 'object') {
      const nested = scanRisk(child, depth + 1, inRiskBranch || keyLooksRelevant)
      if (Number.isFinite(nested)) return nested
    }
  }

  return NaN
}

function riskText(risk) {
  return Number.isFinite(risk) ? String(Math.round(risk)) : '--'
}

function readFirst(source, keys) {
  if (!source) return undefined
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null && source[key] !== '') return source[key]
  }
  return undefined
}

function compactLocation(source, flag) {
  const city = source?.city || source?.region || source?.state || ''
  const countryCode = source?.countryCode || ''
  const country = source?.country || ''

  if (city) return [flag, city].filter(Boolean).join(' ')
  if (countryCode) return [flag, countryCode].filter(Boolean).join(' ')
  if (country) return [flag, truncate(country, 18)].filter(Boolean).join(' ')
  return flag || '-'
}

function maskIP(ip) {
  if (!ip) return '-'

  if (ip.includes('.')) {
    const parts = ip.split('.')
    if (parts.length >= 4) return `${parts[0]}.${parts[1]}.••••.${parts[3]}`
    return parts.length >= 2 ? `${parts[0]}.${parts[1]}.••••` : ip
  }

  const parts = ip.split(':').filter(Boolean)
  if (parts.length >= 3) return `${parts[0]}:${parts[1]}:••••:${parts[parts.length - 1]}`
  if (parts.length === 2) return `${parts[0]}:••••:${parts[1]}`
  if (parts.length === 1) return `${parts[0]}:••••`
  return '••••'
}

function flagEmoji(code) {
  if (!code || code.length !== 2) return '🌐'
  const upper = code.toUpperCase()
  return String.fromCodePoint(
    ...upper.split('').map(char => 127397 + char.charCodeAt(0))
  )
}

function truncate(value, maxLen) {
  const text = value ? String(value) : '-'
  return text.length > maxLen ? text.slice(0, maxLen - 1) + '…' : text
}

function readNumber(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function nextRefresh(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString()
}
