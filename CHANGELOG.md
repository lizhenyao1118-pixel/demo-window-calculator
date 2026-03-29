# CHANGELOG

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

## 2026-03 早期 · v3.5.0-v3.8.x · Sprint 8A + PDF审计

**改动：**
- Sprint 8A: 商家端报价流程（vendor_responses集合）
- Sprint 7: PDF审计23项优化，v3.4.1
- Sprint 6: 水密气密等级推导（GB/T 7106）
- Sprint 5: 红线规格/单元测试覆盖/气候区修复

**测试：** 125/125 全绿
