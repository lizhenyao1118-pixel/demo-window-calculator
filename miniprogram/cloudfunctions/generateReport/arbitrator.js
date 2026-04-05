// arbitrator.js — V3 统一玻璃仲裁器（解决双轨制冲突）
// v3.9.4: 新增 noise_type 参数，交通噪声场景排除三玻两腔主路径；is_risk 标记非对称中空+Rw≥35组合
const { GLASS_LEVELS, BUDGET_SPEC, getNextTier } = require('./shared/budgetSpec.js');

const TRAFFIC_NOISE_TYPES = ['main_road', 'elevated', 'rail', 'traffic_road', 'traffic_rail', 'traffic_highway'];

function resolveGlassConfig(Rw_req, K_req, SHGC_req, window_features, budget_tier, pain_point, noise_type) {
  const noiseType = noise_type ?? 'quiet'; // 空值默认非交通噪声
  const isTrafficNoise = TRAFFIC_NOISE_TYPES.includes(noiseType);

  const allLevels = Object.keys(GLASS_LEVELS).map(k => ({ key: k, ...GLASS_LEVELS[k] }));

  // SPEC-02: 交通噪声场景排除三玻两腔（Ctr差，125-750Hz表现不稳定）
  const eligibleLevels = isTrafficNoise
    ? allLevels.filter(x => x.key !== 'triple_pane')
    : allLevels;

  const maxAvailableLevel = Math.max(...eligibleLevels.map(x => x.level));

  const byLevelAsc = eligibleLevels.slice().sort((a, b) => a.level - b.level);

  const minLevelForRw = (rw) => {
    const found = byLevelAsc.find(x => x.rw_max >= rw);
    return found ? found.level : (byLevelAsc.length > 0 ? byLevelAsc[byLevelAsc.length - 1].level : maxAvailableLevel);
  };

  const thermal_level =
    K_req <= 1.5 ? 5 :
    K_req <= 1.8 ? 3 :
    K_req <= 2.4 ? 2 :
    1;
  const shgc_level = SHGC_req <= 0.30 ? 3 : SHGC_req <= 0.35 ? 2 : 1;

  const safety_level = window_features && window_features.has_large_fixed ? 4 : 1;

  const final_rw_level = minLevelForRw(Rw_req);

  const perf_level = Math.max(final_rw_level, thermal_level, shgc_level, safety_level);

  const budget_spec = BUDGET_SPEC[budget_tier];
  let budget_max_level = budget_spec && GLASS_LEVELS[budget_spec.glass_max_level] ? GLASS_LEVELS[budget_spec.glass_max_level].level : 1;
  if (budget_tier === 'A' && GLASS_LEVELS.laminated_hollow) {
    budget_max_level = Math.max(budget_max_level, GLASS_LEVELS.laminated_hollow.level);
  }

  let final_level = Math.min(perf_level, maxAvailableLevel);
  let conflict = null;

  if (final_level > budget_max_level) {
    const next_tier = getNextTier(budget_tier);
    conflict = {
      type: 'glass_upgrade',
      severity: pain_point === 'sound' ? 'error' : 'warning',
      message: `${budget_spec.label}内最高可实现 Rw≤${budget_spec.glass_rw_max}dB，您的环境需要更高配置。${next_tier ? `建议升级至${BUDGET_SPEC[next_tier].label}。` : ''}`
    };
  }

  const eligibleKeys = new Set(eligibleLevels.map(x => x.key));
  const glass_key = Object.keys(GLASS_LEVELS).find(k => GLASS_LEVELS[k].level === final_level && eligibleKeys.has(k));
  const glass_config = glass_key ? GLASS_LEVELS[glass_key] : GLASS_LEVELS.basic_hollow;

  let thermal_overlay = null;
  if (K_req <= 1.8 && glass_key && !glass_key.includes('low_e')) {
    thermal_overlay = 'Low-E镀膜';
  }

  // SPEC-03(1): 仲裁结果中非对称中空+Rw≥35组合标记为风险
  const isAsymmetricIGU = glass_key === 'basic_hollow' || glass_key === 'low_e_hollow' || glass_key === 'low_e_argon';
  const is_risk = isAsymmetricIGU && Rw_req >= 35;
  const risk_notes = is_risk
    ? ['非对称中空配置Rw实测上限约34dB，当前需求≥35dB，建议升级至夹胶中空']
    : undefined;

  // SPEC-02: 交通噪声场景备选排除三玻两腔时附加注记
  const triple_pane_excluded_note = isTrafficNoise
    ? '三玻两腔适用于非交通噪声环境，临街/交通场景建议选用夹胶中空'
    : undefined;

  return {
    glass_key,
    glass_name: glass_config.name,
    reason: `基于Rw≥${Rw_req}dB隔声目标${window_features && window_features.has_large_fixed ? '，且存在落地窗（安全强制要求夹胶构造）' : ''}`,
    rw_effective: Math.min(Rw_req, glass_config.rw_max),
    conflict,
    thermal_overlay,
    is_compensated: false,
    is_risk: is_risk || false,
    conflict_notes: [
      ...(risk_notes || []),
      ...(triple_pane_excluded_note ? [triple_pane_excluded_note] : [])
    ]
  };
}

module.exports = { resolveGlassConfig };
