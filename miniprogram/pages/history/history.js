Page({
  data: {
    list: [],
    loading: false,
    errorMsg: ''
  },

  onLoad() {
    this.loadHistory();
  },

  onPullDownRefresh() {
    this.loadHistory().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadHistory() {
    this.setData({ loading: true, errorMsg: '' });
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'getReportList'
      });
      
      console.log('历史记录返回:', res.result);
      
      if (res.result && res.result.success) {
        this.setData({ 
          list: res.result.data || [],
          loading: false 
        });
        
        if (res.result.data.length === 0) {
          this.setData({ errorMsg: '暂无历史记录，快去生成第一份招标文件吧！' });
        }
      } else {
        throw new Error(res.result.error || '查询失败');
      }
    } catch (err) {
      console.error('加载历史失败:', err);
      this.setData({ 
        errorMsg: '加载失败：' + err.message,
        loading: false 
      });
    }
  },

  openReport(e) {
    const { fileid, risk } = e.currentTarget.dataset;
    
    wx.navigateTo({
      url: `/pages/result/result?type=${risk ? 'disclaimer' : 'normal'}&fileID=${fileid}`
    });
  },

  startNew() {
    wx.redirectTo({
      url: '/pages/survey/survey'
    });
  }
});