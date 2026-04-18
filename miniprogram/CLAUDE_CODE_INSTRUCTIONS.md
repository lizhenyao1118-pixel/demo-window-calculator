# 输出层架构重构执行指令
# 四个 SPEC，顺序执行，每个 SPEC 完成后立即 commit

BASE = C:\Users\Administrator\Documents\trae_projects\demo-window-calculator\miniprogram
BRANCH = sprint8/a-8a

────────────────────────────────────────────────────────
SPEC-C01 · documentMapper.js（Python 脚本）
────────────────────────────────────────────────────────

执行：
  python spec_c01_documentMapper.py

验证：脚本自带 ✅/❌ 输出，全部 ✅ 后执行 commit。
如有 ❌，停止，不执行后续 SPEC，报告失败项。

Commit：
  git add cloudfunctions/generateReport/documentMapper.js
  git commit -m "feat(C01): add summary object, chapter3 dual-tier, contract comment"

────────────────────────────────────────────────────────
SPEC-C02 · generate-loading.js（完整文件替换）
────────────────────────────────────────────────────────

源文件路径：
  BASE\pages\generate-loading\generate-loading.js

操作：用 spec_c02_generate-loading.js 的内容完整替换目标文件。

验证（替换后检查目标文件包含以下字符串）：
  ✅ app.globalData.reportSummary  = res.result.snapshot.summary || {};
  ✅ wx.setStorageSync('report_snapshot', res.result.snapshot);
  ✅ wx.setStorageSync('report_summary',  res.result.snapshot.summary || {});
  ✅ wx.setStorageSync('report_paid',     false);
  ✅ 不包含字符串：buildUpgradeReasons  （arbitrator 已删除）
  ✅ 不包含字符串：wx.setStorageSync('arbitrator'

Commit：
  git add pages/generate-loading/generate-loading.js
  git commit -m "refactor(C02): remove arbitrator, add storage persistence"

────────────────────────────────────────────────────────
SPEC-C03 · result.js（完整文件替换）
────────────────────────────────────────────────────────

源文件路径：
  BASE\pages\result\result.js

操作：用 spec_c03_result.js 的内容完整替换目标文件。

验证（替换后检查目标文件包含以下字符串）：
  ✅ summary: {},
  ✅ const snapshot = app.globalData.currentReport
  ✅ || wx.getStorageSync('report_snapshot');
  ✅ const savedPaid = wx.getStorageSync('report_paid') || false;
  ✅ wx.setStorageSync('report_paid', true);
  ✅ 不包含字符串：_buildParamCards
  ✅ 不包含字符串：_buildReverseMappings
  ✅ 不包含字符串：getStorageSync('arbitrator')

Commit：
  git add pages/result/result.js
  git commit -m "refactor(C03): storage fallback, remove dead arbitrator code"

────────────────────────────────────────────────────────
SPEC-C04 · result.wxml + result.wxss
────────────────────────────────────────────────────────

【C04-A】result.wxml 完整文件替换
源文件路径：
  BASE\pages\result\result.wxml

操作：用 spec_c04_result.wxml 的内容完整替换目标文件。

验证：
  ✅ 包含 summary.K_target
  ✅ 包含 summary.Rw_required
  ✅ 包含 chapters-wrap
  ✅ 包含 chapters-mask
  ✅ 包含 chapter1.needsAnalysis.budgetFitnessNote
  ✅ 包含 chapter3.safetyBudgetWarning
  ✅ 包含 chapter3.safetyItems
  ✅ 不包含 computed.K_target
  ✅ 不包含 chapter1.redLines
  ✅ 不包含 wx:if="{{isPaid}}"  （付费墙已改为遮罩结构）

【C04-B】result.wxss 末尾追加三个 CSS 类
目标文件：BASE\pages\result\result.wxss

在文件末尾追加（在最后一个 } 之后换行）：

/* 付费墙遮罩结构（方案B升级时只需修改此处样式） */
.chapters-wrap { position: relative; }
.chapters-mask {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(255,255,255,0.85);
  z-index: 10;
}

/* 红线清单推荐项灰色圆点 */
.redline-dot-gray {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #bbb;
  margin-top: 4px;
  flex-shrink: 0;
  margin-right: 10px;
}

验证：
  ✅ 包含 chapters-wrap
  ✅ 包含 chapters-mask
  ✅ 包含 redline-dot-gray

Commit（C04-A 和 C04-B 合并一个 commit）：
  git add pages/result/result.wxml pages/result/result.wxss
  git commit -m "fix(C04): summary binding, mask structure, chapter1/3 fixes, dot-gray"

────────────────────────────────────────────────────────
全部完成后
────────────────────────────────────────────────────────

执行系统健康检查：
  npm test  （或项目的测试命令）

预期：146/146 tests passing
如有失败：停止，报告失败用例，不推送。

部署云函数（documentMapper 有改动）：
  cd C:\Users\Administrator\Documents\trae_projects\demo-window-calculator\miniprogram
  tcb fn deploy generateReport --dir cloudfunctions/generateReport --force
