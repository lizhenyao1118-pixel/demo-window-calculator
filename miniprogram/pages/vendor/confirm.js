Page({
  data: {
    submitData: null,
    redlineHits: [],
    submitting: false
  },

  onLoad() {
    const data = wx.getStorageSync('vendor_submit_data');
    if (!data) {
      wx.redirectTo({ url: '/pages/vendor/fill' });
      return;
    }

    const redlineHits = (Array.isArray(data.answers) ? data.answers : [])
      .filter(a => a && a.type === 'redline' && a.checkValue === false)
      .map(a => ({ ...a }));

    this.setData({ submitData: data, redlineHits });
  },

  async onConfirm() {
    if (this.data.submitting) return;
    this.setData({ submitting: true });

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'submitVendorResponse',
        data: {
          tenderId: this.data.submitData.tenderId,
          vendorInfo: this.data.submitData.vendorInfo,
          answers: this.data.submitData.answers
        }
      });

      if (result && result.success) {
        wx.removeStorageSync('vendor_submit_data');
        wx.redirectTo({ url: '/pages/vendor/success' });
        return;
      }

      if (result && result.error === 'REDLINE_VIOLATION') {
        wx.showModal({
          title: '提交失败',
          content: `不可满足的红线要求：${result.redlineId}，请返回修改`,
          showCancel: false,
          success: () => wx.navigateBack()
        });
        return;
      }
      if (result && result.error === 'REASON_REQUIRED') {
        wx.showModal({
          title: '理由缺失',
          content: `条目 ${result.redlineId} 需要填写理由`,
          showCancel: false,
          success: () => wx.navigateBack()
        });
        return;
      }
      if (result && result.error === 'TENDER_CLOSED') {
        wx.showModal({
          title: '招标已关闭',
          content: '该招标已关闭，无法提交',
          showCancel: false,
          success: () => wx.redirectTo({ url: '/pages/vendor/fill' })
        });
        return;
      }
      if (result && result.error === 'ALREADY_SUBMITTED') {
        wx.showModal({
          title: '重复提交',
          content: '您已提交过该招标响应，无需重复提交',
          showCancel: false,
          success: () => wx.redirectTo({ url: '/pages/vendor/success' })
        });
        return;
      }

      wx.showToast({ title: (result && result.message) || '提交失败', icon: 'none' });
    } catch (err) {
      wx.showToast({ title: '网络错误', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  onBack() {
    wx.navigateBack();
  }
});
