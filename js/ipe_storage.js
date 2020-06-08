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
