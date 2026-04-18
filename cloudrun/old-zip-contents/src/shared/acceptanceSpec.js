const ACCEPTANCE_ITEMS_BASE = [
  { id: '1', text: '型材品牌、系列、壁厚与约定一致，提供合格证及质检报告' },
  { id: '2', text: '玻璃规格、中空层厚度、Low-E 位置与约定一致，3C 标识完整' },
  { id: '3', text: '五金配件型号与承载等级与约定一致，多点锁点完整咬合' },
  { id: '4', text: '胶条/毛条安装完整，无明显缺口；等压腔排水通畅' },
  { id: '5', text: '窗框与墙体连接：膨胀螺丝/化学锚栓间距合规，注胶饱满' },
  { id: '6', text: '开启扇四周缝隙均匀，闭合后无明显渗风渗水' },
  { id: '7', text: '玻璃压线/压条牢固，无松动、无外观缺陷' },
  { id: '8', text: '排水孔/导流槽无堵塞，模拟淋水后无积水' },
  { id: '9', text: '角码/组角工艺检查：注胶完整，无开裂' },
  { id: '10', text: '表面划痕/磕碰检查，重要部位有保护' },
  { id: '11', text: '每扇窗反复开合5-10次，胶条压实，无异响卡阻' }
];

const ACCEPTANCE_ITEMS_WINDOW = {
  casement: {
    '12': '外开窗确认防坠绳安装牢固，最大开启角度处限位器有效锁定',
    '13': '限位器开启角度≤100mm 或固定扇确保儿童无法整体开启；大面积玻璃确认夹胶构造'
  },
  sliding: {
    '12': '推拉扇限位块安装牢固，防止扇体脱轨飞出；滑轮推拉顺畅无卡阻，轨道水平度偏差≤2mm/m（高层必查）',
    '13': '儿童安全配件：推拉扇锁定装置安装牢固，锁定后扇体不可被儿童推开；大面积安全玻璃确认夹胶构造，碰撞后无脱落'
  },
  fixed: {
    '12': null,
    '13': '大面积安全玻璃确认夹胶构造，碰撞后无脱落；固定压条牢固无松动'
  },
  tilt_turn: {
    '12': '五金系统切换顺畅，防误操作器有效；关闭状态下锁点完整咬合',
    '13': '内倒开启角度限制功能正常，儿童可触及区域无尖锐角部'
  },
  door_window: {
    '12': '门扇与地面间隙符合设计要求（通常≤5mm），门框垂直度≤2mm/m',
    '13': '门扇限位器或地吸安装牢固，儿童可触及区域配置防夹手装置'
  }
};

function buildAcceptanceItems(windowType) {
  const base = ACCEPTANCE_ITEMS_BASE.map(x => ({ ...x }));
  const specific = ACCEPTANCE_ITEMS_WINDOW[windowType];
  if (!specific) return base;

  const setItem = (id, text) => {
    const idx = base.findIndex(i => i.id === id);
    if (idx >= 0) base[idx] = { id, text };
    else base.push({ id, text });
  };

  if (specific['12'] === null) {
    const idx = base.findIndex(i => i.id === '12');
    if (idx >= 0) base.splice(idx, 1);
  } else if (typeof specific['12'] === 'string') {
    setItem('12', specific['12']);
  }

  if (typeof specific['13'] === 'string') {
    setItem('13', specific['13']);
  }

  return base;
}

module.exports = {
  ACCEPTANCE_ITEMS_BASE,
  ACCEPTANCE_ITEMS_WINDOW,
  buildAcceptanceItems
};
