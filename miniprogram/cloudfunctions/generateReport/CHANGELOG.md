# CHANGELOG

## v3.9.3 — 2026-03-31

### fix(pdf): V-01/V-03/V-04 视觉布局修复

- **V-03** `renderRedLines`: 动态 `y=doc.y+4` 替换固定 `y+=16/14`，修复禁止项文字叠压
- **V-03** `measureRedLinesHeight`: 间距与 renderRedLines 同步，修复 box 高度偏差
- **V-04** `drawSectionTitle`: 加入 keepWithNext 保护 `842-doc.y<160`，修复章节标题孤儿
- **V-01** 第二章 2.4 节：联合高度判断，标题与 redlines box 同页渲染
- **V-01** `buildPDF`: 移除第二/三/四章前的强制 `addPage()`，消除孤儿页
- **V-01** `drawChapterHeader`: 新页顶部跳过换页判断（`doc.y<=100` 豁免）
- 总页数：12 → 9，125/125 测试通过
- Commit: d546100
