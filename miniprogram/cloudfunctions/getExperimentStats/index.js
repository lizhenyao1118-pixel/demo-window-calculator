const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// Layer1 实验配置（6桶）：
// 0: Variant A - 标准标题(top)
// 1: Variant B - 强调标题(top)
// 2: Variant C - 疑问标题(middle)
// 3: Variant D - 数据标题(middle)
// 4: Variant E - 社交标题(bottom)
// 5: Variant F - 限时标题(bottom)
// 事件：ab_exposure

exports.main = async (event, context) => {
  const db = cloud.database();
  const $ = db.command.aggregate;

  try {
    const matchStage = { event_type: 'ab_exposure' };

    const totalAgg = await db
      .collection('event_logs')
      .aggregate()
      .match(matchStage)
      .group({ _id: null, total: $.sum(1) })
      .end();

    const total = (totalAgg.list && totalAgg.list[0] && totalAgg.list[0].total) ? totalAgg.list[0].total : 0;

    const layer1Agg = await db
      .collection('event_logs')
      .aggregate()
      .match(matchStage)
      .group({ _id: '$layer1_bucket', count: $.sum(1) })
      .end();

    const layer2Agg = await db
      .collection('event_logs')
      .aggregate()
      .match(matchStage)
      .group({ _id: '$layer2_bucket', count: $.sum(1) })
      .end();

    const toCountMap = (list) => {
      const map = Object.create(null);
      (list || []).forEach((item) => {
        const key = item && item._id;
        const count = item && item.count;
        if (key === 0 || key === 1 || key === 2 || key === 3 || key === 4 || key === 5) map[key] = count || 0;
        if (key === '0' || key === '1' || key === '2' || key === '3' || key === '4' || key === '5') map[Number(key)] = count || 0;
      });
      return map;
    };

    const toBinaryCountMap = (list) => {
      const map = Object.create(null);
      (list || []).forEach((item) => {
        const key = item && item._id;
        const count = item && item.count;
        if (key === 0 || key === 1) map[key] = count || 0;
        if (key === '0' || key === '1') map[Number(key)] = count || 0;
      });
      return map;
    };

    const formatPercent = (count, denom) => {
      if (!denom) return '0.0%';
      return (count / denom * 100).toFixed(1) + '%';
    };

    const l1Map = toCountMap(layer1Agg.list);
    const l2Map = toBinaryCountMap(layer2Agg.list);

    const layer1Counts = [0, 1, 2, 3, 4, 5].map((bucket) => ({
      bucket,
      count: l1Map[bucket] || 0
    }));

    const layer2Counts = [0, 1].map((bucket) => ({
      bucket,
      count: l2Map[bucket] || 0
    }));

    const layer1Total = layer1Counts.reduce((sum, item) => sum + item.count, 0);
    const layer2Total = layer2Counts.reduce((sum, item) => sum + item.count, 0);

    const layer1_stats = layer1Counts.map(({ bucket, count }) => {
      return { bucket, count, percent: formatPercent(count, layer1Total || total) };
    });

    const layer2_stats = layer2Counts.map(({ bucket, count }) => {
      return { bucket, count, percent: formatPercent(count, layer2Total || total) };
    });

    return { layer1_stats, layer2_stats, total };
  } catch (err) {
    return { success: false, error: err && err.message ? err.message : String(err) };
  }
};
