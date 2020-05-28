(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.multiselect_ipe = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var multiselect = require('./multiselect.js');
function push_n(arr, v, n) { for (var i=0; i<n; ++i) arr.push(v); }
  function array_lower_bound(array, value) {
    var first = 0, last = array.length; // last is past-the-end
    var i, count, step;
    count = last - first;
  
    while (count > 0) {
      i = first; 
      step = Math.floor(count / 2); 
      i += step;
      if (array[i] < value) {
        first = ++i; 
        count -= step + 1; 
      } else {
        count = step;
      }
    }
    return first;
  }
  function array_upper_bound(array, value) {
    var first = 0, last = array.length;
    var i, count, step;
    count = last - first;
 
    while (count > 0) {
      i = first; 
      step = Math.floor(count / 2);
      i += step;
      if (!(value < array[i])) {
        first = ++i;
        count -= step + 1;
      } else {
        count = step;
      }
    }
    return first;
  }
  function ipe_encode(arr) {
    var s = false, seq = [];
    var i;
    for (i = 0; i < arr.length; ++i) {
      if (arr[i] !== s) { seq.push(i); s = !s; }
    }
    if (s) seq.push(i);
    return seq;
  }
  function ipe_decode(seq) {
    var arr = []; 
    var s = false;
    var pind = 0;
    for (var i = 0; i < seq.length; ++i) {
      push_n(arr, s, seq[i] - pind);
      pind = seq[i];
      s = !s;
    }
    return arr;
  }
  function ipe_encode_range(b, e) { return [b, e]; }
  function ipe_at(seq, i) {
    var j = array_upper_bound(seq, i);
    return !(j%2 === 0);
  }
  function ipe_mask(mask, op, seq) {

    var op2 = (mv, av) => mv ? op(av) : av;
    var s = false, sm = false, sa = false;

    var arr = [];
    var a = 0, m = 0, p;

    while (m < mask.length && a < seq.length) {
      p = Math.min(mask[m], seq[a]);

      if (p === mask[m]) { sm = !sm; ++m; }
      if (p === seq[a]) { sa = !sa; ++a; }

      if (s != op2(sm, sa)) { s = !s; arr.push(p); }      
    }
    while (a < seq.length) { arr.push(seq[a]); ++a; }
    if (op(false)) { while (m < mask.length) { arr.push(mask[m]); ++m; } }
   
    return arr;
  }
  function ipe_diff(seq_a, seq_b) {
    return ipe_mask(seq_a, b => !b, seq_b);
  }

  function IpeStorage () {
    this._ops = [];
    this._domain = [];
    this._base = [];
  }
  
  IpeStorage.prototype.at = function(i) { return ipe_at(this._domain, i); };

  IpeStorage.prototype.selected = function() { return this._domain; };

  IpeStorage.prototype.push = function (op, changed) {
    if (changed!==undefined) { throw "Change tracking not supported"; }
    var masked_old = ipe_mask(op.domain, (b => b), this._domain);
    var new_domain = ipe_mask(op.domain, op.f, this._domain);
//    var masked_new = ipe_mask(op.domain, (b => b), new_domain); 
//    var diff = ipe_diff(masked_old, masked_new);
    var diff = ipe_diff(masked_old, new_domain);
    op.diff = diff;
    this._domain = new_domain;
    this._ops.push(op);
    if (changed) { 
    }
  };
  IpeStorage.prototype.pop = function(changed) {
    if (changed!==undefined) { throw "Change tracking not supported"; }
    var op = this._ops.pop();
    this._domain = ipe_mask(op.diff, (b => !b), this._domain);
    return op;
  };
  IpeStorage.prototype.top = function () { return this._ops[this._ops.length - 1]; };
  IpeStorage.prototype.top2 = function () { return this._ops[this._ops.length - 2]; }
  IpeStorage.prototype.size = function () { return this._ops.length; };
  IpeStorage.prototype.bake = function () { return this._ops.shift(); };
  IpeStorage.prototype.onSelected = function (J) { 
    return J.length === 2 && J[0] + 1 === J[1] && this.at(J[0]) === true;
    // J must indicate only one element, and that element must be currently selected
  };
  IpeStorage.prototype.modifyStorage = function (cmd) {} // all commands are a noop
  IpeStorage.prototype.equalDomains = function (J1, J2) { 
    if (J1.length !== J2.length) return false;
    for (var i=0; i<J1.length; ++i) if (J1[i] !== J2[i]) return false;
    return true;    
  }
  IpeStorage.prototype.isEmpty = function (J) { J.length === 0; }
// size is the number of elements
var IpeOrderedGeometry = function (size) {
  multiselect.DefaultGeometry.call(this);
  this._size = size;
};

IpeOrderedGeometry.prototype = Object.create(multiselect.DefaultGeometry.prototype);
IpeOrderedGeometry.prototype.constructor = IpeOrderedGeometry;

IpeOrderedGeometry.prototype.size = function() { return this._size; }

// retain only the anchor and the active end, ignore null points
IpeOrderedGeometry.prototype.extendPath = function(path, vp) {
  if (vp === null) return null;
  if (path.length === 2) path.pop();
  path.push(vp);
};

// selection domain is the range between anchor and active end 
IpeOrderedGeometry.prototype.selectionDomain = function (spath) {
  if (spath.length === 0) return ipe_encode([]);
  var b = Math.max(0, Math.min(spath[0], spath[spath.length-1]));
  var e = Math.min(this.size()-1, Math.max(spath[0], spath[spath.length-1]));
  return ipe_encode_range(b, e+1);
};

// iterate from 0 to size-1
IpeOrderedGeometry.prototype.filter = function (predicate) {
  var b = [];
  for (var i = 0; i < this.size(); ++i) b[i] = predicate(i);
  return ipe_encode(b);
};
exports.IpeStorage = IpeStorage;
exports.IpeOrderedGeometry = IpeOrderedGeometry;

},{"./multiselect.js":2}],2:[function(require,module,exports){
// This file is generated, do not edit
// This file is generated, do not edit

// -------------------------------------------------------------------
// The default geometry
// -------------------------------------------------------------------
var DefaultGeometry = function () {};

DefaultGeometry.prototype = {
  m2v: function (mp) {
    return mp;
  },
  extendPath: function (path, vp, cache, cursor) {
    path.push(vp);
  },
  step: function (dir, vp) {
    return vp;
  },
  selectionDomain: function (spath, J, cache) {
    var m = new Map();
    for (var i of spath) m.set(i, true);
    return m;
  },
  defaultCursor: function (dir) {
    return undefined;
  },
  filter: undefined,
};
var UP = 1,
  DOWN = 2,
  LEFT = 3,
  RIGHT = 4,
  NO_DIRECTION = 0;
function anchor(path) {
  if (path.length === 0) return undefined;
  return path[0];
}
function activeEnd(path) {
  if (path.length === 0) return undefined;
  return path[path.length - 1];
}

// -------------------------------------------------------------------
// utilities
// -------------------------------------------------------------------
const M_NONE = 1,
  M_SHIFT = 2,
  M_CMD = 3,
  M_SHIFT_CMD = 4,
  M_OPT = 5,
  M_SHIFT_OPT = 6;

function modifierKeys(evt) {
  if (evt.shiftKey && isCmdKey(evt)) return M_SHIFT_CMD;
  if (isCmdKey(evt)) return M_CMD;
  if (evt.shiftKey && evt.altKey) return M_SHIFT_OPT;
  if (evt.altKey) return M_OPT;
  if (evt.shiftKey) return M_SHIFT;
  return M_NONE;

  function isCmdKey(evt) {
    return evt.metaKey || evt.ctrlKey;
  }
}
function or_default(a, v) {
  return a !== undefined ? a : v;
}

// -------------------------------------------------------------------
// selection functions
// -------------------------------------------------------------------
function tt(_) {
  return true;
}
tt.constant = true;
function ff(_) {
  return false;
}
ff.constant = true;
function id(b) {
  return b;
}
id.constant = false;
function not(b) {
  return !b;
}
not.constant = false;

// -------------------------------------------------------------------
// mapping from indices to truth values
// -------------------------------------------------------------------
function makeOpFunction(op) {
  if (op.f.constant) {
    return function (s) {
      return function (i) {
        return op.domain.has(i) ? op.f() : s(i);
      };
    };
  } else {
    return function (s) {
      return function (i) {
        return op.domain.has(i) ? op.f(s(i)) : s(i);
      };
    };
  }
}

function makeBaseSelectionMapping() {
  var s = new Set();

  var func = function (i) {
    return s.has(i);
  };

  func.set = function (i, v) {
    if (v === true) s.add(i);
    else s.delete(i);
  };

  func.selectedIndices = function () {
    return s.keys();
  };

  func.bake = function (op) {
    var s2 = makeOpFunction(op)(func);
    op.domain.forEach(function (_, i) {
      func.set(i, s2(i));
    });
  };

  return func;
}

// -------------------------------------------------------------------
// primitive selection operations
// -------------------------------------------------------------------
function makeOp(f, domain) {
  return { f: f, domain: domain };
}

// -------------------------------------------------------------------
// composition of primitive selection operations
// -------------------------------------------------------------------
function isEmpty(collection) {
  return collection.size === 0;
}
function isSingleton(collection) {
  return collection.size === 1;
}

function firstKey(collection) {
  // The body should be:
  //   return collection.keys().next().value;
  // but Safari 8 does not support .next, therefore the workarounds below

  if (typeof collection.keys().next === "function") {
    return collection.keys().next().value;
  } else {
    var it = collection.keys();
    for (var v of it) return v;
    return undefined;
  }
}

function equalKeys(a, b) {
  if (a.size !== b.size) return false;
  for (var i of a.keys()) if (!b.has(i)) return false;
  return true;
}
function MapStorage() {
  this._ops = [];
  this._baked = makeBaseSelectionMapping();

  this._domain = new Map();
  this._gen = 0;
}

// member functions of func
MapStorage.prototype.at = function (i) {
  var self = this;
  return evaluate(
    this._domain.has(i)
      ? this._ops.length - 1 - (this._gen - this._domain.get(i))
      : -1,
    i
  )(i);

  // determine selection state of i but only access the elements
  // of ops (staring from ind) that have i in their domain
  function evaluate(ind, i) {
    if (ind < 0) return self._baked;
    // i defined in the base selection mapping baked
    else {
      var op = self._ops[ind];
      return op.applyOp(function (j) {
        return evaluate(ind - op.domain.get(i), j)(i);
      });
      // the call to evaluate is wrapped to a lambda to make the call lazy.
      // op will only call the lambda if op.f.constant is false.
      // For explanation of applyOp, see the push function
    }
  }
};
MapStorage.prototype.selected = function () {
  var J = new Map();
  for (var i of this._baked.selectedIndices()) if (this.at(i)) J.set(i, true);
  for (var i of this._domain.keys()) if (this.at(i)) J.set(i, true);
  return J;
};
MapStorage.prototype.push = function (op, changed) {
  if (changed !== undefined)
    changed.value = diffOp(op, this, changed.value, false);
  this._ops.push(op);
  ++this._gen;
  var self = this;
  op.domain.forEach(function (_, i) {
    op.domain.set(
      i,
      self._domain.has(i) ? self._gen - self._domain.get(i) : self._ops.length
    );
    self._domain.set(i, self._gen);
  });
  op.applyOp = makeOpFunction(op);
};
MapStorage.prototype.pop = function (changed) {
  var n = this._ops.length;
  var op = this._ops.pop();
  --this._gen;
  var self = this;
  // domain updated for those elements that are in op.domain
  op.domain.forEach(function (_, i) {
    if (op.domain.get(i) >= n) self._domain.delete(i);
    // no op defines i
    else self._domain.set(i, self._domain.get(i) - op.domain.get(i));
  });
  if (changed !== undefined) {
    changed.value = diffOp(op, self, changed.value, true);
  }
  return op;
};
MapStorage.prototype.top = function () {
  return this._ops[this._ops.length - 1];
};
MapStorage.prototype.top2 = function () {
  return this._ops[this._ops.length - 2];
};
MapStorage.prototype.size = function () {
  return this._ops.length;
};
MapStorage.prototype.bake = function () {
  return this._baked.bake(this._shift());
};

MapStorage.prototype._shift = function () {
  var op = this._ops.shift();
  var self = this;
  op.domain.forEach(function (_, i) {
    if (self._domain.get(i) - self._gen === self._ops.length) {
      self._domain.delete(i);
    }
    // if lastOp the only op that defines i, remove i from domain
  });
  return op;
};
MapStorage.prototype.onSelected = function (J) {
  return isSingleton(J) && this.at(firstKey(J));
};
MapStorage.prototype.modifyStorage = function (cmd) {
  if (cmd.remove !== true) return; // command not recognized
  var i = cmd.value;
  if (!this._domain.has(i)) return; // nothing to remove

  // find the first op in ops that defines i
  var j = this._ops.length - 1 - (this._gen - this._domain.get(i));

  while (j >= 0) {
    var d = this._ops[j].domain.get(i);
    this._ops[j].domain.delete(i);
    j -= d;
  }
  this._domain.delete(i);
  this._baked.set(i, false);
};
MapStorage.prototype.equalDomains = function (J1, J2) {
  return equalKeys(J1, J2);
};
MapStorage.prototype.isEmpty = function (J) {
  return isEmpty(J);
};

// helper functions
function diffOp(op, m, changed, flip) {
  if (changed === undefined) changed = new Map();
  op.domain.forEach(function (_, i) {
    var b = m.at(i);
    if (op.f(b) !== b) {
      if (changed.has(i)) changed.delete(i);
      else changed.set(i, flip ? b : op.f(b));
    }
  });
  return changed;
}

// -------------------------------------------------------------------
// selection state
// -------------------------------------------------------------------
function SelectionState(geometry, refresh, tracking, maxUndo, storage) {
  this._geometry = geometry;

  refresh = or_default(refresh, function () {});
  this._tracking = or_default(tracking, false);

  var self = this;
  if (this._tracking)
    this._refresh = function (c) {
      refresh(self, c.value);
    };
  else
    this._refresh = function () {
      refresh(self);
    };

  this._maxOps = Math.max(2, 2 * or_default(maxUndo, 10));
  this._storage = or_default(storage, new MapStorage());
  this._storageStatus = ACTIVE_NONE;

  this._spath = [];
  this._spathCache = {};
  this._cursor = undefined;
  this._redoStack = [];

  this._queuedCommand = function () {};
}

const ACTIVE_NONE = 0,
  ACTIVE_PREDICATE = 1,
  ACTIVE_PATH = 2;
SelectionState.prototype.resetPath = function () {
  this.commit();
  this._spath = [];
  this._spathCache = {};
  this._cursor = undefined;
  return this;
};
SelectionState.prototype.isSelected = function (i) {
  this._flush();
  return this._storage.at(i);
};
SelectionState.prototype.selected = function () {
  this._flush();
  return this._storage.selected();
};
SelectionState.prototype.click = function (vp) {
  this._flush();
  this._spath = [];
  this._spathCache = {};

  this._modifyPathAndCursor(vp);
  this._storageStatus = ACTIVE_PATH;

  var J1 = this._geometry.selectionDomain(
    this._spath,
    undefined,
    this._spathCache
  );
  if (clickIsNop.call(this, J1)) return this;
  var J0 = this._storage.selected();

  var changed = this._makeEmptyTrackingSet(); // undefined or {changed: undefined}
  this._storage.push(makeOp(ff, J0), changed);
  this._storage.push(makeOp(tt, J1), changed);

  this._bake();
  this._refresh(changed);

  return this;
};
SelectionState.prototype._makeEmptyTrackingSet = function () {
  return this._tracking ? { value: undefined } : undefined;
};
SelectionState.prototype._modifyPathAndCursor = function (vp) {
  var r = this._geometry.extendPath(
    this._spath,
    vp,
    this._spathCache,
    this._cursor
  );

  if (r === undefined || r === null) {
    this._cursor = activeEnd(this._spath);
    return r;
  }
  if (r.cursor !== undefined) this._cursor = r.cursor;
  if (r.path.isArray()) this._spath = r.path;
  return r.path;
};
SelectionState.prototype.modifyPath = function (vp) {
  this._flush();
  this._modifyPathAndCursor(vp);
  return this;
};
function clickIsNop(J) {
  return (
    this._storage.size() >= 2 &&
    this._storage.top2().f === ff &&
    this._storage.top().f === tt &&
    this._storage.equalDomains(J, this._storage.top().domain)
  );
}
SelectionState.prototype.cmdClick = function (vp, selmode) {
  this._flush();
  this._spath = [];
  this._spathCache = {};
  this._modifyPathAndCursor(vp);
  this._storageStatus = ACTIVE_PATH;

  var J = this._geometry.selectionDomain(
    this._spath,
    undefined,
    this._spathCache
  );

  var mode;
  if (selmode === undefined) mode = this._storage.onSelected(J) ? ff : tt;
  else mode = selmode ? tt : ff;

  if (cmdClickIsNop.call(this, J, mode)) return this;

  var changed = this._makeEmptyTrackingSet();
  this._storage.push(
    makeOp(id, this._geometry.selectionDomain([], undefined, {})),
    changed
  );
  this._storage.push(makeOp(mode, J), changed);

  this._bake();
  this._refresh(changed);

  return this;
};
function cmdClickIsNop(J, mode) {
  return (
    this._storage.size() >= 2 &&
    this._storage.top2().f === id &&
    this._storage.top().f === mode &&
    this._storage.isEmpty(J) &&
    this._storage.isEmpty(this._storage.top().domain)
  );
}
SelectionState.prototype.shiftClick = function (vp) {
  if (this._modifyPathAndCursor(vp) === null) return this;

  if (this._queuedCommand.pending) return this;
  // pending is either false or not defined at all

  this._queuedCommand = makeDelayedShiftClickCommand(this);
  setTimeout(this._queuedCommand, 0);
  return this;
};
function makeDelayedShiftClickCommand(sel) {
  var cmd = function () {
    if (cmd.pending === false) return null; // the command has already been run
    cmd.pending = false;

    if (sel._storageStatus !== ACTIVE_PATH) {
      sel._storageStatus = ACTIVE_PATH;
      sel._addEmptyPair();
    }

    var changed = sel._makeEmptyTrackingSet();
    var op = sel._storage.pop(changed);

    var mode = op.f;
    var J = sel._geometry.selectionDomain(
      sel._spath,
      op.domain,
      sel._spathCache
    );

    sel._storage.push(makeOp(mode, J), changed);
    sel._refresh(changed);
  };

  cmd.pending = true;
  return cmd;
}
SelectionState.prototype._flush = function () {
  this._queuedCommand();
};
SelectionState.prototype.onSelected = function (vp) {
  this._flush();
  var path = [];
  var r = this._geometry.extendPath(path, vp, {}, undefined); // called with a temporary empty cache and an undefined cursor
  if (r !== undefined && r !== null && r.path !== null) path = r.path;
  var J = this._geometry.selectionDomain(path, undefined, {}); // called with a temporary empty cache
  return this._storage.onSelected(J);
};
SelectionState.prototype._addEmptyPair = function () {
  this._storage.push(
    makeOp(id, this._geometry.selectionDomain([], undefined, {}))
  );
  this._storage.push(
    makeOp(tt, this._geometry.selectionDomain([], undefined, {}))
  );
};
SelectionState.prototype._bake = function () {
  if (this._storage.size() > this._maxOps) {
    this._storage.bake();
    this._storage.bake();
  }
  return this;
};
SelectionState.prototype.undo = function () {
  this._flush();

  if (this._storage.size() >= 2) {
    var changed = this._makeEmptyTrackingSet();
    this._redoStack.push(this._storage.pop(changed));
    this._redoStack.push(this._storage.pop(changed));
    this._refresh(changed);
    this._spath = [];
    this._spathCache = {};

    this._storageStatus = ACTIVE_NONE;

    // redoStack is not cleared ever,
    // so we limit its size (to the same as that of undo stack)
    if (this._redoStack.length > this._maxOps) {
      this._redoStack.shift();
      this._redoStack.shift();
    }
  }
  return this;
};

SelectionState.prototype.redo = function () {
  this._flush();

  if (this._redoStack.length >= 2) {
    var changed = this._makeEmptyTrackingSet();
    this._storage.push(this._redoStack.pop(), changed);
    this._storage.push(this._redoStack.pop(), changed);
    this._refresh(changed);

    this._spath = [];
    this._spathCache = {};
    this._storageStatus = ACTIVE_NONE;
  }

  return this;
};
SelectionState.prototype.predicateSelect = function (predicate, state) {
  if (state !== false) mode = tt;
  else mode = ff;

  this._flush();

  if (
    this._storageStatus !== ACTIVE_PREDICATE ||
    (this._storage.size() >= 2 && this._storage.top().f !== mode)
  ) {
    // mode changed
    this._storageStatus = ACTIVE_PREDICATE;
    this._spath = [];
    this._spathCache = {};
    this._addEmptyPair();
  }

  var J = this._geometry.filter(predicate);

  var changed = this._makeEmptyTrackingSet();
  this._storage.pop(changed);
  this._storage.push(makeOp(mode, J), changed);
  this._refresh(changed);

  return this;
};
SelectionState.prototype.commit = function () {
  this._flush();
  this._storageStatus = ACTIVE_NONE;
};
SelectionState.prototype.setGeometry = function (geometry) {
  this.resetPath();
  this._geometry = geometry;
  return this;
};
SelectionState.prototype.modifyStorage = function (cmd) {
  this._flush();
  this._storage.modifyStorage(cmd);
  return this;
};
SelectionState.prototype.geometry = function () {
  return this._geometry;
};
SelectionState.prototype.cursor = function () {
  return this._cursor;
};
SelectionState.prototype.selectionPath = function () {
  return this._spath;
};
SelectionState.prototype.space = function () {
  if (!this._acquireCursor(NO_DIRECTION)) return this;
  return this.click(this._cursor);
};
SelectionState.prototype.cmdSpace = function (dir) {
  if (!this._acquireCursor(or_default(dir, NO_DIRECTION))) return this;
  return this.cmdClick(this._cursor);
};
SelectionState.prototype.shiftSpace = function (dir) {
  if (!this._acquireCursor(or_default(dir, NO_DIRECTION))) return this;
  return this.shiftClick(this._cursor);
};
SelectionState.prototype.arrow = function (dir) {
  if (this._noCursor()) {
    this._acquireCursor(dir);
    return this;
  }
  this._cursor = this._geometry.step(dir, this._cursor);
  return this;
};
SelectionState.prototype.cmdArrow = function (dir) {
  if (this._noCursor()) return this.cmdSpace(dir);
  else return this.cmdSpace(dir).arrow(dir);
};
SelectionState.prototype.shiftArrow = function (dir) {
  if (this._noCursor()) return this.shiftSpace(dir);
  if (this._spath.length == 0) this.shiftSpace(dir);
  return this.arrow(dir).shiftSpace(dir);
};
SelectionState.prototype._acquireCursor = function (dir) {
  this._cursor = or_default(this._cursor, this._geometry.defaultCursor(dir));
  return !this._noCursor();
};
SelectionState.prototype._noCursor = function () {
  return this._cursor === undefined;
};

// -------------------------------------------------------------------
// exports
// -------------------------------------------------------------------
exports.SelectionState = SelectionState;

exports.DefaultGeometry = DefaultGeometry;
exports.anchor = anchor;
exports.activeEnd = activeEnd;

exports.UP = UP;
exports.DOWN = DOWN;
exports.LEFT = LEFT;
exports.RIGHT = RIGHT;
exports.NO_DIRECTION = NO_DIRECTION;

// Helpers for defining event handlers
exports.modifierKeys = modifierKeys;

exports.NONE = M_NONE;
exports.SHIFT = M_SHIFT;
exports.CMD = M_CMD;
exports.SHIFT_CMD = M_SHIFT_CMD;
exports.OPT = M_OPT;
exports.SHIFT_OPT = M_SHIFT_OPT;

},{}]},{},[1])(1)
});
