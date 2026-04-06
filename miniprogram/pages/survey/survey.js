// 引入埋点SDK
const { track, trackStep, trackAbandon, trackPDF } = require('../../utils/track');
const { getClimateSpec } = require('../../shared/climateSpec');

// 三组分组配置
const GROUPS = [
  { name: '房屋与诉求', context: '先告诉我您的房子情况和最关心的问题', steps: [0, 1, 2] },
  { name: '环境与条件', context: '再了解一下您家的环境条件', steps: [3, 4, 5] },
  { name: '窗户与安全', context: '最后确认窗户类型、安全需求和预算', steps: [6, 7, 8] }
];

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
    totalSteps: 10,
    cityList: ['北京', '上海', '广州', '深圳', '成都', '武汉', '西安', '杭州', '南京', '沈阳'],
    family_risk: [],
    formData: {
      city: '',
      district: '',
      painPoint: [],
      floor: null,
      totalFloors: null,
      room_type: [],
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
    roomTypeOptions: [
      { value: 'bedroom', label: '卧室' },
      { value: 'living_room', label: '客厅' },
      { value: 'balcony', label: '阳台' },
      { value: 'study', label: '书房' },
      { value: 'other', label: '其他' }
    ],
    roomTypeSelectedMap: {},
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
    // Q2: 风压警示分级
    windPressureLevel: '', // 'strong', 'weak', ''
    // 城市 K 值数据（用于动态提示）
    currentCityKBase: 0,
    currentCityKMin: 0,
    // Q6: 供暖 K 值提示
    heatingCentralKTip: '',
    heatingSelfKTip: '',
    heatingNoneKTip: '',
    // 确认页预计算的label值
    confirmRoomTypeLabels: '',
    confirmFirstPainPointLabel: '',
    confirmWindowTypeLabel: '',
    confirmFamilyRiskLabels: '',
    conflictType: '',
    conflictMessage: '',
    forceContinue: false,
    hasSubmitted: false,
    // S5：预算选中显示
    selectedBudgetLabel: '',
    selectedBudgetHint: '',
    // S4：分组进度数据
    groupIndex: 0,
    stepInGroup: 0,
    groupName: '房屋与诉求',
    groupContext: '先告诉我您的房子情况和最关心的问题',
    groupProgress: [
      { state: 'active', percent: 33 },
      { state: 'pending', percent: 0 },
      { state: 'pending', percent: 0 }
    ]
  },

  // 页面开始时间（用于计算总时长）
  startTime: 0,

  // S4：计算分组进度数据
  computeGroupData(step) {
    const groupIdx = Math.floor(step / 3);
    const stepInGroup = step % 3;
    const groupProgress = [0, 1, 2].map(i => {
      if (i < groupIdx || (step === 9 && i <= 2)) return { state: 'done', percent: 100 };
      if (i === groupIdx) return { state: 'active', percent: Math.round((stepInGroup + 1) / 3 * 100) };
      return { state: 'pending', percent: 0 };
    });

    // 确认页（step 9）显示特殊状态
    if (step === 9) {
      return {
        groupIndex: 3,
        stepInGroup: 0,
        groupName: '全部完成',
        groupContext: '请确认信息无误后生成',
        groupProgress: [
          { state: 'done', percent: 100 },
          { state: 'done', percent: 100 },
          { state: 'done', percent: 100 }
        ]
      };
    }

    return {
      groupIndex: groupIdx,
      stepInGroup: stepInGroup,
      groupName: GROUPS[groupIdx].name,
      groupContext: GROUPS[groupIdx].context,
      groupProgress: groupProgress
    };
  },

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
        title: '发现未完成的需求定制',
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
      totalSteps: 10,
      hasSubmitted: false,
      ...this.computeGroupData(0),
      family_risk: [],
      cityList: ['北京', '上海', '广州', '深圳', '成都', '武汉', '西安', '杭州', '南京', '沈阳'],
      formData: {
        city: '',
        district: '',
        painPoint: [],
        floor: null,
        totalFloors: null,
        room_type: [],
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
      roomTypeOptions: [
        { value: 'bedroom', label: '卧室' },
        { value: 'living_room', label: '客厅' },
        { value: 'balcony', label: '阳台' },
        { value: 'study', label: '书房' },
        { value: 'other', label: '其他' }
      ],
      roomTypeSelectedMap: {},
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
      windPressureLevel: '',
      currentCityKBase: 0,
      currentCityKMin: 0,
      heatingCentralKTip: '',
      heatingSelfKTip: '',
      heatingNoneKTip: '',
      conflictType: '',
      confirmRoomTypeLabels: '',
      confirmFirstPainPointLabel: '',
      confirmWindowTypeLabel: '',
      confirmFamilyRiskLabels: '',
      conflictMessage: '',
      forceContinue: false,
      selectedBudgetLabel: '',
      selectedBudgetHint: ''
    });
  },

  restoreDraft(draft) {
    const raw = draft && draft.data ? draft.data : {};
    const familyRisk = Array.isArray(raw.family_risk) ? raw.family_risk : [];
    const painPoint = Array.isArray(raw.painPoint) ? raw.painPoint : [];
    const roomType = Array.isArray(raw.room_type) ? raw.room_type : [];

    const step = Number.isFinite(draft.step) ? draft.step : (draft.step || 0);
    this.setData({
      formData: {
        ...this.data.formData,
        ...raw,
        painPoint: painPoint,
        family_risk: familyRisk,
        room_type: roomType
      },
      family_risk: familyRisk,
      currentStep: step,
      ...this.computeGroupData(step)
    }, () => {
      if (raw.city) this.setCityHint(raw.city);
      this.updateSelectedMaps();
      this.updateRoomTypeSelectedMap();
      this.calculateHeightRatio();
      this.checkBudgetConflict();
      if (raw.budgetTier) {
        const tier = BUDGET_OPTIONS.find(o => o.value === raw.budgetTier);
        if (tier) this.setData({ selectedBudgetLabel: tier.label, selectedBudgetHint: tier.hint });
      }
      // calculateHeightRatio会自动设置windPressureLevel
      // 如果恢复的是确认页（step 9），需要计算确认页label值
      if (step === 9) {
        const roomTypeLabels = this.getRoomTypeLabels();
        const firstPainPointLabel = this.getFirstPainPointLabel();
        const windowTypeLabel = this.getWindowTypeLabel();
        const familyRiskLabels = this.getFamilyRiskLabels();
        this.setData({
          confirmRoomTypeLabels: roomTypeLabels,
          confirmFirstPainPointLabel: firstPainPointLabel,
          confirmWindowTypeLabel: windowTypeLabel,
          confirmFamilyRiskLabels: familyRiskLabels
        });
      }
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

  updateRoomTypeSelectedMap() {
    const formData = this.data.formData || {};
    const roomType = Array.isArray(formData.room_type) ? formData.room_type : [];
    const options = Array.isArray(this.data.roomTypeOptions) ? this.data.roomTypeOptions : [];
    const map = {};
    options.forEach((opt) => { map[opt.value] = roomType.includes(opt.value); });
    this.setData({ roomTypeSelectedMap: map });
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
    const spec = getClimateSpec(city);
    if (spec) {
      const hint = {
        p3: spec.isCoastal ? '≥3.5' : '≥3.0',
        rw: '≥35',
        k: `${spec.kMin}~${spec.kBase}（最终值受供暖方式、朝向等影响）`,
        note: spec.climateZoneCN + '地区' + (spec.typhoonRisk ? '，台风区，高层需注意风压' : '')
      };
      this.setData({
        cityHint: hint,
        currentCityKBase: spec.kBase,
        currentCityKMin: spec.kMin
      });
      this.updateHeatingKTips(spec.kBase, spec.kMin);
    } else {
      this.setData({
        cityHint: {
          p3: '≥2.5', rw: '≥35', k: '2.3~2.5（最终值受供暖方式、朝向等影响）',
          note: '当前城市暂未精确收录，以下参数基于保守标准推算'
        },
        currentCityKBase: 2.5,
        currentCityKMin: 2.3
      });
      this.updateHeatingKTips(2.5, 2.3);
    }
  },

  updateHeatingKTips(kBase, kMin) {
    const selfK = (kBase - 0.2).toFixed(1);
    this.setData({
      heatingCentralKTip: `集中供暖地区，K值保持城市基线 ${kMin}~${kBase}`,
      heatingSelfKTip: `自采暖地区，K值加严至 ${kMin}~${selfK}`,
      heatingNoneKTip: `无集中供暖，K值保持城市基线 ${kMin}~${kBase}`
    });
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
      const ratioDecimal = f / t;

      // 风压警示分级逻辑
      let windPressureLevel = '';
      if (f >= 16 && ratioDecimal >= 0.8) {
        windPressureLevel = 'strong'; // 强警示
      } else if ((f >= 11 && f < 16) || (f >= 16 && ratioDecimal < 0.8)) {
        windPressureLevel = 'weak'; // 弱提示
      }

      this.setData({
        heightRatio: ratio,
        showHeightRatio: true,
        showRatio: true,
        windPressureLevel: windPressureLevel
      });
    } else {
      this.setData({
        showHeightRatio: false,
        showRatio: false,
        windPressureLevel: ''
      });
    }
  },

  onRoomTypeChange(e) {
    const value = e && e.currentTarget && e.currentTarget.dataset ? e.currentTarget.dataset.value : '';
    const currentSelected = Array.isArray(this.data.formData.room_type) ? this.data.formData.room_type : [];
    const index = currentSelected.indexOf(value);
    const nextSelected = index > -1
      ? currentSelected.filter(item => item !== value)
      : [...currentSelected, value];

    const map = {};
    const options = Array.isArray(this.data.roomTypeOptions) ? this.data.roomTypeOptions : [];
    options.forEach((opt) => { map[opt.value] = nextSelected.includes(opt.value); });

    this.setData({
      'formData.room_type': nextSelected,
      roomTypeSelectedMap: map
    });
    this.saveDraft();
  },

  // S5: Q3 痛点 tap交互（替代checkbox-group原生控件，formData字段不变）
  onPainPointTap(e) {
    const value = e.currentTarget.dataset.value;
    const current = Array.isArray(this.data.formData.painPoint) ? this.data.formData.painPoint : [];
    const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
    const map = {};
    next.forEach(v => { map[v] = true; });
    this.setData({ 'formData.painPoint': next, painPointSelectedMap: map });
    this.saveDraft();
    trackStep(3, { pain_point: next });
  },

  // S5: Q5 西晒遮阳 tap交互
  onShadingTap(e) {
    const shading = e.currentTarget.dataset.value === 'true';
    this.setData({ 'formData.westShading': shading });
    this.saveDraft();
    trackStep(5, { west_shading: shading });
  },

  // S5: Q8 家庭风险 tap交互（formData字段不变）
  onFamilyRiskTap(e) {
    const value = e.currentTarget.dataset.value;
    const current = Array.isArray(this.data.formData.family_risk) ? this.data.formData.family_risk : [];
    const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
    const map = {};
    next.forEach(v => { map[v] = true; });
    this.setData({
      family_risk: next,
      'formData.family_risk': next,
      familyRiskSelectedMap: map
    });
    this.saveDraft();
    trackStep(8, { family_risk: next });
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
    // v3.9.8 · 安静环境距离字段联动
    // 安静环境下，距离字段不应参与传参
    const isQuietEnvironment = this.data.formData.noise_type === 'quiet'
      || this.data.formData.noise_type === 'silent'
      || this.data.formData.noise_type === 'none';

    if (isQuietEnvironment) {
      // 安静环境：距离字段设为 null，不显示选择
      this.setData({
        'formData.noise_dist': null,
        'formData.noise_dist_label': '安静环境无需选择距离范围'
      });
      this.saveDraft();
      return; // 不继续处理
    }

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

    // 更新K值提示
    const kBase = this.data.currentCityKBase;
    const kMin = this.data.currentCityKMin;
    if (kBase > 0) {
      this.updateHeatingKTips(kBase, kMin);
    }

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
    const tier = this.data.budgetTiers[index];
    const budget = tier.value;
    this.setData({
      'formData.budgetTier': budget,
      selectedBudgetLabel: tier.label,
      selectedBudgetHint: tier.hint,
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
      ...this.computeGroupData(1),
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
    this.goToConfirm();
  },

  nextQuestion() {
    this.nextStep();
  },

  // Q9 专用：跳转到确认页
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
            this.setData({ forceContinue: true });
            this.saveDraft();
            this.goToConfirm();
          }
        }
      });
    } else {
      this.goToConfirm();
    }
  },

  // S6: 跳转到确认页（step 9）
  goToConfirm() {
    // 预计算确认页所需的label值
    const roomTypeLabels = this.getRoomTypeLabels();
    const firstPainPointLabel = this.getFirstPainPointLabel();
    const windowTypeLabel = this.getWindowTypeLabel();
    const familyRiskLabels = this.getFamilyRiskLabels();

    this.setData({
      currentStep: 9,
      ...this.computeGroupData(9),
      confirmRoomTypeLabels: roomTypeLabels,
      confirmFirstPainPointLabel: firstPainPointLabel,
      confirmWindowTypeLabel: windowTypeLabel,
      confirmFamilyRiskLabels: familyRiskLabels
    });
    this.saveDraft();
  },

  // S6: 返回到Q9
  backToStep8() {
    this.setData({ currentStep: 8, ...this.computeGroupData(8) });
    this.saveDraft();
  },

  // S6: 提交并进入等待页
  submitWithLoading() {
    if (!this.validateCurrentStep()) return;

    // 标记已提交
    this.setData({ hasSubmitted: true });

    const totalTime = Date.now() - (this.startTime || Date.now());

    // 埋点：问卷提交
    track('survey_submitted', {
      total_time_ms: totalTime,
      has_photos: false,
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

    // 调用云函数，等待页将自定义显示
    this.callGenerateReportWithLoading(this.data.forceContinue);
  },

  // S6: 带等待页的云函数调用
  callGenerateReportWithLoading(isDisclaimer) {
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

    // 埋点：PDF生成请求
    trackPDF.request({
      budget_tier: this.data.formData.budgetTier,
      is_risk: isDisclaimer,
      city: this.data.formData.city
    });

    // 准备数据
    const windowFeatures = this.buildWindowFeatures(this.data.family_risk);
    const primaryPainPoint = this.getPrimaryPainPoint(this.data.formData.painPoint);
    const payload = {
      ...this.data.formData,
      painPoint: primaryPainPoint,
      pain_points: Array.isArray(this.data.formData.painPoint) ? this.data.formData.painPoint : [],
      family_risk: this.data.family_risk || [],
      window_features: windowFeatures,
      isDisclaimer: isDisclaimer,
      timestamp: Date.now(),
      cityStandard: this.data.cityHint
    };

    console.log('[S6] 调用云函数参数：', payload);

    // 用 storage 传递大对象，避免 URL 长度限制（~1024字符）
    wx.setStorageSync('generatePayload', payload);

    // 跳转到等待页，只传轻量标记
    wx.navigateTo({
      url: `/pages/generate-loading/generate-loading?source=survey&isDisclaimer=${isDisclaimer}`
    });
  },

  // S6: 获取第一个关注点的标签
  getFirstPainPointLabel() {
    const painPoint = this.data.formData.painPoint || [];
    if (painPoint.length === 0) return '';

    const firstValue = painPoint[0];
    const option = this.data.painPoints.find(p => p.value === firstValue);
    return option ? option.label : '';
  },

  // S6: 获取窗型标签
  getWindowTypeLabel() {
    const windowType = this.data.formData.window_type;
    if (!windowType) return '';

    const option = this.data.windowTypes.find(w => w.value === windowType);
    return option ? option.label : '';
  },

  // S6: 获取使用场景标签
  getRoomTypeLabels() {
    const roomTypes = this.data.roomTypeOptions || [];
    const selected = this.data.formData.room_type || [];
    return selected
      .map(v => {
        const opt = roomTypes.find(o => o.value === v);
        return opt ? opt.label : v;
      })
      .join('、') || '-';
  },

  // S6: 获取家庭风险标签
  getFamilyRiskLabels() {
    const risks = this.data.familyRiskOptions || [];
    const selected = this.data.family_risk || [];
    return selected
      .map(v => {
        const opt = risks.find(o => o.value === v);
        return opt ? opt.label : v;
      })
      .join('、') || '-';
  },

  // 通用导航
  nextStep() {
    if (this.validateCurrentStep()) {
      const nextStepNum = this.data.currentStep + 1;
      this.setData({ currentStep: nextStepNum, ...this.computeGroupData(nextStepNum) });
      this.saveDraft();
    }
  },

  prevStep() {
    const prevStepNum = this.data.currentStep - 1;
    this.setData({ currentStep: prevStepNum, ...this.computeGroupData(prevStepNum) });
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
        } else if (!Array.isArray(formData.room_type) || formData.room_type.length === 0) {
          isValid = false; message = '请选择至少一个使用场景';
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
    
    // 埋点：需求定制提交（北极星指标）
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
      pain_points: Array.isArray(this.data.formData.painPoint) ? this.data.formData.painPoint : [],
      family_risk: this.data.family_risk || [],
      window_features: windowFeatures,
      isDisclaimer: isDisclaimer,
      timestamp: Date.now(),
      cityStandard: this.data.cityHint
    };

  },

  saveDraft() {
    wx.setStorageSync('survey_draft_v1', {
      data: this.data.formData,
      step: this.data.currentStep,
      timestamp: Date.now()
    });
  }
});
