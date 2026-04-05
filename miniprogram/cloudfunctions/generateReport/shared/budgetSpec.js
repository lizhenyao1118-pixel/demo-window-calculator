// shared/budgetSpec.js — V3 定稿（2026-03-18 确认）
// 变更：A档 800→900（壁厚1.4→1.5），B档 800-1200→900-1400，C档 1200-1800→1400-2000，D档 1800+→2000+
// v3.9.4: low_e_argon.rw_max 36→34（非对称中空吻合效应实测上限约32-35dB，封顶34dB，35dB+切换至夹胶中空）

const GLASS_LEVELS = {
  basic_hollow: { level: 1, rw_max: 33, k_max: 2.8, base_cost: 150, name: '普通中空玻璃（5+9A+5）' },
  low_e_hollow: { level: 2, rw_max: 33, k_max: 2.4, base_cost: 180, name: 'Low-E中空玻璃（5Low-E+12A+5）' },
  low_e_argon: { level: 3, rw_max: 34, k_max: 2.0, base_cost: 220, name: 'Low-E充氩中空（5Low-E+12Ar+5）' },
  laminated_hollow: { level: 4, rw_max: 42, k_max: 2.0, base_cost: 320, name: '夹胶中空玻璃（6+0.76PVB+6+12Ar+5）' },
  triple_pane: { level: 5, rw_max: 45, k_max: 1.4, base_cost: 500, name: '三玻两腔（5+9A+5+9A+5Low-E）' }
};

const BUDGET_SPEC = {
  A: {
    label: '经济实用 A档',
    price_range: '600–900 元/㎡',
    price_hint: '600元以下在一线城市难以保证断桥铝品质',
    bar_ratio: 0.35,
    glass_max_level: 'laminated_hollow',
    glass_rw_max: 42,
    profile: { min_wall_thickness: 1.5, brand_tier: 'domestic_standard' },
    hardware: { min_load_kg: 60, brand: 'domestic_budget' },
    seal: { layers: 2, material: 'EPDM_rubber' }
  },
  B: {
    label: '舒适均衡 B档',
    price_range: '900–1400 元/㎡',
    bar_ratio: 0.55,
    glass_max_level: 'laminated_hollow',
    glass_rw_max: 42,
    profile: { min_wall_thickness: 1.6, brand_tier: 'system_domestic' },
    hardware: { min_load_kg: 80, brand: 'domestic_premium' },
    seal: { layers: 3, material: 'EPDM_rubber' }
  },
  C: {
    label: '品质进阶 C档',
    price_range: '1400–2000 元/㎡',
    bar_ratio: 0.75,
    glass_max_level: 'triple_pane',
    glass_rw_max: 43,
    profile: { min_wall_thickness: 1.8, brand_tier: 'imported_entry' },
    hardware: { min_load_kg: 100, brand: 'imported' },
    seal: { layers: 3, material: 'premium_epdm' }
  },
  D: {
    label: '定制高端 D档',
    price_range: '2000+ 元/㎡',
    bar_ratio: 1.0,
    glass_max_level: 'triple_pane',
    glass_rw_max: 45,
    profile: { min_wall_thickness: 2.0, brand_tier: 'custom_imported' },
    hardware: { min_load_kg: 150, brand: 'premium_imported' },
    seal: { layers: 4, material: 'silicone_epdm_hybrid' }
  }
};

const BUDGET_TIER_GLASS_BASE = {
  A: { config: '双白玻中空（5+12A+5）', pricePerSqm: 180 },
  B: { config: '双白玻中空（5+9A+5）', pricePerSqm: 150 },
  C: { config: '单玻或简易双玻', pricePerSqm: 120 },
  D: { config: '定制玻璃组合', pricePerSqm: 260 }
};
function getNextTier(current) {
  const tiers = ['A', 'B', 'C', 'D'];
  const idx = tiers.indexOf(current);
  return idx < tiers.length - 1 ? tiers[idx + 1] : null;
}

module.exports = { GLASS_LEVELS, BUDGET_SPEC, getNextTier, BUDGET_TIER_GLASS_BASE };
