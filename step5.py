import pathlib
p = pathlib.Path('miniprogram/cloudfunctions/createTender/documentMapper.js')
lines = p.read_text(encoding='utf-8').splitlines(keepends=True)

# 1. 函数签名改为接收 sharedRedlineChecklist（index 803）
lines[803] = 'function buildChapter4Data(answers, budgetSpec, resolved, riskTrigger, isRisk, sharedRedlineChecklist) {\n'

# 2. 删除 safetyForced 定义（index 806-812，共7行）
del lines[806:813]

# 3. 删除 redlineChecklist = buildRedlineChecklist(...)（删除后原815行变为808行，index 807）
del lines[807]

# 4. 更新 merchantNotice.content（删除9行后原830行变为821行，index 820）
lines[820] = "      content: '本文件第一章为需求诊断，第二章为本案采购技术底线，第三章为采购红线清单。请贵司按照第二章和第三章逐项回应，并在下表中如实填写方案，便于业主横向对比。',\n"

# 5. 更新 return 内 redlineChecklist（删除9行后原874行变为865行，index 864）
lines[864] = '    redlineChecklist: sharedRedlineChecklist\n'

p.write_text(''.join(lines), encoding='utf-8')
print('done')
