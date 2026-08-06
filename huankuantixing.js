// 还款提醒小组件 - 纯显示版
// 中号显示3张，大号显示6张

const C = {
  bg: { light: '#F2F4F8', dark: '#0C0C14' },
  card: { light: '#FFFFFF', dark: '#16161F' },
  text: { light: '#1A1A2E', dark: '#EEEEF5' },
  sub: { light: '#6E6E73', dark: '#9999AA' },
  line: { light: '#E8ECF0', dark: '#2E2E3A' },
  panel: { light: '#F5F6FA', dark: '#1A1A22' },
  warn: { light: '#F5A623', dark: '#F5C842' },
  danger: { light: '#E84C3D', dark: '#FF6B5A' },
  accent: { light: '#00C853', dark: '#7BED5A' },
  passedBg: { light: '#F0F0F2', dark: '#1A1A1A' },
  urgentBg: { light: '#FFF5F0', dark: '#1E100A' },
  black: { light: '#1A1A2E', dark: '#EEEEF5' },
};

const DUE_SOON_THRESHOLD = 30;

const pad = (n) => String(n).padStart(2, '0');

function localDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween(from, to) {
  return Math.floor((localDay(to) - localDay(from)) / (24 * 60 * 60 * 1000));
}

function dateLabel(date) {
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
}

function fullDateLabel(date) {
  return `${pad(date.getMonth() + 1)}月${pad(date.getDate())}日`;
}

function getNextDueDate(now, statementDay, dueDay, dueOffsetMonth) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  
  let sm = month;
  let sy = year;
  if (day < statementDay) {
    sm = month - 1;
    if (sm < 0) { sm = 11; sy = year - 1; }
  }
  
  let dm = sm + dueOffsetMonth;
  let dy = sy;
  if (dm > 11) { dm = 0; dy = sy + 1; }
  let due = new Date(dy, dm, dueDay);
  let remaining = daysBetween(now, due);
  
  let isPassed = false;
  if (remaining < 0) {
    isPassed = true;
    sm = sm + 1;
    if (sm > 11) { sm = 0; sy = sy + 1; }
    dm = sm + dueOffsetMonth;
    dy = sy;
    if (dm > 11) { dm = 0; dy = sy + 1; }
    due = new Date(dy, dm, dueDay);
    remaining = daysBetween(now, due);
  }
  
  let nsm, nsy;
  if (isPassed) {
    nsm = sm;
    nsy = sy;
  } else {
    nsm = sm + 1;
    nsy = sy;
    if (nsm > 11) { nsm = 0; nsy = sy + 1; }
  }
  const nextStatement = new Date(nsy, nsm, statementDay);
  const statement = new Date(sy, sm, statementDay);
  
  return { statement, nextStatement, due, remaining, isPassed };
}

function txt(value, size, weight = 'regular', color = C.text, extra = {}) {
  return {
    type: 'text',
    text: String(value),
    font: { size, weight },
    textColor: color,
    maxLines: 1,
    minScale: 0.5,
    ...extra,
  };
}

function icon(name, color, size = 16) {
  return {
    type: 'image',
    src: `sf-symbol:${name}`,
    color,
    width: size,
    height: size,
  };
}

function dueColor(remaining, isPassed) {
  if (isPassed) return { light: '#B8B8BE', dark: '#78788A' };
  if (remaining <= 0) return { light: '#E84C3D', dark: '#FF6B5A' };
  if (remaining <= 3) return { light: '#E87A3D', dark: '#FF8A5A' };
  if (remaining <= 7) return { light: '#F5A623', dark: '#F5C842' };
  return { light: '#F5B84D', dark: '#E8C84A' };
}

function dueLabel(remaining, isPassed) {
  if (isPassed) return '下一期';
  if (remaining <= 0) return '⚠️今天!';
  if (remaining <= 3) return '🔴紧急';
  if (remaining <= 7) return '🟡临期';
  return '🟠将到';
}

function formatDay(remaining, isPassed) {
  if (isPassed) return '已过';
  if (remaining === 0) return '今天';
  if (remaining === 1) return '明天';
  return remaining + '天';
}

// ============ 中号组件 ============
function mediumWidget(allCards, now) {
  const dueCards = allCards
    .filter(c => c.data.remaining <= DUE_SOON_THRESHOLD)
    .sort((a, b) => a.data.remaining - b.data.remaining)
    .slice(0, 3);

  if (dueCards.length === 0) {
    return {
      type: 'widget',
      padding: 10,
      gap: 4,
      backgroundColor: C.bg,
      children: [
        {
          type: 'stack',
          direction: 'row',
          alignItems: 'center',
          padding: [6, 12],
          backgroundColor: { light: 'rgba(0,200,5,0.06)', dark: 'rgba(123,237,90,0.04)' },
          borderRadius: 8,
          children: [
            icon('checkmark.circle.fill', { light: '#00B86B', dark: '#7BED5A' }, 14),
            { type: 'spacer', length: 6 },
            txt('✅ 无还款提醒', 11, 'bold', { light: '#00B86B', dark: '#7BED5A' }),
            { type: 'spacer' },
            txt('所有卡均超过30天', 9, 'medium', C.sub),
          ],
        },
      ],
    };
  }

  const renderCard = (card) => {
    const remaining = card.data.remaining;
    const isPassed = card.data.isPassed;
    const color = dueColor(remaining, isPassed);
    const label = dueLabel(remaining, isPassed);
    const daysToStatement = daysBetween(now, card.data.nextStatement);
    
    return {
      type: 'stack',
      direction: 'column',
      flex: 1,
      gap: 1,
      padding: [8, 10],
      backgroundColor: C.card,
      borderRadius: 8,
      borderWidth: 0,
      borderColor: { light: 'rgba(0,0,0,0)', dark: 'rgba(0,0,0,0)' },
      children: [
        {
          type: 'stack',
          direction: 'row',
          alignItems: 'center',
          gap: 3,
          children: [
            icon('creditcard.fill', color, 14),
            txt(card.shortName, 10, 'bold', C.black),
            { type: 'spacer' },
            txt(`··${card.tail}`, 7, 'medium', C.sub),
            {
              type: 'stack',
              padding: [1, 6],
              backgroundColor: color,
              borderRadius: 6,
              children: [txt(label, 6, 'bold', { light: '#FFFFFF', dark: '#FFFFFF' })],
            },
          ],
        },
        {
          type: 'stack',
          direction: 'row',
          alignItems: 'end',
          padding: [2, 0, 1, 0],
          children: [
            txt(remaining, 28, 'bold', color),
            txt('天', 9, 'semibold', color),
            { type: 'spacer' },
            txt(dateLabel(card.data.due), 9, 'medium', C.sub),
          ],
        },
        {
          type: 'stack',
          direction: 'row',
          padding: [2, 0, 0, 0],
          borderTop: { width: 0.5, color: C.line },
          children: [
            txt(`📅 ${fullDateLabel(card.data.nextStatement)}出账`, 7, 'medium', C.sub),
            { type: 'spacer' },
            txt(`距出账${daysToStatement}天`, 7, 'semibold', color),
          ],
        },
      ],
    };
  };

  const earliest = dueCards[0].data.remaining;
  const earliestPassed = dueCards[0].data.isPassed;

  return {
    type: 'widget',
    padding: 10,
    gap: 6,
    backgroundColor: C.bg,
    children: [
      {
        type: 'stack',
        direction: 'row',
        alignItems: 'center',
        padding: [4, 10],
        backgroundColor: { light: 'rgba(255,255,255,0.4)', dark: 'rgba(18,18,26,0.4)' },
        borderRadius: 8,
        borderWidth: 0.5,
        borderColor: { light: 'rgba(245,166,35,0.12)', dark: 'rgba(245,200,66,0.06)' },
        children: [
          icon('bell.fill', C.warn, 12),
          { type: 'spacer', length: 4 },
          txt('⏰ 还款提醒', 10, 'bold', C.black),
          { type: 'spacer' },
          txt(`${dueCards.length}张 · 最早${formatDay(earliest, earliestPassed)}`, 9, 'bold', dueColor(earliest, earliestPassed)),
        ],
      },
      {
        type: 'stack',
        direction: 'row',
        gap: 5,
        children: dueCards.map(c => renderCard(c)),
      },
    ],
  };
}

// ============ 大号组件 ============
function largeWidget(allCards, now) {
  const dueCards = allCards
    .filter(c => c.data.remaining <= DUE_SOON_THRESHOLD)
    .sort((a, b) => a.data.remaining - b.data.remaining);

  if (dueCards.length === 0) {
    return {
      type: 'widget',
      padding: 10,
      gap: 4,
      backgroundColor: C.bg,
      children: [
        {
          type: 'stack',
          direction: 'row',
          alignItems: 'center',
          padding: [6, 12],
          backgroundColor: { light: 'rgba(0,200,5,0.06)', dark: 'rgba(123,237,90,0.04)' },
          borderRadius: 8,
          children: [
            icon('checkmark.circle.fill', { light: '#00B86B', dark: '#7BED5A' }, 14),
            { type: 'spacer', length: 6 },
            txt('✅ 无还款提醒', 11, 'bold', { light: '#00B86B', dark: '#7BED5A' }),
            { type: 'spacer' },
            txt('所有卡均超过30天', 9, 'medium', C.sub),
          ],
        },
      ],
    };
  }

  const renderItem = (card) => {
    const remaining = card.data.remaining;
    const isPassed = card.data.isPassed;
    const color = dueColor(remaining, isPassed);
    const label = dueLabel(remaining, isPassed);
    const daysToStatement = daysBetween(now, card.data.nextStatement);
    
    return {
      type: 'stack',
      direction: 'column',
      flex: 1,
      gap: 1,
      padding: [9, 11],
      backgroundColor: C.card,
      borderRadius: 10,
      borderWidth: 0,
      borderColor: { light: 'rgba(0,0,0,0)', dark: 'rgba(0,0,0,0)' },
      shadow: {
        color: { light: 'rgba(0,0,0,0.04)', dark: 'rgba(0,0,0,0.15)' },
        radius: 4,
        offset: { width: 0, height: 2 },
        opacity: 0.3,
      },
      children: [
        {
          type: 'stack',
          direction: 'row',
          alignItems: 'center',
          gap: 4,
          children: [
            icon('creditcard.fill', color, 16),
            txt(card.shortName, 10, 'bold', C.black),
            { type: 'spacer' },
            txt(`··${card.tail}`, 7, 'medium', C.sub),
            {
              type: 'stack',
              padding: [1, 7],
              backgroundColor: color,
              borderRadius: 6,
              children: [txt(label, 6, 'bold', { light: '#FFFFFF', dark: '#FFFFFF' })],
            },
          ],
        },
        {
          type: 'stack',
          direction: 'row',
          alignItems: 'end',
          padding: [3, 0, 1, 0],
          children: [
            txt(remaining, 26, 'bold', color),
            txt('天', 9, 'semibold', color),
            { type: 'spacer' },
            txt(dateLabel(card.data.due), 9, 'medium', C.sub),
          ],
        },
        {
          type: 'stack',
          direction: 'row',
          padding: [2, 0, 0, 0],
          borderTop: { width: 0.5, color: C.line },
          children: [
            txt(`📅 ${fullDateLabel(card.data.nextStatement)}出账`, 7, 'medium', C.sub),
            { type: 'spacer' },
            txt(`距出账${daysToStatement}天`, 7, 'semibold', color),
          ],
        },
      ],
    };
  };

  const earliest = dueCards[0].data.remaining;
  const earliestPassed = dueCards[0].data.isPassed;

  const rows = [];
  for (let i = 0; i < dueCards.length; i += 2) {
    const rowItems = dueCards.slice(i, i + 2);
    const children = rowItems.map(c => renderItem(c));
    if (children.length === 1) {
      children.push({ type: 'stack', flex: 1, children: [] });
    }
    rows.push({
      type: 'stack',
      direction: 'row',
      gap: 8,
      children: children,
    });
  }

  return {
    type: 'widget',
    padding: 10,
    gap: 6,
    backgroundColor: C.bg,
    children: [
      {
        type: 'stack',
        direction: 'row',
        alignItems: 'center',
        padding: [5, 12],
        backgroundColor: { light: 'rgba(255,255,255,0.5)', dark: 'rgba(18,18,26,0.5)' },
        borderRadius: 8,
        borderWidth: 0.5,
        borderColor: { light: 'rgba(245,166,35,0.12)', dark: 'rgba(245,200,66,0.06)' },
        shadow: {
          color: { light: 'rgba(0,0,0,0.02)', dark: 'rgba(0,0,0,0.1)' },
          radius: 2,
          offset: { width: 0, height: 1 },
          opacity: 0.3,
        },
        children: [
          icon('bell.fill', C.warn, 12),
          { type: 'spacer', length: 5 },
          txt('⏰ 还款提醒', 10, 'bold', C.black),
          { type: 'spacer' },
          txt(`${dueCards.length}张 · 最早${formatDay(earliest, earliestPassed)}`, 9, 'bold', dueColor(earliest, earliestPassed)),
        ],
      },
      ...rows,
    ],
  };
}

export default async function(ctx) {
  const now = new Date();

  const cards = [
    { name: '工商银行', shortName: '工行', tail: '0001', data: getNextDueDate(now, 1, 25, 0) },
    { name: '兴业银行', shortName: '兴业', tail: '9226', data: getNextDueDate(now, 3, 23, 0) },
    { name: '招商银行', shortName: '招商', tail: '8209', data: getNextDueDate(now, 8, 26, 0) },
    { name: '广发银行', shortName: '广发', tail: '8888', data: getNextDueDate(now, 13, 2, 1) },
    { name: '中信银行', shortName: '中信', tail: '6165', data: getNextDueDate(now, 14, 3, 1) },
    { name: '民生银行', shortName: '民生', tail: '2826', data: getNextDueDate(now, 25, 14, 1) },
  ];

  // 小尺寸
  if (ctx.widgetFamily === 'accessoryInline') {
    const due = cards.filter(c => c.data.remaining <= DUE_SOON_THRESHOLD);
    const text = due.length > 0 ? `${due[0].shortName} ${formatDay(due[0].data.remaining, due[0].data.isPassed)}` : '✅ 无提醒';
    return { type: 'widget', children: [txt(text, 11, 'semibold')] };
  }

  if (ctx.widgetFamily === 'accessoryRectangular') {
    const due = cards.filter(c => c.data.remaining <= DUE_SOON_THRESHOLD);
    return {
      type: 'widget',
      padding: 6,
      gap: 2,
      children: [
        txt('⏰ 还款提醒', 11, 'bold', C.warn),
        due.length > 0
          ? txt(due.slice(0, 3).map(c => `${c.shortName}${formatDay(c.data.remaining, c.data.isPassed)}`).join(' · '), 8, 'medium', C.warn)
          : txt('✅ 无临期', 8, 'medium', { light: '#00B86B', dark: '#7BED5A' }),
      ],
    };
  }

  if (ctx.widgetFamily === 'systemSmall') {
    const due = cards.filter(c => c.data.remaining <= DUE_SOON_THRESHOLD).slice(0, 3);
    if (due.length === 0) {
      return {
        type: 'widget',
        padding: 10,
        gap: 4,
        backgroundColor: C.bg,
        children: [
          icon('checkmark.circle.fill', { light: '#00B86B', dark: '#7BED5A' }, 20),
          txt('无提醒', 12, 'bold', { light: '#00B86B', dark: '#7BED5A' }),
          txt('所有卡超30天', 9, 'medium', C.sub),
        ],
      };
    }
    return {
      type: 'widget',
      padding: 10,
      gap: 4,
      backgroundColor: C.bg,
      children: [
        txt('⏰ 还款提醒', 11, 'bold', C.warn),
        ...due.map(c => {
          const remaining = c.data.remaining;
          const isPassed = c.data.isPassed;
          const color = dueColor(remaining, isPassed);
          return {
            type: 'stack',
            direction: 'row',
            alignItems: 'center',
            gap: 3,
            children: [
              txt(`${c.shortName} ${formatDay(remaining, isPassed)}`, 9, 'semibold', color),
              { type: 'spacer' },
              txt(dateLabel(c.data.due), 7, 'medium', C.sub),
            ],
          };
        }),
        { type: 'spacer' },
        txt(`共${cards.filter(c => c.data.remaining <= DUE_SOON_THRESHOLD).length}张`, 8, 'medium', C.sub),
      ],
    };
  }

  if (ctx.widgetFamily === 'systemMedium') {
    return mediumWidget(cards, now);
  }
  
  return largeWidget(cards, now);
}
