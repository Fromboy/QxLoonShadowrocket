/**
 * ⛽ 油价小组件 — Scripting 风格移植版（Egern）
 * 
 * 数据源：http://m.qiyoujiage.com/
 * 
 * 1️⃣ 环境变量配置
 * 
 * 在 Egern 小组件 编辑里面 添加环境变量 中添加
 *
 * 名称：region
 * 值：省份/城市（拼音，用 / 分隔）
 *
 * 名称：SHOW_TREND
 * 值：true（显示调价趋势）或 false（不显示）
 *
 * 名称: BG_COLORS   - 自定义背景色，逗号分隔（如 "1a1a2e,16213e"）
 *                 留空则用默认纯黑背景
 */

export default async function (ctx) {
  const regionParam = ctx.env.region || "hunan";
  const SHOW_TREND = (ctx.env.SHOW_TREND || "true").trim() !== "false";
  const family = ctx.widgetFamily || "systemMedium";

  const bgColorsStr = (ctx.env.BG_COLORS || "").trim();
  const bgColors = bgColorsStr ? bgColorsStr.split(",").map(s => "#" + s.trim().replace(/^#/, "")) : [];

  const now = new Date();
  const year = now.getFullYear();
  const timeStr = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
  const dateStr = `${year}年${String(now.getMonth()+1).padStart(2,"0")}月${String(now.getDate()).padStart(2,"0")}日`;

  const LABEL_COLOR = "#EB604D";
  const ORANGE = "#FF9F0A";

  const CACHE_KEY = `oil_v2_${regionParam}`;
  let prices = { p92: null, p95: null, p98: null, diesel: null };
  let regionName = "";
  let forecastPrice = "";
  let forecastDate = "";
  let priceDirection = "stranded";
  let hasCache = false;

  try {
    const cached = ctx.storage.getJSON(CACHE_KEY);
    if (cached && cached.prices) {
      prices = cached.prices;
      regionName = cached.regionName || "";
      forecastPrice = cached.forecastPrice || "";
      forecastDate = cached.forecastDate || "";
      priceDirection = cached.priceDirection || "stranded";
      hasCache = true;
    }
  } catch (_) {}

  let fetchError = false;
  let errorMsg = "";

  try {
    const queryAddr = `http://m.qiyoujiage.com/${regionParam}.shtml`;
    const resp = await ctx.http.get(queryAddr, {
      headers: { referer: "http://m.qiyoujiage.com/", "user-agent": "Mozilla/5.0" },
      timeout: 15000
    });

    if (resp.status !== 200) throw new Error(`HTTP ${resp.status}`);

    const html = await resp.text();

    const titleMatch = html.match(/<title>([^_]+)_/);
    if (titleMatch && titleMatch[1]) {
      regionName = titleMatch[1].trim().replace(/(油价|实时|今日|最新|查询|价格)/g, "").trim();
    }

    const priceRegex = /<dl>[\s\S]+?<dt>(.*?)<\/dt>[\s\S]+?<dd>([\d.]+)\(元\)<\/dd>/gm;
    const priceList = [];
    let m;
    while ((m = priceRegex.exec(html)) !== null) {
      priceList.push({ name: m[1].trim(), value: m[2].trim() });
    }

    if (priceList.length >= 3) {
      const nameMap = { "92": "p92", "95": "p95", "98": "p98", "0号": "diesel" };
      prices = { p92: null, p95: null, p98: null, diesel: null };
      priceList.forEach(item => {
        const key = Object.keys(nameMap).find(k => item.name.includes(k));
        if (key) {
          const val = parseFloat(item.value);
          if (!isNaN(val)) prices[nameMap[key]] = val;
        }
      });

      if (SHOW_TREND) {
        const dateMatch = html.match(/下次油价(\d+)月(\d+)日/);
        if (dateMatch) {
          const m = String(dateMatch[1]).padStart(2,"0");
          const d = String(dateMatch[2]).padStart(2,"0");
          forecastDate = `${m}月${d}日`;
        }

        const trendMatch = html.match(/预计(上[涨调]|下[跌调])[\d.]+\s*元\/吨\s*\(([\d.]+)元\/升-([\d.]+)元\/升/);
        if (trendMatch) {
          priceDirection = trendMatch[1].includes("下") ? "falling" : "rising";
          const v1 = parseFloat(trendMatch[2]);
          const v2 = parseFloat(trendMatch[3]);
          const avg = (v1 + v2) / 2;
          forecastPrice = String(Math.floor(avg * 100) / 100);
        }
      }

      ctx.storage.setJSON(CACHE_KEY, { prices, regionName, forecastPrice, forecastDate, priceDirection });
      fetchError = false;
    } else {
      if (!hasCache) { fetchError = true; errorMsg = "解析失败"; }
    }
  } catch (e) {
    if (!hasCache) { fetchError = true; errorMsg = e.message; }
  }

  const displayForecastDate = forecastDate ? `${year}年${forecastDate}` : "";
  const refreshTime = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();

  const trendSymbol = (dir) => {
    if (dir === "rising") return "↗";
    if (dir === "falling") return "↘";
    return "–";
  };

  const trendColor = (dir) => {
    if (dir === "rising") return { light: "#EB4D4D", dark: "#FF6B6B" };
    if (dir === "falling") return { light: "#30B058", dark: "#5CD67D" };
    return { light: "#888888", dark: "#AAAAAA" };
  };

  const formatForecast = (fp) => {
    if (!fp) return "";
    const n = parseFloat(fp);
    return isNaN(n) ? fp : n.toFixed(2);
  };

  const trendText = (dir) => {
    switch (dir) {
      case "rising": return "上涨";
      case "falling": return "下跌";
      default: return "搁浅";
    }
  };

  const buildBackground = () => {
    if (bgColors.length > 1) {
      return {
        bgColor: undefined,
        bgGradient: { type: "linear", colors: bgColors, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } }
      };
    }
    if (bgColors.length === 1) {
      return { bgColor: { light: bgColors[0], dark: darkenColor(bgColors[0]) }, bgGradient: undefined };
    }
    return { bgColor: { light: "#F2F2F7", dark: "#000000" }, bgGradient: undefined };
  };

  function darkenColor(hex) {
    hex = hex.replace("#", "");
    if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
    if (hex.length !== 6) return "#000000";
    const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - 30);
    const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - 30);
    const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - 30);
    return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;
  }

  const textColor = () => {
    if (bgColors.length > 0) {
      const hex = bgColors[0].replace("#", "");
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness > 128 ? "#1A1A1A" : "#FFFFFF";
    }
    return { light: "#1A1A1A", dark: "#FFFFFF" };
  };

  const allItems = [
    { type: "92", label: "92 号", shortLabel: "92#", price: prices.p92 },
    { type: "95", label: "95 号", shortLabel: "95#", price: prices.p95 },
    { type: "98", label: "98 号", shortLabel: "98#", price: prices.p98 },
    { type: "diesel", label: "柴油", shortLabel: "0#", price: prices.diesel }
  ].filter(i => i.price !== null);

  const mediumItems = allItems;
  const firstItem = allItems[0] || null;
  const bg = buildBackground();
  const fc = textColor();

  if (fetchError && allItems.length === 0) {
    return {
      type: "widget", padding: 16, gap: 8,
      ...(bg.bgColor ? { backgroundColor: bg.bgColor } : {}),
      ...(bg.bgGradient ? { backgroundGradient: bg.bgGradient } : {}),
      refreshAfter: refreshTime,
      children: [
        { type: "image", src: "sf-symbol:exclamationmark.triangle.fill", width: 28, height: 28, color: "#FF3B30" },
        { type: "text", text: "数据加载失败", font: { size: "body", weight: "medium" }, textColor: fc },
        { type: "text", text: errorMsg || "请检查网络连接", font: { size: "caption2" }, textColor: fc }
      ]
    };
  }

  if (family === "systemSmall") {
    return {
      type: "widget", padding: 16, gap: 6,
      ...(bg.bgColor ? { backgroundColor: bg.bgColor } : {}),
      ...(bg.bgGradient ? { backgroundGradient: bg.bgGradient } : {}),
      refreshAfter: refreshTime,
      children: [
        { type: "image", src: "sf-symbol:fuelpump.fill", width: 22, height: 22, color: ORANGE },
        { type: "spacer" },
        { type: "text", text: firstItem ? `¥${firstItem.price.toFixed(2)}` : "--",
          font: { size: "title2", weight: "bold" }, textColor: fc, textAlign: "center", lineLimit: 1, minScale: 0.7 },
        { type: "text", text: firstItem ? firstItem.shortLabel : "油价",
          font: { size: "caption2", weight: "semibold" }, textColor: LABEL_COLOR, textAlign: "center" },
        { type: "spacer" },
        { type: "text", text: timeStr,
          font: { size: "caption2" }, textColor: fc, textAlign: "center" }
      ]
    };
  }

  if (family === "systemMedium") {
    const footerText = forecastDate
      ? `${dateStr}刷新 • ${displayForecastDate}${trendText(priceDirection)}调整`
      : `${dateStr}刷新`;

    return {
      type: "widget",
      padding: [14, 16, 14, 16],
      gap: 0,
      ...(bg.bgColor ? { backgroundColor: bg.bgColor } : {}),
      ...(bg.bgGradient ? { backgroundGradient: bg.bgGradient } : {}),
      refreshAfter: refreshTime,
      children: [
        {
          type: "stack", direction: "row", alignItems: "center", gap: 4,
          children: [
            { type: "image", src: "sf-symbol:fuelpump.fill", width: 16, height: 16, color: ORANGE },
            { type: "text", text: regionName ? `${regionName}油价` : "实时油价",
              font: { size: "body", weight: "bold" }, textColor: fc, lineLimit: 1, minScale: 0.8 }
          ]
        },
        { type: "spacer" },
        {
          type: "stack", direction: "row", alignItems: "center",
          justifyContent: "space-between", gap: 16,
          children: mediumItems.map(item => ({
            type: "stack", direction: "column", alignItems: "center", gap: 2, flex: 1,
            children: [
              { type: "text", text: item.shortLabel,
                font: { size: "title2", weight: "medium" },
                textColor: LABEL_COLOR, textAlign: "center" },
              { type: "text", text: `¥${item.price.toFixed(2)}`,
                font: { size: "title3", weight: "medium" },
                textColor: fc, textAlign: "center", lineLimit: 1, minScale: 0.8 },
              ...(SHOW_TREND && forecastPrice ? [{
                type: "text",
                text: `${trendSymbol(priceDirection)} ¥${formatForecast(forecastPrice)}`,
                font: { size: "caption2" }, textColor: trendColor(priceDirection),
                textAlign: "center", lineLimit: 1, minScale: 0.75
              }] : [])
            ]
          }))
        },
        { type: "spacer" },
        {
          type: "stack", direction: "row", alignItems: "center",
          children: [
            { type: "spacer" },
            { type: "text", text: footerText,
              font: { size: "caption2" }, textColor: fc,
              lineLimit: 1, minScale: 0.8 },
            { type: "spacer" }
          ]
        }
      ]
    };
  }

  const itemCount = allItems.length;
  const isCrowded = itemCount >= 4;
  const L = {
    labelFont: isCrowded ? "subheadline" : "headline",
    priceFont: isCrowded ? "subheadline" : "body",
    forecastFont: "caption2", footerFont: "caption2",
    rowGap: isCrowded ? 6 : 10, vPadding: isCrowded ? 12 : 16
  };

  const largeFooterText = forecastDate
    ? `${dateStr}刷新 • ${displayForecastDate}${trendText(priceDirection)}调整`
    : `${dateStr}刷新`;

  return {
    type: "widget", padding: [L.vPadding, 16, L.vPadding, 16], gap: 4,
    ...(bg.bgColor ? { backgroundColor: bg.bgColor } : {}),
    ...(bg.bgGradient ? { backgroundGradient: bg.bgGradient } : {}),
    refreshAfter: refreshTime,
    children: [
      {
        type: "stack", direction: "row", alignItems: "center", gap: 4,
        children: [
          { type: "image", src: "sf-symbol:fuelpump.fill", width: 20, height: 20, color: ORANGE },
          { type: "text", text: regionName ? `${regionName}油价` : "实时油价",
            font: { size: "title3", weight: "bold" }, textColor: fc, lineLimit: 1, minScale: 0.8 }
        ]
      },
      { type: "spacer" },
      {
        type: "stack", direction: "column", gap: L.rowGap,
        children: allItems.map(item => ({
          type: "stack", direction: "row", alignItems: "center", gap: 8,
          children: [
            { type: "text", text: item.shortLabel,
              font: { size: L.labelFont, weight: "bold" }, textColor: LABEL_COLOR,
              lineLimit: 1, minScale: 0.8 },
            { type: "spacer" },
            { type: "text", text: `¥${item.price.toFixed(2)}`,
              font: { size: L.priceFont, weight: "medium" }, textColor: fc,
              lineLimit: 1, minScale: 0.8 },
            ...(SHOW_TREND && forecastPrice ? [{
              type: "text",
              text: `${trendSymbol(priceDirection)} ¥${formatForecast(forecastPrice)}`,
              font: { size: L.forecastFont }, textColor: trendColor(priceDirection),
              lineLimit: 1, minScale: 0.75
            }] : [])
          ]
        }))
      },
      { type: "spacer" },
      {
        type: "stack", direction: "row", alignItems: "center",
        children: [
          { type: "spacer" },
          { type: "text", text: largeFooterText,
            font: { size: L.footerFont }, textColor: fc,
            lineLimit: 1, minScale: 0.8 },
          { type: "spacer" }
        ]
      }
    ]
  };
}
