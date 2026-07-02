# 高中理科全科复习 · 安卓 App

首页四大学科：**数学 / 物理 / 化学 / 生物**，点进去按知识点学习（讲解 + 公式 + 表格 + 练习）。
采用「内容数据(JSON) → 静态网页 → Capacitor 打包安卓 → GitHub Actions 云端出 APK」的架构，
与「初中英语提升」项目同一套骨架。

## 目录结构

```
android-app/
├─ www/                     ← 网页内容（电脑上也可直接用本地服务器打开）
│  ├─ index.html            ← 四科入口首页
│  ├─ subject.html          ← 通用学科页（?subject=math/physics/chemistry/biology）
│  ├─ subject.js            ← 学科学习引擎（目录 / 讲解 / 练习）
│  ├─ style.css             ← 样式
│  ├─ tts-bridge.js         ← 朗读桥接（如需读文本）
│  ├─ hw-back.js            ← 安卓返回键处理
│  └─ data/                 ← 各科内容数据（在这里增改内容）
│     ├─ math.json  physics.json  chemistry.json  biology.json
├─ capacitor.config.json
├─ android/                 ← Capacitor 生成的安卓工程
└─ .github/workflows/build-apk.yml   ← 云端自动打包
```

## 怎么加内容

编辑 `www/data/<学科>.json`。格式：

```jsonc
{
  "subject": "数学",
  "categories": ["函数", "概率统计"],       // 左侧目录分组
  "items": [
    {
      "id": "1.1",
      "category": "函数",                    // 属于哪个分组
      "title": "二次函数",
      "sections": [
        { "heading": "概念", "blocks": [
          { "kind": "para",   "text": "段落文字" },
          { "kind": "formula","text": "y = ax² + bx + c" },
          { "kind": "bullet", "text": "要点条目" },
          { "kind": "eg",     "text": "例子" },
          { "kind": "note",   "text": "易错提示" },
          { "kind": "table",  "headers": ["列1","列2"], "rows": [["a","b"]] }
        ] }
      ],
      "exercises": [
        { "q": "题干", "answer": "答案/可接受的另一答案", "tip": "解析" }
      ]
    }
  ]
}
```

- 填空判分会忽略空格与大小写；多个可接受答案用 `/` 分隔（如 `"氧气/O₂/氧"`）。

## 在电脑上预览

进入 `www` 目录，用本地服务器打开（不要直接双击 index.html）：

```powershell
cd www
python -m http.server 8123
```

浏览器打开 http://localhost:8123/index.html

## 打包成 APK（GitHub Actions 云端）

1. 把 `android-app` 目录推到一个新的 GitHub 仓库。
2. 仓库 `Actions` 页面会自动运行「构建安卓 APK」。
3. 成功后在该运行页面底部 `Artifacts` 下载 `gaozhong-lksk-apk`，解压得到 `app-debug.apk`，装到手机即可。
