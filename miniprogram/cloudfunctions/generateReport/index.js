console.log('VERSION: 8A-FINAL');
// Phase 1 测试：新 PDF 渲染引擎（新增）
const { mapToSections } = require('./documentMapper');
const { buildPDF } = require('./pdfBuilder-v2');

const { calculateAll } = require('./calculator-v2');
// 保留旧版以备回退（注释掉）
// const { buildPDF } = require('./pdfBuilder');

const cloud = require('wx-server-sdk');
const fs = require('fs');

cloud.init({ env: 'cloud1-7grn8mcy176fcc2b' });

// 数据字段映射适配（前端数据 -> calculator-v2格式）
function adaptAssessmentData(data) {
  let { family_risk } = data || {};
  if (!Array.isArray(family_risk)) {
    family_risk = (typeof family_risk === 'string') ? (family_risk ? [family_risk] : []) : [];
  }

  // 噪音类型映射
  const noiseMap = {
    '主干道': 'main_road',
    '高架桥': 'elevated',
    '轨道交通': 'rail',
    '安静': 'quiet',
    main_road: 'main_road',
    elevated: 'elevated',
    rail: 'rail',
    quiet: 'quiet'
  };
  
  // 距离映射（假设前端格式）
  const distMap = {
    '<20m': 'lt20',
    '20-50m': '20to50',
    '>50m': 'gt50',
    lt20: 'lt20',
    '20to50': '20to50',
    gt50: 'gt50',
    gt50_shielded: 'gt50_shielded'
  };
  
  // 痛点映射（Q3）
  const painPointMap = {
    '隔音降噪': 'sound',
    '保温节能': 'heat',
    '防风防水': 'wind',
    '安全防盗': 'safety',
    '视野景观': 'view',
    '采光视野': 'view',
    '性价比': 'price',
    '省钱经济': 'price',
    '通风透气': 'vent',
    sound: 'sound',
    heat: 'heat',
    wind: 'wind',
    safety: 'safety',
    price: 'price',
    view: 'view',
    vent: 'vent'
  };
  
  // 供暖映射
  const heatingMap = {
    '集中供暖': 'central',
    '自采暖': 'self',
    '空调取暖': 'self',
    '无供暖': 'none',
    '不需要': 'none',
    central: 'central',
    self: 'self',
    none: 'none'
  };

  return {
    city: data.city || '北京',
    floor: parseInt(data.floor) || 1,
    total_floors: parseInt(data.totalFloors) || 1,
    pain_point: painPointMap[data.pain_point || data.painPoint] || 'sound',
    pain_points: Array.isArray(data.pain_points) ? data.pain_points : [],
    noise_type:
      noiseMap[data.noise_type || data.noiseType] ||
      (typeof data.noiseType === 'string' && data.noiseType.includes('主干') ? 'main_road' : null) ||
      (typeof data.noiseType === 'string' && data.noiseType.includes('高架') ? 'elevated' : null) ||
      (typeof data.noiseType === 'string' && data.noiseType.includes('轨道') ? 'rail' : null) ||
      (typeof data.noiseType === 'string' && (data.noiseType.includes('安静') || data.noiseType.includes('安') ) ? 'quiet' : null) ||
      'quiet',
    noise_dist:
      distMap[data.noise_dist || data.noiseDist] ||
      (typeof data.noiseDist === 'string' && data.noiseDist.includes('<20') ? 'lt20' : null) ||
      (typeof data.noiseDist === 'string' && (data.noiseDist.includes('20') && data.noiseDist.includes('50')) ? '20to50' : null) ||
      (typeof data.noiseDist === 'string' && (data.noiseDist.includes('>50') || data.noiseDist.includes('50m以上')) ? 'gt50' : null) ||
      'gt50',
    orientation: (data.orientation || 'south').toLowerCase(),
    west_shading: (() => {
      const raw = (data.westShading !== undefined) ? data.westShading : data.west_shading;
      return raw === true || raw === '有遮挡';
    })(),
    heating_type: heatingMap[data.heatingType] || heatingMap[data.heating_type] || 'none',
    window_type: data.window_type || '',
    room_type: Array.isArray(data.room_type) ? data.room_type : [],
    family_risk: family_risk,
    budget_tier: (data.budgetTier || 'B').toUpperCase(),
    // 保留原始字段供 PDF 显示使用
    district: data.district || '',
    photos: data.photos || []
  };
}

exports.main = async (event, context) => {
  const { assessmentData } = event;
  const { OPENID } = cloud.getWXContext();
  
  console.log('[Cloud] 接收数据：', assessmentData);
  console.log('Raw answers.noise_type:', assessmentData && assessmentData.noise_type);
  console.log('Raw answers.noise_dist:', assessmentData && assessmentData.noise_dist);
  
  try {
    // 1. 生成文件名（保留原有逻辑）
    const timestamp = new Date().toISOString().slice(0,10).replace(/-/g,'');
    const randomStr = Math.random().toString(36).substr(2,6).toUpperCase();
    const fileName = `LSA-${timestamp}-${randomStr}.pdf`;
    const tempPath = `/tmp/${fileName}`;
    const pdfNo = `LSA-${timestamp}-${randomStr}`;
    const db = cloud.database();
    let reportId = null;
    
    // 2. 数据适配与计算（保留原有逻辑）
    const adaptedData = adaptAssessmentData(assessmentData);
    console.log('[Cloud] 适配后数据：', adaptedData);
    
    const computed = calculateAll(adaptedData);
    console.log('[Cloud] 计算结果：', computed);
    
    // Phase 1 新流程：使用 documentMapper 构建 sections（替换原有 sections 构建逻辑）
    const sections = mapToSections(computed, adaptedData, pdfNo);
    console.log('Resolved Rw_required:', computed.Rw_required);
    console.log('Noise type:', adaptedData.noise_type);
    console.log('Noise dist:', adaptedData.noise_dist);
    console.log('[Cloud] Sections 映射完成:', {
      city: sections.cover.city,
      tier: sections.chapter3.currentTier,
      isRisk: sections.cover.isRisk
    });
    
    // 在 const sections = mapToSections(...) 后添加
    console.log('[Debug] sections 构建完成:', JSON.stringify({
      cover: sections.cover,
      chapter1_keys: Object.keys(sections.chapter1),
      chapter2_keys: Object.keys(sections.chapter2),
      chapter3_keys: Object.keys(sections.chapter3),
      chapter4_keys: Object.keys(sections.chapter4)
    }));
   
    /* 
    // 旧代码已注释：直接构建 sections（Phase 0 逻辑）
    const isRisk = Object.keys(computed.risk_flags || {}).length > 0 || assessmentData.isDisclaimer;
    
    const sections = {
      cover: {
        city: computed.city,
        degraded: computed.degraded,
        degraded_msg: computed.degraded_msg,
        hasSafetyClause: computed.hasSafetyClause,
        pdf_no: `LSA-${timestamp}-${randomStr}`
      },
      chapter1: {
        city: computed.city,
        climate_zone: computed.climate_zone,
        floor: computed.floor,
        total_floors: computed.total_floors,
        height_ratio: computed.height_ratio,
        pain_point: adaptedData.pain_point,
        noise_eval: adaptedData.noise_type !== 'quiet' ? `${adaptedData.noise_type} ${adaptedData.noise_dist}` : null
      },
      chapter2: {
        P3: computed.P3,
        Rw: computed.Rw,
        K: computed.K,
        SHGC: computed.SHGC,
        priority: computed.priority,
        shgc_note: computed.shgc_note,
        conflict_notes: computed.conflict_notes,
        safety_items: computed.safety_items,
        risk_flags: computed.risk_flags
      },
      chapter3: {
        budget_spec: computed.budget_spec,
        budget_tier: computed.budget_tier,
        is_risk: isRisk,
        upgrades: [
          { name: '隔音升级', desc: 'Rw+5dB，三玻两腔', cost: '200-300' },
          { name: '热工升级', desc: 'K值降低0.3，注胶式', cost: '150-250' }
        ]
      },
      chapter4: {
        is_risk: isRisk,
        deadline_text: computed.deadline_text,
        risk_notes: computed.conflict_notes
      }
    };
    */
    
    // 3. 招标与小程序码（先创建招标以便在 PDF 中嵌入二维码）
    let tenderId = null;
    let qrCodeBuffer = null;
    try {
      const tenderSections = {
        parameterTable: {
          K_target: computed.K_target,
          Rw_required: computed.Rw_required,
          SHGC_target: computed.SHGC_target,
          P3_required: computed.P3_required,
          safety_items: computed.safety_items
        },
        budgetTier: sections && sections.chapter3 && sections.chapter3.budgetComparison ? sections.chapter3.budgetComparison.currentTier : null,
        climateZone: computed.climateZone || computed.climate_zone || computed.climateZoneCN || null
      };

      const tenderAnswers = {
        ...assessmentData,
        Q1: assessmentData && (assessmentData.Q1 || assessmentData.city) ? (assessmentData.Q1 || assessmentData.city) : adaptedData.city,
        Q3: assessmentData && (assessmentData.Q3 || assessmentData.floor) ? (assessmentData.Q3 || assessmentData.floor) : adaptedData.floor,
        Q7: assessmentData && (assessmentData.Q7 || assessmentData.window_type || assessmentData.windowType) ? (assessmentData.Q7 || assessmentData.window_type || assessmentData.windowType) : adaptedData.window_type
      };

      const createTenderRes = await cloud.callFunction({
        name: 'createTender',
        data: {
          reportId: reportId || pdfNo,
          answers: tenderAnswers,
          sections: tenderSections,
          ownerOpenId: OPENID
        }
      });
      tenderId = createTenderRes && createTenderRes.result ? createTenderRes.result.tenderId : null;
      console.log('[Cloud] createTender 返回：', createTenderRes && createTenderRes.result ? createTenderRes.result : null);
      console.log('[Cloud] tenderId：', tenderId);
      if (tenderId) {
        try {
          const qrRes = await cloud.openapi.wxacode.getUnlimited({
            scene: tenderId,
            page: 'pages/vendor/fill',
            width: 280
          });
          qrCodeBuffer = qrRes && qrRes.buffer ? qrRes.buffer : null;
          console.log('[Cloud] 小程序码生成成功，buffer长度：', qrCodeBuffer ? qrCodeBuffer.length : 0);
        } catch (qrErr) {
          console.error('[Cloud] 小程序码生成失败（非阻断）：', qrErr);
          qrCodeBuffer = null;
        }
      }
    } catch (e) {
      console.error('[Cloud] createTender 失败（非阻断）：', e);
      tenderId = null;
      qrCodeBuffer = null;
    }

    // 4. 生成PDF（Phase 1：使用新的 buildPDF）
    console.log('[Cloud] 开始生成 PDF（Phase 1 新引擎）...');
    console.log('[Cloud] PDF小程序码透传参数：', { tenderId, hasQrCodeBuffer: !!qrCodeBuffer });
    await buildPDF(sections, tempPath, { tenderId, qrCodeBuffer });
    
    // 5. 验证文件（保留原有逻辑）
    const stats = fs.statSync(tempPath);
    console.log('[Cloud] 文件大小:', stats.size, 'bytes');
    
    if (stats.size < 1000) {
      throw new Error(`PDF文件生成异常，大小仅${stats.size}字节`);
    }
    
    // 6. 上传到云存储（保留原有逻辑）
    const fileContent = fs.readFileSync(tempPath);
    const uploadRes = await cloud.uploadFile({
      cloudPath: `reports/${fileName}`,
      fileContent: fileContent,
    });
    
    console.log('[Cloud] 上传成功：', uploadRes.fileID);
    
    // 7. 写入数据库（保留原有逻辑）
    try {
      const addRes = await db.collection('assessments').add({
        data: {
          openid: OPENID, 
          formData: assessmentData,
          computedData: computed,
          fileID: uploadRes.fileID,
          fileName: fileName,
          fileSize: stats.size,
          isDisclaimer: sections.cover.isRisk, // 使用新结构中的 isRisk
          status: sections.cover.isRisk ? 'risk_pending_review' : 'normal',
          createdAt: db.serverDate(),
          updatedAt: db.serverDate()
        }
      });
      reportId = addRes && addRes._id ? addRes._id : null;
      console.log('[Cloud] 数据库写入成功');
    } catch (dbErr) {
      console.error('[Cloud] 数据库写入失败（非阻断）：', dbErr);
    }
    if (tenderId && reportId) {
      try {
        await db.collection('tenders').where({ tenderId }).update({ data: { reportId } });
      } catch (e) {
      }
    }

    // 8. 返回成功（保留原有逻辑）
    return {
      success: true,
      fileID: uploadRes.fileID,
      fileName: fileName,
      fileSize: stats.size,
      isDisclaimer: sections.cover.isRisk,
      reportId,
      tenderId,
      warnings: computed.warnings || [],
      computed: {
        K_target: computed.K_target,
        Rw_required: computed.Rw_required,
        SHGC_target: computed.SHGC_target,
        P3_required: computed.P3_required,
        safety_items: computed.safety_items,
        hasSafetyClause: computed.hasSafetyClause,
        risk_flags: computed.risk_flags,
        conflict_notes: computed.conflict_notes,
        corrections: computed.corrections
      }
    };
    
  } catch (err) {
    console.error('[Cloud] 生成失败：', err);
    return {
      success: false,
      error: err.message,
      detail: err.stack
    };
  }
};
