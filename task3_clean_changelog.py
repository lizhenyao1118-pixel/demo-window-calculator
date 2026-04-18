# task3_clean_changelog.py
with open('CHANGELOG.md', 'r', encoding='utf-8') as f:
    text = f.read()

# Count initial occurrences
count_before = text.count('## [2026-04-04] Post-05 · 内容运营')
print(f"清理前 Post-05 出现次数：{count_before}")

# Split the file into sections separated by '---'
sections = text.split('\n---\n')

# Find the first Post-05 section and keep it
first_post05_found = False
cleaned_sections = []

for i, section in enumerate(sections):
    if '## [2026-04-04] Post-05 · 内容运营' in section:
        if not first_post05_found:
            # Keep the first occurrence
            cleaned_sections.append(section)
            first_post05_found = True
    else:
        # Keep all other sections
        cleaned_sections.append(section)

# Join the sections back together
result = '\n---\n'.join(cleaned_sections)

# Count final occurrences
count_after = result.count('## [2026-04-04] Post-05 · 内容运营')
print(f"清理后 Post-05 出现次数：{count_after}")

with open('CHANGELOG.md', 'w', encoding='utf-8') as f:
    f.write(result)

print("CHANGELOG.md 清理完成")