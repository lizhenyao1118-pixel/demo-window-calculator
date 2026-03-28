Page({
  data: {
    historyList: [], // 历史招标文件列表
    qrImageUrl: 'cloud://cloud1-7grn8mcy176fcc2b.636c-cloud1-7grn8mcy176fcc2b-1407149429/qr-code/lisir-wechat.jpg'
  },

  onLoad() {
    // 检查是否有未完成的草稿
    const draft = wx.getStorageSync('survey_draft_v1');
    if (draft && (Date.now() - draft.timestamp < 7 * 24 * 3600 * 1000)) {
      wx.showModal({
        title: '发现未完成的需求定制',
        content: '是否继续上次进度？',
        cancelText: '重新开始',
        confirmText: '继续',
        success: (res) => {
          if (res.confirm) {
            wx.redirectTo({
              url: '/pages/survey/survey'
            });
          }
        }
      });
    }

    // 加载历史招标文件
    this.loadHistory();
  },

  onShow() {
    // 每次显示页面时重新加载历史记录
    this.loadHistory();
  },

  // 加载历史招标文件
  loadHistory() {
    try {
      const history = wx.getStorageSync('tender_history') || [];

      // 只显示最近3条记录
      const recentHistory = history.slice(0, 3).map(item => ({
        id: item.tenderId || item.id,
        city: item.city || item.formData?.city || '未知城市',
        date: this.formatDate(item.createTime || item.createdAt || new Date())
      }));

      this.setData({
        historyList: recentHistory
      });
    } catch (e) {
      console.error('加载历史记录失败', e);
    }
  },

  // 格式化日期
  formatDate(timestamp) {
    if (!timestamp) return '未知日期';

    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (24 * 60 * 60 * 1000));

    if (diffDays === 0) {
      return '今天';
    } else if (diffDays === 1) {
      return '昨天';
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
  },

  // 开始定制门窗标准
  startAssessment() {
    wx.navigateTo({
      url: '/pages/survey/survey'
    });
  },

  // 查看历史招标文件
  viewReport(e) {
    const tenderId = e.currentTarget.dataset.id;
    if (tenderId) {
      wx.navigateTo({
        url: `/pages/tender/detail?tenderId=${tenderId}`
      });
    } else {
      wx.showToast({
        title: '招标文件不存在',
        icon: 'none'
      });
    }
  }
});
