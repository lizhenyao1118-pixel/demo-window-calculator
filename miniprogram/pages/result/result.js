Page({
  data: {
    isDisclaimer: false,
    formData: {},
    timestamp: '',
    fileID: '',
    qrImageUrl: '',
    qrFileID: 'cloud://cloud1-7grn8mcy176fcc2b.636c-cloud1-7grn8mcy176fcc2b-1407149429/qr-code/lisir-wechat.jpg',
    layer1Bucket: 0,
    layer2Bucket: 0,
    progressStyle: 'classic',
    expTitle: '标准标题',
    expPosition: 'top',
    expVariant: 'A',
    cover: {},
    chapter1: {},
    chapter2: {},
    chapter3: {},
    chapter4: {},
    summary: {},
    isPaid: false,
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
    // 原生渲染：从 globalData 读取 snapshot，带 Storage 降级
    const app = getApp();
    const snapshot = app.globalData.currentReport
      || wx.getStorageSync('report_snapshot');
    const summary = (snapshot && snapshot.summary)
      || app.globalData.reportSummary
      || wx.getStorageSync('report_summary')
      || {};
    const savedPaid = wx.getStorageSync('report_paid') || false;

    if (snapshot) {
      this.setData({
        cover:    snapshot.cover    || {},
        chapter1: snapshot.chapter1 || {},
        chapter2: snapshot.chapter2 || {},
        chapter3: snapshot.chapter3 || {},
        chapter4: snapshot.chapter4 || {},
        summary:  summary,
        isPaid:   savedPaid
      });
    }

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

    // 转换 File ID 为临时 HTTPS 链接
    this.getQRCodeUrl();

    // AB 测试初始化
    try {
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

  onUnlock() {
    this.setData({ isPaid: true });
    wx.setStorageSync('report_paid', true);
  },

  getQRCodeUrl() {
    wx.cloud.getTempFileURL({
      fileList: [this.data.qrFileID],
      success: res => {
        if (res.fileList && res.fileList[0] && res.fileList[0].tempFileURL) {
          this.setData({ qrImageUrl: res.fileList[0].tempFileURL });
          console.log('二维码URL获取成功:', res.fileList[0].tempFileURL);
        } else {
          console.error('获取二维码URL失败:', res);
          this.setData({ qrImageUrl: this.data.qrFileID });
        }
      },
      fail: err => {
        console.error('获取二维码URL错误:', err);
        this.setData({ qrImageUrl: this.data.qrFileID });
      }
    });
  },

  showQRCode() {
    const qrUrl = this.data.qrImageUrl;
    if (!qrUrl) {
      wx.showToast({ title: '图片加载中，请稍后再试', icon: 'none' });
      return;
    }
    wx.previewImage({
      current: qrUrl,
      urls: [qrUrl],
      success: () => {
        console.log('L2转化：用户查看微信二维码');
        this.trackConversion('qrcode_view');
      },
      fail: (err) => {
        console.error('预览二维码失败：', err);
        wx.showToast({ title: '图片加载失败', icon: 'none' });
      }
    });
  },

  trackConversion(type) {
    console.log(`[Analytics] ${type} at ${new Date().toISOString()}`);
  },

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
        wx.saveFile({
          tempFilePath: res.tempFilePath,
          success: () => {
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

  onContact(e) {
    console.log('L2入口点击：', e.detail);
    wx.showToast({ title: '正在跳转客服...', icon: 'none' });
  },

  restart() {
    wx.removeStorageSync('survey_draft_v1');
    wx.redirectTo({ url: '/pages/index/index' });
  },

  formatTime(date) {
    const year  = date.getFullYear();
    const month  = (date.getMonth() + 1).toString().padStart(2, '0');
    const day    = date.getDate().toString().padStart(2, '0');
    const hour   = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }
});
