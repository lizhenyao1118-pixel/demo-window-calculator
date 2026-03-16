module.exports = (function() {
var __MODS__ = {};
var __DEFINE__ = function(modId, func, req) { var m = { exports: {}, _tempexports: {} }; __MODS__[modId] = { status: 0, func: func, req: req, m: m }; };
var __REQUIRE__ = function(modId, source) { if(!__MODS__[modId]) return require(source); if(!__MODS__[modId].status) { var m = __MODS__[modId].m; m._exports = m._tempexports; var desp = Object.getOwnPropertyDescriptor(m, "exports"); if (desp && desp.configurable) Object.defineProperty(m, "exports", { set: function (val) { if(typeof val === "object" && val !== m._exports) { m._exports.__proto__ = val.__proto__; Object.keys(val).forEach(function (k) { m._exports[k] = val[k]; }); } m._tempexports = val }, get: function () { return m._tempexports; } }); __MODS__[modId].status = 1; __MODS__[modId].func(__MODS__[modId].req, m, m.exports); } return __MODS__[modId].m.exports; };
var __REQUIRE_WILDCARD__ = function(obj) { if(obj && obj.__esModule) { return obj; } else { var newObj = {}; if(obj != null) { for(var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) newObj[k] = obj[k]; } } newObj.default = obj; return newObj; } };
var __REQUIRE_DEFAULT__ = function(obj) { return obj && obj.__esModule ? obj.default : obj; };
__DEFINE__(1773630659937, function(require, module, exports) {


var callBound = require('call-bound');

/** @type {undefined | ((thisArg: SharedArrayBuffer) => number)} */
var $byteLength = callBound('SharedArrayBuffer.prototype.byteLength', true);

/** @type {import('.')} */
module.exports = $byteLength
	? function isSharedArrayBuffer(obj) {
		if (!obj || typeof obj !== 'object') {
			return false;
		}
		try {
			// @ts-expect-error TS can't figure out this closed-over variable is non-nullable, and it's fine that `obj` might not be a SAB
			$byteLength(obj);
			return true;
		} catch (e) {
			return false;
		}
	}
	: function isSharedArrayBuffer(_obj) { // eslint-disable-line no-unused-vars
		return false;
	};

}, function(modId) {var map = {}; return __REQUIRE__(map[modId], modId); })
return __REQUIRE__(1773630659937);
})()
//miniprogram-npm-outsideDeps=["call-bound"]
//# sourceMappingURL=index.js.map