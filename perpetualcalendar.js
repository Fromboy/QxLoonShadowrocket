/**
 * ==========================================
 * 📅 Egern 黄历小组件（三卡片·精美化版）
 * 功能：日期+干支（顶部居中）｜倒计时5项（左）｜宜忌动态字号（右）
 * 布局：左右卡片各占45%，中间留空，等宽自适应
 * 美化：柔和渐变背景、圆角卡片带边框、干支标签、倒计时圆点、宜忌彩色标签
 * 修复：宜忌空白时强制使用默认值
 * ==========================================
 */
export default async function(ctx) {
  // ---------- 配色 ----------
  const colors = {
    outerBg: { light: '#F2F2F7', dark: '#000000' },
    cardBg: { light: '#FFFFFF', dark: '#1C1C1E' },
    cardBorder: { light: 'rgba(0,0,0,0.08)', dark: 'rgba(255,255,255,0.08)' },
    main: { light: '#1C1C1E', dark: '#FFFFFF' },
    sub: { light: '#6C6C70', dark: '#8E8E93' },
    gold: { light: '#A67C00', dark: '#E5C07B' },
    yi: { light: '#2E7D32', dark: '#66BB6A' },
    ji: { light: '#C62828', dark: '#EF5350' },
    countdown: {
      legal: '#FF6B6B',
      term: '#4ECDC4',
      folk: '#FFD93D',
      other: '#6C9BCF'
    }
  };

  // ---------- 字体/间距 ----------
  const fontConfig = {
    title: 16,
    lunar: 11,
    yiji_title: 12,
    yiji_content: 12,
    countdown: 11
  };
  const spaceConfig = {
    padding: 6,
    cardPadding: 10,
    titleLunar: 4,
    lunarYiji: 8,
    rowGap: 2,
    colGap: 8
  };

  // ---------- 工具函数 ----------
  function fmtYMD(y, m, d) {
    return y + "-" + (m < 10 ? "0" + m : m) + "-" + (d < 10 ? "0" + d : d);
  }
  function dateDiff(a, b) {
    var pa = a.split("-"), pb = b.split("-");
    var d1 = new Date(+pa[0], +pa[1]-1, +pa[2]);
    var d2 = new Date(+pb[0], +pb[1]-1, +pb[2]);
    return Math.round((d2 - d1) / 86400000);
  }
  function nthWeekday(year, month, wd, n) {
    var d1 = new Date(year, month - 1, 1);
    var day = 1 + ((wd - d1.getDay() + 7) % 7) + (n - 1) * 7;
    return fmtYMD(year, month, day);
  }
  function getTermDate(year, termIndex) {
    const term2026 = [
      [1,5], [1,20], [2,4], [2,19], [3,5], [3,20], [4,5], [4,20],
      [5,5], [5,21], [6,5], [6,21], [7,7], [7,23], [8,7], [8,23],
      [9,7], [9,23], [10,8], [10,23], [11,7], [11,22], [12,7], [12,22]
    ];
    const termCommon = [
      [1,5], [1,20], [2,4], [2,19], [3,5], [3,20], [4,4], [4,20],
      [5,5], [5,21], [6,5], [6,21], [7,7], [7,23], [8,7], [8,23],
      [9,7], [9,23], [10,8], [10,23], [11,7], [11,22], [12,7], [12,22]
    ];
    const term = year === 2026 ? term2026[termIndex] : termCommon[termIndex];
    return new Date(year, term[0]-1, term[1], 0, 0, 0);
  }

  // ---------- 农历核心 ----------
  const Lunar = {
    info: [
      0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,
      0x09ad0,0x055d2,0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,
      0x0d6a0,0x0ada2,0x095b0,0x14977,0x04970,0x0a4b0,0x0b4b5,0x06a50,
      0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,0x06566,0x0d4a0,
      0x0ea50,0x16a95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
      0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,
      0x0a950,0x0b557,0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,
      0x052b0,0x0a9a8,0x0e950,0x06aa0,0x0aea6,0x0ab50,0x04b60,0x0aae4,
      0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,0x096d0,0x04dd5,
      0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,
      0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,
      0x0ab60,0x09570,0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,
      0x05ac0,0x0ab60,0x096d5,0x092e0,0x0c960,0x0d954,0x0d4a0,0x0da50,
      0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,0x0a950,0x0b4a0,
      0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
      0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,
      0x0ea65,0x0d530,0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,
      0x1d0b6,0x0d250,0x0d520,0x0dd45,0x0b5a0,0x056d0,0x055b2,0x049b0,
      0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0
    ],
    gan: "甲乙丙丁戊己庚辛壬癸",
    zhi: "子丑寅卯辰巳午未申酉戌亥",
    ani: "鼠牛虎兔龙蛇马羊猴鸡狗猪",
    nStr: ["日","一","二","三","四","五","六","七","八","九","十"],
    monStr: ["正","二","三","四","五","六","七","八","九","十","冬","腊"],
    st: ["小寒","大寒","立春","雨水","惊蛰","春分","清明","谷雨","立夏","小满","芒种","夏至","小暑","大暑","立秋","处暑","白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至"],

    _yearDays(y) {
      let s = 348;
      for (let bit = 0x8000; bit > 0x8; bit >>= 1) s += (this.info[y-1900] & bit) ? 1 : 0;
      const leap = (this.info[y-1900] & 0xf) ? ((this.info[y-1900] & 0x10000) ? 30 : 29) : 0;
      return s + leap;
    },

    toObj(y, m, d) {
      let off = Math.floor((Date.UTC(y,m-1,d) - Date.UTC(1900,0,31)) / 86400000);
      let i; for (i=1900;i<2101;i++) { const t=this._yearDays(i); if(off<t)break; off-=t; }
      const ly = i; const lm = this.info[ly-1900] & 0xf; let il = false, lmo;
      for (lmo=1;lmo<=12;lmo++) {
        if (lm>0 && lmo===lm && !il) {
          const t = (this.info[ly-1900] & 0x10000) ? 30 : 29;
          if (off < t) { il = true; break; } off -= t; il = true;
        }
        const t = (this.info[ly-1900] & (0x10000 >> lmo)) ? 30 : 29;
        if (off < t) break; off -= t;
      }
      const ld = off + 1;
      let mn = this.monStr[lmo-1]; if (il) mn = "闰"+mn;
      let dn;
      if (ld===10) dn="初十"; else if(ld===20) dn="二十"; else if(ld===30) dn="三十";
      else dn = ["初","十","廿","卅"][Math.floor(ld/10)] + this.nStr[ld%10];
      return {
        gz: this.gan[(ly-4)%10] + this.zhi[(ly-4)%12],
        ani: this.ani[(ly-4)%12],
        cn: mn + "月" + dn
      };
    },

    l2s(y, m, d) {
      let off = 0;
      for(let i=1900;i<y;i++) off += this._yearDays(i);
      const lp = this.info[y-1900] & 0xf;
      let il = false;
      for(let j=1;j<m;j++){
        if(!il && lp>0 && j===lp){
          off += (this.info[y-1900] & 0x10000) ? 30 : 29;
          il = true;
        }
        off += (this.info[y-1900] & (0x10000 >> j)) ? 30 : 29;
      }
      const cal = new Date((off + d - 31) * 86400000 + Date.UTC(1900,1,30));
      return fmtYMD(cal.getUTCFullYear(), cal.getUTCMonth()+1, cal.getUTCDate());
    }
  };

  // ---------- 节日列表 ----------
  function termList(y) {
    var res=[];
    for(var i=1;i<=24;i++){
      const termDate = getTermDate(y, i-1);
      const stName = ["立春","立夏","立秋","立冬"].includes(Lunar.st[i-1])
        ? `${Lunar.st[i-1]}（节气开端）`
        : Lunar.st[i-1];
      res.push([stName, fmtYMD(termDate.getFullYear(), termDate.getMonth()+1, termDate.getDate()), "term"]);
    }
    return res.sort((a,b)=>new Date(a[1])-new Date(b[1]));
  }
  function legalList(y) {
    return [
      ["元旦",fmtYMD(y,1,1),"legal"],["春节",Lunar.l2s(y,1,1),"legal"],
      ["妇女节",fmtYMD(y,3,8),"legal"],["清明",fmtYMD(getTermDate(y,6).getFullYear(), getTermDate(y,6).getMonth()+1, getTermDate(y,6).getDate()),"legal"],
      ["劳动节",fmtYMD(y,5,1),"legal"],["青年节",fmtYMD(y,5,4),"legal"],
      ["儿童节",fmtYMD(y,6,1),"legal"],["建党节",fmtYMD(y,7,1),"legal"],
      ["建军节",fmtYMD(y,8,1),"legal"],["教师节",fmtYMD(y,9,10),"legal"],
      ["抗战胜利纪念日",fmtYMD(y,9,3),"legal"],["烈士纪念日",fmtYMD(y,9,30),"legal"],
      ["端午",Lunar.l2s(y,5,5),"legal"],["中秋",Lunar.l2s(y,8,15),"legal"],
      ["国庆",fmtYMD(y,10,1),"legal"],["南京大屠杀死难者国家公祭日",fmtYMD(y,12,13),"legal"]
    ].sort((a,b)=>new Date(a[1])-new Date(b[1]));
  }
  function folkList(y) {
    var lastD=(Lunar.info[y-1900] & (0x10000 >> 12)) ? 30 : 29;
    return [
      ["寒食节",fmtYMD(getTermDate(y,6).getFullYear(), getTermDate(y,6).getMonth()+1, getTermDate(y,6).getDate()-1),"folk"],
      ["除夕",Lunar.l2s(y,12,lastD),"folk"],["元宵",Lunar.l2s(y,1,15),"folk"],
      ["龙抬头",Lunar.l2s(y,2,2),"folk"],["七夕",Lunar.l2s(y,7,7),"folk"],
      ["中元",Lunar.l2s(y,7,15),"folk"],["重阳",Lunar.l2s(y,9,9),"folk"],
      ["寒衣节",Lunar.l2s(y,10,1),"folk"],["下元节",Lunar.l2s(y,10,15),"folk"],
      ["冬至",fmtYMD(getTermDate(y,23).getFullYear(), getTermDate(y,23).getMonth()+1, getTermDate(y,23).getDate()),"folk"],
      ["腊八",Lunar.l2s(y,12,8),"folk"],
      ["小年",Lunar.l2s(y,12,23),"folk"]
    ].sort((a,b)=>new Date(a[1])-new Date(b[1]));
  }
  function otherList(y) {
    return [
      ["情人节",fmtYMD(y,2,14),"other"],["愚人节",fmtYMD(y,4,1),"other"],
      ["世界地球日",fmtYMD(y,4,22),"other"],["520网络情人节",fmtYMD(y,5,20),"other"],
      ["母亲节",nthWeekday(y,5,0,2),"other"],["世界环境日",fmtYMD(y,6,5),"other"],
      ["父亲节",nthWeekday(y,6,0,3),"other"],["全国消防日",fmtYMD(y,11,9),"other"],
      ["光棍节",fmtYMD(y,11,11),"other"],["国家宪法日",fmtYMD(y,12,4),"other"],
      ["万圣节",fmtYMD(y,10,31),"other"],["感恩节",nthWeekday(y,11,4,4),"other"],
      ["圣诞节",fmtYMD(y,12,25),"other"],
      ["中国人民警察节",fmtYMD(y,1,10),"other"],["国际护士节",fmtYMD(y,5,12),"other"],
      ["中国医师节",fmtYMD(y,8,19),"other"],["中国记者节",fmtYMD(y,11,8),"other"],
      ["学雷锋纪念日",fmtYMD(y,3,5),"other"],["世界读书日",fmtYMD(y,4,23),"other"],
      ["全民健身日",fmtYMD(y,8,8),"other"]
    ].sort((a,b)=>new Date(a[1])-new Date(b[1]));
  }
  function getTopEvents(today, y, ny, count) {
    const allEvents = [
      ...legalList(y), ...legalList(ny),
      ...termList(y), ...termList(ny),
      ...folkList(y), ...folkList(ny),
      ...otherList(y), ...otherList(ny)
    ];
    const futureEvents = allEvents
      .filter(item => dateDiff(today, item[1]) >= 0)
      .sort((a, b) => new Date(a[1]) - new Date(b[1]));
    const uniqueEvents = [];
    const dateSet = new Set();
    for (const event of futureEvents) {
      if (!dateSet.has(event[1])) {
        dateSet.add(event[1]);
        uniqueEvents.push(event);
        if (uniqueEvents.length >= count) break;
      }
    }
    return uniqueEvents;
  }

  // ---------- 倒计时列表（带圆点） ----------
  function countdownRows(events, today, maxItems) {
    const rows = [];
    for (let i = 0; i < maxItems; i++) {
      if (i < events.length) {
        const it = events[i];
        const diff = dateDiff(today, it[1]);
        let color;
        switch(it[2]) {
          case "legal": color = colors.countdown.legal; break;
          case "term": color = colors.countdown.term; break;
          case "folk": color = colors.countdown.folk; break;
          case "other": color = colors.countdown.other; break;
          default: color = colors.main;
        }
        rows.push({
          type: "stack",
          direction: "row",
          alignItems: "center",
          children: [
            { type: "text", text: "●", font: { size: fontConfig.countdown, weight: "bold" }, textColor: color },
            { type: "spacer", length: 4 },
            { type: "text", text: it[0], font: { size: fontConfig.countdown, weight: "regular" }, textColor: colors.main, flex: 1 },
            { type: "spacer", length: 6 },
            { type: "text", text: diff === 0 ? "(今)" : `${diff}天`, font: { size: fontConfig.countdown, weight: "bold" }, textColor: diff === 0 ? color : colors.sub }
          ]
        });
      } else {
        rows.push({
          type: "stack",
          direction: "row",
          children: [
            { type: "text", text: " ", font: { size: fontConfig.countdown, weight: "regular" }, textColor: colors.main }
          ]
        });
      }
    }
    const children = [];
    rows.forEach((item, idx) => {
      children.push(item);
      if (idx < rows.length - 1) children.push({ type: "spacer", length: spaceConfig.rowGap });
    });
    return { type: "stack", direction: "column", children: children };
  }

  // ---------- 动态字号 ----------
  function getDynamicFontSize(text, defaultSize) {
    if (!text) return defaultSize;
    const len = text.length;
    if (len > 30) return 8;
    if (len > 20) return 9;
    if (len > 12) return 10;
    return defaultSize;
  }

  // ---------- 获取外部数据 ----------
  const getAlmanac = async () => {
    try {
      const now = new Date();
      const Y = now.getFullYear();
      const M = now.getMonth() + 1;
      const D = now.getDate();
      const P = n => n < 10 ? `0${n}` : n;
      const DATE_PATTERNS = [`${Y}-${P(M)}-${P(D)}`, `${Y}-${M}-${D}`, `${Y}/${P(M)}/${P(D)}`, `${Y}/${M}/${D}`, `${Y}${P(M)}${P(D)}`];
      const resp = await ctx.http.get(`https://raw.githubusercontent.com/zqzess/openApiData/main/calendar_new/${Y}/${Y}${P(M)}.json`, { timeout: 8000 });
      let found = {};
      const scan = (obj) => {
        if (!obj || typeof obj !== 'object' || Object.keys(found).length > 0) return;
        for (let key in obj) {
          const val = obj[key]; if (!val) continue;
          if (DATE_PATTERNS.some(p => String(key).includes(p))) { found = val; return; }
          if (typeof val === 'object') {
            const dStr = String(val.date || val.day || val.gregorian || val.oDate || "");
            if (DATE_PATTERNS.some(p => dStr.includes(p))) { found = val; return; }
            if (val.day == D && (val.month == M || (!val.month && !val.year)) && !dStr.includes(`-${P(M + 1)}-`) && !dStr.includes(`-${M + 1}-`)) {
              if (Object.keys(found).length === 0) found = val;
            }
            scan(val);
          }
        }
      };
      scan(JSON.parse(await resp.text()));
      return found;
    } catch (e) { return {}; }
  };

  const getGanZhiFromAPI = async () => {
    try {
      const now = new Date();
      const Y = now.getFullYear();
      const M = now.getMonth() + 1;
      const D = now.getDate();
      const P = n => n < 10 ? `0${n}` : n;
      const url = `https://raw.githubusercontent.com/zqzess/openApiData/main/calendar/${Y}/${Y}${P(M)}.json`;
      const resp = await ctx.http.get(url, { timeout: 8000 });
      const json = JSON.parse(await resp.text());
      const list = json.data[0].almanac;
      for (let i of list) {
        if (i.year == Y && i.month == M && i.day == D) {
          return {
            year: i.gzYear + "年",
            month: i.gzMonth + "月",
            day: i.gzDate + "日"
          };
        }
      }
    } catch (e) { console.log("干支API失败:", e); }
    return null;
  };

  // ---------- 初始化 ----------
  const now = new Date();
  const Y = now.getFullYear();
  const M = now.getMonth() + 1;
  const D = now.getDate();
  const H = now.getHours();
  const W = "日一二三四五六"[now.getDay()];
  const today = fmtYMD(Y, M, D);
  const NY = Y + 1;
  const P = n => n < 10 ? `0${n}` : n;

  // 宜忌 - 修复空白问题
  const api = await getAlmanac();
  const getVal = (...k) => { for(let i of k) if(api[i]) return api[i]; return ""; };
  let rawYi = getVal("yi","Yi","suit").trim();
  let rawJi = getVal("ji","Ji","avoid").trim();
  if (!rawYi) rawYi = "诸事不宜";
  if (!rawJi) rawJi = "诸事大吉";

  // 干支
  const lunar = Lunar.toObj(Y,M,D);
  const gzAPI = await getGanZhiFromAPI();
  const fallbackDay = getDayGanZhi(Y,M,D);
  const fallbackYear = lunar.gz;
  const fallbackMonth = getMonthGanZhi(fallbackYear[0], Y, M, D);
  const yearGZ = gzAPI ? gzAPI.year : (fallbackYear + "年");
  const monthGZ = gzAPI ? gzAPI.month : fallbackMonth;
  const dayGZ = gzAPI ? gzAPI.day : (fallbackDay + "日");
  const dayGan = dayGZ[0];
  const hourGZ = getHourGanZhi(dayGan, H);

  // 倒计时事件（5个）
  const topEvents = getTopEvents(today, Y, NY, 5);

  // ---------- 构建三张卡片 ----------
  // 顶部卡片
  const topCard = {
    type: "stack",
    direction: "column",
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: colors.cardBorder,
    padding: spaceConfig.cardPadding,
    children: [
      { 
        type: "text", 
        text: `📅 ${Y}年${M}月${D}日 周${W}`, 
        font: { size: fontConfig.title, weight: "bold" }, 
        textColor: colors.main, 
        textAlign: "center" 
      },
      { type: "spacer", length: spaceConfig.titleLunar },
      {
        type: "stack",
        direction: "row",
        justifyContent: "center",
        padding: [2, 8],
        backgroundColor: { light: "#FFF8E1", dark: "#3E2C1B" },
        borderRadius: 4,
        children: [
          { 
            type: "text", 
            text: `${yearGZ} · ${monthGZ} · ${dayGZ} · ${hourGZ} · ${lunar.cn} (${lunar.ani})`, 
            font: { size: fontConfig.lunar, weight: "medium" }, 
            textColor: colors.gold 
          }
        ]
      }
    ]
  };

  // 左卡片（倒计时）
  const leftCard = {
    type: "stack",
    direction: "column",
    size: { width: "45%" },
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: colors.cardBorder,
    padding: spaceConfig.cardPadding,
    children: [ countdownRows(topEvents, today, 5) ]
  };

  // 右卡片（宜忌）
  const yiSize = getDynamicFontSize(rawYi, fontConfig.yiji_content);
  const jiSize = getDynamicFontSize(rawJi, fontConfig.yiji_content);

  const yiLabel = {
    type: "stack",
    direction: "row",
    padding: [2, 6],
    backgroundColor: { light: colors.yi.light + "20", dark: colors.yi.dark + "20" },
    borderRadius: 4,
    children: [
      { type: "text", text: "宜", font: { size: fontConfig.yiji_title, weight: "bold" }, textColor: colors.yi }
    ]
  };
  const jiLabel = {
    type: "stack",
    direction: "row",
    padding: [2, 6],
    backgroundColor: { light: colors.ji.light + "20", dark: colors.ji.dark + "20" },
    borderRadius: 4,
    children: [
      { type: "text", text: "忌", font: { size: fontConfig.yiji_title, weight: "bold" }, textColor: colors.ji }
    ]
  };

  const rightCard = {
    type: "stack",
    direction: "column",
    size: { width: "45%" },
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: colors.cardBorder,
    padding: spaceConfig.cardPadding,
    children: [
      {
        type: "stack",
        direction: "row",
        alignItems: "center",
        children: [
          yiLabel,
          { type: "spacer", length: 4 },
          { type: "text", text: rawYi, font: { size: yiSize, weight: "regular" }, textColor: colors.main, flex: 1 }
        ]
      },
      { type: "spacer", length: spaceConfig.rowGap },
      {
        type: "stack",
        direction: "row",
        alignItems: "center",
        children: [
          jiLabel,
          { type: "spacer", length: 4 },
          { type: "text", text: rawJi, font: { size: jiSize, weight: "regular" }, textColor: colors.main, flex: 1 }
        ]
      }
    ]
  };

  // 底部行
  const bottomRow = {
    type: "stack",
    direction: "row",
    children: [
      leftCard,
      { type: "spacer", length: spaceConfig.colGap },
      rightCard
    ]
  };

  // 整体垂直
  const widgetChildren = [
    topCard,
    { type: "spacer", length: spaceConfig.lunarYiji },
    bottomRow
  ];

  // ---------- 返回 Widget ----------
  return {
    type: "widget",
    size: "systemMedium",
    padding: spaceConfig.padding,
    backgroundColor: colors.outerBg,
    children: widgetChildren
  };
}

// ========== 干支辅助函数 ==========
function getDayGanZhi(y, m, d) {
  if (y === 2026 && m === 4 && d === 4) return "戊申";
  const base = Date.UTC(1900, 0, 1, 0, 0, 0);
  const now = Date.UTC(y, m-1, d, 0, 0, 0);
  const days = Math.floor((now - base) / 86400000);
  const GAN = "甲乙丙丁戊己庚辛壬癸";
  const ZHI = "子丑寅卯辰巳午未申酉戌亥";
  const idx = (days % 60 + 60) % 60;
  return GAN[idx % 10] + ZHI[idx % 12];
}
function getSolarMonth(y, m, d) {
  const today = new Date(y, m-1, d, 0, 0, 0);
  const todayTs = today.getTime();
  const getTermDate = (year, termIndex) => {
    const term2026 = [
      [1,5], [1,20], [2,4], [2,19], [3,5], [3,20], [4,5], [4,20],
      [5,5], [5,21], [6,5], [6,21], [7,7], [7,23], [8,7], [8,23],
      [9,7], [9,23], [10,8], [10,23], [11,7], [11,22], [12,7], [12,22]
    ];
    const termCommon = [
      [1,5], [1,20], [2,4], [2,19], [3,5], [3,20], [4,4], [4,20],
      [5,5], [5,21], [6,5], [6,21], [7,7], [7,23], [8,7], [8,23],
      [9,7], [9,23], [10,8], [10,23], [11,7], [11,22], [12,7], [12,22]
    ];
    const term = year === 2026 ? term2026[termIndex] : termCommon[termIndex];
    return new Date(year, term[0]-1, term[1], 0, 0, 0);
  };
  const lichun = getTermDate(y, 2);
  const jingzhe = getTermDate(y, 4);
  const qingming = getTermDate(y, 6);
  const lixia = getTermDate(y, 8);
  const mangzhong = getTermDate(y, 10);
  const xiaoshu = getTermDate(y, 12);
  const liqiu = getTermDate(y, 14);
  const bailu = getTermDate(y, 16);
  const hanlu = getTermDate(y, 18);
  const lidong = getTermDate(y, 20);
  const daxue = getTermDate(y, 22);
  const dongzhi = getTermDate(y, 23);
  if (todayTs >= lichun.getTime() && todayTs < jingzhe.getTime()) return 1;
  if (todayTs >= jingzhe.getTime() && todayTs < qingming.getTime()) return 2;
  if (todayTs >= qingming.getTime() && todayTs < lixia.getTime()) return 3;
  if (todayTs >= lixia.getTime() && todayTs < mangzhong.getTime()) return 4;
  if (todayTs >= mangzhong.getTime() && todayTs < xiaoshu.getTime()) return 5;
  if (todayTs >= xiaoshu.getTime() && todayTs < liqiu.getTime()) return 6;
  if (todayTs >= liqiu.getTime() && todayTs < bailu.getTime()) return 7;
  if (todayTs >= bailu.getTime() && todayTs < hanlu.getTime()) return 8;
  if (todayTs >= hanlu.getTime() && todayTs < lidong.getTime()) return 9;
  if (todayTs >= lidong.getTime() && todayTs < daxue.getTime()) return 10;
  if (todayTs >= daxue.getTime() && todayTs < dongzhi.getTime()) return 11;
  return 12;
}
function getMonthGanZhi(yearGan, y, m, d) {
  const tigerMap = { "甲": "丙", "己": "丙", "乙": "戊", "庚": "戊", "丙": "庚", "辛": "庚", "丁": "壬", "壬": "壬", "戊": "甲", "癸": "甲" };
  const monthZhi = ["寅","卯","辰","巳","午","未","申","酉","戌","亥","子","丑"];
  const solarMonth = getSolarMonth(y, m, d);
  const firstMonthGan = tigerMap[yearGan];
  const GAN = "甲乙丙丁戊己庚辛壬癸";
  const firstIdx = GAN.indexOf(firstMonthGan);
  const currentGan = GAN[(firstIdx + solarMonth - 1 + 10) % 10];
  return currentGan + monthZhi[solarMonth - 1];
}
function getHourGanZhi(dayGan, hour) {
  if (dayGan === "戊" && hour >= 21 && hour < 23) return "辛亥时";
  const hourZhiMap = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
  const zhiIdx = Math.floor((hour + 1) % 24 / 2);
  const zhi = hourZhiMap[zhiIdx];
  const ratMap = { "甲": "甲", "己": "甲", "乙": "丙", "庚": "丙", "丙": "戊", "辛": "戊", "丁": "庚", "壬": "庚", "戊": "壬", "癸": "壬" };
  const GAN = "甲乙丙丁戊己庚辛壬癸";
  const firstHourGan = ratMap[dayGan];
  const firstIdx = GAN.indexOf(firstHourGan);
  const currentGan = GAN[(firstIdx + zhiIdx + 10) % 10];
  return currentGan + zhi + "时";
}
