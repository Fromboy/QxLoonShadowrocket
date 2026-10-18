/**
 * Egern IP 信息与风险评估小组件脚本 (精致天气卡片风格)
 */

const API_URL = "http://ip-api.com/json/?lang=zh-CN";

function fetchIPInfo() {
  return new Promise((resolve) => {
    $httpClient.get({ url: API_URL }, (error, response, data) => {
      if (error || !response || response.status !== 200) {
        console.log("获取 IP 数据失败：", error || (response ? response.status : "未知错误"));
        resolve(null);
        return;
      }
      try {
        const json = JSON.parse(data);
        resolve(json);
      } catch (e) {
        console.log("解析 JSON 失败：", e);
        resolve(null);
      }
    });
  });
}

function calculateRiskValue(isp, org, country) {
  const dataCenterKeywords = ["数据中心", "Amazon", "Google", "Tencent", "Alibaba", "Cloudflare", "IDC", "Hosting", "Server"];
  const homeBroadbandKeywords = ["电信", "移动", "联通", "宽带", "Comcast", "Verizon", "ChinaNet", "Fiber"];
  const highRiskCountries = ["俄罗斯", "印度", "乌克兰"];

  let riskValue = 0;
  let isHomeBroadband = false;

  const targetStr = `${isp} ${org}`.toLowerCase();

  for (let keyword of homeBroadbandKeywords) {
    if (targetStr.includes(keyword.toLowerCase())) {
      isHomeBroadband = true;
      riskValue -= 10;
      break;
    }
  }

  for (let keyword of dataCenterKeywords) {
    if (targetStr.includes(keyword.toLowerCase())) {
      riskValue += 50;
      break;
    }
  }

  if (highRiskCountries.some((riskCountry) => country.includes(riskCountry))) {
    riskValue += 30;
  }

  riskValue = Math.max(0, Math.min(100, riskValue));

  return {
    riskValue,
    isHomeBroadband: isHomeBroadband ? "家宽" : "非家宽",
    isNative: riskValue < 50 ? "原生" : "非原生"
  };
}

export default async function(ctx) {
  const ipInfo = await fetchIPInfo();

  if (!ipInfo) {
    return {
      type: 'widget',
      backgroundColor: { light: '#F2F2F7', dark: '#000000' },
      padding: 10,
      children: [
        {
          type: 'stack',
          backgroundColor: { light: '#FFFFFF', dark: '#1C1C1E' },
          cornerRadius: 20,
          padding: 16,
          children: [
            {
              type: 'text',
              text: '无法获取 IP 数据',
              font: { size: 'footnote', weight: 'bold' },
              textColor: '#FF3B30',
              textAlign: 'center'
            }
          ]
        }
      ]
    };
  }

  const ip = ipInfo.query || "未知";
  const location = `${ipInfo.country || "未知"} ${ipInfo.regionName || ""} ${ipInfo.city || ""}`.trim();
  const isp = ipInfo.isp || "未知";
  const org = ipInfo.org || "";
  const asn = ipInfo.as || "未知 ASN";

  const { riskValue, isHomeBroadband, isNative } = calculateRiskValue(isp, org, location);

  const nativeColor = isNative === "原生" ? "#34C759" : "#FF9500";
  const broadbandColor = isHomeBroadband === "家宽" ? "#34C759" : "#FF9500";
  const riskColor = riskValue > 50 ? "#FF3B30" : "#34C759";

  return {
    type: 'widget',
    backgroundColor: { light: '#F2F2F7', dark: '#000000' },
    padding: 8,
    children: [
      {
        type: 'stack',
        direction: 'vertical',
        backgroundColor: { light: '#FFFFFF', dark: '#1C1C1E' },
        cornerRadius: 20,
        padding: 14,
        gap: 6,
        children: [
          // 第一行：顶部小标签与右侧风险指数
          {
            type: 'stack',
            direction: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            children: [
              {
                type: 'text',
                text: 'IP 评估详情',
                font: { size: 'caption1', weight: 'bold' },
                textColor: { light: '#8E8E93', dark: '#98989D' }
              },
              {
                type: 'text',
                text: `风险: ${riskValue}%`,
                font: { size: 'footnote', weight: 'bold' },
                textColor: riskColor
              }
            ]
          },
          // 第二行：大号核心 IP 数据
          {
            type: 'text',
            text: ip,
            font: { size: 'title2', weight: 'bold' },
            textColor: { light: '#000000', dark: '#FFFFFF' }
          },
          // 第三行：位置与 ASN
          {
            type: 'stack',
            direction: 'vertical',
            gap: 2,
            children: [
              {
                type: 'text',
                text: `📍 ${location}`,
                font: { size: 'footnote' },
                textColor: { light: '#3A3A3C', dark: '#E5E5EA' },
                maxLines: 1
              },
              {
                type: 'text',
                text: `🌐 ${asn}`,
                font: { size: 'caption1' },
                textColor: { light: '#8E8E93', dark: '#98989D' },
                maxLines: 1
              }
            ]
          },
          // 第四行：底部横向标签 (类型 & 宽带)
          {
            type: 'stack',
            direction: 'row',
            alignItems: 'center',
            gap: 16,
            children: [
              {
                type: 'text',
                text: `类型: ${isNative}`,
                font: { size: 'footnote', weight: 'semibold' },
                textColor: nativeColor
              },
              {
                type: 'text',
                text: `宽带: ${isHomeBroadband}`,
                font: { size: 'footnote', weight: 'semibold' },
                textColor: broadbandColor
              }
            ]
          }
        ]
      }
    ]
  };
}
