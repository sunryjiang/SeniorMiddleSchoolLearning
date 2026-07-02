/*
 * 接管安卓系统返回键 / 右滑返回手势：
 *  - 有上一界面时，返回上一界面（而不是直接退出 App）
 *  - 已经在最上层（首页）时，才退出 App
 * 仅在 Capacitor 原生环境下生效。
 */
(function () {
  "use strict";
  var Cap = window.Capacitor;
  if (!(Cap && typeof Cap.isNativePlatform === "function" && Cap.isNativePlatform())) return;
  var App = Cap.Plugins && Cap.Plugins.App;
  if (!App || !App.addListener) return;

  App.addListener("backButton", function (e) {
    if (e && e.canGoBack) {
      window.history.back();
    } else {
      App.exitApp();
    }
  });
})();
