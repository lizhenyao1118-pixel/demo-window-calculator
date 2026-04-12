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
          wx.showToast({
            title: '生成失败',
            icon: 'error'
          });
          return;
        }

        // 写入 globalData
        const app = getApp();
        app.globalData.currentReport = res.result.snapshot;
        app.globalData.reportComputed = res.result.computed;

        // 新增：从云函数结果构建 arbitrator 对象
        const computed = res.result.computed || {};

        // 推导 riskLevel（从 risk_flags）
        const riskLevel = computed.risk_flags?.safety_budget_conflict ? '高'
                        : computed.risk_flags?.budget_conflict ? '中'
                        : '低';

        // 推导 riskReason（从 conflict_notes）
        const riskReason = (computed.conflict_notes || []).join(' / ') || '无风险';

        // 根据 payload 中的实际供暖类型动态生成 heating action
        const heatingType = payload.heatingType || payload.heating_type || '';
        const heatingAction =
          (heatingType === 'central' || heatingType === '集中供暖')
            ? '集中供暖区域，K值需满足当地节能标准'
          : (heatingType === 'self' || heatingType === '自采暖' || heatingType === '空调取暖')
            ? '自采暖房型，选择K值≤2.2，避免冬季结露'
          : '无供暖区域，重点关注隔热性能';

        // factor → action 映射表
        const factor_to_action = {
          'heating': heatingAction,
          'high_floor': '高楼层风压加严，气密性和隔音需提升',
          'typhoon': '台风区域，玻璃等级需加强',
          'coastal': '沿海盐雾环境，选用抗腐蚀材料',
          'shading': '夏季西晒无遮阳，SHGC需下调',
          'bigWindow': '落地窗/大面积玻璃，需符合安全玻璃强制要求'
        };

        // 构建 sections[]（从 corrections）with fallback
        const defaultSections = [
          { severity: 'info', reason: '参数已根据您的房屋条件针对性调整', action: '将此文件发给至少3家商家，用同一标准比价' },
          { severity: 'info', reason: '所在城市气候特征已纳入计算', action: '验收时逐项核对参数，避免商家偷换规格' },
          { severity: 'info', reason: '楼层风压影响已计入抗风压等级', action: '高层建议要求商家提供检测报告' }
        ];
        const rawSections = (computed.corrections || []).map(item => ({
          severity: item.value < 0 ? 'warning' : 'info',
          reason: item.label,
          action: factor_to_action[item.factor] || '根据您的房屋条件调整参数'
        }));
        const sections = [...rawSections];
        for (let i = rawSections.length; i < 3; i++) {
          sections.push(defaultSections[i]);
        }

        // 推导 safety 等级（从 safety_items）
        const safety = computed.hasSafetyClause && computed.safety_items?.some(s => s.includes('夹胶玻璃'))
                     ? '强制夹胶'
                     : '常规';

        // 构建完整 arbitrator 对象（7字段版本）
        const arbitrator = {
          params: {
            K: computed.K_target || 0,
            Rw: computed.Rw_required || 0,
            SHGC: computed.SHGC_target || 0,
            P3: computed.P3_required || 0,
            windZone: computed.wind_zone || '',
            airRec: computed.airRec || 4,
            waterRec: computed.waterRec || 3,
            safety: safety
          },
          riskLevel: riskLevel,
          riskReason: riskReason,
          sections: sections
        };

        // 存储 arbitrator 到本地
        wx.setStorageSync('arbitrator', arbitrator);

        // 存储 fileID（原有逻辑）
        wx.setStorageSync('last_pdf_fileid', res.result.fileID);

        // 导航到结果页
        wx.redirectTo({
          url: '/pages/result/result?fileID=' + res.result.fileID
        });
      },

      fail: (err) => {
        wx.showToast({
          title: '云函数调用失败',
          icon: 'error'
        });
      }
    });
  },

  showError(message) {
    wx.showModal({
      title: '生成失败',
      content: message,
      showCancel: false,
      success: () => {
        wx.navigateBack();
      }
    });
  }
});
