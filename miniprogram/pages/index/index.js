Page({
  data: {
    // 新增：同一个二维码File ID
    qrImageUrl: 'cloud://cloud1-7grn8mcy176fcc2b.636c-cloud1-7grn8mcy176fcc2b-1407149429/qr-code/lisir-wechat.jpg'
  },

  onLoad() {
    // 检查是否有未完成的草稿
    const draft = wx.getStorageSync('survey_draft_v1');
    if (draft && (Date.now() - draft.timestamp < 7 * 24 * 3600 * 1000)) {
      wx.showModal({
        title: '发现未完成的测评',
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
  },

  startAssessment() {
    wx.navigateTo({
      url: '/pages/survey/survey'
    });
  },

  viewHistory() {
    wx.navigateTo({
      url: '/pages/history/history'
    });
  },

  showExpertQR() {
    wx.previewImage({
      current: this.data.qrImageUrl,
      urls: [this.data.qrImageUrl],
      success: () => {
        console.log('首页L2转化：用户查看二维码');
      }
    });
  }
});