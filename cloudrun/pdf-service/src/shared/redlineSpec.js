function buildRedlineRegistry({ TERM, getTierLabel, getField }) {
  return [
    // 型材系统主线
    { id: 'R01', text: '型材系统：须采用原生铝型材，并提供材质检验证明；如采用其他材质，应说明理由并提供检测依据', level: 'mandatory', softened: false, trigger: () => true },
    { id: 'R02', text: (a, r) => `型材系统：主受力壁厚≥1.5mm（当前风压要求P3≥${getField(r, 'P3')}kPa），须提供截面检测报告`, level: 'mandatory', softened: false, trigger: () => true },
    { id: 'R03', text: '型材系统：须提供完整系统窗热工认证文件（含型材+隔热条+玻璃组合认证）', level: 'mandatory', softened: false, trigger: () => true },
    { id: 'R04', text: '型材系统：禁止非配套隔热条拼装，不接受与型材品牌不一致的隔热条', level: 'mandatory', softened: false, trigger: () => true },
    { id: 'R05', text: (a, r) => `型材系统：断桥铝隔热条宽度≥28mm（当前热工要求K≤${getField(r, 'K')}），禁止仿断桥产品`, level: 'mandatory', softened: false, trigger: () => true },

    // 玻璃/热工主线
    { id: 'R06', text: '热工性能：禁止单玻或无Low-E膜的普通中空玻璃', level: 'mandatory', softened: false, trigger: () => true },
    { id: 'R07', text: (a, r) => `热工性能：整窗传热系数K≤${getField(r, 'K')}，太阳得热系数SHGC≤${getField(r, 'SHGC')}，须提供能效/热工检测报告`, level: 'mandatory', softened: false, trigger: () => true },
    { id: 'R08', text: '热工性能：隔热条须与型材系统配套，禁止非原厂隔热条替换', level: 'mandatory', softened: false, trigger: () => true },

    // 隔声主线
    { id: 'R09', text: (a, r) => `隔声性能：整窗隔声量Rw≥${getField(r, 'Rw')}dB，须提供第三方声学检测报告（GB/T 8485）`, level: 'mandatory', softened: false, trigger: (a, r) => !!(r && (r.Rw_required || r.Rw)) },
    { id: 'R10', text: '隔声性能：玻璃与窗框接缝须采用声学密封规程，禁止普通密封胶代替声学密封胶', level: 'mandatory', softened: false, trigger: (a, r) => !!(r && (r.Rw_required || r.Rw)) },

    // 密封/结构主线
    { id: 'R11', text: '密封结构：禁止普通密封胶代替结构胶（须采用中性硅酮结构胶）', level: 'mandatory', softened: false, trigger: () => true },
    { id: 'R12', text: '', level: 'mandatory', softened: false, trigger: () => true },

    // 抗风主线
    { id: 'R13', text: (a, r) => `抗风性能：抗风压性能等级≥${r.wind_pressure_level || '待定'}级（P3≥${getField(r, 'P3')}kPa），须提供抗风压性能检测报告（GB/T 7106）`, level: 'mandatory', softened: false, trigger: (a, r) => !!(r && (r.P3_required || r.P3 || r.wind_pressure_level)) },

    // 安全主线
    { id: 'R14', text: '安全玻璃：夹胶构造强制（落地窗/大面积玻璃/有儿童家庭法规要求）', level: 'mandatory', softened: false, trigger: (a, r) => !!(r && r.safetyForced) },
    { id: 'R15', text: '适老化：执手操作力≤25N，门槛高度≤15mm', level: 'mandatory', softened: false, trigger: (a) => {
      const fr = Array.isArray(a.family_risk) ? a.family_risk : [];
      return fr.includes('elderly') || fr.includes('elder');
    } }
  ];
}

module.exports = { buildRedlineRegistry };
