import pathlib, re
p = pathlib.Path('CORE_LOGIC.md')
text = p.read_text(encoding='utf-8')

# 1. Header 版本号
text = text.replace(
    '代码基线：v3.9.9（145/145，commit f1026da）',
    '代码基线：v4.0.0-alpha（145/145，commit 3fc2560）'
)

# 2. 输出层四章描述
text = text.replace(
    '  第2章：配置方案（来自配置层，正向描述）\n  第3章：红线清单（从性能层动态生成，否定式）\n  第4章：验收标准 + 商家评审表',
    '  第2章：采购技术底线（来自性能层，甲方要求视角，含定位声明）\n  第3章：红线清单（从性能层动态生成，否定式；含临时兼容字段 conflictAlert）\n  第4章：配置推导说明 + 商家答题表 + 验收节点'
)

# 3. 第八节新增 SPEC-E
text = text.replace(
    '| 小红书小程序转化漏斗 | 🔲 待建立 | 引流后跨平台损耗未量化 |',
    '| 小红书小程序转化漏斗 | 🔲 待建立 | 引流后跨平台损耗未量化 |\n| SPEC-E | 🔲 待执行 | pdfBuilder-v2.js 渲染层重构：chapter3 改为渲染红线清单；删除 conflictAlert 临时兼容字段 |'
)

p.write_text(text, encoding='utf-8')
print('done')
