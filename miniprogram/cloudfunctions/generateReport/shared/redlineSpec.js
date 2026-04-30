function buildRedlineRegistry({ TERM, getTierLabel, getField }) {
  return [
    // 1. 型材系统
    { id: 'R01', text: '须采用原生铝型材，并提供材质检验证明；如采用其他材质，应说明理由并提供检测依据', level: 'mandatory', softened: false, trigger: () => true, group: '型材系统', userMeaning: '部分商家用回收铝或杂料替代原生铝，外观无法区分。杂料型材强度不足，抗风压性能无法保证。材质证明、出厂合格证和必要的进场复验资料是核验材质真伪的主要依据，外观不能作为判断依据。' },
    { id: 'R02', text: (a, r) => `主受力壁厚≥1.5mm，须提供截面检测报告；对应抗风压目标值为P3≥${getField(r, 'P3')}kPa`, level: 'mandatory', softened: false, trigger: () => true, group: '型材系统', userMeaning: '壁厚是型材抗风压的主要参数之一。商家常见说法是"我们产品质量很好"，但不提供壁厚数据。壁厚不足在极端天气下可能导致型材变形或破坏，须要求提供截面检测报告。' },

    // 2. 系统配套与构造
    { id: 'R03', text: '须提供完整系统窗认证/热工报告', level: 'mandatory', softened: false, trigger: () => true, group: '系统配套与构造', userMeaning: '系统窗的热工性能取决于型材+隔热条+玻璃的整体配合。商家常见做法是非配套拼装，整窗实际K值与标称值存在偏差。完整系统认证文件是唯一可核查的依据。' },
    { id: 'R04', text: '隔热条须与型材系统配套，不接受非原厂或非同系统拼装', level: 'mandatory', softened: false, trigger: () => true, group: '系统配套与构造', userMeaning: '非配套隔热条会导致型材热工性能失真，整窗K值可能远高于标称值。外观上无法识别，须在合同中明确约定并要求认证文件。' },
    { id: 'R05', text: (a, r) => `隔热条宽度≥28mm，禁止仿断桥产品`, level: 'mandatory', softened: false, trigger: () => true, group: '系统配套与构造', userMeaning: '隔热条宽度直接影响型材整体K值。宽度不足时，即使玻璃达标，整窗K值仍可能超出本案要求。须在报价中明确列出隔热条型号、宽度及与型材系统的配套关系。' },

    // 3. 热工性能
    { id: 'R06', text: '禁止单玻或无Low-E膜的普通中空玻璃', level: 'mandatory', softened: false, trigger: () => true, group: '热工性能', userMeaning: '是否满足本案传热系数要求，应以整窗K值检测报告为准，不能仅凭"双层玻璃"判断。须要求商家明确说明玻璃配置、是否含Low-E膜及膜层位置。' },
    { id: 'R07', text: (a, r) => `整窗传热系数K≤${getField(r, 'K')}，SHGC≤${getField(r, 'SHGC')}，须提供能效/热工检测报告`, level: 'mandatory', softened: false, trigger: () => true, group: '热工性能', userMeaning: '这是整窗层面的性能指标，不是玻璃单独的指标。商家常只说玻璃参数而不提整窗认证，两者可能有显著差异。须要求提供整窗热工性能检测报告，而非仅凭玻璃参数推算。' },

    // 4. 隔声性能
    { id: 'R08', text: (a, r) => `整窗隔声量Rw≥${getField(r, 'Rw')}dB，须提供第三方声学检测报告（GB/T 8485-2008），报告须同时标注 Rw+Ctr 值（通常较 Rw 低 3~5 dB）`, level: 'mandatory', softened: false, trigger: (a, r) => !!(r && (r.Rw_required || r.Rw)), group: '隔声性能', userMeaning: '隔声是整窗系统性能，受玻璃、密封、安装综合影响。商家常见说法是"我们玻璃隔声好"，但整窗隔声量与玻璃单独指标有显著差异。第三方声学检测报告是唯一可信依据，须索取报告编号并可查。' },
    { id: 'R09', text: '玻璃与窗框接缝须采用声学密封工艺，禁止普通密封胶替代', level: 'mandatory', softened: false, trigger: (a, r) => !!(r && (r.Rw_required || r.Rw)), group: '隔声性能', userMeaning: '接缝处理是隔声的薄弱环节。即使玻璃达标，接缝气密性不足仍会影响整窗隔声表现。须要求商家在合同中说明密封工艺，并在安装过程中留存影像。' },

    // 5. 安装工艺与材料
    { id: 'R10', text: '洞口四周耐候密封胶须连续无断开，胶条系统须为型材原厂配套', level: 'mandatory', softened: false, trigger: () => true, group: '安装工艺与材料', userMeaning: '密封胶（防水/气密用）和结构胶（承重粘结用）是两类不同材料。门窗安装中，洞口四周用耐候密封胶做连续封闭，框扇之间靠原厂胶条系统密封。要求商家书面承诺胶条系统型号 + 耐候胶品牌，避免用低耐久材料替代。' },
    { id: 'R11', text: (a, r) => `水密≥${r.sealGrades ? r.sealGrades.waterRec : 4}级，气密≥${r.sealGrades ? r.sealGrades.airRec : 6}级，安装节点按设计图纸施工，打胶影像记录`, level: 'mandatory', softened: false, trigger: () => true, group: '安装工艺与材料', userMeaning: '气密水密等级直接影响隔声、保温和防水性能。安装节点是决定性因素，仅靠产品本身无法保证。须要求安装全程按设计图纸施工，打胶留影像记录，竣工后按合同约定的检测方式进行验收。' },

    // 6. 抗风性能
    { id: 'R12', text: (a, r) => `整窗抗风压性能须满足本案要求，并提供整窗检测报告；其检测结果应不低于本案对应风压目标值P3≥${getField(r, 'P3')}kPa`, level: 'mandatory', softened: false, trigger: (a, r) => !!(r && (r.P3_required || r.P3 || r.wind_pressure_level)), group: '抗风性能', userMeaning: '高楼层风压显著高于普通住宅。型材壁厚不足或安装固定点不足，在台风或强风天气下可能导致窗框变形甚至脱落。须索取与本案风压等级对应的检测报告，并在进场时核查壁厚。' },

    // 7. 安全玻璃
    { id: 'R13', text: '须采用安全玻璃（钢化或夹胶）；落地窗、大面积玻璃场景，夹胶构造可防止破碎后碎片伤人', level: 'mandatory', softened: false, trigger: (a, r) => !!(r && r.safetyForced), group: '安全玻璃', userMeaning: '本案存在高碰撞风险部位（落地窗/儿童活动区），此类场景应采用夹层安全玻璃，碎片不脱落。商家若以"钢化玻璃同样安全"替代，须提供该部位适用的安全玻璃类型依据，否则不予接受。' },
    { id: 'R14', text: '安全玻璃须能提供型号、3C标识或其他可核验文件', level: 'mandatory', softened: false, trigger: (a, r) => !!(r && r.safetyForced), group: '安全玻璃', userMeaning: '安全玻璃必须有明确的身份标识，3C认证是最基本的核查方式。安装前须核对玻璃边部标识与合同约定一致。' },

    // 8. 适老化
    { id: 'R15', text: '执手操作力≤25N', level: 'mandatory', softened: false, trigger: (a) => {
      const fr = Array.isArray(a.family_risk) ? a.family_risk : [];
      return fr.includes('elderly') || fr.includes('elder');
    }, group: '适老化', userMeaning: '适老化门窗没有全国统一强制标准，商家说"适老化设计"时通常无对应检测文件可核查。执手操作力≤25N是适老化标准中的常见数值，可在合同中约定，但目前无专项检测报告可索取。' },
    { id: 'R16', text: '门槛高度≤15mm', level: 'mandatory', softened: false, trigger: (a) => {
      const fr = Array.isArray(a.family_risk) ? a.family_risk : [];
      return fr.includes('elderly') || fr.includes('elder');
    }, group: '适老化', userMeaning: '门槛过高是老年人跌倒的主要风险点之一。≤15mm的门槛高度可降低绊倒风险，如无法避免须配套防绊坡道。' }
  ];
}

module.exports = { buildRedlineRegistry };
