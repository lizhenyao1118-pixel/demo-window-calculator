// 删除这行：const cloud = require('wx-server-sdk')
// 删除这行：cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const { city, floor, budget } = event
  
  // 参数校验
  if (!city || !floor || !budget) {
    return {
      code: -1,
      msg: '参数不完整'
    }
  }

  const floorNum = parseInt(floor)
  
  // 计算核心参数（纯计算，无需 SDK）
  const params = {
    P3: floorNum > 20 ? '5级（高风压）' : '3级（标准）',
    Rw: floorNum > 15 ? '38dB' : '35dB',
    K: city.includes('北') ? '1.6 W/(㎡·K)' : '2.0 W/(㎡·K)',
    SHGC: '0.4'
  }
  
  // 三档推荐方案
  const recommendations = [
    {
      level: '经济型',
      priceRange: '600-800元/㎡',
      config: '断桥铝60系列 + 双层中空玻璃',
      features: ['基础保温', '标准隔音'],
      suitable: '预算有限，基础需求'
    },
    {
      level: '标准型',
      priceRange: '800-1200元/㎡',
      config: '断桥铝70系列 + 三层中空玻璃',
      features: ['优秀保温', '良好隔音', '性价比高'],
      suitable: '大多数家庭首选'
    },
    {
      level: '旗舰型',
      priceRange: '1200-1800元/㎡',
      config: '系统窗80系列 + Low-E玻璃',
      features: ['顶级保温', '极致隔音', '智能选配'],
      suitable: '高端需求，追求品质'
    }
  ]
  
  // 针对用户的建议
  const suggestion = `根据您${city}${floorNum}楼的情况，建议重点关注${floorNum > 20 ? '抗风压性能' : '保温隔热'}。`

  return {
    code: 0,
    data: {
      city,
      floor: floorNum,
      budget,
      params,
      recommendations,
      suggestion
    }
  }
}