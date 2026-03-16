module.exports = (function() {
var __MODS__ = {};
var __DEFINE__ = function(modId, func, req) { var m = { exports: {}, _tempexports: {} }; __MODS__[modId] = { status: 0, func: func, req: req, m: m }; };
var __REQUIRE__ = function(modId, source) { if(!__MODS__[modId]) return require(source); if(!__MODS__[modId].status) { var m = __MODS__[modId].m; m._exports = m._tempexports; var desp = Object.getOwnPropertyDescriptor(m, "exports"); if (desp && desp.configurable) Object.defineProperty(m, "exports", { set: function (val) { if(typeof val === "object" && val !== m._exports) { m._exports.__proto__ = val.__proto__; Object.keys(val).forEach(function (k) { m._exports[k] = val[k]; }); } m._tempexports = val }, get: function () { return m._tempexports; } }); __MODS__[modId].status = 1; __MODS__[modId].func(__MODS__[modId].req, m, m.exports); } return __MODS__[modId].m.exports; };
var __REQUIRE_WILDCARD__ = function(obj) { if(obj && obj.__esModule) { return obj; } else { var newObj = {}; if(obj != null) { for(var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) newObj[k] = obj[k]; } } newObj.default = obj; return newObj; } };
var __REQUIRE_DEFAULT__ = function(obj) { return obj && obj.__esModule ? obj.default : obj; };
__DEFINE__(1773630660085, function(require, module, exports) {
exports.EncodeStream    = require('./src/EncodeStream');
exports.DecodeStream    = require('./src/DecodeStream');
exports.Array           = require('./src/Array');
exports.LazyArray       = require('./src/LazyArray');
exports.Bitfield        = require('./src/Bitfield');
exports.Boolean         = require('./src/Boolean');
exports.Buffer          = require('./src/Buffer');
exports.Enum            = require('./src/Enum');
exports.Optional        = require('./src/Optional');
exports.Reserved        = require('./src/Reserved');
exports.String          = require('./src/String');
exports.Struct          = require('./src/Struct');
exports.VersionedStruct = require('./src/VersionedStruct');

const utils             = require('./src/utils');
const NumberT           = require('./src/Number');
const Pointer           = require('./src/Pointer');

Object.assign(exports, utils, NumberT, Pointer);

}, function(modId) {var map = {"./src/EncodeStream":1773630660086,"./src/DecodeStream":1773630660087,"./src/Array":1773630660088,"./src/LazyArray":1773630660091,"./src/Bitfield":1773630660092,"./src/Boolean":1773630660093,"./src/Buffer":1773630660094,"./src/Enum":1773630660095,"./src/Optional":1773630660096,"./src/Reserved":1773630660097,"./src/String":1773630660098,"./src/Struct":1773630660099,"./src/VersionedStruct":1773630660100,"./src/utils":1773630660090,"./src/Number":1773630660089,"./src/Pointer":1773630660101}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1773630660086, function(require, module, exports) {
let iconv;
const stream = require('stream');
const DecodeStream = require('./DecodeStream');
try { iconv = require('iconv-lite'); } catch (error) {}

class EncodeStream extends stream.Readable {
  constructor(bufferSize =  65536) {
    super(...arguments);
    this.buffer = Buffer.alloc(bufferSize);
    this.bufferOffset = 0;
    this.pos = 0;
  }

  // do nothing, required by node
  _read() {}

  ensure(bytes) {
    if ((this.bufferOffset + bytes) > this.buffer.length) {
      return this.flush();
    }
  }

  flush() {
    if (this.bufferOffset > 0) {
      this.push(Buffer.from(this.buffer.slice(0, this.bufferOffset)));
      return this.bufferOffset = 0;
    }
  }

  writeBuffer(buffer) {
    this.flush();
    this.push(buffer);
    return this.pos += buffer.length;
  }

  writeString(string, encoding = 'ascii') {
    switch (encoding) {
      case 'utf16le': case 'ucs2': case 'utf8': case 'ascii':
        return this.writeBuffer(Buffer.from(string, encoding));

      case 'utf16be':
        var buf = Buffer.from(string, 'utf16le');

        // swap the bytes
        for (let i = 0, end = buf.length - 1; i < end; i += 2) {
          const byte = buf[i];
          buf[i] = buf[i + 1];
          buf[i + 1] = byte;
        }

        return this.writeBuffer(buf);

      default:
        if (iconv) {
          return this.writeBuffer(iconv.encode(string, encoding));
        } else {
          throw new Error('Install iconv-lite to enable additional string encodings.');
        }
    }
  }

  writeUInt24BE(val) {
    this.ensure(3);
    this.buffer[this.bufferOffset++] = (val >>> 16) & 0xff;
    this.buffer[this.bufferOffset++] = (val >>> 8)  & 0xff;
    this.buffer[this.bufferOffset++] = val & 0xff;
    return this.pos += 3;
  }

  writeUInt24LE(val) {
    this.ensure(3);
    this.buffer[this.bufferOffset++] = val & 0xff;
    this.buffer[this.bufferOffset++] = (val >>> 8) & 0xff;
    this.buffer[this.bufferOffset++] = (val >>> 16) & 0xff;
    return this.pos += 3;
  }

  writeInt24BE(val) {
    if (val >= 0) {
      return this.writeUInt24BE(val);
    } else {
      return this.writeUInt24BE(val + 0xffffff + 1);
    }
  }

  writeInt24LE(val) {
    if (val >= 0) {
      return this.writeUInt24LE(val);
    } else {
      return this.writeUInt24LE(val + 0xffffff + 1);
    }
  }

  fill(val, length) {
    if (length < this.buffer.length) {
      this.ensure(length);
      this.buffer.fill(val, this.bufferOffset, this.bufferOffset + length);
      this.bufferOffset += length;
      return this.pos += length;
    } else {
      const buf = Buffer.alloc(length);
      buf.fill(val);
      return this.writeBuffer(buf);
    }
  }

  end() {
    this.flush();
    return this.push(null);
  }
}

for (let key in Buffer.prototype) {
  if (key.slice(0, 5) === 'write') {
    const bytes = +DecodeStream.TYPES[key.replace(/write|[BL]E/g, '')];
    EncodeStream.prototype[key] = function(value) {
      this.ensure(bytes);
      this.buffer[key](value, this.bufferOffset);
      this.bufferOffset += bytes;
      return this.pos += bytes;
    };
  }
}

module.exports = EncodeStream;

}, function(modId) { var map = {"./DecodeStream":1773630660087}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1773630660087, function(require, module, exports) {
let iconv;
try { iconv = require('iconv-lite'); } catch (error) {}

class DecodeStream {
  constructor(buffer) {
    this.buffer = buffer;
    this.pos = 0;
    this.length = this.buffer.length;
  }

  readString(length, encoding = 'ascii') {
    switch (encoding) {
      case 'utf16le': case 'ucs2': case 'utf8': case 'ascii':
        return this.buffer.toString(encoding, this.pos, (this.pos += length));

      case 'utf16be':
        var buf = Buffer.from(this.readBuffer(length));

        // swap the bytes
        for (let i = 0, end = buf.length - 1; i < end; i += 2) {
          const byte = buf[i];
          buf[i] = buf[i + 1];
          buf[i + 1] = byte;
        }

        return buf.toString('utf16le');

      default:
        buf = this.readBuffer(length);
        if (iconv) {
          try {
            return iconv.decode(buf, encoding);
          } catch (error1) {}
        }

        return buf;
    }
  }

  readBuffer(length) {
    return this.buffer.slice(this.pos, (this.pos += length));
  }

  readUInt24BE() {
    return (this.readUInt16BE() << 8) + this.readUInt8();
  }

  readUInt24LE() {
    return this.readUInt16LE() + (this.readUInt8() << 16);
  }

  readInt24BE() {
    return (this.readInt16BE() << 8) + this.readUInt8();
  }

  readInt24LE() {
    return this.readUInt16LE() + (this.readInt8() << 16);
  }
}

DecodeStream.TYPES = {
  UInt8: 1,
  UInt16: 2,
  UInt24: 3,
  UInt32: 4,
  Int8: 1,
  Int16: 2,
  Int24: 3,
  Int32: 4,
  Float: 4,
  Double: 8
};

for (let key in Buffer.prototype) {
  if (key.slice(0, 4) === 'read') {
    const bytes = DecodeStream.TYPES[key.replace(/read|[BL]E/g, '')];
    DecodeStream.prototype[key] = function() {
      const ret = this.buffer[key](this.pos);
      this.pos += bytes;
      return ret;
    };
  }
}

module.exports = DecodeStream;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1773630660088, function(require, module, exports) {
const {Number:NumberT} = require('./Number');
const utils = require('./utils');

class ArrayT {
  constructor(type, length, lengthType = 'count') {
    this.type = type;
    this.length = length;
    this.lengthType = lengthType;
  }

  decode(stream, parent) {
    let length;
    const { pos } = stream;

    const res = [];
    let ctx = parent;

    if (this.length != null) {
      length = utils.resolveLength(this.length, stream, parent);
    }

    if (this.length instanceof NumberT) {
      // define hidden properties
      Object.defineProperties(res, {
        parent:         { value: parent },
        _startOffset:   { value: pos },
        _currentOffset: { value: 0, writable: true },
        _length:        { value: length }
      });

      ctx = res;
    }

    if ((length == null) || (this.lengthType === 'bytes')) {
      const target = (length != null) ?
        stream.pos + length
      : (parent != null ? parent._length : undefined) ?
        parent._startOffset + parent._length
      :
        stream.length;

      while (stream.pos < target) {
        res.push(this.type.decode(stream, ctx));
      }

    } else {
      for (let i = 0, end = length; i < end; i++) {
        res.push(this.type.decode(stream, ctx));
      }
    }

    return res;
  }

  size(array, ctx) {
    if (!array) {
      return this.type.size(null, ctx) * utils.resolveLength(this.length, null, ctx);
    }

    let size = 0;
    if (this.length instanceof NumberT) {
      size += this.length.size();
      ctx = {parent: ctx};
    }

    for (let item of array) {
      size += this.type.size(item, ctx);
    }

    return size;
  }

  encode(stream, array, parent) {
    let ctx = parent;
    if (this.length instanceof NumberT) {
      ctx = {
        pointers: [],
        startOffset: stream.pos,
        parent
      };

      ctx.pointerOffset = stream.pos + this.size(array, ctx);
      this.length.encode(stream, array.length);
    }

    for (let item of array) {
      this.type.encode(stream, item, ctx);
    }

    if (this.length instanceof NumberT) {
      let i = 0;
      while (i < ctx.pointers.length) {
        const ptr = ctx.pointers[i++];
        ptr.type.encode(stream, ptr.val);
      }
    }

  }
}

module.exports = ArrayT;

}, function(modId) { var map = {"./Number":1773630660089,"./utils":1773630660090}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1773630660089, function(require, module, exports) {
const DecodeStream = require('./DecodeStream');

class NumberT {
  constructor(type, endian = 'BE') {
    this.type = type;
    this.endian = endian;
    this.fn = this.type;
    if (this.type[this.type.length - 1] !== '8') {
      this.fn += this.endian;
    }
  }

  size() {
    return DecodeStream.TYPES[this.type];
  }

  decode(stream) {
    return stream[`read${this.fn}`]();
  }

  encode(stream, val) {
    return stream[`write${this.fn}`](val);
  }
}

exports.Number = NumberT;
exports.uint8 = new NumberT('UInt8');
exports.uint16be = (exports.uint16 = new NumberT('UInt16', 'BE'));
exports.uint16le = new NumberT('UInt16', 'LE');
exports.uint24be = (exports.uint24 = new NumberT('UInt24', 'BE'));
exports.uint24le = new NumberT('UInt24', 'LE');
exports.uint32be = (exports.uint32 = new NumberT('UInt32', 'BE'));
exports.uint32le = new NumberT('UInt32', 'LE');
exports.int8 = new NumberT('Int8');
exports.int16be = (exports.int16 = new NumberT('Int16', 'BE'));
exports.int16le = new NumberT('Int16', 'LE');
exports.int24be = (exports.int24 = new NumberT('Int24', 'BE'));
exports.int24le = new NumberT('Int24', 'LE');
exports.int32be = (exports.int32 = new NumberT('Int32', 'BE'));
exports.int32le = new NumberT('Int32', 'LE');
exports.floatbe = (exports.float = new NumberT('Float', 'BE'));
exports.floatle = new NumberT('Float', 'LE');
exports.doublebe = (exports.double = new NumberT('Double', 'BE'));
exports.doublele = new NumberT('Double', 'LE');

class Fixed extends NumberT {
  constructor(size, endian, fracBits = size >> 1) {
    super(`Int${size}`, endian);
    this._point = 1 << fracBits;
  }

  decode(stream) {
    return super.decode(stream) / this._point;
  }

  encode(stream, val) {
    return super.encode(stream, (val * this._point) | 0);
  }
}

exports.Fixed = Fixed;
exports.fixed16be = (exports.fixed16 = new Fixed(16, 'BE'));
exports.fixed16le = new Fixed(16, 'LE');
exports.fixed32be = (exports.fixed32 =new Fixed(32, 'BE'));
exports.fixed32le = new Fixed(32, 'LE');

}, function(modId) { var map = {"./DecodeStream":1773630660087}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1773630660090, function(require, module, exports) {
const {Number:NumberT} = require('./Number');

exports.resolveLength = function(length, stream, parent) {
  let res;
  if (typeof length === 'number') {
    res = length;

  } else if (typeof length === 'function') {
    res = length.call(parent, parent);

  } else if (parent && (typeof length === 'string')) {
    res = parent[length];

  } else if (stream && length instanceof NumberT) {
    res = length.decode(stream);
  }

  if (isNaN(res)) {
    throw new Error('Not a fixed size');
  }

  return res;
};

class PropertyDescriptor {
  constructor(opts = {}) {
    this.enumerable = true;
    this.configurable = true;

    for (let key in opts) {
      const val = opts[key];
      this[key] = val;
    }
  }
}

exports.PropertyDescriptor = PropertyDescriptor;

}, function(modId) { var map = {"./Number":1773630660089}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1773630660091, function(require, module, exports) {
const ArrayT = require('./Array');
const {Number:NumberT} = require('./Number');
const utils = require('./utils');
const {inspect} = require('util');

class LazyArrayT extends ArrayT {
  decode(stream, parent) {
    const { pos } = stream;
    const length = utils.resolveLength(this.length, stream, parent);

    if (this.length instanceof NumberT) {
      parent = {
        parent,
        _startOffset: pos,
        _currentOffset: 0,
        _length: length
      };
    }

    const res = new LazyArray(this.type, length, stream, parent);

    stream.pos += length * this.type.size(null, parent);
    return res;
  }

  size(val, ctx) {
    if (val instanceof LazyArray) {
      val = val.toArray();
    }

    return super.size(val, ctx);
  }

  encode(stream, val, ctx) {
    if (val instanceof LazyArray) {
      val = val.toArray();
    }

    return super.encode(stream, val, ctx);
  }
}

class LazyArray {
  constructor(type, length, stream, ctx) {
    this.type = type;
    this.length = length;
    this.stream = stream;
    this.ctx = ctx;
    this.base = this.stream.pos;
    this.items = [];
  }

  get(index) {
    if ((index < 0) || (index >= this.length)) {
      return undefined;
    }

    if (this.items[index] == null) {
      const { pos } = this.stream;
      this.stream.pos = this.base + (this.type.size(null, this.ctx) * index);
      this.items[index] = this.type.decode(this.stream, this.ctx);
      this.stream.pos = pos;
    }

    return this.items[index];
  }

  toArray() {
    const result = [];
    for (let i = 0, end = this.length; i < end; i++) {
      result.push(this.get(i));
    }
    return result;
  }

  inspect() {
    return inspect(this.toArray());
  }
}

module.exports = LazyArrayT;

}, function(modId) { var map = {"./Array":1773630660088,"./Number":1773630660089,"./utils":1773630660090}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1773630660092, function(require, module, exports) {
class Bitfield {
  constructor(type, flags = []) {
    this.type = type;
    this.flags = flags;
  }
  decode(stream) {
    const val = this.type.decode(stream);

    const res = {};
    for (let i = 0; i < this.flags.length; i++) {
      const flag = this.flags[i];
      if (flag != null) {
        res[flag] = !!(val & (1 << i));
      }
    }

    return res;
  }

  size() {
    return this.type.size();
  }

  encode(stream, keys) {
    let val = 0;
    for (let i = 0; i < this.flags.length; i++) {
      const flag = this.flags[i];
      if (flag != null) {
        if (keys[flag]) { val |= (1 << i); }
      }
    }

    return this.type.encode(stream, val);
  }
}

module.exports = Bitfield;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1773630660093, function(require, module, exports) {
class BooleanT {
  constructor(type) {
    this.type = type;
  }

  decode(stream, parent) {
    return !!this.type.decode(stream, parent);
  }

  size(val, parent) {
    return this.type.size(val, parent);
  }

  encode(stream, val, parent) {
    return this.type.encode(stream, +val, parent);
  }
}

module.exports = BooleanT;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1773630660094, function(require, module, exports) {
const utils = require('./utils');
const {Number:NumberT} = require('./Number');

class BufferT {
  constructor(length) {
    this.length = length;
  }
  decode(stream, parent) {
    const length = utils.resolveLength(this.length, stream, parent);
    return stream.readBuffer(length);
  }

  size(val, parent) {
    if (!val) {
      return utils.resolveLength(this.length, null, parent);
    }

    return val.length;
  }

  encode(stream, buf, parent) {
    if (this.length instanceof NumberT) {
      this.length.encode(stream, buf.length);
    }

    return stream.writeBuffer(buf);
  }
}

module.exports = BufferT;

}, function(modId) { var map = {"./utils":1773630660090,"./Number":1773630660089}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1773630660095, function(require, module, exports) {
class Enum {
  constructor(type, options = []) {
    this.type = type;
    this.options = options;
  }
  decode(stream) {
    const index = this.type.decode(stream);
    return this.options[index] || index;
  }

  size() {
    return this.type.size();
  }

  encode(stream, val) {
    const index = this.options.indexOf(val);
    if (index === -1) {
      throw new Error(`Unknown option in enum: ${val}`);
    }

    return this.type.encode(stream, index);
  }
}

module.exports = Enum;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1773630660096, function(require, module, exports) {
class Optional {
  constructor(type, condition = true) {
    this.type = type;
    this.condition = condition;
  }

  decode(stream, parent) {
    let { condition } = this;
    if (typeof condition === 'function') {
      condition = condition.call(parent, parent);
    }

    if (condition) {
      return this.type.decode(stream, parent);
    }
  }

  size(val, parent) {
    let { condition } = this;
    if (typeof condition === 'function') {
      condition = condition.call(parent, parent);
    }

    if (condition) {
      return this.type.size(val, parent);
    } else {
      return 0;
    }
  }

  encode(stream, val, parent) {
    let { condition } = this;
    if (typeof condition === 'function') {
      condition = condition.call(parent, parent);
    }

    if (condition) {
      return this.type.encode(stream, val, parent);
    }
  }
}

module.exports = Optional;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1773630660097, function(require, module, exports) {
const utils = require('./utils');

class Reserved {
  constructor(type, count = 1) {
    this.type = type;
    this.count = count;
  }
  decode(stream, parent) {
    stream.pos += this.size(null, parent);
    return undefined;
  }

  size(data, parent) {
    const count = utils.resolveLength(this.count, null, parent);
    return this.type.size() * count;
  }

  encode(stream, val, parent) {
    return stream.fill(0, this.size(val, parent));
  }
}

module.exports = Reserved;

}, function(modId) { var map = {"./utils":1773630660090}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1773630660098, function(require, module, exports) {
const {Number:NumberT} = require('./Number');
const utils = require('./utils');

class StringT {
  constructor(length, encoding = 'ascii') {
    this.length = length;
    this.encoding = encoding;
  }

  decode(stream, parent) {
    let length, pos;

    if (this.length != null) {
      length = utils.resolveLength(this.length, stream, parent);
    } else {
      let buffer;
      ({buffer, length, pos} = stream);

      while ((pos < length) && (buffer[pos] !== 0x00)) {
        ++pos;
      }

      length = pos - stream.pos;
    }

    let { encoding } = this;
    if (typeof encoding === 'function') {
      encoding = encoding.call(parent, parent) || 'ascii';
    }

    const string = stream.readString(length, encoding);

    if ((this.length == null) && (stream.pos < stream.length)) {
      stream.pos++;
    }

    return string;
  }

  size(val, parent) {
    // Use the defined value if no value was given
    if (!val) {
      return utils.resolveLength(this.length, null, parent);
    }

    let { encoding } = this;
    if (typeof encoding === 'function') {
      encoding = encoding.call(parent != null ? parent.val : undefined, parent != null ? parent.val : undefined) || 'ascii';
    }

    if (encoding === 'utf16be') {
      encoding = 'utf16le';
    }

    let size = Buffer.byteLength(val, encoding);
    if (this.length instanceof NumberT) {
      size += this.length.size();
    }

    if ((this.length == null)) {
      size++;
    }

    return size;
  }

  encode(stream, val, parent) {
    let { encoding } = this;
    if (typeof encoding === 'function') {
      encoding = encoding.call(parent != null ? parent.val : undefined, parent != null ? parent.val : undefined) || 'ascii';
    }

    if (this.length instanceof NumberT) {
      this.length.encode(stream, Buffer.byteLength(val, encoding));
    }

    stream.writeString(val, encoding);

    if ((this.length == null)) {
      return stream.writeUInt8(0x00);
    }
  }
}

module.exports = StringT;

}, function(modId) { var map = {"./Number":1773630660089,"./utils":1773630660090}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1773630660099, function(require, module, exports) {
const utils = require('./utils');

class Struct {
  constructor(fields = {}) {
    this.fields = fields;
  }

  decode(stream, parent, length = 0) {
    const res = this._setup(stream, parent, length);
    this._parseFields(stream, res, this.fields);

    if (this.process != null) {
      this.process.call(res, stream);
    }
    return res;
  }

  _setup(stream, parent, length) {
    const res = {};

    // define hidden properties
    Object.defineProperties(res, {
      parent:         { value: parent },
      _startOffset:   { value: stream.pos },
      _currentOffset: { value: 0, writable: true },
      _length:        { value: length }
    });

    return res;
  }

  _parseFields(stream, res, fields) {
    for (let key in fields) {
      var val;
      const type = fields[key];
      if (typeof type === 'function') {
        val = type.call(res, res);
      } else {
        val = type.decode(stream, res);
      }

      if (val !== undefined) {
        if (val instanceof utils.PropertyDescriptor) {
          Object.defineProperty(res, key, val);
        } else {
          res[key] = val;
        }
      }

      res._currentOffset = stream.pos - res._startOffset;
    }

  }

  size(val, parent, includePointers) {
    if (val == null) { val = {}; }
    if (includePointers == null) { includePointers = true; }
    const ctx = {
      parent,
      val,
      pointerSize: 0
    };

    let size = 0;
    for (let key in this.fields) {
      const type = this.fields[key];
      if (type.size != null) {
        size += type.size(val[key], ctx);
      }
    }

    if (includePointers) {
      size += ctx.pointerSize;
    }

    return size;
  }

  encode(stream, val, parent) {
    let type;
    if (this.preEncode != null) {
      this.preEncode.call(val, stream);
    }

    const ctx = {
      pointers: [],
      startOffset: stream.pos,
      parent,
      val,
      pointerSize: 0
    };

    ctx.pointerOffset = stream.pos + this.size(val, ctx, false);

    for (let key in this.fields) {
      type = this.fields[key];
      if (type.encode != null) {
        type.encode(stream, val[key], ctx);
      }
    }

    let i = 0;
    while (i < ctx.pointers.length) {
      const ptr = ctx.pointers[i++];
      ptr.type.encode(stream, ptr.val, ptr.parent);
    }

  }
}

module.exports = Struct;

}, function(modId) { var map = {"./utils":1773630660090}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1773630660100, function(require, module, exports) {
const Struct = require('./Struct');

const getPath = (object, pathArray) => {
  return pathArray.reduce((prevObj, key) => prevObj && prevObj[key], object);
};

class VersionedStruct extends Struct {
  constructor(type, versions = {}) {
    super();
    this.type = type;
    this.versions = versions;
    if (typeof type === 'string') {
      this.versionPath = type.split('.');
    }
  }

  decode(stream, parent, length = 0) {
    const res = this._setup(stream, parent, length);

    if (typeof this.type === 'string') {
      res.version = getPath(parent, this.versionPath);
    } else {
      res.version = this.type.decode(stream);
    }

    if (this.versions.header) {
      this._parseFields(stream, res, this.versions.header);
    }

    const fields = this.versions[res.version];
    if ((fields == null)) {
      throw new Error(`Unknown version ${res.version}`);
    }

    if (fields instanceof VersionedStruct) {
      return fields.decode(stream, parent);
    }

    this._parseFields(stream, res, fields);

    if (this.process != null) {
      this.process.call(res, stream);
    }
    return res;
  }

  size(val, parent, includePointers = true) {
    let key, type;
    if (!val) {
      throw new Error('Not a fixed size');
    }

    const ctx = {
      parent,
      val,
      pointerSize: 0
    };

    let size = 0;
    if (typeof this.type !== 'string') {
      size += this.type.size(val.version, ctx);
    }

    if (this.versions.header) {
      for (key in this.versions.header) {
        type = this.versions.header[key];
        if (type.size != null) {
          size += type.size(val[key], ctx);
        }
      }
    }

    const fields = this.versions[val.version];
    if ((fields == null)) {
      throw new Error(`Unknown version ${val.version}`);
    }

    for (key in fields) {
      type = fields[key];
      if (type.size != null) {
        size += type.size(val[key], ctx);
      }
    }

    if (includePointers) {
      size += ctx.pointerSize;
    }

    return size;
  }

  encode(stream, val, parent) {
    let key, type;
    if (this.preEncode != null) {
      this.preEncode.call(val, stream);
    }

    const ctx = {
      pointers: [],
      startOffset: stream.pos,
      parent,
      val,
      pointerSize: 0
    };

    ctx.pointerOffset = stream.pos + this.size(val, ctx, false);

    if (typeof this.type !== 'string') {
      this.type.encode(stream, val.version);
    }

    if (this.versions.header) {
      for (key in this.versions.header) {
        type = this.versions.header[key];
        if (type.encode != null) {
          type.encode(stream, val[key], ctx);
        }
      }
    }

    const fields = this.versions[val.version];
    for (key in fields) {
      type = fields[key];
      if (type.encode != null) {
        type.encode(stream, val[key], ctx);
      }
    }

    let i = 0;
    while (i < ctx.pointers.length) {
      const ptr = ctx.pointers[i++];
      ptr.type.encode(stream, ptr.val, ptr.parent);
    }

  }
}

module.exports = VersionedStruct;

}, function(modId) { var map = {"./Struct":1773630660099}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1773630660101, function(require, module, exports) {
const utils = require('./utils');

class Pointer {
  constructor(offsetType, type, options = {}) {
    this.offsetType = offsetType;
    this.type = type;
    this.options = options;
    if (this.type === 'void') { this.type = null; }
    if (this.options.type == null) { this.options.type = 'local'; }
    if (this.options.allowNull == null) { this.options.allowNull = true; }
    if (this.options.nullValue == null) { this.options.nullValue = 0; }
    if (this.options.lazy == null) { this.options.lazy = false; }
    if (this.options.relativeTo) {
      if (typeof this.options.relativeTo !== 'function') {
        throw new Error('relativeTo option must be a function');
      }
      this.relativeToGetter = options.relativeTo;
    }
  }

  decode(stream, ctx) {
    const offset = this.offsetType.decode(stream, ctx);

    // handle NULL pointers
    if ((offset === this.options.nullValue) && this.options.allowNull) {
      return null;
    }

    let relative;
    switch (this.options.type) {
      case 'local':     relative = ctx._startOffset; break;
      case 'immediate': relative = stream.pos - this.offsetType.size(); break;
      case 'parent':    relative = ctx.parent._startOffset; break;
      default:
        var c = ctx;
        while (c.parent) {
          c = c.parent;
        }

        relative = c._startOffset || 0;
    }

    if (this.options.relativeTo) {
      relative += this.relativeToGetter(ctx);
    }

    const ptr = offset + relative;

    if (this.type != null) {
      let val = null;
      const decodeValue = () => {
        if (val != null) { return val; }

        const { pos } = stream;
        stream.pos = ptr;
        val = this.type.decode(stream, ctx);
        stream.pos = pos;
        return val;
      };

      // If this is a lazy pointer, define a getter to decode only when needed.
      // This obviously only works when the pointer is contained by a Struct.
      if (this.options.lazy) {
        return new utils.PropertyDescriptor({
          get: decodeValue});
      }

      return decodeValue();
    } else {
      return ptr;
    }
  }

  size(val, ctx) {
    const parent = ctx;
    switch (this.options.type) {
      case 'local': case 'immediate':
        break;
      case 'parent':
        ctx = ctx.parent;
        break;
      default: // global
        while (ctx.parent) {
          ctx = ctx.parent;
        }
    }

    let { type } = this;
    if (type == null) {
      if (!(val instanceof VoidPointer)) {
        throw new Error("Must be a VoidPointer");
      }

      ({ type } = val);
      val = val.value;
    }

    if (val && ctx) {
      ctx.pointerSize += type.size(val, parent);
    }

    return this.offsetType.size();
  }

  encode(stream, val, ctx) {
    let relative;
    const parent = ctx;
    if ((val == null)) {
      this.offsetType.encode(stream, this.options.nullValue);
      return;
    }

    switch (this.options.type) {
      case 'local':
        relative = ctx.startOffset;
        break;
      case 'immediate':
        relative = stream.pos + this.offsetType.size(val, parent);
        break;
      case 'parent':
        ctx = ctx.parent;
        relative = ctx.startOffset;
        break;
      default: // global
        relative = 0;
        while (ctx.parent) {
          ctx = ctx.parent;
        }
    }

    if (this.options.relativeTo) {
      relative += this.relativeToGetter(parent.val);
    }

    this.offsetType.encode(stream, ctx.pointerOffset - relative);

    let { type } = this;
    if (type == null) {
      if (!(val instanceof VoidPointer)) {
        throw new Error("Must be a VoidPointer");
      }

      ({ type } = val);
      val = val.value;
    }

    ctx.pointers.push({
      type,
      val,
      parent
    });

    return ctx.pointerOffset += type.size(val, parent);
  }
}

// A pointer whose type is determined at decode time
class VoidPointer {
  constructor(type, value) {
    this.type = type;
    this.value = value;
  }
}

exports.Pointer = Pointer;
exports.VoidPointer = VoidPointer;

}, function(modId) { var map = {"./utils":1773630660090}; return __REQUIRE__(map[modId], modId); })
return __REQUIRE__(1773630660085);
})()
//miniprogram-npm-outsideDeps=["stream","iconv-lite","util"]
//# sourceMappingURL=index.js.map