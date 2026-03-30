# CHANGELOG

## 2026-03-30 · Sprint-Content · 冷启动内容策略全链路

### 完成事项
- 种子用户验证Pass Criteria定义（H1完成率≥70% / H2感知价值≥60% / H3付费意愿≥40%）
- 极简冷启动策略确认：唯一阵地小红书，每周3篇，第1个月12篇排期完成
- 第01篇完整执行：正文定稿+国标数据核实+5张配图生成（1080×1080封面+1080×1440内容图×4）

### 关键数据核实
- 外窗主型材壁厚：≥1.8mm（GB/T 8478-2020 第5.1.2.1.2条）
- 内窗壁厚：≥1.4mm（易混淆，已纠正）
- 密封胶条：EPDM三元乙丙（附录B）

### AI工具分工确认
- Perplexity：市场情报+数据初审（初审员，非专家）
- NotebookLM：国标查询+内容初稿生成
- Claude对话：SVG代码生成图（替代Canva手动操作）
- 李sir本人：唯一专业审核者+最终决策

### 配图生成工作流
- 工具链：cairosvg + Python脚本 + Noto Sans CJK SC字体
- 脚本路径：/home/claude/gen_images.py（下次可复用）
- 输出规格：PNG，1080×1080（封面）/ 1080×1440（内容图）

---

## 2026-03-29 · v3.9.2 · 6卡参数展示 + 云函数完整化

**改动：**
- fix: 修复 createTender 云函数跨目录依赖（复制9个共享模块）
- fix: 新建 tenders 数据库集合（tenderId生产就绪）
- fix: generateReport 返回 computed 补充 airRec/waterRec/wind_zone
- fix: tenderSections.parameterTable 从 computed 直接构建
- fix: heatingAction 补充中文枚举值匹配（集中/自采暖/无供暖）
- fix: sections fallback 补足3条默认文案（当corrections<3时）
- feat: result-summary 合并至 result 页，消除重复 generateReport 调用
- feat: 参数卡片升级为6卡3列布局（保温/隔音/遮阳/抗风压/密封性能/安全）
- feat: 删除 AB 实验 Banner 和「在线预览」按钮
- feat: CTA文案改为「¥99 限时免费，直接发给商家比价」
- feat: CTA区块fixed底部定位，按钮与提示文字纵向排列
- chore: arbitrary.params扩展为8字段（新增P3/windZone/airRec/waterRec）

**Git Commits：**
7fbe262, b65bddf, 70d9dd7, 9038281

**测试：** 125/125 全绿

**经验教训：**
- 云函数跨目录引用需在目标函数内复制所有依赖，无法直接require其他函数
- 二级依赖需递归检查，一次性复制完整（否则部署后仍报找不到模块）
- Markdown删除线(~~text~~)在WXML中会竖排，改用原生双text + text-decoration实现

---

## 2026-03-28 · v3.9.1 · 数据链路全修复

**改动：**
- fix: survey.js URL传参改为storage（避免1024字符截断）
- fix: 删除survey.js/result-summary.js重复callFunction调用
- fix: 云函数return扩展computed字段（S7参数卡片数据源）
- fix: buildReverseMappings增加title/description字段映射
- feat: S7结果摘要页4文件 + generate-loading页4文件
- chore: 全部未提交文件分批commit，工作区clean

**Git Commits：**
9a6a664, cafc648, e6e8fa7, d920eb5, bbbf7a7, 2934381, 1a13d27, 51f12d7

**测试：** 125/125 全绿

**经验教训：**
- 全局搜索callFunction防止双重调用
- 大对象跨页面传递必须用storage
- 硬编码测试法是终极排查手段

---

## 2026-03-28 · v3.9.0 · S7实现 + arbitrator链路设计

**改动：**
- feat: result-summary.js/wxml/wxss/json（383行）
- fix: survey.js:285缺少逗号
- design: arbitrator数据结构确定（params/riskLevel/riskReason/sections）
- design: riskLevel三级制（高=安全冲突/中=预算冲突/低=无）
- design: factor_to_action映射表（5条规则）

**测试：** 125/125 全绿

---

## 2026-03-30 · [v3.9.2-patch] · Sprint 8A 收尾

**完成：**
- feat: PDF免责声明插入 pdfBuilder-v2.js (SPEC-PDF-DISCLAIMER-v1.0) · 58c8939
- fix: 免责声明迁移至正确文件 pdfBuilder-v2.js，对齐v2布局参数 · 58c8939
- feat: 前端视觉优化封面+问卷页 (SPEC-UI-SURVEY-v1.0) · 04b1643
- fix(pdf): P-01 封面重复品牌描述删除 · 6ca23a8
- fix(pdf): P-06 尾页页脚删除重复免责内容 · 0364559
- fix(pdf): P-02 预算提示不再独占新页（二次修复）· 6fa3ec3
- fix(pdf): P-03 升级项强制新页避免跨页（二次修复）· a113878
- fix(pdf): P-04 CTA改为描边卡片 · 3197c67
- fix(pdf): P-05 安全专项符号统一为⚠ · 29fd616
- fix(pdf): P-07 水密性双行显示 · 02017ad
- docs: 新建CLAUDE.md同步v3.9.2状态 · 8986af6
- 云函数超时调整为20秒（微信云开发控制台）

**待验收：**
- P-02/P-03 修复已提交，待重新部署 generateReport 后视觉验收

**经验教训：**
- pdfBuilder.js 与 pdfBuilder-v2.js 并存，index.js 只引用 v2，改错文件浪费一轮排查
- PDF生成耗时随参数复杂度变化，超时阈值需留足余量（建议≥20秒）
- Claude Code 工作目录必须 cd 到项目根目录再执行，否则文档写到错误路径

**测试：** 125/125 全绿

---

## 2026-03 早期 · v3.5.0-v3.8.x · Sprint 8A + PDF审计

**改动：**
- Sprint 8A: 商家端报价流程（vendor_responses集合）
- Sprint 7: PDF审计23项优化，v3.4.1
- Sprint 6: 水密气密等级推导（GB/T 7106）
- Sprint 5: 红线规格/单元测试覆盖/气候区修复

**测试：** 125/125 全绿
