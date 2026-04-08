import pathlib
p = pathlib.Path('CORE_LOGIC.md')
lines = p.read_text(encoding='utf-8').splitlines(keepends=True)
lines.insert(151, '| SPEC-E | 🔲 待执行 | pdfBuilder-v2.js 渲染层重构：chapter3 改为渲染红线清单；删除 conflictAlert 临时兼容字段 |\n')
p.write_text(''.join(lines), encoding='utf-8')
print('done')
