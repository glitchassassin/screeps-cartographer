'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};

function __values(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
}

function __read(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
}

function __spreadArray(to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
}

var cache$1 = new Map();
var expirationCache = new Map();
var HeapCache = {
    set: function (key, value, expiration) {
        cache$1.set(key, value);
        if (expiration !== undefined) {
            expirationCache.set(key, expiration);
        }
    },
    get: function (key) {
        return cache$1.get(key);
    },
    expires: function (key) {
        return expirationCache.get(key);
    },
    delete: function (key) {
        cache$1.delete(key);
    },
    with: function () {
        return HeapCache; // HeapCache never uses serializers
    },
    clean: function () {
        var e_1, _a;
        try {
            for (var expirationCache_1 = __values(expirationCache), expirationCache_1_1 = expirationCache_1.next(); !expirationCache_1_1.done; expirationCache_1_1 = expirationCache_1.next()) {
                var _b = __read(expirationCache_1_1.value, 2), key = _b[0], expires = _b[1];
                if (Game.time >= expires) {
                    HeapCache.delete(key);
                    expirationCache.delete(key);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (expirationCache_1_1 && !expirationCache_1_1.done && (_a = expirationCache_1.return)) _a.call(expirationCache_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
};

var config = {
    DEFAULT_MOVE_OPTS: {
        serializeMemory: true,
        reusePath: 5,
        visualizePathStyle: {
            fill: 'transparent',
            stroke: '#fff',
            lineStyle: 'dashed',
            strokeWidth: 0.15,
            opacity: 0.1
        },
        avoidCreeps: true,
        avoidObstacleStructures: true,
        roadCost: 1,
        plainCost: 2,
        swampCost: 10
    },
    MEMORY_CACHE_PATH: '_cg',
    MEMORY_CACHE_EXPIRATION_PATH: '_cge'
};

const MAX_DEPTH  = 53;       // Number.MAX_SAFE_INTEGER === (2^53 - 1)

const // #define
    SAFE_BITS           = 15,       // 15 of 16 UTF-16 bits
    UNPRINTABLE_OFFSET  = 48,       // ASCII '0'
    UPPER_BOUND         = 0xFFFF,   // Max 16 bit value
    POWERS_OF_2 = [1,
        2,                      4,                      8,                      16,
        32,                     64,                     128,                    256,
        512,                    1024,                   2048,                   4096,
        8192,                   16384,                  32768,                  65536,
        131072,                 262144,                 524288,                 1048576,
        2097152,                4194304,                8388608,                16777216,
        33554432,               67108864,               134217728,              268435456,
        536870912,              1073741824,             2147483648,             4294967296,
        8589934592,             17179869184,            34359738368,            68719476736,
        137438953472,           274877906944,           549755813888,           1099511627776,
        2199023255552,          4398046511104,          8796093022208,          17592186044416,
        35184372088832,         70368744177664,         140737488355328,        281474976710656,
        562949953421312,        1125899906842624,       2251799813685248,       4503599627370496,
        9007199254740992        // 2^53 max
    ];

/// Maximum representable by SAFE_BITS number + 1 
const UPPER_LIMIT = POWERS_OF_2[SAFE_BITS];

/// Set of lib errors
class RangeCodecError extends RangeError { constructor(msg) { super("[utf15][RangeError]: " + msg); } }
class TypeCodecError  extends TypeError  { constructor(msg) { super("[utf15][TypeError]: "  + msg); } }


/// Throws runtime exception in case of failed condition
const assert = (condition, Err, ...str) => {
    if(!condition) throw new Err(str.reduce((o,s) => (o+s+' '), '')); };

/// @returns normalized UTF CodePoint
const num_to_code_point = (x) => {
    x = +x;
    assert(x >= 0 && x < UPPER_LIMIT, RangeCodecError, 'x out of bounds:', x);
    x += UNPRINTABLE_OFFSET;
    return x;
};

/// @returns extracted unsigned value from CodePoint
const code_point_to_num = (x) => {
    x = +x;
    assert(x >= 0 && x <= UPPER_BOUND, RangeCodecError, 'x out of bounds:', x);
    x -= UNPRINTABLE_OFFSET;
    return x;
};

const check_cfg = (cfg) => {
    let fail = false;
    fail = fail || isNaN(cfg.meta)  || (cfg.meta  !== 0 && cfg.meta  !== 1);
    fail = fail || isNaN(cfg.array) || (cfg.array !== 0 && cfg.array !== 1);
    if(!fail) (()=>{
        const depth_is_array = Array.isArray(cfg.depth);
        fail = fail || (depth_is_array && !cfg.array);
        if(fail) return;
        
        const fail_depth = (x) => (isNaN(x) || x <= 0 || x > MAX_DEPTH);
        if(depth_is_array) {
            cfg.depth.forEach((d, idx) => {
                cfg.depth[idx] = +cfg.depth[idx];
                fail = fail || fail_depth(d);
            });
        } else {
            cfg.depth = +cfg.depth;
            fail = fail || fail_depth(cfg.depth);
        }
    })();
    
    if(fail) {
        let str = '[JSON.stringify() ERROR]';
        try { str = JSON.stringify(cfg); } finally {}
        assert(0, TypeCodecError, 'Codec config is invalid:', str);
    }
};

const serialize_meta = (str, meta) => {
    const depth = Array.isArray(meta.depth) ? 0 : meta.depth;
    return str + String.fromCodePoint(
        num_to_code_point(meta.array),
        num_to_code_point(depth));
};

const deserialize_meta = (str, meta, offset) => {
    offset = offset || 0;
    meta.array = code_point_to_num(str.codePointAt(offset    ));
    meta.depth = code_point_to_num(str.codePointAt(offset + 1));
    return [str.slice(offset + 2), 2];
};

function encode_array(res, values) {
    const depth_is_array = Array.isArray(this.depth);
    
    const fixed_depth = depth_is_array ? 0 : this.depth;
    const depths = depth_is_array ? this.depth : [];

    assert(fixed_depth || depths.length === values.length, TypeCodecError,
        'Wrong depths array length:', depths, values);

    if(!depth_is_array) // Save array length as meta
        res += String.fromCodePoint(num_to_code_point(values.length));

    let symbol_done = 0, symbol_acc = 0;

    // Cycle over values
    for(let i = 0, len = values.length; i < len; ++i) {

        // Current value and its bit depth
        const value = values[i], depth = fixed_depth || depths[i];

        // Cycle over value bits
        for(let value_done = 0; value_done < depth;) {

            const symbol_left   = SAFE_BITS - symbol_done;
            const value_left    = depth - value_done;
            const bits_to_write = Math.min(symbol_left, value_left);

            let mask = Math.floor(value / POWERS_OF_2[value_done]);
            mask %= POWERS_OF_2[bits_to_write];
            mask *= POWERS_OF_2[symbol_done];

            symbol_acc  += mask;
            value_done  += bits_to_write;
            symbol_done += bits_to_write;

            // Output symbol ready, push it
            if(symbol_done === SAFE_BITS) {
                res += String.fromCodePoint(num_to_code_point(symbol_acc));
                symbol_done = symbol_acc = 0;
            }
        }
    }

    if(symbol_done !== 0) // Last symbol left
        res += String.fromCodePoint(num_to_code_point(symbol_acc));
    
    return res;
}

function decode_array(str, meta) {
    assert(!this.meta || meta.depth > 0 || (meta.depth === 0 && Array.isArray(this.depth)),
        TypeCodecError, 'Array decoding error (check inputs and codec config)');

    meta.depth = meta.depth || this.depth;
    const depth_is_array = Array.isArray(meta.depth);

    let it = 0, i = 0;
    const length = depth_is_array ? meta.depth.length : code_point_to_num(str.codePointAt(it++));
    const fixed_depth = depth_is_array ? 0 : meta.depth;
    const depths = depth_is_array ? meta.depth : [];
    const values = new Array(length);
    
    let symbol_done = 0;
    let chunk = code_point_to_num(str.codePointAt(it++));

    // Cycle over values
    while(i < length) {

        const depth = fixed_depth || depths[i];
        let value_acc = 0, value_done = 0;

        // Cycle over value bits
        while(value_done < depth) {
            const symbol_left   = SAFE_BITS - symbol_done;
            const value_left    = depth - value_done;
            const bits_to_read  = Math.min(symbol_left, value_left);

            let data = Math.floor(chunk / POWERS_OF_2[symbol_done]);
            data %= POWERS_OF_2[bits_to_read];
            data *= POWERS_OF_2[value_done];

            value_acc   += data;
            value_done  += bits_to_read;
            symbol_done += bits_to_read;

            // The whole symbol has been processed, move to next
            if(symbol_done === SAFE_BITS) {
                // It was the last code unit, break without iterators changing
                if((i + 1) === length && value_done === depth) break;
                chunk = code_point_to_num(str.codePointAt(it++));
                symbol_done = 0;
            }
        }

        if(value_done > 0)
            values[i++] = value_acc;
    }

    return [values, it];
}

class Codec {
    
    /// Constructs codec by config or another serialized codec (this <=> cfg)
    constructor(cfg) {
        cfg = cfg || {};
        this.meta   = +(!!cfg.meta);
        this.array  = +(!!cfg.array);
        this.depth  = cfg.depth || MAX_DEPTH;
        check_cfg(this);
    }
    
    /// @param arg -- single value or array of values to be encoded
    /// @returns encoded string
    encode(arg) {
        assert((+Array.isArray(arg) | +(!!(arg).BYTES_PER_ELEMENT)) ^ !this.array, TypeCodecError,
            'Incompatible codec (array <=> single value), arg =', arg);
        
        let res = '';

        if(this.meta) // Save meta info
            res = serialize_meta(res, this);
        
        if(this.array) {
            // Effectively packs array of numbers
            res = encode_array.call(this, res, arg);
        } else {
            // Packs single value, inline
            let x = +arg % POWERS_OF_2[this.depth];
            const len = Math.ceil(this.depth / SAFE_BITS);
            for(let i = 0; i < len; ++i) {
                const cp = num_to_code_point(x % UPPER_LIMIT);
                res += String.fromCodePoint(cp);
                x = Math.floor(x / UPPER_LIMIT);
            }
        }
        
        return res;
    }

    /// @param str -- string to be decoded
    /// @param length_out -- output, read length will be saved as "length_out.length" (optional)
    /// @returns decoded single value or array of values
    decode(str, length_out) {
        let meta = null;    // codec config
        let length = 0;     // number of read code units
        
        if(this.meta) {
            // Meta has been saved to str, restore
            [str, length] = deserialize_meta(str, (meta = {}));
        } else {
            // Otherwise, use this config
            meta = this;
        }

        assert(meta.array ^ !this.array, TypeCodecError,
            'Incompatible codec (array <=> single value), str =', str);
        
        if(this.array) { // output is array of integers
            const res = decode_array.call(this, str, meta);
            !!length_out && (length_out.length = length + res[1]);
            return res[0];
        }

        let acc = 0, pow = 0;
        const len = Math.ceil(meta.depth / SAFE_BITS);
        for(let i = 0; i < len; ++i) {
            const x = code_point_to_num(str.codePointAt(i));
            acc += x * POWERS_OF_2[pow];
            pow += SAFE_BITS;
        }

        !!length_out && (length_out.length = length + len);
        return acc;
    }
}

var numberCodec = new Codec({ array: false });
var NumberSerializer = {
    serialize: function (target) {
        if (target === undefined)
            return undefined;
        return numberCodec.encode(target);
    },
    deserialize: function (target) {
        if (target === undefined)
            return undefined;
        return numberCodec.decode(target);
    }
};

var cache = new Map();
function cachedMap(strategy, serializer) {
    var _a, _b;
    var strategyMap = (_a = cache.get(strategy)) !== null && _a !== void 0 ? _a : new Map();
    cache.set(strategy, strategyMap);
    var serializerMap = (_b = strategyMap.get(serializer)) !== null && _b !== void 0 ? _b : new Map();
    strategyMap.set(serializer, serializerMap);
    return serializerMap;
}
var withSerializer = function (strategy, serializer) { return (__assign(__assign({}, strategy), { 
    // override certain methods for serialization
    get: function (key) {
        var _a;
        var map = cachedMap(strategy, serializer);
        var serializedValue = strategy.get(key);
        if (serializedValue === undefined)
            map.delete(key); // make sure cache isn't expired
        var value = (_a = map.get(key)) !== null && _a !== void 0 ? _a : serializer.deserialize(serializedValue);
        if (value !== undefined)
            map.set(key, value);
        return value;
    }, set: function (key, value) {
        var v = serializer.serialize(value);
        var map = cachedMap(strategy, serializer);
        if (v) {
            strategy.set(key, v);
            map.set(key, value);
        }
        else {
            strategy.delete(key);
            map.delete(key);
        }
    }, delete: function (key) {
        strategy.delete(key);
        var map = cachedMap(strategy, serializer);
        map.delete(key);
    }, with: function (serializer) {
        return withSerializer(strategy, serializer);
    } })); };

function memoryCache() {
    var _a;
    var _b;
    (_a = Memory[_b = config.MEMORY_CACHE_PATH]) !== null && _a !== void 0 ? _a : (Memory[_b] = {});
    return Memory[config.MEMORY_CACHE_PATH];
}
function memoryExpirationCache() {
    var _a;
    var _b;
    (_a = Memory[_b = config.MEMORY_CACHE_EXPIRATION_PATH]) !== null && _a !== void 0 ? _a : (Memory[_b] = {});
    return Memory[config.MEMORY_CACHE_EXPIRATION_PATH];
}
var MemoryCache = {
    set: function (key, value, expiration) {
        memoryCache()[key] = value;
        if (expiration !== undefined) {
            var expires = NumberSerializer.serialize(expiration);
            if (expires)
                memoryExpirationCache()[key] = expires;
        }
    },
    get: function (key) {
        return memoryCache()[key];
    },
    expires: function (key) {
        return NumberSerializer.deserialize(memoryExpirationCache()[key]);
    },
    delete: function (key) {
        delete memoryCache()[key];
    },
    with: function (serializer) {
        return withSerializer(MemoryCache, serializer);
    },
    clean: function () {
        var expirationCache = memoryExpirationCache();
        for (var key in expirationCache) {
            var expires = NumberSerializer.deserialize(expirationCache[key]);
            if (expires !== undefined && Game.time >= expires) {
                MemoryCache.delete(key);
                delete expirationCache[key];
            }
        }
    }
};

/**
 * screeps-packrat
 * ---------------
 * Lightning-fast and memory-efficient serialization of Screeps IDs, Coords, and RoomPositions
 * Code written by Muon as part of Overmind Screeps AI. Feel free to adapt as desired.
 * Package repository: https://github.com/bencbartlett/screeps-packrat
 *
 * Plain JS version is available in the #share-thy-code channel on the Screeps Slack.
 *
 * To use: import desired functions from module, or import entire module on main and use functions from global.
 * To benchmark: import tests file, PackratTests.run()
 *
 * Exported functions (available on global):
 *
 * +--------------------------+------------------------------------------------+-----------------+--------------------+
 * |         function         |                  description                   | execution time* | memory reduction** |
 * +--------------------------+------------------------------------------------+-----------------+--------------------+
 * | packId                   | packs a game object id into 6 chars            | 500ns           | -75%               |
 * | unpackId                 | unpacks 6 chars into original format           | 1.3us           |                    |
 * | packIdList               | packs a list of ids into a single string       | 500ns/id        | -81%               |
 * | unpackIdList             | unpacks a string into a list of ids            | 1.2us/id        |                    |
 * | packPos                  | packs a room position into 2 chars             | 150ns           | -90%               |
 * | unpackPos                | unpacks 2 chars into a room position           | 600ns           |                    |
 * | packPosList              | packs a list of room positions into a string   | 150ns/pos       | -95%               |
 * | unpackPosList            | unpacks a string into a list of room positions | 1.5us/pos       |                    |
 * | packCoord                | packs a coord (e.g. {x:25,y:25}) as a string   | 150ns           | -80%               |
 * | unpackCoord              | unpacks a string into a coord                  | 60-150ns        |                    |
 * | packCoordList            | packs a list of coords as a string             | 120ns/coord     | -94%               |
 * | unpackCoordList          | unpacks a string into a list of coords         | 100ns/coord     |                    |
 * | unpackCoordAsPos         | unpacks string + room name into a pos          | 500ns           |                    |
 * | unpackCoordListAsPosList | unpacks string + room name into a list of pos  | 500ns/coord     |                    |
 * +--------------------------+------------------------------------------------+-----------------+--------------------+
 *
 *  * Execution time measured on shard2 public servers and may vary on different machines or shards.
 * ** Memory reduction for list functions is the asymptotic limit of lists containing many entries. Lower reductions
 *    can be expected for smaller lists.
 *
 */
global.PERMACACHE = {}; // Create a permanent cache for immutable items such as room names
/**
 * Convert a standard 24-character hex id in screeps to a compressed UTF-16 encoded string of length 6.
 *
 * Benchmarking: average of 500ns to execute on shard2 public server, reduce stringified size by 75%
 */
function packId(id) {
    return (String.fromCharCode(parseInt(id.substr(0, 4), 16)) +
        String.fromCharCode(parseInt(id.substr(4, 4), 16)) +
        String.fromCharCode(parseInt(id.substr(8, 4), 16)) +
        String.fromCharCode(parseInt(id.substr(12, 4), 16)) +
        String.fromCharCode(parseInt(id.substr(16, 4), 16)) +
        String.fromCharCode(parseInt(id.substr(20, 4), 16)));
}
/**
 * Convert a compressed six-character UTF-encoded id back into the original 24-character format.
 *
 * Benchmarking: average of 1.3us to execute on shard2 public server
 */
function unpackId(packedId) {
    var id = '';
    var current;
    for (var i = 0; i < 6; ++i) {
        current = packedId.charCodeAt(i);
        id += (current >>> 8).toString(16).padStart(2, '0'); // String.padStart() requires es2017+ target
        id += (current & 0xff).toString(16).padStart(2, '0');
    }
    return id;
}
/**
 * Packs a list of ids as a utf-16 string. This is better than having a list of packed coords, as it avoids
 * extra commas and "" when memroy gets stringified.
 *
 * Benchmarking: average of 500ns per id to execute on shard2 public server, reduce stringified size by 81%
 */
function packIdList(ids) {
    var str = '';
    for (var i = 0; i < ids.length; ++i) {
        str += packId(ids[i]);
    }
    return str;
}
/**
 * Unpacks a list of ids stored as a utf-16 string.
 *
 * Benchmarking: average of 1.2us per id to execute on shard2 public server.
 */
function unpackIdList(packedIds) {
    var ids = [];
    for (var i = 0; i < packedIds.length; i += 6) {
        ids.push(unpackId(packedIds.substr(i, 6)));
    }
    return ids;
}
/**
 * Packs a coord as a single utf-16 character. The seemingly strange choice of encoding value ((x << 6) | y) + 65 was
 * chosen to be fast to compute (x << 6 | y is significantly faster than 50 * x + y) and to avoid control characters,
 * as "A" starts at character code 65.
 *
 * Benchmarking: average of 150ns to execute on shard2 public server, reduce stringified size by 80%
 */
function packCoord(coord) {
    return String.fromCharCode(((coord.x << 6) | coord.y) + 65);
}
/**
 * Unpacks a coord stored as a single utf-16 character
 *
 * Benchmarking: average of 60ns-100ns to execute on shard2 public server
 */
function unpackCoord(char) {
    var xShiftedSixOrY = char.charCodeAt(0) - 65;
    return {
        x: (xShiftedSixOrY & 4032) >>> 6,
        y: xShiftedSixOrY & 63
    };
}
/**
 * Unpacks a coordinate and creates a RoomPosition object from a specified roomName
 *
 * Benchmarking: average of 500ns to execute on shard2 public server
 */
function unpackCoordAsPos(packedCoord, roomName) {
    var coord = unpackCoord(packedCoord);
    return new RoomPosition(coord.x, coord.y, roomName);
}
/**
 * Packs a list of coords as a utf-16 string. This is better than having a list of packed coords, as it avoids
 * extra commas and "" when memroy gets stringified.
 *
 * Benchmarking: average of 120ns per coord to execute on shard2 public server, reduce stringified size by 94%
 */
function packCoordList(coords) {
    var str = '';
    for (var i = 0; i < coords.length; ++i) {
        str += String.fromCharCode(((coords[i].x << 6) | coords[i].y) + 65);
    }
    return str;
}
/**
 * Unpacks a list of coords stored as a utf-16 string
 *
 * Benchmarking: average of 100ns per coord to execute on shard2 public server
 */
function unpackCoordList(chars) {
    var coords = [];
    var xShiftedSixOrY;
    for (var i = 0; i < chars.length; ++i) {
        xShiftedSixOrY = chars.charCodeAt(i) - 65;
        coords.push({
            x: (xShiftedSixOrY & 4032) >>> 6,
            y: xShiftedSixOrY & 63
        });
    }
    return coords;
}
/**
 * Unpacks a list of coordinates and creates a list of RoomPositions from a specified roomName
 *
 * Benchmarking: average of 500ns per coord to execute on shard2 public server
 */
function unpackCoordListAsPosList(packedCoords, roomName) {
    var positions = [];
    var coord;
    for (var i = 0; i < packedCoords.length; ++i) {
        // Each coord is saved as a single character; unpack each and insert the room name to get the positions list
        coord = unpackCoord(packedCoords[i]);
        positions.push(new RoomPosition(coord.x, coord.y, roomName));
    }
    return positions;
}
PERMACACHE._packedRoomNames = PERMACACHE._packedRoomNames || {};
PERMACACHE._unpackedRoomNames = PERMACACHE._unpackedRoomNames || {};
/**
 * Packs a roomName as a single utf-16 character. Character values are stored on permacache.
 */
function packRoomName(roomName) {
    if (PERMACACHE._packedRoomNames[roomName] === undefined) {
        var coordinateRegex = /(E|W)(\d+)(N|S)(\d+)/g;
        var match = coordinateRegex.exec(roomName);
        var xDir = match[1];
        var x = Number(match[2]);
        var yDir = match[3];
        var y = Number(match[4]);
        var quadrant = void 0;
        if (xDir == 'W') {
            if (yDir == 'N') {
                quadrant = 0;
            }
            else {
                quadrant = 1;
            }
        }
        else {
            if (yDir == 'N') {
                quadrant = 2;
            }
            else {
                quadrant = 3;
            }
        }
        // y is 6 bits, x is 6 bits, quadrant is 2 bits
        var num = ((quadrant << 12) | (x << 6) | y) + 65;
        var char = String.fromCharCode(num);
        PERMACACHE._packedRoomNames[roomName] = char;
        PERMACACHE._unpackedRoomNames[char] = roomName;
    }
    return PERMACACHE._packedRoomNames[roomName];
}
/**
 * Packs a roomName as a single utf-16 character. Character values are stored on permacache.
 */
function unpackRoomName(char) {
    if (PERMACACHE._unpackedRoomNames[char] === undefined) {
        var num = char.charCodeAt(0) - 65;
        var _a = {
            q: (num & 12351) >>> 12,
            x: (num & 4032) >>> 6,
            y: num & 63
        }, q = _a.q, x = _a.x, y = _a.y;
        var roomName = void 0;
        switch (q) {
            case 0:
                roomName = 'W' + x + 'N' + y;
                break;
            case 1:
                roomName = 'W' + x + 'S' + y;
                break;
            case 2:
                roomName = 'E' + x + 'N' + y;
                break;
            case 3:
                roomName = 'E' + x + 'S' + y;
                break;
            default:
                roomName = 'ERROR';
        }
        PERMACACHE._packedRoomNames[roomName] = char;
        PERMACACHE._unpackedRoomNames[char] = roomName;
    }
    return PERMACACHE._unpackedRoomNames[char];
}
/**
 * Packs a RoomPosition as a pair utf-16 characters. The seemingly strange choice of encoding value ((x << 6) | y) + 65
 * was chosen to be fast to compute (x << 6 | y is significantly faster than 50 * x + y) and to avoid control
 * characters, as "A" starts at character code 65.
 *
 * Benchmarking: average of 150ns to execute on shard2 public server, reduce stringified size by 90%
 */
function packPos(pos) {
    return packCoord(pos) + packRoomName(pos.roomName);
}
/**
 * Unpacks a RoomPosition stored as a pair of utf-16 characters.
 *
 * Benchmarking: average of 600ns to execute on shard2 public server.
 */
function unpackPos(chars) {
    var _a = unpackCoord(chars[0]), x = _a.x, y = _a.y;
    return new RoomPosition(x, y, unpackRoomName(chars[1]));
}
/**
 * Packs a list of RoomPositions as a utf-16 string. This is better than having a list of packed RoomPositions, as it
 * avoids extra commas and "" when memroy gets stringified.
 *
 * Benchmarking: average of 150ns per position to execute on shard2 public server, reduce stringified size by 95%
 */
function packPosList(posList) {
    var str = '';
    for (var i = 0; i < posList.length; ++i) {
        str += packPos(posList[i]);
    }
    return str;
}
/**
 * Unpacks a list of RoomPositions stored as a utf-16 string.
 *
 * Benchmarking: average of 1.5us per position to execute on shard2 public server.
 */
function unpackPosList(chars) {
    var posList = [];
    for (var i = 0; i < chars.length; i += 2) {
        posList.push(unpackPos(chars.substr(i, 2)));
    }
    return posList;
}
// Useful to register these functions on global to use with console
global.packId = packId;
global.unpackId = unpackId;
global.packIdList = packIdList;
global.unpackIdList = unpackIdList;
global.packCoord = packCoord;
global.unpackCoord = unpackCoord;
global.unpackCoordAsPos = unpackCoordAsPos;
global.packCoordList = packCoordList;
global.unpackCoordList = unpackCoordList;
global.unpackCoordListAsPosList = unpackCoordListAsPosList;
global.packPos = packPos;
global.unpackPos = unpackPos;
global.packPosList = packPosList;
global.unpackPosList = unpackPosList;

/**
 * Note: this binds range at 32768, which should be plenty for MoveTarget purposes
 */
var rangeCodec = new Codec({ array: false, depth: 15 });
var MoveTargetSerializer = {
    serialize: function (target) {
        if (target === undefined)
            return undefined;
        return "".concat(packPos(target.pos)).concat(rangeCodec.encode(target.range));
    },
    deserialize: function (target) {
        if (target === undefined)
            return undefined;
        return {
            pos: unpackPos(target.slice(0, 2)),
            range: rangeCodec.decode(target.slice(2))
        };
    }
};
/**
 * Move target serializes into three characters: two for position and one for range
 */
var MoveTargetListSerializer = {
    serialize: function (target) {
        if (target === undefined)
            return undefined;
        return target.map(function (t) { return MoveTargetSerializer.serialize(t); }).join('');
    },
    deserialize: function (target) {
        if (target === undefined)
            return undefined;
        var targets = [];
        for (var i = 0; i < target.length; i += 3) {
            targets.push(MoveTargetSerializer.deserialize(target.slice(i, 3)));
        }
        return targets;
    }
};

var PositionSerializer = {
    serialize: function (pos) {
        if (pos === undefined)
            return undefined;
        return packPos(pos);
    },
    deserialize: function (pos) {
        if (pos === undefined)
            return undefined;
        return unpackPos(pos);
    }
};
var PositionListSerializer = {
    serialize: function (pos) {
        if (pos === undefined)
            return undefined;
        return packPosList(pos);
    },
    deserialize: function (pos) {
        if (pos === undefined)
            return undefined;
        return unpackPosList(pos);
    }
};
var CoordSerializer = {
    serialize: function (pos) {
        if (pos === undefined)
            return undefined;
        return packCoord(pos);
    },
    deserialize: function (pos) {
        if (pos === undefined)
            return undefined;
        return unpackCoord(pos);
    }
};
var CoordListSerializer = {
    serialize: function (pos) {
        if (pos === undefined)
            return undefined;
        return packCoordList(pos);
    },
    deserialize: function (pos) {
        if (pos === undefined)
            return undefined;
        return unpackCoordList(pos);
    }
};

function cleanAllCaches() {
    MemoryCache.clean();
    HeapCache.clean();
}

var mutateCostMatrix = function (cm, room, opts) {
    var _a, _b;
    if (opts.avoidCreeps) {
        (_a = Game.rooms[room]) === null || _a === void 0 ? void 0 : _a.find(FIND_CREEPS).forEach(function (c) { return cm.set(c.pos.x, c.pos.y, 255); });
    }
    if (opts.avoidObstacleStructures || opts.roadCost) {
        (_b = Game.rooms[room]) === null || _b === void 0 ? void 0 : _b.find(FIND_STRUCTURES).forEach(function (s) {
            if (opts.avoidObstacleStructures) {
                if (OBSTACLE_OBJECT_TYPES.includes(s.structureType)) {
                    cm.set(s.pos.x, s.pos.y, 255);
                }
            }
            if (opts.roadCost) {
                if (s instanceof StructureRoad && cm.get(s.pos.x, s.pos.y) !== 255) {
                    cm.set(s.pos.x, s.pos.y, opts.roadCost);
                }
            }
        });
    }
    return cm;
};

/**
 * 15 bits will be enough for three hex characters
 */
var codec = new Codec({ array: false, depth: 15 });
/**
 * `id` should be a hex string
 */
var objectIdKey = function (id, key) {
    var _a;
    if (!id.length)
        throw new Error('Empty id');
    var paddedId = id;
    // pad id if needed
    if (paddedId.length % 3 !== 0) {
        paddedId = paddedId.padStart(Math.ceil(paddedId.length / 3) * 3, '0');
    }
    // split and compress id
    var compressed = '';
    for (var i = 0; i < paddedId.length; i += 3) {
        compressed += codec.encode(parseInt(paddedId.slice(i, i + 3), 16));
    }
    return (_a = compressed + key) !== null && _a !== void 0 ? _a : '';
};

var creepKey = function (creep, key) { return objectIdKey(creep.id, key); };

var profileCache = new Map();
var profile = function (key, callback) {
    var _a;
    var list = (_a = profileCache.get(key)) !== null && _a !== void 0 ? _a : [];
    profileCache.set(key, list);
    var start = Game.cpu.getUsed();
    var result = callback();
    list.push(Math.max(0, Game.cpu.getUsed() - start));
    return result;
};
var profileReport = function () {
    var e_1, _a;
    console.log();
    var maxLength = Math.max.apply(Math, __spreadArray(['Profiling'.length - 2], __read(__spreadArray([], __read(profileCache.keys()), false).map(function (key) { return key.length; })), false));
    var header = " ".concat(Game.time.toFixed(0).padEnd(maxLength + 2), " | Profiling Report");
    console.log(header);
    console.log(''.padEnd(header.length, '-'));
    console.log(' Profiling'.padEnd(maxLength + 3), '| Count | Avg CPU');
    try {
        for (var profileCache_1 = __values(profileCache), profileCache_1_1 = profileCache_1.next(); !profileCache_1_1.done; profileCache_1_1 = profileCache_1.next()) {
            var _b = __read(profileCache_1_1.value, 2), key = _b[0], values = _b[1];
            console.log(' -', key.padEnd(maxLength), '|', values.length.toFixed(0).padStart(5, ' '), '|', (values.reduce(function (a, b) { return a + b; }, 0) / values.length).toFixed(3));
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (profileCache_1_1 && !profileCache_1_1.done && (_a = profileCache_1.return)) _a.call(profileCache_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
};

var keys = {
    CACHED_PATH: '_cp',
    CACHED_PATH_EXPIRES: '_ce',
    CACHED_PATH_TARGETS: '_ct'
};
function clearCachedPath(creep, cache) {
    cache.delete(creepKey(creep, keys.CACHED_PATH));
    cache.delete(creepKey(creep, keys.CACHED_PATH_TARGETS));
}
/**
 *
 * @param creep
 * @param targets
 * @param opts
 */
var moveTo = function (creep, targets, opts) {
    // map defaults onto opts
    var actualOpts = __assign(__assign({}, config.DEFAULT_MOVE_OPTS), opts);
    // select cache for path
    var cache = actualOpts.serializeMemory ? MemoryCache : HeapCache;
    // convert target from whatever format to MoveTarget[]
    var normalizedTargets = [];
    if (Array.isArray(targets)) {
        if ('pos' in targets[0]) {
            normalizedTargets.push.apply(normalizedTargets, __spreadArray([], __read(targets), false));
        }
        else {
            normalizedTargets.push.apply(normalizedTargets, __spreadArray([], __read(targets.map(function (pos) { return ({ pos: pos, range: 1 }); })), false));
        }
    }
    else if ('pos' in targets) {
        if ('range' in targets) {
            normalizedTargets.push(targets);
        }
        else {
            normalizedTargets.push({ pos: targets.pos, range: 1 });
        }
    }
    else {
        normalizedTargets.push({ pos: targets, range: 1 });
    }
    var complete = normalizedTargets.some(function (_a) {
        var pos = _a.pos, range = _a.range;
        return pos.inRangeTo(creep.pos, range);
    });
    // Check if creep is already at target
    if (complete) {
        return OK;
    }
    // delete cached path if targets don't match
    var targetsDontMatch = MoveTargetListSerializer.serialize(normalizedTargets) !== cache.get(creepKey(creep, keys.CACHED_PATH_TARGETS));
    if (targetsDontMatch) {
        clearCachedPath(creep, cache);
    }
    // Check if matching cached path exists
    var cachedPath = profile('deserializing path', function () {
        return cache.with(PositionListSerializer).get(creepKey(creep, keys.CACHED_PATH));
    });
    // if not, generate a new one
    if (!cachedPath) {
        cachedPath = profile('generating path', function () { return generateAndCachePath(creep, normalizedTargets, actualOpts, cache); });
        if (cachedPath && !(Array.isArray(targets) || 'range' in targets)) {
            // targets is a RoomPosition or _HasRoomPosition; add the last step back to the path
            var lastStep = 'pos' in targets ? targets.pos : targets;
            cachedPath.push(lastStep);
        }
    }
    if (!cachedPath)
        return ERR_NO_PATH;
    // remove steps up to the creep's current position and recache with same expiration
    cachedPath.splice(0, cachedPath.findIndex(function (pos) { return pos.isEqualTo(creep.pos); }) + 1);
    cache
        .with(PositionListSerializer)
        .set(creepKey(creep, keys.CACHED_PATH), cachedPath, cache.expires(creepKey(creep, keys.CACHED_PATH)));
    // visualize path
    if (actualOpts.visualizePathStyle) {
        creep.room.visual.poly(cachedPath, actualOpts.visualizePathStyle);
    }
    return profile('moving by path', function () { return creep.move(creep.pos.getDirectionTo(cachedPath[0])); });
};
function generateAndCachePath(creep, targets, opts, cache) {
    // key to confirm if current path is the same as saved path
    var targetKey = MoveTargetListSerializer.serialize(targets);
    if (!targetKey)
        return undefined;
    // generate path
    var result = PathFinder.search(creep.pos, targets, __assign(__assign({}, opts), { roomCallback: function (room) {
            var _a;
            var cm = (_a = opts.roomCallback) === null || _a === void 0 ? void 0 : _a.call(opts, room);
            if (cm === false)
                return cm;
            cm = new PathFinder.CostMatrix();
            return mutateCostMatrix(cm.clone(), room, {
                avoidCreeps: opts.avoidCreeps,
                avoidObstacleStructures: opts.avoidObstacleStructures,
                roadCost: opts.roadCost
            });
        } }));
    if (!result.path.length)
        return undefined;
    // path generation successful - cache results
    var expiration = opts.reusePath ? Game.time + opts.reusePath + 1 : undefined;
    cache.with(PositionListSerializer).set(creepKey(creep, keys.CACHED_PATH), result.path, expiration);
    cache.set(creepKey(creep, keys.CACHED_PATH_TARGETS), targetKey, expiration);
    return result.path;
}

function preTick() {
    cleanAllCaches();
}

var _a;
var runTestScenarios = function () {
    preTick();
    for (var room in Game.rooms) {
        spawn(room);
    }
    for (var name in Game.creeps) {
        var creep = Game.creeps[name];
        roles[creep.memory.role](creep);
    }
    visualizeIntel();
    profileReport();
};
(_a = Memory.rooms) !== null && _a !== void 0 ? _a : (Memory.rooms = {});
var spawn = function (room) {
    var _a = __read(Game.rooms[room].find(FIND_MY_SPAWNS).filter(function (s) { return !s.spawning; }), 1), spawn = _a[0];
    if (!spawn)
        return;
    var creeps = Object.keys(Game.creeps).filter(function (name) { return name.startsWith(room); });
    if (creeps.filter(function (name) { return name.includes('WORKER'); }).length < 6) {
        // spawn a worker
        spawn.spawnCreep([WORK, MOVE, MOVE, CARRY], "".concat(room, "_WORKER_").concat(Game.time % 10000), {
            memory: { room: room, role: 'worker', useCartographer: Boolean(Math.round(Math.random())) }
        });
    }
    else if (creeps.filter(function (name) { return name.includes('SCOUT'); }).length < 6) {
        // spawn a scout
        spawn.spawnCreep([MOVE], "".concat(room, "_SCOUT_").concat(Game.time % 10000), {
            memory: { room: room, role: 'scout' }
        });
    }
};
var roles = {
    worker: function (creep) {
        var _a;
        if (!creep.memory.state || creep.memory.state === 'HARVEST') {
            creep.memory.state = 'HARVEST';
            if (!creep.memory.harvestSource) {
                var sources = Game.rooms[creep.memory.room].find(FIND_SOURCES_ACTIVE);
                var target = sources[Math.floor(Math.random() * sources.length)];
                if (!target && creep.store.getUsedCapacity(RESOURCE_ENERGY)) {
                    creep.memory.state = 'DEPOSIT';
                    return;
                }
                creep.memory.harvestSource = target === null || target === void 0 ? void 0 : target.id;
            }
            if (!creep.memory.harvestSource)
                return;
            var source_1 = Game.getObjectById(creep.memory.harvestSource);
            if (!source_1)
                return;
            if (creep.harvest(source_1) === ERR_NOT_IN_RANGE) {
                if (creep.memory.useCartographer) {
                    profile('cg_perf', function () { return moveTo(creep, source_1); });
                }
                else {
                    profile('mt_perf', function () { return creep.moveTo(source_1, { visualizePathStyle: { stroke: 'red' } }); });
                }
            }
            else {
                if (creep.store.getFreeCapacity() === 0) {
                    delete creep.memory.harvestSource;
                    var ttd = (_a = Game.rooms[creep.memory.room].controller) === null || _a === void 0 ? void 0 : _a.ticksToDowngrade;
                    if (ttd && ttd < 3000) {
                        creep.memory.state = 'UPGRADE';
                    }
                    else {
                        creep.memory.state = 'DEPOSIT';
                    }
                }
            }
        }
        if (creep.memory.state === 'UPGRADE') {
            var controller_1 = Game.rooms[creep.memory.room].controller;
            if (!controller_1) {
                creep.memory.state = 'DEPOSIT';
                return;
            }
            if (creep.upgradeController(controller_1) === ERR_NOT_IN_RANGE) {
                if (creep.memory.useCartographer) {
                    profile('cg_perf', function () { return moveTo(creep, controller_1); });
                }
                else {
                    profile('mt_perf', function () { return creep.moveTo(controller_1, { visualizePathStyle: { stroke: 'red' } }); });
                }
            }
            else {
                if (creep.store.getUsedCapacity() === 0) {
                    creep.memory.state = 'HARVEST';
                }
            }
        }
        if (creep.memory.state === 'DEPOSIT') {
            var _b = __read(Game.rooms[creep.memory.room].find(FIND_MY_SPAWNS), 1), spawn_1 = _b[0];
            if (!spawn_1 || spawn_1.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
                creep.memory.state = 'UPGRADE';
                return;
            }
            if (creep.transfer(spawn_1, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                if (creep.memory.useCartographer) {
                    profile('cg_perf', function () { return moveTo(creep, spawn_1); });
                }
                else {
                    profile('mt_perf', function () { return creep.moveTo(spawn_1, { visualizePathStyle: { stroke: 'red' } }); });
                }
            }
            else {
                if (creep.store.getUsedCapacity() === 0) {
                    creep.memory.state = 'HARVEST';
                }
            }
        }
    },
    scout: function (creep) {
        var _a;
        // Store intel
        if (!((_a = Memory.rooms[creep.pos.roomName]) === null || _a === void 0 ? void 0 : _a.visited)) {
            Memory.rooms[creep.pos.roomName] = {
                visited: true,
                sources: packPosList(creep.room.find(FIND_SOURCES).map(function (s) { return s.pos; })),
                controller: creep.room.controller ? packPos(creep.room.controller.pos) : undefined,
                exits: packPosList(creep.room.find(FIND_EXIT))
            };
            Object.values(Game.map.describeExits(creep.pos.roomName)).forEach(function (adjacentRoom) { var _a; var _b; return ((_a = (_b = Memory.rooms)[adjacentRoom]) !== null && _a !== void 0 ? _a : (_b[adjacentRoom] = {})); });
        }
        // If we reached the previous target, pick a new one
        if (creep.pos.roomName === creep.memory.scoutTarget) {
            delete creep.memory.scoutTarget;
            var _loop_1 = function (room) {
                if (!Memory.rooms[room].visited && !Object.values(Game.creeps).some(function (c) { return c.memory.scoutTarget === room; })) {
                    creep.memory.scoutTarget = room;
                    return "break";
                }
            };
            for (var room in Memory.rooms) {
                var state_1 = _loop_1(room);
                if (state_1 === "break")
                    break;
            }
        }
        if (!creep.memory.scoutTarget)
            return; // no more rooms to scout
        moveTo(creep, { pos: new RoomPosition(25, 25, creep.memory.scoutTarget), range: 20 });
    }
};
var visualizeIntel = function () {
    for (var room in Memory.rooms) {
        if (Memory.rooms[room].visited) {
            Game.map.visual.text('✓', new RoomPosition(25, 25, room));
        }
        else {
            Game.map.visual.text('...', new RoomPosition(25, 25, room));
        }
    }
};

var loop = function () {
    runTestScenarios();
};

exports.CoordListSerializer = CoordListSerializer;
exports.CoordSerializer = CoordSerializer;
exports.HeapCache = HeapCache;
exports.MemoryCache = MemoryCache;
exports.MoveTargetListSerializer = MoveTargetListSerializer;
exports.MoveTargetSerializer = MoveTargetSerializer;
exports.NumberSerializer = NumberSerializer;
exports.PositionListSerializer = PositionListSerializer;
exports.PositionSerializer = PositionSerializer;
exports.cleanAllCaches = cleanAllCaches;
exports.loop = loop;
exports.moveTo = moveTo;
exports.preTick = preTick;
//# sourceMappingURL=main.js.map
