AI智营宝 V4.0 核心功能优化版

主要更新：
1. 版本统一更新为 V4.0。
2. 页面不再显示具体模型名称，只保留“AI图片识别”。
3. 删除“社区支持”模块。
4. 删除“虚拟健康教练”模块。
5. 个性化推荐会根据目标、步数、睡眠、本餐营养动态变化。
6. 点击“更新建议”会重新读取当前输入并更新。
7. 图片识别成功后自动更新个性化建议。
8. 手机照片上传前自动压缩：最长边1280px，JPEG质量0.78。
9. 后端支持CORS/OPTIONS，适配GitHub Pages和手机端。
10. 餐食分类改为粗粒度，避免“温泉蛋牛肉盖饭”等过细名称。
11. Top-5结果中文化显示。

GitHub Pages：
上传 index.html、app.js、styles.css、top5_translate.js 到仓库根目录。

Render：
使用 package.json 和 vision-proxy-server.js。
Build Command: npm install
Start Command: npm start

前端默认接口：
https://aiyingbao2026.onrender.com/api/vision-recognition
