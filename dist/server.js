import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../../../opt/npm-tools/node_modules/ws/lib/constants.js
var require_constants = __commonJS({
  "../../../opt/npm-tools/node_modules/ws/lib/constants.js"(exports, module) {
    "use strict";
    var BINARY_TYPES = ["nodebuffer", "arraybuffer", "fragments"];
    var hasBlob = typeof Blob !== "undefined";
    if (hasBlob) BINARY_TYPES.push("blob");
    module.exports = {
      BINARY_TYPES,
      CLOSE_TIMEOUT: 3e4,
      EMPTY_BUFFER: Buffer.alloc(0),
      GUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
      hasBlob,
      kForOnEventAttribute: /* @__PURE__ */ Symbol("kIsForOnEventAttribute"),
      kListener: /* @__PURE__ */ Symbol("kListener"),
      kStatusCode: /* @__PURE__ */ Symbol("status-code"),
      kWebSocket: /* @__PURE__ */ Symbol("websocket"),
      NOOP: () => {
      }
    };
  }
});

// ../../../opt/npm-tools/node_modules/ws/lib/buffer-util.js
var require_buffer_util = __commonJS({
  "../../../opt/npm-tools/node_modules/ws/lib/buffer-util.js"(exports, module) {
    "use strict";
    var { EMPTY_BUFFER } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    function concat(list, totalLength) {
      if (list.length === 0) return EMPTY_BUFFER;
      if (list.length === 1) return list[0];
      const target = Buffer.allocUnsafe(totalLength);
      let offset = 0;
      for (let i = 0; i < list.length; i++) {
        const buf = list[i];
        target.set(buf, offset);
        offset += buf.length;
      }
      if (offset < totalLength) {
        return new FastBuffer(target.buffer, target.byteOffset, offset);
      }
      return target;
    }
    function _mask(source, mask, output, offset, length) {
      for (let i = 0; i < length; i++) {
        output[offset + i] = source[i] ^ mask[i & 3];
      }
    }
    function _unmask(buffer, mask) {
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] ^= mask[i & 3];
      }
    }
    function toArrayBuffer(buf) {
      if (buf.length === buf.buffer.byteLength) {
        return buf.buffer;
      }
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
    }
    function toBuffer(data) {
      toBuffer.readOnly = true;
      if (Buffer.isBuffer(data)) return data;
      let buf;
      if (data instanceof ArrayBuffer) {
        buf = new FastBuffer(data);
      } else if (ArrayBuffer.isView(data)) {
        buf = new FastBuffer(data.buffer, data.byteOffset, data.byteLength);
      } else {
        buf = Buffer.from(data);
        toBuffer.readOnly = false;
      }
      return buf;
    }
    module.exports = {
      concat,
      mask: _mask,
      toArrayBuffer,
      toBuffer,
      unmask: _unmask
    };
    if (!process.env.WS_NO_BUFFER_UTIL) {
      try {
        const bufferUtil = __require("bufferutil");
        module.exports.mask = function(source, mask, output, offset, length) {
          if (length < 48) _mask(source, mask, output, offset, length);
          else bufferUtil.mask(source, mask, output, offset, length);
        };
        module.exports.unmask = function(buffer, mask) {
          if (buffer.length < 32) _unmask(buffer, mask);
          else bufferUtil.unmask(buffer, mask);
        };
      } catch (e) {
      }
    }
  }
});

// ../../../opt/npm-tools/node_modules/ws/lib/limiter.js
var require_limiter = __commonJS({
  "../../../opt/npm-tools/node_modules/ws/lib/limiter.js"(exports, module) {
    "use strict";
    var kDone = /* @__PURE__ */ Symbol("kDone");
    var kRun = /* @__PURE__ */ Symbol("kRun");
    var Limiter = class {
      /**
       * Creates a new `Limiter`.
       *
       * @param {Number} [concurrency=Infinity] The maximum number of jobs allowed
       *     to run concurrently
       */
      constructor(concurrency) {
        this[kDone] = () => {
          this.pending--;
          this[kRun]();
        };
        this.concurrency = concurrency || Infinity;
        this.jobs = [];
        this.pending = 0;
      }
      /**
       * Adds a job to the queue.
       *
       * @param {Function} job The job to run
       * @public
       */
      add(job) {
        this.jobs.push(job);
        this[kRun]();
      }
      /**
       * Removes a job from the queue and runs it if possible.
       *
       * @private
       */
      [kRun]() {
        if (this.pending === this.concurrency) return;
        if (this.jobs.length) {
          const job = this.jobs.shift();
          this.pending++;
          job(this[kDone]);
        }
      }
    };
    module.exports = Limiter;
  }
});

// ../../../opt/npm-tools/node_modules/ws/lib/permessage-deflate.js
var require_permessage_deflate = __commonJS({
  "../../../opt/npm-tools/node_modules/ws/lib/permessage-deflate.js"(exports, module) {
    "use strict";
    var zlib = __require("zlib");
    var bufferUtil = require_buffer_util();
    var Limiter = require_limiter();
    var { kStatusCode } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    var TRAILER = Buffer.from([0, 0, 255, 255]);
    var kPerMessageDeflate = /* @__PURE__ */ Symbol("permessage-deflate");
    var kTotalLength = /* @__PURE__ */ Symbol("total-length");
    var kCallback = /* @__PURE__ */ Symbol("callback");
    var kBuffers = /* @__PURE__ */ Symbol("buffers");
    var kError = /* @__PURE__ */ Symbol("error");
    var zlibLimiter;
    var PerMessageDeflate2 = class {
      /**
       * Creates a PerMessageDeflate instance.
       *
       * @param {Object} [options] Configuration options
       * @param {(Boolean|Number)} [options.clientMaxWindowBits] Advertise support
       *     for, or request, a custom client window size
       * @param {Boolean} [options.clientNoContextTakeover=false] Advertise/
       *     acknowledge disabling of client context takeover
       * @param {Number} [options.concurrencyLimit=10] The number of concurrent
       *     calls to zlib
       * @param {Boolean} [options.isServer=false] Create the instance in either
       *     server or client mode
       * @param {Number} [options.maxPayload=0] The maximum allowed message length
       * @param {(Boolean|Number)} [options.serverMaxWindowBits] Request/confirm the
       *     use of a custom server window size
       * @param {Boolean} [options.serverNoContextTakeover=false] Request/accept
       *     disabling of server context takeover
       * @param {Number} [options.threshold=1024] Size (in bytes) below which
       *     messages should not be compressed if context takeover is disabled
       * @param {Object} [options.zlibDeflateOptions] Options to pass to zlib on
       *     deflate
       * @param {Object} [options.zlibInflateOptions] Options to pass to zlib on
       *     inflate
       */
      constructor(options) {
        this._options = options || {};
        this._threshold = this._options.threshold !== void 0 ? this._options.threshold : 1024;
        this._maxPayload = this._options.maxPayload | 0;
        this._isServer = !!this._options.isServer;
        this._deflate = null;
        this._inflate = null;
        this.params = null;
        if (!zlibLimiter) {
          const concurrency = this._options.concurrencyLimit !== void 0 ? this._options.concurrencyLimit : 10;
          zlibLimiter = new Limiter(concurrency);
        }
      }
      /**
       * @type {String}
       */
      static get extensionName() {
        return "permessage-deflate";
      }
      /**
       * Create an extension negotiation offer.
       *
       * @return {Object} Extension parameters
       * @public
       */
      offer() {
        const params = {};
        if (this._options.serverNoContextTakeover) {
          params.server_no_context_takeover = true;
        }
        if (this._options.clientNoContextTakeover) {
          params.client_no_context_takeover = true;
        }
        if (this._options.serverMaxWindowBits) {
          params.server_max_window_bits = this._options.serverMaxWindowBits;
        }
        if (this._options.clientMaxWindowBits) {
          params.client_max_window_bits = this._options.clientMaxWindowBits;
        } else if (this._options.clientMaxWindowBits == null) {
          params.client_max_window_bits = true;
        }
        return params;
      }
      /**
       * Accept an extension negotiation offer/response.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Object} Accepted configuration
       * @public
       */
      accept(configurations) {
        configurations = this.normalizeParams(configurations);
        this.params = this._isServer ? this.acceptAsServer(configurations) : this.acceptAsClient(configurations);
        return this.params;
      }
      /**
       * Releases all resources used by the extension.
       *
       * @public
       */
      cleanup() {
        if (this._inflate) {
          this._inflate.close();
          this._inflate = null;
        }
        if (this._deflate) {
          const callback = this._deflate[kCallback];
          this._deflate.close();
          this._deflate = null;
          if (callback) {
            callback(
              new Error(
                "The deflate stream was closed while data was being processed"
              )
            );
          }
        }
      }
      /**
       *  Accept an extension negotiation offer.
       *
       * @param {Array} offers The extension negotiation offers
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsServer(offers) {
        const opts = this._options;
        const accepted = offers.find((params) => {
          if (opts.serverNoContextTakeover === false && params.server_no_context_takeover || params.server_max_window_bits && (opts.serverMaxWindowBits === false || typeof opts.serverMaxWindowBits === "number" && opts.serverMaxWindowBits > params.server_max_window_bits) || typeof opts.clientMaxWindowBits === "number" && (typeof params.client_max_window_bits === "number" ? opts.clientMaxWindowBits > params.client_max_window_bits : !params.client_max_window_bits)) {
            return false;
          }
          return true;
        });
        if (!accepted) {
          throw new Error("None of the extension offers can be accepted");
        }
        if (opts.serverNoContextTakeover) {
          accepted.server_no_context_takeover = true;
        }
        if (opts.clientNoContextTakeover) {
          accepted.client_no_context_takeover = true;
        }
        if (typeof opts.serverMaxWindowBits === "number") {
          accepted.server_max_window_bits = opts.serverMaxWindowBits;
        }
        if (typeof opts.clientMaxWindowBits === "number") {
          accepted.client_max_window_bits = opts.clientMaxWindowBits;
        } else if (accepted.client_max_window_bits === true || opts.clientMaxWindowBits === false) {
          delete accepted.client_max_window_bits;
        }
        return accepted;
      }
      /**
       * Accept the extension negotiation response.
       *
       * @param {Array} response The extension negotiation response
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsClient(response) {
        const params = response[0];
        if (this._options.clientNoContextTakeover === false && params.client_no_context_takeover) {
          throw new Error('Unexpected parameter "client_no_context_takeover"');
        }
        if (!params.client_max_window_bits) {
          if (typeof this._options.clientMaxWindowBits === "number") {
            params.client_max_window_bits = this._options.clientMaxWindowBits;
          }
        } else if (this._options.clientMaxWindowBits === false || typeof this._options.clientMaxWindowBits === "number" && params.client_max_window_bits > this._options.clientMaxWindowBits) {
          throw new Error(
            'Unexpected or invalid parameter "client_max_window_bits"'
          );
        }
        return params;
      }
      /**
       * Normalize parameters.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Array} The offers/response with normalized parameters
       * @private
       */
      normalizeParams(configurations) {
        configurations.forEach((params) => {
          Object.keys(params).forEach((key) => {
            let value = params[key];
            if (value.length > 1) {
              throw new Error(`Parameter "${key}" must have only a single value`);
            }
            value = value[0];
            if (key === "client_max_window_bits") {
              if (value !== true) {
                const num = +value;
                if (!Number.isInteger(num) || num < 8 || num > 15) {
                  throw new TypeError(
                    `Invalid value for parameter "${key}": ${value}`
                  );
                }
                value = num;
              } else if (!this._isServer) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else if (key === "server_max_window_bits") {
              const num = +value;
              if (!Number.isInteger(num) || num < 8 || num > 15) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
              value = num;
            } else if (key === "client_no_context_takeover" || key === "server_no_context_takeover") {
              if (value !== true) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else {
              throw new Error(`Unknown parameter "${key}"`);
            }
            params[key] = value;
          });
        });
        return configurations;
      }
      /**
       * Decompress data. Concurrency limited.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      decompress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._decompress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Compress data. Concurrency limited.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      compress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._compress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Decompress data.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _decompress(data, fin, callback) {
        const endpoint = this._isServer ? "client" : "server";
        if (!this._inflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._inflate = zlib.createInflateRaw({
            ...this._options.zlibInflateOptions,
            windowBits
          });
          this._inflate[kPerMessageDeflate] = this;
          this._inflate[kTotalLength] = 0;
          this._inflate[kBuffers] = [];
          this._inflate.on("error", inflateOnError);
          this._inflate.on("data", inflateOnData);
        }
        this._inflate[kCallback] = callback;
        this._inflate.write(data);
        if (fin) this._inflate.write(TRAILER);
        this._inflate.flush(() => {
          const err = this._inflate[kError];
          if (err) {
            this._inflate.close();
            this._inflate = null;
            callback(err);
            return;
          }
          const data2 = bufferUtil.concat(
            this._inflate[kBuffers],
            this._inflate[kTotalLength]
          );
          if (this._inflate._readableState.endEmitted) {
            this._inflate.close();
            this._inflate = null;
          } else {
            this._inflate[kTotalLength] = 0;
            this._inflate[kBuffers] = [];
            if (fin && this.params[`${endpoint}_no_context_takeover`]) {
              this._inflate.reset();
            }
          }
          callback(null, data2);
        });
      }
      /**
       * Compress data.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _compress(data, fin, callback) {
        const endpoint = this._isServer ? "server" : "client";
        if (!this._deflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._deflate = zlib.createDeflateRaw({
            ...this._options.zlibDeflateOptions,
            windowBits
          });
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          this._deflate.on("data", deflateOnData);
        }
        this._deflate[kCallback] = callback;
        this._deflate.write(data);
        this._deflate.flush(zlib.Z_SYNC_FLUSH, () => {
          if (!this._deflate) {
            return;
          }
          let data2 = bufferUtil.concat(
            this._deflate[kBuffers],
            this._deflate[kTotalLength]
          );
          if (fin) {
            data2 = new FastBuffer(data2.buffer, data2.byteOffset, data2.length - 4);
          }
          this._deflate[kCallback] = null;
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          if (fin && this.params[`${endpoint}_no_context_takeover`]) {
            this._deflate.reset();
          }
          callback(null, data2);
        });
      }
    };
    module.exports = PerMessageDeflate2;
    function deflateOnData(chunk) {
      this[kBuffers].push(chunk);
      this[kTotalLength] += chunk.length;
    }
    function inflateOnData(chunk) {
      this[kTotalLength] += chunk.length;
      if (this[kPerMessageDeflate]._maxPayload < 1 || this[kTotalLength] <= this[kPerMessageDeflate]._maxPayload) {
        this[kBuffers].push(chunk);
        return;
      }
      this[kError] = new RangeError("Max payload size exceeded");
      this[kError].code = "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH";
      this[kError][kStatusCode] = 1009;
      this.removeListener("data", inflateOnData);
      this.reset();
    }
    function inflateOnError(err) {
      this[kPerMessageDeflate]._inflate = null;
      if (this[kError]) {
        this[kCallback](this[kError]);
        return;
      }
      err[kStatusCode] = 1007;
      this[kCallback](err);
    }
  }
});

// ../../../opt/npm-tools/node_modules/ws/lib/validation.js
var require_validation = __commonJS({
  "../../../opt/npm-tools/node_modules/ws/lib/validation.js"(exports, module) {
    "use strict";
    var { isUtf8 } = __require("buffer");
    var { hasBlob } = require_constants();
    var tokenChars = [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 0 - 15
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 16 - 31
      0,
      1,
      0,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      1,
      1,
      0,
      1,
      1,
      0,
      // 32 - 47
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      // 48 - 63
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 64 - 79
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      1,
      1,
      // 80 - 95
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 96 - 111
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      1,
      0,
      1,
      0
      // 112 - 127
    ];
    function isValidStatusCode(code) {
      return code >= 1e3 && code <= 1014 && code !== 1004 && code !== 1005 && code !== 1006 || code >= 3e3 && code <= 4999;
    }
    function _isValidUTF8(buf) {
      const len = buf.length;
      let i = 0;
      while (i < len) {
        if ((buf[i] & 128) === 0) {
          i++;
        } else if ((buf[i] & 224) === 192) {
          if (i + 1 === len || (buf[i + 1] & 192) !== 128 || (buf[i] & 254) === 192) {
            return false;
          }
          i += 2;
        } else if ((buf[i] & 240) === 224) {
          if (i + 2 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || buf[i] === 224 && (buf[i + 1] & 224) === 128 || // Overlong
          buf[i] === 237 && (buf[i + 1] & 224) === 160) {
            return false;
          }
          i += 3;
        } else if ((buf[i] & 248) === 240) {
          if (i + 3 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || (buf[i + 3] & 192) !== 128 || buf[i] === 240 && (buf[i + 1] & 240) === 128 || // Overlong
          buf[i] === 244 && buf[i + 1] > 143 || buf[i] > 244) {
            return false;
          }
          i += 4;
        } else {
          return false;
        }
      }
      return true;
    }
    function isBlob(value) {
      return hasBlob && typeof value === "object" && typeof value.arrayBuffer === "function" && typeof value.type === "string" && typeof value.stream === "function" && (value[Symbol.toStringTag] === "Blob" || value[Symbol.toStringTag] === "File");
    }
    module.exports = {
      isBlob,
      isValidStatusCode,
      isValidUTF8: _isValidUTF8,
      tokenChars
    };
    if (isUtf8) {
      module.exports.isValidUTF8 = function(buf) {
        return buf.length < 24 ? _isValidUTF8(buf) : isUtf8(buf);
      };
    } else if (!process.env.WS_NO_UTF_8_VALIDATE) {
      try {
        const isValidUTF8 = __require("utf-8-validate");
        module.exports.isValidUTF8 = function(buf) {
          return buf.length < 32 ? _isValidUTF8(buf) : isValidUTF8(buf);
        };
      } catch (e) {
      }
    }
  }
});

// ../../../opt/npm-tools/node_modules/ws/lib/receiver.js
var require_receiver = __commonJS({
  "../../../opt/npm-tools/node_modules/ws/lib/receiver.js"(exports, module) {
    "use strict";
    var { Writable } = __require("stream");
    var PerMessageDeflate2 = require_permessage_deflate();
    var {
      BINARY_TYPES,
      EMPTY_BUFFER,
      kStatusCode,
      kWebSocket
    } = require_constants();
    var { concat, toArrayBuffer, unmask } = require_buffer_util();
    var { isValidStatusCode, isValidUTF8 } = require_validation();
    var FastBuffer = Buffer[Symbol.species];
    var GET_INFO = 0;
    var GET_PAYLOAD_LENGTH_16 = 1;
    var GET_PAYLOAD_LENGTH_64 = 2;
    var GET_MASK = 3;
    var GET_DATA = 4;
    var INFLATING = 5;
    var DEFER_EVENT = 6;
    var Receiver2 = class extends Writable {
      /**
       * Creates a Receiver instance.
       *
       * @param {Object} [options] Options object
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {String} [options.binaryType=nodebuffer] The type for binary data
       * @param {Object} [options.extensions] An object containing the negotiated
       *     extensions
       * @param {Boolean} [options.isServer=false] Specifies whether to operate in
       *     client or server mode
       * @param {Number} [options.maxBufferedChunks=0] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=0] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=0] The maximum allowed message length
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       */
      constructor(options = {}) {
        super();
        this._allowSynchronousEvents = options.allowSynchronousEvents !== void 0 ? options.allowSynchronousEvents : true;
        this._binaryType = options.binaryType || BINARY_TYPES[0];
        this._extensions = options.extensions || {};
        this._isServer = !!options.isServer;
        this._maxBufferedChunks = options.maxBufferedChunks | 0;
        this._maxFragments = options.maxFragments | 0;
        this._maxPayload = options.maxPayload | 0;
        this._skipUTF8Validation = !!options.skipUTF8Validation;
        this[kWebSocket] = void 0;
        this._bufferedBytes = 0;
        this._buffers = [];
        this._compressed = false;
        this._payloadLength = 0;
        this._mask = void 0;
        this._fragmented = 0;
        this._masked = false;
        this._fin = false;
        this._opcode = 0;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._numFragments = 0;
        this._fragments = [];
        this._errored = false;
        this._loop = false;
        this._state = GET_INFO;
      }
      /**
       * Implements `Writable.prototype._write()`.
       *
       * @param {Buffer} chunk The chunk of data to write
       * @param {String} encoding The character encoding of `chunk`
       * @param {Function} cb Callback
       * @private
       */
      _write(chunk, encoding, cb) {
        if (this._opcode === 8 && this._state == GET_INFO) return cb();
        if (this._maxBufferedChunks > 0 && this._buffers.length >= this._maxBufferedChunks) {
          cb(
            this.createError(
              RangeError,
              "Too many buffered chunks",
              false,
              1008,
              "WS_ERR_TOO_MANY_BUFFERED_PARTS"
            )
          );
          return;
        }
        this._bufferedBytes += chunk.length;
        this._buffers.push(chunk);
        this.startLoop(cb);
      }
      /**
       * Consumes `n` bytes from the buffered data.
       *
       * @param {Number} n The number of bytes to consume
       * @return {Buffer} The consumed bytes
       * @private
       */
      consume(n) {
        this._bufferedBytes -= n;
        if (n === this._buffers[0].length) return this._buffers.shift();
        if (n < this._buffers[0].length) {
          const buf = this._buffers[0];
          this._buffers[0] = new FastBuffer(
            buf.buffer,
            buf.byteOffset + n,
            buf.length - n
          );
          return new FastBuffer(buf.buffer, buf.byteOffset, n);
        }
        const dst = Buffer.allocUnsafe(n);
        do {
          const buf = this._buffers[0];
          const offset = dst.length - n;
          if (n >= buf.length) {
            dst.set(this._buffers.shift(), offset);
          } else {
            dst.set(new Uint8Array(buf.buffer, buf.byteOffset, n), offset);
            this._buffers[0] = new FastBuffer(
              buf.buffer,
              buf.byteOffset + n,
              buf.length - n
            );
          }
          n -= buf.length;
        } while (n > 0);
        return dst;
      }
      /**
       * Starts the parsing loop.
       *
       * @param {Function} cb Callback
       * @private
       */
      startLoop(cb) {
        this._loop = true;
        do {
          switch (this._state) {
            case GET_INFO:
              this.getInfo(cb);
              break;
            case GET_PAYLOAD_LENGTH_16:
              this.getPayloadLength16(cb);
              break;
            case GET_PAYLOAD_LENGTH_64:
              this.getPayloadLength64(cb);
              break;
            case GET_MASK:
              this.getMask();
              break;
            case GET_DATA:
              this.getData(cb);
              break;
            case INFLATING:
            case DEFER_EVENT:
              this._loop = false;
              return;
          }
        } while (this._loop);
        if (!this._errored) cb();
      }
      /**
       * Reads the first two bytes of a frame.
       *
       * @param {Function} cb Callback
       * @private
       */
      getInfo(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        const buf = this.consume(2);
        if ((buf[0] & 48) !== 0) {
          const error = this.createError(
            RangeError,
            "RSV2 and RSV3 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_2_3"
          );
          cb(error);
          return;
        }
        const compressed = (buf[0] & 64) === 64;
        if (compressed && !this._extensions[PerMessageDeflate2.extensionName]) {
          const error = this.createError(
            RangeError,
            "RSV1 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_1"
          );
          cb(error);
          return;
        }
        this._fin = (buf[0] & 128) === 128;
        this._opcode = buf[0] & 15;
        this._payloadLength = buf[1] & 127;
        if (this._opcode === 0) {
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (!this._fragmented) {
            const error = this.createError(
              RangeError,
              "invalid opcode 0",
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._opcode = this._fragmented;
        } else if (this._opcode === 1 || this._opcode === 2) {
          if (this._fragmented) {
            const error = this.createError(
              RangeError,
              `invalid opcode ${this._opcode}`,
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._compressed = compressed;
        } else if (this._opcode > 7 && this._opcode < 11) {
          if (!this._fin) {
            const error = this.createError(
              RangeError,
              "FIN must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_FIN"
            );
            cb(error);
            return;
          }
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (this._payloadLength > 125 || this._opcode === 8 && this._payloadLength === 1) {
            const error = this.createError(
              RangeError,
              `invalid payload length ${this._payloadLength}`,
              true,
              1002,
              "WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH"
            );
            cb(error);
            return;
          }
        } else {
          const error = this.createError(
            RangeError,
            `invalid opcode ${this._opcode}`,
            true,
            1002,
            "WS_ERR_INVALID_OPCODE"
          );
          cb(error);
          return;
        }
        if (!this._fin && !this._fragmented) this._fragmented = this._opcode;
        this._masked = (buf[1] & 128) === 128;
        if (this._isServer) {
          if (!this._masked) {
            const error = this.createError(
              RangeError,
              "MASK must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_MASK"
            );
            cb(error);
            return;
          }
        } else if (this._masked) {
          const error = this.createError(
            RangeError,
            "MASK must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_MASK"
          );
          cb(error);
          return;
        }
        if (this._payloadLength === 126) this._state = GET_PAYLOAD_LENGTH_16;
        else if (this._payloadLength === 127) this._state = GET_PAYLOAD_LENGTH_64;
        else this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+16).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength16(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        this._payloadLength = this.consume(2).readUInt16BE(0);
        this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+64).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength64(cb) {
        if (this._bufferedBytes < 8) {
          this._loop = false;
          return;
        }
        const buf = this.consume(8);
        const num = buf.readUInt32BE(0);
        if (num > Math.pow(2, 53 - 32) - 1) {
          const error = this.createError(
            RangeError,
            "Unsupported WebSocket frame: payload length > 2^53 - 1",
            false,
            1009,
            "WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH"
          );
          cb(error);
          return;
        }
        this._payloadLength = num * Math.pow(2, 32) + buf.readUInt32BE(4);
        this.haveLength(cb);
      }
      /**
       * Payload length has been read.
       *
       * @param {Function} cb Callback
       * @private
       */
      haveLength(cb) {
        if (this._payloadLength && this._opcode < 8) {
          this._totalPayloadLength += this._payloadLength;
          if (this._totalPayloadLength > this._maxPayload && this._maxPayload > 0) {
            const error = this.createError(
              RangeError,
              "Max payload size exceeded",
              false,
              1009,
              "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
            );
            cb(error);
            return;
          }
        }
        if (this._masked) this._state = GET_MASK;
        else this._state = GET_DATA;
      }
      /**
       * Reads mask bytes.
       *
       * @private
       */
      getMask() {
        if (this._bufferedBytes < 4) {
          this._loop = false;
          return;
        }
        this._mask = this.consume(4);
        this._state = GET_DATA;
      }
      /**
       * Reads data bytes.
       *
       * @param {Function} cb Callback
       * @private
       */
      getData(cb) {
        let data = EMPTY_BUFFER;
        if (this._payloadLength) {
          if (this._bufferedBytes < this._payloadLength) {
            this._loop = false;
            return;
          }
          data = this.consume(this._payloadLength);
          if (this._masked && (this._mask[0] | this._mask[1] | this._mask[2] | this._mask[3]) !== 0) {
            unmask(data, this._mask);
          }
        }
        if (this._opcode > 7) {
          this.controlMessage(data, cb);
          return;
        }
        if (this._maxFragments > 0 && ++this._numFragments > this._maxFragments) {
          const error = this.createError(
            RangeError,
            "Too many message fragments",
            false,
            1008,
            "WS_ERR_TOO_MANY_BUFFERED_PARTS"
          );
          cb(error);
          return;
        }
        if (this._compressed) {
          this._state = INFLATING;
          this.decompress(data, cb);
          return;
        }
        if (data.length) {
          this._messageLength = this._totalPayloadLength;
          this._fragments.push(data);
        }
        this.dataMessage(cb);
      }
      /**
       * Decompresses data.
       *
       * @param {Buffer} data Compressed data
       * @param {Function} cb Callback
       * @private
       */
      decompress(data, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        perMessageDeflate.decompress(data, this._fin, (err, buf) => {
          if (err) return cb(err);
          if (buf.length) {
            this._messageLength += buf.length;
            if (this._messageLength > this._maxPayload && this._maxPayload > 0) {
              const error = this.createError(
                RangeError,
                "Max payload size exceeded",
                false,
                1009,
                "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
              );
              cb(error);
              return;
            }
            this._fragments.push(buf);
          }
          this.dataMessage(cb);
          if (this._state === GET_INFO) this.startLoop(cb);
        });
      }
      /**
       * Handles a data message.
       *
       * @param {Function} cb Callback
       * @private
       */
      dataMessage(cb) {
        if (!this._fin) {
          this._state = GET_INFO;
          return;
        }
        const messageLength = this._messageLength;
        const fragments = this._fragments;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._fragmented = 0;
        this._numFragments = 0;
        this._fragments = [];
        if (this._opcode === 2) {
          let data;
          if (this._binaryType === "nodebuffer") {
            data = concat(fragments, messageLength);
          } else if (this._binaryType === "arraybuffer") {
            data = toArrayBuffer(concat(fragments, messageLength));
          } else if (this._binaryType === "blob") {
            data = new Blob(fragments);
          } else {
            data = fragments;
          }
          if (this._allowSynchronousEvents) {
            this.emit("message", data, true);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", data, true);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        } else {
          const buf = concat(fragments, messageLength);
          if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
            const error = this.createError(
              Error,
              "invalid UTF-8 sequence",
              true,
              1007,
              "WS_ERR_INVALID_UTF8"
            );
            cb(error);
            return;
          }
          if (this._state === INFLATING || this._allowSynchronousEvents) {
            this.emit("message", buf, false);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", buf, false);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        }
      }
      /**
       * Handles a control message.
       *
       * @param {Buffer} data Data to handle
       * @return {(Error|RangeError|undefined)} A possible error
       * @private
       */
      controlMessage(data, cb) {
        if (this._opcode === 8) {
          if (data.length === 0) {
            this._loop = false;
            this.emit("conclude", 1005, EMPTY_BUFFER);
            this.end();
          } else {
            const code = data.readUInt16BE(0);
            if (!isValidStatusCode(code)) {
              const error = this.createError(
                RangeError,
                `invalid status code ${code}`,
                true,
                1002,
                "WS_ERR_INVALID_CLOSE_CODE"
              );
              cb(error);
              return;
            }
            const buf = new FastBuffer(
              data.buffer,
              data.byteOffset + 2,
              data.length - 2
            );
            if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
              const error = this.createError(
                Error,
                "invalid UTF-8 sequence",
                true,
                1007,
                "WS_ERR_INVALID_UTF8"
              );
              cb(error);
              return;
            }
            this._loop = false;
            this.emit("conclude", code, buf);
            this.end();
          }
          this._state = GET_INFO;
          return;
        }
        if (this._allowSynchronousEvents) {
          this.emit(this._opcode === 9 ? "ping" : "pong", data);
          this._state = GET_INFO;
        } else {
          this._state = DEFER_EVENT;
          setImmediate(() => {
            this.emit(this._opcode === 9 ? "ping" : "pong", data);
            this._state = GET_INFO;
            this.startLoop(cb);
          });
        }
      }
      /**
       * Builds an error object.
       *
       * @param {function(new:Error|RangeError)} ErrorCtor The error constructor
       * @param {String} message The error message
       * @param {Boolean} prefix Specifies whether or not to add a default prefix to
       *     `message`
       * @param {Number} statusCode The status code
       * @param {String} errorCode The exposed error code
       * @return {(Error|RangeError)} The error
       * @private
       */
      createError(ErrorCtor, message, prefix, statusCode, errorCode) {
        this._loop = false;
        this._errored = true;
        const err = new ErrorCtor(
          prefix ? `Invalid WebSocket frame: ${message}` : message
        );
        Error.captureStackTrace(err, this.createError);
        err.code = errorCode;
        err[kStatusCode] = statusCode;
        return err;
      }
    };
    module.exports = Receiver2;
  }
});

// ../../../opt/npm-tools/node_modules/ws/lib/sender.js
var require_sender = __commonJS({
  "../../../opt/npm-tools/node_modules/ws/lib/sender.js"(exports, module) {
    "use strict";
    var { Duplex } = __require("stream");
    var { randomFillSync } = __require("crypto");
    var {
      types: { isUint8Array }
    } = __require("util");
    var PerMessageDeflate2 = require_permessage_deflate();
    var { EMPTY_BUFFER, kWebSocket, NOOP } = require_constants();
    var { isBlob, isValidStatusCode } = require_validation();
    var { mask: applyMask, toBuffer } = require_buffer_util();
    var kByteLength = /* @__PURE__ */ Symbol("kByteLength");
    var maskBuffer = Buffer.alloc(4);
    var RANDOM_POOL_SIZE = 8 * 1024;
    var randomPool;
    var randomPoolPointer = RANDOM_POOL_SIZE;
    var DEFAULT = 0;
    var DEFLATING = 1;
    var GET_BLOB_DATA = 2;
    var Sender2 = class _Sender {
      /**
       * Creates a Sender instance.
       *
       * @param {Duplex} socket The connection socket
       * @param {Object} [extensions] An object containing the negotiated extensions
       * @param {Function} [generateMask] The function used to generate the masking
       *     key
       */
      constructor(socket, extensions, generateMask) {
        this._extensions = extensions || {};
        if (generateMask) {
          this._generateMask = generateMask;
          this._maskBuffer = Buffer.alloc(4);
        }
        this._socket = socket;
        this._firstFragment = true;
        this._compress = false;
        this._bufferedBytes = 0;
        this._queue = [];
        this._state = DEFAULT;
        this.onerror = NOOP;
        this[kWebSocket] = void 0;
      }
      /**
       * Frames a piece of data according to the HyBi WebSocket protocol.
       *
       * @param {(Buffer|String)} data The data to frame
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @return {(Buffer|String)[]} The framed data
       * @public
       */
      static frame(data, options) {
        let mask;
        let merge = false;
        let offset = 2;
        let skipMasking = false;
        if (options.mask) {
          mask = options.maskBuffer || maskBuffer;
          if (options.generateMask) {
            options.generateMask(mask);
          } else {
            if (randomPoolPointer === RANDOM_POOL_SIZE) {
              if (randomPool === void 0) {
                randomPool = Buffer.alloc(RANDOM_POOL_SIZE);
              }
              randomFillSync(randomPool, 0, RANDOM_POOL_SIZE);
              randomPoolPointer = 0;
            }
            mask[0] = randomPool[randomPoolPointer++];
            mask[1] = randomPool[randomPoolPointer++];
            mask[2] = randomPool[randomPoolPointer++];
            mask[3] = randomPool[randomPoolPointer++];
          }
          skipMasking = (mask[0] | mask[1] | mask[2] | mask[3]) === 0;
          offset = 6;
        }
        let dataLength;
        if (typeof data === "string") {
          if ((!options.mask || skipMasking) && options[kByteLength] !== void 0) {
            dataLength = options[kByteLength];
          } else {
            data = Buffer.from(data);
            dataLength = data.length;
          }
        } else {
          dataLength = data.length;
          merge = options.mask && options.readOnly && !skipMasking;
        }
        let payloadLength = dataLength;
        if (dataLength >= 65536) {
          offset += 8;
          payloadLength = 127;
        } else if (dataLength > 125) {
          offset += 2;
          payloadLength = 126;
        }
        const target = Buffer.allocUnsafe(merge ? dataLength + offset : offset);
        target[0] = options.fin ? options.opcode | 128 : options.opcode;
        if (options.rsv1) target[0] |= 64;
        target[1] = payloadLength;
        if (payloadLength === 126) {
          target.writeUInt16BE(dataLength, 2);
        } else if (payloadLength === 127) {
          target[2] = target[3] = 0;
          target.writeUIntBE(dataLength, 4, 6);
        }
        if (!options.mask) return [target, data];
        target[1] |= 128;
        target[offset - 4] = mask[0];
        target[offset - 3] = mask[1];
        target[offset - 2] = mask[2];
        target[offset - 1] = mask[3];
        if (skipMasking) return [target, data];
        if (merge) {
          applyMask(data, mask, target, offset, dataLength);
          return [target];
        }
        applyMask(data, mask, data, 0, dataLength);
        return [target, data];
      }
      /**
       * Sends a close message to the other peer.
       *
       * @param {Number} [code] The status code component of the body
       * @param {(String|Buffer)} [data] The message component of the body
       * @param {Boolean} [mask=false] Specifies whether or not to mask the message
       * @param {Function} [cb] Callback
       * @public
       */
      close(code, data, mask, cb) {
        let buf;
        if (code === void 0) {
          buf = EMPTY_BUFFER;
        } else if (typeof code !== "number" || !isValidStatusCode(code)) {
          throw new TypeError("First argument must be a valid error code number");
        } else if (data === void 0 || !data.length) {
          buf = Buffer.allocUnsafe(2);
          buf.writeUInt16BE(code, 0);
        } else {
          const length = Buffer.byteLength(data);
          if (length > 123) {
            throw new RangeError("The message must not be greater than 123 bytes");
          }
          buf = Buffer.allocUnsafe(2 + length);
          buf.writeUInt16BE(code, 0);
          if (typeof data === "string") {
            buf.write(data, 2);
          } else if (isUint8Array(data)) {
            buf.set(data, 2);
          } else {
            throw new TypeError("Second argument must be a string or a Uint8Array");
          }
        }
        const options = {
          [kByteLength]: buf.length,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 8,
          readOnly: false,
          rsv1: false
        };
        if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, buf, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(buf, options), cb);
        }
      }
      /**
       * Sends a ping message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      ping(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 9,
          readOnly,
          rsv1: false
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, false, options, cb]);
          } else {
            this.getBlobData(data, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a pong message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      pong(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 10,
          readOnly,
          rsv1: false
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, false, options, cb]);
          } else {
            this.getBlobData(data, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a data message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Object} options Options object
       * @param {Boolean} [options.binary=false] Specifies whether `data` is binary
       *     or text
       * @param {Boolean} [options.compress=false] Specifies whether or not to
       *     compress `data`
       * @param {Boolean} [options.fin=false] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Function} [cb] Callback
       * @public
       */
      send(data, options, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        let opcode = options.binary ? 2 : 1;
        let rsv1 = options.compress;
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (this._firstFragment) {
          this._firstFragment = false;
          if (rsv1 && perMessageDeflate && perMessageDeflate.params[perMessageDeflate._isServer ? "server_no_context_takeover" : "client_no_context_takeover"]) {
            rsv1 = byteLength >= perMessageDeflate._threshold;
          }
          this._compress = rsv1;
        } else {
          rsv1 = false;
          opcode = 0;
        }
        if (options.fin) this._firstFragment = true;
        const opts = {
          [kByteLength]: byteLength,
          fin: options.fin,
          generateMask: this._generateMask,
          mask: options.mask,
          maskBuffer: this._maskBuffer,
          opcode,
          readOnly,
          rsv1
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, this._compress, opts, cb]);
          } else {
            this.getBlobData(data, this._compress, opts, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, this._compress, opts, cb]);
        } else {
          this.dispatch(data, this._compress, opts, cb);
        }
      }
      /**
       * Gets the contents of a blob as binary data.
       *
       * @param {Blob} blob The blob
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     the data
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      getBlobData(blob, compress, options, cb) {
        this._bufferedBytes += options[kByteLength];
        this._state = GET_BLOB_DATA;
        blob.arrayBuffer().then((arrayBuffer) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while the blob was being read"
            );
            process.nextTick(callCallbacks, this, err, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          const data = toBuffer(arrayBuffer);
          if (!compress) {
            this._state = DEFAULT;
            this.sendFrame(_Sender.frame(data, options), cb);
            this.dequeue();
          } else {
            this.dispatch(data, compress, options, cb);
          }
        }).catch((err) => {
          process.nextTick(onError, this, err, cb);
        });
      }
      /**
       * Dispatches a message.
       *
       * @param {(Buffer|String)} data The message to send
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     `data`
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      dispatch(data, compress, options, cb) {
        if (!compress) {
          this.sendFrame(_Sender.frame(data, options), cb);
          return;
        }
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        this._bufferedBytes += options[kByteLength];
        this._state = DEFLATING;
        perMessageDeflate.compress(data, options.fin, (_, buf) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while data was being compressed"
            );
            callCallbacks(this, err, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          this._state = DEFAULT;
          options.readOnly = false;
          this.sendFrame(_Sender.frame(buf, options), cb);
          this.dequeue();
        });
      }
      /**
       * Executes queued send operations.
       *
       * @private
       */
      dequeue() {
        while (this._state === DEFAULT && this._queue.length) {
          const params = this._queue.shift();
          this._bufferedBytes -= params[3][kByteLength];
          Reflect.apply(params[0], this, params.slice(1));
        }
      }
      /**
       * Enqueues a send operation.
       *
       * @param {Array} params Send operation parameters.
       * @private
       */
      enqueue(params) {
        this._bufferedBytes += params[3][kByteLength];
        this._queue.push(params);
      }
      /**
       * Sends a frame.
       *
       * @param {(Buffer | String)[]} list The frame to send
       * @param {Function} [cb] Callback
       * @private
       */
      sendFrame(list, cb) {
        if (list.length === 2) {
          this._socket.cork();
          this._socket.write(list[0]);
          this._socket.write(list[1], cb);
          this._socket.uncork();
        } else {
          this._socket.write(list[0], cb);
        }
      }
    };
    module.exports = Sender2;
    function callCallbacks(sender, err, cb) {
      if (typeof cb === "function") cb(err);
      for (let i = 0; i < sender._queue.length; i++) {
        const params = sender._queue[i];
        const callback = params[params.length - 1];
        if (typeof callback === "function") callback(err);
      }
    }
    function onError(sender, err, cb) {
      callCallbacks(sender, err, cb);
      sender.onerror(err);
    }
  }
});

// ../../../opt/npm-tools/node_modules/ws/lib/event-target.js
var require_event_target = __commonJS({
  "../../../opt/npm-tools/node_modules/ws/lib/event-target.js"(exports, module) {
    "use strict";
    var { kForOnEventAttribute, kListener } = require_constants();
    var kCode = /* @__PURE__ */ Symbol("kCode");
    var kData = /* @__PURE__ */ Symbol("kData");
    var kError = /* @__PURE__ */ Symbol("kError");
    var kMessage = /* @__PURE__ */ Symbol("kMessage");
    var kReason = /* @__PURE__ */ Symbol("kReason");
    var kTarget = /* @__PURE__ */ Symbol("kTarget");
    var kType = /* @__PURE__ */ Symbol("kType");
    var kWasClean = /* @__PURE__ */ Symbol("kWasClean");
    var Event = class {
      /**
       * Create a new `Event`.
       *
       * @param {String} type The name of the event
       * @throws {TypeError} If the `type` argument is not specified
       */
      constructor(type) {
        this[kTarget] = null;
        this[kType] = type;
      }
      /**
       * @type {*}
       */
      get target() {
        return this[kTarget];
      }
      /**
       * @type {String}
       */
      get type() {
        return this[kType];
      }
    };
    Object.defineProperty(Event.prototype, "target", { enumerable: true });
    Object.defineProperty(Event.prototype, "type", { enumerable: true });
    var CloseEvent = class extends Event {
      /**
       * Create a new `CloseEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {Number} [options.code=0] The status code explaining why the
       *     connection was closed
       * @param {String} [options.reason=''] A human-readable string explaining why
       *     the connection was closed
       * @param {Boolean} [options.wasClean=false] Indicates whether or not the
       *     connection was cleanly closed
       */
      constructor(type, options = {}) {
        super(type);
        this[kCode] = options.code === void 0 ? 0 : options.code;
        this[kReason] = options.reason === void 0 ? "" : options.reason;
        this[kWasClean] = options.wasClean === void 0 ? false : options.wasClean;
      }
      /**
       * @type {Number}
       */
      get code() {
        return this[kCode];
      }
      /**
       * @type {String}
       */
      get reason() {
        return this[kReason];
      }
      /**
       * @type {Boolean}
       */
      get wasClean() {
        return this[kWasClean];
      }
    };
    Object.defineProperty(CloseEvent.prototype, "code", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "reason", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "wasClean", { enumerable: true });
    var ErrorEvent = class extends Event {
      /**
       * Create a new `ErrorEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.error=null] The error that generated this event
       * @param {String} [options.message=''] The error message
       */
      constructor(type, options = {}) {
        super(type);
        this[kError] = options.error === void 0 ? null : options.error;
        this[kMessage] = options.message === void 0 ? "" : options.message;
      }
      /**
       * @type {*}
       */
      get error() {
        return this[kError];
      }
      /**
       * @type {String}
       */
      get message() {
        return this[kMessage];
      }
    };
    Object.defineProperty(ErrorEvent.prototype, "error", { enumerable: true });
    Object.defineProperty(ErrorEvent.prototype, "message", { enumerable: true });
    var MessageEvent = class extends Event {
      /**
       * Create a new `MessageEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.data=null] The message content
       */
      constructor(type, options = {}) {
        super(type);
        this[kData] = options.data === void 0 ? null : options.data;
      }
      /**
       * @type {*}
       */
      get data() {
        return this[kData];
      }
    };
    Object.defineProperty(MessageEvent.prototype, "data", { enumerable: true });
    var EventTarget = {
      /**
       * Register an event listener.
       *
       * @param {String} type A string representing the event type to listen for
       * @param {(Function|Object)} handler The listener to add
       * @param {Object} [options] An options object specifies characteristics about
       *     the event listener
       * @param {Boolean} [options.once=false] A `Boolean` indicating that the
       *     listener should be invoked at most once after being added. If `true`,
       *     the listener would be automatically removed when invoked.
       * @public
       */
      addEventListener(type, handler, options = {}) {
        for (const listener of this.listeners(type)) {
          if (!options[kForOnEventAttribute] && listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            return;
          }
        }
        let wrapper;
        if (type === "message") {
          wrapper = function onMessage(data, isBinary) {
            const event = new MessageEvent("message", {
              data: isBinary ? data : data.toString()
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "close") {
          wrapper = function onClose(code, message) {
            const event = new CloseEvent("close", {
              code,
              reason: message.toString(),
              wasClean: this._closeFrameReceived && this._closeFrameSent
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "error") {
          wrapper = function onError(error) {
            const event = new ErrorEvent("error", {
              error,
              message: error.message
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "open") {
          wrapper = function onOpen() {
            const event = new Event("open");
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else {
          return;
        }
        wrapper[kForOnEventAttribute] = !!options[kForOnEventAttribute];
        wrapper[kListener] = handler;
        if (options.once) {
          this.once(type, wrapper);
        } else {
          this.on(type, wrapper);
        }
      },
      /**
       * Remove an event listener.
       *
       * @param {String} type A string representing the event type to remove
       * @param {(Function|Object)} handler The listener to remove
       * @public
       */
      removeEventListener(type, handler) {
        for (const listener of this.listeners(type)) {
          if (listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            this.removeListener(type, listener);
            break;
          }
        }
      }
    };
    module.exports = {
      CloseEvent,
      ErrorEvent,
      Event,
      EventTarget,
      MessageEvent
    };
    function callListener(listener, thisArg, event) {
      if (typeof listener === "object" && listener.handleEvent) {
        listener.handleEvent.call(listener, event);
      } else {
        listener.call(thisArg, event);
      }
    }
  }
});

// ../../../opt/npm-tools/node_modules/ws/lib/extension.js
var require_extension = __commonJS({
  "../../../opt/npm-tools/node_modules/ws/lib/extension.js"(exports, module) {
    "use strict";
    var { tokenChars } = require_validation();
    function push(dest, name, elem) {
      if (dest[name] === void 0) dest[name] = [elem];
      else dest[name].push(elem);
    }
    function parse(header) {
      const offers = /* @__PURE__ */ Object.create(null);
      let params = /* @__PURE__ */ Object.create(null);
      let mustUnescape = false;
      let isEscaping = false;
      let inQuotes = false;
      let extensionName;
      let paramName;
      let start = -1;
      let code = -1;
      let end = -1;
      let i = 0;
      for (; i < header.length; i++) {
        code = header.charCodeAt(i);
        if (extensionName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (i !== 0 && (code === 32 || code === 9)) {
            if (end === -1 && start !== -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            const name = header.slice(start, end);
            if (code === 44) {
              push(offers, name, params);
              params = /* @__PURE__ */ Object.create(null);
            } else {
              extensionName = name;
            }
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else if (paramName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (code === 32 || code === 9) {
            if (end === -1 && start !== -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            push(params, header.slice(start, end), true);
            if (code === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            start = end = -1;
          } else if (code === 61 && start !== -1 && end === -1) {
            paramName = header.slice(start, i);
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else {
          if (isEscaping) {
            if (tokenChars[code] !== 1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (start === -1) start = i;
            else if (!mustUnescape) mustUnescape = true;
            isEscaping = false;
          } else if (inQuotes) {
            if (tokenChars[code] === 1) {
              if (start === -1) start = i;
            } else if (code === 34 && start !== -1) {
              inQuotes = false;
              end = i;
            } else if (code === 92) {
              isEscaping = true;
            } else {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
          } else if (code === 34 && header.charCodeAt(i - 1) === 61) {
            inQuotes = true;
          } else if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (start !== -1 && (code === 32 || code === 9)) {
            if (end === -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            let value = header.slice(start, end);
            if (mustUnescape) {
              value = value.replace(/\\/g, "");
              mustUnescape = false;
            }
            push(params, paramName, value);
            if (code === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            paramName = void 0;
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        }
      }
      if (start === -1 || inQuotes || code === 32 || code === 9) {
        throw new SyntaxError("Unexpected end of input");
      }
      if (end === -1) end = i;
      const token = header.slice(start, end);
      if (extensionName === void 0) {
        push(offers, token, params);
      } else {
        if (paramName === void 0) {
          push(params, token, true);
        } else if (mustUnescape) {
          push(params, paramName, token.replace(/\\/g, ""));
        } else {
          push(params, paramName, token);
        }
        push(offers, extensionName, params);
      }
      return offers;
    }
    function format(extensions) {
      return Object.keys(extensions).map((extension2) => {
        let configurations = extensions[extension2];
        if (!Array.isArray(configurations)) configurations = [configurations];
        return configurations.map((params) => {
          return [extension2].concat(
            Object.keys(params).map((k) => {
              let values = params[k];
              if (!Array.isArray(values)) values = [values];
              return values.map((v) => v === true ? k : `${k}=${v}`).join("; ");
            })
          ).join("; ");
        }).join(", ");
      }).join(", ");
    }
    module.exports = { format, parse };
  }
});

// ../../../opt/npm-tools/node_modules/ws/lib/websocket.js
var require_websocket = __commonJS({
  "../../../opt/npm-tools/node_modules/ws/lib/websocket.js"(exports, module) {
    "use strict";
    var EventEmitter = __require("events");
    var https = __require("https");
    var http = __require("http");
    var net = __require("net");
    var tls = __require("tls");
    var { randomBytes, createHash } = __require("crypto");
    var { Duplex, Readable } = __require("stream");
    var { URL: URL2 } = __require("url");
    var PerMessageDeflate2 = require_permessage_deflate();
    var Receiver2 = require_receiver();
    var Sender2 = require_sender();
    var { isBlob } = require_validation();
    var {
      BINARY_TYPES,
      CLOSE_TIMEOUT,
      EMPTY_BUFFER,
      GUID,
      kForOnEventAttribute,
      kListener,
      kStatusCode,
      kWebSocket,
      NOOP
    } = require_constants();
    var {
      EventTarget: { addEventListener, removeEventListener }
    } = require_event_target();
    var { format, parse } = require_extension();
    var { toBuffer } = require_buffer_util();
    var kAborted = /* @__PURE__ */ Symbol("kAborted");
    var protocolVersions = [8, 13];
    var readyStates = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"];
    var subprotocolRegex = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/;
    var WebSocket2 = class _WebSocket extends EventEmitter {
      /**
       * Create a new `WebSocket`.
       *
       * @param {(String|URL)} address The URL to which to connect
       * @param {(String|String[])} [protocols] The subprotocols
       * @param {Object} [options] Connection options
       */
      constructor(address, protocols, options) {
        super();
        this._binaryType = BINARY_TYPES[0];
        this._closeCode = 1006;
        this._closeFrameReceived = false;
        this._closeFrameSent = false;
        this._closeMessage = EMPTY_BUFFER;
        this._closeTimer = null;
        this._errorEmitted = false;
        this._extensions = {};
        this._paused = false;
        this._protocol = "";
        this._readyState = _WebSocket.CONNECTING;
        this._receiver = null;
        this._sender = null;
        this._socket = null;
        if (address !== null) {
          this._bufferedAmount = 0;
          this._isServer = false;
          this._redirects = 0;
          if (protocols === void 0) {
            protocols = [];
          } else if (!Array.isArray(protocols)) {
            if (typeof protocols === "object" && protocols !== null) {
              options = protocols;
              protocols = [];
            } else {
              protocols = [protocols];
            }
          }
          initAsClient(this, address, protocols, options);
        } else {
          this._autoPong = options.autoPong;
          this._closeTimeout = options.closeTimeout;
          this._isServer = true;
        }
      }
      /**
       * For historical reasons, the custom "nodebuffer" type is used by the default
       * instead of "blob".
       *
       * @type {String}
       */
      get binaryType() {
        return this._binaryType;
      }
      set binaryType(type) {
        if (!BINARY_TYPES.includes(type)) return;
        this._binaryType = type;
        if (this._receiver) this._receiver._binaryType = type;
      }
      /**
       * @type {Number}
       */
      get bufferedAmount() {
        if (!this._socket) return this._bufferedAmount;
        return this._socket._writableState.length + this._sender._bufferedBytes;
      }
      /**
       * @type {String}
       */
      get extensions() {
        return Object.keys(this._extensions).join();
      }
      /**
       * @type {Boolean}
       */
      get isPaused() {
        return this._paused;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onclose() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onerror() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onopen() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onmessage() {
        return null;
      }
      /**
       * @type {String}
       */
      get protocol() {
        return this._protocol;
      }
      /**
       * @type {Number}
       */
      get readyState() {
        return this._readyState;
      }
      /**
       * @type {String}
       */
      get url() {
        return this._url;
      }
      /**
       * Set up the socket and the internal resources.
       *
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Object} options Options object
       * @param {Boolean} [options.allowSynchronousEvents=false] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Number} [options.maxBufferedChunks=0] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=0] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=0] The maximum allowed message size
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @private
       */
      setSocket(socket, head, options) {
        const receiver = new Receiver2({
          allowSynchronousEvents: options.allowSynchronousEvents,
          binaryType: this.binaryType,
          extensions: this._extensions,
          isServer: this._isServer,
          maxBufferedChunks: options.maxBufferedChunks,
          maxFragments: options.maxFragments,
          maxPayload: options.maxPayload,
          skipUTF8Validation: options.skipUTF8Validation
        });
        const sender = new Sender2(socket, this._extensions, options.generateMask);
        this._receiver = receiver;
        this._sender = sender;
        this._socket = socket;
        receiver[kWebSocket] = this;
        sender[kWebSocket] = this;
        socket[kWebSocket] = this;
        receiver.on("conclude", receiverOnConclude);
        receiver.on("drain", receiverOnDrain);
        receiver.on("error", receiverOnError);
        receiver.on("message", receiverOnMessage);
        receiver.on("ping", receiverOnPing);
        receiver.on("pong", receiverOnPong);
        sender.onerror = senderOnError;
        if (socket.setTimeout) socket.setTimeout(0);
        if (socket.setNoDelay) socket.setNoDelay();
        if (head.length > 0) socket.unshift(head);
        socket.on("close", socketOnClose);
        socket.on("data", socketOnData);
        socket.on("end", socketOnEnd);
        socket.on("error", socketOnError);
        this._readyState = _WebSocket.OPEN;
        this.emit("open");
      }
      /**
       * Emit the `'close'` event.
       *
       * @private
       */
      emitClose() {
        if (!this._socket) {
          this._readyState = _WebSocket.CLOSED;
          this.emit("close", this._closeCode, this._closeMessage);
          return;
        }
        if (this._extensions[PerMessageDeflate2.extensionName]) {
          this._extensions[PerMessageDeflate2.extensionName].cleanup();
        }
        this._receiver.removeAllListeners();
        this._readyState = _WebSocket.CLOSED;
        this.emit("close", this._closeCode, this._closeMessage);
      }
      /**
       * Start a closing handshake.
       *
       *          +----------+   +-----------+   +----------+
       *     - - -|ws.close()|-->|close frame|-->|ws.close()|- - -
       *    |     +----------+   +-----------+   +----------+     |
       *          +----------+   +-----------+         |
       * CLOSING  |ws.close()|<--|close frame|<--+-----+       CLOSING
       *          +----------+   +-----------+   |
       *    |           |                        |   +---+        |
       *                +------------------------+-->|fin| - - - -
       *    |         +---+                      |   +---+
       *     - - - - -|fin|<---------------------+
       *              +---+
       *
       * @param {Number} [code] Status code explaining why the connection is closing
       * @param {(String|Buffer)} [data] The reason why the connection is
       *     closing
       * @public
       */
      close(code, data) {
        if (this.readyState === _WebSocket.CLOSED) return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this.readyState === _WebSocket.CLOSING) {
          if (this._closeFrameSent && (this._closeFrameReceived || this._receiver._writableState.errorEmitted)) {
            this._socket.end();
          }
          return;
        }
        this._readyState = _WebSocket.CLOSING;
        this._sender.close(code, data, !this._isServer, (err) => {
          if (err) return;
          this._closeFrameSent = true;
          if (this._closeFrameReceived || this._receiver._writableState.errorEmitted) {
            this._socket.end();
          }
        });
        setCloseTimer(this);
      }
      /**
       * Pause the socket.
       *
       * @public
       */
      pause() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = true;
        this._socket.pause();
      }
      /**
       * Send a ping.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the ping is sent
       * @public
       */
      ping(data, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0) mask = !this._isServer;
        this._sender.ping(data || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Send a pong.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the pong is sent
       * @public
       */
      pong(data, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0) mask = !this._isServer;
        this._sender.pong(data || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Resume the socket.
       *
       * @public
       */
      resume() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = false;
        if (!this._receiver._writableState.needDrain) this._socket.resume();
      }
      /**
       * Send a data message.
       *
       * @param {*} data The message to send
       * @param {Object} [options] Options object
       * @param {Boolean} [options.binary] Specifies whether `data` is binary or
       *     text
       * @param {Boolean} [options.compress] Specifies whether or not to compress
       *     `data`
       * @param {Boolean} [options.fin=true] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when data is written out
       * @public
       */
      send(data, options, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof options === "function") {
          cb = options;
          options = {};
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        const opts = {
          binary: typeof data !== "string",
          mask: !this._isServer,
          compress: true,
          fin: true,
          ...options
        };
        if (!this._extensions[PerMessageDeflate2.extensionName]) {
          opts.compress = false;
        }
        this._sender.send(data || EMPTY_BUFFER, opts, cb);
      }
      /**
       * Forcibly close the connection.
       *
       * @public
       */
      terminate() {
        if (this.readyState === _WebSocket.CLOSED) return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this._socket) {
          this._readyState = _WebSocket.CLOSING;
          this._socket.destroy();
        }
      }
    };
    Object.defineProperty(WebSocket2, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket2.prototype, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket2, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket2.prototype, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket2, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket2.prototype, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket2, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    Object.defineProperty(WebSocket2.prototype, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    [
      "binaryType",
      "bufferedAmount",
      "extensions",
      "isPaused",
      "protocol",
      "readyState",
      "url"
    ].forEach((property) => {
      Object.defineProperty(WebSocket2.prototype, property, { enumerable: true });
    });
    ["open", "error", "close", "message"].forEach((method) => {
      Object.defineProperty(WebSocket2.prototype, `on${method}`, {
        enumerable: true,
        get() {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) return listener[kListener];
          }
          return null;
        },
        set(handler) {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) {
              this.removeListener(method, listener);
              break;
            }
          }
          if (typeof handler !== "function") return;
          this.addEventListener(method, handler, {
            [kForOnEventAttribute]: true
          });
        }
      });
    });
    WebSocket2.prototype.addEventListener = addEventListener;
    WebSocket2.prototype.removeEventListener = removeEventListener;
    module.exports = WebSocket2;
    function initAsClient(websocket, address, protocols, options) {
      const opts = {
        allowSynchronousEvents: true,
        autoPong: true,
        closeTimeout: CLOSE_TIMEOUT,
        protocolVersion: protocolVersions[1],
        maxBufferedChunks: 256 * 1024,
        maxFragments: 16 * 1024,
        maxPayload: 100 * 1024 * 1024,
        skipUTF8Validation: false,
        perMessageDeflate: true,
        followRedirects: false,
        maxRedirects: 10,
        ...options,
        socketPath: void 0,
        hostname: void 0,
        protocol: void 0,
        timeout: void 0,
        method: "GET",
        host: void 0,
        path: void 0,
        port: void 0
      };
      websocket._autoPong = opts.autoPong;
      websocket._closeTimeout = opts.closeTimeout;
      if (!protocolVersions.includes(opts.protocolVersion)) {
        throw new RangeError(
          `Unsupported protocol version: ${opts.protocolVersion} (supported versions: ${protocolVersions.join(", ")})`
        );
      }
      let parsedUrl;
      if (address instanceof URL2) {
        parsedUrl = address;
      } else {
        try {
          parsedUrl = new URL2(address);
        } catch {
          throw new SyntaxError(`Invalid URL: ${address}`);
        }
      }
      if (parsedUrl.protocol === "http:") {
        parsedUrl.protocol = "ws:";
      } else if (parsedUrl.protocol === "https:") {
        parsedUrl.protocol = "wss:";
      }
      websocket._url = parsedUrl.href;
      const isSecure = parsedUrl.protocol === "wss:";
      const isIpcUrl = parsedUrl.protocol === "ws+unix:";
      let invalidUrlMessage;
      if (parsedUrl.protocol !== "ws:" && !isSecure && !isIpcUrl) {
        invalidUrlMessage = `The URL's protocol must be one of "ws:", "wss:", "http:", "https:", or "ws+unix:"`;
      } else if (isIpcUrl && !parsedUrl.pathname) {
        invalidUrlMessage = "The URL's pathname is empty";
      } else if (parsedUrl.hash) {
        invalidUrlMessage = "The URL contains a fragment identifier";
      }
      if (invalidUrlMessage) {
        const err = new SyntaxError(invalidUrlMessage);
        if (websocket._redirects === 0) {
          throw err;
        } else {
          emitErrorAndClose(websocket, err);
          return;
        }
      }
      const defaultPort = isSecure ? 443 : 80;
      const key = randomBytes(16).toString("base64");
      const request = isSecure ? https.request : http.request;
      const protocolSet = /* @__PURE__ */ new Set();
      let perMessageDeflate;
      opts.createConnection = opts.createConnection || (isSecure ? tlsConnect : netConnect);
      opts.defaultPort = opts.defaultPort || defaultPort;
      opts.port = parsedUrl.port || defaultPort;
      opts.host = parsedUrl.hostname.startsWith("[") ? parsedUrl.hostname.slice(1, -1) : parsedUrl.hostname;
      opts.headers = {
        ...opts.headers,
        "Sec-WebSocket-Version": opts.protocolVersion,
        "Sec-WebSocket-Key": key,
        Connection: "Upgrade",
        Upgrade: "websocket"
      };
      opts.path = parsedUrl.pathname + parsedUrl.search;
      opts.timeout = opts.handshakeTimeout;
      if (opts.perMessageDeflate) {
        perMessageDeflate = new PerMessageDeflate2({
          ...opts.perMessageDeflate,
          isServer: false,
          maxPayload: opts.maxPayload
        });
        opts.headers["Sec-WebSocket-Extensions"] = format({
          [PerMessageDeflate2.extensionName]: perMessageDeflate.offer()
        });
      }
      if (protocols.length) {
        for (const protocol of protocols) {
          if (typeof protocol !== "string" || !subprotocolRegex.test(protocol) || protocolSet.has(protocol)) {
            throw new SyntaxError(
              "An invalid or duplicated subprotocol was specified"
            );
          }
          protocolSet.add(protocol);
        }
        opts.headers["Sec-WebSocket-Protocol"] = protocols.join(",");
      }
      if (opts.origin) {
        if (opts.protocolVersion < 13) {
          opts.headers["Sec-WebSocket-Origin"] = opts.origin;
        } else {
          opts.headers.Origin = opts.origin;
        }
      }
      if (parsedUrl.username || parsedUrl.password) {
        opts.auth = `${parsedUrl.username}:${parsedUrl.password}`;
      }
      if (isIpcUrl) {
        const parts = opts.path.split(":");
        opts.socketPath = parts[0];
        opts.path = parts[1];
      }
      let req;
      if (opts.followRedirects) {
        if (websocket._redirects === 0) {
          websocket._originalIpc = isIpcUrl;
          websocket._originalSecure = isSecure;
          websocket._originalHostOrSocketPath = isIpcUrl ? opts.socketPath : parsedUrl.host;
          const headers = options && options.headers;
          options = { ...options, headers: {} };
          if (headers) {
            for (const [key2, value] of Object.entries(headers)) {
              options.headers[key2.toLowerCase()] = value;
            }
          }
        } else if (websocket.listenerCount("redirect") === 0) {
          const isSameHost = isIpcUrl ? websocket._originalIpc ? opts.socketPath === websocket._originalHostOrSocketPath : false : websocket._originalIpc ? false : parsedUrl.host === websocket._originalHostOrSocketPath;
          if (!isSameHost || websocket._originalSecure && !isSecure) {
            delete opts.headers.authorization;
            delete opts.headers.cookie;
            if (!isSameHost) delete opts.headers.host;
            opts.auth = void 0;
          }
        }
        if (opts.auth && !options.headers.authorization) {
          options.headers.authorization = "Basic " + Buffer.from(opts.auth).toString("base64");
        }
        req = websocket._req = request(opts);
        if (websocket._redirects) {
          websocket.emit("redirect", websocket.url, req);
        }
      } else {
        req = websocket._req = request(opts);
      }
      if (opts.timeout) {
        req.on("timeout", () => {
          abortHandshake(websocket, req, "Opening handshake has timed out");
        });
      }
      req.on("error", (err) => {
        if (req === null || req[kAborted]) return;
        req = websocket._req = null;
        emitErrorAndClose(websocket, err);
      });
      req.on("response", (res) => {
        const location = res.headers.location;
        const statusCode = res.statusCode;
        if (location && opts.followRedirects && statusCode >= 300 && statusCode < 400) {
          if (++websocket._redirects > opts.maxRedirects) {
            abortHandshake(websocket, req, "Maximum redirects exceeded");
            return;
          }
          req.abort();
          let addr;
          try {
            addr = new URL2(location, address);
          } catch (e) {
            const err = new SyntaxError(`Invalid URL: ${location}`);
            emitErrorAndClose(websocket, err);
            return;
          }
          initAsClient(websocket, addr, protocols, options);
        } else if (!websocket.emit("unexpected-response", req, res)) {
          abortHandshake(
            websocket,
            req,
            `Unexpected server response: ${res.statusCode}`
          );
        }
      });
      req.on("upgrade", (res, socket, head) => {
        websocket.emit("upgrade", res);
        if (websocket.readyState !== WebSocket2.CONNECTING) return;
        req = websocket._req = null;
        const upgrade = res.headers.upgrade;
        if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
          abortHandshake(websocket, socket, "Invalid Upgrade header");
          return;
        }
        const digest = createHash("sha1").update(key + GUID).digest("base64");
        if (res.headers["sec-websocket-accept"] !== digest) {
          abortHandshake(websocket, socket, "Invalid Sec-WebSocket-Accept header");
          return;
        }
        const serverProt = res.headers["sec-websocket-protocol"];
        let protError;
        if (serverProt !== void 0) {
          if (!protocolSet.size) {
            protError = "Server sent a subprotocol but none was requested";
          } else if (!protocolSet.has(serverProt)) {
            protError = "Server sent an invalid subprotocol";
          }
        } else if (protocolSet.size) {
          protError = "Server sent no subprotocol";
        }
        if (protError) {
          abortHandshake(websocket, socket, protError);
          return;
        }
        if (serverProt) websocket._protocol = serverProt;
        const secWebSocketExtensions = res.headers["sec-websocket-extensions"];
        if (secWebSocketExtensions !== void 0) {
          if (!perMessageDeflate) {
            const message = "Server sent a Sec-WebSocket-Extensions header but no extension was requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          let extensions;
          try {
            extensions = parse(secWebSocketExtensions);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          const extensionNames = Object.keys(extensions);
          if (extensionNames.length !== 1 || extensionNames[0] !== PerMessageDeflate2.extensionName) {
            const message = "Server indicated an extension that was not requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          try {
            perMessageDeflate.accept(extensions[PerMessageDeflate2.extensionName]);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          websocket._extensions[PerMessageDeflate2.extensionName] = perMessageDeflate;
        }
        websocket.setSocket(socket, head, {
          allowSynchronousEvents: opts.allowSynchronousEvents,
          generateMask: opts.generateMask,
          maxBufferedChunks: opts.maxBufferedChunks,
          maxFragments: opts.maxFragments,
          maxPayload: opts.maxPayload,
          skipUTF8Validation: opts.skipUTF8Validation
        });
      });
      if (opts.finishRequest) {
        opts.finishRequest(req, websocket);
      } else {
        req.end();
      }
    }
    function emitErrorAndClose(websocket, err) {
      websocket._readyState = WebSocket2.CLOSING;
      websocket._errorEmitted = true;
      websocket.emit("error", err);
      websocket.emitClose();
    }
    function netConnect(options) {
      options.path = options.socketPath;
      return net.connect(options);
    }
    function tlsConnect(options) {
      options.path = void 0;
      if (!options.servername && options.servername !== "") {
        options.servername = net.isIP(options.host) ? "" : options.host;
      }
      return tls.connect(options);
    }
    function abortHandshake(websocket, stream, message) {
      websocket._readyState = WebSocket2.CLOSING;
      const err = new Error(message);
      Error.captureStackTrace(err, abortHandshake);
      if (stream.setHeader) {
        stream[kAborted] = true;
        stream.abort();
        if (stream.socket && !stream.socket.destroyed) {
          stream.socket.destroy();
        }
        process.nextTick(emitErrorAndClose, websocket, err);
      } else {
        stream.destroy(err);
        stream.once("error", websocket.emit.bind(websocket, "error"));
        stream.once("close", websocket.emitClose.bind(websocket));
      }
    }
    function sendAfterClose(websocket, data, cb) {
      if (data) {
        const length = isBlob(data) ? data.size : toBuffer(data).length;
        if (websocket._socket) websocket._sender._bufferedBytes += length;
        else websocket._bufferedAmount += length;
      }
      if (cb) {
        const err = new Error(
          `WebSocket is not open: readyState ${websocket.readyState} (${readyStates[websocket.readyState]})`
        );
        process.nextTick(cb, err);
      }
    }
    function receiverOnConclude(code, reason) {
      const websocket = this[kWebSocket];
      websocket._closeFrameReceived = true;
      websocket._closeMessage = reason;
      websocket._closeCode = code;
      if (websocket._socket[kWebSocket] === void 0) return;
      websocket._socket.removeListener("data", socketOnData);
      process.nextTick(resume, websocket._socket);
      if (code === 1005) websocket.close();
      else websocket.close(code, reason);
    }
    function receiverOnDrain() {
      const websocket = this[kWebSocket];
      if (!websocket.isPaused) websocket._socket.resume();
    }
    function receiverOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket._socket[kWebSocket] !== void 0) {
        websocket._socket.removeListener("data", socketOnData);
        process.nextTick(resume, websocket._socket);
        websocket.close(err[kStatusCode]);
      }
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err);
      }
    }
    function receiverOnFinish() {
      this[kWebSocket].emitClose();
    }
    function receiverOnMessage(data, isBinary) {
      this[kWebSocket].emit("message", data, isBinary);
    }
    function receiverOnPing(data) {
      const websocket = this[kWebSocket];
      if (websocket._autoPong) websocket.pong(data, !this._isServer, NOOP);
      websocket.emit("ping", data);
    }
    function receiverOnPong(data) {
      this[kWebSocket].emit("pong", data);
    }
    function resume(stream) {
      stream.resume();
    }
    function senderOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket.readyState === WebSocket2.CLOSED) return;
      if (websocket.readyState === WebSocket2.OPEN) {
        websocket._readyState = WebSocket2.CLOSING;
        setCloseTimer(websocket);
      }
      this._socket.end();
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err);
      }
    }
    function setCloseTimer(websocket) {
      websocket._closeTimer = setTimeout(
        websocket._socket.destroy.bind(websocket._socket),
        websocket._closeTimeout
      );
    }
    function socketOnClose() {
      const websocket = this[kWebSocket];
      this.removeListener("close", socketOnClose);
      this.removeListener("data", socketOnData);
      this.removeListener("end", socketOnEnd);
      websocket._readyState = WebSocket2.CLOSING;
      if (!this._readableState.endEmitted && !websocket._closeFrameReceived && !websocket._receiver._writableState.errorEmitted && this._readableState.length !== 0) {
        const chunk = this.read(this._readableState.length);
        websocket._receiver.write(chunk);
      }
      websocket._receiver.end();
      this[kWebSocket] = void 0;
      clearTimeout(websocket._closeTimer);
      if (websocket._receiver._writableState.finished || websocket._receiver._writableState.errorEmitted) {
        websocket.emitClose();
      } else {
        websocket._receiver.on("error", receiverOnFinish);
        websocket._receiver.on("finish", receiverOnFinish);
      }
    }
    function socketOnData(chunk) {
      if (!this[kWebSocket]._receiver.write(chunk)) {
        this.pause();
      }
    }
    function socketOnEnd() {
      const websocket = this[kWebSocket];
      websocket._readyState = WebSocket2.CLOSING;
      websocket._receiver.end();
      this.end();
    }
    function socketOnError() {
      const websocket = this[kWebSocket];
      this.removeListener("error", socketOnError);
      this.on("error", NOOP);
      if (websocket) {
        websocket._readyState = WebSocket2.CLOSING;
        this.destroy();
      }
    }
  }
});

// ../../../opt/npm-tools/node_modules/ws/lib/stream.js
var require_stream = __commonJS({
  "../../../opt/npm-tools/node_modules/ws/lib/stream.js"(exports, module) {
    "use strict";
    var WebSocket2 = require_websocket();
    var { Duplex } = __require("stream");
    function emitClose(stream) {
      stream.emit("close");
    }
    function duplexOnEnd() {
      if (!this.destroyed && this._writableState.finished) {
        this.destroy();
      }
    }
    function duplexOnError(err) {
      this.removeListener("error", duplexOnError);
      this.destroy();
      if (this.listenerCount("error") === 0) {
        this.emit("error", err);
      }
    }
    function createWebSocketStream2(ws, options) {
      let terminateOnDestroy = true;
      const duplex = new Duplex({
        ...options,
        autoDestroy: false,
        emitClose: false,
        objectMode: false,
        writableObjectMode: false
      });
      ws.on("message", function message(msg, isBinary) {
        const data = !isBinary && duplex._readableState.objectMode ? msg.toString() : msg;
        if (!duplex.push(data)) ws.pause();
      });
      ws.once("error", function error(err) {
        if (duplex.destroyed) return;
        terminateOnDestroy = false;
        duplex.destroy(err);
      });
      ws.once("close", function close() {
        if (duplex.destroyed) return;
        duplex.push(null);
      });
      duplex._destroy = function(err, callback) {
        if (ws.readyState === ws.CLOSED) {
          callback(err);
          process.nextTick(emitClose, duplex);
          return;
        }
        let called = false;
        ws.once("error", function error(err2) {
          called = true;
          callback(err2);
        });
        ws.once("close", function close() {
          if (!called) callback(err);
          process.nextTick(emitClose, duplex);
        });
        if (terminateOnDestroy) ws.terminate();
      };
      duplex._final = function(callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open() {
            duplex._final(callback);
          });
          return;
        }
        if (ws._socket === null) return;
        if (ws._socket._writableState.finished) {
          callback();
          if (duplex._readableState.endEmitted) duplex.destroy();
        } else {
          ws._socket.once("finish", function finish() {
            callback();
          });
          ws.close();
        }
      };
      duplex._read = function() {
        if (ws.isPaused) ws.resume();
      };
      duplex._write = function(chunk, encoding, callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open() {
            duplex._write(chunk, encoding, callback);
          });
          return;
        }
        ws.send(chunk, callback);
      };
      duplex.on("end", duplexOnEnd);
      duplex.on("error", duplexOnError);
      return duplex;
    }
    module.exports = createWebSocketStream2;
  }
});

// ../../../opt/npm-tools/node_modules/ws/lib/subprotocol.js
var require_subprotocol = __commonJS({
  "../../../opt/npm-tools/node_modules/ws/lib/subprotocol.js"(exports, module) {
    "use strict";
    var { tokenChars } = require_validation();
    function parse(header) {
      const protocols = /* @__PURE__ */ new Set();
      let start = -1;
      let end = -1;
      let i = 0;
      for (i; i < header.length; i++) {
        const code = header.charCodeAt(i);
        if (end === -1 && tokenChars[code] === 1) {
          if (start === -1) start = i;
        } else if (i !== 0 && (code === 32 || code === 9)) {
          if (end === -1 && start !== -1) end = i;
        } else if (code === 44) {
          if (start === -1) {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
          if (end === -1) end = i;
          const protocol2 = header.slice(start, end);
          if (protocols.has(protocol2)) {
            throw new SyntaxError(`The "${protocol2}" subprotocol is duplicated`);
          }
          protocols.add(protocol2);
          start = end = -1;
        } else {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
      }
      if (start === -1 || end !== -1) {
        throw new SyntaxError("Unexpected end of input");
      }
      const protocol = header.slice(start, i);
      if (protocols.has(protocol)) {
        throw new SyntaxError(`The "${protocol}" subprotocol is duplicated`);
      }
      protocols.add(protocol);
      return protocols;
    }
    module.exports = { parse };
  }
});

// ../../../opt/npm-tools/node_modules/ws/lib/websocket-server.js
var require_websocket_server = __commonJS({
  "../../../opt/npm-tools/node_modules/ws/lib/websocket-server.js"(exports, module) {
    "use strict";
    var EventEmitter = __require("events");
    var http = __require("http");
    var { Duplex } = __require("stream");
    var { createHash } = __require("crypto");
    var extension2 = require_extension();
    var PerMessageDeflate2 = require_permessage_deflate();
    var subprotocol2 = require_subprotocol();
    var WebSocket2 = require_websocket();
    var { CLOSE_TIMEOUT, GUID, kWebSocket } = require_constants();
    var keyRegex = /^[+/0-9A-Za-z]{22}==$/;
    var RUNNING = 0;
    var CLOSING = 1;
    var CLOSED = 2;
    var WebSocketServer2 = class extends EventEmitter {
      /**
       * Create a `WebSocketServer` instance.
       *
       * @param {Object} options Configuration options
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Boolean} [options.autoPong=true] Specifies whether or not to
       *     automatically send a pong in response to a ping
       * @param {Number} [options.backlog=511] The maximum length of the queue of
       *     pending connections
       * @param {Boolean} [options.clientTracking=true] Specifies whether or not to
       *     track clients
       * @param {Number} [options.closeTimeout=30000] Duration in milliseconds to
       *     wait for the closing handshake to finish after `websocket.close()` is
       *     called
       * @param {Function} [options.handleProtocols] A hook to handle protocols
       * @param {String} [options.host] The hostname where to bind the server
       * @param {Number} [options.maxBufferedChunks=262144] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=16384] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=104857600] The maximum allowed message
       *     size
       * @param {Boolean} [options.noServer=false] Enable no server mode
       * @param {String} [options.path] Accept only connections matching this path
       * @param {(Boolean|Object)} [options.perMessageDeflate=false] Enable/disable
       *     permessage-deflate
       * @param {Number} [options.port] The port where to bind the server
       * @param {(http.Server|https.Server)} [options.server] A pre-created HTTP/S
       *     server to use
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @param {Function} [options.verifyClient] A hook to reject connections
       * @param {Function} [options.WebSocket=WebSocket] Specifies the `WebSocket`
       *     class to use. It must be the `WebSocket` class or class that extends it
       * @param {Function} [callback] A listener for the `listening` event
       */
      constructor(options, callback) {
        super();
        options = {
          allowSynchronousEvents: true,
          autoPong: true,
          maxBufferedChunks: 256 * 1024,
          maxFragments: 16 * 1024,
          maxPayload: 100 * 1024 * 1024,
          skipUTF8Validation: false,
          perMessageDeflate: false,
          handleProtocols: null,
          clientTracking: true,
          closeTimeout: CLOSE_TIMEOUT,
          verifyClient: null,
          noServer: false,
          backlog: null,
          // use default (511 as implemented in net.js)
          server: null,
          host: null,
          path: null,
          port: null,
          WebSocket: WebSocket2,
          ...options
        };
        if (options.port == null && !options.server && !options.noServer || options.port != null && (options.server || options.noServer) || options.server && options.noServer) {
          throw new TypeError(
            'One and only one of the "port", "server", or "noServer" options must be specified'
          );
        }
        if (options.port != null) {
          this._server = http.createServer((req, res) => {
            const body = http.STATUS_CODES[426];
            res.writeHead(426, {
              "Content-Length": body.length,
              "Content-Type": "text/plain"
            });
            res.end(body);
          });
          this._server.listen(
            options.port,
            options.host,
            options.backlog,
            callback
          );
        } else if (options.server) {
          this._server = options.server;
        }
        if (this._server) {
          const emitConnection = this.emit.bind(this, "connection");
          this._removeListeners = addListeners(this._server, {
            listening: this.emit.bind(this, "listening"),
            error: this.emit.bind(this, "error"),
            upgrade: (req, socket, head) => {
              this.handleUpgrade(req, socket, head, emitConnection);
            }
          });
        }
        if (options.perMessageDeflate === true) options.perMessageDeflate = {};
        if (options.clientTracking) {
          this.clients = /* @__PURE__ */ new Set();
          this._shouldEmitClose = false;
        }
        this.options = options;
        this._state = RUNNING;
      }
      /**
       * Returns the bound address, the address family name, and port of the server
       * as reported by the operating system if listening on an IP socket.
       * If the server is listening on a pipe or UNIX domain socket, the name is
       * returned as a string.
       *
       * @return {(Object|String|null)} The address of the server
       * @public
       */
      address() {
        if (this.options.noServer) {
          throw new Error('The server is operating in "noServer" mode');
        }
        if (!this._server) return null;
        return this._server.address();
      }
      /**
       * Stop the server from accepting new connections and emit the `'close'` event
       * when all existing connections are closed.
       *
       * @param {Function} [cb] A one-time listener for the `'close'` event
       * @public
       */
      close(cb) {
        if (this._state === CLOSED) {
          if (cb) {
            this.once("close", () => {
              cb(new Error("The server is not running"));
            });
          }
          process.nextTick(emitClose, this);
          return;
        }
        if (cb) this.once("close", cb);
        if (this._state === CLOSING) return;
        this._state = CLOSING;
        if (this.options.noServer || this.options.server) {
          if (this._server) {
            this._removeListeners();
            this._removeListeners = this._server = null;
          }
          if (this.clients) {
            if (!this.clients.size) {
              process.nextTick(emitClose, this);
            } else {
              this._shouldEmitClose = true;
            }
          } else {
            process.nextTick(emitClose, this);
          }
        } else {
          const server2 = this._server;
          this._removeListeners();
          this._removeListeners = this._server = null;
          server2.close(() => {
            emitClose(this);
          });
        }
      }
      /**
       * See if a given request should be handled by this server instance.
       *
       * @param {http.IncomingMessage} req Request object to inspect
       * @return {Boolean} `true` if the request is valid, else `false`
       * @public
       */
      shouldHandle(req) {
        if (this.options.path) {
          const index = req.url.indexOf("?");
          const pathname = index !== -1 ? req.url.slice(0, index) : req.url;
          if (pathname !== this.options.path) return false;
        }
        return true;
      }
      /**
       * Handle a HTTP Upgrade request.
       *
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @public
       */
      handleUpgrade(req, socket, head, cb) {
        socket.on("error", socketOnError);
        const key = req.headers["sec-websocket-key"];
        const upgrade = req.headers.upgrade;
        const version = +req.headers["sec-websocket-version"];
        if (req.method !== "GET") {
          const message = "Invalid HTTP method";
          abortHandshakeOrEmitwsClientError(this, req, socket, 405, message);
          return;
        }
        if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
          const message = "Invalid Upgrade header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (key === void 0 || !keyRegex.test(key)) {
          const message = "Missing or invalid Sec-WebSocket-Key header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (version !== 13 && version !== 8) {
          const message = "Missing or invalid Sec-WebSocket-Version header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message, {
            "Sec-WebSocket-Version": "13, 8"
          });
          return;
        }
        if (!this.shouldHandle(req)) {
          abortHandshake(socket, 400);
          return;
        }
        const secWebSocketProtocol = req.headers["sec-websocket-protocol"];
        let protocols = /* @__PURE__ */ new Set();
        if (secWebSocketProtocol !== void 0) {
          try {
            protocols = subprotocol2.parse(secWebSocketProtocol);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Protocol header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        const secWebSocketExtensions = req.headers["sec-websocket-extensions"];
        const extensions = {};
        if (this.options.perMessageDeflate && secWebSocketExtensions !== void 0) {
          const perMessageDeflate = new PerMessageDeflate2({
            ...this.options.perMessageDeflate,
            isServer: true,
            maxPayload: this.options.maxPayload
          });
          try {
            const offers = extension2.parse(secWebSocketExtensions);
            if (offers[PerMessageDeflate2.extensionName]) {
              perMessageDeflate.accept(offers[PerMessageDeflate2.extensionName]);
              extensions[PerMessageDeflate2.extensionName] = perMessageDeflate;
            }
          } catch (err) {
            const message = "Invalid or unacceptable Sec-WebSocket-Extensions header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        if (this.options.verifyClient) {
          const info = {
            origin: req.headers[`${version === 8 ? "sec-websocket-origin" : "origin"}`],
            secure: !!(req.socket.authorized || req.socket.encrypted),
            req
          };
          if (this.options.verifyClient.length === 2) {
            this.options.verifyClient(info, (verified, code, message, headers) => {
              if (!verified) {
                return abortHandshake(socket, code || 401, message, headers);
              }
              this.completeUpgrade(
                extensions,
                key,
                protocols,
                req,
                socket,
                head,
                cb
              );
            });
            return;
          }
          if (!this.options.verifyClient(info)) return abortHandshake(socket, 401);
        }
        this.completeUpgrade(extensions, key, protocols, req, socket, head, cb);
      }
      /**
       * Upgrade the connection to WebSocket.
       *
       * @param {Object} extensions The accepted extensions
       * @param {String} key The value of the `Sec-WebSocket-Key` header
       * @param {Set} protocols The subprotocols
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @throws {Error} If called more than once with the same socket
       * @private
       */
      completeUpgrade(extensions, key, protocols, req, socket, head, cb) {
        if (!socket.readable || !socket.writable) return socket.destroy();
        if (socket[kWebSocket]) {
          throw new Error(
            "server.handleUpgrade() was called more than once with the same socket, possibly due to a misconfiguration"
          );
        }
        if (this._state > RUNNING) return abortHandshake(socket, 503);
        const digest = createHash("sha1").update(key + GUID).digest("base64");
        const headers = [
          "HTTP/1.1 101 Switching Protocols",
          "Upgrade: websocket",
          "Connection: Upgrade",
          `Sec-WebSocket-Accept: ${digest}`
        ];
        const ws = new this.options.WebSocket(null, void 0, this.options);
        if (protocols.size) {
          const protocol = this.options.handleProtocols ? this.options.handleProtocols(protocols, req) : protocols.values().next().value;
          if (protocol) {
            headers.push(`Sec-WebSocket-Protocol: ${protocol}`);
            ws._protocol = protocol;
          }
        }
        if (extensions[PerMessageDeflate2.extensionName]) {
          const params = extensions[PerMessageDeflate2.extensionName].params;
          const value = extension2.format({
            [PerMessageDeflate2.extensionName]: [params]
          });
          headers.push(`Sec-WebSocket-Extensions: ${value}`);
          ws._extensions = extensions;
        }
        this.emit("headers", headers, req);
        socket.write(headers.concat("\r\n").join("\r\n"));
        socket.removeListener("error", socketOnError);
        ws.setSocket(socket, head, {
          allowSynchronousEvents: this.options.allowSynchronousEvents,
          maxBufferedChunks: this.options.maxBufferedChunks,
          maxFragments: this.options.maxFragments,
          maxPayload: this.options.maxPayload,
          skipUTF8Validation: this.options.skipUTF8Validation
        });
        if (this.clients) {
          this.clients.add(ws);
          ws.on("close", () => {
            this.clients.delete(ws);
            if (this._shouldEmitClose && !this.clients.size) {
              process.nextTick(emitClose, this);
            }
          });
        }
        cb(ws, req);
      }
    };
    module.exports = WebSocketServer2;
    function addListeners(server2, map) {
      for (const event of Object.keys(map)) server2.on(event, map[event]);
      return function removeListeners() {
        for (const event of Object.keys(map)) {
          server2.removeListener(event, map[event]);
        }
      };
    }
    function emitClose(server2) {
      server2._state = CLOSED;
      server2.emit("close");
    }
    function socketOnError() {
      this.destroy();
    }
    function abortHandshake(socket, code, message, headers) {
      message = message || http.STATUS_CODES[code];
      headers = {
        Connection: "close",
        "Content-Type": "text/html",
        "Content-Length": Buffer.byteLength(message),
        ...headers
      };
      socket.once("finish", socket.destroy);
      socket.end(
        `HTTP/1.1 ${code} ${http.STATUS_CODES[code]}\r
` + Object.keys(headers).map((h) => `${h}: ${headers[h]}`).join("\r\n") + "\r\n\r\n" + message
      );
    }
    function abortHandshakeOrEmitwsClientError(server2, req, socket, code, message, headers) {
      if (server2.listenerCount("wsClientError")) {
        const err = new Error(message);
        Error.captureStackTrace(err, abortHandshakeOrEmitwsClientError);
        server2.emit("wsClientError", err, socket, req);
      } else {
        abortHandshake(socket, code, message, headers);
      }
    }
  }
});

// src/server/index.ts
import { createServer } from "node:http";
import { createReadStream, existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";

// ../../../opt/npm-tools/node_modules/ws/wrapper.mjs
var import_stream = __toESM(require_stream(), 1);
var import_extension = __toESM(require_extension(), 1);
var import_permessage_deflate = __toESM(require_permessage_deflate(), 1);
var import_receiver = __toESM(require_receiver(), 1);
var import_sender = __toESM(require_sender(), 1);
var import_subprotocol = __toESM(require_subprotocol(), 1);
var import_websocket = __toESM(require_websocket(), 1);
var import_websocket_server = __toESM(require_websocket_server(), 1);

// src/shared/config.ts
var CLASSIC_SCORING = {
  pileEstimator: 3,
  pileSharedEstimator: 2,
  pileSharedContester: 1,
  exactBonus: 1,
  contestRight: 1,
  contestWrong: 1,
  pileCallWrong: 2,
  noEstimate: 1,
  noContest: 1,
  betMultiplier: 2,
  betMissPenalty: 1,
  doubleMultiplier: 2
};
var DIFFICULTY_PROFILES = {
  decouverte: {
    id: "decouverte",
    label: "D\xE9couverte",
    tagline: "Questions accessibles, tol\xE9rance large, tout le temps de r\xE9fl\xE9chir.",
    levelWeights: { 1: 0.75, 2: 0.25, 3: 0, 4: 0 },
    tolFactor: 1.6,
    estimateSeconds: 60,
    contestSeconds: 30,
    progressive: true,
    scoring: {},
    pedagogic: true
  },
  normal: {
    id: "normal",
    label: "Normal",
    tagline: "Un m\xE9lange de classiques et de surprises, difficult\xE9 progressive.",
    levelWeights: { 1: 0.25, 2: 0.5, 3: 0.25, 4: 0 },
    tolFactor: 1,
    estimateSeconds: 45,
    contestSeconds: 25,
    progressive: true,
    scoring: {},
    pedagogic: true
  },
  expert: {
    id: "expert",
    label: "Expert",
    tagline: "Valeurs pointues, zone Tout Pile resserr\xE9e : la strat\xE9gie compte.",
    levelWeights: { 1: 0, 2: 0.3, 3: 0.5, 4: 0.2 },
    tolFactor: 0.6,
    estimateSeconds: 40,
    contestSeconds: 20,
    progressive: false,
    scoring: { pileEstimator: 4 },
    pedagogic: false
  },
  maitre: {
    id: "maitre",
    label: "Ma\xEEtre",
    tagline: "Tol\xE9rance minimale, la pr\xE9cision rapporte gros.",
    levelWeights: { 1: 0, 2: 0.1, 3: 0.45, 4: 0.45 },
    tolFactor: 0.35,
    estimateSeconds: 35,
    contestSeconds: 15,
    progressive: false,
    scoring: { pileEstimator: 5, exactBonus: 2 },
    pedagogic: false
  }
};
var DEFAULT_TEAM_NAMES = { A: "Solaire", B: "Abysse" };
var DEFAULT_JOKERS = { hint: 1, swap: 1, double: 1, bet: 2 };
function presetSettings(preset, difficulty = "normal") {
  const d = DIFFICULTY_PROFILES[difficulty];
  const base = {
    name: "Partie Magnitude",
    preset,
    difficulty,
    categories: [],
    targetScore: 12,
    maxRounds: 16,
    estimateSeconds: d.estimateSeconds,
    contestSeconds: d.contestSeconds,
    revealSeconds: 12,
    tolFactor: 1,
    scoring: { ...CLASSIC_SCORING, ...d.scoring },
    jokers: { ...DEFAULT_JOKERS },
    primeEvery: 4,
    primeMultiplier: 2,
    allowPileCall: true,
    tiebreak: true,
    animSpeed: "normal",
    startingTeam: "random",
    teamNames: { ...DEFAULT_TEAM_NAMES }
  };
  if (preset === "rapide") {
    return {
      ...base,
      targetScore: 6,
      maxRounds: 8,
      estimateSeconds: Math.min(30, d.estimateSeconds),
      contestSeconds: Math.min(15, d.contestSeconds),
      revealSeconds: 8,
      jokers: { hint: 0, swap: 1, double: 1, bet: 1 },
      primeEvery: 0,
      animSpeed: "rapide"
    };
  }
  return base;
}
var ALL_CATEGORIES = [
  "culture",
  "histoire",
  "geo",
  "sciences",
  "nature",
  "espace",
  "sport",
  "football",
  "cinema",
  "musique",
  "tech",
  "jeuxvideo",
  "gastro",
  "quotidien",
  "records",
  "insolite",
  "eco"
];
var LIMITS = {
  targetScore: [0, 50],
  maxRounds: [2, 40],
  estimateSeconds: [10, 180],
  contestSeconds: [5, 120],
  revealSeconds: [4, 30],
  tolFactor: [0.25, 3],
  points: [0, 10],
  multiplier: [1, 4],
  jokers: [0, 5],
  primeEvery: [0, 10],
  nameLength: 40,
  teamNameLength: 16
};
var clampInt = (v, [lo, hi], fallback) => {
  const n = typeof v === "number" && Number.isFinite(v) ? Math.round(v) : fallback;
  return Math.min(hi, Math.max(lo, n));
};
var clampNum = (v, [lo, hi], fallback) => {
  const n = typeof v === "number" && Number.isFinite(v) ? v : fallback;
  return Math.min(hi, Math.max(lo, Math.round(n * 100) / 100));
};
var CONTROL_CHARS = new RegExp("[\\u0000-\\u001f\\u007f-\\u009f\\u200b-\\u200f\\u2028-\\u202e\\u2066-\\u2069]", "g");
function cleanText(v, maxLen, fallback) {
  if (typeof v !== "string") return fallback;
  const s = v.replace(CONTROL_CHARS, "").replace(/\s+/g, " ").trim();
  return s.length === 0 ? fallback : Array.from(s).slice(0, maxLen).join("");
}
function sanitizeSettings(input, opts = {}) {
  const raw = input && typeof input === "object" ? input : {};
  const preset = raw.preset === "rapide" || raw.preset === "perso" ? raw.preset : "classique";
  const difficulty = raw.difficulty === "decouverte" || raw.difficulty === "expert" || raw.difficulty === "maitre" ? raw.difficulty : "normal";
  const base = presetSettings(preset, difficulty);
  const cats = Array.isArray(raw.categories) ? Array.from(new Set(raw.categories.filter((c) => ALL_CATEGORIES.includes(c)))) : [];
  const rawScoring = raw.scoring && typeof raw.scoring === "object" ? raw.scoring : {};
  const scoring = { ...base.scoring };
  for (const key of Object.keys(scoring)) {
    const isMult = key === "betMultiplier" || key === "doubleMultiplier";
    scoring[key] = clampInt(rawScoring[key], isMult ? LIMITS.multiplier : LIMITS.points, base.scoring[key]);
  }
  const rawJokers = raw.jokers && typeof raw.jokers === "object" ? raw.jokers : {};
  const jokers = { ...base.jokers };
  for (const key of Object.keys(jokers)) jokers[key] = clampInt(rawJokers[key], LIMITS.jokers, base.jokers[key]);
  const rawNames = raw.teamNames && typeof raw.teamNames === "object" ? raw.teamNames : {};
  let estimateSeconds = clampInt(raw.estimateSeconds, [0, LIMITS.estimateSeconds[1]], base.estimateSeconds);
  if (estimateSeconds === 0 && !opts.allowUnlimited) estimateSeconds = base.estimateSeconds;
  if (estimateSeconds !== 0) estimateSeconds = Math.max(LIMITS.estimateSeconds[0], estimateSeconds);
  let contestSeconds = clampInt(raw.contestSeconds, [0, LIMITS.contestSeconds[1]], base.contestSeconds);
  if (contestSeconds === 0 && !opts.allowUnlimited) contestSeconds = base.contestSeconds;
  if (contestSeconds !== 0) contestSeconds = Math.max(LIMITS.contestSeconds[0], contestSeconds);
  const targetScore = clampInt(raw.targetScore, LIMITS.targetScore, base.targetScore);
  const settings = {
    name: cleanText(raw.name, LIMITS.nameLength, base.name),
    preset,
    difficulty,
    categories: cats.length === ALL_CATEGORIES.length ? [] : cats,
    targetScore,
    maxRounds: clampInt(raw.maxRounds, LIMITS.maxRounds, base.maxRounds),
    estimateSeconds,
    contestSeconds,
    revealSeconds: clampInt(raw.revealSeconds, LIMITS.revealSeconds, base.revealSeconds),
    tolFactor: clampNum(raw.tolFactor, LIMITS.tolFactor, base.tolFactor),
    scoring,
    jokers,
    primeEvery: clampInt(raw.primeEvery, LIMITS.primeEvery, base.primeEvery),
    primeMultiplier: clampInt(raw.primeMultiplier, LIMITS.multiplier, base.primeMultiplier),
    allowPileCall: typeof raw.allowPileCall === "boolean" ? raw.allowPileCall : base.allowPileCall,
    tiebreak: typeof raw.tiebreak === "boolean" ? raw.tiebreak : base.tiebreak,
    animSpeed: raw.animSpeed === "rapide" ? "rapide" : raw.animSpeed === "normal" ? "normal" : base.animSpeed,
    startingTeam: raw.startingTeam === "A" || raw.startingTeam === "B" ? raw.startingTeam : "random",
    teamNames: {
      A: cleanText(rawNames.A, LIMITS.teamNameLength, base.teamNames.A),
      B: cleanText(rawNames.B, LIMITS.teamNameLength, base.teamNames.B)
    }
  };
  return settings;
}
var introMs = (s) => s.animSpeed === "rapide" ? 2200 : 3400;
var MAX_TIEBREAKS = 3;

// src/shared/rng.ts
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = a + 1831565813 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
var derive = (seed, ...labels) => mulberry32(hashString(`${seed}|${labels.join("|")}`));
function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}
function weightedPick(items, weight, rng) {
  let total = 0;
  for (const it of items) total += Math.max(0, weight(it));
  if (total <= 0) return items[0];
  let r = rng() * total;
  for (const it of items) {
    r -= Math.max(0, weight(it));
    if (r < 0) return it;
  }
  return items[items.length - 1];
}

// src/shared/deck.ts
function createBank(questions2) {
  const byId = /* @__PURE__ */ new Map();
  for (const q of questions2) {
    if (byId.has(q.id)) throw new Error(`Identifiant de question en double : ${q.id}`);
    byId.set(q.id, q);
  }
  return { all: questions2, byId };
}
function requireQuestion(bank2, id) {
  const q = bank2.byId.get(id);
  if (!q) throw new Error(`Question inconnue : ${id}`);
  return q;
}
var LEVELS = [1, 2, 3, 4];
var topicOf = (q) => q.tags?.[0] ?? q.id;
function categoryPool(bank2, categories) {
  if (categories.length === 0) return bank2.all.slice();
  const set = new Set(categories);
  const pool = bank2.all.filter((q) => set.has(q.cat));
  return pool.length > 0 ? pool : bank2.all.slice();
}
function rankByFreshness(cands, recency, rng) {
  const fresh = shuffle(cands.filter((q) => !recency.has(q.id)), rng);
  const seen = cands.filter((q) => recency.has(q.id)).sort((a, b) => (recency.get(b.id) ?? 0) - (recency.get(a.id) ?? 0));
  return fresh.concat(seen);
}
function buildDeck(bank2, opts) {
  const rng = derive(opts.seed, "deck");
  const weights = opts.levelWeights ?? DIFFICULTY_PROFILES[opts.difficulty].levelWeights;
  const progressive = opts.progressive ?? DIFFICULTY_PROFILES[opts.difficulty].progressive;
  const recency = /* @__PURE__ */ new Map();
  (opts.avoid ?? []).forEach((id, i) => recency.set(id, i));
  const catPool = categoryPool(bank2, opts.categories);
  const byLevel = /* @__PURE__ */ new Map();
  for (const l of LEVELS) byLevel.set(l, rankByFreshness(catPool.filter((q) => q.level === l), recency, rng));
  let allowed = LEVELS.filter((l) => (weights[l] ?? 0) > 0 && (byLevel.get(l)?.length ?? 0) > 0);
  const availableCount = () => allowed.reduce((s, l) => s + (byLevel.get(l)?.length ?? 0), 0);
  if (availableCount() < opts.count) allowed = LEVELS.filter((l) => (byLevel.get(l)?.length ?? 0) > 0);
  const effWeight = (l) => weights[l] && weights[l] > 0 ? weights[l] : 0.05;
  const picked = [];
  const usedTopics = /* @__PURE__ */ new Set();
  const takeFrom = (l, strictTopic) => {
    const list = byLevel.get(l) ?? [];
    for (let i = 0; i < list.length; i++) {
      const q = list[i];
      if (picked.includes(q)) continue;
      if (strictTopic && usedTopics.has(topicOf(q))) continue;
      return q;
    }
    return void 0;
  };
  const target = Math.min(opts.count, catPool.length);
  let guard = 0;
  while (picked.length < target && guard++ < target * 20) {
    const live = allowed.filter((l) => takeFrom(l, false) !== void 0);
    if (live.length === 0) break;
    const level = weightedPick(live, effWeight, rng);
    const q = takeFrom(level, true) ?? takeFrom(level, false);
    if (!q) continue;
    picked.push(q);
    usedTopics.add(topicOf(q));
  }
  let ordered = progressive ? picked.map((q, i) => ({ q, k: q.level + rng() * 0.9 + i * 1e-4 })).sort((a, b) => a.k - b.k).map((x) => x.q) : shuffle(picked, rng);
  ordered = spreadCategories(ordered);
  return ordered.map((q) => q.id);
}
function spreadCategories(list) {
  const out = list.slice();
  for (let i = 1; i < out.length; i++) {
    if (out[i].cat !== out[i - 1].cat) continue;
    for (let j = i + 1; j < Math.min(out.length, i + 5); j++) {
      if (out[j].cat !== out[i - 1].cat) {
        const [q] = out.splice(j, 1);
        out.splice(i, 0, q);
        break;
      }
    }
  }
  return out;
}

// src/shared/numbers.ts
var MAX_ABS_VALUE = 1e15;
var MAX_YEAR = 9999;
var SCALE_DECIMALS = 6;
function hasAtMostDecimals(value, decimals) {
  const scaled = toScaled(value);
  const unit = 10n ** BigInt(SCALE_DECIMALS - Math.min(decimals, SCALE_DECIMALS));
  return scaled % unit === 0n;
}
function validateValue(value, q) {
  if (typeof value !== "number" || !Number.isFinite(value)) return false;
  if (Math.abs(value) > MAX_ABS_VALUE) return false;
  if (value < 0 && !q.allowNegative) return false;
  if (q.kind === "year" && Math.abs(value) > MAX_YEAR) return false;
  return hasAtMostDecimals(value, q.decimals ?? 0);
}
function toScaled(x) {
  const fixed = Math.abs(x).toFixed(SCALE_DECIMALS);
  const [i, f = ""] = fixed.split(".");
  const v = BigInt(i) * 10n ** BigInt(SCALE_DECIMALS) + BigInt(f.padEnd(SCALE_DECIMALS, "0"));
  return x < 0 ? -v : v;
}
function evaluate(estimate, answer, tolerance) {
  const e = toScaled(estimate);
  const a = toScaled(answer);
  const t = toScaled(Math.max(0, tolerance));
  const d = a - e;
  const ad = d < 0n ? -d : d;
  return {
    inZone: ad <= t,
    exact: ad === 0n,
    direction: d > 0n ? "plus" : d < 0n ? "moins" : "egal",
    diff: Math.abs(answer - estimate)
  };
}
function floorToStep(x, decimals) {
  const step = 10 ** decimals;
  return Math.floor(x * step + 1e-9) / step;
}
function effectiveTolerance(q, factor) {
  const decimals = q.decimals ?? 0;
  const raw = "abs" in q.tol ? q.tol.abs * factor : Math.abs(q.answer) * q.tol.rel * factor;
  const t = floorToStep(raw, decimals);
  return Math.max(q.minTol ?? 0, t);
}
function roundNice(x, direction, decimals = 0) {
  if (x === 0) return 0;
  const sign = Math.sign(x);
  const ax = Math.abs(x);
  const mag = 10 ** (Math.floor(Math.log10(ax)) - 1);
  const step = Math.max(mag, 10 ** -decimals);
  const goDown = direction === "down" === sign > 0;
  const r = goDown ? Math.floor(ax / step) * step : Math.ceil(ax / step) * step;
  return Number((sign * r).toFixed(Math.max(0, decimals)));
}

// src/shared/questions/make.ts
function make(cat, rows) {
  return rows.map(([id, level, text, answer, unit, kind, tol, explain, source, extra]) => {
    const q = { id, text, cat, level, answer, unit, kind, tol, explain, source };
    if (extra) Object.assign(q, extra);
    return q;
  });
}
var abs = (n) => ({ abs: n });
var rel = (n) => ({ rel: n });

// src/shared/questions/culture.ts
var culture_default = make("culture", [
  [
    "cul-01",
    1,
    "Combien de cases compte un \xE9chiquier ?",
    64,
    "cases",
    "count",
    abs(2),
    "Un \xE9chiquier est une grille de 8 \xD7 8 cases, alternativement claires et fonc\xE9es.",
    "FIDE, R\xE8gles des \xE9checs, art. 2.1",
    { tags: ["echecs"] }
  ],
  [
    "cul-02",
    1,
    "Combien de pi\xE8ces y a-t-il sur un \xE9chiquier au d\xE9but d\u2019une partie ?",
    32,
    "pi\xE8ces",
    "count",
    abs(2),
    "Chaque joueur dispose de 16 pi\xE8ces : 8 pions, 2 tours, 2 cavaliers, 2 fous, une dame et un roi.",
    "FIDE, R\xE8gles des \xE9checs, art. 2.3",
    { tags: ["echecs"] }
  ],
  [
    "cul-03",
    2,
    "Combien d\u2019\xC9tats sont membres de l\u2019Organisation des Nations unies ?",
    193,
    "\xC9tats",
    "count",
    abs(4),
    "Le dernier \xC9tat admis est le Soudan du Sud, en 2011. Le Vatican et la Palestine sont observateurs.",
    "Nations unies, liste des \xC9tats membres (un.org)",
    { asOf: "2025" }
  ],
  [
    "cul-04",
    1,
    "Combien d\u2019\xE9toiles figurent sur le drapeau des \xC9tats-Unis ?",
    50,
    "\xE9toiles",
    "count",
    abs(2),
    "Une \xE9toile par \xC9tat. La derni\xE8re a \xE9t\xE9 ajout\xE9e en 1960, apr\xE8s l\u2019admission d\u2019Hawa\xEF.",
    "U.S. Code, titre 4, chapitre 1",
    { tags: ["usa-etats"] }
  ],
  [
    "cul-05",
    2,
    "Combien de lettres compte l\u2019alphabet grec ?",
    24,
    "lettres",
    "count",
    abs(2),
    "D\u2019alpha \xE0 om\xE9ga, l\u2019alphabet grec classique compte 24 lettres.",
    "Encyclop\xE6dia Britannica, \xAB Greek alphabet \xBB"
  ],
  [
    "cul-06",
    2,
    "Combien de cartes compte un jeu de tarot fran\xE7ais ?",
    78,
    "cartes",
    "count",
    abs(3),
    "56 cartes des quatre couleurs, 21 atouts et l\u2019Excuse.",
    "F\xE9d\xE9ration fran\xE7aise de tarot, r\xE8gles officielles",
    { tags: ["cartes"] }
  ],
  [
    "cul-07",
    1,
    "Combien d\u2019arrondissements compte la ville de Paris ?",
    20,
    "arrondissements",
    "count",
    abs(1),
    "Paris est divis\xE9e en 20 arrondissements depuis l\u2019annexion des communes voisines en 1860. Les quatre premiers forment depuis 2020 le secteur \xAB Paris Centre \xBB.",
    "Ville de Paris, organisation administrative"
  ],
  [
    "cul-08",
    2,
    "Combien de d\xE9partements compte la France, outre-mer compris ?",
    101,
    "d\xE9partements",
    "count",
    abs(3),
    "96 d\xE9partements en m\xE9tropole et 5 en outre-mer (Guadeloupe, Martinique, Guyane, La R\xE9union, Mayotte).",
    "INSEE, Code officiel g\xE9ographique",
    { asOf: "2025", tags: ["decoupage-fr"] }
  ],
  [
    "cul-09",
    2,
    "Combien de r\xE9gions compte la France, outre-mer compris ?",
    18,
    "r\xE9gions",
    "count",
    abs(2),
    "13 r\xE9gions m\xE9tropolitaines depuis la r\xE9forme de 2016, auxquelles s\u2019ajoutent 5 r\xE9gions d\u2019outre-mer.",
    "INSEE, Code officiel g\xE9ographique",
    { asOf: "2025", tags: ["decoupage-fr"] }
  ],
  [
    "cul-10",
    2,
    "Combien de fauteuils compte l\u2019Acad\xE9mie fran\xE7aise ?",
    40,
    "fauteuils",
    "count",
    abs(3),
    "Ses membres, les \xAB Immortels \xBB, sont \xE9lus \xE0 vie. Le nombre de 40 est fix\xE9 depuis 1639.",
    "Acad\xE9mie fran\xE7aise, histoire de l\u2019institution"
  ],
  [
    "cul-11",
    2,
    "Combien de secondes y a-t-il dans une journ\xE9e de 24 heures ?",
    86400,
    "secondes",
    "count",
    rel(0.05),
    "24 \xD7 60 \xD7 60 = 86 400 secondes.",
    "Bureau international des poids et mesures, d\xE9finition de la seconde",
    { tags: ["temps-calc"] }
  ],
  [
    "cul-12",
    3,
    "Combien de chapitres compte \xAB Le Petit Prince \xBB d\u2019Antoine de Saint-Exup\xE9ry ?",
    27,
    "chapitres",
    "count",
    abs(3),
    "Publi\xE9 en 1943 \xE0 New York, le conte compte 27 chapitres courts.",
    "Gallimard, \xE9dition de r\xE9f\xE9rence du Petit Prince"
  ],
  [
    "cul-13",
    1,
    "Combien d\u2019heures compte une semaine ?",
    168,
    "heures",
    "count",
    abs(6),
    "7 jours \xD7 24 heures = 168 heures.",
    "Calcul",
    { tags: ["temps-calc"] }
  ],
  [
    "cul-14",
    2,
    "Combien de vers compte un sonnet ?",
    14,
    "vers",
    "count",
    abs(1),
    "Deux quatrains suivis de deux tercets : 4 + 4 + 3 + 3 = 14 vers.",
    "Le Robert, d\xE9finition de \xAB sonnet \xBB"
  ],
  [
    "cul-15",
    2,
    "Combien de syllabes compte un alexandrin ?",
    12,
    "syllabes",
    "count",
    abs(1),
    "L\u2019alexandrin, vers roi de la po\xE9sie classique, compte 12 syllabes, souvent coup\xE9es en deux h\xE9mistiches de 6.",
    "Le Robert, d\xE9finition d\u2019\xAB alexandrin \xBB"
  ],
  [
    "cul-16",
    2,
    "Combien de cases compte le plateau du Monopoly ?",
    40,
    "cases",
    "count",
    abs(3),
    "Les quatre c\xF4t\xE9s du plateau comptent 40 cases, dont les quatre coins : D\xE9part, Prison, Parc gratuit et Allez en prison.",
    "Hasbro, r\xE8gles officielles du Monopoly"
  ],
  [
    "cul-17",
    3,
    "Combien de dominos compte un jeu classique \xAB double-six \xBB ?",
    28,
    "dominos",
    "count",
    abs(2),
    "Toutes les paires possibles de 0 \xE0 6, doublons compris : 7 \xD7 8 / 2 = 28.",
    "Calcul combinatoire"
  ],
  [
    "cul-18",
    3,
    "Combien de jetons compte un jeu de Scrabble en fran\xE7ais ?",
    102,
    "jetons",
    "count",
    abs(4),
    "La version fran\xE7aise compte 100 lettres et 2 jokers blancs, soit 102 jetons.",
    "F\xE9d\xE9ration internationale de Scrabble francophone, r\xE8glement"
  ],
  [
    "cul-19",
    1,
    "Combien de cartes compte un jeu de belote ?",
    32,
    "cartes",
    "count",
    abs(2),
    "De l\u2019as au 7 dans chacune des quatre couleurs : 8 \xD7 4 = 32 cartes.",
    "R\xE8gles traditionnelles de la belote",
    { tags: ["cartes"] }
  ],
  [
    "cul-20",
    3,
    "En combien de tomes est publi\xE9 \xAB \xC0 la recherche du temps perdu \xBB de Marcel Proust ?",
    7,
    "tomes",
    "count",
    abs(1),
    "De \xAB Du c\xF4t\xE9 de chez Swann \xBB (1913) au \xAB Temps retrouv\xE9 \xBB (1927), l\u2019\u0153uvre compte sept tomes.",
    "BnF, notice de l\u2019\u0153uvre"
  ],
  [
    "cul-21",
    2,
    "Combien de cases compte une grille de sudoku classique ?",
    81,
    "cases",
    "count",
    abs(3),
    "Une grille de 9 \xD7 9 cases, d\xE9coup\xE9e en neuf blocs de 3 \xD7 3.",
    "D\xE9finition du sudoku"
  ],
  [
    "cul-22",
    3,
    "Combien de signes compte l\u2019alphabet braille de base ?",
    63,
    "combinaisons",
    "count",
    abs(4),
    "Six points en relief, chacun pr\xE9sent ou absent : 2\u2076 \u2212 1 = 63 combinaisons non vides.",
    "Calcul combinatoire ; F\xE9d\xE9ration des aveugles de France"
  ]
]);

// src/shared/questions/histoire.ts
var histoire_default = make("histoire", [
  [
    "his-01",
    1,
    "En quelle ann\xE9e a eu lieu la prise de la Bastille ?",
    1789,
    "",
    "year",
    abs(2),
    "Le 14 juillet 1789, les Parisiens prennent la forteresse royale, symbole de l\u2019arbitraire. Elle sera d\xE9molie dans les mois suivants.",
    "Encyclop\xE6dia Universalis, \xAB Prise de la Bastille \xBB",
    { tags: ["revolution"] }
  ],
  [
    "his-02",
    1,
    "En quelle ann\xE9e le mur de Berlin est-il tomb\xE9 ?",
    1989,
    "",
    "year",
    abs(2),
    "Dans la nuit du 9 au 10 novembre 1989, les postes-fronti\xE8res s\u2019ouvrent. L\u2019Allemagne sera r\xE9unifi\xE9e le 3 octobre 1990.",
    "Bundesregierung, chronologie de la chute du Mur"
  ],
  [
    "his-03",
    2,
    "En quelle ann\xE9e Charlemagne a-t-il \xE9t\xE9 couronn\xE9 empereur \xE0 Rome ?",
    800,
    "",
    "year",
    abs(10),
    "Le pape L\xE9on III le couronne le 25 d\xE9cembre 800 dans la basilique Saint-Pierre.",
    "Encyclop\xE6dia Britannica, \xAB Charlemagne \xBB"
  ],
  [
    "his-04",
    2,
    "En quelle ann\xE9e s\u2019est d\xE9roul\xE9e la bataille de Marignan ?",
    1515,
    "",
    "year",
    abs(5),
    "Fran\xE7ois Ier y remporte, les 13 et 14 septembre 1515, une victoire contre les mercenaires suisses du duc de Milan.",
    "Encyclop\xE6dia Universalis, \xAB Marignan \xBB"
  ],
  [
    "his-05",
    1,
    "En quelle ann\xE9e Christophe Colomb a-t-il atteint l\u2019Am\xE9rique pour la premi\xE8re fois ?",
    1492,
    "",
    "year",
    abs(4),
    "Le 12 octobre 1492, il d\xE9barque sur une \xEEle des Bahamas qu\u2019il nomme San Salvador.",
    "Encyclop\xE6dia Britannica, \xAB Christopher Columbus \xBB"
  ],
  [
    "his-06",
    2,
    "En quelle ann\xE9e a eu lieu la r\xE9volution d\u2019Octobre en Russie ?",
    1917,
    "",
    "year",
    abs(3),
    "Les bolcheviks prennent le pouvoir \xE0 Petrograd le 25 octobre 1917 du calendrier julien, soit le 7 novembre du calendrier gr\xE9gorien.",
    "Encyclop\xE6dia Britannica, \xAB Russian Revolution \xBB"
  ],
  [
    "his-07",
    1,
    "En quelle ann\xE9e la Seconde Guerre mondiale s\u2019est-elle achev\xE9e en Europe ?",
    1945,
    "",
    "year",
    abs(2),
    "L\u2019Allemagne capitule sans condition le 8 mai 1945. Le Japon capitulera le 2 septembre 1945.",
    "M\xE9morial de Caen, chronologie"
  ],
  [
    "his-08",
    2,
    "En quelle ann\xE9e a eu lieu la bataille de Waterloo ?",
    1815,
    "",
    "year",
    abs(4),
    "Le 18 juin 1815, la d\xE9faite de Napol\xE9on met fin aux Cent-Jours. Il est exil\xE9 \xE0 Sainte-H\xE9l\xE8ne.",
    "Encyclop\xE6dia Universalis, \xAB Waterloo \xBB",
    { tags: ["napoleon"] }
  ],
  [
    "his-09",
    2,
    "Combien d\u2019ann\xE9es la guerre de Cent Ans a-t-elle r\xE9ellement dur\xE9 ?",
    116,
    "ans",
    "duration",
    abs(8),
    "De 1337 \xE0 1453 : 116 ans, entrecoup\xE9s de longues tr\xEAves.",
    "Encyclop\xE6dia Britannica, \xAB Hundred Years\u2019 War \xBB"
  ],
  [
    "his-10",
    3,
    "En quelle ann\xE9e avant J.-C. Jules C\xE9sar a-t-il \xE9t\xE9 assassin\xE9 ?",
    44,
    "av. J.-C.",
    "year",
    abs(8),
    "Il est poignard\xE9 aux ides de mars (le 15 mars) de l\u2019an 44 av. J.-C., au S\xE9nat.",
    "Encyclop\xE6dia Britannica, \xAB Julius Caesar \xBB"
  ],
  [
    "his-11",
    2,
    "En quelle ann\xE9e Napol\xE9on s\u2019est-il fait sacrer empereur \xE0 Notre-Dame ?",
    1804,
    "",
    "year",
    abs(3),
    "Le 2 d\xE9cembre 1804, sc\xE8ne immortalis\xE9e par le tableau de David expos\xE9 au Louvre.",
    "Fondation Napol\xE9on, \xAB Le sacre \xBB",
    { tags: ["napoleon"] }
  ],
  [
    "his-12",
    3,
    "En quelle ann\xE9e l\u2019esclavage a-t-il \xE9t\xE9 d\xE9finitivement aboli en France ?",
    1848,
    "",
    "year",
    abs(5),
    "Le d\xE9cret du 27 avril 1848, port\xE9 par Victor Sch\u0153lcher, abolit l\u2019esclavage dans les colonies fran\xE7aises. Une premi\xE8re abolition de 1794 avait \xE9t\xE9 annul\xE9e en 1802.",
    "Assembl\xE9e nationale, \xAB L\u2019abolition de l\u2019esclavage \xBB"
  ],
  [
    "his-13",
    2,
    "En quelle ann\xE9e les femmes ont-elles obtenu le droit de vote en France ?",
    1944,
    "",
    "year",
    abs(3),
    "L\u2019ordonnance du 21 avril 1944 l\u2019accorde ; les Fran\xE7aises votent pour la premi\xE8re fois aux municipales d\u2019avril 1945.",
    "Assembl\xE9e nationale, \xAB Le vote des femmes \xBB"
  ],
  [
    "his-14",
    3,
    "Vers quelle ann\xE9e avant J.-C. la grande pyramide de Kh\xE9ops a-t-elle \xE9t\xE9 achev\xE9e ?",
    2560,
    "av. J.-C.",
    "year",
    abs(100),
    "La datation commun\xE9ment admise la situe autour de 2560 av. J.-C., sous la IVe dynastie. Elle est rest\xE9e la plus haute construction humaine pendant pr\xE8s de 4 000 ans.",
    "Encyclop\xE6dia Britannica, \xAB Pyramids of Giza \xBB"
  ],
  [
    "his-15",
    3,
    "Combien d\u2019ann\xE9es a dur\xE9 le r\xE8gne de Louis XIV ?",
    72,
    "ans",
    "duration",
    abs(4),
    "De 1643 \xE0 1715 : 72 ans, le plus long r\xE8gne de l\u2019histoire de France.",
    "Ch\xE2teau de Versailles, biographie de Louis XIV"
  ],
  [
    "his-16",
    3,
    "Selon la tradition, en quelle ann\xE9e avant J.-C. Rome a-t-elle \xE9t\xE9 fond\xE9e ?",
    753,
    "av. J.-C.",
    "year",
    abs(20),
    "La l\xE9gende de Romulus et R\xE9mus fixe la fondation au 21 avril 753 av. J.-C., date retenue par l\u2019historien Varron.",
    "Encyclop\xE6dia Britannica, \xAB Ancient Rome \xBB"
  ],
  [
    "his-17",
    3,
    "Combien de jours a dur\xE9 la bataille de Verdun ?",
    300,
    "jours",
    "duration",
    abs(25),
    "Du 21 f\xE9vrier au 18 d\xE9cembre 1916 : 300 jours et 300 nuits, plus de 700 000 victimes.",
    "M\xE9morial de Verdun"
  ],
  [
    "his-18",
    1,
    "En quelle ann\xE9e le Titanic a-t-il fait naufrage ?",
    1912,
    "",
    "year",
    abs(3),
    "Dans la nuit du 14 au 15 avril 1912, lors de sa travers\xE9e inaugurale, apr\xE8s avoir heurt\xE9 un iceberg.",
    "Encyclop\xE6dia Britannica, \xAB Titanic \xBB"
  ],
  [
    "his-19",
    1,
    "En quelle ann\xE9e la D\xE9claration d\u2019ind\xE9pendance des \xC9tats-Unis a-t-elle \xE9t\xE9 sign\xE9e ?",
    1776,
    "",
    "year",
    abs(3),
    "Adopt\xE9e le 4 juillet 1776 par le Congr\xE8s continental \xE0 Philadelphie.",
    "National Archives (archives.gov), Declaration of Independence"
  ],
  [
    "his-20",
    2,
    "En quelle ann\xE9e Louis XVI a-t-il \xE9t\xE9 guillotin\xE9 ?",
    1793,
    "",
    "year",
    abs(3),
    "Il est ex\xE9cut\xE9 le 21 janvier 1793 place de la R\xE9volution, aujourd\u2019hui place de la Concorde.",
    "Encyclop\xE6dia Universalis, \xAB Louis XVI \xBB",
    { tags: ["revolution"] }
  ],
  [
    "his-21",
    3,
    "En quelle ann\xE9e Henri IV a-t-il sign\xE9 l\u2019\xE9dit de Nantes ?",
    1598,
    "",
    "year",
    abs(8),
    "L\u2019\xE9dit de 1598 accorde la libert\xE9 de culte aux protestants. Louis XIV le r\xE9voquera en 1685.",
    "Mus\xE9e protestant, \xAB L\u2019\xE9dit de Nantes \xBB"
  ],
  [
    "his-22",
    3,
    "En quelle ann\xE9e a eu lieu la bataille d\u2019Hastings ?",
    1066,
    "",
    "year",
    abs(12),
    "Guillaume le Conqu\xE9rant y bat le roi Harold II et devient roi d\u2019Angleterre.",
    "Encyclop\xE6dia Britannica, \xAB Battle of Hastings \xBB"
  ],
  [
    "his-23",
    3,
    "En quelle ann\xE9e situe-t-on traditionnellement la chute de l\u2019Empire romain d\u2019Occident ?",
    476,
    "",
    "year",
    abs(12),
    "Romulus Augustule est d\xE9pos\xE9 par Odoacre en 476, date qui marque conventionnellement la fin de l\u2019Antiquit\xE9.",
    "Encyclop\xE6dia Britannica, \xAB Fall of Rome \xBB"
  ],
  [
    "his-24",
    2,
    "Combien de rois de France ont port\xE9 le pr\xE9nom Louis ?",
    18,
    "rois",
    "count",
    abs(1),
    "De Louis Ier le Pieux \xE0 Louis XVIII. Louis XVII, mort enfant au Temple, n\u2019a jamais r\xE9gn\xE9 mais est compt\xE9 dans la num\xE9rotation.",
    "Encyclop\xE6dia Universalis, liste des rois de France"
  ],
  [
    "his-25",
    1,
    "En quelle ann\xE9e l\u2019armistice de la Premi\xE8re Guerre mondiale a-t-il \xE9t\xE9 sign\xE9 ?",
    1918,
    "",
    "year",
    abs(2),
    "Sign\xE9 le 11 novembre 1918 dans un wagon, en for\xEAt de Compi\xE8gne, \xE0 Rethondes.",
    "Mission du centenaire, \xAB L\u2019armistice \xBB"
  ],
  [
    "his-26",
    2,
    "En quelle ann\xE9e Jeanne d\u2019Arc a-t-elle \xE9t\xE9 br\xFBl\xE9e \xE0 Rouen ?",
    1431,
    "",
    "year",
    abs(6),
    "Condamn\xE9e pour h\xE9r\xE9sie, elle meurt sur le b\xFBcher le 30 mai 1431, \xE0 19 ans environ. Elle est canonis\xE9e en 1920.",
    "Encyclop\xE6dia Britannica, \xAB Joan of Arc \xBB"
  ],
  [
    "his-27",
    2,
    "En quelle ann\xE9e le d\xE9barquement alli\xE9 en Normandie a-t-il eu lieu ?",
    1944,
    "",
    "year",
    abs(2),
    "Le 6 juin 1944, le \xAB Jour J \xBB, plus de 150 000 soldats d\xE9barquent sur cinq plages normandes.",
    "M\xE9morial de Caen, \xAB Le D\xE9barquement \xBB"
  ],
  [
    "his-28",
    4,
    "Combien de jours a dur\xE9 la Commune de Paris en 1871 ?",
    72,
    "jours",
    "duration",
    abs(6),
    "Du 18 mars au 28 mai 1871, achev\xE9e par la \xAB Semaine sanglante \xBB.",
    "Encyclop\xE6dia Universalis, \xAB Commune de Paris \xBB"
  ],
  [
    "his-29",
    3,
    "En quelle ann\xE9e l\u2019Empire ottoman a-t-il pris Constantinople ?",
    1453,
    "",
    "year",
    abs(8),
    "Le 29 mai 1453, Mehmed II s\u2019empare de la ville, mettant fin \xE0 l\u2019Empire byzantin.",
    "Encyclop\xE6dia Britannica, \xAB Fall of Constantinople \xBB"
  ],
  [
    "his-30",
    4,
    "En quelle ann\xE9e Vercing\xE9torix s\u2019est-il rendu \xE0 C\xE9sar \xE0 Al\xE9sia ?",
    52,
    "av. J.-C.",
    "year",
    abs(5),
    "Le si\xE8ge d\u2019Al\xE9sia, en 52 av. J.-C., marque la fin de la r\xE9sistance gauloise organis\xE9e.",
    "Mus\xE9oParc Al\xE9sia"
  ]
]);

// src/shared/questions/geo.ts
var geo_default = make("geo", [
  [
    "geo-01",
    1,
    "Quelle est l\u2019altitude du mont Blanc, en m\xE8tres ?",
    4806,
    "m",
    "measure",
    rel(0.02),
    "Mesur\xE9e \xE0 4 805,59 m en 2021. Son sommet glaciaire varie de quelques m\xE8tres d\u2019une mesure \xE0 l\u2019autre.",
    "Chambre d\xE9partementale des notaires de Haute-Savoie, mesure 2021",
    { asOf: "2021", tags: ["montagne-fr"] }
  ],
  [
    "geo-02",
    1,
    "Quelle est l\u2019altitude de l\u2019Everest, en m\xE8tres ?",
    8849,
    "m",
    "measure",
    rel(0.03),
    "La Chine et le N\xE9pal ont annonc\xE9 conjointement 8 848,86 m en 2020.",
    "Gouvernement du N\xE9pal et Administration chinoise de cartographie, 2020",
    { asOf: "2020", tags: ["everest"] }
  ],
  [
    "geo-03",
    2,
    "Quelle est la longueur de la Loire, plus long fleuve de France, en km ?",
    1006,
    "km",
    "measure",
    rel(0.05),
    "Elle prend sa source au mont Gerbier-de-Jonc (Ard\xE8che) et se jette dans l\u2019Atlantique \xE0 Saint-Nazaire.",
    "SANDRE (r\xE9f\xE9rentiel national des cours d\u2019eau) : 1 005,93 km",
    { tags: ["fleuves-fr"] }
  ],
  [
    "geo-04",
    2,
    "Quelle est la superficie de la France m\xE9tropolitaine, en km\xB2 ?",
    551695,
    "km\xB2",
    "measure",
    rel(0.05),
    "L\u2019IGN retient 551 695 km\xB2. Le cadastre, qui exclut lacs et glaciers, donne environ 543 940 km\xB2.",
    "IGN, superficie de la France m\xE9tropolitaine"
  ],
  [
    "geo-05",
    2,
    "Combien d\u2019habitants compte la France au 1er janvier 2025, en millions ?",
    68.6,
    "millions",
    "count",
    rel(0.03),
    "L\u2019INSEE estime la population \xE0 68,6 millions d\u2019habitants, outre-mer compris.",
    "INSEE Premi\xE8re, Bilan d\xE9mographique 2024",
    { decimals: 1, asOf: "1er janvier 2025", tags: ["pop-fr"] }
  ],
  [
    "geo-06",
    2,
    "Combien de pays compte le continent africain (membres de l\u2019ONU) ?",
    54,
    "pays",
    "count",
    abs(3),
    "C\u2019est le continent qui compte le plus d\u2019\xC9tats souverains.",
    "Nations unies, liste des \xC9tats membres",
    { asOf: "2025" }
  ],
  [
    "geo-07",
    2,
    "Quelle est la longueur du Nil, en km ?",
    6650,
    "km",
    "measure",
    rel(0.05),
    "On retient g\xE9n\xE9ralement environ 6 650 km. Selon la source retenue pour sa source, l\u2019Amazone le d\xE9passe parfois.",
    "Encyclop\xE6dia Britannica, \xAB Nile River \xBB"
  ],
  [
    "geo-08",
    3,
    "Quelle est la profondeur maximale de la fosse des Mariannes (Challenger Deep), en m\xE8tres ?",
    10935,
    "m",
    "measure",
    rel(0.02),
    "Les mesures r\xE9centes varient entre 10 900 et 10 994 m. Le point le plus profond connu des oc\xE9ans.",
    "NOAA, Ocean Exploration \u2014 Challenger Deep"
  ],
  [
    "geo-09",
    2,
    "Quelle distance s\xE9pare Paris de Marseille \xE0 vol d\u2019oiseau, en km ?",
    660,
    "km",
    "measure",
    rel(0.08),
    "Environ 660 km en ligne droite entre les deux centres-villes ; pr\xE8s de 775 km par l\u2019autoroute.",
    "Calcul orthodromique entre les coordonn\xE9es des deux villes",
    { tags: ["distance-fr"] }
  ],
  [
    "geo-10",
    3,
    "Quelle distance s\xE9pare Paris de New York \xE0 vol d\u2019oiseau, en km ?",
    5837,
    "km",
    "measure",
    rel(0.06),
    "Environ 5 840 km : un vol transatlantique dure environ 8 heures dans ce sens.",
    "Calcul orthodromique entre les coordonn\xE9es des deux villes",
    { tags: ["distance-monde"] }
  ],
  [
    "geo-11",
    3,
    "Combien de fuseaux horaires couvre la France, outre-mer compris ?",
    12,
    "fuseaux",
    "count",
    abs(1),
    "Gr\xE2ce \xE0 ses territoires d\u2019outre-mer, la France est le pays qui s\u2019\xE9tend sur le plus de fuseaux horaires.",
    "Bureau des longitudes ; IERS, fuseaux horaires officiels"
  ],
  [
    "geo-12",
    3,
    "Quelle est la superficie de la Russie, en millions de km\xB2 ?",
    17.1,
    "millions de km\xB2",
    "measure",
    rel(0.05),
    "Plus grand pays du monde, environ 31 fois la France m\xE9tropolitaine.",
    "Encyclop\xE6dia Britannica, \xAB Russia \xBB",
    { decimals: 1 }
  ],
  [
    "geo-13",
    2,
    "Combien d\u2019habitants compte la ville de Paris (population municipale 2022) ?",
    2113705,
    "habitants",
    "count",
    rel(0.06),
    "Paris perd des habitants depuis plusieurs ann\xE9es, tandis que l\u2019\xCEle-de-France d\xE9passe 12 millions.",
    "INSEE, population de r\xE9f\xE9rence 2022 de la ville de Paris",
    { asOf: "2022", tags: ["pop-paris"] }
  ],
  [
    "geo-14",
    3,
    "Quelle est l\u2019altitude du Kilimandjaro, point culminant de l\u2019Afrique, en m\xE8tres ?",
    5895,
    "m",
    "measure",
    rel(0.03),
    "Le sommet Uhuru, sur le volcan Kibo, culmine \xE0 5 895 m en Tanzanie.",
    "Tanzania National Parks (TANAPA)"
  ],
  [
    "geo-15",
    2,
    "Quelle est la longueur de la Seine, en km ?",
    777,
    "km",
    "measure",
    rel(0.05),
    "De sa source sur le plateau de Langres jusqu\u2019\xE0 la Manche, entre Le Havre et Honfleur.",
    "SANDRE, r\xE9f\xE9rentiel des cours d\u2019eau",
    { tags: ["fleuves-fr"] }
  ],
  [
    "geo-16",
    3,
    "Quelle est la superficie de la Corse, en km\xB2 ?",
    8680,
    "km\xB2",
    "measure",
    rel(0.05),
    "Quatri\xE8me \xEEle de M\xE9diterran\xE9e par la taille, apr\xE8s la Sicile, la Sardaigne et Chypre.",
    "INSEE, Corse \u2014 territoire"
  ],
  [
    "geo-17",
    3,
    "Quelle est la profondeur moyenne des oc\xE9ans, en m\xE8tres ?",
    3700,
    "m",
    "measure",
    rel(0.08),
    "Environ 3 700 m, alors que l\u2019altitude moyenne des terres \xE9merg\xE9es n\u2019est que de 840 m environ.",
    "NOAA, \xAB How deep is the ocean? \xBB"
  ],
  [
    "geo-18",
    4,
    "Combien de pays le Danube traverse-t-il ou longe-t-il ?",
    10,
    "pays",
    "count",
    abs(1),
    "Allemagne, Autriche, Slovaquie, Hongrie, Croatie, Serbie, Roumanie, Bulgarie, Moldavie et Ukraine : un record mondial.",
    "Commission internationale pour la protection du Danube (ICPDR)"
  ],
  [
    "geo-19",
    2,
    "Quelle est la superficie du d\xE9sert du Sahara, en millions de km\xB2 ?",
    9,
    "millions de km\xB2",
    "measure",
    rel(0.1),
    "Environ 9 millions de km\xB2, soit presque la taille des \xC9tats-Unis. C\u2019est le plus grand d\xE9sert chaud.",
    "Encyclop\xE6dia Britannica, \xAB Sahara \xBB",
    { decimals: 1 }
  ],
  [
    "geo-20",
    3,
    "Quelle est l\u2019altitude du puy de D\xF4me, en m\xE8tres ?",
    1465,
    "m",
    "measure",
    rel(0.03),
    "Le plus haut volcan de la cha\xEEne des Puys, inscrite au patrimoine mondial de l\u2019UNESCO en 2018.",
    "Parc naturel r\xE9gional des Volcans d\u2019Auvergne",
    { tags: ["montagne-fr"] }
  ],
  [
    "geo-21",
    4,
    "Quelle est l\u2019altitude de l\u2019Aneto, point culminant des Pyr\xE9n\xE9es, en m\xE8tres ?",
    3404,
    "m",
    "measure",
    rel(0.03),
    "Situ\xE9 en Espagne, dans le massif de la Maladeta. Le plus haut sommet c\xF4t\xE9 fran\xE7ais est le Vignemale (3 298 m).",
    "Instituto Geogr\xE1fico Nacional (Espagne)",
    { tags: ["montagne-fr"] }
  ],
  [
    "geo-22",
    3,
    "Quelle est la profondeur maximale du lac Ba\xEFkal, en m\xE8tres ?",
    1642,
    "m",
    "measure",
    rel(0.03),
    "Le lac le plus profond du monde contient environ 20 % de l\u2019eau douce liquide de surface de la plan\xE8te.",
    "UNESCO, Lac Ba\xEFkal (patrimoine mondial)"
  ],
  [
    "geo-23",
    3,
    "Combien de communes compte la France au 1er janvier 2024 ?",
    34935,
    "communes",
    "count",
    rel(0.03),
    "Leur nombre baisse lentement avec les fusions en \xAB communes nouvelles \xBB.",
    "DGCL, Les collectivit\xE9s locales en chiffres 2024",
    { asOf: "1er janvier 2024" }
  ],
  [
    "geo-24",
    3,
    "Quelle distance s\xE9pare Brest de Strasbourg \xE0 vol d\u2019oiseau, en km ?",
    901,
    "km",
    "measure",
    rel(0.06),
    "Environ 900 km : c\u2019est \xE0 peu pr\xE8s la plus grande largeur de la France m\xE9tropolitaine d\u2019ouest en est.",
    "Calcul orthodromique entre les coordonn\xE9es des deux villes",
    { tags: ["distance-fr"] }
  ],
  [
    "geo-25",
    2,
    "Quelle est la circonf\xE9rence de la Terre \xE0 l\u2019\xE9quateur, en km ?",
    40075,
    "km",
    "measure",
    rel(0.03),
    "Le m\xE8tre a \xE9t\xE9 d\xE9fini en 1791 comme la dix-millioni\xE8me partie du quart de m\xE9ridien terrestre, d\u2019o\xF9 ce tour d\u2019environ 40 000 km.",
    "NASA, Earth Fact Sheet"
  ],
  [
    "geo-26",
    3,
    "Quelle est la longueur de la Volga, plus long fleuve d\u2019Europe, en km ?",
    3530,
    "km",
    "measure",
    rel(0.05),
    "Elle se jette dans la mer Caspienne apr\xE8s avoir travers\xE9 la Russie occidentale.",
    "Encyclop\xE6dia Britannica, \xAB Volga River \xBB"
  ],
  [
    "geo-27",
    3,
    "Quelle distance s\xE9pare Paris de Tokyo \xE0 vol d\u2019oiseau, en km ?",
    9712,
    "km",
    "measure",
    rel(0.06),
    "Environ 9 700 km : environ 14 heures de vol direct.",
    "Calcul orthodromique entre les coordonn\xE9es des deux villes",
    { tags: ["distance-monde"] }
  ]
]);

// src/shared/questions/sciences.ts
var sciences_default = make("sciences", [
  [
    "sci-01",
    1,
    "Combien d\u2019os compte le squelette d\u2019un adulte ?",
    206,
    "os",
    "count",
    abs(6),
    "Un nouveau-n\xE9 en a environ 300 : beaucoup fusionnent pendant la croissance.",
    "Encyclop\xE6dia Britannica, \xAB Human skeleton \xBB",
    { tags: ["squelette"] }
  ],
  [
    "sci-02",
    2,
    "\xC0 quelle temp\xE9rature l\u2019eau bout-elle au niveau de la mer, en degr\xE9s Fahrenheit ?",
    212,
    "\xB0F",
    "measure",
    abs(3),
    "100 \xB0C = 212 \xB0F. L\u2019\xE9chelle Fahrenheit place la cong\xE9lation de l\u2019eau \xE0 32 \xB0F.",
    "NIST, conversion des temp\xE9ratures",
    { tags: ["ebullition"] }
  ],
  [
    "sci-03",
    2,
    "Quelle est la vitesse de la lumi\xE8re dans le vide, en km par seconde ?",
    299792,
    "km/s",
    "measure",
    rel(0.02),
    "Exactement 299 792,458 km/s : depuis 1983, c\u2019est elle qui d\xE9finit le m\xE8tre.",
    "BIPM, Syst\xE8me international d\u2019unit\xE9s (9e \xE9dition)",
    { tags: ["lumiere"] }
  ],
  [
    "sci-04",
    2,
    "Quelle est la vitesse du son dans l\u2019air \xE0 20 \xB0C, en m\xE8tres par seconde ?",
    343,
    "m/s",
    "measure",
    rel(0.05),
    "Environ 343 m/s, soit environ 1 235 km/h. Elle augmente avec la temp\xE9rature.",
    "Encyclop\xE6dia Britannica, \xAB Speed of sound \xBB"
  ],
  [
    "sci-05",
    2,
    "\xC0 quelle temp\xE9rature correspond le z\xE9ro absolu, en degr\xE9s Celsius ?",
    -273.15,
    "\xB0C",
    "measure",
    abs(2),
    "0 kelvin = \u2212273,15 \xB0C : la temp\xE9rature la plus basse th\xE9oriquement possible.",
    "BIPM, d\xE9finition du kelvin",
    { decimals: 2, signed: true }
  ],
  [
    "sci-06",
    2,
    "Combien d\u2019\xE9l\xE9ments chimiques compte le tableau p\xE9riodique officiel ?",
    118,
    "\xE9l\xE9ments",
    "count",
    abs(4),
    "Le dernier ajout\xE9 est l\u2019oganesson (118), nomm\xE9 en 2016.",
    "IUPAC, Periodic Table of Elements",
    { tags: ["tableau-periodique"] }
  ],
  [
    "sci-07",
    3,
    "Quel est le num\xE9ro atomique de l\u2019or ?",
    79,
    "",
    "count",
    abs(3),
    "Son symbole Au vient du latin aurum. Il poss\xE8de 79 protons.",
    "IUPAC, Periodic Table of Elements",
    { tags: ["tableau-periodique"] }
  ],
  [
    "sci-08",
    1,
    "Combien de chromosomes compte une cellule humaine ordinaire ?",
    46,
    "chromosomes",
    "count",
    abs(2),
    "23 paires : 22 paires d\u2019autosomes et une paire de chromosomes sexuels.",
    "Institut national du cancer ; NIH, Genetics Home Reference"
  ],
  [
    "sci-09",
    2,
    "Quelle est la valeur de \u03C0 arrondie \xE0 quatre d\xE9cimales ?",
    3.1416,
    "",
    "measure",
    abs(1e-3),
    "\u03C0 \u2248 3,14159265\u2026 Ses d\xE9cimales ne se r\xE9p\xE8tent jamais : c\u2019est un nombre irrationnel.",
    "D\xE9finition math\xE9matique de \u03C0",
    { decimals: 4 }
  ],
  [
    "sci-10",
    2,
    "Combien de litres de sang circulent environ dans le corps d\u2019un adulte ?",
    5,
    "litres",
    "measure",
    rel(0.15),
    "Entre 4,5 et 5,5 litres environ, soit 7 \xE0 8 % du poids du corps.",
    "\xC9tablissement fran\xE7ais du sang (EFS)",
    { decimals: 1 }
  ],
  [
    "sci-11",
    4,
    "\xC0 quelle temp\xE9rature le fer pur fond-il, en \xB0C ?",
    1538,
    "\xB0C",
    "measure",
    rel(0.03),
    "Le fer pur fond \xE0 1 538 \xB0C. Ajouter du carbone (fonte) abaisse ce point de fusion.",
    "Royal Society of Chemistry, fiche \xAB Iron \xBB"
  ],
  [
    "sci-12",
    3,
    "Le nombre d\u2019Avogadro vaut 6,022 \xD7 10 puissance\u2026 ?",
    23,
    "",
    "count",
    abs(1),
    "N_A = 6,022 140 76 \xD7 10\xB2\xB3 par mole, valeur exacte depuis 2019.",
    "BIPM, Syst\xE8me international d\u2019unit\xE9s (9e \xE9dition)"
  ],
  [
    "sci-13",
    2,
    "Quel est le pH de l\u2019eau pure \xE0 25 \xB0C ?",
    7,
    "",
    "measure",
    abs(0.3),
    "Un pH de 7 est neutre ; en dessous c\u2019est acide, au-dessus c\u2019est basique.",
    "IUPAC, Gold Book \xAB pH \xBB",
    { decimals: 1 }
  ],
  [
    "sci-14",
    3,
    "Combien de neurones contient environ le cerveau humain, en milliards ?",
    86,
    "milliards",
    "count",
    rel(0.15),
    "Environ 86 milliards selon une \xE9tude de 2009, bien loin des \xAB 100 milliards \xBB souvent cit\xE9s.",
    "Azevedo et al., Journal of Comparative Neurology, 2009"
  ],
  [
    "sci-15",
    4,
    "D\xE9roul\xE9, l\u2019ADN d\u2019une seule cellule humaine mesure environ combien de m\xE8tres ?",
    2,
    "m",
    "measure",
    rel(0.2),
    "Environ 2 m\xE8tres d\u2019ADN compact\xE9s dans un noyau de quelques microm\xE8tres.",
    "NIH, National Human Genome Research Institute",
    { decimals: 1 }
  ],
  [
    "sci-16",
    2,
    "Quelle est l\u2019acc\xE9l\xE9ration de la pesanteur \xE0 la surface de la Terre, en m/s\xB2 ?",
    9.81,
    "m/s\xB2",
    "measure",
    abs(0.1),
    "La valeur normale est 9,806 65 m/s\xB2. Elle varie l\xE9g\xE8rement selon la latitude et l\u2019altitude.",
    "BIPM, valeur conventionnelle de g",
    { decimals: 2 }
  ],
  [
    "sci-17",
    1,
    "Combien de dents compte la dentition compl\xE8te d\u2019un adulte ?",
    32,
    "dents",
    "count",
    abs(2),
    "Dont les quatre dents de sagesse, qui n\u2019apparaissent pas chez tout le monde.",
    "Union fran\xE7aise pour la sant\xE9 bucco-dentaire (UFSBD)"
  ],
  [
    "sci-18",
    3,
    "Combien de faces poss\xE8de un dod\xE9ca\xE8dre ?",
    12,
    "faces",
    "count",
    abs(1),
    "Le dod\xE9ca\xE8dre r\xE9gulier a 12 faces pentagonales : c\u2019est l\u2019un des cinq solides de Platon.",
    "D\xE9finition g\xE9om\xE9trique"
  ],
  [
    "sci-19",
    4,
    "Combien de chiffres compte le nombre 2\u2076\u2074 ?",
    20,
    "chiffres",
    "count",
    abs(1),
    "2\u2076\u2074 = 18 446 744 073 709 551 616 : c\u2019est le nombre de grains de la l\xE9gende de l\u2019\xE9chiquier.",
    "Calcul"
  ],
  [
    "sci-20",
    3,
    "Combien de nombres premiers sont inf\xE9rieurs \xE0 100 ?",
    25,
    "nombres",
    "count",
    abs(2),
    "2, 3, 5, 7, 11\u2026 jusqu\u2019\xE0 97 : il y en a exactement 25.",
    "Calcul ; OEIS A000720"
  ],
  [
    "sci-21",
    1,
    "Quelle est la temp\xE9rature normale du corps humain, en \xB0C ?",
    37,
    "\xB0C",
    "measure",
    abs(0.4),
    "Environ 37 \xB0C, avec des variations de quelques dixi\xE8mes au cours de la journ\xE9e.",
    "Assurance maladie (ameli.fr), fi\xE8vre",
    { decimals: 1 }
  ],
  [
    "sci-22",
    4,
    "Quelle est la masse d\u2019un litre d\u2019air au niveau de la mer \xE0 15 \xB0C, en grammes ?",
    1.2,
    "g",
    "measure",
    abs(0.1),
    "Environ 1,225 g par litre, soit 1,225 kg par m\xE8tre cube dans l\u2019atmosph\xE8re standard.",
    "Atmosph\xE8re type internationale (ISO 2533)",
    { decimals: 2 }
  ],
  [
    "sci-23",
    3,
    "Quelle est la vitesse de rotation de la Terre \xE0 l\u2019\xE9quateur, en km/h ?",
    1670,
    "km/h",
    "measure",
    rel(0.05),
    "40 075 km parcourus en environ 24 heures : pr\xE8s de 1 670 km/h, sans que nous le ressentions.",
    "Calcul \xE0 partir de la NASA Earth Fact Sheet"
  ],
  [
    "sci-24",
    2,
    "Combien de c\xF4t\xE9s poss\xE8de un hexagone ?",
    6,
    "c\xF4t\xE9s",
    "count",
    abs(0),
    "Hexa signifie \xAB six \xBB en grec. Les alv\xE9oles des abeilles sont hexagonales.",
    "D\xE9finition g\xE9om\xE9trique"
  ],
  [
    "sci-25",
    3,
    "Combien de paires de c\xF4tes poss\xE8de un \xEAtre humain ?",
    12,
    "paires",
    "count",
    abs(1),
    "12 paires, dont 2 paires de \xAB c\xF4tes flottantes \xBB non reli\xE9es au sternum.",
    "Encyclop\xE6dia Britannica, \xAB Rib \xBB",
    { tags: ["squelette"] }
  ]
]);

// src/shared/questions/nature.ts
var nature_default = make("nature", [
  [
    "nat-01",
    2,
    "Quelle longueur peut atteindre une baleine bleue, en m\xE8tres ?",
    30,
    "m",
    "measure",
    rel(0.1),
    "Environ 30 m pour les plus grands sp\xE9cimens : c\u2019est le plus grand animal ayant jamais v\xE9cu.",
    "NOAA Fisheries, \xAB Blue Whale \xBB",
    { tags: ["baleine"] }
  ],
  [
    "nat-02",
    2,
    "Combien de mois dure la gestation d\u2019une \xE9l\xE9phante d\u2019Afrique ?",
    22,
    "mois",
    "duration",
    abs(2),
    "Environ 22 mois : la plus longue gestation de tous les mammif\xE8res terrestres.",
    "San Diego Zoo Wildlife Alliance, \xAB African Elephant \xBB"
  ],
  [
    "nat-03",
    1,
    "Quelle vitesse de pointe peut atteindre un gu\xE9pard, en km/h ?",
    110,
    "km/h",
    "measure",
    rel(0.1),
    "Entre 100 et 120 km/h sur de courtes distances, mais il s\u2019\xE9puise apr\xE8s quelques centaines de m\xE8tres.",
    "Smithsonian\u2019s National Zoo, \xAB Cheetah \xBB"
  ],
  [
    "nat-04",
    3,
    "Combien de c\u0153urs poss\xE8de une pieuvre ?",
    3,
    "c\u0153urs",
    "count",
    abs(0),
    "Deux c\u0153urs irriguent les branchies, le troisi\xE8me le reste du corps. Son sang est bleu.",
    "Smithsonian Ocean, \xAB Octopus \xBB"
  ],
  [
    "nat-05",
    2,
    "Quelle hauteur peut atteindre une girafe m\xE2le adulte, en m\xE8tres ?",
    5.5,
    "m",
    "measure",
    rel(0.1),
    "Jusqu\u2019\xE0 environ 5,5 m : le plus grand animal terrestre.",
    "Giraffe Conservation Foundation",
    { decimals: 1, tags: ["girafe"] }
  ],
  [
    "nat-06",
    3,
    "Combien p\xE8se le colibri d\u2019Elena, plus petit oiseau du monde, en grammes ?",
    2,
    "g",
    "measure",
    rel(0.2),
    "Environ 2 grammes, moins qu\u2019une pi\xE8ce d\u2019un centime. Il vit \xE0 Cuba.",
    "Encyclop\xE6dia Britannica, \xAB Bee hummingbird \xBB",
    { decimals: 1 }
  ],
  [
    "nat-07",
    3,
    "Combien d\u2019yeux poss\xE8dent la plupart des araign\xE9es ?",
    8,
    "yeux",
    "count",
    abs(1),
    "La plupart en ont huit, certaines six, et quelques esp\xE8ces cavernicoles aucun.",
    "Mus\xE9um national d\u2019histoire naturelle, araign\xE9es"
  ],
  [
    "nat-08",
    3,
    "Combien de vert\xE8bres cervicales poss\xE8de une girafe ?",
    7,
    "vert\xE8bres",
    "count",
    abs(1),
    "Autant que l\u2019\xEAtre humain ! Mais chacune mesure jusqu\u2019\xE0 25 cm de long.",
    "Giraffe Conservation Foundation",
    { tags: ["girafe"] }
  ],
  [
    "nat-09",
    2,
    "Quelle vitesse atteint un faucon p\xE8lerin en piqu\xE9, en km/h ?",
    390,
    "km/h",
    "measure",
    rel(0.1),
    "Environ 390 km/h mesur\xE9s en piqu\xE9 : l\u2019animal le plus rapide du monde.",
    "National Geographic, \xAB Peregrine falcon \xBB"
  ],
  [
    "nat-10",
    3,
    "Combien p\xE8se le c\u0153ur d\u2019une baleine bleue, en kg ?",
    180,
    "kg",
    "measure",
    rel(0.2),
    "Un c\u0153ur \xE9tudi\xE9 en 2014 pesait environ 180 kg, \xE0 peu pr\xE8s la taille d\u2019une voiture de golf selon les chercheurs.",
    "Royal Ontario Museum, \xE9tude d\u2019un c\u0153ur de baleine bleue (2014)",
    { tags: ["baleine"] }
  ],
  [
    "nat-11",
    3,
    "Combien p\xE8se un panda g\xE9ant \xE0 la naissance, en grammes ?",
    100,
    "g",
    "measure",
    rel(0.25),
    "Environ 100 g, soit \xE0 peu pr\xE8s 1/900e du poids de sa m\xE8re.",
    "Smithsonian\u2019s National Zoo, \xAB Giant Panda \xBB"
  ],
  [
    "nat-12",
    2,
    "Combien d\u2019heures par jour un koala peut-il dormir ?",
    20,
    "heures",
    "duration",
    abs(2),
    "Jusqu\u2019\xE0 18 \xE0 22 heures : son r\xE9gime d\u2019eucalyptus est tr\xE8s pauvre en \xE9nergie.",
    "Australian Koala Foundation"
  ],
  [
    "nat-13",
    4,
    "Quel \xE2ge a environ le pin \xAB Mathusalem \xBB, plus vieil arbre non clonal connu, en ann\xE9es ?",
    4850,
    "ans",
    "duration",
    rel(0.04),
    "Ce pin de Bristlecone de Californie a germ\xE9 il y a environ 4 850 ans. Sa localisation exacte est gard\xE9e secr\xE8te.",
    "US Forest Service, Ancient Bristlecone Pine Forest",
    { asOf: "2025" }
  ],
  [
    "nat-14",
    4,
    "Quelle distance parcourt en moyenne une sterne arctique en une ann\xE9e de migration, en km ?",
    70900,
    "km",
    "measure",
    rel(0.1),
    "Environ 70 900 km par an en moyenne selon l\u2019\xE9tude de 2010 : la plus longue migration connue.",
    "Egevang et al., PNAS, 2010"
  ],
  [
    "nat-15",
    2,
    "Quel pourcentage d\u2019ADN l\u2019\xEAtre humain partage-t-il avec le chimpanz\xE9 ?",
    98.8,
    "%",
    "percent",
    abs(1),
    "Environ 98,8 % de similarit\xE9 de s\xE9quence selon le s\xE9quen\xE7age du g\xE9nome du chimpanz\xE9.",
    "Chimpanzee Sequencing and Analysis Consortium, Nature, 2005",
    { decimals: 1 }
  ],
  [
    "nat-16",
    2,
    "Combien de compartiments compte l\u2019estomac d\u2019une vache ?",
    4,
    "compartiments",
    "count",
    abs(0),
    "Panse, bonnet, feuillet et caillette : la vache est un ruminant.",
    "INRAE, digestion des ruminants"
  ],
  [
    "nat-17",
    3,
    "Quelle est la hauteur d\u2019Hyperion, plus grand arbre vivant connu, en m\xE8tres ?",
    116,
    "m",
    "measure",
    rel(0.04),
    "Ce s\xE9quoia \xE0 feuilles d\u2019if de Californie mesure environ 116 m, plus haut que la statue de la Libert\xE9 avec son socle.",
    "Redwood National and State Parks (NPS)"
  ],
  [
    "nat-18",
    2,
    "Combien p\xE8se un \u0153uf d\u2019autruche, en kg ?",
    1.4,
    "kg",
    "measure",
    rel(0.2),
    "Environ 1,4 kg en moyenne, l\u2019\xE9quivalent d\u2019une vingtaine d\u2019\u0153ufs de poule.",
    "San Diego Zoo Wildlife Alliance, \xAB Ostrich \xBB",
    { decimals: 1 }
  ],
  [
    "nat-19",
    4,
    "Combien de pattes poss\xE8de le mille-pattes Eumillipes persephone, record du monde ?",
    1306,
    "pattes",
    "count",
    rel(0.1),
    "D\xE9couvert en Australie en 2021, c\u2019est le premier vrai \xAB mille-pattes \xBB : 1 306 pattes.",
    "Marek et al., Scientific Reports, 2021"
  ],
  [
    "nat-20",
    3,
    "Quel \xE2ge a atteint Creme Puff, la chatte la plus \xE2g\xE9e jamais recens\xE9e ?",
    38,
    "ans",
    "duration",
    abs(3),
    "N\xE9e en 1967 et morte en 2005 au Texas, \xE0 38 ans et 3 jours.",
    "Guinness World Records, \xAB Oldest cat ever \xBB"
  ],
  [
    "nat-21",
    3,
    "Combien d\u2019\u0153ufs une poule pondeuse moderne pond-elle environ par an ?",
    300,
    "\u0153ufs",
    "count",
    rel(0.1),
    "Les souches s\xE9lectionn\xE9es pondent environ 300 \u0153ufs par an, contre une douzaine par saison chez la poule sauvage.",
    "ITAVI, Institut technique de l\u2019aviculture"
  ],
  [
    "nat-22",
    2,
    "Combien de pattes poss\xE8de un homard ?",
    10,
    "pattes",
    "count",
    abs(1),
    "Dix pattes, dont la premi\xE8re paire porte les pinces : c\u2019est un d\xE9capode.",
    "Mus\xE9um national d\u2019histoire naturelle, crustac\xE9s d\xE9capodes"
  ],
  [
    "nat-23",
    1,
    "Combien de bosses poss\xE8de un dromadaire ?",
    1,
    "bosse",
    "count",
    abs(0),
    "Une seule, contre deux pour le chameau de Bactriane. La bosse stocke de la graisse, pas de l\u2019eau.",
    "Encyclop\xE6dia Britannica, \xAB Dromedary \xBB"
  ]
]);

// src/shared/questions/espace.ts
var espace_default = make("espace", [
  [
    "esp-01",
    1,
    "En quelle ann\xE9e l\u2019\xEAtre humain a-t-il march\xE9 sur la Lune pour la premi\xE8re fois ?",
    1969,
    "",
    "year",
    abs(2),
    "Le 21 juillet 1969 (heure de Paris), Neil Armstrong pose le pied sur la mer de la Tranquillit\xE9.",
    "NASA, Apollo 11 Mission Overview",
    { tags: ["apollo"] }
  ],
  [
    "esp-02",
    1,
    "Quelle est la distance moyenne entre la Terre et la Lune, en km ?",
    384400,
    "km",
    "measure",
    rel(0.05),
    "Environ 384 400 km. La Lune s\u2019\xE9loigne de nous d\u2019environ 3,8 cm par an.",
    "NASA, Moon Fact Sheet",
    { tags: ["lune-distance"] }
  ],
  [
    "esp-03",
    2,
    "Quelle est la distance moyenne entre la Terre et le Soleil, en millions de km ?",
    149.6,
    "millions de km",
    "measure",
    rel(0.05),
    "C\u2019est l\u2019unit\xE9 astronomique : 149 597 870,7 km exactement.",
    "Union astronomique internationale, r\xE9solution B2 (2012)",
    { decimals: 1 }
  ],
  [
    "esp-04",
    2,
    "Combien de lunes naturelles poss\xE8de Mars ?",
    2,
    "lunes",
    "count",
    abs(0),
    "Phobos et Deimos, deux petites lunes irr\xE9guli\xE8res, probablement des ast\xE9ro\xEFdes captur\xE9s.",
    "NASA, Mars Moons",
    { tags: ["mars"] }
  ],
  [
    "esp-05",
    3,
    "Combien de jours terrestres dure une ann\xE9e sur Mars ?",
    687,
    "jours",
    "duration",
    rel(0.05),
    "Environ 687 jours terrestres, soit pr\xE8s de deux ann\xE9es terrestres.",
    "NASA, Mars Fact Sheet",
    { tags: ["mars"] }
  ],
  [
    "esp-06",
    3,
    "Combien de secondes la lumi\xE8re du Soleil met-elle pour atteindre la Terre ?",
    499,
    "secondes",
    "duration",
    rel(0.05),
    "Environ 8 minutes et 19 secondes : on voit toujours le Soleil tel qu\u2019il \xE9tait il y a 8 minutes.",
    "Calcul : unit\xE9 astronomique / vitesse de la lumi\xE8re",
    { tags: ["lumiere"] }
  ],
  [
    "esp-07",
    3,
    "Quelle est la temp\xE9rature moyenne \xE0 la surface de V\xE9nus, en \xB0C ?",
    464,
    "\xB0C",
    "measure",
    rel(0.05),
    "Environ 464 \xB0C \xE0 cause d\u2019un effet de serre extr\xEAme : plus chaud que Mercure, pourtant plus proche du Soleil.",
    "NASA, Venus Fact Sheet",
    { tags: ["venus"] }
  ],
  [
    "esp-08",
    2,
    "Quel est le diam\xE8tre de la Terre \xE0 l\u2019\xE9quateur, en km ?",
    12756,
    "km",
    "measure",
    rel(0.03),
    "Environ 12 756 km, contre 12 714 km d\u2019un p\xF4le \xE0 l\u2019autre : la Terre est l\xE9g\xE8rement aplatie.",
    "NASA, Earth Fact Sheet"
  ],
  [
    "esp-09",
    2,
    "Quel est l\u2019\xE2ge de l\u2019Univers, en milliards d\u2019ann\xE9es ?",
    13.8,
    "milliards d\u2019ann\xE9es",
    "duration",
    rel(0.05),
    "Environ 13,8 milliards d\u2019ann\xE9es selon les mesures du satellite Planck.",
    "ESA, mission Planck (2018)",
    { decimals: 1 }
  ],
  [
    "esp-10",
    2,
    "Combien d\u2019astronautes ont march\xE9 sur la Lune ?",
    12,
    "astronautes",
    "count",
    abs(1),
    "Douze hommes, tous Am\xE9ricains, entre 1969 et 1972 (missions Apollo 11 \xE0 17, sauf Apollo 13).",
    "NASA, Apollo Program",
    { tags: ["apollo"] }
  ],
  [
    "esp-11",
    3,
    "\xC0 quelle vitesse la Station spatiale internationale tourne-t-elle autour de la Terre, en km/h ?",
    28e3,
    "km/h",
    "measure",
    rel(0.05),
    "Environ 28 000 km/h : elle fait le tour de la Terre en 90 minutes environ, soit 16 fois par jour.",
    "NASA, International Space Station Facts",
    { tags: ["iss"] }
  ],
  [
    "esp-12",
    2,
    "\xC0 quelle altitude orbite la Station spatiale internationale, en km ?",
    400,
    "km",
    "measure",
    rel(0.1),
    "Environ 400 km, une altitude r\xE9guli\xE8rement remont\xE9e car l\u2019atmosph\xE8re r\xE9siduelle la freine.",
    "NASA, International Space Station Facts",
    { tags: ["iss"] }
  ],
  [
    "esp-13",
    2,
    "En quelle ann\xE9e Spoutnik 1, premier satellite artificiel, a-t-il \xE9t\xE9 lanc\xE9 ?",
    1957,
    "",
    "year",
    abs(2),
    "Lanc\xE9 par l\u2019URSS le 4 octobre 1957, il marque le d\xE9but de la conqu\xEAte spatiale.",
    "NASA History Office, \xAB Sputnik \xBB"
  ],
  [
    "esp-14",
    3,
    "Quel est l\u2019\xE2ge du Syst\xE8me solaire, en milliards d\u2019ann\xE9es ?",
    4.6,
    "milliards d\u2019ann\xE9es",
    "duration",
    rel(0.05),
    "Environ 4,57 milliards d\u2019ann\xE9es, d\u2019apr\xE8s la datation des plus anciennes m\xE9t\xE9orites.",
    "NASA, Solar System Exploration",
    { decimals: 1 }
  ],
  [
    "esp-15",
    4,
    "Combien de jours terrestres dure une rotation de V\xE9nus sur elle-m\xEAme ?",
    243,
    "jours",
    "duration",
    rel(0.05),
    "Environ 243 jours, plus que son ann\xE9e (225 jours). Elle tourne en plus dans le sens r\xE9trograde.",
    "NASA, Venus Fact Sheet",
    { tags: ["venus"] }
  ],
  [
    "esp-16",
    3,
    "Combien de fois Jupiter est-elle plus massive que la Terre ?",
    318,
    "fois",
    "count",
    rel(0.05),
    "Environ 318 fois : plus du double de toutes les autres plan\xE8tes r\xE9unies.",
    "NASA, Jupiter Fact Sheet"
  ],
  [
    "esp-17",
    3,
    "\xC0 combien d\u2019ann\xE9es-lumi\xE8re se trouve Proxima du Centaure, l\u2019\xE9toile la plus proche du Soleil ?",
    4.24,
    "ann\xE9es-lumi\xE8re",
    "measure",
    rel(0.03),
    "Environ 4,24 ann\xE9es-lumi\xE8re, soit 40 000 milliards de km.",
    "ESO, Proxima Centauri",
    { decimals: 2 }
  ],
  [
    "esp-18",
    2,
    "En quelle ann\xE9e le t\xE9lescope spatial Hubble a-t-il \xE9t\xE9 lanc\xE9 ?",
    1990,
    "",
    "year",
    abs(2),
    "Mis en orbite le 24 avril 1990 par la navette Discovery.",
    "NASA, Hubble Space Telescope",
    { tags: ["telescopes"] }
  ],
  [
    "esp-19",
    2,
    "En quelle ann\xE9e le t\xE9lescope spatial James-Webb a-t-il \xE9t\xE9 lanc\xE9 ?",
    2021,
    "",
    "year",
    abs(1),
    "Lanc\xE9 le 25 d\xE9cembre 2021 par une fus\xE9e Ariane 5 depuis Kourou, en Guyane.",
    "ESA, James Webb Space Telescope",
    { tags: ["telescopes"] }
  ],
  [
    "esp-20",
    3,
    "Combien de missions Apollo ont r\xE9ussi \xE0 se poser sur la Lune ?",
    6,
    "missions",
    "count",
    abs(1),
    "Apollo 11, 12, 14, 15, 16 et 17. Apollo 13 a d\xFB renoncer apr\xE8s une explosion \xE0 bord.",
    "NASA, Apollo Program",
    { tags: ["apollo"] }
  ],
  [
    "esp-21",
    3,
    "Quelle est la vitesse de lib\xE9ration \xE0 la surface de la Terre, en km/s ?",
    11.2,
    "km/s",
    "measure",
    rel(0.05),
    "Il faut environ 11,2 km/s, soit 40 000 km/h, pour \xE9chapper \xE0 l\u2019attraction terrestre sans propulsion.",
    "NASA, Earth Fact Sheet",
    { decimals: 1 }
  ],
  [
    "esp-22",
    3,
    "Combien de fois le diam\xE8tre du Soleil est-il plus grand que celui de la Terre ?",
    109,
    "fois",
    "count",
    rel(0.05),
    "Environ 109 fois : on pourrait aligner 109 Terres sur son diam\xE8tre.",
    "NASA, Sun Fact Sheet",
    { tags: ["soleil-taille"] }
  ],
  [
    "esp-23",
    3,
    "Tous les combien d\u2019ann\xE9es la com\xE8te de Halley revient-elle pr\xE8s du Soleil ?",
    76,
    "ans",
    "duration",
    abs(3),
    "Environ tous les 76 ans. Dernier passage en 1986, prochain pr\xE9vu en 2061.",
    "NASA, Comet Halley"
  ],
  [
    "esp-24",
    4,
    "Quelle est la temp\xE9rature de la surface visible du Soleil, en kelvins ?",
    5772,
    "K",
    "measure",
    rel(0.05),
    "Environ 5 772 K (pr\xE8s de 5 500 \xB0C), alors que la couronne d\xE9passe le million de degr\xE9s.",
    "Union astronomique internationale, r\xE9solution B3 (2015)"
  ],
  [
    "esp-25",
    3,
    "Combien de plan\xE8tes de notre Syst\xE8me solaire poss\xE8dent des anneaux ?",
    4,
    "plan\xE8tes",
    "count",
    abs(0),
    "Jupiter, Saturne, Uranus et Neptune. Ceux de Saturne sont de loin les plus spectaculaires.",
    "NASA, Solar System Exploration"
  ]
]);

// src/shared/questions/sport.ts
var sport_default = make("sport", [
  [
    "spo-01",
    1,
    "Quelle est la distance officielle d\u2019un marathon, en km ?",
    42.195,
    "km",
    "measure",
    abs(0.5),
    "42,195 km depuis les Jeux de Londres 1908, o\xF9 le parcours partait du ch\xE2teau de Windsor.",
    "World Athletics, r\xE8gles de comp\xE9tition",
    { decimals: 3 }
  ],
  [
    "spo-02",
    1,
    "Quel est le record du monde du 100 m masculin, en secondes ?",
    9.58,
    "s",
    "duration",
    abs(0.05),
    "Usain Bolt, le 16 ao\xFBt 2009 \xE0 Berlin. Une vitesse moyenne de 37,6 km/h.",
    "World Athletics, records du monde",
    { decimals: 2, asOf: "2025", tags: ["bolt"] }
  ],
  [
    "spo-03",
    2,
    "\xC0 quelle hauteur se trouve un panier de basket, en m\xE8tres ?",
    3.05,
    "m",
    "measure",
    abs(0.05),
    "10 pieds, soit 3,05 m, hauteur fix\xE9e par James Naismith en 1891 et jamais modifi\xE9e.",
    "FIBA, r\xE8gles officielles du basketball",
    { decimals: 2 }
  ],
  [
    "spo-04",
    3,
    "Quel volume d\u2019eau contient environ une piscine olympique, en m\xB3 ?",
    2500,
    "m\xB3",
    "measure",
    rel(0.1),
    "50 m \xD7 25 m \xD7 2 m de profondeur minimale : environ 2 500 m\xB3, soit 2,5 millions de litres.",
    "World Aquatics, r\xE8gles des installations (FR 2)"
  ],
  [
    "spo-05",
    3,
    "Quelle \xE9tait la distance totale du Tour de France 2023, en km ?",
    3404,
    "km",
    "measure",
    rel(0.05),
    "Environ 3 404 km en 21 \xE9tapes, remport\xE9s par Jonas Vingegaard.",
    "ASO, pr\xE9sentation du parcours du Tour de France 2023",
    { asOf: "2023" }
  ],
  [
    "spo-06",
    2,
    "Combien de fois Rafael Nadal a-t-il remport\xE9 Roland-Garros ?",
    14,
    "titres",
    "count",
    abs(1),
    "Quatorze titres entre 2005 et 2022 : un record absolu pour un m\xEAme tournoi du Grand Chelem.",
    "F\xE9d\xE9ration fran\xE7aise de tennis, palmar\xE8s de Roland-Garros",
    { tags: ["nadal"] }
  ],
  [
    "spo-07",
    3,
    "Quel est le record du monde masculin du saut en hauteur, en m\xE8tres ?",
    2.45,
    "m",
    "measure",
    abs(0.03),
    "Javier Sotomayor, le 27 juillet 1993 \xE0 Salamanque. Le plus vieux record de l\u2019athl\xE9tisme masculin en concours.",
    "World Athletics, records du monde",
    { decimals: 2, asOf: "2025" }
  ],
  [
    "spo-08",
    3,
    "\xC0 quelle hauteur se trouve le filet de volley-ball masculin, en m\xE8tres ?",
    2.43,
    "m",
    "measure",
    abs(0.05),
    "2,43 m chez les hommes et 2,24 m chez les femmes.",
    "FIVB, r\xE8gles officielles du volley-ball",
    { decimals: 2 }
  ],
  [
    "spo-09",
    3,
    "Combien p\xE8se une balle de tennis, en grammes ?",
    58,
    "g",
    "measure",
    rel(0.05),
    "Entre 56 et 59,4 g selon le r\xE8glement.",
    "F\xE9d\xE9ration internationale de tennis (ITF), r\xE8gles du tennis, annexe I"
  ],
  [
    "spo-10",
    1,
    "Combien de trous compte un parcours de golf standard ?",
    18,
    "trous",
    "count",
    abs(1),
    "Le standard des 18 trous vient du Old Course de St Andrews, en \xC9cosse, en 1764.",
    "R&A, histoire du golf"
  ],
  [
    "spo-11",
    2,
    "Combien de m\xE9dailles d\u2019or olympiques Michael Phelps a-t-il remport\xE9es ?",
    23,
    "m\xE9dailles",
    "count",
    abs(2),
    "23 titres (28 m\xE9dailles au total) entre 2004 et 2016 : un record absolu.",
    "Comit\xE9 international olympique, fiche Michael Phelps"
  ],
  [
    "spo-12",
    2,
    "En quelle ann\xE9e se sont tenus les premiers Jeux olympiques modernes ?",
    1896,
    "",
    "year",
    abs(3),
    "\xC0 Ath\xE8nes, \xE0 l\u2019initiative de Pierre de Coubertin, avec 241 athl\xE8tes.",
    "Comit\xE9 international olympique, Ath\xE8nes 1896",
    { tags: ["jo-histoire"] }
  ],
  [
    "spo-13",
    2,
    "Combien de fois Paris a-t-elle accueilli les Jeux olympiques d\u2019\xE9t\xE9, 2024 compris ?",
    3,
    "fois",
    "count",
    abs(0),
    "En 1900, 1924 et 2024 : comme Londres (1908, 1948, 2012).",
    "Comit\xE9 international olympique",
    { tags: ["jo-histoire"] }
  ],
  [
    "spo-14",
    2,
    "Combien de joueurs une \xE9quipe aligne-t-elle sur le terrain au baseball, en d\xE9fense ?",
    9,
    "joueurs",
    "count",
    abs(1),
    "Lanceur, receveur, quatre joueurs de champ int\xE9rieur et trois de champ ext\xE9rieur.",
    "Major League Baseball, Official Baseball Rules"
  ],
  [
    "spo-15",
    3,
    "Quelle est la longueur d\u2019un court de tennis, en m\xE8tres ?",
    23.77,
    "m",
    "measure",
    rel(0.03),
    "23,77 m, soit 78 pieds, pour 8,23 m de large en simple.",
    "ITF, r\xE8gles du tennis, r\xE8gle 1",
    { decimals: 2 }
  ],
  [
    "spo-16",
    3,
    "Combien de titres du Grand Chelem en simple Serena Williams a-t-elle remport\xE9s ?",
    23,
    "titres",
    "count",
    abs(1),
    "23 titres entre 1999 et 2017, record de l\u2019\xE8re Open chez les femmes.",
    "WTA, profil de Serena Williams"
  ],
  [
    "spo-17",
    2,
    "Combien de Tours de France Bernard Hinault a-t-il gagn\xE9s ?",
    5,
    "victoires",
    "count",
    abs(0),
    "Cinq, comme Jacques Anquetil, Eddy Merckx et Miguel Indurain : le record de victoires.",
    "ASO, palmar\xE8s du Tour de France"
  ],
  [
    "spo-18",
    4,
    "Quelle est la masse maximale autoris\xE9e d\u2019une balle de golf, en grammes ?",
    45.93,
    "g",
    "measure",
    rel(0.04),
    "45,93 g au plus (1,62 once), pour un diam\xE8tre d\u2019au moins 42,67 mm.",
    "R&A et USGA, Equipment Rules",
    { decimals: 2 }
  ],
  [
    "spo-19",
    2,
    "Combien de joueurs compose une \xE9quipe de rugby \xE0 XV sur le terrain ?",
    15,
    "joueurs",
    "count",
    abs(0),
    "D\u2019o\xF9 son nom : huit avants et sept arri\xE8res.",
    "World Rugby, Laws of the Game"
  ],
  [
    "spo-20",
    3,
    "Combien de kilom\xE8tres de v\xE9lo compte l\u2019\xE9preuve d\u2019un triathlon Ironman ?",
    180,
    "km",
    "measure",
    rel(0.05),
    "3,8 km de natation, 180 km de v\xE9lo puis un marathon complet.",
    "Ironman, format officiel de la distance"
  ],
  [
    "spo-21",
    2,
    "Combien de minutes dure un match de basket NBA, prolongations exclues ?",
    48,
    "minutes",
    "duration",
    abs(2),
    "Quatre quarts-temps de 12 minutes, contre 10 minutes en comp\xE9tition FIBA.",
    "NBA, Official Rules"
  ],
  [
    "spo-22",
    3,
    "Combien de points vaut le centre d\u2019une cible de fl\xE9chettes (\xAB bull\u2019s-eye \xBB) ?",
    50,
    "points",
    "count",
    abs(3),
    "Le centre vaut 50 points, l\u2019anneau qui l\u2019entoure 25. La case triple 20 rapporte 60.",
    "World Darts Federation, r\xE8gles du jeu"
  ],
  [
    "spo-23",
    4,
    "Quelle est la hauteur du filet de tennis en son centre, en centim\xE8tres ?",
    91.4,
    "cm",
    "measure",
    abs(1),
    "91,4 cm (3 pieds) au centre, 1,07 m aux poteaux.",
    "ITF, r\xE8gles du tennis, r\xE8gle 2",
    { decimals: 1 }
  ]
]);

// src/shared/questions/football.ts
var football_default = make("football", [
  [
    "foo-01",
    1,
    "En quelle ann\xE9e a eu lieu la premi\xE8re Coupe du monde de football ?",
    1930,
    "",
    "year",
    abs(3),
    "En Uruguay, qui l\u2019emporte en finale 4-2 contre l\u2019Argentine.",
    "FIFA, FIFA World Cup Uruguay 1930",
    { tags: ["cdm-histoire"] }
  ],
  [
    "foo-02",
    1,
    "Combien de Coupes du monde le Br\xE9sil a-t-il remport\xE9es ?",
    5,
    "titres",
    "count",
    abs(1),
    "1958, 1962, 1970, 1994 et 2002 : le record.",
    "FIFA, palmar\xE8s de la Coupe du monde",
    { asOf: "2025" }
  ],
  [
    "foo-03",
    1,
    "En quelle ann\xE9e l\u2019\xE9quipe de France a-t-elle gagn\xE9 sa premi\xE8re Coupe du monde ?",
    1998,
    "",
    "year",
    abs(1),
    "Le 12 juillet 1998 au Stade de France, 3-0 face au Br\xE9sil, avec un doubl\xE9 de Zin\xE9dine Zidane.",
    "FIFA, France 1998",
    { tags: ["bleus-titres"] }
  ],
  [
    "foo-04",
    2,
    "Combien de buts au total ont \xE9t\xE9 marqu\xE9s lors de la finale de Coupe du monde France\u2013Croatie en 2018 ?",
    6,
    "buts",
    "count",
    abs(1),
    "Victoire fran\xE7aise 4-2 \xE0 Moscou, le 15 juillet 2018.",
    "FIFA, finale de la Coupe du monde 2018",
    { tags: ["bleus-titres"] }
  ],
  [
    "foo-05",
    2,
    "Quelle est la largeur d\u2019un but de football, en m\xE8tres ?",
    7.32,
    "m",
    "measure",
    abs(0.1),
    "7,32 m, soit 8 yards, entre les poteaux.",
    "IFAB, Lois du jeu, loi 1",
    { decimals: 2, tags: ["but-dimensions"] }
  ],
  [
    "foo-06",
    2,
    "Quelle est la hauteur d\u2019un but de football, en m\xE8tres ?",
    2.44,
    "m",
    "measure",
    abs(0.05),
    "2,44 m, soit 8 pieds, jusqu\u2019au bas de la barre transversale.",
    "IFAB, Lois du jeu, loi 1",
    { decimals: 2, tags: ["but-dimensions"] }
  ],
  [
    "foo-07",
    1,
    "\xC0 quelle distance de la ligne de but se trouve le point de penalty, en m\xE8tres ?",
    11,
    "m",
    "measure",
    abs(1),
    "11 m (12 yards). Le penalty a \xE9t\xE9 introduit en 1891.",
    "IFAB, Lois du jeu, loi 1"
  ],
  [
    "foo-08",
    2,
    "Combien de spectateurs peut accueillir le Stade de France pour un match de football ?",
    8e4,
    "places",
    "count",
    rel(0.05),
    "Environ 80 000 places assises : le plus grand stade de France, inaugur\xE9 en 1998.",
    "Consortium Stade de France"
  ],
  [
    "foo-09",
    3,
    "Combien de buts Just Fontaine a-t-il marqu\xE9s lors de la Coupe du monde 1958 ?",
    13,
    "buts",
    "count",
    abs(2),
    "Un record pour une seule \xE9dition, toujours in\xE9gal\xE9.",
    "FIFA, statistiques de la Coupe du monde 1958",
    { tags: ["buteurs-cdm"] }
  ],
  [
    "foo-10",
    2,
    "Combien de Ballons d\u2019or Lionel Messi a-t-il remport\xE9s ?",
    8,
    "Ballons d\u2019or",
    "count",
    abs(1),
    "Le dernier en 2023 : un record absolu.",
    "France Football, palmar\xE8s du Ballon d\u2019or",
    { asOf: "2025" }
  ],
  [
    "foo-11",
    2,
    "Combien d\u2019\xE9quipes participent \xE0 la Coupe du monde 2026 ?",
    48,
    "\xE9quipes",
    "count",
    abs(4),
    "Organis\xE9e par les \xC9tats-Unis, le Canada et le Mexique, c\u2019est la premi\xE8re \xE0 48 \xE9quipes (contre 32 auparavant).",
    "FIFA, FIFA World Cup 26"
  ],
  [
    "foo-12",
    3,
    "Quel est le rayon du rond central d\u2019un terrain de football, en m\xE8tres ?",
    9.15,
    "m",
    "measure",
    abs(0.2),
    "9,15 m, soit 10 yards : c\u2019est aussi la distance du mur sur un coup franc.",
    "IFAB, Lois du jeu, loi 1",
    { decimals: 2 }
  ],
  [
    "foo-13",
    3,
    "Combien de buts Miroslav Klose a-t-il marqu\xE9s en Coupe du monde, record de la comp\xE9tition ?",
    16,
    "buts",
    "count",
    abs(2),
    "En quatre \xE9ditions (2002 \xE0 2014) avec l\u2019Allemagne.",
    "FIFA, meilleurs buteurs de la Coupe du monde",
    { tags: ["buteurs-cdm"] }
  ],
  [
    "foo-14",
    2,
    "Combien de Ligues des champions le Real Madrid compte-t-il \xE0 son palmar\xE8s \xE0 l\u2019issue de la saison 2024-2025 ?",
    15,
    "titres",
    "count",
    abs(1),
    "Le record, dont le dernier en 2024 contre le Borussia Dortmund.",
    "UEFA, palmar\xE8s de la Ligue des champions",
    { asOf: "saison 2024-2025", tags: ["ldc"] }
  ],
  [
    "foo-15",
    2,
    "En quelle ann\xE9e le Paris Saint-Germain a-t-il \xE9t\xE9 fond\xE9 ?",
    1970,
    "",
    "year",
    abs(3),
    "Fond\xE9 le 12 ao\xFBt 1970 par la fusion du Paris FC et du Stade saint-germanois.",
    "Paris Saint-Germain, histoire du club",
    { tags: ["psg"] }
  ],
  [
    "foo-16",
    2,
    "Combien de buts au total ont \xE9t\xE9 marqu\xE9s lors de la finale de Ligue des champions 2025, PSG\u2013Inter Milan ?",
    5,
    "buts",
    "count",
    abs(1),
    "Victoire 5-0 du PSG \xE0 Munich le 31 mai 2025 : le plus large \xE9cart de l\u2019histoire d\u2019une finale de C1.",
    "UEFA, finale de la Ligue des champions 2025",
    { tags: ["ldc"] }
  ],
  [
    "foo-17",
    4,
    "Combien de s\xE9lections Hugo Lloris compte-t-il en \xE9quipe de France, record national ?",
    145,
    "s\xE9lections",
    "count",
    rel(0.05),
    "145 s\xE9lections entre 2008 et 2022, dont 121 en tant que capitaine.",
    "F\xE9d\xE9ration fran\xE7aise de football, fiche joueur",
    { tags: ["bleus-records"] }
  ],
  [
    "foo-18",
    3,
    "Combien de buts Olivier Giroud a-t-il marqu\xE9s en \xE9quipe de France, record national ?",
    57,
    "buts",
    "count",
    abs(3),
    "57 buts entre 2011 et 2024, devant Thierry Henry (51).",
    "F\xE9d\xE9ration fran\xE7aise de football, fiche joueur",
    { tags: ["bleus-records"] }
  ],
  [
    "foo-19",
    3,
    "Combien p\xE8se un ballon de football r\xE9glementaire, en grammes ?",
    430,
    "g",
    "measure",
    rel(0.05),
    "Entre 410 et 450 g au d\xE9but du match, pour une circonf\xE9rence de 68 \xE0 70 cm.",
    "IFAB, Lois du jeu, loi 2"
  ],
  [
    "foo-20",
    2,
    "Combien de buts au total ont \xE9t\xE9 marqu\xE9s dans la finale de Coupe du monde 2022, Argentine\u2013France (hors tirs au but) ?",
    6,
    "buts",
    "count",
    abs(1),
    "3-3 apr\xE8s prolongation, dont un tripl\xE9 de Kylian Mbapp\xE9, puis victoire argentine aux tirs au but.",
    "FIFA, finale de la Coupe du monde 2022"
  ],
  [
    "foo-21",
    2,
    "Combien de clubs composent la Ligue 1 depuis la saison 2023-2024 ?",
    18,
    "clubs",
    "count",
    abs(2),
    "Le championnat est pass\xE9 de 20 \xE0 18 clubs \xE0 partir de la saison 2023-2024.",
    "Ligue de football professionnel (LFP)",
    { asOf: "2025" }
  ],
  [
    "foo-22",
    3,
    "En quelle ann\xE9e s\u2019est disput\xE9 le premier championnat d\u2019Europe des nations ?",
    1960,
    "",
    "year",
    abs(4),
    "En France, remport\xE9 par l\u2019URSS face \xE0 la Yougoslavie.",
    "UEFA, histoire de l\u2019Euro"
  ],
  [
    "foo-23",
    3,
    "Combien de buts Thierry Henry a-t-il marqu\xE9s en \xE9quipe de France ?",
    51,
    "buts",
    "count",
    abs(3),
    "51 buts en 123 s\xE9lections entre 1997 et 2010.",
    "F\xE9d\xE9ration fran\xE7aise de football, fiche joueur",
    { tags: ["bleus-records"] }
  ],
  [
    "foo-24",
    1,
    "Combien de joueurs chaque \xE9quipe aligne-t-elle sur le terrain au d\xE9but d\u2019un match ?",
    11,
    "joueurs",
    "count",
    abs(0),
    "Dix joueurs de champ et un gardien. Une \xE9quipe r\xE9duite \xE0 moins de sept joueurs ne peut pas continuer.",
    "IFAB, Lois du jeu, loi 3"
  ]
]);

// src/shared/questions/cinema.ts
var cinema_default = make("cinema", [
  [
    "cin-01",
    2,
    "En quelle ann\xE9e les fr\xE8res Lumi\xE8re ont-ils organis\xE9 la premi\xE8re projection publique payante ?",
    1895,
    "",
    "year",
    abs(3),
    "Le 28 d\xE9cembre 1895, au Salon indien du Grand Caf\xE9, \xE0 Paris.",
    "Institut Lumi\xE8re, Lyon"
  ],
  [
    "cin-02",
    2,
    "Combien de minutes dure le film \xAB Titanic \xBB de James Cameron (1997) ?",
    194,
    "minutes",
    "duration",
    rel(0.05),
    "3 h 14 min. Il remporte 11 Oscars, un record partag\xE9.",
    "CNC ; AFI Catalog, Titanic (1997)",
    { tags: ["titanic-film"] }
  ],
  [
    "cin-03",
    1,
    "Combien de films compte la saga Harry Potter au cin\xE9ma ?",
    8,
    "films",
    "count",
    abs(1),
    "Sept romans, mais huit films : \xAB Les Reliques de la Mort \xBB a \xE9t\xE9 adapt\xE9 en deux parties.",
    "Warner Bros., saga Harry Potter"
  ],
  [
    "cin-04",
    2,
    "Combien d\u2019Oscars le film \xAB Titanic \xBB a-t-il remport\xE9s ?",
    11,
    "Oscars",
    "count",
    abs(1),
    "Onze, record partag\xE9 avec \xAB Ben-Hur \xBB et \xAB Le Retour du roi \xBB.",
    "Academy of Motion Picture Arts and Sciences, base des Oscars",
    { tags: ["titanic-film"] }
  ],
  [
    "cin-05",
    1,
    "En quelle ann\xE9e est sorti le premier film \xAB Star Wars \xBB ?",
    1977,
    "",
    "year",
    abs(2),
    "\xAB Un nouvel espoir \xBB sort aux \xC9tats-Unis le 25 mai 1977, et en France en octobre 1977.",
    "Lucasfilm, chronologie Star Wars"
  ],
  [
    "cin-06",
    3,
    "Combien d\u2019\xE9pisodes compte la s\xE9rie \xAB Game of Thrones \xBB ?",
    73,
    "\xE9pisodes",
    "count",
    rel(0.05),
    "73 \xE9pisodes r\xE9partis sur 8 saisons, diffus\xE9s de 2011 \xE0 2019.",
    "HBO, Game of Thrones"
  ],
  [
    "cin-07",
    2,
    "Combien de saisons compte la s\xE9rie \xAB Friends \xBB ?",
    10,
    "saisons",
    "count",
    abs(1),
    "10 saisons et 236 \xE9pisodes, de 1994 \xE0 2004.",
    "Warner Bros. Television, Friends"
  ],
  [
    "cin-08",
    3,
    "Combien d\u2019entr\xE9es \xAB Bienvenue chez les Ch\u2019tis \xBB a-t-il r\xE9alis\xE9es en France, en millions ?",
    20.4,
    "millions",
    "count",
    rel(0.05),
    "Environ 20,4 millions d\u2019entr\xE9es en 2008 : le plus gros succ\xE8s d\u2019un film fran\xE7ais en salles.",
    "CNC, box-office France",
    { decimals: 1, tags: ["boxoffice-fr"] }
  ],
  [
    "cin-09",
    3,
    "Combien le film \xAB Avatar \xBB (2009) a-t-il rapport\xE9 dans le monde, en milliards de dollars ?",
    2.9,
    "milliards $",
    "money",
    rel(0.08),
    "Environ 2,92 milliards de dollars avec ses ressorties : le plus gros succ\xE8s de l\u2019histoire du cin\xE9ma.",
    "Box Office Mojo, Avatar (2009)",
    { decimals: 1, asOf: "2025" }
  ],
  [
    "cin-10",
    3,
    "En quelle ann\xE9e s\u2019est tenue la premi\xE8re c\xE9r\xE9monie des Oscars ?",
    1929,
    "",
    "year",
    abs(3),
    "Le 16 mai 1929, \xE0 Hollywood. Elle a dur\xE9 \xE0 peine un quart d\u2019heure.",
    "Academy of Motion Picture Arts and Sciences",
    { tags: ["oscars"] }
  ],
  [
    "cin-11",
    2,
    "En quelle ann\xE9e est sorti le premier film de James Bond, \xAB James Bond 007 contre Dr No \xBB ?",
    1962,
    "",
    "year",
    abs(3),
    "Avec Sean Connery dans le r\xF4le de l\u2019agent 007.",
    "EON Productions, filmographie officielle",
    { tags: ["bond"] }
  ],
  [
    "cin-12",
    3,
    "Combien de films officiels de James Bond ont \xE9t\xE9 produits par EON Productions jusqu\u2019\xE0 \xAB Mourir peut attendre \xBB (2021) ?",
    25,
    "films",
    "count",
    abs(2),
    "25 films de 1962 \xE0 2021, avec six interpr\xE8tes de 007.",
    "EON Productions, filmographie officielle",
    { tags: ["bond"] }
  ],
  [
    "cin-13",
    3,
    "Combien de minutes dure \xAB Le Seigneur des anneaux : Le Retour du roi \xBB en version cin\xE9ma ?",
    201,
    "minutes",
    "duration",
    rel(0.05),
    "3 h 21 min en salles, plus de 4 heures en version longue.",
    "AFI Catalog ; New Line Cinema"
  ],
  [
    "cin-14",
    3,
    "En quelle ann\xE9e s\u2019est tenue la premi\xE8re \xE9dition du Festival de Cannes ?",
    1946,
    "",
    "year",
    abs(3),
    "Pr\xE9vue en 1939 mais annul\xE9e par la guerre, la premi\xE8re \xE9dition a lieu en septembre 1946.",
    "Festival de Cannes, histoire"
  ],
  [
    "cin-15",
    3,
    "Combien d\u2019\xE9pisodes compte la s\xE9rie \xAB Breaking Bad \xBB ?",
    62,
    "\xE9pisodes",
    "count",
    rel(0.06),
    "62 \xE9pisodes en 5 saisons, de 2008 \xE0 2013.",
    "AMC, Breaking Bad"
  ],
  [
    "cin-16",
    2,
    "En quelle ann\xE9e est sorti \xAB Toy Story \xBB, premier long m\xE9trage enti\xE8rement en images de synth\xE8se ?",
    1995,
    "",
    "year",
    abs(2),
    "Produit par Pixar et distribu\xE9 par Disney, il sort aux \xC9tats-Unis en novembre 1995.",
    "Pixar Animation Studios"
  ],
  [
    "cin-17",
    4,
    "En quelle ann\xE9e est sorti \xAB Les Quatre Cents Coups \xBB de Fran\xE7ois Truffaut ?",
    1959,
    "",
    "year",
    abs(3),
    "Prix de la mise en sc\xE8ne \xE0 Cannes en 1959, film manifeste de la Nouvelle Vague.",
    "Cin\xE9math\xE8que fran\xE7aise"
  ],
  [
    "cin-18",
    3,
    "Combien de \xAB Livres \xBB (saisons) compte la s\xE9rie t\xE9l\xE9vis\xE9e \xAB Kaamelott \xBB ?",
    6,
    "Livres",
    "count",
    abs(1),
    "Six Livres diffus\xE9s sur M6 de 2005 \xE0 2009, avant le passage au cin\xE9ma en 2021.",
    "M6 ; Alexandre Astier, Kaamelott"
  ],
  [
    "cin-19",
    3,
    "Combien d\u2019entr\xE9es \xAB Intouchables \xBB a-t-il r\xE9alis\xE9es en France, en millions ?",
    19.5,
    "millions",
    "count",
    rel(0.05),
    "Environ 19,5 millions d\u2019entr\xE9es en 2011-2012, juste derri\xE8re \xAB Bienvenue chez les Ch\u2019tis \xBB.",
    "CNC, box-office France",
    { decimals: 1, tags: ["boxoffice-fr"] }
  ],
  [
    "cin-20",
    4,
    "Quelle est la hauteur des lettres du panneau \xAB Hollywood \xBB, en m\xE8tres ?",
    13.7,
    "m",
    "measure",
    rel(0.1),
    "Environ 13,7 m (45 pieds). Il affichait \xAB Hollywoodland \xBB jusqu\u2019en 1949.",
    "Hollywood Sign Trust",
    { decimals: 1 }
  ],
  [
    "cin-21",
    2,
    "En quelle ann\xE9e est sorti \xAB Jurassic Park \xBB de Steven Spielberg ?",
    1993,
    "",
    "year",
    abs(2),
    "R\xE9volution des effets num\xE9riques, il devient alors le plus gros succ\xE8s de l\u2019histoire.",
    "Universal Pictures"
  ],
  [
    "cin-22",
    2,
    "En quelle ann\xE9e est sorti \xAB Le Fabuleux Destin d\u2019Am\xE9lie Poulain \xBB ?",
    2001,
    "",
    "year",
    abs(2),
    "R\xE9alis\xE9 par Jean-Pierre Jeunet, il attire plus de 8 millions de spectateurs en France.",
    "CNC, box-office France"
  ],
  [
    "cin-23",
    4,
    "Combien de longs m\xE9trages Stanley Kubrick a-t-il r\xE9alis\xE9s ?",
    13,
    "films",
    "count",
    abs(2),
    "De \xAB Fear and Desire \xBB (1953) \xE0 \xAB Eyes Wide Shut \xBB (1999).",
    "Stanley Kubrick Archive, University of the Arts London"
  ],
  [
    "cin-24",
    3,
    "En quelle ann\xE9e est sorti \xAB Blanche-Neige et les Sept Nains \xBB de Disney ?",
    1937,
    "",
    "year",
    abs(3),
    "Premier long m\xE9trage d\u2019animation de Disney, sorti en d\xE9cembre 1937.",
    "The Walt Disney Company, archives"
  ]
]);

// src/shared/questions/musique.ts
var musique_default = make("musique", [
  [
    "mus-01",
    1,
    "Combien de touches compte un piano moderne standard ?",
    88,
    "touches",
    "count",
    abs(4),
    "52 touches blanches et 36 noires, couvrant plus de sept octaves.",
    "Steinway & Sons, caract\xE9ristiques techniques",
    { tags: ["piano"] }
  ],
  [
    "mus-02",
    3,
    "Combien de cordes poss\xE8de une harpe de concert ?",
    47,
    "cordes",
    "count",
    abs(3),
    "G\xE9n\xE9ralement 47 cordes et 7 p\xE9dales qui modifient la hauteur des notes.",
    "Philharmonie de Paris, fiche instrument \xAB Harpe \xBB"
  ],
  [
    "mus-03",
    2,
    "Combien de symphonies Beethoven a-t-il compos\xE9es ?",
    9,
    "symphonies",
    "count",
    abs(1),
    "La Neuvi\xE8me, achev\xE9e en 1824, contient l\u2019\xAB Ode \xE0 la joie \xBB, devenue l\u2019hymne europ\xE9en.",
    "Beethoven-Haus Bonn",
    { tags: ["beethoven"] }
  ],
  [
    "mus-04",
    3,
    "En quelle ann\xE9e Wolfgang Amadeus Mozart est-il n\xE9 ?",
    1756,
    "",
    "year",
    abs(5),
    "Le 27 janvier 1756 \xE0 Salzbourg.",
    "Fondation internationale Mozarteum, Salzbourg",
    { tags: ["mozart"] }
  ],
  [
    "mus-05",
    2,
    "\xC0 quel \xE2ge Mozart est-il mort ?",
    35,
    "ans",
    "duration",
    abs(2),
    "Mort \xE0 Vienne le 5 d\xE9cembre 1791, \xE0 35 ans, laissant son Requiem inachev\xE9.",
    "Fondation internationale Mozarteum, Salzbourg",
    { tags: ["mozart"] }
  ],
  [
    "mus-06",
    2,
    "Combien de notes diff\xE9rentes compte une gamme chromatique ?",
    12,
    "notes",
    "count",
    abs(1),
    "Les 12 demi-tons d\u2019une octave, touches blanches et noires comprises.",
    "Dictionnaire de la musique, Larousse"
  ],
  [
    "mus-07",
    2,
    "Quelle est la fr\xE9quence du \xAB la \xBB de r\xE9f\xE9rence (diapason), en hertz ?",
    440,
    "Hz",
    "measure",
    rel(0.02),
    "440 Hz, normalis\xE9 par l\u2019ISO en 1975 ; certains orchestres jouent \xE0 442 Hz.",
    "ISO 16:1975, fr\xE9quence d\u2019accord normale"
  ],
  [
    "mus-08",
    2,
    "En quelle ann\xE9e est sorti l\u2019album \xAB Thriller \xBB de Michael Jackson ?",
    1982,
    "",
    "year",
    abs(2),
    "Sorti le 30 novembre 1982, produit par Quincy Jones.",
    "Epic Records",
    { tags: ["thriller"] }
  ],
  [
    "mus-09",
    3,
    "Combien d\u2019exemplaires de l\u2019album \xAB Thriller \xBB se sont vendus dans le monde, en millions (estimation) ?",
    70,
    "millions",
    "count",
    rel(0.1),
    "Environ 70 millions selon les estimations les plus cit\xE9es : l\u2019album le plus vendu de l\u2019histoire.",
    "Guinness World Records, \xAB Best-selling album \xBB",
    { tags: ["thriller"] }
  ],
  [
    "mus-10",
    1,
    "Combien de cordes poss\xE8de un violon ?",
    4,
    "cordes",
    "count",
    abs(0),
    "Sol, r\xE9, la, mi, accord\xE9es en quintes.",
    "Philharmonie de Paris, fiche instrument \xAB Violon \xBB"
  ],
  [
    "mus-11",
    2,
    "En quelle ann\xE9e les Beatles se sont-ils s\xE9par\xE9s ?",
    1970,
    "",
    "year",
    abs(2),
    "Paul McCartney annonce son d\xE9part en avril 1970. Leur dernier album paru est \xAB Let It Be \xBB.",
    "Encyclop\xE6dia Britannica, \xAB The Beatles \xBB",
    { tags: ["beatles"] }
  ],
  [
    "mus-12",
    3,
    "Combien d\u2019albums studio les Beatles ont-ils publi\xE9s au Royaume-Uni ?",
    12,
    "albums",
    "count",
    abs(2),
    "De \xAB Please Please Me \xBB (1963) \xE0 \xAB Let It Be \xBB (1970), selon la discographie britannique officielle.",
    "Apple Corps, discographie officielle des Beatles",
    { tags: ["beatles"] }
  ],
  [
    "mus-13",
    3,
    "Combien de secondes dure \xAB Bohemian Rhapsody \xBB de Queen (version album) ?",
    355,
    "secondes",
    "duration",
    rel(0.03),
    "5 min 55 s : jug\xE9e trop longue pour la radio, elle devient pourtant un tube mondial en 1975.",
    "Queen Online, discographie (\xAB A Night at the Opera \xBB)"
  ],
  [
    "mus-14",
    3,
    "En quelle ann\xE9e \xAB La Marseillaise \xBB a-t-elle \xE9t\xE9 compos\xE9e ?",
    1792,
    "",
    "year",
    abs(3),
    "\xC9crite par Rouget de Lisle \xE0 Strasbourg en avril 1792, sous le titre \xAB Chant de guerre pour l\u2019arm\xE9e du Rhin \xBB.",
    "\xC9lys\xE9e, \xAB La Marseillaise \xBB"
  ],
  [
    "mus-15",
    3,
    "Combien de mouvements comptent au total \xAB Les Quatre Saisons \xBB de Vivaldi ?",
    12,
    "mouvements",
    "count",
    abs(2),
    "Quatre concertos de trois mouvements chacun (vif, lent, vif).",
    "Philharmonie de Paris, guide d\u2019\xE9coute"
  ],
  [
    "mus-16",
    3,
    "En quelle ann\xE9e s\u2019est tenu le premier Concours Eurovision de la chanson ?",
    1956,
    "",
    "year",
    abs(3),
    "\xC0 Lugano, en Suisse, avec sept pays participants. La Suisse l\u2019emporte.",
    "Union europ\xE9enne de radio-t\xE9l\xE9vision (UER)",
    { tags: ["eurovision"] }
  ],
  [
    "mus-17",
    3,
    "Combien de fois la France a-t-elle remport\xE9 l\u2019Eurovision ?",
    5,
    "victoires",
    "count",
    abs(1),
    "1958, 1960, 1962, 1969 et 1977. Elle n\u2019a plus gagn\xE9 depuis Marie Myriam.",
    "Union europ\xE9enne de radio-t\xE9l\xE9vision (UER)",
    { asOf: "2025", tags: ["eurovision"] }
  ],
  [
    "mus-18",
    2,
    "En quelle ann\xE9e a eu lieu la premi\xE8re F\xEAte de la musique ?",
    1982,
    "",
    "year",
    abs(3),
    "Le 21 juin 1982, \xE0 l\u2019initiative du minist\xE8re de la Culture de Jack Lang.",
    "Minist\xE8re de la Culture, F\xEAte de la musique"
  ],
  [
    "mus-19",
    4,
    "Combien de tuyaux compte environ le grand orgue de Notre-Dame de Paris ?",
    8e3,
    "tuyaux",
    "count",
    rel(0.08),
    "Pr\xE8s de 8 000 tuyaux. \xC9pargn\xE9 par l\u2019incendie de 2019, il a \xE9t\xE9 enti\xE8rement nettoy\xE9 avant la r\xE9ouverture de 2024.",
    "Cath\xE9drale Notre-Dame de Paris, le grand orgue"
  ],
  [
    "mus-20",
    3,
    "En quelle ann\xE9e \xC9dith Piaf est-elle morte ?",
    1963,
    "",
    "year",
    abs(3),
    "Le 10 octobre 1963, \xE0 47 ans. Jean Cocteau meurt le m\xEAme jour.",
    "BnF, notice \xC9dith Piaf"
  ],
  [
    "mus-21",
    4,
    "Combien de titres compte l\u2019album \xAB Abbey Road \xBB des Beatles ?",
    17,
    "titres",
    "count",
    abs(2),
    "17 titres dans l\u2019\xE9dition originale de 1969, dont le court \xAB Her Majesty \xBB, cach\xE9 en fin de disque.",
    "Apple Corps, discographie officielle des Beatles",
    { tags: ["beatles"] }
  ],
  [
    "mus-22",
    3,
    "Combien de secondes dure l\u2019\u0153uvre silencieuse \xAB 4\u203233\u2033 \xBB de John Cage ?",
    273,
    "secondes",
    "duration",
    abs(5),
    "4 minutes 33 secondes, soit 273 s, pendant lesquelles l\u2019interpr\xE8te ne joue aucune note.",
    "John Cage Trust, notice de l\u2019\u0153uvre (1952)"
  ],
  [
    "mus-23",
    2,
    "\xC0 quel \xE2ge Johnny Hallyday est-il mort ?",
    74,
    "ans",
    "duration",
    abs(2),
    "N\xE9 en 1943, mort le 5 d\xE9cembre 2017 \xE0 74 ans, apr\xE8s pr\xE8s de 60 ans de carri\xE8re.",
    "BnF, notice Johnny Hallyday"
  ],
  [
    "mus-24",
    2,
    "Combien de cordes poss\xE8de une guitare basse \xE9lectrique standard ?",
    4,
    "cordes",
    "count",
    abs(0),
    "Quatre cordes accord\xE9es mi, la, r\xE9, sol, une octave plus bas que les quatre graves de la guitare.",
    "Fender, guide des instruments"
  ]
]);

// src/shared/questions/tech.ts
var tech_default = make("tech", [
  [
    "tec-01",
    1,
    "En quelle ann\xE9e le premier iPhone a-t-il \xE9t\xE9 pr\xE9sent\xE9 ?",
    2007,
    "",
    "year",
    abs(1),
    "Pr\xE9sent\xE9 par Steve Jobs le 9 janvier 2007, commercialis\xE9 aux \xC9tats-Unis en juin.",
    "Apple Newsroom, communiqu\xE9 du 9 janvier 2007"
  ],
  [
    "tec-02",
    2,
    "En quelle ann\xE9e Google a-t-il \xE9t\xE9 fond\xE9 ?",
    1998,
    "",
    "year",
    abs(2),
    "Par Larry Page et Sergey Brin, le 4 septembre 1998, dans un garage de Menlo Park.",
    "Google, \xAB Our story \xBB"
  ],
  [
    "tec-03",
    2,
    "En quelle ann\xE9e les fr\xE8res Wright ont-ils r\xE9alis\xE9 leur premier vol motoris\xE9 ?",
    1903,
    "",
    "year",
    abs(3),
    "Le 17 d\xE9cembre 1903 \xE0 Kitty Hawk, en Caroline du Nord.",
    "Smithsonian National Air and Space Museum",
    { tags: ["wright"] }
  ],
  [
    "tec-04",
    2,
    "Combien de caract\xE8res pouvait contenir un tweet \xE0 l\u2019origine ?",
    140,
    "caract\xE8res",
    "count",
    abs(10),
    "140 caract\xE8res, h\xE9rit\xE9s de la limite des SMS. La limite passe \xE0 280 en 2017.",
    "Twitter Blog, novembre 2017"
  ],
  [
    "tec-05",
    3,
    "En quelle ann\xE9e Tim Berners-Lee a-t-il propos\xE9 le World Wide Web au CERN ?",
    1989,
    "",
    "year",
    abs(2),
    "Sa proposition date de mars 1989 ; le premier site web est mis en ligne en 1991.",
    "CERN, \xAB The birth of the Web \xBB"
  ],
  [
    "tec-06",
    4,
    "Combien de transistors comptait l\u2019Intel 4004, premier microprocesseur commercial (1971) ?",
    2300,
    "transistors",
    "count",
    rel(0.1),
    "Environ 2 300 transistors, contre des dizaines de milliards dans une puce actuelle.",
    "Intel, \xAB The Story of the Intel 4004 \xBB"
  ],
  [
    "tec-07",
    3,
    "En quelle ann\xE9e le premier SMS a-t-il \xE9t\xE9 envoy\xE9 ?",
    1992,
    "",
    "year",
    abs(2),
    "Le 3 d\xE9cembre 1992 : \xAB Merry Christmas \xBB, envoy\xE9 depuis un ordinateur vers un t\xE9l\xE9phone Vodafone.",
    "Vodafone UK"
  ],
  [
    "tec-08",
    4,
    "Combien pesait l\u2019ENIAC, l\u2019un des premiers ordinateurs \xE9lectroniques (1946), en tonnes ?",
    27,
    "tonnes",
    "measure",
    rel(0.15),
    "Environ 27 tonnes et 17 468 tubes \xE0 vide, sur pr\xE8s de 170 m\xB2.",
    "University of Pennsylvania, ENIAC"
  ],
  [
    "tec-09",
    3,
    "\xC0 quelle vitesse le Concorde volait-il en croisi\xE8re, en km/h ?",
    2180,
    "km/h",
    "measure",
    rel(0.08),
    "Environ Mach 2,02, soit pr\xE8s de 2 180 km/h : Paris\u2013New York en 3 h 30.",
    "Mus\xE9e de l\u2019Air et de l\u2019Espace, Concorde",
    { tags: ["concorde"] }
  ],
  [
    "tec-10",
    2,
    "Quelle est la longueur du tunnel sous la Manche, en km ?",
    50.5,
    "km",
    "measure",
    rel(0.05),
    "50,5 km dont 38 km sous la mer : la plus longue section sous-marine du monde.",
    "Getlink (Eurotunnel), chiffres cl\xE9s",
    { decimals: 1, tags: ["tunnel-manche"] }
  ],
  [
    "tec-11",
    2,
    "En quelle ann\xE9e le tunnel sous la Manche a-t-il \xE9t\xE9 inaugur\xE9 ?",
    1994,
    "",
    "year",
    abs(2),
    "Inaugur\xE9 le 6 mai 1994 par la reine Elizabeth II et Fran\xE7ois Mitterrand.",
    "Getlink (Eurotunnel), histoire",
    { tags: ["tunnel-manche"] }
  ],
  [
    "tec-12",
    3,
    "Quelle est la hauteur du plus haut pyl\xF4ne du viaduc de Millau, en m\xE8tres ?",
    343,
    "m",
    "measure",
    rel(0.05),
    "343 m au sommet du m\xE2t P2, plus haut que la tour Eiffel.",
    "Viaduc de Millau, chiffres cl\xE9s"
  ],
  [
    "tec-13",
    3,
    "Combien de caract\xE8res compte la table ASCII standard ?",
    128,
    "caract\xE8res",
    "count",
    abs(4),
    "128 caract\xE8res cod\xE9s sur 7 bits, dont 33 caract\xE8res de contr\xF4le.",
    "ANSI X3.4-1986"
  ],
  [
    "tec-14",
    2,
    "En quelle ann\xE9e Wikip\xE9dia a-t-elle \xE9t\xE9 lanc\xE9e ?",
    2001,
    "",
    "year",
    abs(2),
    "Le 15 janvier 2001 en anglais ; la version francophone suit en mai 2001.",
    "Wikimedia Foundation"
  ],
  [
    "tec-15",
    3,
    "Quelle \xE9tait la capacit\xE9 d\u2019une disquette 3,5 pouces haute densit\xE9, en m\xE9gaoctets ?",
    1.44,
    "Mo",
    "measure",
    abs(0.1),
    "1,44 Mo \xAB marketing \xBB : en r\xE9alit\xE9 1 440 Kio. Son ic\xF4ne sert encore de bouton \xAB Enregistrer \xBB.",
    "IBM ; norme ECMA-125",
    { decimals: 2 }
  ],
  [
    "tec-16",
    2,
    "Quel est le record de vitesse sur rail \xE9tabli par un TGV en 2007, en km/h ?",
    574.8,
    "km/h",
    "measure",
    rel(0.03),
    "574,8 km/h, le 3 avril 2007, sur la LGV Est europ\xE9enne.",
    "SNCF, record du monde de vitesse sur rail",
    { decimals: 1, tags: ["tgv"] }
  ],
  [
    "tec-17",
    3,
    "En quelle ann\xE9e le premier TGV commercial a-t-il circul\xE9 entre Paris et Lyon ?",
    1981,
    "",
    "year",
    abs(2),
    "Le 27 septembre 1981, avec un trajet ramen\xE9 \xE0 2 h 40.",
    "SNCF, histoire du TGV",
    { tags: ["tgv"] }
  ],
  [
    "tec-18",
    3,
    "Combien de bits compose une adresse IPv4 ?",
    32,
    "bits",
    "count",
    abs(4),
    "32 bits, soit environ 4,3 milliards d\u2019adresses : bien trop peu, d\u2019o\xF9 IPv6 et ses 128 bits.",
    "IETF, RFC 791"
  ],
  [
    "tec-19",
    3,
    "En quelle ann\xE9e le Concorde a-t-il effectu\xE9 son premier vol commercial ?",
    1976,
    "",
    "year",
    abs(3),
    "Le 21 janvier 1976, simultan\xE9ment au d\xE9part de Paris et de Londres.",
    "Mus\xE9e de l\u2019Air et de l\u2019Espace, Concorde",
    { tags: ["concorde"] }
  ],
  [
    "tec-20",
    3,
    "Vers quelle ann\xE9e la Bible de Gutenberg a-t-elle \xE9t\xE9 imprim\xE9e ?",
    1455,
    "",
    "year",
    abs(10),
    "Achev\xE9e vers 1454-1455 \xE0 Mayence, premier grand livre imprim\xE9 \xE0 caract\xE8res mobiles en Europe.",
    "Biblioth\xE8que du Congr\xE8s, Gutenberg Bible"
  ],
  [
    "tec-21",
    2,
    "En quelle ann\xE9e le premier Macintosh d\u2019Apple a-t-il \xE9t\xE9 commercialis\xE9 ?",
    1984,
    "",
    "year",
    abs(2),
    "Lanc\xE9 en janvier 1984, annonc\xE9 par une c\xE9l\xE8bre publicit\xE9 r\xE9alis\xE9e par Ridley Scott.",
    "Computer History Museum"
  ],
  [
    "tec-22",
    1,
    "Combien de bits compose un octet ?",
    8,
    "bits",
    "count",
    abs(0),
    "Huit bits, soit 256 valeurs possibles (de 0 \xE0 255).",
    "Norme ISO/IEC 80000-13"
  ],
  [
    "tec-23",
    4,
    "Combien de secondes a dur\xE9 le premier vol des fr\xE8res Wright ?",
    12,
    "secondes",
    "duration",
    abs(2),
    "12 secondes pour 37 m\xE8tres, pilot\xE9 par Orville Wright.",
    "Smithsonian National Air and Space Museum",
    { tags: ["wright"] }
  ]
]);

// src/shared/questions/jeuxvideo.ts
var jeuxvideo_default = make("jeuxvideo", [
  [
    "jv-01",
    2,
    "En quelle ann\xE9e est sorti le jeu d\u2019arcade \xAB Pong \xBB d\u2019Atari ?",
    1972,
    "",
    "year",
    abs(3),
    "Premier grand succ\xE8s commercial du jeu vid\xE9o, install\xE9 d\u2019abord dans un bar californien.",
    "The Strong National Museum of Play"
  ],
  [
    "jv-02",
    2,
    "En quelle ann\xE9e \xAB Super Mario Bros. \xBB est-il sorti au Japon ?",
    1985,
    "",
    "year",
    abs(2),
    "Sorti le 13 septembre 1985 sur Famicom.",
    "Nintendo, histoire de Mario",
    { tags: ["mario"] }
  ],
  [
    "jv-03",
    1,
    "Combien de Pok\xE9mon comptait la premi\xE8re g\xE9n\xE9ration ?",
    151,
    "Pok\xE9mon",
    "count",
    abs(5),
    "De Bulbizarre \xE0 Mew, dans Pok\xE9mon Rouge et Vert (1996).",
    "The Pok\xE9mon Company",
    { tags: ["pokemon"] }
  ],
  [
    "jv-04",
    2,
    "En quelle ann\xE9e la premi\xE8re PlayStation est-elle sortie au Japon ?",
    1994,
    "",
    "year",
    abs(2),
    "Le 3 d\xE9cembre 1994 ; elle arrive en Europe en septembre 1995.",
    "Sony Interactive Entertainment, histoire de la PlayStation",
    { tags: ["playstation"] }
  ],
  [
    "jv-05",
    3,
    "Combien de PlayStation 2 ont \xE9t\xE9 vendues dans le monde, en millions ?",
    160,
    "millions",
    "count",
    rel(0.08),
    "Plus de 160 millions d\u2019unit\xE9s selon Sony (2024) : la console de salon la plus vendue de l\u2019histoire.",
    "Sony Interactive Entertainment, annonce de novembre 2024",
    { asOf: "2024", tags: ["playstation"] }
  ],
  [
    "jv-06",
    3,
    "Combien d\u2019exemplaires de Minecraft avaient \xE9t\xE9 vendus en octobre 2023, en millions ?",
    300,
    "millions",
    "count",
    rel(0.1),
    "300 millions selon Mojang, ce qui en fait le jeu le plus vendu de l\u2019histoire.",
    "Mojang Studios, annonce d\u2019octobre 2023",
    { asOf: "octobre 2023" }
  ],
  [
    "jv-07",
    2,
    "En quelle ann\xE9e Tetris a-t-il \xE9t\xE9 cr\xE9\xE9 en URSS ?",
    1984,
    "",
    "year",
    abs(2),
    "Cr\xE9\xE9 par Alexe\xEF Pajitnov \xE0 l\u2019Acad\xE9mie des sciences de Moscou en 1984.",
    "The Tetris Company",
    { tags: ["tetris"] }
  ],
  [
    "jv-08",
    3,
    "Combien de cases compte la grille de jeu standard de Tetris ?",
    200,
    "cases",
    "count",
    rel(0.1),
    "10 colonnes et 20 lignes visibles, soit 200 cases.",
    "Tetris Guideline (The Tetris Company)",
    { tags: ["tetris"] }
  ],
  [
    "jv-09",
    2,
    "En quelle ann\xE9e la Game Boy est-elle sortie au Japon ?",
    1989,
    "",
    "year",
    abs(2),
    "Le 21 avril 1989, avec Tetris livr\xE9 dans de nombreux packs.",
    "Nintendo, histoire du Game Boy"
  ],
  [
    "jv-10",
    3,
    "Combien de consoles Nintendo Switch (premi\xE8re du nom) ont \xE9t\xE9 vendues au 30 septembre 2025, en millions ?",
    154,
    "millions",
    "count",
    rel(0.05),
    "154,01 millions selon Nintendo, \xE0 quelques millions du record de la PlayStation 2.",
    "Nintendo, r\xE9sultats financiers semestriels (novembre 2025)",
    { asOf: "30 septembre 2025" }
  ],
  [
    "jv-11",
    1,
    "Combien de fant\xF4mes poursuivent Pac-Man dans le jeu original ?",
    4,
    "fant\xF4mes",
    "count",
    abs(0),
    "Blinky, Pinky, Inky et Clyde, chacun avec son propre comportement de poursuite.",
    "Bandai Namco, Pac-Man (1980)",
    { tags: ["pacman"] }
  ],
  [
    "jv-12",
    2,
    "En quelle ann\xE9e \xAB World of Warcraft \xBB est-il sorti ?",
    2004,
    "",
    "year",
    abs(2),
    "Sorti le 23 novembre 2004 en Am\xE9rique du Nord, en f\xE9vrier 2005 en Europe.",
    "Blizzard Entertainment"
  ],
  [
    "jv-13",
    3,
    "En quelle ann\xE9e l\u2019\xE9diteur fran\xE7ais Ubisoft a-t-il \xE9t\xE9 fond\xE9 ?",
    1986,
    "",
    "year",
    abs(3),
    "Par les cinq fr\xE8res Guillemot, en Bretagne.",
    "Ubisoft, histoire de l\u2019entreprise"
  ],
  [
    "jv-14",
    3,
    "En quelle ann\xE9e \xAB The Legend of Zelda \xBB est-il sorti au Japon ?",
    1986,
    "",
    "year",
    abs(2),
    "Le 21 f\xE9vrier 1986 sur le lecteur de disquettes de la Famicom.",
    "Nintendo, histoire de Zelda"
  ],
  [
    "jv-15",
    2,
    "En quelle ann\xE9e le mode Battle Royale de \xAB Fortnite \xBB est-il sorti ?",
    2017,
    "",
    "year",
    abs(1),
    "Lanc\xE9 gratuitement en septembre 2017 par Epic Games.",
    "Epic Games",
    { tags: ["fortnite"] }
  ],
  [
    "jv-16",
    4,
    "Combien de mines cache la grille du D\xE9mineur de Windows au niveau Expert ?",
    99,
    "mines",
    "count",
    rel(0.1),
    "99 mines sur une grille de 30 \xD7 16 cases.",
    "Microsoft, D\xE9mineur (Windows 3.1 \xE0 XP)"
  ],
  [
    "jv-17",
    2,
    "En quelle ann\xE9e \xAB Grand Theft Auto V \xBB est-il sorti ?",
    2013,
    "",
    "year",
    abs(1),
    "Sorti le 17 septembre 2013 sur PlayStation 3 et Xbox 360.",
    "Rockstar Games"
  ],
  [
    "jv-18",
    3,
    "En quelle ann\xE9e \xAB Doom \xBB est-il sorti ?",
    1993,
    "",
    "year",
    abs(2),
    "Publi\xE9 par id Software en d\xE9cembre 1993, il popularise le jeu de tir \xE0 la premi\xE8re personne.",
    "id Software"
  ],
  [
    "jv-19",
    2,
    "Combien de joueurs s\u2019affrontent dans une partie classique de \xAB Fortnite \xBB Battle Royale ?",
    100,
    "joueurs",
    "count",
    abs(10),
    "Cent joueurs largu\xE9s sur une \xEEle, jusqu\u2019au dernier survivant.",
    "Epic Games",
    { tags: ["fortnite"] }
  ],
  [
    "jv-20",
    3,
    "En quelle ann\xE9e la Nintendo 64 est-elle sortie au Japon ?",
    1996,
    "",
    "year",
    abs(2),
    "Le 23 juin 1996, avec \xAB Super Mario 64 \xBB.",
    "Nintendo, histoire de la Nintendo 64",
    { tags: ["mario"] }
  ],
  [
    "jv-21",
    4,
    "Quel est le score maximal possible au Pac-Man original ?",
    3333360,
    "points",
    "count",
    rel(0.05),
    "3 333 360 points, atteints pour la premi\xE8re fois en 1999, apr\xE8s 255 niveaux sans perdre une vie (le 256e est injouable).",
    "Twin Galaxies, records Pac-Man",
    { tags: ["pacman"] }
  ],
  [
    "jv-22",
    3,
    "Combien d\u2019esp\xE8ces de Pok\xE9mon existaient \xE0 la sortie de Pok\xE9mon \xC9carlate et Violet et de leurs extensions ?",
    1025,
    "Pok\xE9mon",
    "count",
    rel(0.05),
    "Le Pok\xE9dex national atteint 1 025 esp\xE8ces avec l\u2019extension \xAB Le Disque indigo \xBB (2023-2024).",
    "The Pok\xE9mon Company, Pok\xE9dex national",
    { asOf: "2024", tags: ["pokemon"] }
  ],
  [
    "jv-23",
    2,
    "En quelle ann\xE9e la Nintendo Switch (premi\xE8re du nom) est-elle sortie ?",
    2017,
    "",
    "year",
    abs(1),
    "Le 3 mars 2017, avec \xAB The Legend of Zelda: Breath of the Wild \xBB.",
    "Nintendo"
  ]
]);

// src/shared/questions/gastro.ts
var gastro_default = make("gastro", [
  [
    "gas-01",
    4,
    "\xC0 quelle temp\xE9rature doit cuire une pizza napolitaine selon son cahier des charges, en \xB0C ?",
    485,
    "\xB0C",
    "measure",
    rel(0.05),
    "Le cahier des charges de la \xAB Pizza Napoletana \xBB STG impose un four \xE0 bois \xE0 environ 485 \xB0C, pour 60 \xE0 90 secondes de cuisson.",
    "R\xE8glement (UE) n\xB0 97/2010, Pizza Napoletana STG"
  ],
  [
    "gas-02",
    3,
    "Quel pourcentage minimal de mati\xE8re grasse doit contenir le beurre en France ?",
    82,
    "%",
    "percent",
    abs(2),
    "Au moins 82 % de mati\xE8re grasse et au plus 16 % d\u2019eau.",
    "D\xE9cret n\xB0 88-1204 relatif aux mati\xE8res grasses laiti\xE8res"
  ],
  [
    "gas-03",
    1,
    "Combien de minutes faut-il cuire un \u0153uf \xE0 la coque dans l\u2019eau bouillante ?",
    3,
    "minutes",
    "duration",
    abs(1),
    "Environ 3 minutes ; 6 minutes pour un \u0153uf mollet et 9 \xE0 10 minutes pour un \u0153uf dur.",
    "Larousse gastronomique"
  ],
  [
    "gas-04",
    2,
    "\xC0 quelle temp\xE9rature se fait le second bain des frites, en \xB0C ?",
    180,
    "\xB0C",
    "measure",
    rel(0.06),
    "Un premier bain vers 150-160 \xB0C pour cuire, puis un second \xE0 180 \xB0C pour dorer.",
    "Larousse gastronomique"
  ],
  [
    "gas-05",
    1,
    "Combien p\xE8se une baguette de tradition, en grammes ?",
    250,
    "g",
    "measure",
    rel(0.08),
    "Environ 250 g pour 55 \xE0 65 cm de long.",
    "Conf\xE9d\xE9ration nationale de la boulangerie-p\xE2tisserie fran\xE7aise",
    { tags: ["baguette"] }
  ],
  [
    "gas-06",
    3,
    "Quelle est la pression dans une bouteille de champagne, en bars ?",
    6,
    "bars",
    "measure",
    abs(1),
    "Environ 6 bars, trois fois la pression d\u2019un pneu de voiture.",
    "Comit\xE9 Champagne",
    { tags: ["champagne"] }
  ],
  [
    "gas-07",
    3,
    "Quelle est la dur\xE9e minimale d\u2019affinage du comt\xE9 AOP, en mois ?",
    4,
    "mois",
    "duration",
    abs(1),
    "Au moins 4 mois, mais souvent 12, 18 mois ou davantage.",
    "Comit\xE9 interprofessionnel de gestion du comt\xE9, cahier des charges"
  ],
  [
    "gas-08",
    3,
    "Quelle est la dur\xE9e minimale d\u2019affinage du parmigiano reggiano, en mois ?",
    12,
    "mois",
    "duration",
    abs(2),
    "Au moins 12 mois, le plus long affinage minimal des fromages AOP.",
    "Consorzio del Formaggio Parmigiano Reggiano"
  ],
  [
    "gas-09",
    3,
    "Quel pourcentage d\u2019eau contient une tomate ?",
    94,
    "%",
    "percent",
    abs(2),
    "Environ 94 \xE0 95 % d\u2019eau.",
    "ANSES, table de composition nutritionnelle Ciqual"
  ],
  [
    "gas-10",
    4,
    "\xC0 quelle temp\xE9rature le lait est-il pasteuris\xE9 selon la m\xE9thode haute temp\xE9rature courte dur\xE9e, en \xB0C ?",
    72,
    "\xB0C",
    "measure",
    abs(3),
    "Environ 72 \xB0C pendant 15 secondes, puis refroidissement rapide.",
    "Codex Alimentarius, CAC/RCP 57-2004"
  ],
  [
    "gas-11",
    2,
    "En quelle ann\xE9e le premier Guide Michelin a-t-il \xE9t\xE9 publi\xE9 ?",
    1900,
    "",
    "year",
    abs(3),
    "Distribu\xE9 gratuitement aux automobilistes en 1900. Les \xE9toiles apparaissent en 1926.",
    "Michelin, histoire du Guide"
  ],
  [
    "gas-12",
    3,
    "En quelle ann\xE9e le \xAB repas gastronomique des Fran\xE7ais \xBB a-t-il \xE9t\xE9 inscrit au patrimoine immat\xE9riel de l\u2019UNESCO ?",
    2010,
    "",
    "year",
    abs(2),
    "Inscrit en novembre 2010, premi\xE8re pratique culinaire reconnue \xE0 ce titre.",
    "UNESCO, patrimoine culturel immat\xE9riel",
    { tags: ["unesco-food"] }
  ],
  [
    "gas-13",
    3,
    "En quelle ann\xE9e la baguette de pain a-t-elle \xE9t\xE9 inscrite au patrimoine immat\xE9riel de l\u2019UNESCO ?",
    2022,
    "",
    "year",
    abs(1),
    "Les \xAB savoir-faire artisanaux et la culture de la baguette \xBB sont inscrits le 30 novembre 2022.",
    "UNESCO, patrimoine culturel immat\xE9riel",
    { tags: ["unesco-food"] }
  ],
  [
    "gas-14",
    2,
    "Combien de litres contient une bouteille magnum ?",
    1.5,
    "litres",
    "measure",
    abs(0.1),
    "L\u2019\xE9quivalent de deux bouteilles classiques de 75 cl.",
    "Comit\xE9 Champagne, contenances des bouteilles",
    { decimals: 2, tags: ["champagne"] }
  ],
  [
    "gas-15",
    4,
    "Combien de litres contient un Nabuchodonosor de champagne ?",
    15,
    "litres",
    "measure",
    abs(1),
    "15 litres, soit 20 bouteilles classiques.",
    "Comit\xE9 Champagne, contenances des bouteilles",
    { tags: ["champagne"] }
  ],
  [
    "gas-16",
    3,
    "Combien de kilocalories apporte un gramme de lipides ?",
    9,
    "kcal",
    "measure",
    abs(1),
    "9 kcal par gramme, contre 4 pour les glucides et les prot\xE9ines.",
    "R\xE8glement (UE) n\xB0 1169/2011, annexe XIV"
  ],
  [
    "gas-17",
    2,
    "Combien de grammes de sucre contient une canette de 33 cl de Coca-Cola classique ?",
    35,
    "g",
    "measure",
    rel(0.1),
    "Environ 35 g, soit l\u2019\xE9quivalent de 7 morceaux de sucre.",
    "\xC9tiquetage nutritionnel Coca-Cola France (10,6 g / 100 ml)",
    { asOf: "2025" }
  ],
  [
    "gas-18",
    3,
    "Combien de baguettes environ sont vendues chaque ann\xE9e en France, en milliards ?",
    6,
    "milliards",
    "count",
    rel(0.15),
    "Environ 6 milliards, soit \xE0 peu pr\xE8s 320 baguettes par seconde.",
    "Conf\xE9d\xE9ration nationale de la boulangerie-p\xE2tisserie fran\xE7aise",
    { tags: ["baguette"] }
  ],
  [
    "gas-19",
    3,
    "Combien de litres de s\xE8ve d\u2019\xE9rable faut-il environ pour produire un litre de sirop ?",
    40,
    "litres",
    "measure",
    rel(0.15),
    "Environ 40 litres de s\xE8ve, r\xE9duite par \xE9vaporation.",
    "Producteurs et productrices ac\xE9ricoles du Qu\xE9bec"
  ],
  [
    "gas-20",
    4,
    "Quel pourcentage minimal de cacao doit contenir un chocolat noir dans l\u2019Union europ\xE9enne ?",
    35,
    "%",
    "percent",
    abs(3),
    "Au moins 35 % de mati\xE8re s\xE8che totale de cacao, selon la directive europ\xE9enne.",
    "Directive 2000/36/CE relative aux produits de cacao et de chocolat"
  ],
  [
    "gas-22",
    3,
    "Combien de litres de lait faut-il environ pour fabriquer un kilo de beurre ?",
    22,
    "litres",
    "measure",
    rel(0.15),
    "Environ 22 litres de lait entier sont n\xE9cessaires pour obtenir un kilo de beurre.",
    "Centre national interprofessionnel de l\u2019\xE9conomie laiti\xE8re (CNIEL)"
  ]
]);

// src/shared/questions/quotidien.ts
var quotidien_default = make("quotidien", [
  [
    "quo-01",
    3,
    "Combien p\xE8se une pi\xE8ce de 1 euro, en grammes ?",
    7.5,
    "g",
    "measure",
    rel(0.05),
    "7,5 g pour 23,25 mm de diam\xE8tre ; la pi\xE8ce de 2 \u20AC p\xE8se 8,5 g.",
    "Banque centrale europ\xE9enne, pi\xE8ces en euros",
    { decimals: 1, tags: ["pieces-euro"] }
  ],
  [
    "quo-02",
    4,
    "Quel est le diam\xE8tre d\u2019une pi\xE8ce de 2 euros, en millim\xE8tres ?",
    25.75,
    "mm",
    "measure",
    rel(0.03),
    "25,75 mm, la plus grande des pi\xE8ces en euros.",
    "Banque centrale europ\xE9enne, pi\xE8ces en euros",
    { decimals: 2, tags: ["pieces-euro"] }
  ],
  [
    "quo-03",
    2,
    "Combien de feuilles contient une ramette de papier standard ?",
    500,
    "feuilles",
    "count",
    rel(0.05),
    "500 feuilles : une ramette de A4 \xE0 80 g/m\xB2 p\xE8se environ 2,5 kg.",
    "Usage commercial normalis\xE9 (papeterie)",
    { tags: ["papier"] }
  ],
  [
    "quo-04",
    2,
    "Quelle est la longueur d\u2019une feuille A4, en millim\xE8tres ?",
    297,
    "mm",
    "measure",
    rel(0.03),
    "210 \xD7 297 mm. Le rapport entre les c\xF4t\xE9s est \u221A2 : pli\xE9 en deux, on obtient un A5 aux m\xEAmes proportions.",
    "Norme ISO 216",
    { tags: ["papier"] }
  ],
  [
    "quo-05",
    2,
    "Quel est le taux maximal d\u2019alcool dans le sang autoris\xE9 au volant en France (permis d\xE9finitif), en g/L ?",
    0.5,
    "g/L",
    "measure",
    abs(0.1),
    "0,5 g/L de sang, et 0,2 g/L pour les jeunes conducteurs et les conducteurs de transport en commun.",
    "Code de la route, article R234-1",
    { decimals: 1 }
  ],
  [
    "quo-06",
    3,
    "Combien de chiffres compte un num\xE9ro de s\xE9curit\xE9 sociale fran\xE7ais, cl\xE9 comprise ?",
    15,
    "chiffres",
    "count",
    abs(1),
    "13 chiffres (sexe, ann\xE9e et mois de naissance, lieu, rang) suivis d\u2019une cl\xE9 de contr\xF4le de 2 chiffres.",
    "INSEE, R\xE9pertoire national d\u2019identification des personnes physiques"
  ],
  [
    "quo-07",
    4,
    "Combien de caract\xE8res compte un IBAN fran\xE7ais ?",
    27,
    "caract\xE8res",
    "count",
    abs(2),
    "FR + 2 chiffres de contr\xF4le + 23 caract\xE8res issus du RIB : 27 au total.",
    "Banque de France ; norme ISO 13616"
  ],
  [
    "quo-08",
    2,
    "\xC0 quelle temp\xE9rature doit-on r\xE9gler un r\xE9frig\xE9rateur pour bien conserver les aliments, en \xB0C ?",
    4,
    "\xB0C",
    "measure",
    abs(1),
    "Autour de 4 \xB0C dans la zone la plus froide.",
    "ANSES, recommandations de conservation des aliments"
  ],
  [
    "quo-09",
    4,
    "Quelle est la hauteur standard d\u2019une porte int\xE9rieure en France, en m\xE8tres ?",
    2.04,
    "m",
    "measure",
    abs(0.05),
    "2,04 m de hauteur pour la plupart des blocs-portes int\xE9rieurs.",
    "Dimensions usuelles des fabricants de blocs-portes (204 cm)",
    { decimals: 2 }
  ],
  [
    "quo-10",
    2,
    "Combien de centim\xE8tres mesure un pouce ?",
    2.54,
    "cm",
    "measure",
    abs(0.03),
    "Exactement 2,54 cm depuis l\u2019accord international de 1959. Les \xE9crans sont mesur\xE9s en pouces.",
    "NIST, International Yard and Pound Agreement (1959)",
    { decimals: 2, tags: ["unites-anglo"] }
  ],
  [
    "quo-11",
    3,
    "Combien de litres contient un gallon am\xE9ricain ?",
    3.79,
    "litres",
    "measure",
    abs(0.1),
    "3,785 litres. Le gallon britannique, lui, fait 4,546 litres.",
    "NIST, Handbook 44, Appendix C",
    { decimals: 2, tags: ["unites-anglo"] }
  ],
  [
    "quo-12",
    2,
    "Combien de jours f\xE9ri\xE9s compte le calendrier l\xE9gal en France m\xE9tropolitaine (hors Alsace-Moselle) ?",
    11,
    "jours",
    "count",
    abs(1),
    "Onze jours f\xE9ri\xE9s ; l\u2019Alsace et la Moselle en comptent deux de plus.",
    "Code du travail, article L3133-1"
  ],
  [
    "quo-13",
    1,
    "Quelle est la dur\xE9e l\xE9gale hebdomadaire du travail en France, en heures ?",
    35,
    "heures",
    "duration",
    abs(1),
    "35 heures depuis les lois Aubry de 1998 et 2000.",
    "Code du travail, article L3121-27"
  ],
  [
    "quo-14",
    4,
    "Combien p\xE8se une feuille A4 standard de 80 g/m\xB2, en grammes ?",
    5,
    "g",
    "measure",
    rel(0.1),
    "0,21 \xD7 0,297 m = 0,0624 m\xB2, \xD7 80 g/m\xB2 \u2248 5 g par feuille.",
    "Calcul \xE0 partir de la norme ISO 216",
    { decimals: 1, tags: ["papier"] }
  ],
  [
    "quo-15",
    4,
    "Quel est le diam\xE8tre d\u2019une pile AA, en millim\xE8tres ?",
    14.5,
    "mm",
    "measure",
    rel(0.04),
    "Environ 14,5 mm pour 50,5 mm de long.",
    "Norme CEI 60086 (format LR6)",
    { decimals: 1 }
  ],
  [
    "quo-16",
    2,
    "Combien de valeurs diff\xE9rentes de pi\xE8ces en euros existe-t-il ?",
    8,
    "pi\xE8ces",
    "count",
    abs(1),
    "1, 2, 5, 10, 20 et 50 centimes, 1 et 2 euros.",
    "Banque centrale europ\xE9enne",
    { tags: ["pieces-euro"] }
  ],
  [
    "quo-17",
    2,
    "Quelle est la tension du courant \xE9lectrique domestique en France, en volts ?",
    230,
    "V",
    "measure",
    rel(0.03),
    "230 V (anciennement 220 V), contre 120 V aux \xC9tats-Unis.",
    "Norme NF EN 50160",
    { tags: ["electricite"] }
  ],
  [
    "quo-18",
    3,
    "Quelle est la fr\xE9quence du courant \xE9lectrique en France, en hertz ?",
    50,
    "Hz",
    "measure",
    abs(2),
    "50 Hz en Europe, 60 Hz en Am\xE9rique du Nord.",
    "RTE, r\xE9seau de transport d\u2019\xE9lectricit\xE9",
    { tags: ["electricite"] }
  ],
  [
    "quo-19",
    2,
    "Combien de chiffres compte un code-barres EAN-13 ?",
    13,
    "chiffres",
    "count",
    abs(1),
    "Treize chiffres, dont le dernier est une cl\xE9 de contr\xF4le. Les premiers indiquent l\u2019organisme d\u2019enregistrement.",
    "GS1 France, standard EAN-13"
  ],
  [
    "quo-20",
    3,
    "Combien de m\xE8tres mesure une longueur de piscine municipale standard en France ?",
    25,
    "m",
    "measure",
    abs(1),
    "La majorit\xE9 des bassins municipaux font 25 m ; les bassins olympiques 50 m.",
    "Minist\xE8re des Sports, normes des \xE9quipements aquatiques"
  ],
  [
    "quo-21",
    2,
    "Combien de minutes compte une journ\xE9e ?",
    1440,
    "minutes",
    "count",
    rel(0.04),
    "24 \xD7 60 = 1 440 minutes.",
    "Calcul",
    { tags: ["temps-calc"] }
  ],
  [
    "quo-22",
    3,
    "Combien de chiffres compte un num\xE9ro SIRET d\u2019entreprise ?",
    14,
    "chiffres",
    "count",
    abs(1),
    "9 chiffres du SIREN qui identifient l\u2019entreprise, puis 5 chiffres qui identifient l\u2019\xE9tablissement.",
    "INSEE, r\xE9pertoire SIRENE"
  ]
]);

// src/shared/questions/records.ts
var records_default = make("records", [
  [
    "rec-01",
    1,
    "Quelle est la hauteur du Burj Khalifa \xE0 Duba\xEF, plus haute tour du monde, en m\xE8tres ?",
    828,
    "m",
    "measure",
    rel(0.04),
    "828 m et 163 \xE9tages, inaugur\xE9 en 2010.",
    "Council on Tall Buildings and Urban Habitat (CTBUH)",
    { asOf: "2025", tags: ["burj"] }
  ],
  [
    "rec-02",
    2,
    "Quelle taille mesurait Robert Wadlow, l\u2019homme le plus grand de l\u2019histoire, en m\xE8tres ?",
    2.72,
    "m",
    "measure",
    abs(0.05),
    "2,72 m mesur\xE9s en 1940, peu avant sa mort \xE0 22 ans.",
    "Guinness World Records, \xAB Tallest man ever \xBB",
    { decimals: 2 }
  ],
  [
    "rec-03",
    1,
    "\xC0 quel \xE2ge est morte Jeanne Calment, doyenne de l\u2019humanit\xE9 ?",
    122,
    "ans",
    "duration",
    abs(2),
    "N\xE9e en 1875 \xE0 Arles, morte en 1997 \xE0 122 ans et 164 jours.",
    "Guinness World Records ; INSEE"
  ],
  [
    "rec-04",
    3,
    "Quel est le record de vitesse terrestre, \xE9tabli par Thrust SSC en 1997, en km/h ?",
    1228,
    "km/h",
    "measure",
    rel(0.04),
    "1 228 km/h dans le d\xE9sert du Nevada : premier v\xE9hicule terrestre \xE0 franchir le mur du son.",
    "F\xE9d\xE9ration internationale de l\u2019automobile (FIA)"
  ],
  [
    "rec-05",
    4,
    "De quelle altitude Alan Eustace a-t-il saut\xE9 en parachute en 2014, record du monde, en m\xE8tres ?",
    41419,
    "m",
    "measure",
    rel(0.05),
    "41 419 m, au-dessus du Nouveau-Mexique, sous un ballon stratosph\xE9rique.",
    "F\xE9d\xE9ration a\xE9ronautique internationale (FAI)"
  ],
  [
    "rec-06",
    3,
    "Quelle est la longueur du viaduc Danyang\u2013Kunshan, plus long pont du monde, en km ?",
    164.8,
    "km",
    "measure",
    rel(0.05),
    "Environ 164,8 km, sur la ligne \xE0 grande vitesse P\xE9kin\u2013Shanghai.",
    "Guinness World Records, \xAB Longest bridge \xBB",
    { decimals: 1 }
  ],
  [
    "rec-07",
    3,
    "Combien d\u2019\xE9tages compte le Burj Khalifa ?",
    163,
    "\xE9tages",
    "count",
    rel(0.05),
    "163 \xE9tages habitables, plus des niveaux techniques dans la fl\xE8che.",
    "Council on Tall Buildings and Urban Habitat (CTBUH)",
    { tags: ["burj"] }
  ],
  [
    "rec-08",
    3,
    "Quelle est la hauteur du Salto \xC1ngel, plus haute chute d\u2019eau du monde, en m\xE8tres ?",
    979,
    "m",
    "measure",
    rel(0.05),
    "979 m au Venezuela, dont 807 m de chute ininterrompue.",
    "UNESCO, Parc national de Canaima"
  ],
  [
    "rec-09",
    4,
    "Quelle profondeur a atteint le forage SG-3 de Kola, plus profond trou creus\xE9 par l\u2019homme, en m\xE8tres ?",
    12262,
    "m",
    "measure",
    rel(0.05),
    "12 262 m en 1989, dans le nord-ouest de la Russie, pour un diam\xE8tre de seulement 23 cm.",
    "Guinness World Records, \xAB Deepest hole \xBB"
  ],
  [
    "rec-10",
    3,
    "Quelle est la temp\xE9rature la plus basse jamais mesur\xE9e sur Terre, en \xB0C ?",
    -89.2,
    "\xB0C",
    "measure",
    abs(2),
    "\u221289,2 \xB0C le 21 juillet 1983 \xE0 la station Vostok, en Antarctique.",
    "Organisation m\xE9t\xE9orologique mondiale (OMM), archives des extr\xEAmes",
    { decimals: 1, signed: true, tags: ["temperature-extreme"] }
  ],
  [
    "rec-11",
    3,
    "Quelle est la temp\xE9rature la plus \xE9lev\xE9e officiellement mesur\xE9e sur Terre, en \xB0C ?",
    56.7,
    "\xB0C",
    "measure",
    abs(1.5),
    "56,7 \xB0C le 10 juillet 1913 \xE0 Death Valley, en Californie.",
    "Organisation m\xE9t\xE9orologique mondiale (OMM), archives des extr\xEAmes",
    { decimals: 1, tags: ["temperature-extreme"] }
  ],
  [
    "rec-12",
    3,
    "Quelle est la longueur du tunnel de base du Saint-Gothard, plus long tunnel ferroviaire du monde, en km ?",
    57.1,
    "km",
    "measure",
    rel(0.05),
    "57,1 km sous les Alpes suisses, ouvert en 2016.",
    "AlpTransit Gotthard AG",
    { decimals: 1 }
  ],
  [
    "rec-13",
    3,
    "Combien de carats pesait le Cullinan, plus gros diamant brut jamais trouv\xE9 ?",
    3106,
    "carats",
    "count",
    rel(0.05),
    "Environ 3 106 carats (621 g), d\xE9couvert en Afrique du Sud en 1905. Il orne aujourd\u2019hui les joyaux de la Couronne britannique.",
    "Natural History Museum (Londres), \xAB The Cullinan diamond \xBB"
  ],
  [
    "rec-14",
    3,
    "Quelle est la hauteur de la statue de l\u2019Unit\xE9 en Inde, plus haute statue du monde, en m\xE8tres ?",
    182,
    "m",
    "measure",
    rel(0.05),
    "182 m, inaugur\xE9e en 2018 en hommage \xE0 Sardar Vallabhbhai Patel.",
    "Guinness World Records, \xAB Tallest statue \xBB"
  ],
  [
    "rec-15",
    4,
    "Quel est le record de vitesse d\u2019un train \xE0 sustentation magn\xE9tique, \xE9tabli au Japon en 2015, en km/h ?",
    603,
    "km/h",
    "measure",
    rel(0.03),
    "603 km/h par le L0 Series de la Central Japan Railway Company.",
    "Guinness World Records, \xAB Fastest maglev train \xBB"
  ],
  [
    "rec-16",
    4,
    "Quelle hauteur mesurait la plus grande vague jamais surf\xE9e, \xE0 Nazar\xE9 en 2020, en m\xE8tres ?",
    26.21,
    "m",
    "measure",
    rel(0.05),
    "26,21 m surf\xE9s par l\u2019Allemand Sebastian Steudtner au Portugal.",
    "Guinness World Records, \xAB Largest wave surfed (unlimited) \xBB",
    { decimals: 2 }
  ],
  [
    "rec-17",
    3,
    "\xC0 quel \xE2ge est mort Bluey, le plus vieux chien dont l\u2019\xE2ge est v\xE9rifi\xE9 ?",
    29,
    "ans",
    "duration",
    abs(2),
    "Bouvier australien, mort en 1939 \xE0 29 ans et 5 mois.",
    "Guinness World Records, \xAB Oldest dog ever \xBB"
  ],
  [
    "rec-18",
    3,
    "Quelle est la hauteur de la tour First \xE0 La D\xE9fense, plus haut gratte-ciel de France, en m\xE8tres ?",
    231,
    "m",
    "measure",
    rel(0.05),
    "231 m avec son antenne. La tour Eiffel reste, elle, la plus haute construction de Paris.",
    "Council on Tall Buildings and Urban Habitat (CTBUH)",
    { asOf: "2025" }
  ],
  [
    "rec-19",
    4,
    "Combien de places compte le stade Narendra-Modi d\u2019Ahmedabad, plus grand stade du monde ?",
    132e3,
    "places",
    "count",
    rel(0.05),
    "Environ 132 000 places pour le cricket, inaugur\xE9 dans sa forme actuelle en 2020.",
    "Gujarat Cricket Association"
  ],
  [
    "rec-20",
    2,
    "Quelle est la hauteur de la tour Eiffel, antennes comprises, en m\xE8tres ?",
    330,
    "m",
    "measure",
    rel(0.03),
    "330 m depuis l\u2019installation d\u2019une nouvelle antenne en 2022 ; elle mesurait 312 m \xE0 son inauguration.",
    "Soci\xE9t\xE9 d\u2019exploitation de la tour Eiffel (SETE)",
    { asOf: "2022", tags: ["eiffel"] }
  ],
  [
    "rec-21",
    3,
    "Combien d\u2019ann\xE9es a v\xE9cu le plus vieil animal connu, la palourde \xAB Ming \xBB ?",
    507,
    "ans",
    "duration",
    rel(0.05),
    "Une palourde d\u2019Islande p\xEAch\xE9e en 2006 : ses stries de croissance ont r\xE9v\xE9l\xE9 507 ans.",
    "Butler et al., Palaeogeography, Palaeoclimatology, Palaeoecology, 2013"
  ],
  [
    "rec-22",
    4,
    "Combien de jours a dur\xE9 le plus long s\xE9jour continu d\u2019un humain dans l\u2019espace ?",
    437,
    "jours",
    "duration",
    rel(0.04),
    "Valeri Poliakov, 437 jours \xE0 bord de la station Mir entre 1994 et 1995.",
    "NASA ; Roscosmos"
  ]
]);

// src/shared/questions/insolite.ts
var insolite_default = make("insolite", [
  [
    "ins-01",
    4,
    "Combien de configurations poss\xE8de un Rubik\u2019s Cube 3\xD73, en milliards de milliards ?",
    43,
    "milliards de milliards",
    "count",
    rel(0.1),
    "Exactement 43 252 003 274 489 856 000. Pourtant, toutes se r\xE9solvent en 20 mouvements au plus.",
    "Rokicki et al., \xAB God\u2019s Number is 20 \xBB (2010)"
  ],
  [
    "ins-02",
    4,
    "Combien de fois par seconde une abeille bat-elle des ailes ?",
    230,
    "battements",
    "count",
    rel(0.15),
    "Environ 230 battements par seconde, ce qui produit son bourdonnement caract\xE9ristique.",
    "Altshuler et al., PNAS, 2005"
  ],
  [
    "ins-03",
    3,
    "Combien p\xE8se la structure m\xE9tallique de la tour Eiffel, en tonnes ?",
    7300,
    "tonnes",
    "measure",
    rel(0.05),
    "Environ 7 300 tonnes de fer puddl\xE9 ; 10 100 tonnes au total avec les \xE9quipements.",
    "Soci\xE9t\xE9 d\u2019exploitation de la tour Eiffel (SETE)",
    { tags: ["eiffel"] }
  ],
  [
    "ins-04",
    3,
    "Combien de rivets maintiennent la tour Eiffel, en millions ?",
    2.5,
    "millions",
    "count",
    rel(0.1),
    "2,5 millions de rivets assemblent ses 18 038 pi\xE8ces m\xE9talliques.",
    "Soci\xE9t\xE9 d\u2019exploitation de la tour Eiffel (SETE)",
    { decimals: 1, tags: ["eiffel"] }
  ],
  [
    "ins-05",
    3,
    "Combien de Terres pourraient tenir dans le volume du Soleil, en millions ?",
    1.3,
    "millions",
    "count",
    rel(0.1),
    "Environ 1,3 million de Terres.",
    "NASA, Sun Fact Sheet",
    { decimals: 1, tags: ["soleil-taille"] }
  ],
  [
    "ins-06",
    3,
    "Combien de tours Eiffel faudrait-il empiler pour atteindre le sommet de l\u2019Everest ?",
    27,
    "tours",
    "count",
    abs(2),
    "8 849 m / 330 m \u2248 26,8 : il en faudrait 27.",
    "Calcul",
    { tags: ["everest"] }
  ],
  [
    "ins-07",
    4,
    "Combien de kilom\xE8tres la Terre parcourt-elle autour du Soleil en une journ\xE9e, en millions ?",
    2.6,
    "millions de km",
    "measure",
    rel(0.08),
    "Environ 2,6 millions de km par jour, soit pr\xE8s de 107 000 km/h.",
    "Calcul \xE0 partir de la NASA Earth Fact Sheet",
    { decimals: 1 }
  ],
  [
    "ins-08",
    3,
    "Combien de secondes met la lumi\xE8re r\xE9fl\xE9chie par la Lune pour nous parvenir ?",
    1.3,
    "secondes",
    "duration",
    abs(0.2),
    "Environ 1,3 seconde. Les astronautes d\u2019Apollo devaient composer avec ce d\xE9lai radio.",
    "Calcul : distance Terre\u2013Lune / vitesse de la lumi\xE8re",
    { decimals: 1, tags: ["lune-distance"] }
  ],
  [
    "ins-09",
    3,
    "Selon l\u2019estimation souvent cit\xE9e, combien de kilom\xE8tres de vaisseaux sanguins compte le corps humain ?",
    1e5,
    "km",
    "measure",
    rel(0.2),
    "L\u2019estimation la plus cit\xE9e est d\u2019environ 100 000 km, soit deux fois et demie le tour de la Terre ; les estimations varient beaucoup.",
    "Institut national de la sant\xE9 et de la recherche m\xE9dicale (Inserm), vulgarisation"
  ],
  [
    "ins-10",
    4,
    "Combien de chiffres compte le nombre de fa\xE7ons de m\xE9langer un jeu de 52 cartes (52!) ?",
    68,
    "chiffres",
    "count",
    abs(3),
    "52! \u2248 8,07 \xD7 10\u2076\u2077 : un m\xE9lange bien fait n\u2019a probablement jamais exist\xE9 auparavant.",
    "Calcul",
    { tags: ["cartes"] }
  ],
  [
    "ins-11",
    3,
    "Combien de litres d\u2019eau faut-il en moyenne pour produire un kilo de b\u0153uf ?",
    15e3,
    "litres",
    "measure",
    rel(0.15),
    "Environ 15 400 litres selon l\u2019empreinte eau moyenne mondiale, pluie comprise.",
    "Water Footprint Network, Mekonnen & Hoekstra (2012)"
  ],
  [
    "ins-12",
    2,
    "Combien de lettres compte le mot \xAB anticonstitutionnellement \xBB ?",
    25,
    "lettres",
    "count",
    abs(2),
    "25 lettres : longtemps pr\xE9sent\xE9 comme le plus long mot de la langue fran\xE7aise.",
    "Le Robert"
  ],
  [
    "ins-13",
    3,
    "Combien de num\xE9ros principaux compte la grille du Loto fran\xE7ais ?",
    49,
    "num\xE9ros",
    "count",
    abs(2),
    "On coche 5 num\xE9ros sur 49, plus un num\xE9ro Chance sur 10.",
    "Fran\xE7aise des jeux, r\xE8glement du Loto",
    { tags: ["loto"] }
  ],
  [
    "ins-14",
    4,
    "Combien de combinaisons possibles compte une grille du Loto fran\xE7ais, en millions ?",
    19.1,
    "millions",
    "count",
    rel(0.08),
    "(49 parmi 5) \xD7 10 = 19 068 840 combinaisons : une chance sur 19 millions de gagner le jackpot.",
    "Fran\xE7aise des jeux, r\xE8glement du Loto ; calcul",
    { decimals: 1, tags: ["loto"] }
  ],
  [
    "ins-15",
    4,
    "De combien de fa\xE7ons peut-on assembler six briques LEGO 2\xD74 de m\xEAme couleur, en millions ?",
    915,
    "millions",
    "count",
    rel(0.05),
    "915 103 765 combinaisons, calcul\xE9es par ordinateur en 2005.",
    "Eilers, \xAB The LEGO counting problem \xBB (2016) ; LEGO Group"
  ],
  [
    "ins-16",
    3,
    "Combien de fois au maximum une feuille de papier a-t-elle \xE9t\xE9 pli\xE9e en deux (record de Britney Gallivan) ?",
    12,
    "fois",
    "count",
    abs(1),
    "Douze fois en 2002, avec un rouleau de papier toilette de 1,2 km de long.",
    "Gallivan, \xAB How to Fold Paper in Half Twelve Times \xBB (2002)",
    { tags: ["papier"] }
  ],
  [
    "ins-17",
    4,
    "Combien de lettres compte le nom complet du village gallois \xAB Llanfairpwllgwyngyll\u2026 \xBB ?",
    58,
    "lettres",
    "count",
    rel(0.08),
    "Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch : 58 lettres, le plus long nom de lieu d\u2019Europe.",
    "Isle of Anglesey County Council"
  ],
  [
    "ins-18",
    3,
    "Combien de temps dure en moyenne un \xE9ternuement, en secondes ?",
    0.5,
    "seconde",
    "duration",
    abs(0.2),
    "Environ une demi-seconde, mais l\u2019air expuls\xE9 peut d\xE9passer 150 km/h.",
    "Bourouiba et al., Journal of Fluid Mechanics, 2014",
    { decimals: 1 }
  ],
  [
    "ins-19",
    3,
    "Combien de marches compte l\u2019escalier menant au sommet de l\u2019Arc de triomphe ?",
    284,
    "marches",
    "count",
    rel(0.05),
    "284 marches pour atteindre la terrasse, \xE0 50 m de hauteur.",
    "Centre des monuments nationaux, Arc de triomphe"
  ],
  [
    "ins-20",
    4,
    "Combien de lettres compte le mot \xAB hippopotomonstrosesquippedaliophobie \xBB, qui d\xE9signe la peur des mots longs ?",
    36,
    "lettres",
    "count",
    abs(3),
    "36 lettres pour d\xE9signer, avec ironie, la phobie des mots trop longs.",
    "Comptage des lettres du mot"
  ]
]);

// src/shared/questions/eco.ts
var eco_default = make("eco", [
  [
    "eco-01",
    1,
    "Combien de pays sont membres de l\u2019Union europ\xE9enne ?",
    27,
    "pays",
    "count",
    abs(1),
    "27 depuis la sortie du Royaume-Uni le 31 janvier 2020.",
    "Union europ\xE9enne, \xAB Pays de l\u2019UE \xBB (european-union.europa.eu)",
    { asOf: "2025" }
  ],
  [
    "eco-02",
    1,
    "En quelle ann\xE9e les pi\xE8ces et billets en euros ont-ils \xE9t\xE9 mis en circulation ?",
    2002,
    "",
    "year",
    abs(1),
    "Le 1er janvier 2002 dans 12 pays ; l\u2019euro existait d\xE9j\xE0 sous forme scripturale depuis 1999.",
    "Banque centrale europ\xE9enne, histoire de l\u2019euro",
    { tags: ["euro-histoire"] }
  ],
  [
    "eco-03",
    1,
    "Combien d\u2019habitants comptait la Terre fin 2022, selon l\u2019ONU, en milliards ?",
    8,
    "milliards",
    "count",
    rel(0.03),
    "Le cap des 8 milliards a \xE9t\xE9 franchi le 15 novembre 2022 selon les Nations unies.",
    "Nations unies, World Population Prospects 2022",
    { decimals: 1, asOf: "2022" }
  ],
  [
    "eco-04",
    3,
    "Combien de francs valait un euro lors du passage \xE0 la monnaie unique ?",
    6.56,
    "francs",
    "money",
    abs(0.05),
    "Exactement 6,559 57 francs, taux fix\xE9 irr\xE9vocablement le 31 d\xE9cembre 1998.",
    "R\xE8glement (CE) n\xB0 2866/98 du Conseil",
    { decimals: 2, tags: ["euro-histoire"] }
  ],
  [
    "eco-05",
    2,
    "Combien de d\xE9put\xE9s si\xE8gent \xE0 l\u2019Assembl\xE9e nationale ?",
    577,
    "d\xE9put\xE9s",
    "count",
    rel(0.02),
    "577 d\xE9put\xE9s \xE9lus au scrutin majoritaire \xE0 deux tours dans autant de circonscriptions.",
    "Assembl\xE9e nationale",
    { tags: ["parlement"] }
  ],
  [
    "eco-06",
    3,
    "Combien de s\xE9nateurs compte le S\xE9nat fran\xE7ais ?",
    348,
    "s\xE9nateurs",
    "count",
    rel(0.03),
    "348 s\xE9nateurs \xE9lus au suffrage universel indirect pour six ans.",
    "S\xE9nat",
    { tags: ["parlement"] }
  ],
  [
    "eco-07",
    3,
    "Quelle \xE9tait l\u2019esp\xE9rance de vie \xE0 la naissance des femmes en France en 2024, en ann\xE9es ?",
    85.6,
    "ans",
    "duration",
    abs(1),
    "85,6 ans pour les femmes, 80,0 ans pour les hommes.",
    "INSEE Premi\xE8re, Bilan d\xE9mographique 2024",
    { decimals: 1, asOf: "2024", tags: ["demo-fr"] }
  ],
  [
    "eco-08",
    4,
    "Combien de b\xE9b\xE9s sont n\xE9s en France en 2024 ?",
    663e3,
    "naissances",
    "count",
    rel(0.05),
    "Environ 663 000 naissances, le plus faible nombre depuis la fin de la Seconde Guerre mondiale.",
    "INSEE Premi\xE8re, Bilan d\xE9mographique 2024",
    { asOf: "2024", tags: ["demo-fr"] }
  ],
  [
    "eco-09",
    2,
    "Combien de pr\xE9sidents la Ve R\xE9publique a-t-elle connus, en comptant Emmanuel Macron ?",
    8,
    "pr\xE9sidents",
    "count",
    abs(1),
    "De Gaulle, Pompidou, Giscard d\u2019Estaing, Mitterrand, Chirac, Sarkozy, Hollande et Macron.",
    "\xC9lys\xE9e, les pr\xE9sidents de la R\xE9publique",
    { asOf: "2025" }
  ],
  [
    "eco-10",
    3,
    "En quelle ann\xE9e la S\xE9curit\xE9 sociale a-t-elle \xE9t\xE9 cr\xE9\xE9e en France ?",
    1945,
    "",
    "year",
    abs(3),
    "Par les ordonnances des 4 et 19 octobre 1945.",
    "Comit\xE9 d\u2019histoire de la S\xE9curit\xE9 sociale"
  ],
  [
    "eco-11",
    1,
    "Quel est le taux normal de TVA en France, en pourcentage ?",
    20,
    "%",
    "percent",
    abs(1),
    "20 % depuis 2014 ; des taux r\xE9duits de 10 %, 5,5 % et 2,1 % s\u2019appliquent \xE0 certains produits.",
    "Code g\xE9n\xE9ral des imp\xF4ts, article 278",
    { asOf: "2025" }
  ],
  [
    "eco-12",
    3,
    "Combien de langues officielles compte l\u2019Union europ\xE9enne ?",
    24,
    "langues",
    "count",
    abs(2),
    "24 langues officielles, toutes utilisables au Parlement europ\xE9en.",
    "Union europ\xE9enne, langues officielles"
  ],
  [
    "eco-13",
    2,
    "Combien de billets diff\xE9rents (valeurs faciales) existe-t-il en euros ?",
    7,
    "billets",
    "count",
    abs(1),
    "5, 10, 20, 50, 100, 200 et 500 \u20AC. Le billet de 500 \u20AC n\u2019est plus \xE9mis mais reste valable.",
    "Banque centrale europ\xE9enne, billets en euros"
  ],
  [
    "eco-14",
    3,
    "Combien de pays utilisent l\u2019euro au 1er janvier 2026 ?",
    21,
    "pays",
    "count",
    abs(1),
    "La Bulgarie est devenue le 21e pays de la zone euro le 1er janvier 2026.",
    "Banque de France, \xAB La Bulgarie rejoint la zone euro \xBB",
    { asOf: "1er janvier 2026" }
  ],
  [
    "eco-15",
    2,
    "Combien de membres permanents compte le Conseil de s\xE9curit\xE9 de l\u2019ONU ?",
    5,
    "membres",
    "count",
    abs(0),
    "Chine, \xC9tats-Unis, France, Royaume-Uni et Russie, chacun disposant d\u2019un droit de veto.",
    "Charte des Nations unies, article 23"
  ],
  [
    "eco-16",
    3,
    "En quelle ann\xE9e l\u2019\xE2ge de la majorit\xE9 est-il pass\xE9 de 21 \xE0 18 ans en France ?",
    1974,
    "",
    "year",
    abs(2),
    "Par la loi du 5 juillet 1974, sous la pr\xE9sidence de Val\xE9ry Giscard d\u2019Estaing.",
    "L\xE9gifrance, loi n\xB0 74-631 du 5 juillet 1974"
  ],
  [
    "eco-17",
    3,
    "En quelle ann\xE9e le quinquennat pr\xE9sidentiel a-t-il \xE9t\xE9 adopt\xE9 par r\xE9f\xE9rendum ?",
    2e3,
    "",
    "year",
    abs(2),
    "R\xE9f\xE9rendum du 24 septembre 2000 ; il s\u2019applique \xE0 partir de l\u2019\xE9lection de 2002.",
    "Conseil constitutionnel, r\xE9f\xE9rendum du 24 septembre 2000"
  ],
  [
    "eco-18",
    3,
    "Quelle part de l\u2019\xE9lectricit\xE9 fran\xE7aise a \xE9t\xE9 produite par le nucl\xE9aire en 2024, en pourcentage ?",
    67,
    "%",
    "percent",
    abs(4),
    "Environ 67 % (361,7 TWh), en nette remont\xE9e apr\xE8s les difficult\xE9s de 2022.",
    "RTE, Bilan \xE9lectrique 2024",
    { asOf: "2024" }
  ],
  [
    "eco-19",
    4,
    "\xC0 combien s\u2019\xE9levait la dette publique fran\xE7aise fin 2024, en milliards d\u2019euros ?",
    3305,
    "milliards \u20AC",
    "money",
    rel(0.05),
    "Environ 3 305 milliards d\u2019euros, soit environ 113 % du PIB.",
    "INSEE, Informations rapides \u2014 dette des administrations publiques (mars 2025)",
    { asOf: "fin 2024" }
  ],
  [
    "eco-20",
    2,
    "Combien d\u2019\xC9tats sont membres de l\u2019OTAN ?",
    32,
    "\xC9tats",
    "count",
    abs(2),
    "La Su\xE8de est devenue le 32e membre en mars 2024, un an apr\xE8s la Finlande.",
    "OTAN, pays membres (nato.int)",
    { asOf: "2025" }
  ],
  [
    "eco-21",
    3,
    "Quel \xE9tait l\u2019indicateur conjoncturel de f\xE9condit\xE9 en France en 2024 (enfants par femme) ?",
    1.62,
    "enfant par femme",
    "measure",
    abs(0.1),
    "1,62 enfant par femme, le plus bas niveau depuis la fin de la Seconde Guerre mondiale.",
    "INSEE Premi\xE8re, Bilan d\xE9mographique 2024",
    { decimals: 2, asOf: "2024", tags: ["demo-fr"] }
  ],
  [
    "eco-22",
    3,
    "Combien d\u2019habitants compte la Chine, en milliards (estimation ONU 2023) ?",
    1.41,
    "milliard",
    "count",
    rel(0.03),
    "Environ 1,41 milliard ; l\u2019Inde l\u2019a d\xE9pass\xE9e en 2023 selon l\u2019ONU.",
    "Nations unies, World Population Prospects",
    { decimals: 2, asOf: "2023" }
  ]
]);

// src/shared/questions/index.ts
var QUESTIONS = [
  ...culture_default,
  ...histoire_default,
  ...geo_default,
  ...sciences_default,
  ...nature_default,
  ...espace_default,
  ...sport_default,
  ...football_default,
  ...cinema_default,
  ...musique_default,
  ...tech_default,
  ...jeuxvideo_default,
  ...gastro_default,
  ...quotidien_default,
  ...records_default,
  ...insolite_default,
  ...eco_default
];
function fingerprint(text) {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 3).sort().join(" ");
}
function auditQuestions(qs) {
  const problems2 = [];
  const ids = /* @__PURE__ */ new Set();
  const prints = /* @__PURE__ */ new Map();
  for (const q of qs) {
    const where = `[${q.id}]`;
    if (ids.has(q.id)) problems2.push(`${where} identifiant en double`);
    ids.add(q.id);
    if (q.text.trim().length < 15 || !q.text.trim().endsWith("?")) problems2.push(`${where} texte invalide`);
    if (!Number.isFinite(q.answer)) problems2.push(`${where} r\xE9ponse non num\xE9rique`);
    if (q.answer < 0 && !q.signed) problems2.push(`${where} r\xE9ponse n\xE9gative sans \xAB signed \xBB`);
    if (!hasAtMostDecimals(q.answer, q.decimals ?? 0)) problems2.push(`${where} la r\xE9ponse a plus de d\xE9cimales que la saisie n'en permet`);
    if ("abs" in q.tol && q.tol.abs < 0) problems2.push(`${where} tol\xE9rance n\xE9gative`);
    if ("rel" in q.tol && (q.tol.rel <= 0 || q.tol.rel > 0.5)) problems2.push(`${where} tol\xE9rance relative hors bornes`);
    if (q.kind === "year" && "rel" in q.tol) problems2.push(`${where} une ann\xE9e doit avoir une tol\xE9rance absolue`);
    if (q.explain.trim().length < 20) problems2.push(`${where} explication trop courte`);
    if (q.source.trim().length < 4) problems2.push(`${where} source manquante`);
    const fp = fingerprint(q.text);
    const twin = prints.get(fp);
    if (twin) problems2.push(`${where} formulation quasi identique \xE0 ${twin}`);
    prints.set(fp, q.id);
  }
  return problems2;
}

// src/shared/protocol.ts
var PROTOCOL_VERSION = 1;
var MAX_MESSAGE_BYTES = 8 * 1024;
var MAX_PLAYERS = 12;
var CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
var CODE_LENGTH = 5;
var ERROR_TEXT = {
  bad_message: "Message non reconnu.",
  rate_limited: "Trop d\u2019actions en peu de temps. Patientez un instant.",
  room_not_found: "Aucun salon ne correspond \xE0 ce code. V\xE9rifiez les lettres et les chiffres.",
  room_full: "Ce salon est complet.",
  room_locked: "L\u2019h\xF4te a ferm\xE9 ce salon aux nouveaux joueurs.",
  room_started: "La partie a d\xE9j\xE0 commenc\xE9 dans ce salon.",
  room_expired: "Ce salon a expir\xE9. Demandez un nouveau code \xE0 l\u2019h\xF4te.",
  not_host: "Seul l\u2019h\xF4te peut faire cela.",
  not_enough_players: "Il faut au moins un joueur dans chaque \xE9quipe.",
  not_in_room: "Vous n\u2019\xEAtes plus dans ce salon.",
  session_invalid: "Votre session a expir\xE9. Rejoignez \xE0 nouveau le salon.",
  not_spokesperson: "C\u2019est le porte-parole de votre \xE9quipe qui valide cette manche.",
  stale: "Action ignor\xE9e : la partie a d\xE9j\xE0 avanc\xE9.",
  invalid_action: "Action impossible \xE0 ce moment de la partie.",
  server_full: "Le serveur est momentan\xE9ment satur\xE9. R\xE9essayez dans un instant.",
  version: "Votre version du jeu est obsol\xE8te. Rechargez la page."
};
var isObj = (x) => typeof x === "object" && x !== null && !Array.isArray(x);
var isTeam = (x) => x === "A" || x === "B";
var isStr = (x, max) => typeof x === "string" && x.length <= max;
var isInt = (x, lo, hi) => typeof x === "number" && Number.isInteger(x) && x >= lo && x <= hi;
function normalizeCode(raw) {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, CODE_LENGTH);
}
function isValidCode(code) {
  return code.length === CODE_LENGTH && [...code].every((c) => CODE_ALPHABET.includes(c));
}
function parseAction(a) {
  if (!isObj(a)) return null;
  switch (a.type) {
    case "estimate":
      return isTeam(a.team) && typeof a.value === "number" && Number.isFinite(a.value) ? { type: "estimate", team: a.team, value: a.value, bet: a.bet === true } : null;
    case "joker":
      return isTeam(a.team) && (a.joker === "hint" || a.joker === "swap") ? { type: "joker", team: a.team, joker: a.joker } : null;
    case "contest":
      return isTeam(a.team) && (a.call === "plus" || a.call === "moins" || a.call === "pile") ? { type: "contest", team: a.team, call: a.call, double: a.double === true } : null;
    case "tb_estimate":
      return isTeam(a.team) && typeof a.value === "number" && Number.isFinite(a.value) ? { type: "tb_estimate", team: a.team, value: a.value } : null;
    case "advance":
      return { type: "advance" };
    default:
      return null;
  }
}
function parseClientMessage(raw) {
  if (raw.length > MAX_MESSAGE_BYTES) return null;
  let m;
  try {
    m = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObj(m) || typeof m.t !== "string") return null;
  switch (m.t) {
    case "hello": {
      if (!isInt(m.v, 0, 1e3)) return null;
      const s = m.session;
      if (s !== void 0) {
        if (!isObj(s) || !isStr(s.roomCode, 8) || !isStr(s.playerId, 64) || !isStr(s.token, 128)) return null;
        return { t: "hello", v: m.v, session: { roomCode: s.roomCode, playerId: s.playerId, token: s.token } };
      }
      return { t: "hello", v: m.v };
    }
    case "create":
      return isStr(m.name, 200) && isInt(m.avatar, 0, 999) ? { t: "create", name: m.name, avatar: m.avatar, settings: m.settings } : null;
    case "join":
      return isStr(m.code, 16) && isStr(m.name, 200) && isInt(m.avatar, 0, 999) ? { t: "join", code: m.code, name: m.name, avatar: m.avatar } : null;
    case "leave":
    case "start":
    case "close":
    case "rematch":
      return { t: m.t };
    case "team":
      return isTeam(m.team) ? { t: "team", team: m.team } : null;
    case "settings":
      return { t: "settings", settings: m.settings };
    case "lock":
      return typeof m.locked === "boolean" ? { t: "lock", locked: m.locked } : null;
    case "kick":
      return isStr(m.playerId, 64) ? { t: "kick", playerId: m.playerId } : null;
    case "act": {
      const action = parseAction(m.action);
      return action && isStr(m.id, 64) && isInt(m.step, 0, 1e7) ? { t: "act", id: m.id, step: m.step, action } : null;
    }
    case "draft":
      return isStr(m.text, 40) ? { t: "draft", text: m.text } : null;
    case "ping":
      return typeof m.at === "number" && Number.isFinite(m.at) ? { t: "ping", at: m.at } : null;
    default:
      return null;
  }
}

// src/shared/rand.ts
var cryptoApi = () => globalThis.crypto;
function randomBytesArray(n) {
  const a = new Uint8Array(n);
  cryptoApi().getRandomValues(a);
  return a;
}
function randomId(bytes = 9) {
  let bin = "";
  for (const b of randomBytesArray(bytes)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function randomIntBelow(max) {
  if (!Number.isInteger(max) || max <= 0 || max > 2 ** 32) throw new RangeError("max invalide");
  const limit = Math.floor(2 ** 32 / max) * max;
  const buf = new Uint32Array(1);
  for (; ; ) {
    cryptoApi().getRandomValues(buf);
    const x = buf[0];
    if (x < limit) return x % max;
  }
}
function sameString(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// src/shared/types.ts
var otherTeam = (t) => t === "A" ? "B" : "A";
function toPublicQuestion(q) {
  const p = {
    id: q.id,
    text: q.text,
    cat: q.cat,
    level: q.level,
    unit: q.unit,
    kind: q.kind,
    decimals: q.decimals ?? 0,
    signed: q.signed ?? false
  };
  if (q.asOf) p.asOf = q.asOf;
  return p;
}

// src/shared/engine.ts
function deckSizeFor(s) {
  return s.maxRounds + s.jokers.swap * 2 + MAX_TIEBREAKS + 2;
}
function createVersus(bank2, settings, seed, now, avoid = []) {
  const deck = buildDeck(bank2, {
    difficulty: settings.difficulty,
    categories: settings.categories,
    count: deckSizeFor(settings),
    seed,
    avoid
  });
  if (deck.length === 0) throw new Error("Aucune question disponible pour ces cat\xE9gories.");
  const startTeam = settings.startingTeam === "random" ? derive(seed, "start")() < 0.5 ? "A" : "B" : settings.startingTeam;
  const team = (t) => ({ name: settings.teamNames[t], score: 0, jokers: { ...settings.jokers } });
  const s = {
    v: 1,
    seed,
    settings,
    teams: { A: team("A"), B: team("B") },
    deck,
    deckPos: 0,
    phase: "intro",
    step: 0,
    round: 0,
    startTeam,
    estimator: startTeam,
    questionId: null,
    tolerance: 0,
    estimate: null,
    bet: false,
    hint: null,
    hintUsed: false,
    swapped: false,
    doubled: false,
    call: null,
    multiplier: 1,
    deadline: null,
    phaseStartedAt: now,
    history: [],
    tb: null,
    winner: null,
    endReason: null
  };
  const events = [];
  startRound(s, bank2, now, events);
  return s;
}
function reduce(state, action, bank2) {
  const fail = (error) => ({ ok: false, error, state });
  if (state.phase === "over") return fail("wrong_phase");
  const s = structuredClone(state);
  const events = [];
  const now = action.now;
  switch (action.type) {
    case "estimate": {
      if (s.phase !== "estimate") return fail("wrong_phase");
      if (action.team !== s.estimator) return fail("not_your_turn");
      const q = currentQuestion(s, bank2);
      if (!validateValue(action.value, { decimals: q.decimals ?? 0, kind: q.kind, allowNegative: q.signed ?? false })) {
        return fail("invalid_value");
      }
      const team = s.teams[action.team];
      if (action.bet) {
        if (team.jokers.bet <= 0) return fail("no_joker");
        team.jokers.bet -= 1;
      }
      s.estimate = action.value;
      s.bet = Boolean(action.bet);
      events.push({ type: "locked", team: action.team, value: action.value, bet: s.bet });
      setPhase(s, "contest", now, s.settings.contestSeconds * 1e3);
      break;
    }
    case "joker": {
      if (s.phase !== "estimate") return fail("wrong_phase");
      if (action.team !== s.estimator) return fail("not_your_turn");
      const team = s.teams[action.team];
      if (action.joker === "hint") {
        if (s.hintUsed) return fail("already_used");
        if (team.jokers.hint <= 0) return fail("no_joker");
        team.jokers.hint -= 1;
        s.hint = computeHint(s, currentQuestion(s, bank2));
        s.hintUsed = true;
        events.push({ type: "hint", team: action.team, lo: s.hint.lo, hi: s.hint.hi });
      } else {
        if (s.swapped) return fail("already_used");
        if (team.jokers.swap <= 0) return fail("no_joker");
        const next = drawQuestion(s);
        if (!next) return fail("no_question");
        team.jokers.swap -= 1;
        s.questionId = next;
        s.tolerance = toleranceFor(s, requireQuestion(bank2, next));
        s.swapped = true;
        s.hint = null;
        events.push({ type: "swap", team: action.team });
        setPhase(s, "estimate", now, s.settings.estimateSeconds * 1e3);
      }
      break;
    }
    case "contest": {
      if (s.phase !== "contest") return fail("wrong_phase");
      if (action.team !== otherTeam(s.estimator)) return fail("not_your_turn");
      if (action.call !== "plus" && action.call !== "moins" && action.call !== "pile") return fail("invalid_value");
      if (action.call === "pile" && !s.settings.allowPileCall) return fail("pile_disabled");
      const team = s.teams[action.team];
      if (action.double) {
        if (team.jokers.double <= 0) return fail("no_joker");
        team.jokers.double -= 1;
        s.doubled = true;
      }
      s.call = action.call;
      events.push({ type: "contested", team: action.team, call: action.call, doubled: s.doubled });
      resolveRound(s, bank2, now, events);
      break;
    }
    case "tb_estimate": {
      if (s.phase !== "tb_estimate" || !s.tb) return fail("wrong_phase");
      if (action.team !== "A" && action.team !== "B") return fail("not_your_turn");
      if (s.tb.estimates[action.team] !== void 0) return fail("already_locked");
      const q = requireQuestion(bank2, s.tb.questionId);
      if (!validateValue(action.value, { decimals: q.decimals ?? 0, kind: q.kind, allowNegative: q.signed ?? false })) {
        return fail("invalid_value");
      }
      s.tb.estimates[action.team] = action.value;
      events.push({ type: "tb_locked", team: action.team });
      if (s.tb.estimates.A !== void 0 && s.tb.estimates.B !== void 0) resolveTiebreak(s, bank2, now, events);
      break;
    }
    case "tick": {
      if (s.deadline === null || now < s.deadline) return fail("not_due");
      events.push({ type: "timeout", phase: s.phase });
      onDeadline(s, bank2, now, events);
      break;
    }
    case "advance": {
      if (s.phase !== "intro" && s.phase !== "reveal" && s.phase !== "tb_intro" && s.phase !== "tb_reveal") {
        return fail("wrong_phase");
      }
      onDeadline(s, bank2, now, events);
      break;
    }
    case "forfeit": {
      if (action.team !== "A" && action.team !== "B") return fail("not_your_turn");
      endGame(s, otherTeam(action.team), "forfeit", now, events);
      break;
    }
    default:
      return fail("wrong_phase");
  }
  s.step += 1;
  return { ok: true, state: s, events };
}
function setPhase(s, phase, now, durationMs) {
  s.phase = phase;
  s.phaseStartedAt = now;
  s.deadline = durationMs && durationMs > 0 ? now + durationMs : null;
}
function currentQuestion(s, bank2) {
  if (!s.questionId) throw new Error("Aucune question en cours");
  return requireQuestion(bank2, s.questionId);
}
function drawQuestion(s) {
  const id = s.deck[s.deckPos];
  if (id === void 0) return null;
  s.deckPos += 1;
  return id;
}
function toleranceFactor(settings) {
  return DIFFICULTY_PROFILES[settings.difficulty].tolFactor * settings.tolFactor;
}
function toleranceFor(s, q) {
  return effectiveTolerance(q, toleranceFactor(s.settings));
}
function startRound(s, bank2, now, events) {
  const qid = drawQuestion(s);
  if (!qid) {
    finishByScore(s, "exhausted", now, events);
    return;
  }
  s.round += 1;
  s.estimator = s.round === 1 ? s.startTeam : otherTeam(s.estimator);
  s.questionId = qid;
  s.tolerance = toleranceFor(s, requireQuestion(bank2, qid));
  s.estimate = null;
  s.bet = false;
  s.hint = null;
  s.hintUsed = false;
  s.swapped = false;
  s.doubled = false;
  s.call = null;
  s.multiplier = s.settings.primeEvery > 0 && s.round % s.settings.primeEvery === 0 ? s.settings.primeMultiplier : 1;
  events.push({ type: "round_intro", round: s.round, estimator: s.estimator, multiplier: s.multiplier });
  setPhase(s, "intro", now, introMs(s.settings));
}
function onDeadline(s, bank2, now, events) {
  switch (s.phase) {
    case "intro":
      setPhase(s, "estimate", now, s.settings.estimateSeconds * 1e3);
      events.push({ type: "estimate_open", round: s.round });
      return;
    case "estimate":
      resolveRound(s, bank2, now, events);
      return;
    case "contest":
      resolveRound(s, bank2, now, events);
      return;
    case "reveal":
      afterReveal(s, bank2, now, events);
      return;
    case "tb_intro":
      setPhase(s, "tb_estimate", now, s.settings.estimateSeconds * 1e3);
      return;
    case "tb_estimate":
      resolveTiebreak(s, bank2, now, events);
      return;
    case "tb_reveal": {
      const last = s.tb?.results[s.tb.results.length - 1];
      if (last?.winner) endGame(s, last.winner, "tiebreak", now, events);
      else if (s.tb && s.tb.index < MAX_TIEBREAKS) startTiebreak(s, bank2, now, events);
      else endGame(s, "draw", "draw", now, events);
      return;
    }
    default:
      return;
  }
}
function scoreRound(settings, input) {
  const r = settings.scoring;
  const E = input.estimator;
  const C = otherTeam(E);
  const pts = { A: 0, B: 0 };
  let outcome;
  let inZone = false;
  let exact = false;
  let direction = null;
  if (input.estimate === null) {
    outcome = "no_estimate";
    pts[C] += r.noEstimate;
  } else {
    const ev = evaluate(input.estimate, input.answer, input.tolerance);
    inZone = ev.inZone;
    exact = ev.exact;
    direction = ev.direction;
    if (inZone) {
      if (input.call === "pile") {
        outcome = "pile_shared";
        pts[E] += r.pileSharedEstimator;
        pts[C] += r.pileSharedContester;
      } else {
        outcome = "pile";
        pts[E] += r.pileEstimator;
      }
      if (exact) pts[E] += r.exactBonus;
      if (input.bet) pts[E] *= r.betMultiplier;
    } else {
      if (input.call === null) {
        outcome = "no_contest";
        pts[E] += r.noContest;
      } else if (input.call === "pile") {
        outcome = "pile_call_wrong";
        pts[E] += r.pileCallWrong;
      } else if (input.call === direction) {
        outcome = "contest_right";
        pts[C] += r.contestRight;
      } else {
        outcome = "contest_wrong";
        pts[E] += r.contestWrong;
      }
      if (input.bet) pts[C] += r.betMissPenalty;
    }
  }
  const multiplier = input.prime * (input.doubled ? r.doubleMultiplier : 1);
  pts.A *= multiplier;
  pts.B *= multiplier;
  return { outcome, points: pts, inZone, exact, direction, multiplier };
}
function resolveRound(s, bank2, now, events) {
  const q = currentQuestion(s, bank2);
  const scored = scoreRound(s.settings, {
    estimator: s.estimator,
    estimate: s.estimate,
    call: s.estimate === null ? null : s.call,
    bet: s.bet,
    doubled: s.doubled,
    prime: s.multiplier,
    answer: q.answer,
    tolerance: s.tolerance
  });
  const result = {
    round: s.round,
    questionId: q.id,
    estimator: s.estimator,
    estimate: s.estimate,
    bet: s.bet,
    call: s.call,
    doubled: s.doubled,
    answer: q.answer,
    tolerance: s.tolerance,
    hintUsed: s.hintUsed,
    swapped: s.swapped,
    ...scored
  };
  s.teams.A.score += result.points.A;
  s.teams.B.score += result.points.B;
  s.history.push(result);
  events.push({ type: "reveal", result });
  setPhase(s, "reveal", now, s.settings.revealSeconds * 1e3);
}
function afterReveal(s, bank2, now, events) {
  const { A, B } = s.teams;
  const target = s.settings.targetScore;
  const reachedTarget = target > 0 && (A.score >= target || B.score >= target);
  const outOfRounds = s.round >= s.settings.maxRounds;
  if (reachedTarget || outOfRounds) {
    finishByScore(s, reachedTarget ? "target" : "rounds", now, events, bank2);
    return;
  }
  startRound(s, bank2, now, events);
}
function finishByScore(s, reason, now, events, bank2) {
  const { A, B } = s.teams;
  if (A.score !== B.score) {
    endGame(s, A.score > B.score ? "A" : "B", reason, now, events);
  } else if (s.settings.tiebreak && bank2 && s.deckPos < s.deck.length) {
    startTiebreak(s, bank2, now, events);
  } else {
    endGame(s, "draw", "draw", now, events);
  }
}
function startTiebreak(s, bank2, now, events) {
  const qid = drawQuestion(s);
  if (!qid) {
    endGame(s, "draw", "draw", now, events);
    return;
  }
  const index = (s.tb?.index ?? 0) + 1;
  s.tb = { index, questionId: qid, estimates: {}, results: s.tb?.results ?? [] };
  s.questionId = qid;
  s.tolerance = toleranceFor(s, requireQuestion(bank2, qid));
  events.push({ type: "tb_intro", index });
  setPhase(s, "tb_intro", now, introMs(s.settings));
}
function resolveTiebreak(s, bank2, now, events) {
  if (!s.tb) return;
  const q = requireQuestion(bank2, s.tb.questionId);
  const a = s.tb.estimates.A ?? null;
  const b = s.tb.estimates.B ?? null;
  const dist = (x) => {
    if (x === null) return null;
    const d = toScaled(q.answer) - toScaled(x);
    return d < 0n ? -d : d;
  };
  const da = dist(a);
  const db = dist(b);
  let winner = null;
  if (da !== null && db !== null) winner = da < db ? "A" : db < da ? "B" : null;
  else if (da !== null) winner = "A";
  else if (db !== null) winner = "B";
  const result = { index: s.tb.index, questionId: q.id, answer: q.answer, estimates: { A: a, B: b }, winner };
  s.tb.results.push(result);
  events.push({ type: "tb_reveal", result });
  setPhase(s, "tb_reveal", now, s.settings.revealSeconds * 1e3);
}
function endGame(s, winner, reason, now, events) {
  s.winner = winner;
  s.endReason = reason;
  events.push({ type: "game_over", winner, reason });
  setPhase(s, "over", now, null);
}
function computeHint(s, q) {
  const rng = derive(s.seed, "hint", s.round, q.id);
  const d = q.decimals ?? 0;
  const v = q.answer;
  let lo;
  let hi;
  if ("rel" in q.tol && v > 0) {
    const spread = 2.2 + rng() * 1.4;
    const split = 0.2 + rng() * 0.6;
    lo = v / spread ** split;
    hi = v * spread ** (1 - split);
  } else {
    const base = "abs" in q.tol ? q.tol.abs : Math.abs(v) * 0.1;
    const width = Math.max(base * 10, 10 ** -d * 10);
    const split = 0.2 + rng() * 0.6;
    lo = v - width * split;
    hi = v + width * (1 - split);
  }
  lo = roundNice(lo, "down", d);
  hi = roundNice(hi, "up", d);
  if (!q.signed) lo = Math.max(0, lo);
  if (q.kind === "year") {
    lo = Math.floor(lo);
    hi = Math.ceil(hi);
  }
  if (lo > v) lo = v;
  if (hi < v) hi = v;
  return { lo, hi };
}
function revealQuestion(q) {
  return { ...toPublicQuestion(q), answer: q.answer, explain: q.explain, source: q.source };
}
function toleranceLabel(q, factor, tolerance) {
  if (tolerance === 0) return "Valeur exacte";
  if ("rel" in q.tol) {
    const pct = q.tol.rel * factor * 100;
    const shown = pct >= 10 ? Math.round(pct) : Math.round(pct * 10) / 10;
    return `\xB1${String(shown).replace(".", ",")} %`;
  }
  const unit = q.kind === "year" ? tolerance >= 2 ? " ans" : " an" : q.unit ? ` ${q.unit}` : "";
  return `\xB1${String(tolerance).replace(".", ",")}${unit}`;
}
function versusView(s, bank2, viewer) {
  const q = s.questionId ? requireQuestion(bank2, s.questionId) : null;
  const lastResult = s.history[s.history.length - 1] ?? null;
  const showLast = lastResult !== null && (s.phase !== "intro" && s.phase !== "estimate" && s.phase !== "contest");
  const seeHint = viewer === "all" || viewer === s.estimator;
  const tbRevealed = s.phase === "tb_reveal" || s.phase === "over";
  let tb = null;
  if (s.tb) {
    const tq = requireQuestion(bank2, s.tb.questionId);
    const estimates = {};
    for (const t of ["A", "B"]) {
      const e = s.tb.estimates[t];
      if (e !== void 0 && (tbRevealed || viewer === "all" || viewer === t)) estimates[t] = e;
    }
    tb = {
      index: s.tb.index,
      question: toPublicQuestion(tq),
      locked: { A: s.tb.estimates.A !== void 0, B: s.tb.estimates.B !== void 0 },
      estimates,
      results: s.tb.results.map((r) => ({ ...r, question: revealQuestion(requireQuestion(bank2, r.questionId)) }))
    };
  }
  return {
    phase: s.phase,
    step: s.step,
    round: s.round,
    settings: s.settings,
    teams: structuredClone(s.teams),
    estimator: s.estimator,
    multiplier: s.multiplier,
    deadline: s.deadline,
    phaseStartedAt: s.phaseStartedAt,
    question: q && s.phase !== "over" ? toPublicQuestion(q) : null,
    toleranceLabel: q ? toleranceLabel(q, toleranceFactor(s.settings), s.tolerance) : null,
    estimate: s.estimate,
    bet: s.bet,
    call: s.call,
    doubled: s.doubled,
    hint: seeHint ? s.hint : null,
    hintUsed: s.hintUsed,
    swapped: s.swapped,
    last: showLast && lastResult ? { ...lastResult, question: revealQuestion(requireQuestion(bank2, lastResult.questionId)) } : null,
    history: s.history,
    tb,
    winner: s.winner,
    endReason: s.endReason
  };
}

// src/server/rooms.ts
var ENV = typeof process !== "undefined" && process.env ? process.env : {};
var env = (k, d) => ENV[k] !== void 0 && Number.isFinite(Number(ENV[k])) ? Number(ENV[k]) : d;
var LIMITS2 = {
  maxRooms: env("MAX_ROOMS", 2e3),
  hostGraceMs: env("HOST_GRACE_MS", 15e3),
  lobbyDropMs: env("LOBBY_DROP_MS", 12e4),
  emptyLobbyMs: env("EMPTY_LOBBY_MS", 10 * 6e4),
  emptyGameMs: env("EMPTY_GAME_MS", 15 * 6e4),
  finishedIdleMs: env("FINISHED_IDLE_MS", 30 * 6e4),
  forfeitGraceMs: env("FORFEIT_GRACE_MS", 2e4),
  actionMemory: 64
};
var newId = (bytes = 9) => randomId(bytes);
var sameToken = (a, b) => sameString(a, b);
var RoomManager = class {
  rooms = /* @__PURE__ */ new Map();
  conns = /* @__PURE__ */ new Map();
  structureChanged = false;
  deps;
  constructor(deps) {
    this.deps = { now: () => Date.now(), ...deps };
  }
  get roomCount() {
    return this.rooms.size;
  }
  get playerCount() {
    let n = 0;
    for (const r of this.rooms.values()) n += r.players.filter((p) => p.connected).length;
    return n;
  }
  /* --------------------------------------------------------------- connexions */
  connect(connId) {
    this.conns.set(connId, { roomCode: null, playerId: null });
  }
  disconnect(connId) {
    const c = this.conns.get(connId);
    this.conns.delete(connId);
    if (!c?.roomCode || !c.playerId) return;
    const room = this.rooms.get(c.roomCode);
    const p = room?.players.find((x) => x.id === c.playerId);
    if (!room || !p || p.conn !== connId) return;
    p.connected = false;
    p.conn = null;
    p.lastSeen = this.deps.now();
    p.draft = "";
    this.touch(room);
    this.broadcast(room);
  }
  /* --------------------------------------------------------------- messages */
  handle(connId, msg) {
    const c = this.conns.get(connId);
    if (!c) return;
    const now = this.deps.now();
    switch (msg.t) {
      case "hello":
        if (msg.v !== PROTOCOL_VERSION) return this.error(connId, "version");
        if (msg.session) return this.resume(connId, msg.session);
        return;
      case "ping":
        this.deps.send(connId, { t: "pong", at: msg.at, server: now });
        return;
      case "create":
        return this.create(connId, msg);
      case "join":
        return this.join(connId, msg);
      default:
        break;
    }
    const ctx = this.context(connId);
    if (!ctx) return this.error(connId, "not_in_room", msg.t);
    const { room, player } = ctx;
    room.lastActivity = now;
    switch (msg.t) {
      case "leave":
        this.removePlayer(room, player.id, "left");
        return;
      case "team":
        if (room.status === "playing") return this.error(connId, "invalid_action", "team");
        player.team = msg.team;
        break;
      case "settings":
        if (player.id !== room.hostId) return this.error(connId, "not_host", "settings");
        if (room.status === "playing") return this.error(connId, "invalid_action", "settings");
        room.settings = sanitizeSettings(msg.settings);
        break;
      case "lock":
        if (player.id !== room.hostId) return this.error(connId, "not_host", "lock");
        room.locked = msg.locked;
        break;
      case "kick": {
        if (player.id !== room.hostId) return this.error(connId, "not_host", "kick");
        if (msg.playerId === player.id) return this.error(connId, "invalid_action", "kick");
        this.removePlayer(room, msg.playerId, "kicked");
        return;
      }
      case "close":
        if (player.id !== room.hostId) return this.error(connId, "not_host", "close");
        this.closeRoom(room, "closed_by_host");
        return;
      case "start": {
        if (player.id !== room.hostId) return this.error(connId, "not_host", "start");
        if (room.status === "playing") return this.error(connId, "invalid_action", "start");
        const a = room.players.filter((p) => p.team === "A" && p.connected).length;
        const b = room.players.filter((p) => p.team === "B" && p.connected).length;
        if (a < 1 || b < 1) return this.error(connId, "not_enough_players", "start");
        const seed = 1 + randomIntBelow(2 ** 31 - 2);
        room.game = createVersus(this.deps.bank, room.settings, seed, now);
        room.status = "playing";
        room.emptyTeamSince = {};
        for (const p of room.players) p.draft = "";
        this.deps.log?.("partie lanc\xE9e", { code: room.code, players: room.players.length });
        break;
      }
      case "rematch":
        if (player.id !== room.hostId) return this.error(connId, "not_host", "rematch");
        if (room.status !== "finished") return this.error(connId, "invalid_action", "rematch");
        room.status = "lobby";
        room.game = null;
        break;
      case "act":
        return this.act(connId, room, player, msg);
      case "draft":
        if (room.status !== "playing") return;
        player.draft = cleanText(msg.text, 24, "");
        this.sendDrafts(room, player.team);
        return;
      default:
        return;
    }
    this.touch(room);
    this.broadcast(room);
  }
  context(connId) {
    const c = this.conns.get(connId);
    if (!c?.roomCode || !c.playerId) return null;
    const room = this.rooms.get(c.roomCode);
    const player = room?.players.find((p) => p.id === c.playerId);
    if (!room || !player || player.conn !== connId) return null;
    return { room, player };
  }
  bind(connId, room, player) {
    if (player.conn && player.conn !== connId) {
      const old = this.conns.get(player.conn);
      if (old) {
        old.roomCode = null;
        old.playerId = null;
      }
    }
    player.conn = connId;
    player.connected = true;
    player.lastSeen = this.deps.now();
    const c = this.conns.get(connId);
    if (c) {
      if (c.roomCode && c.roomCode !== room.code) {
        const prev = this.rooms.get(c.roomCode);
        if (prev && c.playerId) this.removePlayer(prev, c.playerId, "left", true);
      }
      c.roomCode = room.code;
      c.playerId = player.id;
    }
    this.deps.send(connId, { t: "welcome", session: { roomCode: room.code, playerId: player.id, token: player.token } });
  }
  resume(connId, s) {
    const room = this.rooms.get(normalizeCode(s.roomCode));
    if (!room) return this.error(connId, "room_expired", "resume");
    const p = room.players.find((x) => x.id === s.playerId);
    if (!p || !sameToken(p.token, s.token)) return this.error(connId, "session_invalid", "resume");
    this.bind(connId, room, p);
    this.touch(room);
    this.broadcast(room);
    if (room.status === "playing") this.sendDrafts(room, p.team);
  }
  newPlayer(name, avatar, team) {
    const now = this.deps.now();
    return {
      id: newId(),
      token: newId(24),
      name: cleanText(name, 20, "Joueur"),
      avatar: Math.max(0, Math.min(63, Math.round(avatar))),
      team,
      joinedAt: now,
      connected: true,
      lastSeen: now,
      conn: null,
      processed: [],
      draft: ""
    };
  }
  generateCode() {
    for (let attempt = 0; attempt < 50; attempt++) {
      let code = "";
      for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[randomIntBelow(CODE_ALPHABET.length)];
      if (!this.rooms.has(code)) return code;
    }
    throw new Error("Impossible de g\xE9n\xE9rer un code unique");
  }
  create(connId, msg) {
    if (this.rooms.size >= LIMITS2.maxRooms) return this.error(connId, "server_full", "create");
    const now = this.deps.now();
    const host = this.newPlayer(msg.name, msg.avatar, "A");
    const room = {
      code: this.generateCode(),
      createdAt: now,
      lastActivity: now,
      hostId: host.id,
      locked: false,
      status: "lobby",
      settings: sanitizeSettings(msg.settings),
      players: [host],
      game: null,
      emptyTeamSince: {},
      dirty: true
    };
    this.rooms.set(room.code, room);
    this.bind(connId, room, host);
    this.deps.log?.("salon cr\xE9\xE9", { code: room.code });
    this.broadcast(room);
  }
  join(connId, msg) {
    const code = normalizeCode(msg.code);
    if (!isValidCode(code)) return this.error(connId, "room_not_found", "join");
    const room = this.rooms.get(code);
    if (!room) return this.error(connId, "room_not_found", "join");
    if (room.status === "playing") return this.error(connId, "room_started", "join");
    if (room.locked) return this.error(connId, "room_locked", "join");
    if (room.players.length >= MAX_PLAYERS) return this.error(connId, "room_full", "join");
    const a = room.players.filter((p2) => p2.team === "A").length;
    const b = room.players.filter((p2) => p2.team === "B").length;
    const p = this.newPlayer(msg.name, msg.avatar, a > b ? "B" : "A");
    room.players.push(p);
    this.bind(connId, room, p);
    this.touch(room);
    this.broadcast(room);
  }
  removePlayer(room, playerId, reason, silent = false) {
    const p = room.players.find((x) => x.id === playerId);
    if (!p) return;
    room.players = room.players.filter((x) => x.id !== playerId);
    if (p.conn) {
      const c = this.conns.get(p.conn);
      if (c) {
        c.roomCode = null;
        c.playerId = null;
      }
      if (!silent) this.deps.send(p.conn, { t: "closed", reason });
    }
    if (room.players.length === 0) {
      this.rooms.delete(room.code);
      this.structureChanged = true;
      return;
    }
    if (room.hostId === playerId) this.migrateHost(room);
    this.touch(room);
    this.broadcast(room);
  }
  migrateHost(room) {
    const next = [...room.players].sort((a, b) => Number(b.connected) - Number(a.connected) || a.joinedAt - b.joinedAt)[0];
    if (next) room.hostId = next.id;
  }
  closeRoom(room, reason) {
    for (const p of room.players) {
      if (p.conn) {
        this.deps.send(p.conn, { t: "closed", reason });
        const c = this.conns.get(p.conn);
        if (c) {
          c.roomCode = null;
          c.playerId = null;
        }
      }
    }
    this.rooms.delete(room.code);
    this.structureChanged = true;
  }
  /** Porte-parole d'une équipe pour la manche en cours : rotation parmi les joueurs connectés. */
  spokesperson(room, team) {
    const members = room.players.filter((p) => p.team === team && p.connected).sort((a, b) => a.joinedAt - b.joinedAt);
    if (members.length === 0) return null;
    const g = room.game;
    const turn = g ? Math.max(0, g.round - 1) + (g.tb?.index ?? 0) : 0;
    return members[turn % members.length] ?? null;
  }
  act(connId, room, player, msg) {
    const seen = player.processed.find(([id]) => id === msg.id);
    if (seen) {
      this.deps.send(connId, { t: "ack", id: msg.id, ...seen[1] });
      return;
    }
    const remember = (r2) => {
      player.processed.push([msg.id, r2]);
      if (player.processed.length > LIMITS2.actionMemory) player.processed.shift();
      this.deps.send(connId, { t: "ack", id: msg.id, ...r2 });
    };
    const g = room.game;
    if (room.status !== "playing" || !g) return remember({ ok: false, error: "invalid_action" });
    if (msg.step !== g.step) return remember({ ok: false, error: "stale" });
    const a = msg.action;
    if (a.type === "advance") {
      if (player.id !== room.hostId) return remember({ ok: false, error: "not_host" });
    } else {
      if (a.team !== player.team) return remember({ ok: false, error: "invalid_action" });
      const sp = this.spokesperson(room, player.team);
      if (!sp || sp.id !== player.id) return remember({ ok: false, error: "not_spokesperson" });
    }
    const r = reduce(g, { ...a, now: this.deps.now() }, this.deps.bank);
    if (!r.ok) return remember({ ok: false, error: r.error });
    this.applyGame(room, r.state);
    remember({ ok: true });
    this.broadcast(room);
  }
  applyGame(room, state) {
    const phaseChanged = room.game?.phase !== state.phase || room.game?.round !== state.round;
    room.game = state;
    if (state.phase === "over") room.status = "finished";
    if (phaseChanged) {
      for (const p of room.players) p.draft = "";
    }
    this.touch(room);
  }
  /* --------------------------------------------------------------- horloge */
  tick() {
    const now = this.deps.now();
    for (const room of [...this.rooms.values()]) {
      const g = room.game;
      let changed = false;
      if (room.status === "playing" && g && g.deadline !== null && now >= g.deadline) {
        const r = reduce(g, { type: "tick", now }, this.deps.bank);
        if (r.ok) {
          this.applyGame(room, r.state);
          changed = true;
        }
      }
      if (room.status === "playing" && room.game) {
        for (const t of ["A", "B"]) {
          const present = room.players.some((p) => p.team === t);
          if (present) delete room.emptyTeamSince[t];
          else if (room.emptyTeamSince[t] === void 0) room.emptyTeamSince[t] = now;
          else if (now - room.emptyTeamSince[t] > LIMITS2.forfeitGraceMs) {
            const r = reduce(room.game, { type: "forfeit", team: t, now }, this.deps.bank);
            if (r.ok) {
              this.applyGame(room, r.state);
              changed = true;
            }
          }
        }
      }
      const host = room.players.find((p) => p.id === room.hostId);
      if (host && !host.connected && now - host.lastSeen > LIMITS2.hostGraceMs && room.players.some((p) => p.connected)) {
        this.migrateHost(room);
        changed = true;
      }
      if (room.status !== "playing") {
        for (const p of room.players) {
          if (!p.connected && now - p.lastSeen > LIMITS2.lobbyDropMs) {
            this.removePlayer(room, p.id, "left", true);
            if (!this.rooms.has(room.code)) break;
          }
        }
        if (!this.rooms.has(room.code)) continue;
      }
      const anyone = room.players.some((p) => p.connected);
      const idle = now - room.lastActivity;
      if (!anyone && room.status === "lobby" && idle > LIMITS2.emptyLobbyMs || !anyone && room.status === "playing" && idle > LIMITS2.emptyGameMs || room.status === "finished" && idle > LIMITS2.finishedIdleMs) {
        this.closeRoom(room, "expired");
        continue;
      }
      if (changed) this.broadcast(room);
    }
  }
  /* --------------------------------------------------------------- diffusion */
  touch(room) {
    room.lastActivity = this.deps.now();
    room.dirty = true;
  }
  viewFor(room, player) {
    const sp = { A: this.spokesperson(room, "A")?.id ?? null, B: this.spokesperson(room, "B")?.id ?? null };
    return {
      code: room.code,
      status: room.status,
      hostId: room.hostId,
      locked: room.locked,
      players: room.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, team: p.team, connected: p.connected, isHost: p.id === room.hostId })),
      settings: room.settings,
      game: room.game ? versusView(room.game, this.deps.bank, player.team) : null,
      you: { id: player.id, team: player.team },
      spokesperson: sp,
      serverNow: this.deps.now()
    };
  }
  broadcast(room) {
    if (!this.rooms.has(room.code)) return;
    for (const p of room.players) {
      if (p.connected && p.conn) this.deps.send(p.conn, { t: "room", room: this.viewFor(room, p) });
    }
  }
  sendDrafts(room, team) {
    const members = room.players.filter((p) => p.team === team && p.connected && p.conn);
    for (const m of members) {
      const drafts = members.filter((x) => x.id !== m.id && x.draft).map((x) => ({ name: x.name, text: x.draft }));
      this.deps.send(m.conn, { t: "drafts", drafts });
    }
  }
  error(connId, code, ref) {
    this.deps.send(connId, { t: "error", code, message: ERROR_TEXT[code], ref });
  }
  /* --------------------------------------------------------------- persistance */
  snapshot() {
    const rooms = [...this.rooms.values()].map((r) => ({
      ...r,
      players: r.players.map((p) => ({ ...p, conn: null, connected: false }))
    }));
    return JSON.stringify({ v: 1, savedAt: this.deps.now(), rooms });
  }
  restore(json) {
    try {
      const data = JSON.parse(json);
      if (data.v !== 1 || !Array.isArray(data.rooms)) return 0;
      const now = this.deps.now();
      for (const r of data.rooms) {
        if (r.game && !r.game.deck.every((id) => this.deps.bank.byId.has(id))) continue;
        r.players = r.players.map((p) => ({ ...p, conn: null, connected: false, lastSeen: now }));
        r.lastActivity = now;
        r.settings = sanitizeSettings(r.settings);
        this.rooms.set(r.code, r);
      }
      return this.rooms.size;
    } catch {
      return 0;
    }
  }
  isDirty() {
    let d = this.structureChanged;
    this.structureChanged = false;
    for (const r of this.rooms.values()) {
      if (r.dirty) d = true;
      r.dirty = false;
    }
    return d;
  }
  /** Pour les tests et le diagnostic. */
  debugRoom(code) {
    return this.rooms.get(code);
  }
};

// src/server/index.ts
var PORT = Number(process.env.PORT ?? 8080);
var HOST = process.env.HOST ?? "0.0.0.0";
var STATIC_DIR = resolve(process.env.STATIC_DIR ?? "dist/public");
var DATA_DIR = process.env.DATA_DIR === void 0 ? resolve("data") : process.env.DATA_DIR ? resolve(process.env.DATA_DIR) : null;
var ALLOWED = (process.env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
var TRUST_PROXY = process.env.TRUST_PROXY === "1";
var JOIN_RATE = Number(process.env.JOIN_RATE_PER_MIN ?? 15);
var log = (msg, extra = {}) => console.log(JSON.stringify({ t: (/* @__PURE__ */ new Date()).toISOString(), msg, ...extra }));
var questions = [...QUESTIONS];
if (process.env.EXTRA_QUESTIONS) {
  try {
    const extra = JSON.parse(readFileSync(process.env.EXTRA_QUESTIONS, "utf8"));
    questions = questions.concat(extra);
    log("questions suppl\xE9mentaires charg\xE9es", { count: extra.length });
  } catch (e) {
    log("EXTRA_QUESTIONS illisible", { error: String(e) });
  }
}
var problems = auditQuestions(questions);
if (problems.length) {
  log("base de questions invalide", { problems: problems.slice(0, 10) });
  process.exit(1);
}
var bank = createBank(questions);
var sockets = /* @__PURE__ */ new Map();
var manager = new RoomManager({
  bank,
  send: (connId, msg) => {
    const ws = sockets.get(connId);
    if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
  },
  log
});
var snapshotFile = DATA_DIR ? join(DATA_DIR, "rooms.json") : null;
if (snapshotFile && existsSync(snapshotFile)) {
  const n = manager.restore(readFileSync(snapshotFile, "utf8"));
  log("salons restaur\xE9s", { count: n });
}
function save(force = false) {
  if (!snapshotFile || !DATA_DIR) return;
  if (!manager.isDirty() && !force) return;
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    const tmp = `${snapshotFile}.tmp`;
    writeFileSync(tmp, manager.snapshot());
    renameSync(tmp, snapshotFile);
  } catch (e) {
    log("sauvegarde impossible", { error: String(e) });
  }
}
var tickTimer = setInterval(() => manager.tick(), 200);
var saveTimer = setInterval(() => save(), 3e3);
var MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".webm": "audio/webm",
  ".m4a": "audio/mp4",
  ".txt": "text/plain; charset=utf-8"
};
var SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "SAMEORIGIN",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; media-src 'self' blob:; connect-src 'self' ws: wss:; worker-src 'self'; base-uri 'self'; frame-ancestors 'self'"
};
function serveStatic(req, res) {
  const url = new URL(req.url ?? "/", "http://local");
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith("/")) pathname += "index.html";
  const file = normalize(join(STATIC_DIR, pathname));
  if (!file.startsWith(STATIC_DIR + sep) && file !== STATIC_DIR) {
    res.writeHead(403).end();
    return;
  }
  let target = file;
  let exists = existsSync(target) && statSync(target).isFile();
  if (!exists && !extname(pathname)) {
    target = join(STATIC_DIR, "index.html");
    exists = existsSync(target);
  }
  if (!exists) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", ...SECURITY_HEADERS }).end("Introuvable");
    return;
  }
  const ext = extname(target);
  const immutable = /-[A-Z0-9]{8}\.(js|css)$/.test(target) || target.includes(`${sep}fonts${sep}`);
  const headers = {
    "Content-Type": MIME[ext] ?? "application/octet-stream",
    "Cache-Control": ext === ".html" || target.endsWith("sw.js") || target.endsWith("manifest.json") ? "no-cache" : immutable ? "public, max-age=31536000, immutable" : "public, max-age=86400",
    ...SECURITY_HEADERS
  };
  const accept = String(req.headers["accept-encoding"] ?? "");
  const compressible = [".html", ".js", ".css", ".json", ".svg", ".txt", ".webmanifest"].includes(ext);
  if (compressible && accept.includes("gzip") && existsSync(`${target}.gz`)) {
    headers["Content-Encoding"] = "gzip";
    headers.Vary = "Accept-Encoding";
    target = `${target}.gz`;
  }
  headers["Content-Length"] = String(statSync(target).size);
  res.writeHead(200, headers);
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  createReadStream(target).pipe(res);
}
var server = createServer((req, res) => {
  if (req.url === "/healthz") {
    res.writeHead(200, { "Content-Type": "application/json" }).end(
      JSON.stringify({ ok: true, rooms: manager.roomCount, players: manager.playerCount, questions: bank.all.length })
    );
    return;
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405).end();
    return;
  }
  serveStatic(req, res);
});
var wss = new import_websocket_server.default({ noServer: true, maxPayload: MAX_MESSAGE_BYTES, perMessageDeflate: false });
var joinAttempts = /* @__PURE__ */ new Map();
function clientIp(req) {
  if (TRUST_PROXY) {
    const fwd = String(req.headers["x-forwarded-for"] ?? "").split(",")[0]?.trim();
    if (fwd) return fwd;
  }
  return req.socket.remoteAddress ?? "inconnue";
}
server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url ?? "/", "http://local");
  if (url.pathname !== "/ws") {
    socket.destroy();
    return;
  }
  const origin = req.headers.origin;
  if (ALLOWED.length > 0 && (!origin || !ALLOWED.includes(origin))) {
    socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
});
wss.on("connection", (ws, req) => {
  const id = randomUUID();
  const ip = clientIp(req);
  sockets.set(id, ws);
  manager.connect(id);
  ws.alive = true;
  let tokens = 40;
  let last = Date.now();
  ws.on("pong", () => ws.alive = true);
  ws.on("message", (data, isBinary) => {
    if (isBinary) return;
    const now = Date.now();
    tokens = Math.min(40, tokens + (now - last) / 1e3 * 10);
    last = now;
    if (tokens < 1) {
      ws.send(JSON.stringify({ t: "error", code: "rate_limited", message: "Trop d\u2019actions en peu de temps. Patientez un instant." }));
      return;
    }
    tokens -= 1;
    const msg = parseClientMessage(data.toString());
    if (!msg) {
      ws.send(JSON.stringify({ t: "error", code: "bad_message", message: "Message non reconnu." }));
      return;
    }
    if (msg.t === "join" || msg.t === "create") {
      const hits = (joinAttempts.get(ip) ?? []).filter((t) => now - t < 6e4);
      hits.push(now);
      joinAttempts.set(ip, hits);
      if (hits.length > JOIN_RATE) {
        ws.send(JSON.stringify({ t: "error", code: "rate_limited", message: "Trop de tentatives. R\xE9essayez dans une minute.", ref: msg.t }));
        return;
      }
    }
    try {
      manager.handle(id, msg);
    } catch (e) {
      log("erreur de traitement", { error: String(e), type: msg.t });
      ws.send(JSON.stringify({ t: "error", code: "invalid_action", message: "Action impossible \xE0 ce moment de la partie." }));
    }
  });
  ws.on("close", () => {
    sockets.delete(id);
    manager.disconnect(id);
  });
  ws.on("error", () => ws.close());
});
var heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.alive === false) {
      ws.terminate();
      continue;
    }
    ws.alive = false;
    ws.ping();
  }
  const now = Date.now();
  for (const [ip, hits] of joinAttempts) if (hits.every((t) => now - t > 6e4)) joinAttempts.delete(ip);
}, 2e4);
server.listen(PORT, HOST, () => {
  log("Magnitude pr\xEAt", { url: `http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`, static: STATIC_DIR, data: DATA_DIR, questions: bank.all.length });
});
function shutdown(signal) {
  log("arr\xEAt", { signal });
  clearInterval(tickTimer);
  clearInterval(saveTimer);
  clearInterval(heartbeat);
  save(true);
  for (const ws of wss.clients) ws.close(1012, "Red\xE9marrage du serveur");
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2e3).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
//# sourceMappingURL=server.js.map
