Page({
  data: {
    isDisclaimer: false,
    formData: {},
    timestamp: '',
    fileID: '', 
    qrImageUrl: '', // 空字符串，等待转换
    // 原始File ID保留用于调试
    qrFileID: 'cloud://cloud1-7grn8mcy176fcc2b.636c-cloud1-7grn8mcy176fcc2b-1407149429/qr-code/lisir-wechat.jpg',
    layer1Bucket: 0,
    layer2Bucket: 0,
    progressStyle: 'classic',
    expTitle: '标准标题',
    expPosition: 'top',
    expVariant: 'A',
    experimentConfig: [
      { variant: 'A', title: '标准标题', position: 'top' },
      { variant: 'B', title: '强调标题', position: 'top' },
      { variant: 'C', title: '疑问标题', position: 'middle' },
      { variant: 'D', title: '数据标题', position: 'middle' },
      { variant: 'E', title: '社交标题', position: 'bottom' },
      { variant: 'F', title: '限时标题', position: 'bottom' }
    ]
  },

  onLoad(options) {
    // 解析参数
    const isDisclaimer = options.type === 'disclaimer' || options.disclaimer === 'true';
    const formData = wx.getStorageSync('survey_draft_v1')?.data || {};
    
    this.setData({
      isDisclaimer: isDisclaimer,
      formData: formData,
      timestamp: this.formatTime(new Date())
    });

    if (options.fileID) {
      this.setData({ fileID: options.fileID });
    }
    // 关键：转换File ID为临时HTTPS链接
    this.getQRCodeUrl();

    try {
      const app = getApp();
      const groups =
        (app && app.globalData && (app.globalData.abTestGroups || app.globalData.abGroups)) ||
        wx.getStorageSync('ab_test_groups') ||
        {};

      const layer1Raw = groups.layer1_bucket;
      const layer2Raw = groups.layer2_bucket;

      const layer1Bucket = Number.isFinite(Number(layer1Raw)) ? Number(layer1Raw) : 0;
      const layer2Bucket = Number.isFinite(Number(layer2Raw)) ? Number(layer2Raw) : 0;

      const safeLayer1 = layer1Bucket >= 0 && layer1Bucket <= 5 ? layer1Bucket : 0;
      const safeLayer2 = layer2Bucket === 1 ? 1 : 0;

      const cfg = this.data.experimentConfig[safeLayer1] || this.data.experimentConfig[0];
      const progressStyle = safeLayer2 === 1 ? 'gradient' : 'classic';

      this.setData({
        layer1Bucket: safeLayer1,
        layer2Bucket: safeLayer2,
        progressStyle,
        expTitle: cfg.title,
        expPosition: cfg.position,
        expVariant: cfg.variant
      });

      const userId = wx.getStorageSync('openid') || 'unknown';
      wx.cloud
        .callFunction({
          name: 'trackEvent',
          data: {
            event_type: 'result_page_expose',
            user_id: userId,
            props: {
              layer1_bucket: safeLayer1,
              layer2_bucket: safeLayer2,
              variant: cfg.variant
            }
          }
        })
        .catch((err) => console.error('[trackEvent] result_page_expose failed:', err));
    } catch (err) {
      console.error('[AB] init failed:', err);
    }
  },
  // 新增：获取二维码临时URL
  getQRCodeUrl() {
    wx.cloud.getTempFileURL({
      fileList: [this.data.qrFileID],
      success: res => {
        if (res.fileList && res.fileList[0] && res.fileList[0].tempFileURL) {
          this.setData({
            qrImageUrl: res.fileList[0].tempFileURL
          });
          console.log('二维码URL获取成功:', res.fileList[0].tempFileURL);
        } else {
          console.error('获取二维码URL失败:', res);
          // 备用：尝试直接使用File ID（部分基础库支持）
          this.setData({ qrImageUrl: this.data.qrFileID });
        }
      },
      fail: err => {
        console.error('获取二维码URL错误:', err);
        // 备用方案
        this.setData({ qrImageUrl: this.data.qrFileID });
      }
    });
  },

  showQRCode() {
    const qrUrl = this.data.qrImageUrl;
    
    if (!qrUrl) {
      wx.showToast({
        title: '图片加载中，请稍后再试',
        icon: 'none'
      });
      return;
    }

    wx.previewImage({
      current: qrUrl,
      urls: [qrUrl],
      success: () => {
        console.log('L2转化：用户查看微信二维码');
        // 可在此埋点统计转化率
        this.trackConversion('qrcode_view');
      },
      fail: (err) => {
        console.error('预览二维码失败：', err);
        wx.showToast({
          title: '图片加载失败',
          content: '可能是网络问题，请重试或联系客服',
          showCancel: false
        });
      }
    });
  },

  // 新增：转化追踪
  trackConversion(type) {
    // 未来可接入正式埋点
    console.log(`[Analytics] ${type} at ${new Date().toISOString()}`);
  },

  // 下载PDF
  downloadPDF() {
    if (!this.data.fileID) {
      wx.showToast({ title: '文件生成中，请稍后再试', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '下载中...' });
    
    wx.cloud.downloadFile({
      fileID: this.data.fileID,
      success: res => {
        wx.hideLoading();
        // 保存到本地
        wx.saveFile({
          tempFilePath: res.tempFilePath,
          success: saved => {
            wx.showModal({
              title: '下载成功',
              content: '文件已保存到本地，请在微信"文件"中查看',
              showCancel: false
            });
          }
        });
      },
      fail: err => {
        wx.hideLoading();
        wx.showToast({ title: '下载失败', icon: 'none' });
        console.error(err);
      }
    });
  },

  // 在线预览（临时文件）
  previewPDF() {
    if (!this.data.fileID) {
      wx.showToast({ title: '文件生成中', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '加载中...' });
    
    wx.cloud.downloadFile({
      fileID: this.data.fileID,
      success: res => {
        wx.hideLoading();
        wx.openDocument({
          filePath: res.tempFilePath,
          fileType: 'pdf',
          success: () => console.log('打开文档成功')
        });
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '预览失败', icon: 'none' });
      }
    });
  },

  // 客服会话回调（L2转化追踪）
  onContact(e) {
    console.log('L2入口点击：', e.detail);
    // 可在此处上报分析数据
    wx.showToast({ title: '正在跳转客服...', icon: 'none' });
  },

  // 重新开始
  restart() {
    wx.removeStorageSync('survey_draft_v1');
    wx.redirectTo({ url: '/pages/index/index' });
  },

  formatTime(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }
});
