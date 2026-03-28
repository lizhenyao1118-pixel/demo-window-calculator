Page({
  data: {
    arbitrator: null,
    paramCards: [],
    reverseMappings: [],
    riskLevel: '',
    riskReason: '',
    riskClass: '',
    isVerificationPhase: true,
  },

  onLoad(options) {
    const arbitrator = wx.getStorageSync('arbitrator');
    if (!arbitrator) {
      console.warn('[ResultSummary] 未找到 arbitrator 数据');
      return;
    }

    const paramCards = this._buildParamCards(arbitrator.params || {});
    const reverseMappings = this.buildReverseMappings(arbitrator);
    const riskClassMap = { '高': 'high', '中': 'medium', '低': 'low' };
    const riskClass = riskClassMap[arbitrator.riskLevel] || 'low';

    this.setData({
      arbitrator,
      paramCards,
      reverseMappings,
      riskLevel: arbitrator.riskLevel || '',
      riskReason: arbitrator.riskReason || '',
      riskClass,
    });
  },

  _buildParamCards(params) {
    return [
      { label: 'K值', value: params.K != null ? params.K : '—', unit: 'W/(m²·K)', prefix: '≤', colorClass: 'c-blue' },
      { label: 'Rw值', value: params.Rw != null ? params.Rw : '—', unit: 'dB', prefix: '≥', colorClass: 'c-green' },
      { label: 'SHGC', value: params.SHGC != null ? params.SHGC : '—', unit: '', prefix: '≤', colorClass: 'c-amber' },
      { label: '气密', value: params.airtight != null ? params.airtight : '—', unit: '级', prefix: '', colorClass: 'c-purple' },
      { label: '安全', value: params.safety != null ? params.safety : '常规', unit: '', prefix: '', colorClass: 'c-pink' },
    ];
  },

  buildReverseMappings(arbitrator) {
    if (!arbitrator || !Array.isArray(arbitrator.sections)) return [];
    const severityOrder = { error: 0, warning: 1, info: 2 };
    const sorted = [...arbitrator.sections]
      .sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3));
    return sorted.slice(0, 3).map((item, index) => ({
      ...item,
      title: item.reason,
      description: item.action,
      mappingType: index < 2 ? 'data' : 'action',
    }));
  },

  onGeneratePDF() {
    const { isVerificationPhase } = this.data;
    if (isVerificationPhase) {
      this._doGenerate();
    } else {
      wx.requestPayment({
        success: () => this._doGenerate(),
        fail(err) {
          console.error('[ResultSummary] 支付失败：', err);
          wx.showToast({ title: '支付失败，请重试', icon: 'none' });
        },
      });
    }
  },

  _doGenerate() {
    const formData = wx.getStorageSync('generatePayload') || {};
    wx.showLoading({ title: '生成中...' });
    wx.cloud.callFunction({
      name: 'generateReport',
      data: { assessmentData: formData },
      success: (res) => {
        wx.hideLoading();
        if (res.result && res.result.success) {
          const fileID = res.result.fileID;
          wx.setStorageSync('last_pdf_fileid', fileID);
          wx.navigateTo({ url: `/pages/result/result?fileID=${fileID}` });
        } else {
          wx.showToast({ title: (res.result && res.result.error) || '生成失败，请重试', icon: 'none' });
        }
      },
      fail(err) {
        wx.hideLoading();
        console.error('[ResultSummary] 云函数调用失败：', err);
        wx.showToast({ title: '网络错误，请重试', icon: 'none' });
      },
    });
  },
});
