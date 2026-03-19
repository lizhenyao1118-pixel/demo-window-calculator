// arbitrator.js — V3 统一玻璃仲裁器（解决双轨制冲突）
const { GLASS_LEVELS, BUDGET_SPEC, getNextTier } = require('./shared/budgetSpec.js');

function resolveGlassConfig(Rw_req, K_req, SHGC_req, window_features, budget_tier, priority) {
  const maxAvailableLevel = Math.max(...Object.keys(GLASS_LEVELS).map(k => GLASS_LEVELS[k].level));

  const byLevelAsc = Object.keys(GLASS_LEVELS)
    .map(k => ({ key: k, ...GLASS_LEVELS[k] }))
    .sort((a, b) => a.level - b.level);

  const minLevelForRw = (rw) => {
    const found = byLevelAsc.find(x => x.rw_max >= rw);
    return found ? found.level : maxAvailableLevel;
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
      severity: priority === 'sound' ? 'error' : 'warning',
      message: `${budget_spec.label}内最高可实现 Rw≤${budget_spec.glass_rw_max}dB，您的环境需要更高配置。${next_tier ? `建议升级至${BUDGET_SPEC[next_tier].label}。` : ''}`
    };
  }

  const glass_key = Object.keys(GLASS_LEVELS).find(k => GLASS_LEVELS[k].level === final_level);
  const glass_config = glass_key ? GLASS_LEVELS[glass_key] : GLASS_LEVELS.basic_hollow;

  let thermal_overlay = null;
  if (K_req <= 1.8 && glass_key && !glass_key.includes('low_e')) {
    thermal_overlay = 'Low-E镀膜';
  }

  return {
    glass_key,
    glass_name: glass_config.name,
    rw_effective: Math.min(Rw_req, glass_config.rw_max),
    conflict,
    thermal_overlay,
    is_compensated: false
  };
}

module.exports = { resolveGlassConfig };
