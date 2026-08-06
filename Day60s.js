/******************************
脚本名称: 每日60S
Version : v1.1.26
更新时间: 2026-07-23
平台: Egern
功能: 每日60秒读懂世界（定时通知）
脚本作者: @Nullwhy
环境变量:
- API_URL / MAX_NEWS / MULTI_NOTIFY / CHUNK_SIZE / OPEN_URL / ALLOW_REPEAT
*******************************/

const SCRIPT_NAME = "每日60S";
const TITLE_MAIN = "每日60S · 读懂世界 💭";
const SCRIPT_VERSION = "v1.1.26";
const STORE_KEY = "60s_last_date";
const DEFAULT_API = "https://60s-api.viki.moe/v2/60s";
const FALLBACK_APIS = ["https://60s.viki.moe/v2/60s"];
const DEFAULT_MAX_NEWS = 5;
const DEFAULT_CHUNK_SIZE = 5;

function log(msg) {
  console.log("[" + SCRIPT_NAME + "] " + msg);
}

function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

function getEnv(env, names, fallback) {
  if (fallback === undefined) fallback = "";
  for (var i = 0; i < names.length; i++) {
    var value = env && env[names[i]];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return fallback;
}

function envBool(env, key, def) {
  if (!env || env[key] === undefined || env[key] === null || String(env[key]).trim() === "") {
    return !!def;
  }
  var v = String(env[key]).trim().toLowerCase();
  if (["1", "true", "yes", "on"].indexOf(v) !== -1) return true;
  if (["0", "false", "no", "off"].indexOf(v) !== -1) return false;
  return !!def;
}

function envInt(env, key, def) {
  var n = parseInt(getEnv(env, [key], String(def)), 10);
  return Number.isFinite(n) ? n : def;
}

/** 默认同日只推一次；ALLOW_REPEAT=true 时允许多次 */
function shouldDedupe(env) {
  return !envBool(env || {}, "ALLOW_REPEAT", false);
}

function stripLeadingIndex(text) {
  return String(text || "")
    .replace(/^\s*\d+\s*[\.．、:：]\s*/u, "")
    .trim();
}

function chunkArray(arr, size) {
  var out = [];
  var s = size > 0 ? size : 1;
  for (var i = 0; i < arr.length; i += s) out.push(arr.slice(i, i + s));
  return out.length ? out : [[]];
}

function buildBodyChunk(newsChunk, startIndex, tip) {
  var lines = (newsChunk || []).map(function (item, i) {
    var s =
      typeof item === "string"
        ? item
        : (item && (item.title || item.text)) || String(item);
    return startIndex + i + 1 + ". " + stripLeadingIndex(s);
  });
  if (tip) {
    lines.push("");
    lines.push(
      "【微语】" +
        String(tip)
          .replace(/^\s*【\s*微语\s*】\s*/u, "")
          .trim()
    );
  }
  return lines.join("\n") || "暂无新闻";
}

function buildSubtitle(lunar, date, dow) {
  var left = [];
  if (date) left.push(date);
  if (dow) left.push(dow);
  var leftStr = left.join("  ");
  if (leftStr && lunar) return leftStr + "  ·  " + lunar;
  if (leftStr) return leftStr;
  if (lunar) return lunar;
  return "读懂世界";
}

function resolveOpenUrl(mode, image) {
  var m = (mode || "image").toLowerCase();
  if (m === "none" || m === "off" || m === "false") return "";
  var u = String(image || "").trim();
  if (!u) return "";
  if (u.indexOf("//") === 0) u = "https:" + u;
  if (!/^https?:\/\//i.test(u)) {
    if (/^[a-z0-9.-]+\//i.test(u)) u = "https://" + u;
    else return "";
  }
  u = u.replace(/^http:\/\//i, "https://");
  if (/file\.alapi\.cn|wsrv\.nl|images\.weserv\.nl|^data:/i.test(u)) return "";
  return u;
}

function vikiPosterByDate(date) {
  var d = String(date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return "";
  return (
    "https://cdn.jsdmirror.com/gh/vikiboss/60s-static-host@main/static/images/" +
    d +
    ".png"
  );
}

function notifyWithCtx(ctx, title, subtitle, body, openUrl) {
  console.log("📢 " + title + " - " + subtitle + ": " + body);
  if (openUrl) console.log("🔗 " + openUrl);

  var payload = {
    title: title,
    subtitle: subtitle,
    body: body,
    sound: true
  };
  if (openUrl && /^https?:\/\//i.test(String(openUrl))) {
    payload.action = { type: "openUrl", url: String(openUrl) };
  }

  if (ctx && typeof ctx.notify === "function") {
    try {
      return ctx.notify(payload);
    } catch (e) {
      log("ctx.notify 失败: " + (e && e.message ? e.message : e));
    }
  }

  if (typeof $notification !== "undefined" && $notification.post) {
    try {
      $notification.post(title, subtitle, body);
    } catch (_) {}
  }
}

async function fetchNews(ctx, url) {
  var response = await ctx.http.get(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Egern-60s/" + SCRIPT_VERSION
    },
    timeout: 20000
  });
  var status = response.status;
  var body = await response.text();
  if (!(status >= 200 && status < 300)) throw new Error("HTTP " + status);
  try {
    return JSON.parse(body);
  } catch (e) {
    throw new Error("JSON 解析失败");
  }
}

async function load60s(ctx, apiUrl) {
  var urls = [];
  var seen = {};
  [apiUrl].concat(FALLBACK_APIS).forEach(function (u) {
    if (u && !seen[u]) {
      seen[u] = true;
      urls.push(u);
    }
  });
  var lastErr;
  for (var i = 0; i < urls.length; i++) {
    try {
      log("请求: " + urls[i]);
      var json = await fetchNews(ctx, urls[i]);
      if (json && (json.code === 200 || json.data)) return json;
      lastErr = new Error("返回数据异常");
    } catch (e) {
      lastErr = e;
      log("请求失败: " + (e && e.message ? e.message : e));
    }
  }
  throw lastErr || new Error("全部接口失败");
}

async function main(ctx) {
  var env = (ctx && ctx.env) || {};
  var apiUrl = getEnv(env, ["API_URL"], DEFAULT_API);
  var maxNews = envInt(env, "MAX_NEWS", DEFAULT_MAX_NEWS);
  var multiNotify = envBool(env, "MULTI_NOTIFY", false);
  var chunkSize = Math.max(1, envInt(env, "CHUNK_SIZE", DEFAULT_CHUNK_SIZE));
  var dedupe = shouldDedupe(env);
  var openMode = getEnv(env, ["OPEN_URL"], "image");

  log(
    "开始获取 " + SCRIPT_NAME + " | " + SCRIPT_VERSION + " | multi=" + multiNotify
  );

  try {
    var json = await load60s(ctx, apiUrl);
    var data = json.data || {};
    var date = data.date || "";
    var news = data.news || [];
    var tip = data.tip || "";
    var image = data.image || data.cover || "";
    var dow = data.day_of_week || "";
    var lunar = data.lunar_date || "";

    // 多条通知：用全部新闻拆分（避免 MAX_NEWS=5 且 CHUNK=5 时只剩 1 条）
    if (multiNotify) {
      if (maxNews > chunkSize) news = news.slice(0, maxNews);
    } else if (maxNews > 0) {
      news = news.slice(0, maxNews);
    }

    if (dedupe && date) {
      try {
        var last = await ctx.storage.get(STORE_KEY);
        if (last === date) {
          log("今日已推送，跳过: " + date);
          await notifyWithCtx(
            ctx,
            TITLE_MAIN,
            "已跳过",
            "今日 " + date + " 已推送过",
            ""
          );
          return;
        }
      } catch (e) {
        log("读取去重标记失败: " + (e && e.message ? e.message : e));
      }
    }

    var subtitle = buildSubtitle(lunar, date, dow);
    var openUrl = "";
    if (openMode === "image") {
      openUrl = resolveOpenUrl("image", image);
      if (!openUrl) openUrl = resolveOpenUrl("image", vikiPosterByDate(date));
    }

    var chunks = multiNotify ? chunkArray(news, chunkSize) : [news.slice()];
    var total = chunks.length;
    log(
      "新闻 " +
        news.length +
        " 条，" +
        (multiNotify
          ? "多条通知 " + total + " 条（每条最多 " + chunkSize + "）"
          : "单条通知")
    );

    for (var i = 0; i < total; i++) {
      var startIndex = multiNotify ? i * chunkSize : 0;
      var isLast = i === total - 1;
      var partBody = buildBodyChunk(chunks[i], startIndex, isLast ? tip : "");
      var partTitle =
        total > 1 ? TITLE_MAIN + " (" + (i + 1) + "/" + total + ")" : TITLE_MAIN;
      await notifyWithCtx(
        ctx,
        partTitle,
        subtitle,
        partBody,
        isLast ? openUrl : ""
      );
      if (!isLast) await sleep(500);
    }

    if (dedupe && date) {
      try {
        await ctx.storage.set(STORE_KEY, date);
      } catch (e) {
        log("写入去重标记失败: " + (e && e.message ? e.message : e));
      }
    }

    log("推送完成");
  } catch (error) {
    log("失败: " + (error && error.message ? error.message : error));
    await notifyWithCtx(
      ctx,
      TITLE_MAIN,
      "获取失败",
      String(error && error.message ? error.message : error).slice(0, 200),
      ""
    );
  }
}

export default main;
