#!/usr/bin/env python3
# -*- coding: utf-8 -*-

with open('cloudfunctions/generateReport/test/unit/documentMapper.test.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace R12 with R11 in the B-14 C短期 tests
content = content.replace("r.id === 'R12'", "r.id === 'R11'")

# Update DM-33 title
content = content.replace("test('DM-33: R12水密气密条款应包含安装过程控制'", "test('DM-33: R11水密气密条款应包含安装过程控制'")

with open('cloudfunctions/generateReport/test/unit/documentMapper.test.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('[OK] Tests updated: R12 -> R11')
