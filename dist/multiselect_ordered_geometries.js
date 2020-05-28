(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.multiselect_ordered_geometries = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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

},{}],2:[function(require,module,exports){
var dg = require("./multiselect.js");
// size is the number of elements
var OrderedGeometry = function (size) {
  dg.DefaultGeometry.call(this);
  this._size = size;
};

OrderedGeometry.prototype = Object.create(dg.DefaultGeometry.prototype);
OrderedGeometry.prototype.constructor = OrderedGeometry;

OrderedGeometry.prototype.size = function() { return this._size; }

// retain only the anchor and the active end, ignore null points
OrderedGeometry.prototype.extendPath = function(path, vpoint) {
  if (vpoint === null) return null;
  if (path.length === 2) path.pop();
  path.push(vpoint);
};

// selection domain is the range between anchor and active end 
OrderedGeometry.prototype.selectionDomain = function (spath) {
  var J = new Map();
  if (spath.length === 0) return J;

  var b = Math.max(0, Math.min(dg.anchor(spath), dg.activeEnd(spath)));
  var e = Math.min(this.size()-1, Math.max(dg.anchor(spath), dg.activeEnd(spath)));
  for (var i = b; i<=e; ++i) J.set(i, true);
  return J; 
};

// iterate from 0 to size-1
OrderedGeometry.prototype.filter = function (predicate) {
  var J = new Map();
  for (var i = 0; i < this.size(); ++i) if (predicate(i)) J.set(i, true);
  return J;
};

exports.OrderedGeometry = OrderedGeometry;
var VerticalGeometry = function (size) {
  OrderedGeometry.call(this, size);
};

VerticalGeometry.prototype = Object.create(OrderedGeometry.prototype);
VerticalGeometry.prototype.constructor = VerticalGeometry;

VerticalGeometry.prototype.step = function (dir, vpoint) {
  switch (dir) {
    case dg.UP: return Math.max(0, vpoint-1);
    case dg.DOWN: return Math.min(this.size()-1, vpoint+1);
    default: return vpoint;
  }
};

VerticalGeometry.prototype.defaultCursor = function (dir) {
  switch (dir) {
  case dg.UP: return this.size()-1;
  case dg.DOWN: return 0; 
  default: return undefined;
  }
};

exports.VerticalGeometry = VerticalGeometry;
var HorizontalGeometry = function (size) {
  OrderedGeometry.call(this, size);
};

HorizontalGeometry.prototype = Object.create(OrderedGeometry.prototype);
HorizontalGeometry.prototype.constructor = HorizontalGeometry;

HorizontalGeometry.prototype.step = function (dir, vpoint) {
  switch (dir) {
    case dg.LEFT: return Math.max(0, vpoint-1);
    case dg.RIGHT: return Math.min(this.size()-1, vpoint+1);
    default: return vpoint;
  }
};

HorizontalGeometry.prototype.defaultCursor = function (dir) {
  switch (dir) {
  case dg.LEFT: return 0; 
  case dg.RIGHT: return this.size()-1;
  default: return undefined;
  }
};

exports.HorizontalGeometry = HorizontalGeometry;

},{"./multiselect.js":1}]},{},[2])(2)
});
