// calculator-v2.js - 修复P0缺陷：P3线性化 + Rw加权 + 城市降级 + 安全冲突
const CITY_MAP = {
  "北京": { climate: "cold", wind_zone: "W4", base_P3: 3.5 },
  "上海": { climate: "hot_summer", wind_zone: "W3", base_P3: 3.0 },
  "广州": { climate: "hot_year", wind_zone: "W4", base_P3: 3.5 },
  "深圳": { climate: "hot_year", wind_zone: "W5", base_P3: 4.0 },
  "成都": { climate: "hot_summer", wind_zone: "W2", base_P3: 2.5 },
  "武汉": { climate: "hot_summer", wind_zone: "W3", base_P3: 3.0 },
  "西安": { climate: "cold", wind_zone: "W3", base_P3: 3.0 },
  "杭州": { climate: "hot_summer", wind_zone: "W3", base_P3: 3.0 },
  "南京": { climate: "hot_summer", wind_zone: "W3", base_P3: 3.0 },
  "沈阳": { climate: "severe_cold", wind_zone: "W3", base_P3: 3.0 },
};

// FIX P0-1: P3连续线性化
function calcP3(city, floor, total_floors) {
  const config = CITY_MAP[city] || { base_P3: 2.5, wind_zone: "W2" };
  const ratio = Math.min(floor / Math.max(total_floors, 1), 1.0);
  const floor_adj = parseFloat((ratio * 0.6).toFixed(2));
  const value = parseFloat((config.base_P3 + floor_adj).toFixed(2));
  
  const warnings = [];
  if (total_floors > 50) warnings.push("超过50层，建议专业风压评估");
  if (value > 5.0) warnings.push("P3>5.0，超出常规范围");
  
  return { value, warnings };
}

// FIX P0-2: Rw优先项加权
function calcRw(noise_type, noise_dist, priority) {
  const BASE = { main_road: 35, elevated: 38, rail: 40, quiet: 25 };
  const DIST_ADJ = { lt20: 3, "20to50": 0, gt50: -3 };
  const PRIO_ADJ = priority === "sound" ? 3 : 0;
  
  return (BASE[noise_type] || 25) + (DIST_ADJ[noise_dist] || 0) + PRIO_ADJ;
}

// FIX P0-3: SHGC西晒扣减
function calcThermal(city, orientation, west_shading) {
  const config = CITY_MAP[city] || { climate: "hot_summer" };
  const K_MAP = { cold: 1.8, severe_cold: 1.5, hot_summer: 2.4, hot_year: 2.8 };
  const SHGC_MAP = { hot_year: 0.30, hot_summer: 0.35, cold: 0.45, severe_cold: 0.50 };
  
  const shgc_adj = (orientation === "west" && west_shading === false) ? -0.05 : 0;
  return { 
    K: K_MAP[config.climate], 
    SHGC: parseFloat((SHGC_MAP[config.climate] + shgc_adj).toFixed(2)),
    shgc_note: shgc_adj !== 0 ? "西晒无遮阳，SHGC已下调0.05" : null
  };
}

// FIX P0-4: 城市降级处理
function getCityConfig(city) {
  if (CITY_MAP[city]) return { ...CITY_MAP[city], degraded: false };
  return {
    climate: "hot_summer", wind_zone: "W2", base_P3: 2.5,
    degraded: true,
    degraded_msg: `城市"${city}"暂未精确覆盖，参数基于保守标准推算`
  };
}

// FIX P0-4: 冲突消解（新增safety_budget_conflict）
function resolveConflicts(computed, answers) {
  const { budget_tier, priority, family_risk, floor, total_floors } = answers;
  const risk_flags = {};
  const notes = [];
  const ratio = floor / Math.max(total_floors, 1);

  if (priority === "view" && ratio > 0.6 && budget_tier === "A") {
    risk_flags.budget_conflict = true;
    notes.push("预算与楼层视野需求存在冲突");
  }

  if (family_risk && family_risk !== "none" && budget_tier === "A") {
    risk_flags.safety_budget_conflict = true;
    notes.push("安全防护条款成本高于A档预算，建议升级至B档");
  }

  return { ...computed, risk_flags, conflict_notes: notes };
}

// 安全条款生成
function buildSafetyRedLine(family_risk) {
  const items = [];
  if (family_risk === "child") {
    items.push("窗台高度≥900mm或加装防护栏杆");
    items.push("开启扇限位器（开启角度≤100mm）");
    items.push("夹胶玻璃（防坠落碎裂）");
  }
  if (family_risk === "elder") {
    items.push("执手操作力≤40N（适老化）");
    items.push("门槛高度≤20mm（防绊倒）");
  }
  return items;
}

// 预算档位映射
const BUDGET_SPEC = {
  "A": { label: "经济型", frame: "断桥铝壁厚≥1.4mm", glass: "5+12A+5", price: "300-500" },
  "B": { label: "舒适型", frame: "断桥铝壁厚≥1.6mm", glass: "5Low-E+12Ar+5", price: "500-800" },
  "C": { label: "品质型", frame: "断桥铝壁厚≥1.8mm", glass: "三玻两腔", price: "800-1500" },
  "D": { label: "定制型", frame: "系统窗壁厚≥2.0mm", glass: "三玻Low-E", price: "1500+" }
};

// 主计算入口
function calculateAll(assessment) {
  const { city, floor, total_floors, noise_type, noise_dist, orientation, west_shading, priority, family_risk, budget_tier, timeline } = assessment;
  
  const cityConfig = getCityConfig(city);
  const p3Result = calcP3(city, floor, total_floors);
  const thermalResult = calcThermal(city, orientation, west_shading);
  
  const computed = {
    city, climate_zone: cityConfig.climate, wind_zone: cityConfig.wind_zone,
    floor, total_floors, height_ratio: floor / Math.max(total_floors, 1),
    P3: p3Result.value, Rw: calcRw(noise_type, noise_dist, priority),
    K: thermalResult.K, SHGC: thermalResult.SHGC,
    priority, budget_tier, degraded: cityConfig.degraded,
    degraded_msg: cityConfig.degraded_msg,
    shgc_note: thermalResult.shgc_note
  };
  
  const resolved = resolveConflicts(computed, assessment);
  resolved.safety_items = buildSafetyRedLine(family_risk);
  resolved.hasSafetyClause = family_risk && family_risk !== "none";
  resolved.budget_spec = BUDGET_SPEC[budget_tier] || BUDGET_SPEC["B"];
  
  const timelineMap = { lt1m: "7个工作日", "1to3m": "15个工作日", flexible: "30个工作日" };
  resolved.deadline_text = timelineMap[timeline] || "15个工作日";
  
  return resolved;
}

module.exports = { calculateAll };