import pathlib
p = pathlib.Path('miniprogram/cloudfunctions/generateReport/documentMapper.js')
lines = p.read_text(encoding='utf-8').splitlines(keepends=True)

# 1. 函数签名（index 846）
lines[846] = 'function buildChapter4Data(answers, budgetSpec, resolved, riskTrigger, isRisk, sharedRedlineChecklist) {\n'

# 2. 删除 safetyForced 定义（index 849-855，共7行）
del lines[849:856]

# 3. 删除 redlineChecklist = buildRedlineChecklist(...)（删除7行后原858行变为851行，index 850）
del lines[850]

# 4. 更新 merchantNotice.content（删除8行后原873行变为865行，index 864）
lines[864] = "      content: '本文件第一章为需求诊断，第二章为本案采购技术底线，第三章为采购红线清单。请贵司按照第二章和第三章逐项回应，并在下表中如实填写方案，便于业主横向对比。',\n"

# 5. 更新 return 内 redlineChecklist（删除8行后原917行变为909行，index 908）
lines[908] = '    redlineChecklist: sharedRedlineChecklist\n'

p.write_text(''.join(lines), encoding='utf-8')
print('done')
