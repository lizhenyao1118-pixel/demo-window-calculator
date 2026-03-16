const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();
  
  try {
    const toSafeString = (value, fallback) => {
      if (value === undefined || value === null) return fallback;
      if (typeof value === 'string') return value;
      try {
        return String(value);
      } catch (e) {
        return fallback;
      }
    };

    const safeEvent = event || {};
    const rawEventType = safeEvent.event_type || safeEvent.name || 'unknown';
    const rawUserId = safeEvent.user_id || safeEvent.userid || safeEvent.userId || 'anonymous';

    const safeEventType = toSafeString(rawEventType, 'unknown').slice(0, 50);
    const userId = toSafeString(rawUserId, 'anonymous').slice(0, 64);
    const openid = toSafeString(OPENID, '');

    const props = safeEvent.props ?? safeEvent.properties ?? {};
    let properties;
    try {
      properties = JSON.stringify(props || {});
    } catch (e) {
      properties = '{}';
    }

    let layer1Bucket = null;
    let layer2Bucket = null;
    if (props && typeof props === 'object') {
      const l1Raw = props.layer1_bucket ?? props.layer1Bucket;
      const l2Raw = props.layer2_bucket ?? props.layer2Bucket;

      const l1 = Number(l1Raw);
      const l2 = Number(l2Raw);

      if (Number.isFinite(l1) && l1 >= 0 && l1 <= 5) layer1Bucket = l1;
      if (Number.isFinite(l2) && (l2 === 0 || l2 === 1)) layer2Bucket = l2;
    }

    const sanitized = {
      event_type: safeEventType,
      user_id: userId,
      openid,
      layer1_bucket: layer1Bucket,
      layer2_bucket: layer2Bucket,
      event_name: safeEventType,
      properties: properties.slice(0, 256),
      user_hash: openid ? openid.slice(-8) : '',
      timestamp: db.serverDate(),
      ab_layer1: safeEvent.ab_layer1 !== undefined ? Number(safeEvent.ab_layer1) : null,
      ab_layer2: safeEvent.ab_layer2 !== undefined ? Number(safeEvent.ab_layer2) : null,
      app_version: safeEvent.app_version || '1.2.0'
    };

    const addRes = await db.collection('event_logs').add({ data: sanitized });
    return { success: true, id: addRes._id };
  } catch (err) {
    console.error('[trackEvent] ERROR:', err);
    return { success: false, error: err && err.message ? err.message : String(err) };
  }
};
