# -*- coding: utf-8 -*-
"""
CORE_LOGIC.md 四段补丁脚本
=========================

功能：
1. 第五B「待清理技术债」表格：删 DEBUG log 行，新增生产日志清理行
2. 第八节「下一版本待定」表格：水密性/DEBUG 关闭 + 新增 B01/B02/回滚三条
3. 第九节「活跃决策日志」活跃条目：新增 5 条本次会话记录
4. 新增第十节「架构级待办」整段

使用方式：
    python update_core_logic.py <path-to-CORE_LOGIC.md>

执行前会打印每个 replacement 的命中情况，全部命中才真正写入。
任何一处未命中都会中止，不写入文件。
"""

import sys
from pathlib import Path


def apply_patches(content: str):
    """应用所有补丁，返回 (new_content, report)。
    任一补丁未命中返回 (None, report)。"""
    report = []
    new_content = content

    # ========== 补丁 1：第五B 表格 ==========
    # 删除 DEBUG log 行（该行此时是技术债表格首行）
    p1_old = "| DEBUG log | index.js 第331–332行 | 🔴 下次会话执行 |\n| PDF残留代码 | result.js `downloadPDF()` / `previewPDF()` / `fileID` | 🟡 确认无调用后清理 |\n| 废弃云函数 | 见上表❌条目 | 🟡 确认无调用后删除 |"
    p1_new = "| PDF残留代码 | result.js `downloadPDF()` / `previewPDF()` / `fileID` | 🟡 确认无调用后清理 |\n| 废弃云函数 | 见上表❌条目 | 🟡 确认无调用后删除 |\n| 生产日志清理 | generateReport/index.js `[Cloud]` 前缀 console.log（128/131/137/141-144/241-242行） | 🟡 推广引流后处理 |"

    if p1_old not in new_content:
        return None, [("补丁1 第五B表格", "未命中")]
    new_content = new_content.replace(p1_old, p1_new, 1)
    report.append(("补丁1 第五B表格", "OK"))

    # ========== 补丁 2：第八节「下一版本待定」表格 ==========
    # 2A：水密性 levelBar 溢出修复 → 已关闭
    p2a_old = "| 水密性 levelBar 溢出修复 | 🔲 待执行 | `_barPosition` 加 `Math.min(95, pos)` 上限，不阻塞发布 |"
    p2a_new = "| 水密性 levelBar 溢出修复 | ✅ 已关闭 | 代码侧 Math.min(95,pos) 早已存在，条目登记过时；下限 5→0 越权改动已回滚（commit 1411bad） |"

    if p2a_old not in new_content:
        return None, report + [("补丁2A 水密性状态变更", "未命中")]
    new_content = new_content.replace(p2a_old, p2a_new, 1)
    report.append(("补丁2A 水密性状态变更", "OK"))

    # 2B：DEBUG log → 已关闭
    p2b_old = "| 清除 DEBUG log（index.js 331-332行） | 🔲 待执行 | 只删两行，不改周边逻辑 |"
    p2b_new = "| 清除 DEBUG log（index.js 331-332行） | ✅ 已关闭 | 行号漂移，331-332 为 snapshot.summary 生产代码，全文无 DEBUG 字串 |"

    if p2b_old not in new_content:
        return None, report + [("补丁2B DEBUG log 状态变更", "未命中")]
    new_content = new_content.replace(p2b_old, p2b_new, 1)
    report.append(("补丁2B DEBUG log 状态变更", "OK"))

    # 2C：表格末尾新增 3 条（在「进场核查拍摄清单渲染实现」之后插入）
    p2c_old = "| 进场核查拍摄清单渲染实现 | 🔲 待执行 | M4-4，基于 CONTENT_DEFINITION_v1.1.md 第九节 |"
    p2c_new = (
        "| 进场核查拍摄清单渲染实现 | 🔲 待执行 | M4-4，基于 CONTENT_DEFINITION_v1.1.md 第九节 |\n"
        "| B02 导航栏术语统一 | ✅ 已完成 | commit 60a56a2；survey.json navigationBarTitleText |\n"
        "| B01 K值提示呈现层兜底 | ✅ 已完成 | commit 60a56a2；selfK==kMin 显示单点；规则层见第十节议题1 |\n"
        "| 水密性 levelBar 下限回滚 | ✅ 已完成 | commit 1411bad；越权改动 5→0 还原 |"
    )

    if p2c_old not in new_content:
        return None, report + [("补丁2C 新增3条完成项", "未命中")]
    new_content = new_content.replace(p2c_old, p2c_new, 1)
    report.append(("补丁2C 新增3条完成项", "OK"))

    # ========== 补丁 3：第九节「活跃决策日志」活跃条目新增 5 条 ==========
    # 在「2026-04-14 输出层三文档升版v1.1」后追加
    p3_old = "| 2026-04-14 | ✅ 完成 | 输出层三文档升版v1.1 | OUTPUT_LAYER_DESIGN / SNAPSHOT_SCHEMA / CONTENT_DEFINITION 均已更新；基线 commit 66a17a5 |"
    p3_new = (
        "| 2026-04-14 | ✅ 完成 | 输出层三文档升版v1.1 | OUTPUT_LAYER_DESIGN / SNAPSHOT_SCHEMA / CONTENT_DEFINITION 均已更新；基线 commit 66a17a5 |\n"
        "| 2026-04-19 | ✅ 完成 | 推广引流前技术债清扫 | commit 60a56a2；B02 术语统一 + B01 呈现层兜底；水密性/DEBUG 两项过时条目关闭 |\n"
        "| 2026-04-19 | ✅ 完成 | 水密性 levelBar 下限回滚 | commit 1411bad；Claude Code 越权改动（5→0）还原，流程规范见 PRODUCT_CLAUDE.md H7 |\n"
        "| 2026-04-19 | 📋 登记 | 架构级待办入库标准建立 | 四条特征：跨≥2文件管道/H3字段语义/需前置验证/触碰核心原则；见第十节 |\n"
        "| 2026-04-19 | 📋 登记 | 自采暖 K 值规则层重写 | 见第十节架构级待办议题1；推广引流后第一迭代 |\n"
        "| 2026-04-19 | 📋 登记 | Claude Code H7 规范升级 | SPEC 前提不成立必须停机；不得自主另选修改点；PRODUCT_CLAUDE.md 已更新 |"
    )

    if p3_old not in new_content:
        return None, report + [("补丁3 活跃决策日志新增", "未命中")]
    new_content = new_content.replace(p3_old, p3_new, 1)
    report.append(("补丁3 活跃决策日志新增", "OK"))

    # ========== 补丁 4：新增第十节「架构级待办」 ==========
    # 插入到文件末尾「*本文件由产品决策对话生成...*」之前
    p4_old = "---\n\n*本文件由产品决策对话生成，修改须经李Sir确认后方可更新。*"
    p4_new = """---

## 十、架构级待办

> 非技术债清扫可完成的议题。本段登记的议题须走完整 SPEC 设计 + 可行性前置验证流程，不得在一次会话内边讨论边执行。
> 每次会话触及此段议题时，必须先切换产品审查官视角做方向校准。

### 入库标准

议题满足以下任一特征即入库：
1. 改动需跨 ≥2 个文件的数据管道
2. 涉及字段语义变更（H3）
3. 需要前置可行性验证才能进入 SPEC 设计
4. 影响核心产品原则中「不得违反」条款

登记内容必需：问题描述 · 当前处置 · 候选方向 · 影响范围 · 决策前必需数据 · 约束条件。

---

### 议题 1：自采暖 K 值加严规则重写

**登记日期：** 2026-04-19
**触发入库标准：** 2（H3 字段语义）+ 4（触碰原则 5：信息呈现型语言）

**问题描述：**
当前规则 `selfK = kBase - 0.2` 在 CLIMATE_SPEC 十个城市中有 9 个退化为点值（`selfK === kMin`），仅沈阳（严寒区 kMin=1.5）维持区间。字面"加严"实际数值等于 kMin（集中供暖区间下沿），用户细看会发现"加严"是文字游戏，违反产品核心价值主张「我没有被忽悠」。

**当前处置：**
2026-04-19 呈现层兜底（B01，commit `60a56a2`）—— `selfK==kMin` 时显示单点值，消除字面矛盾。规则层未重写。

**候选方向：**

- 方向 1（如实表达）：承认规则等效于"目标值 = kMin"，呈现层表述为"自采暖目标 ≤ kMin"，放弃"自采暖更严"的差异化定位。
- 方向 2（规则重写）：重新定义加严规则使之真正严于集中供暖（如 `selfK = kMin - 0.1`），需验证 K < kMin 的工程意义与成本可行性。
- 方向 3（取消加严）：自采暖 K 值不单独处理，差异化改走其它维度（如玻璃档位下移、型材档位提升）。
- 方向 4（延后决策）：推广后收集种子用户实际 K 值反馈（用户是否关注到"加严"这个措辞、是否理解差异、是否影响选择），基于真实数据再决策。

**影响范围（跨文件）：**
- `survey.js updateHeatingKTips()` 文案
- `calculator-v2.js` K_target 计算
- `arbitrator.js` 玻璃/隔热条仲裁
- `documentMapper.js` 第一、二章 K 值写入
- `redlineSpec.js` 热工红线阈值

**决策前必需数据：**
- 自采暖 K 值加严规则的原始依据（工程经验 / 国标 / 临时起笔）
- 方向 2 若选：K < kMin 在主流气候区的工程依据、成本爬升曲线、用户预算承受度
- 方向 3 若选：自采暖差异化走哪个维度、配置层仲裁如何改
- 方向 4 若选：种子用户反馈收集口径（如何问才能得到有效答案）

**约束条件：**
- 不得在推广引流前改动
- 重写前须完整 SPEC，含只读验证门（K_target 在全部下游的字段路径）
- 必须覆盖五个文件的字段语义一致性
- 若选方向 2/3，必须走完 PRODUCT_CLAUDE.md 第五节「架构级方案选择」流程

---

*本文件由产品决策对话生成，修改须经李Sir确认后方可更新。*"""

    if p4_old not in new_content:
        return None, report + [("补丁4 新增第十节", "未命中")]
    new_content = new_content.replace(p4_old, p4_new, 1)
    report.append(("补丁4 新增第十节", "OK"))

    return new_content, report


def main():
    if len(sys.argv) != 2:
        print("用法: python update_core_logic.py <path-to-CORE_LOGIC.md>")
        sys.exit(1)

    path = Path(sys.argv[1])
    if not path.exists():
        print(f"错误：文件不存在 {path}")
        sys.exit(1)

    original = path.read_text(encoding="utf-8")
    new_content, report = apply_patches(original)

    print("=" * 60)
    print("补丁命中报告：")
    print("=" * 60)
    for name, status in report:
        print(f"  {status:4s}  {name}")
    print("=" * 60)

    if new_content is None:
        print("\n有补丁未命中，文件未写入。请检查 CORE_LOGIC.md 当前状态。")
        sys.exit(1)

    # 备份 + 写入
    backup_path = path.with_suffix(path.suffix + ".bak")
    backup_path.write_text(original, encoding="utf-8")
    path.write_text(new_content, encoding="utf-8")

    print(f"\n✓ 已写入 {path}")
    print(f"✓ 备份保存至 {backup_path}")
    print("\n建议后续手动检查：")
    print(f"  git diff {path}")


if __name__ == "__main__":
    main()
