module.exports = (function() {
var __MODS__ = {};
var __DEFINE__ = function(modId, func, req) { var m = { exports: {}, _tempexports: {} }; __MODS__[modId] = { status: 0, func: func, req: req, m: m }; };
var __REQUIRE__ = function(modId, source) { if(!__MODS__[modId]) return require(source); if(!__MODS__[modId].status) { var m = __MODS__[modId].m; m._exports = m._tempexports; var desp = Object.getOwnPropertyDescriptor(m, "exports"); if (desp && desp.configurable) Object.defineProperty(m, "exports", { set: function (val) { if(typeof val === "object" && val !== m._exports) { m._exports.__proto__ = val.__proto__; Object.keys(val).forEach(function (k) { m._exports[k] = val[k]; }); } m._tempexports = val }, get: function () { return m._tempexports; } }); __MODS__[modId].status = 1; __MODS__[modId].func(__MODS__[modId].req, m, m.exports); } return __MODS__[modId].m.exports; };
var __REQUIRE_WILDCARD__ = function(obj) { if(obj && obj.__esModule) { return obj; } else { var newObj = {}; if(obj != null) { for(var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) newObj[k] = obj[k]; } } newObj.default = obj; return newObj; } };
var __REQUIRE_DEFAULT__ = function(obj) { return obj && obj.__esModule ? obj.default : obj; };
__DEFINE__(1773630659943, function(require, module, exports) {


var GetIntrinsic = require('get-intrinsic');
var callBound = require('call-bound');

var $WeakSet = GetIntrinsic('%WeakSet%', true);

/** @type {undefined | (<V>(thisArg: Set<V>, value: V) => boolean)} */
var $setHas = callBound('WeakSet.prototype.has', true);

if ($setHas) {
	/** @type {undefined | (<K extends object, V>(thisArg: WeakMap<K, V>, key: K) => boolean)} */
	var $mapHas = callBound('WeakMap.prototype.has', true);

	/** @type {import('.')} */
	module.exports = function isWeakSet(x) {
		if (!x || typeof x !== 'object') {
			return false;
		}
		try {
			// @ts-expect-error TS can't figure out that $setHas is always truthy here
			$setHas(x, $setHas);
			if ($mapHas) {
				try {
					// @ts-expect-error this indeed might not be a weak collection
					$mapHas(x, $mapHas);
				} catch (e) {
					return true;
				}
			}
			// @ts-expect-error TS can't figure out that $WeakSet is always truthy here
			return x instanceof $WeakSet; // core-js workaround, pre-v3
		} catch (e) {}
		return false;
	};
} else {
	/** @type {import('.')} */
	// @ts-expect-error
	module.exports = function isWeakSet(x) { // eslint-disable-line no-unused-vars
		// `WeakSet` does not exist, or does not have a `has` method
		return false;
	};
}

}, function(modId) {var map = {}; return __REQUIRE__(map[modId], modId); })
return __REQUIRE__(1773630659943);
})()
//miniprogram-npm-outsideDeps=["get-intrinsic","call-bound"]
//# sourceMappingURL=index.js.map