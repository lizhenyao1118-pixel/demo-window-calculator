Page({
  data:{loading:true,error:null,items:[]},
  onLoad(){this.loadTenders()},
  async loadTenders(){
    this.setData({loading:true,error:null})
    try{
      const {result}=await wx.cloud.callFunction({name:'getTenderList',data:{}})
      if(!result||result.error){this.setData({error:'加载失败',loading:false});return}
      this.setData({items:result.items||[],loading:false})
    }catch(e){this.setData({error:'网络错误',loading:false})}
  },
  goDetail(e){
    const id=e.currentTarget.dataset.id
    wx.navigateTo({url:`/pages/tender/detail?tenderId=${id}`})
  }
})
