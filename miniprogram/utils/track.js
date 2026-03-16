/**
 * 全链路埋点SDK
 * 符合Claude设计文档C1.2节Event Schema
 * 约束：事件名≤32字符，属性值≤256字符（DK-002）
 */

const APP_VERSION = '1.2.0';
const MAX_RETRIES = 3;

// 内部发送函数（带重试）
async function sendTrack(name, props = {}, retryCount = 0) {
  try {
    // 数据脱敏与截断（DK-002保护）
    const sanitizedProps = {};
    Object.entries(props).forEach(([k, v]) => {
      if (v === null || v === undefined) return;
      
      let strVal;
      if (typeof v === 'number') strVal = String(v);
      else if (typeof v === 'boolean') strVal = v ? 'true' : 'false';
      else if (typeof v === 'string') strVal = v.slice(0, 100);
      else strVal = String(v).slice(0, 100);
      
      // 键名也要截断
      const safeKey = k.slice(0, 32);
      sanitizedProps[safeKey] = strVal;
    });

    // 获取A/B分组（由app.js初始化写入storage）
    const abGroups = wx.getStorageSync('ab_test_groups') || {};
    
    // 调用云函数（15行核心代码对应）
    const res = await wx.cloud.callFunction({
      name: 'trackEvent',
      data: {
        name: name.slice(0, 32), // 事件名截断
        props: sanitizedProps,
        ab_layer1: abGroups.layer1_bucket,
        ab_layer2: abGroups.layer2_bucket,
        app_version: APP_VERSION,
        system_info: `${wx.getSystemInfoSync().platform}_${wx.getSystemInfoSync().version}`
      }
    });
    
    return res.result;
  } catch (e) {
    console.error(`Track failed (${retryCount + 1}/${MAX_RETRIES}):`, e);
    
    // 重试机制（网络抖动时）
    if (retryCount < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)));
      return sendTrack(name, props, retryCount + 1);
    }
    
    // 最终失败，静默处理（不阻塞业务）
    return { success: false, error: e.message };
  }
}

// 主track函数（防抖批量发送可选，MVP阶段直接发送）
const track = async (name, props = {}) => {
  // 开发环境打印日志
  if (__wxConfig && __wxConfig.envVersion === 'develop') {
    console.log('[Track]', name, props);
  }
  return sendTrack(name, props);
};

// 页面生命周期自动埋点
const trackPage = (pageName, additionalProps = {}) => {
  return track(`${pageName}_enter`, {
    ...additionalProps,
    timestamp: Date.now()
  });
};

// 问卷步骤埋点（节流版，300ms防抖）
let lastStepTime = 0;
const trackStep = (stepNumber, props = {}) => {
  const now = Date.now();
  if (now - lastStepTime < 300) return Promise.resolve(); // 防抖
  lastStepTime = now;
  
  return track('survey_step_complete', {
    step_number: String(stepNumber),
    ...props
  });
};

// 用户流失埋点（在onUnload中调用）
const trackAbandon = (lastStep, totalTimeMs, trigger = 'unload') => {
  return track('survey_abandon', {
    last_step: String(lastStep),
    duration_total: String(totalTimeMs),
    trigger_type: trigger, // unload / hide / timeout
    completed_ratio: String(Math.round((lastStep / 10) * 100))
  });
};

// PDF相关埋点
const trackPDF = {
  request: (props) => track('pdf_generate_request', props),
  success: (props) => track('pdf_generate_success', { ...props, timestamp: Date.now() }),
  fail: (error) => track('pdf_generate_fail', { error_code: error.slice(0, 50) }),
  open: (props) => track('pdf_preview_opened', props)
};

// L2转化埋点
const trackL2 = {
  view: (entryType) => track('l2_entry_view', { entry_type: entryType }),
  click: (entryType) => track('l2_entry_click', { entry_type: entryType }),
  qrcode: (entryType) => track('qrcode_view', { entry_type: entryType })
};

module.exports = { 
  track, 
  trackPage, 
  trackStep, 
  trackAbandon,
  trackPDF,
  trackL2
};