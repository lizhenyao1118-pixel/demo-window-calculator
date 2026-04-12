// 引入埋点SDK
const { trackPDF } = require('../../utils/track');

Page({
  data: {
    payload: null,
    isDisclaimer: false
  },

  onLoad(options) {
    try {
      const payload = wx.getStorageSync('generatePayload') || {};
      const isDisclaimer = options.isDisclaimer === 'true';

      this.setData({
        payload: payload,
        isDisclaimer: isDisclaimer
      });

      this.callGenerateReport(payload, isDisclaimer);
    } catch (err) {
      console.error('[GenerateLoading] 参数解析失败：', err);
      wx.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 2000);
    }
  },

  callGenerateReport(payload, isDisclaimer) {
    const dataToSend = { assessmentData: JSON.parse(JSON.stringify(payload)) };

    wx.cloud.callFunction({
      name: 'generateReport',
      data: dataToSend,
      success: (res) => {
        if (!res.result.success) {
          wx.showToast({ title: '生成失败', icon: 'error' });
          return;
        }

        // 写入 globalData
        const app = getApp();
        app.globalData.currentReport  = res.result.snapshot;
        app.globalData.reportComputed = res.result.computed;
        app.globalData.reportSummary  = res.result.snapshot.summary || {};

        // Storage 持久化（降级路径：用户离开小程序后返回可恢复）
        wx.setStorageSync('report_snapshot', res.result.snapshot);
        wx.setStorageSync('report_summary',  res.result.snapshot.summary || {});
        wx.setStorageSync('report_paid',     false);

        // 存储 fileID
        wx.setStorageSync('last_pdf_fileid', res.result.fileID);

        // 导航到结果页
        wx.redirectTo({
          url: '/pages/result/result?fileID=' + res.result.fileID
        });
      },

      fail: (err) => {
        wx.showToast({ title: '云函数调用失败', icon: 'error' });
      }
    });
  },

  showError(message) {
    wx.showModal({
      title: '生成失败',
      content: message,
      showCancel: false,
      success: () => { wx.navigateBack(); }
    });
  }
});
