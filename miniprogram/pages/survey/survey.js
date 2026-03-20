// 引入埋点SDK
const { track, trackStep, trackAbandon, trackPDF } = require('../../utils/track');

// 10城硬编码数据（零云函数调用）
const CITY_DB = {
  '北京': { p3: '≥3.5', rw: '≥35', k: '≤1.8', note: '严寒地区，高层需抗风压4.0+' },
  '上海': { p3: '≥3.0', rw: '≥35', k: '≤2.0', note: '冬冷夏热，注意隔热' },
  '广州': { p3: '≥3.0', rw: '≥35', k: '≤2.8', note: '台风区，高层需注意风压' },
  '深圳': { p3: '≥4.0', rw: '≥35', k: '≤2.8', note: '台风区（W5），高层风压要求高' },
  '成都': { p3: '≥2.5', rw: '≥35', k: '≤2.5', note: '温和地区，注意隔声' },
  '武汉': { p3: '≥2.5', rw: '≥35', k: '≤2.5', note: '夏热冬冷，注意遮阳' },
  '西安': { p3: '≥2.5', rw: '≥35', k: '≤2.0', note: '寒冷地区，注意保温' },
  '杭州': { p3: '≥3.0', rw: '≥35', k: '≤2.2', note: '夏热冬冷，注意隔声' },
  '南京': { p3: '≥3.0', rw: '≥35', k: '≤2.2', note: '夏热冬冷，注意遮阳' },
  '沈阳': { p3: '≥3.0', rw: '≥40', k: '≤1.5', note: '严寒地区，保温要求高' }
};

const BUDGET_OPTIONS = [
  { value: 'A', label: '经济实用 A档', hint: '600-900元/㎡（断桥铝入门，壁厚≥1.5mm）' },
  { value: 'B', label: '舒适均衡 B档', hint: '900-1400元/㎡（国产系统窗，壁厚≥1.6mm）' },
  { value: 'C', label: '品质进阶 C档', hint: '1400-2000元/㎡（进口/高端系统，壁厚≥1.8mm）' },
  { value: 'D', label: '定制高端 D档', hint: '2000元+/㎡（进口定制，壁厚≥2.0mm）' }
];

const FAMILY_RISK_OPTIONS = [
  { value: 'child', label: '有10岁以下儿童' },
  { value: 'elder', label: '有行动不便的老人' },
  { value: 'large_fixed', label: '有落地窗或整面玻璃墙（高≥2.1m或宽≥3m）' },
  { value: 'wide_slider', label: '有宽推拉阳台门（单扇宽≥1.2m）' }
];

Page({
  data: {
    currentStep: 0,
    totalSteps: 9,
    cityList: ['北京', '上海', '广州', '深圳', '成都', '武汉', '西安', '杭州', '南京', '沈阳'],
    family_risk: [],
    formData: {
      city: '',
      district: '',
      painPoint: [],
      floor: null,
      totalFloors: null,
      noise_type: '',
      noise_dist: '',
      noise_type_label: '',
      noise_dist_label: '',
      orientation: '',
      westShading: false,
      heatingType: '',
      window_type: '',
      budgetTier: '',
      family_risk: [],
    },
    cityHint: null,
    painPoints: [
      { value: 'sound', label: '隔音降噪' },
      { value: 'thermal', label: '保温节能' },
      { value: 'security', label: '安全防盗' },
      { value: 'view', label: '采光视野' },
      { value: 'economy', label: '省钱经济' }
    ],
    painPointSelectedMap: {},
    noiseTypeOptions: [
      { label: '主干道/马路', value: 'main_road' },
      { label: '高架桥', value: 'elevated' },
      { label: '轨道交通/地铁', value: 'rail' },
      { label: '安静/无特殊噪音', value: 'quiet' }
    ],
    noiseDistOptions: [
      { value: 'lt20', label: '20米以内（几乎紧挨着）' },
      { value: '20to50', label: '20-50米（隔一条小路）' },
      { value: 'gt50', label: '50米以上（隔一条街）' },
      { value: 'gt50_shielded', label: '50米以上且有高楼明显遮挡' }
    ],
    orientations: ['东', '南', '西', '北', '东南', '西南', '东北', '西北'],
    heatingTypes: ['集中供暖', '自采暖', '无供暖'],
    windowTypes: [
      { value: 'casement', label: '平开窗' },
      { value: 'sliding', label: '推拉窗/门' },
      { value: 'fixed', label: '固定窗' },
      { value: 'tilt_turn', label: '内开内倒' },
      { value: 'door_window', label: '门联窗' }
    ],
    budgetTiers: BUDGET_OPTIONS,
    familyRiskOptions: FAMILY_RISK_OPTIONS,
    riskOptions: FAMILY_RISK_OPTIONS,
    familyRiskSelectedMap: {},
    showRatio: false,
    showHeightRatio: false,
    showConflictWarning: false,
    conflictType: '',
    conflictMessage: '',
    forceContinue: false,
    hasSubmitted: false  // 新增：标记是否已提交
  },

  // 页面开始时间（用于计算总时长）
  startTime: 0,

  onReady() {
    console.log('=== Survey 页面就绪 ===');
    console.log('cityList:', this.data.cityList);
  },

  onLoad(options) {
    this.startTime = Date.now();
    track('survey_enter', { 
      has_draft: !!wx.getStorageSync('survey_draft_v1'),
      timestamp: this.startTime
    });

    this.initSurvey();

    const draft = wx.getStorageSync('survey_draft_v1');
    if (draft && draft.data && (Date.now() - draft.timestamp) < 7 * 24 * 3600 * 1000) {
      wx.showModal({
        title: '发现未完成测评',
        content: '是否继续上次进度？',
        confirmText: '继续',
        cancelText: '重新开始',
        success: (res) => {
          if (res.confirm) {
            this.restoreDraft(draft);
          } else {
            this.restartSurvey();
          }
        }
      });
      return;
    }
  },

  restartSurvey() {
    wx.removeStorageSync('survey_draft_v1');
    this.initSurvey();
  },

  initSurvey() {
    this.setData({
      currentStep: 0,
      totalSteps: 9,
      hasSubmitted: false,
      family_risk: [],
      cityList: ['北京', '上海', '广州', '深圳', '成都', '武汉', '西安', '杭州', '南京', '沈阳'],
      formData: {
        city: '',
        district: '',
        painPoint: [],
        floor: null,
        totalFloors: null,
        noise_type: '',
        noise_dist: '',
        noise_type_label: '',
        noise_dist_label: '',
        orientation: '',
        westShading: false,
        heatingType: '',
        window_type: '',
        budgetTier: '',
        family_risk: [],
      },
      cityHint: null,
      painPoints: [
        { value: 'sound', label: '隔音降噪' },
        { value: 'thermal', label: '保温节能' },
        { value: 'security', label: '安全防盗' },
        { value: 'view', label: '采光视野' },
        { value: 'economy', label: '省钱经济' }
      ],
      painPointSelectedMap: {},
      familyRiskSelectedMap: {},
      noiseTypeOptions: [
        { label: '主干道/马路', value: 'main_road' },
        { label: '高架桥', value: 'elevated' },
        { label: '轨道交通/地铁', value: 'rail' },
        { label: '安静/无特殊噪音', value: 'quiet' }
      ],
      noiseDistOptions: [
        { value: 'lt20', label: '20米以内（几乎紧挨着）' },
        { value: '20to50', label: '20-50米（隔一条小路）' },
        { value: 'gt50', label: '50米以上（隔一条街）' },
        { value: 'gt50_shielded', label: '50米以上且有高楼明显遮挡' }
      ],
      orientations: ['东', '南', '西', '北', '东南', '西南', '东北', '西北'],
      heatingTypes: ['集中供暖', '自采暖', '无供暖'],
      windowTypes: [
        { value: 'casement', label: '平开窗' },
        { value: 'sliding', label: '推拉窗/门' },
        { value: 'fixed', label: '固定窗' },
        { value: 'tilt_turn', label: '内开内倒' },
        { value: 'door_window', label: '门联窗' }
      ],
      budgetTiers: BUDGET_OPTIONS,
      familyRiskOptions: FAMILY_RISK_OPTIONS,
      riskOptions: FAMILY_RISK_OPTIONS,
      showRatio: false,
      heightRatio: 0,
      showHeightRatio: false,
      showConflictWarning: false,
      conflictType: '',
      conflictMessage: '',
      forceContinue: false
    });
  },

  restoreDraft(draft) {
    const raw = draft && draft.data ? draft.data : {};
    const familyRisk = Array.isArray(raw.family_risk) ? raw.family_risk : [];
    const painPoint = Array.isArray(raw.painPoint) ? raw.painPoint : [];

    this.setData({
      formData: {
        ...this.data.formData,
        ...raw,
        painPoint: painPoint,
        family_risk: familyRisk
      },
      family_risk: familyRisk,
      currentStep: Number.isFinite(draft.step) ? draft.step : (draft.step || 0)
    }, () => {
      if (raw.city) this.setCityHint(raw.city);
      this.updateSelectedMaps();
      this.calculateHeightRatio();
      this.checkBudgetConflict();
    });
  },

  updateSelectedMaps() {
    const formData = this.data.formData || {};
    const painPoint = Array.isArray(formData.painPoint) ? formData.painPoint : [];
    const family_risk = Array.isArray(formData.family_risk) ? formData.family_risk : [];

    const painPointMap = {};
    painPoint.forEach((v) => { painPointMap[v] = true; });

    const familyRiskMap = {};
    family_risk.forEach((v) => { familyRiskMap[v] = true; });

    this.setData({
      painPointSelectedMap: painPointMap,
      familyRiskSelectedMap: familyRiskMap
    });
  },

  // 页面卸载时记录流失（如果未提交）
  onUnload() {
    if (!this.data.hasSubmitted) {
      const totalTime = Date.now() - (this.startTime || Date.now());
      const lastStep = this.data.currentStep || 0;
      
      trackAbandon(lastStep, totalTime, 'unload');
    }
  },

  // Q1: 城市选择
  onCityChange(e) {
    const index = e.detail.value;
    const city = this.data.cityList[index];
    this.setData({ 'formData.city': city });
    this.setCityHint(city);
    this.saveDraft();
    
    // 埋点：步骤完成（Q1）
    trackStep(1, { city: city });
  },

  onDistrictInput(e) {
    this.setData({ 'formData.district': e.detail.value });
    this.saveDraft();
  },

  setCityHint(city) {
    const hint = CITY_DB[city] || { 
      p3: '≥2.5', rw: '≥35', k: '≤2.5', 
      note: '当前城市暂未精确收录，以下参数基于保守标准推算' 
    };
    this.setData({ cityHint: hint });
  },

  // Q2: 楼层
  onFloorChange(e) {
    const floor = parseInt(e.detail.value) || null;
    const total = this.data.formData.totalFloors;
    this.setData({ 
      'formData.floor': floor,
      showRatio: floor > 0 && total > 0
    }, () => {
      this.calculateHeightRatio();
      this.checkBudgetConflict();
    });
    this.saveDraft();
    
    // 埋点：步骤完成（Q2）
    if (floor) {
      trackStep(2, { floor: floor, total_floors: total });
    }
  },

  onTotalFloorsChange(e) {
    const total = parseInt(e.detail.value) || null;
    const floor = this.data.formData.floor;
    this.setData({ 
      'formData.totalFloors': total,
      showRatio: floor > 0 && total > 0
    }, () => {
      this.calculateHeightRatio();
      this.checkBudgetConflict();
    });
    this.saveDraft();
    
    // 埋点：步骤完成（Q2）
    if (total) {
      trackStep(2, { floor: floor, total_floors: total });
    }
  },

  calculateHeightRatio() {
    const { floor, totalFloors } = this.data.formData;
    const f = parseInt(floor, 10);
    const t = parseInt(totalFloors, 10);
    if (f > 0 && t > 0) {
      const ratio = Math.round((f / t) * 100);
      this.setData({ heightRatio: ratio, showHeightRatio: true, showRatio: true });
    } else {
      this.setData({ showHeightRatio: false, showRatio: false });
    }
  },

  // Q3: 困扰问题（多选）
  onPainPointChange(e) {
    const values = (e && e.detail && Array.isArray(e.detail.value)) ? e.detail.value : [];
    const map = {};
    values.forEach((v) => { map[v] = true; });
    this.setData({ 'formData.painPoint': values, painPointSelectedMap: map });
    this.saveDraft();
    trackStep(3, { pain_point: values });
  },

  // Q4: 噪音
  onNoiseTypeChange(e) {
    const opt = this.data.noiseTypeOptions[e.detail.value];
    const noiseType = opt ? opt.value : 'quiet';
    const noiseLabel = opt ? opt.label : '安静/无特殊噪音';
    this.setData({
      'formData.noise_type': noiseType,
      'formData.noise_type_label': noiseLabel
    });
    this.saveDraft();
    
    // 埋点：步骤完成（Q4）
    trackStep(4, { noise_type: noiseType });
  },

  onNoiseDistChange(e) {
    const opt = this.data.noiseDistOptions[e.detail.value];
    const noiseDist = opt ? opt.value : 'gt50';
    const noiseLabel = opt ? opt.label : '50米以上（隔一条街）';
    this.setData({
      'formData.noise_dist': noiseDist,
      'formData.noise_dist_label': noiseLabel
    });
    this.saveDraft();
    trackStep(4, { noise_dist: noiseDist });
  },

  // Q5: 朝向
  onOrientationChange(e) {
    const orientation = this.data.orientations[e.detail.value];
    this.setData({ 'formData.orientation': orientation });
    this.saveDraft();
    
    // 埋点：步骤完成（Q5）
    trackStep(5, { orientation: orientation });
  },
  
  onShadingChange(e) {
    const shading = e.detail.value === 'true';
    this.setData({ 'formData.westShading': shading });
    this.saveDraft();
    
    // 埋点：步骤完成（Q5 - 西晒）
    trackStep(5, { west_shading: shading });
  },

  // Q6: 供暖
  onHeatingChange(e) {
    const heating = this.data.heatingTypes[e.detail.value];
    this.setData({ 'formData.heatingType': heating });
    this.saveDraft();
    
    // 埋点：步骤完成（Q6）
    trackStep(6, { heating_type: heating });
  },

  // Q7: 窗型类型
  selectWindowType(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({ 'formData.window_type': value });
    this.saveDraft();
    trackStep(7, { window_type: value });
  },

  // Q8: 多选家庭风险
  onFamilyRiskChange(e) {
    const values = (e && e.detail && Array.isArray(e.detail.value)) ? e.detail.value : [];
    const map = {};
    values.forEach((v) => { map[v] = true; });
    this.setData({ 
      family_risk: values,
      'formData.family_risk': values,
      familyRiskSelectedMap: map
    });
    this.saveDraft();
    trackStep(8, { family_risk: values });
  },

  buildWindowFeatures(familyRiskArray) {
    const arr = Array.isArray(familyRiskArray) ? familyRiskArray : [];
    return {
      has_large_fixed: arr.includes('large_fixed'),
      has_wide_slider: arr.includes('wide_slider'),
      has_family_safety: arr.some(v => v === 'child' || v === 'elder')
    };
  },

  getPrimaryPainPoint(painPointArray) {
    const arr = Array.isArray(painPointArray) ? painPointArray : [];
    const order = ['sound', 'thermal', 'security', 'view', 'economy'];
    const key = order.find(x => arr.includes(x)) || arr[0] || 'sound';
    const map = { sound: 'sound', thermal: 'heat', security: 'safety', view: 'view', economy: 'price' };
    return map[key] || 'sound';
  },

  // Q9: 预算（冲突预警核心）
  onBudgetChange(e) {
    const index = e.detail.value;
    const budget = this.data.budgetTiers[index].value;
    this.setData({ 
      'formData.budgetTier': budget,
      forceContinue: false
    });
    this.checkBudgetConflict();
    this.saveDraft();
    
    // 埋点：步骤完成（Q9）
    trackStep(9, { budget_tier: budget, has_conflict: !!this.data.showConflictWarning });
  },

  checkBudgetConflict() {
    const { floor, totalFloors, budgetTier } = this.data.formData;
    if (!floor || !totalFloors) return;

    const f = parseInt(floor, 10);
    const t = parseInt(totalFloors, 10);
    if (!f || !t) return;
    const ratio = f / t;

    const isHighFloor = f >= 16;
    const isHighRatio = ratio >= 0.8;

    if (budgetTier === 'A' && (isHighFloor || isHighRatio)) {
      this.setData({
        showConflictWarning: true,
        conflictType: isHighFloor ? 'high_floor' : 'high_ratio',
        conflictMessage: isHighFloor
          ? `您所在的${f}层属于高层建筑，A档预算难以满足抗风压≥3.5kPa标准`
          : `您位于建筑顶部区域（${(ratio * 100).toFixed(0)}%），风荷载风险较高`
      });
    } else {
      this.setData({ showConflictWarning: false, conflictType: '', conflictMessage: '' });
    }
  },

  upgradeToTierB() {
    this.setData({
      'formData.budgetTier': 'B',
      showConflictWarning: false,
      conflictType: '',
      conflictMessage: '',
      forceContinue: false
    });
    this.saveDraft();
  },

  adjustFloor() {
    this.setData({
      currentStep: 1,
      showConflictWarning: false,
      conflictType: '',
      conflictMessage: '',
      forceContinue: false
    });
    this.saveDraft();
  },

  forceRisk() {
    this.setData({
      forceContinue: true
    });
    this.saveDraft();
    this.submit();
  },

  nextQuestion() {
    this.nextStep();
  },

  // Q9 专用：软阻断检查
  nextStepWithCheck() {
    if (this.data.currentStep === 8 && this.data.showConflictWarning) {
      wx.showModal({
        title: '⚠️ 配置不兼容',
        content: this.data.formData.floor + '层 + A档预算无法达到抗风压标准（GB/T 7106要求≥3.5kPa）\n\n建议：\n① 升级至B档（推荐）\n② 降至16层以下\n③ 强制生成风险版（不推荐）',
        showCancel: true,
        cancelText: '返回修改',
        confirmText: '强制生成风险版',
        confirmColor: '#ff4d4f',
        success: (res) => {
          if (res.confirm) {
            this.setData({ 
              forceContinue: true
            });
            this.saveDraft();
            this.submit();
          }
        }
      });
    } else {
      this.nextStep();
    }
  },

  // 通用导航
  nextStep() {
    if (this.validateCurrentStep()) {
      this.setData({ currentStep: this.data.currentStep + 1 });
      this.saveDraft();
    }
  },

  prevStep() {
    this.setData({ currentStep: this.data.currentStep - 1 });
    this.saveDraft();
  },

  validateCurrentStep() {
    const { currentStep, formData } = this.data;
    let isValid = true;
    let message = '';

    switch (currentStep) {
      case 0:
        if (!formData.city) { isValid = false; message = '请选择所在城市'; }
        break;
      case 1:
        if (!formData.floor || !formData.totalFloors) {
          isValid = false; message = '请完善楼层信息';
        } else if (parseInt(formData.floor, 10) > parseInt(formData.totalFloors, 10)) {
          isValid = false; message = '所在楼层不能大于总楼层';
        }
        break;
      case 2:
        if (!Array.isArray(formData.painPoint) || formData.painPoint.length === 0) {
          isValid = false; message = '请至少选择一项困扰问题';
        }
        break;
      case 3:
        if (!formData.noise_type || !formData.noise_dist) {
          isValid = false; message = '请完善噪声环境信息';
        }
        break;
      case 4:
        if (!formData.orientation) { isValid = false; message = '请选择房屋朝向'; }
        break;
      case 5:
        if (!formData.heatingType) { isValid = false; message = '请选择供暖方式'; }
        break;
      case 6:
        if (!formData.window_type) { isValid = false; message = '请选择窗型'; }
        break;
      case 7:
        if (!Array.isArray(formData.family_risk) || formData.family_risk.length === 0) {
          isValid = false; message = '请至少选择一项家庭风险特征';
        }
        break;
      case 8:
        if (!formData.budgetTier) { isValid = false; message = '请选择预算档位'; }
        break;
    }

    if (!isValid) {
      wx.showToast({ title: message, icon: 'none', duration: 2000 });
    }
    return isValid;
  },

  // 提交入口（统一分发）
  submit() {
    if (!this.validateCurrentStep()) return;

    // 标记已提交（防止onUnload记录流失）
    this.setData({ hasSubmitted: true });
    
    const totalTime = Date.now() - (this.startTime || Date.now());
    
    // 埋点：问卷提交（北极星指标）
    track('survey_submitted', {
      total_time_ms: totalTime,
      has_photos: false, // 当前版本无照片
      city: this.data.formData.city,
      budget_tier: this.data.formData.budgetTier,
      is_risk: !!(this.data.showConflictWarning && this.data.forceContinue),
      has_conflict: !!this.data.showConflictWarning,
      floor: this.data.formData.floor,
      total_floors: this.data.formData.totalFloors
    });

    // 最终校验
    if (this.data.formData.floor && this.data.formData.totalFloors) {
      if (parseInt(this.data.formData.floor, 10) > parseInt(this.data.formData.totalFloors, 10)) {
        wx.showToast({ title: '所在楼层不能高于总楼层数', icon: 'none' });
        return;
      }
    }
    if (this.data.showConflictWarning && !this.data.forceContinue) {
      wx.showModal({
        title: '⚠️ 配置冲突未解决',
        content: '您尚未处理预算与楼层的配置冲突，建议返回修改。仍要生成风险版？',
        cancelText: '返回修改',
        confirmText: '仍要生成',
        confirmColor: '#ff4d4f',
        success: (res) => {
          if (res.confirm) {
            this.callGenerateReport(true);
          }
        }
      });
      return;
    }
    
    // 正常或已强制标记，直接调用
    this.callGenerateReport(this.data.forceContinue);
  },

  // 统一调用云函数
  callGenerateReport(isDisclaimer) {
    const { formData } = this.data;
    if (!formData || !formData.budgetTier) {
      wx.showToast({ title: '请选择预算档位（Q9）', icon: 'none' });
      return;
    }
    if (!Array.isArray(formData.family_risk) || formData.family_risk.length === 0) {
      wx.showModal({
        title: '数据不完整',
        content: 'Q8家庭风险未选择，是否返回补充？',
        confirmText: '返回Q8',
        showCancel: true,
        success: (res) => {
          if (res.confirm) this.setData({ currentStep: 7 });
        }
      });
      return;
    }

    wx.showLoading({ 
      title: isDisclaimer ? '生成风险版文件...' : '生成招标文件...',
      mask: true
    });

    // 埋点：PDF生成请求
    trackPDF.request({
      budget_tier: this.data.formData.budgetTier,
      is_risk: isDisclaimer,
      city: this.data.formData.city
    });

    // 准备数据（脱敏+结构化）
    const windowFeatures = this.buildWindowFeatures(this.data.family_risk);
    const primaryPainPoint = this.getPrimaryPainPoint(this.data.formData.painPoint);
    const payload = {
      ...this.data.formData,
      painPoint: primaryPainPoint,
      family_risk: this.data.family_risk || [],
      window_features: windowFeatures,
      isDisclaimer: isDisclaimer,
      timestamp: Date.now(),
      cityStandard: this.data.cityHint
    };

    console.log('[Day 4] 调用云函数参数：', payload);

    // 调用云函数
    wx.cloud.callFunction({
      name: 'generateReport',
      data: {
        assessmentData: payload
      },
      success: (res) => {
        wx.hideLoading();
        console.log('[Day 4] 云函数返回：', res.result);
        
        if (res.result.success) {
          // 埋点：PDF生成成功
          trackPDF.success({
            file_size: res.result.fileSize,
            is_risk: isDisclaimer,
            duration_ms: Date.now() - this.startTime
          });
          
          // 保存文件ID到本地，供result页使用
          wx.setStorageSync('last_pdf_fileid', res.result.fileID);
          
          // 跳转到结果页
          wx.navigateTo({
            url: `/pages/result/result?type=${isDisclaimer ? 'disclaimer' : 'normal'}&fileID=${res.result.fileID}`
          });
        } else {
          // 埋点：PDF生成失败
          trackPDF.fail(res.result.error || 'unknown_error');
          
          wx.showModal({
            title: '生成失败',
            content: res.result.error || '请稍后重试',
            showCancel: false
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('[Day 4] 云函数调用失败：', err);
        
        // 埋点：PDF生成失败（网络错误）
        trackPDF.fail(err.errMsg || 'network_error');
        
        wx.showModal({
          title: '网络错误',
          content: '无法连接到生成服务，请检查网络后重试',
          showCancel: false
        });
      }
    });
  },

  saveDraft() {
    wx.setStorageSync('survey_draft_v1', {
      data: this.data.formData,
      step: this.data.currentStep,
      timestamp: Date.now()
    });
  }
});
