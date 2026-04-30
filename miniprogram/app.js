// app.js
App({
  onLaunch() {
    // 初始化云开发 - 必须最先执行
    wx.cloud.init({
      env: 'cloud1-7grn8mcy176fcc2b',  // 你的环境ID
      traceUser: true
    })
    console.log('云开发初始化完成')

    // 本地日志（可选）
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // ===== 新增：A/B测试与埋点初始化 =====
    this.initABTestAndTrack()
    // ===== 新增结束 =====

    // 隐私授权处理
    wx.onNeedPrivacyAuthorization(resolve => {
      wx.showModal({
        title: '隐私保护提示',
        content: '在使用本服务前，请阅读并同意《隐私政策》',
        confirmText: '同意',
        cancelText: '拒绝',
        success: (res) => {
          if (res.confirm) {
            resolve({ buttonId: 'agree-btn', event: 'agree' })
          } else {
            resolve({ buttonId: 'disagree-btn', event: 'disagree' })
          }
        }
      })
    })
  },

  // ===== 新增方法：A/B测试初始化（必须在获取openid后执行）=====
  async initABTestAndTrack() {
    try {
      // 1. 获取openid（必须先完成，分组依赖openid）
      const openid = await this.getOpenId()
      this.globalData.openid = openid
      
      // 2. A/B分组（分层互斥设计）
      let abGroups = wx.getStorageSync('ab_test_groups')
      
      // 检查是否需要重新分组（30天过期或不存在）
      const needsAssign = !abGroups || 
                         !abGroups.timestamp || 
                         (Date.now() - abGroups.timestamp > 30 * 24 * 3600 * 1000)
      
      if (needsAssign) {
        const { assignAllExperiments } = require('./utils/hash')
        const variants = assignAllExperiments(openid)
        
        abGroups = {
          ...variants,
          timestamp: Date.now(),
          version: 'v2' // 实验配置版本号
        }
        
        wx.setStorageSync('ab_test_groups', abGroups)
        console.log('[App] A/B分组完成:', abGroups)
      }
      
      this.globalData.abGroups = abGroups
      
      // 3. 曝光埋点（记录用户进入时的实验分组）
      const { track } = require('./utils/track')
      await track('ab_exposure', {
        layer1_bucket: abGroups.layer1_bucket,
        layer2_bucket: abGroups.layer2_bucket,
        exp1_copy: abGroups.exp1_copy,
        exp2_position: abGroups.exp2_position,
        exp3_progress: abGroups.exp3_progress
      })
      
    } catch (e) {
      console.error('[App] 初始化A/B测试失败:', e)
      // 失败时提供默认分组（不影响业务）
      this.globalData.abGroups = {
        exp1_copy: 'control',
        exp2_position: 'bottom',
        exp3_progress: 'progress_bar',
        layer1_bucket: 0,
        layer2_bucket: 0
      }
    }
  },

  // ===== 新增方法：获取openid =====
  async getOpenId() {
    const cached = wx.getStorageSync('openid')
    if (cached) return cached
    
    const res = await wx.cloud.callFunction({ name: 'getOpenId' })
    wx.setStorageSync('openid', res.result.openid)
    return res.result.openid
  },

  globalData: {
    userInfo: null,
    openid: null,      // 新增：用户openid
    abGroups: null     // 新增：A/B测试分组
  }
})