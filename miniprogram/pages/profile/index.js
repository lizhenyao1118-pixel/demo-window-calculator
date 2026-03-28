Page({
  data: {
    menuList: [
      { id: 'guide',   label: '使用指南',   icon: '📖', ready: true  },
      { id: 'faq',     label: '常见问题',   icon: '❓', ready: true  },
      { id: 'about',   label: '关于我们',   icon: 'ℹ️', ready: true  },
      { id: 'info',    label: '我的信息',   icon: '👤', ready: false },
      { id: 'settings',label: '设置',       icon: '⚙️', ready: false },
      { id: 'share',   label: '发给商家报价', icon: '🔗', ready: true  },
    ]
  },

  onMenuTap(e) {
    const { id, ready } = e.currentTarget.dataset;
    if (!ready) {
      wx.showToast({ title: '即将上线', icon: 'none' });
      return;
    }
    if (id === 'share') {
      wx.showShareMenu({ withShareTicket: true });
      return;
    }
    wx.showToast({ title: '即将上线', icon: 'none' });
  },

  onShareAppMessage() {
    return {
      title: '门窗技术招标文件生成工具',
      path: '/pages/index/index'
    };
  }
});
