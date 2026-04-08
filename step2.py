import pathlib
p = pathlib.Path('miniprogram/cloudfunctions/createTender/documentMapper.js')
lines = p.read_text(encoding='utf-8').splitlines(keepends=True)

# 替换 1368-1404 行（chapter2 块，index 1367-1403）
new_chapter2 = """    chapter2: {
      positionStatement: '以下参数来自第一章的诊断结果，是本案的采购技术底线。商家方案须逐项回应，不达标项须书面说明。',
      metrics: [
        {
          name: '抗风压性能',
          value: ` ${getField(resolved, 'P3')}`,
          unit: 'kPa',
          std: STANDARDS_MAP.wind_pressure.code,
          level: (getField(resolved, 'P3') >= 3.0 ? '高等级' : '标准等级'),
          note: `${normalizedAnswers.city}${resolved.wind_zone || 'W?'}风区，第${normalizedAnswers.floor}层`,
          isCore: painTag.coreMetric === 'P3'
        },
        {
          name: '计权隔声量',
          value: ` ${getField(resolved, 'Rw')}`,
          unit: 'dB',
          std: STANDARDS_MAP.sound_insulation.code,
          level: (getField(resolved, 'Rw') >= 35 ? '高隔声' : '标准隔声'),
          note: `${getNoiseLabel(normalizedAnswers.noise_type, normalizedAnswers.noise_dist).typeLabel}环境${normalizedAnswers.pain_point === 'sound' ? '，睡眠场景加严' : ''}`,
          isCore: painTag.coreMetric === 'Rw'
        },
        {
          name: '热工性能',
          value: `K${getField(resolved, 'K')} W/(m²K)\\nSHGC${getField(resolved, 'SHGC')}`,
          unit: '',
          std: STANDARDS_MAP.thermal.code,
          level: getClimateLabel(climateZone),
          note: `${getClimateName(climateZone)}区 ${getThermalModifier(normalizedAnswers)}`,
          isCore: painTag.coreMetric === 'SHGC'
        }
      ]
    },
"""

lines[1367:1404] = [new_chapter2]
p.write_text(''.join(lines), encoding='utf-8')
print('done')
