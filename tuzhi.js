/*
 *
 *
脚本功能：图纸
软件版本：8.22.1
脚本日期：2026-05-13
使用声明：此脚本仅供学习与交流，请在下载使用24小时内删除！请勿在中国大陆转载与贩卖！
***************************
[rewrite_local]
^https://api\.tuzhitong\.com/VipManage/User/GetUserVipManage url script-response-body https://raw.githubusercontent.com/Fromboy/QxLoonShadowrocket/refs/heads/quantumult-x/tuzhi.js

[mitm]
hostname = api.tuzhitong.com
*
*
*/
let obj = JSON.parse($response.body);

if (obj.data) {
  obj.data.isVIP = true;
  obj.data.isTrial = false;
  obj.data.expireTime = "2099-12-31 23:59:59";
  obj.data.expireTimestamp = 4102358400;
}

$done({ body: JSON.stringify(obj) });
