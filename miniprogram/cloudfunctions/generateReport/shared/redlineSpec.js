function buildRedlineRegistry({ TERM, getTierLabel }) {
  return [
    { id: 'R01', text: '本项目建议优先采用原生铝型材，并提供材质检验证明；如采用其他材质，应说明理由并提供检测依据。', level: 'mandatory', softened: true, trigger: () => true },
    { id: 'R02', text: '禁止单玻或无Low-E膜的普通中空玻璃', level: 'mandatory', softened: false, trigger: () => true },
    { id: 'R03', text: '禁止普通密封胶代替结构胶（须用中性硅酮结构胶）', level: 'mandatory', softened: false, trigger: () => true },
    { id: 'R04', text: '断桥铝隔热条宽度建议不低于本项目所需的热工要求（如常规穿条式≥28mm），不建议使用明显低于要求的仿断桥产品。', level: 'mandatory', softened: true, trigger: () => true },
    { id: 'R05', text: '型材主受力壁厚建议不低于 1.5mm，并提供截面检测报告；如提议采用更薄型材，应说明承载与风压校核依据。', level: 'mandatory', softened: true, trigger: () => true },
    { id: 'R06', text: '', level: 'mandatory', softened: false, trigger: () => true },
    { id: 'R07', text: '安全玻璃：夹胶构造强制', level: 'mandatory', softened: false, trigger: (a, r) => !!(r && r.safetyForced) },
    { id: 'R08', text: '执手操作力≤25N + 门槛≤15mm', level: 'mandatory', softened: false, trigger: (a) => {
      const fr = Array.isArray(a.family_risk) ? a.family_risk : [];
      return fr.includes('elderly') || fr.includes('elder');
    } },
    { id: 'R09', text: '比价时偏差超过30%的最低价商家谨慎选择', level: 'recommended', softened: false, trigger: () => true },
    { id: 'R10', text: `${TERM.suggestUpgrade}${getTierLabel('B')}以保障安全配置`, level: 'recommended', softened: false, trigger: (a, r) => {
      const tier = String(a.budget_tier || a.budgetTier || '').toUpperCase();
      return tier === 'A' && !!(r && r.safetyForced);
    } },
    { id: 'R11', text: '高区建议增加型材壁厚或升级档位', level: 'recommended', softened: false, trigger: (a) => {
      const floor = Number(a.floor) || 0;
      const total = Number(a.total_floors || a.totalFloors) || 1;
      return (floor / total) >= 0.5;
    } }
  ];
}

module.exports = { buildRedlineRegistry };
