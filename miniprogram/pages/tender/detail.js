Page({
  data:{loading:true,error:null,tenderId:null,status:null,snapshot:{},responses:[]},
  onLoad(options){
    const tenderId=options&&options.tenderId
    if(!tenderId){this.setData({error:'参数错误',loading:false});return}
    this.setData({tenderId})
    this.loadDetail(tenderId)
  },
  async loadDetail(tenderId){
    this.setData({loading:true,error:null})
    try{
      const {result}=await wx.cloud.callFunction({name:'getVendorResponses',data:{tenderId}})
      if(!result||result.error){this.setData({error:result&&result.error||'加载失败',loading:false});return}
      this.setData({status:result.tenderStatus,snapshot:result.reportSnapshot||{},responses:result.responses||[],loading:false})
    }catch(e){this.setData({error:'网络错误',loading:false})}
  },
  isHit(id, hits){return Array.isArray(hits)&&hits.includes(id)},
  formatTime(t){try{const d=new Date(t);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`}catch(e){return ''}}
})
