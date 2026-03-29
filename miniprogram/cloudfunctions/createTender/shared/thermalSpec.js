function getInsulationBarRequirement(K_target) {
  if (K_target <= 1.4) return { min_mm: 40, process: '注胶式', note: '须为系统门窗' };
  if (K_target <= 1.8) return { min_mm: 32, process: '注胶式或高规格穿条式', note: '' };
  if (K_target <= 2.4) return { min_mm: 28, process: '穿条式', note: '' };
  if (K_target <= 2.8) return { min_mm: 24, process: '穿条式', note: '' };
  return { min_mm: 20, process: '穿条式基本要求', note: '温和地区' };
}

module.exports = { getInsulationBarRequirement };
