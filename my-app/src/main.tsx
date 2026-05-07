import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./globals.css";

// PWA Service Worker 注册
import { registerSW } from "virtual:pwa-register";

const updateSW = registerSW({
  onNeedRefresh() {
    // 显示更新提示
    if (confirm("有新版本可用，是否立即更新？")) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log("AILL 已可离线使用");
  },
});

const rootElement = document.getElementById("root");
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}