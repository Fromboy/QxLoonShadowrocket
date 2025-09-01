/*
// Quantumult X 节点名称和国旗替换脚本 (支持常见国家)
// 该脚本将根据节点名称中的关键词匹配替换相应的国家名称及国旗。
// 把该脚本写入重写并打开Quantumult X资源解析器

[rewrite_remote]
https?:\/\/.*\/(subscribe|nodes|getProfile|v2ray|ss|clash|api\/v\d+\/(profile|nodes)|sub|config|link\/[^\/]+)(?:\?.*)?$ url script-response-body https://raw.githubusercontent.com/Fromboy/QxLoonShadowrocket/refs/heads/quantumult-x/RenameNode.js, tag=RenameNode, update-interval=86400, enabled=true

*/

let body = $response.body;
// 全球国家和地区国旗映射表
const countryFlags = {
  "美国|USA|United States|US": "United States 🇺🇸",
  "中国|China|CN": "China 🇨🇳",
  "香港|Hong Kong|HK": "Hong Kong 🇭🇰",
  "台湾|Taiwan|TW": "Taiwan 🇹🇼",
  "日本|Japan|JP": "Japan 🇯🇵",
  "韩国|South Korea|Korea|KR": "South Korea 🇰🇷",
  "新加坡|Singapore|SG": "Singapore 🇸🇬",
  "英国|United Kingdom|UK|England": "United Kingdom 🇬🇧",
  "澳大利亚|Australia|AU": "Australia 🇦🇺",
  "加拿大|Canada|CA": "Canada 🇨🇦",
  "德国|Germany|DE": "Germany 🇩🇪",
  "法国|France|FR": "France 🇫🇷",
  "意大利|Italy|IT": "Italy 🇮🇹",
  "西班牙|Spain|ES": "Spain 🇪🇸",
  "俄罗斯|Russia|RU": "Russia 🇷🇺",
  "印度|India|IN": "India 🇮🇳",
  "巴西|Brazil|BR": "Brazil 🇧🇷",
  "泰国|Thailand|TH": "Thailand 🇹🇭",
  "越南|Vietnam|VN": "Vietnam 🇻🇳",
  "马来西亚|Malaysia|MY": "Malaysia 🇲🇾",
  "印尼|Indonesia|ID": "Indonesia 🇮🇩",
  "菲律宾|Philippines|PH": "Philippines 🇵🇭",
  "阿联酋|United Arab Emirates|UAE|AE": "United Arab Emirates 🇦🇪",
  "沙特阿拉伯|Saudi Arabia|SA": "Saudi Arabia 🇸🇦",
  "南非|South Africa|ZA": "South Africa 🇿🇦",
  "土耳其|Turkey|TR": "Turkey 🇹🇷",
  "荷兰|Netherlands|NL": "Netherlands 🇳🇱",
  "瑞典|Sweden|SE": "Sweden 🇸🇪",
  "瑞士|Switzerland|CH": "Switzerland 🇨🇭",
  "挪威|Norway|NO": "Norway 🇳🇴",
  "新西兰|New Zealand|NZ": "New Zealand 🇳🇿",
  "墨西哥|Mexico|MX": "Mexico 🇲🇽",
  "阿根廷|Argentina|AR": "Argentina 🇦🇷",
  "智利|Chile|CL": "Chile 🇨🇱",
  "埃及|Egypt|EG": "Egypt 🇪🇬",
  "以色列|Israel|IL": "Israel 🇮🇱",
  "乌克兰|Ukraine|UA": "Ukraine 🇺🇦",
  "波兰|Poland|PL": "Poland 🇵🇱",
  "芬兰|Finland|FI": "Finland 🇫🇮",
  "丹麦|Denmark|DK": "Denmark 🇩🇰",
  "奥地利|Austria|AT": "Austria 🇦🇹",
  "比利时|Belgium|BE": "Belgium 🇧🇪",
  "葡萄牙|Portugal|PT": "Portugal 🇵🇹",
  "希腊|Greece|GR": "Greece 🇬🇷",
  "爱尔兰|Ireland|IE": "Ireland 🇮🇪"
};

try {
  // 确保 body 是字符串
  if (typeof body === "string") {
    let newBody = body;
    // 遍历 countryFlags 进行替换
    for (const [pattern, replacement] of Object.entries(countryFlags)) {
      const regex = new RegExp(`^(.*?)(?:${pattern})(.*?)$`, "gm");
      newBody = newBody.replace(regex, `$1${replacement}$2`);
    }
    $done({ body: newBody });
  } else {
    // 如果 body 不是字符串，直接返回原 body
    $done({ body });
  }
} catch (error) {
  console.log("Error in script: " + error.message);
  $done({ body });
}
