const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const db = cloud.database();
  const _ = db.command;
  
  // 计算30天前的时间戳
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  try {
    // 1. 查询30天前的记录
    const { data: oldRecords } = await db.collection('assessments')
      .where({
        createdAt: _.lt(thirtyDaysAgo)
      })
      .limit(100)  // 每次最多处理100条
      .get();
    
    console.log(`[Cleanup] 发现 ${oldRecords.length} 条过期记录`);
    
    if (oldRecords.length === 0) {
      return { success: true, message: '无需清理', deletedCount: 0 };
    }
    
    // 2. 删除云存储文件
    const fileIDs = oldRecords.map(r => r.fileID).filter(id => id);
    if (fileIDs.length > 0) {
      await cloud.deleteFile({ fileList: fileIDs });
      console.log(`[Cleanup] 已删除 ${fileIDs.length} 个云存储文件`);
    }
    
    // 3. 删除数据库记录（使用批量删除）
    const deletePromises = oldRecords.map(r => 
      db.collection('assessments').doc(r._id).remove()
    );
    await Promise.all(deletePromises);
    
    return { 
      success: true, 
      message: '清理完成',
      deletedCount: oldRecords.length,
      filesDeleted: fileIDs.length
    };
    
  } catch (err) {
    console.error('[Cleanup] 错误:', err);
    return { success: false, error: err.message };
  }
};