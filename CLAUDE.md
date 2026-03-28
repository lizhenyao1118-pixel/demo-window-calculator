# 门窗技术招标文件系统 · CLAUDE.md

## 项目定位
家装门窗采购标准化工具（微信小程序），将采购权力从商家转移给消费者。
品牌："不卖窗的李sir"，中立第三方技术顾问。

## 产品结构
- 免费层：5个参数徽章卡片（K/Rw/SHGC/气密/安全）
- 付费层：四章完整招标文件PDF（¥39/份，验证期限时免费）

## 技术架构
```
前端（微信小程序）→ 云函数（Node.js）→ 云存储（PDF）
```
- 核心计算：calculator-v2.js（热工/隔声/风压/气密/安全）
- PDF生成：pdfBuilder-v2.js + documentMapper.js
- 玻璃仲裁：arbitrator.js

## 数据传递链路（v3.9.1 确定）
```
survey.js → setStorageSync('generatePayload') → generate-loading.js
→ callFunction({ data: { assessmentData: payload } })
→ 云函数 { assessmentData } = event → adaptAssessmentData → calculateAll
→ return { success, fileID, computed: { K_target, Rw_required, ... } }
→ generate-loading 构建 arbitrator → setStorageSync('arbitrator')
→ result-summary.js 读取并渲染
```

## 代码红线（禁止违反）
1. 不改 formData 结构
2. 不改云函数已有接口字段（只允许扩展）
3. 不改 125/125 的测试用例
4. 跨页面传参必须用 storage（禁止 URL query 传大对象）
5. Storage key 必须统一（generatePayload / arbitrator）
6. 所有改动必须 git commit

## 协作规范
1. 合伙人模式：主动参与、少问多做、共同承担风险
2. 代码改动必须转化为 Claude Code 可执行指令
3. 高风险任务（核心计算/数据链路/survey.js）由 Claude Pro 主导
4. 低风险任务（UI/样式）可交 GLM-4.7
5. 先建议后决策，有歧义立即问
6. 启动高风险任务前读本文件
7. 主动校准：发现用户方案存在风险或有更优解时，立即提出，不等被问。包括但不限于：工具选型、技术方案、工作流程、认知盲区
8. 会话结束规范（Claude 主动执行，无需用户提醒）：
   a. 协作复盘三问：
      - 本次什么做得好？→ 考虑固化为 CLAUDE.md 新规范
      - 本次什么做得差？→ 记入 CHANGELOG.md 经验教训
      - 发现什么新认知？→ 写入 PLAYBOOK.md 新条目
   b. 基于复盘输出 Claude Code 执行指令（更新三层文档）
   c. 输出8行状态块供下次对话恢复

## 测试要求
- 单元测试路径：cloudfunctions/generateReport/test/
- 执行命令：cd cloudfunctions/generateReport && npm test
- 基线：125/125 全绿（11个测试套件）
- 任何改动后必须验证不低于基线

## 当前分支
sprint8/a-8a
