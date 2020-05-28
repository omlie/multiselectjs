(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.multiselect = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9tdWx0aXNlbGVjdC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIvLyBUaGlzIGZpbGUgaXMgZ2VuZXJhdGVkLCBkbyBub3QgZWRpdFxuLy8gVGhpcyBmaWxlIGlzIGdlbmVyYXRlZCwgZG8gbm90IGVkaXRcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gVGhlIGRlZmF1bHQgZ2VvbWV0cnlcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbnZhciBEZWZhdWx0R2VvbWV0cnkgPSBmdW5jdGlvbiAoKSB7fTtcblxuRGVmYXVsdEdlb21ldHJ5LnByb3RvdHlwZSA9IHtcbiAgbTJ2OiBmdW5jdGlvbiAobXApIHtcbiAgICByZXR1cm4gbXA7XG4gIH0sXG4gIGV4dGVuZFBhdGg6IGZ1bmN0aW9uIChwYXRoLCB2cCwgY2FjaGUsIGN1cnNvcikge1xuICAgIHBhdGgucHVzaCh2cCk7XG4gIH0sXG4gIHN0ZXA6IGZ1bmN0aW9uIChkaXIsIHZwKSB7XG4gICAgcmV0dXJuIHZwO1xuICB9LFxuICBzZWxlY3Rpb25Eb21haW46IGZ1bmN0aW9uIChzcGF0aCwgSiwgY2FjaGUpIHtcbiAgICB2YXIgbSA9IG5ldyBNYXAoKTtcbiAgICBmb3IgKHZhciBpIG9mIHNwYXRoKSBtLnNldChpLCB0cnVlKTtcbiAgICByZXR1cm4gbTtcbiAgfSxcbiAgZGVmYXVsdEN1cnNvcjogZnVuY3Rpb24gKGRpcikge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH0sXG4gIGZpbHRlcjogdW5kZWZpbmVkLFxufTtcbnZhciBVUCA9IDEsXG4gIERPV04gPSAyLFxuICBMRUZUID0gMyxcbiAgUklHSFQgPSA0LFxuICBOT19ESVJFQ1RJT04gPSAwO1xuZnVuY3Rpb24gYW5jaG9yKHBhdGgpIHtcbiAgaWYgKHBhdGgubGVuZ3RoID09PSAwKSByZXR1cm4gdW5kZWZpbmVkO1xuICByZXR1cm4gcGF0aFswXTtcbn1cbmZ1bmN0aW9uIGFjdGl2ZUVuZChwYXRoKSB7XG4gIGlmIChwYXRoLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgcmV0dXJuIHBhdGhbcGF0aC5sZW5ndGggLSAxXTtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gdXRpbGl0aWVzXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5jb25zdCBNX05PTkUgPSAxLFxuICBNX1NISUZUID0gMixcbiAgTV9DTUQgPSAzLFxuICBNX1NISUZUX0NNRCA9IDQsXG4gIE1fT1BUID0gNSxcbiAgTV9TSElGVF9PUFQgPSA2O1xuXG5mdW5jdGlvbiBtb2RpZmllcktleXMoZXZ0KSB7XG4gIGlmIChldnQuc2hpZnRLZXkgJiYgaXNDbWRLZXkoZXZ0KSkgcmV0dXJuIE1fU0hJRlRfQ01EO1xuICBpZiAoaXNDbWRLZXkoZXZ0KSkgcmV0dXJuIE1fQ01EO1xuICBpZiAoZXZ0LnNoaWZ0S2V5ICYmIGV2dC5hbHRLZXkpIHJldHVybiBNX1NISUZUX09QVDtcbiAgaWYgKGV2dC5hbHRLZXkpIHJldHVybiBNX09QVDtcbiAgaWYgKGV2dC5zaGlmdEtleSkgcmV0dXJuIE1fU0hJRlQ7XG4gIHJldHVybiBNX05PTkU7XG5cbiAgZnVuY3Rpb24gaXNDbWRLZXkoZXZ0KSB7XG4gICAgcmV0dXJuIGV2dC5tZXRhS2V5IHx8IGV2dC5jdHJsS2V5O1xuICB9XG59XG5mdW5jdGlvbiBvcl9kZWZhdWx0KGEsIHYpIHtcbiAgcmV0dXJuIGEgIT09IHVuZGVmaW5lZCA/IGEgOiB2O1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBzZWxlY3Rpb24gZnVuY3Rpb25zXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5mdW5jdGlvbiB0dChfKSB7XG4gIHJldHVybiB0cnVlO1xufVxudHQuY29uc3RhbnQgPSB0cnVlO1xuZnVuY3Rpb24gZmYoXykge1xuICByZXR1cm4gZmFsc2U7XG59XG5mZi5jb25zdGFudCA9IHRydWU7XG5mdW5jdGlvbiBpZChiKSB7XG4gIHJldHVybiBiO1xufVxuaWQuY29uc3RhbnQgPSBmYWxzZTtcbmZ1bmN0aW9uIG5vdChiKSB7XG4gIHJldHVybiAhYjtcbn1cbm5vdC5jb25zdGFudCA9IGZhbHNlO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBtYXBwaW5nIGZyb20gaW5kaWNlcyB0byB0cnV0aCB2YWx1ZXNcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmZ1bmN0aW9uIG1ha2VPcEZ1bmN0aW9uKG9wKSB7XG4gIGlmIChvcC5mLmNvbnN0YW50KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChzKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gKGkpIHtcbiAgICAgICAgcmV0dXJuIG9wLmRvbWFpbi5oYXMoaSkgPyBvcC5mKCkgOiBzKGkpO1xuICAgICAgfTtcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmdW5jdGlvbiAocykge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uIChpKSB7XG4gICAgICAgIHJldHVybiBvcC5kb21haW4uaGFzKGkpID8gb3AuZihzKGkpKSA6IHMoaSk7XG4gICAgICB9O1xuICAgIH07XG4gIH1cbn1cblxuZnVuY3Rpb24gbWFrZUJhc2VTZWxlY3Rpb25NYXBwaW5nKCkge1xuICB2YXIgcyA9IG5ldyBTZXQoKTtcblxuICB2YXIgZnVuYyA9IGZ1bmN0aW9uIChpKSB7XG4gICAgcmV0dXJuIHMuaGFzKGkpO1xuICB9O1xuXG4gIGZ1bmMuc2V0ID0gZnVuY3Rpb24gKGksIHYpIHtcbiAgICBpZiAodiA9PT0gdHJ1ZSkgcy5hZGQoaSk7XG4gICAgZWxzZSBzLmRlbGV0ZShpKTtcbiAgfTtcblxuICBmdW5jLnNlbGVjdGVkSW5kaWNlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gcy5rZXlzKCk7XG4gIH07XG5cbiAgZnVuYy5iYWtlID0gZnVuY3Rpb24gKG9wKSB7XG4gICAgdmFyIHMyID0gbWFrZU9wRnVuY3Rpb24ob3ApKGZ1bmMpO1xuICAgIG9wLmRvbWFpbi5mb3JFYWNoKGZ1bmN0aW9uIChfLCBpKSB7XG4gICAgICBmdW5jLnNldChpLCBzMihpKSk7XG4gICAgfSk7XG4gIH07XG5cbiAgcmV0dXJuIGZ1bmM7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIHByaW1pdGl2ZSBzZWxlY3Rpb24gb3BlcmF0aW9uc1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZnVuY3Rpb24gbWFrZU9wKGYsIGRvbWFpbikge1xuICByZXR1cm4geyBmOiBmLCBkb21haW46IGRvbWFpbiB9O1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBjb21wb3NpdGlvbiBvZiBwcmltaXRpdmUgc2VsZWN0aW9uIG9wZXJhdGlvbnNcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmZ1bmN0aW9uIGlzRW1wdHkoY29sbGVjdGlvbikge1xuICByZXR1cm4gY29sbGVjdGlvbi5zaXplID09PSAwO1xufVxuZnVuY3Rpb24gaXNTaW5nbGV0b24oY29sbGVjdGlvbikge1xuICByZXR1cm4gY29sbGVjdGlvbi5zaXplID09PSAxO1xufVxuXG5mdW5jdGlvbiBmaXJzdEtleShjb2xsZWN0aW9uKSB7XG4gIC8vIFRoZSBib2R5IHNob3VsZCBiZTpcbiAgLy8gICByZXR1cm4gY29sbGVjdGlvbi5rZXlzKCkubmV4dCgpLnZhbHVlO1xuICAvLyBidXQgU2FmYXJpIDggZG9lcyBub3Qgc3VwcG9ydCAubmV4dCwgdGhlcmVmb3JlIHRoZSB3b3JrYXJvdW5kcyBiZWxvd1xuXG4gIGlmICh0eXBlb2YgY29sbGVjdGlvbi5rZXlzKCkubmV4dCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgcmV0dXJuIGNvbGxlY3Rpb24ua2V5cygpLm5leHQoKS52YWx1ZTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgaXQgPSBjb2xsZWN0aW9uLmtleXMoKTtcbiAgICBmb3IgKHZhciB2IG9mIGl0KSByZXR1cm4gdjtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG59XG5cbmZ1bmN0aW9uIGVxdWFsS2V5cyhhLCBiKSB7XG4gIGlmIChhLnNpemUgIT09IGIuc2l6ZSkgcmV0dXJuIGZhbHNlO1xuICBmb3IgKHZhciBpIG9mIGEua2V5cygpKSBpZiAoIWIuaGFzKGkpKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiB0cnVlO1xufVxuZnVuY3Rpb24gTWFwU3RvcmFnZSgpIHtcbiAgdGhpcy5fb3BzID0gW107XG4gIHRoaXMuX2Jha2VkID0gbWFrZUJhc2VTZWxlY3Rpb25NYXBwaW5nKCk7XG5cbiAgdGhpcy5fZG9tYWluID0gbmV3IE1hcCgpO1xuICB0aGlzLl9nZW4gPSAwO1xufVxuXG4vLyBtZW1iZXIgZnVuY3Rpb25zIG9mIGZ1bmNcbk1hcFN0b3JhZ2UucHJvdG90eXBlLmF0ID0gZnVuY3Rpb24gKGkpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICByZXR1cm4gZXZhbHVhdGUoXG4gICAgdGhpcy5fZG9tYWluLmhhcyhpKVxuICAgICAgPyB0aGlzLl9vcHMubGVuZ3RoIC0gMSAtICh0aGlzLl9nZW4gLSB0aGlzLl9kb21haW4uZ2V0KGkpKVxuICAgICAgOiAtMSxcbiAgICBpXG4gICkoaSk7XG5cbiAgLy8gZGV0ZXJtaW5lIHNlbGVjdGlvbiBzdGF0ZSBvZiBpIGJ1dCBvbmx5IGFjY2VzcyB0aGUgZWxlbWVudHNcbiAgLy8gb2Ygb3BzIChzdGFyaW5nIGZyb20gaW5kKSB0aGF0IGhhdmUgaSBpbiB0aGVpciBkb21haW5cbiAgZnVuY3Rpb24gZXZhbHVhdGUoaW5kLCBpKSB7XG4gICAgaWYgKGluZCA8IDApIHJldHVybiBzZWxmLl9iYWtlZDtcbiAgICAvLyBpIGRlZmluZWQgaW4gdGhlIGJhc2Ugc2VsZWN0aW9uIG1hcHBpbmcgYmFrZWRcbiAgICBlbHNlIHtcbiAgICAgIHZhciBvcCA9IHNlbGYuX29wc1tpbmRdO1xuICAgICAgcmV0dXJuIG9wLmFwcGx5T3AoZnVuY3Rpb24gKGopIHtcbiAgICAgICAgcmV0dXJuIGV2YWx1YXRlKGluZCAtIG9wLmRvbWFpbi5nZXQoaSksIGopKGkpO1xuICAgICAgfSk7XG4gICAgICAvLyB0aGUgY2FsbCB0byBldmFsdWF0ZSBpcyB3cmFwcGVkIHRvIGEgbGFtYmRhIHRvIG1ha2UgdGhlIGNhbGwgbGF6eS5cbiAgICAgIC8vIG9wIHdpbGwgb25seSBjYWxsIHRoZSBsYW1iZGEgaWYgb3AuZi5jb25zdGFudCBpcyBmYWxzZS5cbiAgICAgIC8vIEZvciBleHBsYW5hdGlvbiBvZiBhcHBseU9wLCBzZWUgdGhlIHB1c2ggZnVuY3Rpb25cbiAgICB9XG4gIH1cbn07XG5NYXBTdG9yYWdlLnByb3RvdHlwZS5zZWxlY3RlZCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIEogPSBuZXcgTWFwKCk7XG4gIGZvciAodmFyIGkgb2YgdGhpcy5fYmFrZWQuc2VsZWN0ZWRJbmRpY2VzKCkpIGlmICh0aGlzLmF0KGkpKSBKLnNldChpLCB0cnVlKTtcbiAgZm9yICh2YXIgaSBvZiB0aGlzLl9kb21haW4ua2V5cygpKSBpZiAodGhpcy5hdChpKSkgSi5zZXQoaSwgdHJ1ZSk7XG4gIHJldHVybiBKO1xufTtcbk1hcFN0b3JhZ2UucHJvdG90eXBlLnB1c2ggPSBmdW5jdGlvbiAob3AsIGNoYW5nZWQpIHtcbiAgaWYgKGNoYW5nZWQgIT09IHVuZGVmaW5lZClcbiAgICBjaGFuZ2VkLnZhbHVlID0gZGlmZk9wKG9wLCB0aGlzLCBjaGFuZ2VkLnZhbHVlLCBmYWxzZSk7XG4gIHRoaXMuX29wcy5wdXNoKG9wKTtcbiAgKyt0aGlzLl9nZW47XG4gIHZhciBzZWxmID0gdGhpcztcbiAgb3AuZG9tYWluLmZvckVhY2goZnVuY3Rpb24gKF8sIGkpIHtcbiAgICBvcC5kb21haW4uc2V0KFxuICAgICAgaSxcbiAgICAgIHNlbGYuX2RvbWFpbi5oYXMoaSkgPyBzZWxmLl9nZW4gLSBzZWxmLl9kb21haW4uZ2V0KGkpIDogc2VsZi5fb3BzLmxlbmd0aFxuICAgICk7XG4gICAgc2VsZi5fZG9tYWluLnNldChpLCBzZWxmLl9nZW4pO1xuICB9KTtcbiAgb3AuYXBwbHlPcCA9IG1ha2VPcEZ1bmN0aW9uKG9wKTtcbn07XG5NYXBTdG9yYWdlLnByb3RvdHlwZS5wb3AgPSBmdW5jdGlvbiAoY2hhbmdlZCkge1xuICB2YXIgbiA9IHRoaXMuX29wcy5sZW5ndGg7XG4gIHZhciBvcCA9IHRoaXMuX29wcy5wb3AoKTtcbiAgLS10aGlzLl9nZW47XG4gIHZhciBzZWxmID0gdGhpcztcbiAgLy8gZG9tYWluIHVwZGF0ZWQgZm9yIHRob3NlIGVsZW1lbnRzIHRoYXQgYXJlIGluIG9wLmRvbWFpblxuICBvcC5kb21haW4uZm9yRWFjaChmdW5jdGlvbiAoXywgaSkge1xuICAgIGlmIChvcC5kb21haW4uZ2V0KGkpID49IG4pIHNlbGYuX2RvbWFpbi5kZWxldGUoaSk7XG4gICAgLy8gbm8gb3AgZGVmaW5lcyBpXG4gICAgZWxzZSBzZWxmLl9kb21haW4uc2V0KGksIHNlbGYuX2RvbWFpbi5nZXQoaSkgLSBvcC5kb21haW4uZ2V0KGkpKTtcbiAgfSk7XG4gIGlmIChjaGFuZ2VkICE9PSB1bmRlZmluZWQpIHtcbiAgICBjaGFuZ2VkLnZhbHVlID0gZGlmZk9wKG9wLCBzZWxmLCBjaGFuZ2VkLnZhbHVlLCB0cnVlKTtcbiAgfVxuICByZXR1cm4gb3A7XG59O1xuTWFwU3RvcmFnZS5wcm90b3R5cGUudG9wID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5fb3BzW3RoaXMuX29wcy5sZW5ndGggLSAxXTtcbn07XG5NYXBTdG9yYWdlLnByb3RvdHlwZS50b3AyID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5fb3BzW3RoaXMuX29wcy5sZW5ndGggLSAyXTtcbn07XG5NYXBTdG9yYWdlLnByb3RvdHlwZS5zaXplID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5fb3BzLmxlbmd0aDtcbn07XG5NYXBTdG9yYWdlLnByb3RvdHlwZS5iYWtlID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5fYmFrZWQuYmFrZSh0aGlzLl9zaGlmdCgpKTtcbn07XG5cbk1hcFN0b3JhZ2UucHJvdG90eXBlLl9zaGlmdCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIG9wID0gdGhpcy5fb3BzLnNoaWZ0KCk7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgb3AuZG9tYWluLmZvckVhY2goZnVuY3Rpb24gKF8sIGkpIHtcbiAgICBpZiAoc2VsZi5fZG9tYWluLmdldChpKSAtIHNlbGYuX2dlbiA9PT0gc2VsZi5fb3BzLmxlbmd0aCkge1xuICAgICAgc2VsZi5fZG9tYWluLmRlbGV0ZShpKTtcbiAgICB9XG4gICAgLy8gaWYgbGFzdE9wIHRoZSBvbmx5IG9wIHRoYXQgZGVmaW5lcyBpLCByZW1vdmUgaSBmcm9tIGRvbWFpblxuICB9KTtcbiAgcmV0dXJuIG9wO1xufTtcbk1hcFN0b3JhZ2UucHJvdG90eXBlLm9uU2VsZWN0ZWQgPSBmdW5jdGlvbiAoSikge1xuICByZXR1cm4gaXNTaW5nbGV0b24oSikgJiYgdGhpcy5hdChmaXJzdEtleShKKSk7XG59O1xuTWFwU3RvcmFnZS5wcm90b3R5cGUubW9kaWZ5U3RvcmFnZSA9IGZ1bmN0aW9uIChjbWQpIHtcbiAgaWYgKGNtZC5yZW1vdmUgIT09IHRydWUpIHJldHVybjsgLy8gY29tbWFuZCBub3QgcmVjb2duaXplZFxuICB2YXIgaSA9IGNtZC52YWx1ZTtcbiAgaWYgKCF0aGlzLl9kb21haW4uaGFzKGkpKSByZXR1cm47IC8vIG5vdGhpbmcgdG8gcmVtb3ZlXG5cbiAgLy8gZmluZCB0aGUgZmlyc3Qgb3AgaW4gb3BzIHRoYXQgZGVmaW5lcyBpXG4gIHZhciBqID0gdGhpcy5fb3BzLmxlbmd0aCAtIDEgLSAodGhpcy5fZ2VuIC0gdGhpcy5fZG9tYWluLmdldChpKSk7XG5cbiAgd2hpbGUgKGogPj0gMCkge1xuICAgIHZhciBkID0gdGhpcy5fb3BzW2pdLmRvbWFpbi5nZXQoaSk7XG4gICAgdGhpcy5fb3BzW2pdLmRvbWFpbi5kZWxldGUoaSk7XG4gICAgaiAtPSBkO1xuICB9XG4gIHRoaXMuX2RvbWFpbi5kZWxldGUoaSk7XG4gIHRoaXMuX2Jha2VkLnNldChpLCBmYWxzZSk7XG59O1xuTWFwU3RvcmFnZS5wcm90b3R5cGUuZXF1YWxEb21haW5zID0gZnVuY3Rpb24gKEoxLCBKMikge1xuICByZXR1cm4gZXF1YWxLZXlzKEoxLCBKMik7XG59O1xuTWFwU3RvcmFnZS5wcm90b3R5cGUuaXNFbXB0eSA9IGZ1bmN0aW9uIChKKSB7XG4gIHJldHVybiBpc0VtcHR5KEopO1xufTtcblxuLy8gaGVscGVyIGZ1bmN0aW9uc1xuZnVuY3Rpb24gZGlmZk9wKG9wLCBtLCBjaGFuZ2VkLCBmbGlwKSB7XG4gIGlmIChjaGFuZ2VkID09PSB1bmRlZmluZWQpIGNoYW5nZWQgPSBuZXcgTWFwKCk7XG4gIG9wLmRvbWFpbi5mb3JFYWNoKGZ1bmN0aW9uIChfLCBpKSB7XG4gICAgdmFyIGIgPSBtLmF0KGkpO1xuICAgIGlmIChvcC5mKGIpICE9PSBiKSB7XG4gICAgICBpZiAoY2hhbmdlZC5oYXMoaSkpIGNoYW5nZWQuZGVsZXRlKGkpO1xuICAgICAgZWxzZSBjaGFuZ2VkLnNldChpLCBmbGlwID8gYiA6IG9wLmYoYikpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBjaGFuZ2VkO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBzZWxlY3Rpb24gc3RhdGVcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmZ1bmN0aW9uIFNlbGVjdGlvblN0YXRlKGdlb21ldHJ5LCByZWZyZXNoLCB0cmFja2luZywgbWF4VW5kbywgc3RvcmFnZSkge1xuICB0aGlzLl9nZW9tZXRyeSA9IGdlb21ldHJ5O1xuXG4gIHJlZnJlc2ggPSBvcl9kZWZhdWx0KHJlZnJlc2gsIGZ1bmN0aW9uICgpIHt9KTtcbiAgdGhpcy5fdHJhY2tpbmcgPSBvcl9kZWZhdWx0KHRyYWNraW5nLCBmYWxzZSk7XG5cbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBpZiAodGhpcy5fdHJhY2tpbmcpXG4gICAgdGhpcy5fcmVmcmVzaCA9IGZ1bmN0aW9uIChjKSB7XG4gICAgICByZWZyZXNoKHNlbGYsIGMudmFsdWUpO1xuICAgIH07XG4gIGVsc2VcbiAgICB0aGlzLl9yZWZyZXNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgcmVmcmVzaChzZWxmKTtcbiAgICB9O1xuXG4gIHRoaXMuX21heE9wcyA9IE1hdGgubWF4KDIsIDIgKiBvcl9kZWZhdWx0KG1heFVuZG8sIDEwKSk7XG4gIHRoaXMuX3N0b3JhZ2UgPSBvcl9kZWZhdWx0KHN0b3JhZ2UsIG5ldyBNYXBTdG9yYWdlKCkpO1xuICB0aGlzLl9zdG9yYWdlU3RhdHVzID0gQUNUSVZFX05PTkU7XG5cbiAgdGhpcy5fc3BhdGggPSBbXTtcbiAgdGhpcy5fc3BhdGhDYWNoZSA9IHt9O1xuICB0aGlzLl9jdXJzb3IgPSB1bmRlZmluZWQ7XG4gIHRoaXMuX3JlZG9TdGFjayA9IFtdO1xuXG4gIHRoaXMuX3F1ZXVlZENvbW1hbmQgPSBmdW5jdGlvbiAoKSB7fTtcbn1cblxuY29uc3QgQUNUSVZFX05PTkUgPSAwLFxuICBBQ1RJVkVfUFJFRElDQVRFID0gMSxcbiAgQUNUSVZFX1BBVEggPSAyO1xuU2VsZWN0aW9uU3RhdGUucHJvdG90eXBlLnJlc2V0UGF0aCA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5jb21taXQoKTtcbiAgdGhpcy5fc3BhdGggPSBbXTtcbiAgdGhpcy5fc3BhdGhDYWNoZSA9IHt9O1xuICB0aGlzLl9jdXJzb3IgPSB1bmRlZmluZWQ7XG4gIHJldHVybiB0aGlzO1xufTtcblNlbGVjdGlvblN0YXRlLnByb3RvdHlwZS5pc1NlbGVjdGVkID0gZnVuY3Rpb24gKGkpIHtcbiAgdGhpcy5fZmx1c2goKTtcbiAgcmV0dXJuIHRoaXMuX3N0b3JhZ2UuYXQoaSk7XG59O1xuU2VsZWN0aW9uU3RhdGUucHJvdG90eXBlLnNlbGVjdGVkID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLl9mbHVzaCgpO1xuICByZXR1cm4gdGhpcy5fc3RvcmFnZS5zZWxlY3RlZCgpO1xufTtcblNlbGVjdGlvblN0YXRlLnByb3RvdHlwZS5jbGljayA9IGZ1bmN0aW9uICh2cCkge1xuICB0aGlzLl9mbHVzaCgpO1xuICB0aGlzLl9zcGF0aCA9IFtdO1xuICB0aGlzLl9zcGF0aENhY2hlID0ge307XG5cbiAgdGhpcy5fbW9kaWZ5UGF0aEFuZEN1cnNvcih2cCk7XG4gIHRoaXMuX3N0b3JhZ2VTdGF0dXMgPSBBQ1RJVkVfUEFUSDtcblxuICB2YXIgSjEgPSB0aGlzLl9nZW9tZXRyeS5zZWxlY3Rpb25Eb21haW4oXG4gICAgdGhpcy5fc3BhdGgsXG4gICAgdW5kZWZpbmVkLFxuICAgIHRoaXMuX3NwYXRoQ2FjaGVcbiAgKTtcbiAgaWYgKGNsaWNrSXNOb3AuY2FsbCh0aGlzLCBKMSkpIHJldHVybiB0aGlzO1xuICB2YXIgSjAgPSB0aGlzLl9zdG9yYWdlLnNlbGVjdGVkKCk7XG5cbiAgdmFyIGNoYW5nZWQgPSB0aGlzLl9tYWtlRW1wdHlUcmFja2luZ1NldCgpOyAvLyB1bmRlZmluZWQgb3Ige2NoYW5nZWQ6IHVuZGVmaW5lZH1cbiAgdGhpcy5fc3RvcmFnZS5wdXNoKG1ha2VPcChmZiwgSjApLCBjaGFuZ2VkKTtcbiAgdGhpcy5fc3RvcmFnZS5wdXNoKG1ha2VPcCh0dCwgSjEpLCBjaGFuZ2VkKTtcblxuICB0aGlzLl9iYWtlKCk7XG4gIHRoaXMuX3JlZnJlc2goY2hhbmdlZCk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuU2VsZWN0aW9uU3RhdGUucHJvdG90eXBlLl9tYWtlRW1wdHlUcmFja2luZ1NldCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMuX3RyYWNraW5nID8geyB2YWx1ZTogdW5kZWZpbmVkIH0gOiB1bmRlZmluZWQ7XG59O1xuU2VsZWN0aW9uU3RhdGUucHJvdG90eXBlLl9tb2RpZnlQYXRoQW5kQ3Vyc29yID0gZnVuY3Rpb24gKHZwKSB7XG4gIHZhciByID0gdGhpcy5fZ2VvbWV0cnkuZXh0ZW5kUGF0aChcbiAgICB0aGlzLl9zcGF0aCxcbiAgICB2cCxcbiAgICB0aGlzLl9zcGF0aENhY2hlLFxuICAgIHRoaXMuX2N1cnNvclxuICApO1xuXG4gIGlmIChyID09PSB1bmRlZmluZWQgfHwgciA9PT0gbnVsbCkge1xuICAgIHRoaXMuX2N1cnNvciA9IGFjdGl2ZUVuZCh0aGlzLl9zcGF0aCk7XG4gICAgcmV0dXJuIHI7XG4gIH1cbiAgaWYgKHIuY3Vyc29yICE9PSB1bmRlZmluZWQpIHRoaXMuX2N1cnNvciA9IHIuY3Vyc29yO1xuICBpZiAoci5wYXRoLmlzQXJyYXkoKSkgdGhpcy5fc3BhdGggPSByLnBhdGg7XG4gIHJldHVybiByLnBhdGg7XG59O1xuU2VsZWN0aW9uU3RhdGUucHJvdG90eXBlLm1vZGlmeVBhdGggPSBmdW5jdGlvbiAodnApIHtcbiAgdGhpcy5fZmx1c2goKTtcbiAgdGhpcy5fbW9kaWZ5UGF0aEFuZEN1cnNvcih2cCk7XG4gIHJldHVybiB0aGlzO1xufTtcbmZ1bmN0aW9uIGNsaWNrSXNOb3AoSikge1xuICByZXR1cm4gKFxuICAgIHRoaXMuX3N0b3JhZ2Uuc2l6ZSgpID49IDIgJiZcbiAgICB0aGlzLl9zdG9yYWdlLnRvcDIoKS5mID09PSBmZiAmJlxuICAgIHRoaXMuX3N0b3JhZ2UudG9wKCkuZiA9PT0gdHQgJiZcbiAgICB0aGlzLl9zdG9yYWdlLmVxdWFsRG9tYWlucyhKLCB0aGlzLl9zdG9yYWdlLnRvcCgpLmRvbWFpbilcbiAgKTtcbn1cblNlbGVjdGlvblN0YXRlLnByb3RvdHlwZS5jbWRDbGljayA9IGZ1bmN0aW9uICh2cCwgc2VsbW9kZSkge1xuICB0aGlzLl9mbHVzaCgpO1xuICB0aGlzLl9zcGF0aCA9IFtdO1xuICB0aGlzLl9zcGF0aENhY2hlID0ge307XG4gIHRoaXMuX21vZGlmeVBhdGhBbmRDdXJzb3IodnApO1xuICB0aGlzLl9zdG9yYWdlU3RhdHVzID0gQUNUSVZFX1BBVEg7XG5cbiAgdmFyIEogPSB0aGlzLl9nZW9tZXRyeS5zZWxlY3Rpb25Eb21haW4oXG4gICAgdGhpcy5fc3BhdGgsXG4gICAgdW5kZWZpbmVkLFxuICAgIHRoaXMuX3NwYXRoQ2FjaGVcbiAgKTtcblxuICB2YXIgbW9kZTtcbiAgaWYgKHNlbG1vZGUgPT09IHVuZGVmaW5lZCkgbW9kZSA9IHRoaXMuX3N0b3JhZ2Uub25TZWxlY3RlZChKKSA/IGZmIDogdHQ7XG4gIGVsc2UgbW9kZSA9IHNlbG1vZGUgPyB0dCA6IGZmO1xuXG4gIGlmIChjbWRDbGlja0lzTm9wLmNhbGwodGhpcywgSiwgbW9kZSkpIHJldHVybiB0aGlzO1xuXG4gIHZhciBjaGFuZ2VkID0gdGhpcy5fbWFrZUVtcHR5VHJhY2tpbmdTZXQoKTtcbiAgdGhpcy5fc3RvcmFnZS5wdXNoKFxuICAgIG1ha2VPcChpZCwgdGhpcy5fZ2VvbWV0cnkuc2VsZWN0aW9uRG9tYWluKFtdLCB1bmRlZmluZWQsIHt9KSksXG4gICAgY2hhbmdlZFxuICApO1xuICB0aGlzLl9zdG9yYWdlLnB1c2gobWFrZU9wKG1vZGUsIEopLCBjaGFuZ2VkKTtcblxuICB0aGlzLl9iYWtlKCk7XG4gIHRoaXMuX3JlZnJlc2goY2hhbmdlZCk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuZnVuY3Rpb24gY21kQ2xpY2tJc05vcChKLCBtb2RlKSB7XG4gIHJldHVybiAoXG4gICAgdGhpcy5fc3RvcmFnZS5zaXplKCkgPj0gMiAmJlxuICAgIHRoaXMuX3N0b3JhZ2UudG9wMigpLmYgPT09IGlkICYmXG4gICAgdGhpcy5fc3RvcmFnZS50b3AoKS5mID09PSBtb2RlICYmXG4gICAgdGhpcy5fc3RvcmFnZS5pc0VtcHR5KEopICYmXG4gICAgdGhpcy5fc3RvcmFnZS5pc0VtcHR5KHRoaXMuX3N0b3JhZ2UudG9wKCkuZG9tYWluKVxuICApO1xufVxuU2VsZWN0aW9uU3RhdGUucHJvdG90eXBlLnNoaWZ0Q2xpY2sgPSBmdW5jdGlvbiAodnApIHtcbiAgaWYgKHRoaXMuX21vZGlmeVBhdGhBbmRDdXJzb3IodnApID09PSBudWxsKSByZXR1cm4gdGhpcztcblxuICBpZiAodGhpcy5fcXVldWVkQ29tbWFuZC5wZW5kaW5nKSByZXR1cm4gdGhpcztcbiAgLy8gcGVuZGluZyBpcyBlaXRoZXIgZmFsc2Ugb3Igbm90IGRlZmluZWQgYXQgYWxsXG5cbiAgdGhpcy5fcXVldWVkQ29tbWFuZCA9IG1ha2VEZWxheWVkU2hpZnRDbGlja0NvbW1hbmQodGhpcyk7XG4gIHNldFRpbWVvdXQodGhpcy5fcXVldWVkQ29tbWFuZCwgMCk7XG4gIHJldHVybiB0aGlzO1xufTtcbmZ1bmN0aW9uIG1ha2VEZWxheWVkU2hpZnRDbGlja0NvbW1hbmQoc2VsKSB7XG4gIHZhciBjbWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKGNtZC5wZW5kaW5nID09PSBmYWxzZSkgcmV0dXJuIG51bGw7IC8vIHRoZSBjb21tYW5kIGhhcyBhbHJlYWR5IGJlZW4gcnVuXG4gICAgY21kLnBlbmRpbmcgPSBmYWxzZTtcblxuICAgIGlmIChzZWwuX3N0b3JhZ2VTdGF0dXMgIT09IEFDVElWRV9QQVRIKSB7XG4gICAgICBzZWwuX3N0b3JhZ2VTdGF0dXMgPSBBQ1RJVkVfUEFUSDtcbiAgICAgIHNlbC5fYWRkRW1wdHlQYWlyKCk7XG4gICAgfVxuXG4gICAgdmFyIGNoYW5nZWQgPSBzZWwuX21ha2VFbXB0eVRyYWNraW5nU2V0KCk7XG4gICAgdmFyIG9wID0gc2VsLl9zdG9yYWdlLnBvcChjaGFuZ2VkKTtcblxuICAgIHZhciBtb2RlID0gb3AuZjtcbiAgICB2YXIgSiA9IHNlbC5fZ2VvbWV0cnkuc2VsZWN0aW9uRG9tYWluKFxuICAgICAgc2VsLl9zcGF0aCxcbiAgICAgIG9wLmRvbWFpbixcbiAgICAgIHNlbC5fc3BhdGhDYWNoZVxuICAgICk7XG5cbiAgICBzZWwuX3N0b3JhZ2UucHVzaChtYWtlT3AobW9kZSwgSiksIGNoYW5nZWQpO1xuICAgIHNlbC5fcmVmcmVzaChjaGFuZ2VkKTtcbiAgfTtcblxuICBjbWQucGVuZGluZyA9IHRydWU7XG4gIHJldHVybiBjbWQ7XG59XG5TZWxlY3Rpb25TdGF0ZS5wcm90b3R5cGUuX2ZsdXNoID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLl9xdWV1ZWRDb21tYW5kKCk7XG59O1xuU2VsZWN0aW9uU3RhdGUucHJvdG90eXBlLm9uU2VsZWN0ZWQgPSBmdW5jdGlvbiAodnApIHtcbiAgdGhpcy5fZmx1c2goKTtcbiAgdmFyIHBhdGggPSBbXTtcbiAgdmFyIHIgPSB0aGlzLl9nZW9tZXRyeS5leHRlbmRQYXRoKHBhdGgsIHZwLCB7fSwgdW5kZWZpbmVkKTsgLy8gY2FsbGVkIHdpdGggYSB0ZW1wb3JhcnkgZW1wdHkgY2FjaGUgYW5kIGFuIHVuZGVmaW5lZCBjdXJzb3JcbiAgaWYgKHIgIT09IHVuZGVmaW5lZCAmJiByICE9PSBudWxsICYmIHIucGF0aCAhPT0gbnVsbCkgcGF0aCA9IHIucGF0aDtcbiAgdmFyIEogPSB0aGlzLl9nZW9tZXRyeS5zZWxlY3Rpb25Eb21haW4ocGF0aCwgdW5kZWZpbmVkLCB7fSk7IC8vIGNhbGxlZCB3aXRoIGEgdGVtcG9yYXJ5IGVtcHR5IGNhY2hlXG4gIHJldHVybiB0aGlzLl9zdG9yYWdlLm9uU2VsZWN0ZWQoSik7XG59O1xuU2VsZWN0aW9uU3RhdGUucHJvdG90eXBlLl9hZGRFbXB0eVBhaXIgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuX3N0b3JhZ2UucHVzaChcbiAgICBtYWtlT3AoaWQsIHRoaXMuX2dlb21ldHJ5LnNlbGVjdGlvbkRvbWFpbihbXSwgdW5kZWZpbmVkLCB7fSkpXG4gICk7XG4gIHRoaXMuX3N0b3JhZ2UucHVzaChcbiAgICBtYWtlT3AodHQsIHRoaXMuX2dlb21ldHJ5LnNlbGVjdGlvbkRvbWFpbihbXSwgdW5kZWZpbmVkLCB7fSkpXG4gICk7XG59O1xuU2VsZWN0aW9uU3RhdGUucHJvdG90eXBlLl9iYWtlID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5fc3RvcmFnZS5zaXplKCkgPiB0aGlzLl9tYXhPcHMpIHtcbiAgICB0aGlzLl9zdG9yYWdlLmJha2UoKTtcbiAgICB0aGlzLl9zdG9yYWdlLmJha2UoKTtcbiAgfVxuICByZXR1cm4gdGhpcztcbn07XG5TZWxlY3Rpb25TdGF0ZS5wcm90b3R5cGUudW5kbyA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5fZmx1c2goKTtcblxuICBpZiAodGhpcy5fc3RvcmFnZS5zaXplKCkgPj0gMikge1xuICAgIHZhciBjaGFuZ2VkID0gdGhpcy5fbWFrZUVtcHR5VHJhY2tpbmdTZXQoKTtcbiAgICB0aGlzLl9yZWRvU3RhY2sucHVzaCh0aGlzLl9zdG9yYWdlLnBvcChjaGFuZ2VkKSk7XG4gICAgdGhpcy5fcmVkb1N0YWNrLnB1c2godGhpcy5fc3RvcmFnZS5wb3AoY2hhbmdlZCkpO1xuICAgIHRoaXMuX3JlZnJlc2goY2hhbmdlZCk7XG4gICAgdGhpcy5fc3BhdGggPSBbXTtcbiAgICB0aGlzLl9zcGF0aENhY2hlID0ge307XG5cbiAgICB0aGlzLl9zdG9yYWdlU3RhdHVzID0gQUNUSVZFX05PTkU7XG5cbiAgICAvLyByZWRvU3RhY2sgaXMgbm90IGNsZWFyZWQgZXZlcixcbiAgICAvLyBzbyB3ZSBsaW1pdCBpdHMgc2l6ZSAodG8gdGhlIHNhbWUgYXMgdGhhdCBvZiB1bmRvIHN0YWNrKVxuICAgIGlmICh0aGlzLl9yZWRvU3RhY2subGVuZ3RoID4gdGhpcy5fbWF4T3BzKSB7XG4gICAgICB0aGlzLl9yZWRvU3RhY2suc2hpZnQoKTtcbiAgICAgIHRoaXMuX3JlZG9TdGFjay5zaGlmdCgpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdGhpcztcbn07XG5cblNlbGVjdGlvblN0YXRlLnByb3RvdHlwZS5yZWRvID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLl9mbHVzaCgpO1xuXG4gIGlmICh0aGlzLl9yZWRvU3RhY2subGVuZ3RoID49IDIpIHtcbiAgICB2YXIgY2hhbmdlZCA9IHRoaXMuX21ha2VFbXB0eVRyYWNraW5nU2V0KCk7XG4gICAgdGhpcy5fc3RvcmFnZS5wdXNoKHRoaXMuX3JlZG9TdGFjay5wb3AoKSwgY2hhbmdlZCk7XG4gICAgdGhpcy5fc3RvcmFnZS5wdXNoKHRoaXMuX3JlZG9TdGFjay5wb3AoKSwgY2hhbmdlZCk7XG4gICAgdGhpcy5fcmVmcmVzaChjaGFuZ2VkKTtcblxuICAgIHRoaXMuX3NwYXRoID0gW107XG4gICAgdGhpcy5fc3BhdGhDYWNoZSA9IHt9O1xuICAgIHRoaXMuX3N0b3JhZ2VTdGF0dXMgPSBBQ1RJVkVfTk9ORTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblNlbGVjdGlvblN0YXRlLnByb3RvdHlwZS5wcmVkaWNhdGVTZWxlY3QgPSBmdW5jdGlvbiAocHJlZGljYXRlLCBzdGF0ZSkge1xuICBpZiAoc3RhdGUgIT09IGZhbHNlKSBtb2RlID0gdHQ7XG4gIGVsc2UgbW9kZSA9IGZmO1xuXG4gIHRoaXMuX2ZsdXNoKCk7XG5cbiAgaWYgKFxuICAgIHRoaXMuX3N0b3JhZ2VTdGF0dXMgIT09IEFDVElWRV9QUkVESUNBVEUgfHxcbiAgICAodGhpcy5fc3RvcmFnZS5zaXplKCkgPj0gMiAmJiB0aGlzLl9zdG9yYWdlLnRvcCgpLmYgIT09IG1vZGUpXG4gICkge1xuICAgIC8vIG1vZGUgY2hhbmdlZFxuICAgIHRoaXMuX3N0b3JhZ2VTdGF0dXMgPSBBQ1RJVkVfUFJFRElDQVRFO1xuICAgIHRoaXMuX3NwYXRoID0gW107XG4gICAgdGhpcy5fc3BhdGhDYWNoZSA9IHt9O1xuICAgIHRoaXMuX2FkZEVtcHR5UGFpcigpO1xuICB9XG5cbiAgdmFyIEogPSB0aGlzLl9nZW9tZXRyeS5maWx0ZXIocHJlZGljYXRlKTtcblxuICB2YXIgY2hhbmdlZCA9IHRoaXMuX21ha2VFbXB0eVRyYWNraW5nU2V0KCk7XG4gIHRoaXMuX3N0b3JhZ2UucG9wKGNoYW5nZWQpO1xuICB0aGlzLl9zdG9yYWdlLnB1c2gobWFrZU9wKG1vZGUsIEopLCBjaGFuZ2VkKTtcbiAgdGhpcy5fcmVmcmVzaChjaGFuZ2VkKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5TZWxlY3Rpb25TdGF0ZS5wcm90b3R5cGUuY29tbWl0ID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLl9mbHVzaCgpO1xuICB0aGlzLl9zdG9yYWdlU3RhdHVzID0gQUNUSVZFX05PTkU7XG59O1xuU2VsZWN0aW9uU3RhdGUucHJvdG90eXBlLnNldEdlb21ldHJ5ID0gZnVuY3Rpb24gKGdlb21ldHJ5KSB7XG4gIHRoaXMucmVzZXRQYXRoKCk7XG4gIHRoaXMuX2dlb21ldHJ5ID0gZ2VvbWV0cnk7XG4gIHJldHVybiB0aGlzO1xufTtcblNlbGVjdGlvblN0YXRlLnByb3RvdHlwZS5tb2RpZnlTdG9yYWdlID0gZnVuY3Rpb24gKGNtZCkge1xuICB0aGlzLl9mbHVzaCgpO1xuICB0aGlzLl9zdG9yYWdlLm1vZGlmeVN0b3JhZ2UoY21kKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuU2VsZWN0aW9uU3RhdGUucHJvdG90eXBlLmdlb21ldHJ5ID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5fZ2VvbWV0cnk7XG59O1xuU2VsZWN0aW9uU3RhdGUucHJvdG90eXBlLmN1cnNvciA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMuX2N1cnNvcjtcbn07XG5TZWxlY3Rpb25TdGF0ZS5wcm90b3R5cGUuc2VsZWN0aW9uUGF0aCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMuX3NwYXRoO1xufTtcblNlbGVjdGlvblN0YXRlLnByb3RvdHlwZS5zcGFjZSA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKCF0aGlzLl9hY3F1aXJlQ3Vyc29yKE5PX0RJUkVDVElPTikpIHJldHVybiB0aGlzO1xuICByZXR1cm4gdGhpcy5jbGljayh0aGlzLl9jdXJzb3IpO1xufTtcblNlbGVjdGlvblN0YXRlLnByb3RvdHlwZS5jbWRTcGFjZSA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgaWYgKCF0aGlzLl9hY3F1aXJlQ3Vyc29yKG9yX2RlZmF1bHQoZGlyLCBOT19ESVJFQ1RJT04pKSkgcmV0dXJuIHRoaXM7XG4gIHJldHVybiB0aGlzLmNtZENsaWNrKHRoaXMuX2N1cnNvcik7XG59O1xuU2VsZWN0aW9uU3RhdGUucHJvdG90eXBlLnNoaWZ0U3BhY2UgPSBmdW5jdGlvbiAoZGlyKSB7XG4gIGlmICghdGhpcy5fYWNxdWlyZUN1cnNvcihvcl9kZWZhdWx0KGRpciwgTk9fRElSRUNUSU9OKSkpIHJldHVybiB0aGlzO1xuICByZXR1cm4gdGhpcy5zaGlmdENsaWNrKHRoaXMuX2N1cnNvcik7XG59O1xuU2VsZWN0aW9uU3RhdGUucHJvdG90eXBlLmFycm93ID0gZnVuY3Rpb24gKGRpcikge1xuICBpZiAodGhpcy5fbm9DdXJzb3IoKSkge1xuICAgIHRoaXMuX2FjcXVpcmVDdXJzb3IoZGlyKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuICB0aGlzLl9jdXJzb3IgPSB0aGlzLl9nZW9tZXRyeS5zdGVwKGRpciwgdGhpcy5fY3Vyc29yKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuU2VsZWN0aW9uU3RhdGUucHJvdG90eXBlLmNtZEFycm93ID0gZnVuY3Rpb24gKGRpcikge1xuICBpZiAodGhpcy5fbm9DdXJzb3IoKSkgcmV0dXJuIHRoaXMuY21kU3BhY2UoZGlyKTtcbiAgZWxzZSByZXR1cm4gdGhpcy5jbWRTcGFjZShkaXIpLmFycm93KGRpcik7XG59O1xuU2VsZWN0aW9uU3RhdGUucHJvdG90eXBlLnNoaWZ0QXJyb3cgPSBmdW5jdGlvbiAoZGlyKSB7XG4gIGlmICh0aGlzLl9ub0N1cnNvcigpKSByZXR1cm4gdGhpcy5zaGlmdFNwYWNlKGRpcik7XG4gIGlmICh0aGlzLl9zcGF0aC5sZW5ndGggPT0gMCkgdGhpcy5zaGlmdFNwYWNlKGRpcik7XG4gIHJldHVybiB0aGlzLmFycm93KGRpcikuc2hpZnRTcGFjZShkaXIpO1xufTtcblNlbGVjdGlvblN0YXRlLnByb3RvdHlwZS5fYWNxdWlyZUN1cnNvciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgdGhpcy5fY3Vyc29yID0gb3JfZGVmYXVsdCh0aGlzLl9jdXJzb3IsIHRoaXMuX2dlb21ldHJ5LmRlZmF1bHRDdXJzb3IoZGlyKSk7XG4gIHJldHVybiAhdGhpcy5fbm9DdXJzb3IoKTtcbn07XG5TZWxlY3Rpb25TdGF0ZS5wcm90b3R5cGUuX25vQ3Vyc29yID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5fY3Vyc29yID09PSB1bmRlZmluZWQ7XG59O1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBleHBvcnRzXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5leHBvcnRzLlNlbGVjdGlvblN0YXRlID0gU2VsZWN0aW9uU3RhdGU7XG5cbmV4cG9ydHMuRGVmYXVsdEdlb21ldHJ5ID0gRGVmYXVsdEdlb21ldHJ5O1xuZXhwb3J0cy5hbmNob3IgPSBhbmNob3I7XG5leHBvcnRzLmFjdGl2ZUVuZCA9IGFjdGl2ZUVuZDtcblxuZXhwb3J0cy5VUCA9IFVQO1xuZXhwb3J0cy5ET1dOID0gRE9XTjtcbmV4cG9ydHMuTEVGVCA9IExFRlQ7XG5leHBvcnRzLlJJR0hUID0gUklHSFQ7XG5leHBvcnRzLk5PX0RJUkVDVElPTiA9IE5PX0RJUkVDVElPTjtcblxuLy8gSGVscGVycyBmb3IgZGVmaW5pbmcgZXZlbnQgaGFuZGxlcnNcbmV4cG9ydHMubW9kaWZpZXJLZXlzID0gbW9kaWZpZXJLZXlzO1xuXG5leHBvcnRzLk5PTkUgPSBNX05PTkU7XG5leHBvcnRzLlNISUZUID0gTV9TSElGVDtcbmV4cG9ydHMuQ01EID0gTV9DTUQ7XG5leHBvcnRzLlNISUZUX0NNRCA9IE1fU0hJRlRfQ01EO1xuZXhwb3J0cy5PUFQgPSBNX09QVDtcbmV4cG9ydHMuU0hJRlRfT1BUID0gTV9TSElGVF9PUFQ7XG4iXX0=
