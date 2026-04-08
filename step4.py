import pathlib
p = pathlib.Path('miniprogram/cloudfunctions/createTender/documentMapper.js')
lines = p.read_text(encoding='utf-8').splitlines(keepends=True)

new_chapter4 = """    chapter4: {
      configSummary: {
        spec: { ...budgetSpec, label: getTierLabel(String(answers.budget_tier || 'B').toUpperCase()) },
        conflictAlert: buildChapter3ConflictAlert(budgetSpec, resolved),
        upgradeOptions: getUpgrades(normalizedAnswers, resolved)
      },
      ...buildChapter4Data(answers, budgetSpec, resolved, riskTrigger, isRisk, sharedRedlineChecklist),
      isRisk: isRisk,
      riskTrigger: riskTrigger
    },
"""

lines[1409:1414] = [new_chapter4]
p.write_text(''.join(lines), encoding='utf-8')
print('done')
