module.exports = (function() {
var __MODS__ = {};
var __DEFINE__ = function(modId, func, req) { var m = { exports: {}, _tempexports: {} }; __MODS__[modId] = { status: 0, func: func, req: req, m: m }; };
var __REQUIRE__ = function(modId, source) { if(!__MODS__[modId]) return require(source); if(!__MODS__[modId].status) { var m = __MODS__[modId].m; m._exports = m._tempexports; var desp = Object.getOwnPropertyDescriptor(m, "exports"); if (desp && desp.configurable) Object.defineProperty(m, "exports", { set: function (val) { if(typeof val === "object" && val !== m._exports) { m._exports.__proto__ = val.__proto__; Object.keys(val).forEach(function (k) { m._exports[k] = val[k]; }); } m._tempexports = val }, get: function () { return m._tempexports; } }); __MODS__[modId].status = 1; __MODS__[modId].func(__MODS__[modId].req, m, m.exports); } return __MODS__[modId].m.exports; };
var __REQUIRE_WILDCARD__ = function(obj) { if(obj && obj.__esModule) { return obj; } else { var newObj = {}; if(obj != null) { for(var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) newObj[k] = obj[k]; } } newObj.default = obj; return newObj; } };
var __REQUIRE_DEFAULT__ = function(obj) { return obj && obj.__esModule ? obj.default : obj; };
__DEFINE__(1773630660154, function(require, module, exports) {


var SLOT = require('internal-slot');
var $SyntaxError = require('es-errors/syntax');

var $StopIteration = typeof StopIteration === 'object' ? StopIteration : null;

/** @type {import('.')} */
module.exports = function getStopIterationIterator(origIterator) {
	if (!$StopIteration) {
		throw new $SyntaxError('this environment lacks StopIteration');
	}

	SLOT.set(origIterator, '[[Done]]', false);

	/** @template T @typedef {T extends Iterator<infer U> ? U : never} IteratorType */
	/** @typedef {IteratorType<ReturnType<typeof getStopIterationIterator>>} T */
	var siIterator = {
		next: /** @type {() => IteratorResult<T>} */ function next() {
			// eslint-disable-next-line no-extra-parens
			var iterator = /** @type {typeof origIterator} */ (SLOT.get(this, '[[Iterator]]'));
			var done = !!SLOT.get(iterator, '[[Done]]');
			try {
				return {
					done: done,
					// eslint-disable-next-line no-extra-parens
					value: done ? void undefined : /** @type {T} */ (iterator.next())
				};
			} catch (e) {
				SLOT.set(iterator, '[[Done]]', true);
				if (e !== $StopIteration) {
					throw e;
				}
				return {
					done: true,
					value: void undefined
				};
			}
		}
	};

	SLOT.set(siIterator, '[[Iterator]]', origIterator);

	// @ts-expect-error TODO FIXME
	return siIterator;
};

}, function(modId) {var map = {}; return __REQUIRE__(map[modId], modId); })
return __REQUIRE__(1773630660154);
})()
//miniprogram-npm-outsideDeps=["internal-slot","es-errors/syntax"]
//# sourceMappingURL=index.js.map