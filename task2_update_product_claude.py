# task2_update_product_claude.py
with open('product/PRODUCT_CLAUDE.md', 'r', encoding='utf-8') as f:
    text = f.read()

# ── 修改①：开头 header 加强制读取声明 ──
old1 = '> 本文件是Claude在此Project的操作手册。每次对话开始时优先读取。\n> 最后更新：2026-04-07 · sprint8/a-8a'
new1 = '> 本文件是Claude在此Project的操作手册。每次对话开始时优先读取。\n> 启动时同时读取 product/CORE_LOGIC.md，两文件均须对齐后方可执行。\n> 最后更新：2026-04-10 · sprint8/a-8a'
assert old1 in text, "❌ 修改①定位失败，请检查原文"
text = text.replace(old1, new1, 1)

# ── 修改②：第二节补全协作原则 v2.0 ──
old2 = '''**执行合伙人，不是执行工具。**

- 产品决策层（What / Why / 优先级）：在此Project讨论，Claude有独立判断义务
- 技术执行层（How / 实现）：移交Claude Code
- 发现产品逻辑漏洞：主动提出，不等李Sir问
- 价格、定位等未确认事项：不替李Sir假设'''
new2 = '''**执行合伙人，不是执行工具。**

- 产品决策层（What / Why / 优先级）：在此Project讨论，Claude有独立判断义务
- 技术执行层（How / 实现）：移交Claude Code
- 发现产品逻辑漏洞：主动提出，不等李Sir问
- 价格、定位等未确认事项：不替李Sir假设

**预判扫描（每次任务启动时强制执行）**
在进入任何任务之前完成以下扫描；发现风险必须在任务开始前主动提出：
1. 当前信息是否完整？有没有未核查的假设？
2. 这个任务完成后，下一个可预期的问题是什么？
3. 当前系统已知瓶颈中，有哪个会被本次任务触发？

**系统健康检查（每次会话结束时执行）**
- 本次是否发现新的系统瓶颈？→ 更新下方瓶颈清单
- 是否有"应该说但没说"的判断？→ 记入 CHANGELOG
- 文档是否需要更新？→ 输出更新指令，不等李Sir问'''
assert old2 in text, "❌ 修改②定位失败，请检查原文"
text = text.replace(old2, new2, 1)

# ── 修改③：版本快照更新 ──
old3 = '''| 版本号 | v4.0.1 · sprint8/a-8a |
| 测试覆盖 | 145/145 passing（commit 3fc2560） |
| 核心逻辑基线 | 已建立，见 CORE_LOGIC.md |
| 生产部署 | generateReport + createTender 已上线 |
| 超时设置 | 20秒 |
| PDF页数 | 9页 |
| 四章重构 | v4.0.1 完成，ch2甲方定位/ch3红线清单（禁止项+安全底线）/ch4配置推导 |'''
new3 = '''| 版本号 | v4.0.8 · sprint8/a-8a |
| 测试覆盖 | 146/146 passing（commit 8943a91） |
| 核心逻辑基线 | 已建立，见 CORE_LOGIC.md |
| 生产部署 | generateReport + createTender + generatePDF 已上线验证 |
| 超时设置 | 20秒 |
| PDF页数 | 7页（Puppeteer迁移后，commit dec8edf） |
| 四章重构 | v4.0.1 完成，ch2甲方定位/ch3红线清单（禁止项+安全底线）/ch4配置推导 |
| SPEC-P | Puppeteer PDF迁移完成（P1–P4），烟雾测试通过，中文无乱码 |'''
assert old3 in text, "❌ 修改③定位失败，请检查原文"
text = text.replace(old3, new3, 1)

with open('product/PRODUCT_CLAUDE.md', 'w', encoding='utf-8') as f:
    f.write(text)

print("PRODUCT_CLAUDE.md 更新完成（3处修改）")