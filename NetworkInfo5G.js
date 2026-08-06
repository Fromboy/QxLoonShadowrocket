// NetworkInfoNoTime.js - 最终版：无运营商、无时间、紫蓝渐变背景

export default async function(ctx) {
  const device = ctx.device || {};
  const wifi = device.wifi || {};
  const cellular = device.cellular || {};
  const ipv4 = device.ipv4 || {};
  const ipv6 = device.ipv6 || {};

  // ------------------ 网络类型 & 标题 ------------------
  let networkType = "未连接";
  let icon = "exclamationmark.triangle";
  let iconColor = "#FF3B30";

  if (wifi.ssid) {
    networkType = wifi.ssid;
    icon = "wifi";
    iconColor = "#A8DADC";  // 浅蓝绿，在紫背景突出
  } else if (cellular.radio) {
    let radio = (cellular.radio || "").toUpperCase().replace(/\s/g, "");
    if (radio.includes("NR") || radio === "5G" || radio.includes("NSA") || radio.includes("NR5G")) {
      networkType = "5G";
    } else if (radio.includes("LTE")) {
      networkType = "4G";
    } else {
      networkType = radio || "蜂窝";
    }
    icon = "simcard.fill";
    iconColor = "#F4A261";  // 暖橙突出
  }

  const title = networkType;

  // ------------------ 内网信息 ------------------
  const lines = [];

  if (ipv4.address && ipv4.address !== "0.0.0.0") {
    lines.push(`内网 IPv4: ${ipv4.address}`);
  }

  if (ipv6.address && ipv6.address.includes(":")) {
    lines.push(`内网 IPv6: ${ipv6.address}`);
  }

  // ------------------ 公网信息 ------------------
  let publicIP = "--";
  let location = "--";

  try {
    const resp = await ctx.http.get("http://ip-api.com/json/?lang=zh-CN", { timeout: 6000 });
    if (resp.status === 200) {
      const data = await resp.json();
      if (data.status === "success") {
        publicIP = data.query || "--";
        location = [data.country, data.regionName, data.city]
          .filter(Boolean)
          .join(" ")
          .replace("加利福尼亚", "加州");
      }
    }
  } catch (e) {
    console.log("[IP API Error]", e.message);
  }

  if (publicIP !== "--") {
    lines.push(`公网 IPv4: ${publicIP}`);
  }
  if (location !== "--") {
    lines.push(`位置: ${location}`);
  }

  // ------------------ 小组件 DSL ------------------
  return {
    type: "widget",
    padding: [10, 12, 10, 12],
    gap: 4,
    backgroundGradient: {
      type: "linear",
      colors: ["#2F1C53", "#4B0082", "#6A5ACD", "#483D8B"],
      startPoint: { x: 0, y: 0 },
      endPoint: { x: 1, y: 1 }
    },
    borderRadius: "auto",
    children: [
      // 标题行
      {
        type: "stack",
        direction: "row",
        alignItems: "center",
        gap: 8,
        children: [
          {
            type: "image",
            src: `sf-symbol:${icon}`,
            width: 20,
            height: 20,
            color: iconColor
          },
          {
            type: "text",
            text: title,
            font: { size: "title3", weight: "bold" },
            textColor: "#FFFFFF",
            flex: 1,
            minScale: 0.9
          }
        ]
      },

      // 信息列表（无时间、无额外底部元素）
      ...lines.map((line, index) => ({
        type: "text",
        text: line,
        font: { size: "subheadline" },
        textColor: index >= lines.length - 2 ? "#BBBBBB" : "#E0E0E0",  // 公网部分稍淡
        textAlign: "left",
        lineLimit: 1,
        minScale: 0.85
      }))
    ]
  };
}
