import pathlib
p = pathlib.Path('miniprogram/cloudfunctions/generateReport/test/unit/sections.test.js')
text = p.read_text(encoding='utf-8')

# SEC01: upgradeOptions 从 chapter3 改为 chapter4.configSummary
text = text.replace(
    "const items = (((sections.chapter3 || {}).upgradeOptions || {}).items) || [];",
    "const items = (((sections.chapter4 || {}).configSummary || {}).upgradeOptions || []);"
)

# SEC03: recommendedConfig 从 chapter3 改为 chapter4.configSummary
text = text.replace(
    "const label = String((((sections.chapter3 || {}).recommendedConfig || {}).spec || {}).label || '');",
    "const label = String((((sections.chapter4 || {}).configSummary || {}).spec || {}).label || '');"
)

p.write_text(text, encoding='utf-8')
print('done')
