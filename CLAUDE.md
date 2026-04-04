# 门窗技术招标文件系统 · CLAUDE.md

## 项目定位
家装门窗采购标准化工具（微信小程序），将采购权力从商家转移给消费者。
品牌："不卖窗的李sir"，中立第三方技术顾问。

## 产品结构
- 免费层：6个参数卡片（保温/隔音/遮阳/抗风压/密封性能/安全）
- 付费层：四章完整招标文件PDF（¥39/份，验证期限时免费）

## 技术架构
```
前端（微信小程序）→ 云函数（Node.js）→ 云存储（PDF）
```
- 核心计算：calculator-v2.js（热工/隔声/风压/气密/安全）
- PDF生成：pdfBuilder-v2.js + documentMapper.js
- 玻璃仲裁：arbitrator.js

## 数据传递链路（v3.9.2 确定）
```
survey.js → setStorageSync('generatePayload') → generate-loading.js
→ callFunction({ data: { assessmentData: payload } })
→ 云函数 generateReport { assessmentData } = event
  → adaptAssessmentData → calculateAll + calcSealGrades
  → return { success, fileID, computed: { K_target, Rw_required, wind_zone, airRec, waterRec, ... } }
→ generate-loading 构建 arbitrator(7字段) → setStorageSync('arbitrator')
→ result.js 读取并渲染 6卡3列布局 + CTA区块固定底部
→ cloudFunction createTender 写入 tenders 表，生成 tenderId
```

**云函数部署状态（生产环境）：**
- `generateReport`：已部署，返回 computed 补充 airRec/waterRec/wind_zone
- `createTender`：已部署，tenders 集合已初始化，tenderId 生产环境已打通

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

## AI协作分工触发条件（量化定义）

### GLM-4.7 适用场景（低风险）
- 代码补全、格式转换、重复性文本处理
- 已有明确规范的文档追加（如CHANGELOG条目）
- 单一明确任务，输出可被人工快速验证
- 无需跨文件理解上下文的操作

### Claude Pro 适用场景（高风险）
- 涉及架构决策、方案设计、优先级判断
- 需要理解多份文档上下文才能执行的任务
- 内容创作全链路（SOP Step 0-8）
- 任何"做错了代价高"的操作（生产部署、核心文档重构）
- 有歧义、需要主动质疑和推理的任务

### 判断原则
"做错了能快速发现并修复" → GLM
"做错了代价高或难以发现" → Claude

## 当前系统已知瓶颈（持续更新）

- [ ] 审核带宽：李Sir是唯一专业审核者，内容量增加后
      部分判断需要清单化，减少对即时判断的依赖
- [ ] 推理记录：历史PLAYBOOK只记结论，缺乏"为什么"
      新规范已定义，存量条目待补录
- [ ] 小红书→微信转化路径：跨平台漏斗损耗尚未建立
      衡量机制，需在Post 06后评估
- [ ] 上下文断裂：每次新对话读取结论但不知推理过程，
      靠文档分层缓解但未根本解决
