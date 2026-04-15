function buildRedlineRegistry({ TERM, getTierLabel, getField }) {
  return [
    // 型材系统主线
    { id: 'R01', text: '型材系统：须采用原生铝型材，并提供材质检验证明；如采用其他材质，应说明理由并提供检测依据', level: 'mandatory', softened: false, trigger: () => true, userMeaning: '部分商家用回收铝或杂料替代原生铝，外观无法区分。杂料型材强度不足，抗风压性能无法保证。材质证明、出厂合格证和必要的进场复验资料是核验材质真伪的主要依据，外观不能作为判断依据。' },
    { id: 'R02', text: (a, r) => `型材系统：主受力壁厚≥1.5mm（当前风压要求P3≥${getField(r, 'P3')}kPa），须提供截面检测报告`, level: 'mandatory', softened: false, trigger: () => true, userMeaning: '壁厚是型材抗风压的主要参数之一。商家常见说法是"我们产品质量很好"，但不提供壁厚数据。壁厚不足在极端天气下可能导致型材变形或破坏，须要求提供截面检测报告。' },
    { id: 'R03', text: '型材系统：须提供完整系统窗热工认证文件（含型材+隔热条+玻璃组合认证）', level: 'mandatory', softened: false, trigger: () => true, userMeaning: '系统窗的热工性能取决于型材+隔热条+玻璃的整体配合。商家常见做法是非配套拼装，整窗实际K值与标称值存在偏差。完整系统认证文件是唯一可核查的依据。' },
    { id: 'R04', text: '型材系统：禁止非配套隔热条拼装，不接受与型材品牌不一致的隔热条', level: 'mandatory', softened: false, trigger: () => true, userMeaning: '非配套隔热条会导致型材热工性能失真，整窗K值可能远高于标称值。外观上无法识别，须在合同中明确约定并要求认证文件。' },
    { id: 'R05', text: (a, r) => `型材系统：断桥铝隔热条宽度≥28mm（当前热工要求K≤${getField(r, 'K')}），禁止仿断桥产品`, level: 'mandatory', softened: false, trigger: () => true, userMeaning: '隔热条宽度直接影响型材整体K值。宽度不足时，即使玻璃达标，整窗K值仍可能超出本案要求。须在报价中明确列出隔热条型号、宽度及与型材系统的配套关系。' },

    // 玻璃/热工主线
    { id: 'R06', text: '热工性能：禁止单玻或无Low-E膜的普通中空玻璃', level: 'mandatory', softened: false, trigger: () => true, userMeaning: '是否满足本案传热系数要求，应以整窗K值检测报告为准，不能仅凭"双层玻璃"判断。须要求商家明确说明玻璃配置、是否含Low-E膜及膜层位置。' },
    { id: 'R07', text: (a, r) => `热工性能：整窗传热系数K≤${getField(r, 'K')}，太阳得热系数SHGC≤${getField(r, 'SHGC')}，须提供能效/热工检测报告`, level: 'mandatory', softened: false, trigger: () => true, userMeaning: '这是整窗层面的性能指标，不是玻璃单独的指标。商家常只说玻璃参数而不提整窗认证，两者可能有显著差异。须要求提供整窗热工性能检测报告，而非仅凭玻璃参数推算。' },
    { id: 'R08', text: '热工性能：隔热条须与型材系统配套，禁止非原厂隔热条替换', level: 'mandatory', softened: false, trigger: () => true, userMeaning: '配套是系统窗热工性能的基础保障。非原厂配套隔热条可能导致热工性能偏离标称值，须在认证文件中核查型材与隔热条的配套关系。' },

    // 隔声主线
    { id: 'R09', text: (a, r) => `隔声性能：整窗隔声量Rw≥${getField(r, 'Rw')}dB，须提供第三方声学检测报告（GB/T 8485）`, level: 'mandatory', softened: false, trigger: (a, r) => !!(r && (r.Rw_required || r.Rw)), userMeaning: '隔声是整窗系统性能，受玻璃、密封、安装综合影响。商家常见说法是"我们玻璃隔声好"，但整窗隔声量与玻璃单独指标有显著差异。第三方声学检测报告是唯一可信依据，须索取报告编号并可查。' },
    { id: 'R10', text: '隔声性能：玻璃与窗框接缝须采用声学密封规程，禁止普通密封胶代替声学密封胶', level: 'mandatory', softened: false, trigger: (a, r) => !!(r && (r.Rw_required || r.Rw)), userMeaning: '接缝处理是隔声的薄弱环节。即使玻璃达标，接缝气密性不足仍会影响整窗隔声表现。须要求商家在合同中说明密封工艺，并在安装过程中留存影像。' },

    // 密封/结构主线
    { id: 'R11', text: '密封结构：禁止普通密封胶代替结构胶（须采用中性硅酮结构胶）', level: 'mandatory', softened: false, trigger: () => true, userMeaning: '结构胶与普通密封胶外观相似，但力学性能和耐久性差异极大。普通密封胶长期使用后开裂，影响气密、水密和结构安全。须要求商家提供所用密封胶的产品说明书。' },
    { id: 'R12', text: '', level: 'mandatory', softened: false, trigger: () => true, userMeaning: '' },

    // 抗风主线
    { id: 'R13', text: (a, r) => `抗风性能：抗风压性能等级≥${r.wind_pressure_level || '待定'}级（P3≥${getField(r, 'P3')}kPa），须提供抗风压性能检测报告（GB/T 7106）`, level: 'mandatory', softened: false, trigger: (a, r) => !!(r && (r.P3_required || r.P3 || r.wind_pressure_level)), userMeaning: '高楼层风压显著高于普通住宅。型材壁厚不足或安装固定点不足，在台风或强风天气下可能导致窗框变形甚至脱落。须索取与本案风压等级对应的检测报告，并在进场时核查壁厚。' },

    // 安全主线
    { id: 'R14', text: '安全玻璃：夹胶构造强制（落地窗/大面积玻璃/有儿童家庭法规要求）', level: 'mandatory', softened: false, trigger: (a, r) => !!(r && r.safetyForced), userMeaning: '本案存在高碰撞风险部位（落地窗/儿童活动区），此类场景应采用夹层安全玻璃，碎片不脱落。商家若以"钢化玻璃同样安全"替代，须提供该部位适用的安全玻璃类型依据，否则不予接受。' },
    { id: 'R15', text: '适老化：执手操作力≤25N，门槛高度≤15mm', level: 'mandatory', softened: false, trigger: (a) => {
      const fr = Array.isArray(a.family_risk) ? a.family_risk : [];
      return fr.includes('elderly') || fr.includes('elder');
    }, userMeaning: '适老化门窗没有全国统一强制标准，商家说"适老化设计"时通常无对应检测文件可核查。可用的核验方式：①要求说明把手形式（横执杆式或下压式，不接受球形把手）；②要求把手安装高度在850-1000mm范围内；③确认是否设置门槛及过渡方式。执手操作力≤25N是适老化标准中的常见数值，可在合同中约定，但目前无专项检测报告可索取。' }
  ];
}

module.exports = { buildRedlineRegistry };
