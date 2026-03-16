Page({
  data: {
    cities: ['北京', '上海', '深圳', '广州'],
    budgets: ['5k以下', '5k-10k', '10k-20k', '20k+'],
    cityIndex: 0,
    budgetIndex: 1,
    floor: ''
  },

  onCityChange(e) {
    this.setData({ cityIndex: e.detail.value })
  },

  onBudgetChange(e) {
    this.setData({ budgetIndex: e.detail.value })
  },

  onFloorInput(e) {
    this.setData({ floor: e.detail.value })
  },

  submit() {
    const city = this.data.cities[this.data.cityIndex]
    const budget = this.data.budgets[this.data.budgetIndex]
    const floor = Number(this.data.floor || 0)

    wx.showLoading({ title: '计算中...' })  // 添加加载提示

    wx.cloud.callFunction({
      name: 'calculateWindow',
      data: { city, budget, floor }
    }).then(res => {
      wx.hideLoading()  // 隐藏加载

      console.log('云函数返回', res.result)  // 调试用

      if (res.result.code === 0) {
        // 关键：传递完整的计算结果数据
        wx.navigateTo({
          url: '/pages/result/result',
          success: function(page) {
            // 传递 res.result.data（包含 params 和 recommendations）
            page.eventChannel.emit('result', {
              code: 0,
              data: res.result.data
            })
          }
        })
      } else {
        wx.showToast({ title: '计算失败', icon: 'none' })
      }
    }).catch((err) => {
      wx.hideLoading()
      console.error('云函数调用失败', err)
      wx.showToast({ title: '计算失败', icon: 'none' })
    })
  }
})