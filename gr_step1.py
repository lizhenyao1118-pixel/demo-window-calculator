import pathlib
p = pathlib.Path('miniprogram/cloudfunctions/generateReport/documentMapper.js')
lines = p.read_text(encoding='utf-8').splitlines(keepends=True)
insert = (
    '  const safetyForced = [\'sliding\', \'door_window\'].includes(normalizedAnswers.window_type) ||\n'
    '    familyRisk.includes(\'child\') ||\n'
    '    familyRisk.includes(\'elder\') ||\n'
    '    familyRisk.includes(\'elderly\') ||\n'
    '    familyRisk.includes(\'large_fixed\') ||\n'
    '    familyRisk.includes(\'floor_window\') ||\n'
    '    !!resolved.hasSafetyClause;\n'
    '  const sharedRedlineChecklist = buildRedlineChecklist(normalizedAnswers, { ...resolved, safetyForced });\n'
)
lines.insert(1344, insert)
p.write_text(''.join(lines), encoding='utf-8')
print('done')
