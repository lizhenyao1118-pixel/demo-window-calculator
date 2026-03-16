module.exports = (function() {
var __MODS__ = {};
var __DEFINE__ = function(modId, func, req) { var m = { exports: {}, _tempexports: {} }; __MODS__[modId] = { status: 0, func: func, req: req, m: m }; };
var __REQUIRE__ = function(modId, source) { if(!__MODS__[modId]) return require(source); if(!__MODS__[modId].status) { var m = __MODS__[modId].m; m._exports = m._tempexports; var desp = Object.getOwnPropertyDescriptor(m, "exports"); if (desp && desp.configurable) Object.defineProperty(m, "exports", { set: function (val) { if(typeof val === "object" && val !== m._exports) { m._exports.__proto__ = val.__proto__; Object.keys(val).forEach(function (k) { m._exports[k] = val[k]; }); } m._tempexports = val }, get: function () { return m._tempexports; } }); __MODS__[modId].status = 1; __MODS__[modId].func(__MODS__[modId].req, m, m.exports); } return __MODS__[modId].m.exports; };
var __REQUIRE_WILDCARD__ = function(obj) { if(obj && obj.__esModule) { return obj; } else { var newObj = {}; if(obj != null) { for(var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) newObj[k] = obj[k]; } } newObj.default = obj; return newObj; } };
var __REQUIRE_DEFAULT__ = function(obj) { return obj && obj.__esModule ? obj.default : obj; };
__DEFINE__(1773630659942, function(require, module, exports) {


var $WeakMap = typeof WeakMap === 'function' && WeakMap.prototype ? WeakMap : null;
var $WeakSet = typeof WeakSet === 'function' && WeakSet.prototype ? WeakSet : null;

var exported;

if (!$WeakMap) {
	/** @type {import('.')} */
	// eslint-disable-next-line no-unused-vars
	exported = function isWeakMap(x) {
		// `WeakMap` is not present in this environment.
		return false;
	};
}

var $mapHas = $WeakMap ? $WeakMap.prototype.has : null;
var $setHas = $WeakSet ? $WeakSet.prototype.has : null;
if (!exported && !$mapHas) {
	/** @type {import('.')} */
	// eslint-disable-next-line no-unused-vars
	exported = function isWeakMap(x) {
		// `WeakMap` does not have a `has` method
		return false;
	};
}

/** @type {import('.')} */
module.exports = exported || function isWeakMap(x) {
	if (!x || typeof x !== 'object') {
		return false;
	}
	try {
		$mapHas.call(x, $mapHas);
		if ($setHas) {
			try {
				$setHas.call(x, $setHas);
			} catch (e) {
				return true;
			}
		}
		// @ts-expect-error TS can't figure out that $WeakMap is always truthy here
		return x instanceof $WeakMap; // core-js workaround, pre-v3
	} catch (e) {}
	return false;
};

}, function(modId) {var map = {}; return __REQUIRE__(map[modId], modId); })
return __REQUIRE__(1773630659942);
})()
//miniprogram-npm-outsideDeps=[]
//# sourceMappingURL=index.js.map