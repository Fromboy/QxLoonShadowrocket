/*********************
 功能：在 QX 中攔截 HLS 廣告流（.m3u8）
 用法：導入 snippet 模組，可嵌入到主配置中
 注意：需搭配 Rewrite 和 Script 模組啟用
 腳本支援：cmsAdblock.js
 1.	📦 Stash 去广告规则（.stoverride）Stash=Modules → Override將 .stoverride 作為模組載入
 https://raw.githubusercontent.com/Fromboy/QxLoonShadowrocket/refs/heads/Stash/cms_adblock.stoverride
 2.	🌕 Loon 去广告插件（.plugin）Loon插件中心使用 .plugin 插件導入
 https://raw.githubusercontent.com/Fromboy/QxLoonShadowrocket/refs/heads/Loon/cmsAdblock.plugin
 3.	🌌 Quantumult X 去广告片段（.snippet）Quantumult X配置文件中 snippet在 [rewrite_local] 引入片段或直接粘貼內容到复写
 https://raw.githubusercontent.com/Fromboy/QxLoonShadowrocket/refs/heads/quantumult-x/cms_adblock.js
**********************/
[rewrite_local]
# 暴風跑馬燈
^https?:\/\/s\d+\.bfengbf\.com\/video(.+)_z5q\.ts $1$2.ts

[script_local]
# Blacklist of ad-blocking scripts for various domains
http-response ^https?:\/\/m3u8\.(hmrvideo|heimuertv)\.com\/play\/(.+)\.m3u8 script-path=https://raw.githubusercontent.com/Fromboy/JavaScript/refs/heads/Scripts/cmsAdblock.js, requires-body=true, timeout=30, tag=去廣告｜黑木耳
http-response ^https?:\/\/((?:v\.lzcdn|v\.cdnlz|vip.*\.lz[-]?cdn)\d+\.com)\/.+\/hls\/.+\.m3u8 script-path=https://raw.githubusercontent.com/Fromboy/JavaScript/refs/heads/Scripts/cmsAdblock.js, requires-body=true, timeout=30, tag=去廣告｜量子資源
http-response ^https?:\/\/(super|svipsvip|vip)\.ffzy[A-Za-z0-9-]+\.com\/.+\/hls\/.+\.m3u8 script-path=https://raw.githubusercontent.com/Fromboy/JavaScript/refs/heads/Scripts/cmsAdblock.js, requires-body=true, timeout=30, tag=去廣告｜非凡資源
http-response ^https?:\/\/c\d+\.rrcdnbf\d+\.com\/video\/(.+)\.m3u8 script-path=https://raw.githubusercontent.com/Fromboy/JavaScript/refs/heads/Scripts/cmsAdblock.js, requires-body=true, timeout=30, tag=去廣告｜暴風影視
http-response ^https?:\/\/vip\.kuaikan-(cdn|play)\d+\.com\/.+\/hls\/.+\.m3u8 script-path=https://raw.githubusercontent.com/Fromboy/JavaScript/refs/heads/Scripts/cmsAdblock.js, requires-body=true, timeout=30, tag=去廣告｜快看資源
http-response ^https:\/\/bfikuncdn\.com\/.+\/hls\/.+\.m3u8 script-path=https://raw.githubusercontent.com/Fromboy/JavaScript/refs/heads/Scripts/cmsAdblock.js, requires-body=true, timeout=30, tag=去廣告｜ikun
http-response ^https:\/\/play\.modujx\d+\.com\/.+\/hls\/.+\.m3u8 script-path=https://raw.githubusercontent.com/Fromboy/JavaScript/refs/heads/Scripts/cmsAdblock.js, requires-body=true, timeout=30, tag=去廣告｜魔都動漫
http-response ^https:\/\/vod\.lyhuicheng\.com\/.+\/hls\/.+\.m3u8 script-path=https://raw.githubusercontent.com/Fromboy/JavaScript/refs/heads/Scripts/cmsAdblock.js, requires-body=true, timeout=30, tag=去廣告｜360
http-response ^https:\/\/ukzy\.ukubf\d+\.com\/.+\/hls\/.+\.m3u8 script-path=https://raw.githubusercontent.com/Fromboy/JavaScript/refs/heads/Scripts/cmsAdblock.js, requires-body=true, timeout=30, tag=去廣告｜U酷資源
http-response ^https:\/\/.+\.wgslsw\.com\/.+\.m3u8 script-path=https://raw.githubusercontent.com/Fromboy/JavaScript/refs/heads/Scripts/cmsAdblock.js, requires-body=true, timeout=30, tag=去廣告｜櫻花資源
http-response ^https:\/\/leshiyuncdn\.36s\.top\/.+\.m3u8 script-path=https://raw.githubusercontent.com/Fromboy/JavaScript/refs/heads/Scripts/cmsAdblock.js, requires-body=true, timeout=30, tag=去廣告｜樂視資源
http-response ^https:\/\/.+\.feidaozy\.com\/.+\/hls\/.+\.m3u8 script-path=https://raw.githubusercontent.com/Fromboy/JavaScript/refs/heads/Scripts/cmsAdblock.js, requires-body=true, timeout=30, tag=去廣告｜飛刀資源
http-response ^https:\/\/askzycdn\.com\/.+\/hls\/.+\.m3u8 script-path=https://raw.githubusercontent.com/Fromboy/JavaScript/refs/heads/Scripts/cmsAdblock.js, requires-body=true, timeout=30, tag=去廣告｜奧斯卡資源
http-response ^https:\/\/.+\.97img\.com\/.+\.m3u8 script-path=https://raw.githubusercontent.com/Fromboy/JavaScript/refs/heads/Scripts/cmsAdblock.js, requires-body=true, timeout=30, tag=去廣告｜91麻豆
http-response ^https:\/\/.+\.bfbfhao\.com\/.+\/hls\/.+\.m3u8 script-path=https://raw.githubusercontent.com/Fromboy/JavaScript/refs/heads/Scripts/cmsAdblock.js, requires-body=true, timeout=30, tag=去廣告｜番號資源
http-response ^https:\/\/player\.cl9987\.com:188\/.+\/hls\/.+\.m3u8 script-path=https://raw.githubusercontent.com/Fromboy/JavaScript/refs/heads/Scripts/cmsAdblock.js, requires-body=true, timeout=30, tag=去廣告｜草榴資源
http-response ^https:\/\/v\.ykv3\.com\/.+\/hls\/.+\.m3u8 script-path=https://raw.githubusercontent.com/Fromboy/JavaScript/refs/heads/Scripts/cmsAdblock.js, requires-body=true, timeout=30, tag=去廣告｜易看資源
http-response ^https:\/\/.+\.3sybf\.com\/.+\/hls\/.+\.m3u8 script-path=https://raw.githubusercontent.com/Fromboy/JavaScript/refs/heads/Scripts/cmsAdblock.js, requires-body=true, timeout=30, tag=去廣告｜鯊魚資源
http-response ^https:\/\/bfnxxcdn\.com\/.+\/hls\/.+\.m3u8 script-path=https://raw.githubusercontent.com/Fromboy/JavaScript/refs/heads/Scripts/cmsAdblock.js, requires-body=true, timeout=30, tag=去廣告｜奶香香
http-response ^https:\/\/player\.huangguam3u\.com\/.+\/hls\/.+\.m3u8 script-path=https://raw.githubusercontent.com/Fromboy/JavaScript/refs/heads/Scripts/cmsAdblock.js, requires-body=true, timeout=30, tag=去廣告｜黃瓜資源

[mitm]
hostname = m3u8.heimuertv.com, m3u8.hmrvideo.com, v.cdnlz*.com, v.lzcdn*.com, vip*.lz-cdn*.com, vip.lzcdn*.com, *.ffzy*.com, *.rrcdnbf*.com, vip.kuaikan*.com, bfikuncdn.com, play.modujx*.com, vod.lyhuicheng.com, ukzy.ukubf*.com, *.wgslsw.com, askzycdn.com, t0.97img.com, *.bfbfhao.com, player.cl9987.com:188, v.ykv3.com, *.3sybf.com, bfnxxcdn.com, player.huangguam3u.com, leshiyuncdn.36s.top, cs1.feidaozy.com
