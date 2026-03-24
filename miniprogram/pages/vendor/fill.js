function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

Page({
  data: {
    loading: true,
    error: null,
    tenderId: null,
    reportSnapshot: null,
    vendorInfo: { brandName: '', contactName: '', contactPhone: '' },
    answers: [],
    canSubmit: false,
    savingDraft: false,
    lastSaveTime: null
  },

  onLoad(options) {
    let tenderId = options && options.tenderId;
    if (!tenderId && options && options.scene) {
      const scene = decodeURIComponent(options.scene);
      if (scene.includes('=')) {
        const parts = scene.split('=');
        tenderId = parts[1] || null;
      } else {
        tenderId = scene;
      }
    }

    if (!tenderId) {
      this.setData({ error: '无效的招标链接', loading: false });
      return;
    }

    this.loadTender(tenderId);
  },

  onShow() {
    if (this._autoSaveTimer) return;
    this._autoSaveTimer = setInterval(() => {
      this.saveDraft();
    }, 30000);
  },

  onHide() {
    this.saveDraft();
  },

  onUnload() {
    if (this._autoSaveTimer) {
      clearInterval(this._autoSaveTimer);
      this._autoSaveTimer = null;
    }
  },

  async loadTender(tenderId) {
    this.setData({ loading: true, error: null, tenderId });
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getTenderForVendor',
        data: { tenderId }
      });

      if (!result || result.error) {
        this.setData({ error: (result && result.message) || '招标信息加载失败', loading: false });
        return;
      }

      const { reportSnapshot, existingDraft } = result;
      const initialAnswers = this.initializeAnswers(reportSnapshot);

      if (existingDraft) {
        wx.showModal({
          title: '发现未提交草稿',
          content: '是否恢复上次填写进度？',
          success: (res) => {
            const vendorInfo = existingDraft.vendorInfo || this.data.vendorInfo;
            if (res.confirm) {
              const mergedAnswers = this.mergeAnswers(initialAnswers, existingDraft.answers || []);
              this.setData({ tenderId, reportSnapshot, vendorInfo, answers: mergedAnswers, loading: false }, this.validateForm);
              return;
            }
            this.setData({ tenderId, reportSnapshot, vendorInfo, answers: initialAnswers, loading: false }, this.validateForm);
          }
        });
        return;
      }

      this.setData({ tenderId, reportSnapshot, answers: initialAnswers, loading: false }, this.validateForm);
    } catch (err) {
      this.setData({ error: '网络错误，请重试', loading: false });
    }
  },

  initializeAnswers(snapshot) {
    const answers = [];
    const redlines = (snapshot && snapshot.redlines) ? snapshot.redlines : [];
    redlines.forEach((r) => {
      answers.push({
        displayId: r.displayId,
        type: 'redline',
        text: r.text,
        softened: !!r.softened,
        checkValue: false,
        note: ''
      });
    });
    const acceptanceItems = (snapshot && snapshot.acceptanceItems) ? snapshot.acceptanceItems : [];
    acceptanceItems.forEach((a) => {
      answers.push({
        displayId: String(a.displayId || a.id),
        type: 'acceptance',
        text: a.text,
        checkValue: false,
        note: ''
      });
    });
    return answers;
  },

  mergeAnswers(initial, draftAnswers) {
    const draftMap = new Map((Array.isArray(draftAnswers) ? draftAnswers : []).map(a => [String(a.displayId), a]));
    return (Array.isArray(initial) ? initial : []).map((item) => {
      const d = draftMap.get(String(item.displayId));
      if (!d) return item;
      return { ...item, checkValue: !!d.checkValue, note: d.note || '' };
    });
  },

  onVendorInfoChange(e) {
    const field = e && e.currentTarget && e.currentTarget.dataset ? e.currentTarget.dataset.field : null;
    if (!field) return;
    this.setData({ [`vendorInfo.${field}`]: e.detail.value }, () => {
      this.validateForm();
      this.debouncedSaveDraft();
    });
  },

  onCheckChange(e) {
    const id = e && e.currentTarget && e.currentTarget.dataset ? e.currentTarget.dataset.id : null;
    const checked = e && e.detail ? !!e.detail.value : false;
    if (!id) return;

    const answers = this.data.answers.map((a) => {
      if (String(a.displayId) === String(id)) return { ...a, checkValue: checked };
      return a;
    });
    this.setData({ answers }, () => {
      this.validateForm();
      this.debouncedSaveDraft();
    });
  },

  onNoteChange(e) {
    const id = e && e.currentTarget && e.currentTarget.dataset ? e.currentTarget.dataset.id : null;
    if (!id) return;
    const note = e.detail.value;
    const answers = this.data.answers.map((a) => {
      if (String(a.displayId) === String(id)) return { ...a, note };
      return a;
    });
    this.setData({ answers }, () => {
      this.validateForm();
      this.debouncedSaveDraft();
    });
  },

  validateForm() {
    const { answers, vendorInfo } = this.data;
    const hasVendorInfo = !!(vendorInfo.brandName && vendorInfo.contactName && /^1[3-9]\d{9}$/.test(vendorInfo.contactPhone));

    let canSubmit = hasVendorInfo;
    const redlines = answers.filter(a => a.type === 'redline');
    for (const r of redlines) {
      if (!r.checkValue) {
        if (!r.softened) {
          canSubmit = false;
          break;
        }
        if (!r.note || String(r.note).trim() === '') canSubmit = false;
      }
    }

    this.setData({ canSubmit });
    return canSubmit;
  },

  debouncedSaveDraft: debounce(function () {
    this.saveDraft();
  }, 3000),

  async saveDraft() {
    if (this.data.savingDraft) return;
    if (!this.data.tenderId) return;
    if (!this.data.reportSnapshot) return;

    this.setData({ savingDraft: true });
    try {
      await wx.cloud.callFunction({
        name: 'saveDraft',
        data: {
          tenderId: this.data.tenderId,
          vendorInfo: this.data.vendorInfo,
          answers: this.data.answers
        }
      });
      this.setData({ lastSaveTime: new Date().toLocaleTimeString() });
    } catch (e) {
    } finally {
      this.setData({ savingDraft: false });
    }
  },

  onSubmit() {
    if (!this.data.canSubmit) {
      wx.showToast({ title: '请完善必填项', icon: 'none' });
      return;
    }

    wx.setStorageSync('vendor_submit_data', {
      tenderId: this.data.tenderId,
      vendorInfo: this.data.vendorInfo,
      answers: this.data.answers,
      reportSnapshot: this.data.reportSnapshot
    });

    wx.navigateTo({ url: '/pages/vendor/confirm' });
  },

  retry() {
    if (!this.data.tenderId) {
      this.setData({ error: '无效的招标链接', loading: false });
      return;
    }
    this.loadTender(this.data.tenderId);
  }
});
