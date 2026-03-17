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

Page({
  data: {
    currentStep: 0,
    totalSteps: 10,
    cityList: ['北京', '上海', '广州', '深圳', '成都', '武汉', '西安', '杭州', '南京', '沈阳'],
    formData: {
      city: '',
      district: '',
      painPoint: '',
      floor: null,
      totalFloors: null,
      noise_type: '',
      noise_dist: '',
      noise_type_label: '',
      noise_dist_label: '',
      orientation: '',
      westShading: false,
      heatingType: '',
      budgetTier: '',
      priority: '',
      familyType: '',
      timeline: ''
    },
    cityHint: null,
    painPoints: ['隔音降噪', '保温节能', '安全防盗', '采光视野', '省钱经济'],
    noiseTypeOptions: [
      { label: '主干道/马路', value: 'main_road' },
      { label: '高架桥', value: 'elevated' },
      { label: '轨道交通/地铁', value: 'rail' },
      { label: '安静/无特殊噪音', value: 'quiet' }
    ],
    noiseDistOptions: [
      { label: '<20m / 紧邻', value: 'lt20' },
      { label: '20-50m / 较近', value: '20to50' },
      { label: '>50m / 较远', value: 'gt50' }
    ],
    orientations: ['东', '南', '西', '北', '东南', '西南', '东北', '西北'],
    heatingTypes: ['集中供暖', '自采暖', '无供暖'],
    budgetTiers: [
      { code: 'A', label: 'A档（经济型 <800元/㎡）' },
      { code: 'B', label: 'B档（舒适型 800-1200元/㎡）' },
      { code: 'C', label: 'C档（品质型 1200-1800元/㎡）' },
      { code: 'D', label: 'D档（奢华型 >1800元/㎡）' }
    ],
    showRatio: false,
    conflictWarning: null,
    forceContinue: false,
    hasSubmitted: false  // 新增：标记是否已提交
  },

  // 页面开始时间（用于计算总时长）
  startTime: 0,

  onReady() {
    console.log('=== Survey 页面就绪 ===');
    console.log('cityList:', this.data.cityList);
  },

  onLoad() {
    // 记录开始时间（用于流失分析）
    this.startTime = Date.now();
    
    // ===== 埋点：页面进入 =====
    track('survey_enter', { 
      has_draft: !!wx.getStorageSync('survey_draft_v1'),
      timestamp: this.startTime
    });

    // 强制初始化关键数据（防止被意外覆盖）
    this.setData({
      currentStep: 0,
      totalSteps: 10,
      hasSubmitted: false,  // 重置提交标记
      cityList: ['北京', '上海', '广州', '深圳', '成都', '武汉', '西安', '杭州', '南京', '沈阳'],
      formData: {
        city: '',
        district: '',
        painPoint: '',
        floor: null,
        totalFloors: null,
        noise_type: '',
        noise_dist: '',
        noise_type_label: '',
        noise_dist_label: '',
        orientation: '',
        westShading: false,
        heatingType: '',
        budgetTier: '',
        priority: ''
      },
      cityHint: null,
      painPoints: ['隔音降噪', '保温节能', '安全防盗', '采光视野', '省钱经济'],
      noiseTypeOptions: [
        { label: '主干道/马路', value: 'main_road' },
        { label: '高架桥', value: 'elevated' },
        { label: '轨道交通/地铁', value: 'rail' },
        { label: '安静/无特殊噪音', value: 'quiet' }
      ],
      noiseDistOptions: [
        { label: '<20m / 紧邻', value: 'lt20' },
        { label: '20-50m / 较近', value: '20to50' },
        { label: '>50m / 较远', value: 'gt50' }
      ],
      orientations: ['东', '南', '西', '北', '东南', '西南', '东北', '西北'],
      heatingTypes: ['集中供暖', '自采暖', '无供暖'],
      budgetTiers: [
        { code: 'A', label: 'A档（经济型 <800元/㎡）' },
        { code: 'B', label: 'B档（舒适型 800-1200元/㎡）' },
        { code: 'C', label: 'C档（品质型 1200-1800元/㎡）' },
        { code: 'D', label: 'D档（奢华型 >1800元/㎡）' }
      ],
      showRatio: false,
      heightRatio: 0,
      conflictWarning: null,
      forceContinue: false
    });
    
    console.log('[Survey] 数据初始化完成，cityList:', this.data.cityList);
    
    // 原有草稿恢复代码（放在初始化之后）
    const draft = wx.getStorageSync('survey_draft_v1');
    if (draft && (Date.now() - draft.timestamp) < 7 * 24 * 3600 * 1000) {
      this.setData({
        'formData.city': draft.data.city || '',
        'formData.district': draft.data.district || '',
        'formData.painPoint': draft.data.painPoint || '',
        'formData.floor': draft.data.floor || null,
        'formData.totalFloors': draft.data.totalFloors || null,
        'formData.noise_type': draft.data.noise_type || '',
        'formData.noise_dist': draft.data.noise_dist || '',
        'formData.noise_type_label': draft.data.noise_type_label || '',
        'formData.noise_dist_label': draft.data.noise_dist_label || '',
        'formData.orientation': draft.data.orientation || '',
        'formData.westShading': draft.data.westShading || false,
        'formData.heatingType': draft.data.heatingType || '',
        'formData.budgetTier': draft.data.budgetTier || '',
        'formData.priority': draft.data.priority || '',
        currentStep: draft.step || 0
      });
      
      if (draft.data.city) {
        this.setCityHint(draft.data.city);
      }
      if (draft.data.floor && draft.data.totalFloors) {
        const ratio = Math.round((draft.data.floor / draft.data.totalFloors) * 100);
        this.setData({ showRatio: true, heightRatio: ratio });
      }
    }
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
    });
    this.saveDraft();
    
    // 埋点：步骤完成（Q2）
    if (total) {
      trackStep(2, { floor: floor, total_floors: total });
    }
  },

  // Q3: 痛点
  onPainPointSelect(e) {
    const point = e.currentTarget.dataset.value;
    this.setData({ 'formData.painPoint': point });
    this.saveDraft();
    
    // 埋点：步骤完成（Q3）
    trackStep(3, { pain_point: point });
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
    const noiseLabel = opt ? opt.label : '>50m / 较远';
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

  // Q7: 家庭结构
  onFamilyChange(e) {
    const types = ['有老人/幼儿', '年轻夫妇', '独居', '出租'];
    const familyType = types[e.detail.value];
    this.setData({ 'formData.familyType': familyType });
    this.saveDraft();
    
    // 埋点：步骤完成（Q7）
    trackStep(7, { family_type: familyType });
  },

  // Q8: 预算（冲突预警核心）
  onBudgetChange(e) {
    const index = e.detail.value;
    const budget = this.data.budgetTiers[index].code;
    const { floor, totalFloors } = this.data.formData;
    
    let warning = null;
    if (budget === 'A' && floor && totalFloors) {
      const ratio = floor / totalFloors;
      if (ratio > 0.5 || floor > 16) {
        warning = '❌ 配置不兼容：' + floor + '层+A档预算无法达到GB/T 7106抗风压标准（≥3.5kPa）';
      }
    }
    
    this.setData({ 
      'formData.budgetTier': budget,
      conflictWarning: warning,
      forceContinue: false
    });
    this.saveDraft();
    
    // 埋点：步骤完成（Q8）
    trackStep(8, { budget_tier: budget, has_conflict: !!warning });
  },

  // 强制进入Q9
  forceNextStep() {
    this.setData({ 
      forceContinue: true,
      currentStep: 8
    });
    this.saveDraft();
  },

  // Q8 专用：软阻断检查
  nextStepWithCheck() {
    if (this.data.currentStep === 7 && this.data.conflictWarning) {
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
              forceContinue: true,
              currentStep: 8
            });
            this.saveDraft();
          }
        }
      });
    } else {
      this.nextStep();
    }
  },

  // Q9: 优先项
  onPriorityChange(e) {
    const priorities = ['隔音降噪', '保温节能', '采光视野', '控制预算'];
    const priority = priorities[e.detail.value];
    this.setData({ 'formData.priority': priority });
    this.saveDraft();
    
    // 埋点：步骤完成（Q9）
    trackStep(9, { priority: priority });
  },

  // Q10: 工期
  onTimelineChange(e) {
    const timelines = ['1个月内', '1-3个月', '3个月以上', '不着急'];
    const timeline = timelines[e.detail.value];
    this.setData({ 'formData.timeline': timeline });
    this.saveDraft();
    
    // 埋点：步骤完成（Q10）
    trackStep(10, { timeline: timeline });
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
    if (currentStep === 0 && !formData.city) {
      wx.showToast({ title: '请选择城市', icon: 'none' });
      return false;
    }
    if (currentStep === 7 && !formData.budgetTier) {
      wx.showToast({ title: '请选择预算档位', icon: 'none' });
      return false;
    }
    return true;
  },

  // 提交入口（统一分发）
  submit() {
    // 标记已提交（防止onUnload记录流失）
    this.setData({ hasSubmitted: true });
    
    const totalTime = Date.now() - (this.startTime || Date.now());
    
    // 埋点：问卷提交（北极星指标）
    track('survey_submitted', {
      total_time_ms: totalTime,
      has_photos: false, // 当前版本无照片
      city: this.data.formData.city,
      budget_tier: this.data.formData.budgetTier,
      is_risk: !!(this.data.conflictWarning && this.data.forceContinue),
      has_conflict: !!this.data.conflictWarning,
      floor: this.data.formData.floor,
      total_floors: this.data.formData.totalFloors
    });

    // 最终校验
    if (this.data.conflictWarning && !this.data.forceContinue) {
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
    const payload = {
      ...this.data.formData,
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
