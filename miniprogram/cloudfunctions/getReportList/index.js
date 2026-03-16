const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();
  
  console.log('[getReportList] 当前用户OPENID:', OPENID);
  
  try {
    // 关键修复：使用 openid（与数据库字段完全匹配，无下划线）
    const { data } = await db.collection('assessments')
      .where({ openid: OPENID })  // ← 确认与数据库字段一致
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();
    
    console.log('[getReportList] 查询条件:', { openid: OPENID });
    console.log('[getReportList] 查到记录数:', data.length);
    
    // 格式化日期和大小
    const formatted = data.map(item => ({
      ...item,
      createdAt: item.createdAt 
        ? new Date(item.createdAt).toLocaleString('zh-CN') 
        : '未知时间',
      sizeKB: item.fileSize 
        ? (item.fileSize / 1024).toFixed(1) 
        : '0.0'
    }));
    
    return { 
      success: true, 
      data: formatted 
    };
  } catch (err) {
    console.error('[getReportList] 错误:', err);
    return { success: false, error: err.message };
  }
};