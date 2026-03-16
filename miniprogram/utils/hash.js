/**
 * 分层A/B实验分组算法（djb2）
 * Layer1: 文案×位置（6桶），Layer2: 进度条（2桶）
 */

function hashCode(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // 32位整数
  }
  return Math.abs(hash);
}

function getBucket(openid, layer, buckets) {
  const salted = `layer${layer}:${openid}`;
  return hashCode(salted) % buckets;
}

// Layer1配置：3文案 × 2位置 = 6桶
const LAYER1_MAP = [
  { copy: 'control', position: 'bottom' },   // bucket 0: 对照文案+底部位置
  { copy: 'control', position: 'top' },      // bucket 1: 对照文案+顶部位置
  { copy: 'fear', position: 'bottom' },      // bucket 2: 恐惧文案+底部
  { copy: 'fear', position: 'top' },         // bucket 3: 恐惧文案+顶部
  { copy: 'benefit', position: 'bottom' },   // bucket 4: 利益文案+底部
  { copy: 'benefit', position: 'top' }       // bucket 5: 利益文案+顶部
];

// Layer2配置：2桶
const LAYER2_MAP = ['progress_bar', 'step_indicator'];

function assignAllExperiments(openid) {
  const l1 = getBucket(openid, 1, 6);
  const l2 = getBucket(openid, 2, 2);
  
  return {
    exp1_copy: LAYER1_MAP[l1].copy,           // control/fear/benefit
    exp2_position: LAYER1_MAP[l1].position,   // bottom/top
    exp3_progress: LAYER2_MAP[l2],            // progress_bar/step_indicator
    layer1_bucket: l1,
    layer2_bucket: l2
  };
}

// 根据实验ID获取当前用户应显示的版本
function getVariant(expId) {
  const abGroups = wx.getStorageSync('ab_test_groups') || {};
  
  const variants = {
    'EXP-01-privacy': { timing: abGroups.exp1_copy === 'control' ? 'on_launch' : 'on_cta' },
    'EXP-02-q5style': { style: abGroups.exp3_progress === 'step_indicator' ? 'compass' : 'dropdown' },
    'EXP-03-l2copy': { copy: abGroups.exp1_copy }, // control/fear/benefit
    'EXP-04-l2pos': { position: abGroups.exp2_position } // bottom/top
  };
  
  return variants[expId] || null;
}

module.exports = { 
  hashCode, 
  getBucket, 
  assignAllExperiments,
  getVariant 
};