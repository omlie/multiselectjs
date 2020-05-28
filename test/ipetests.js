  var test = QUnit.test;
  
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

    QUnit.test( "array_lower_bound", function( assert ) {
      assert.equal(array_lower_bound([], 1), 0, "lower bound in empty array");
      assert.equal(array_lower_bound([0], 1), 1, "one element less");
      assert.equal(array_lower_bound([1], 1), 0, "one element equal");
      assert.equal(array_lower_bound([2], 1), 0, "one element greater");
  
      assert.equal(array_lower_bound([2,4], 0), 0, "less than first");
      assert.equal(array_lower_bound([2,4], 2), 0, "equal to first");
      assert.equal(array_lower_bound([2,4], 3), 1, "between");
      assert.equal(array_lower_bound([2,4], 4), 1, "equal to second");
      assert.equal(array_lower_bound([2,4], 5), 2, "greater than second");
  
      assert.equal(array_lower_bound([2,4,4,5], 3), 1);
      assert.equal(array_lower_bound([2,4,4,5], 4), 1);
      assert.equal(array_lower_bound([2,4,4,5], 5), 3);
      assert.equal(array_lower_bound([2,4,4,5], 6), 4);
    });
    QUnit.test( "array_upper_bound", function( assert ) {
      assert.equal(array_upper_bound([], 1), 0, "upper bound in empty array");
      assert.equal(array_upper_bound([0], 1), 1, "one element less");
      assert.equal(array_upper_bound([1], 1), 1, "one element equal");
      assert.equal(array_upper_bound([2], 1), 0, "one element greater");
  
      assert.equal(array_upper_bound([2,4], 0), 0, "less than first");
      assert.equal(array_upper_bound([2,4], 2), 1, "equal to first");
      assert.equal(array_upper_bound([2,4], 3), 1, "between");
      assert.equal(array_upper_bound([2,4], 4), 2, "equal to second");
      assert.equal(array_upper_bound([2,4], 5), 2, "greater than second");
  
      assert.equal(array_upper_bound([2,4,4,5], 3), 1);
      assert.equal(array_upper_bound([2,4,4,5], 4), 3);
      assert.equal(array_upper_bound([2,4,4,5], 5), 4);
      assert.equal(array_upper_bound([2,4,4,5], 6), 4);
    });

    QUnit.test( "ipe_encode_decode_test", function( assert ) {
      var enc = ipe_encode, dec = ipe_decode;
      assert.deepEqual(dec(enc([])), [], "");
  
      var f = false, t = true;
      var arrs = [
        [], [t], [t, t], [f, f], 
        [f, t], [t, t, f], [f, t, f, t],
        [f, f, t, t, f, t, t, t, f, f]
      ];
  
      function drop_false_suffix(arr) { 
        var b = arr.slice();
        while (b.length > 0 && b[b.length-1] === f) b.pop(); 
        return b; 
      }
  
      for (var i=0; i<arrs.length; ++i) {
        assert.deepEqual(dec(enc(arrs[i])), drop_false_suffix(arrs[i]), "loop"+i);
      }
    });

  
  
    QUnit.test( "ipe_mask_tests", function( assert ) {
      var enc = ipe_encode, dec = ipe_decode, rm = ipe_mask;
      var f = false, t = true;
  
      var ff = function (x) { return f; };
      var tt = function (x) { return t; };
      var neg = function (x) { return !x; };
      var id = function (x) { return x; };
  
      assert.deepEqual(enc([t, t, f, f]), [0, 2]);    
      assert.deepEqual(enc([t, t, f, f, t]), [0, 2, 4, 5]);    
      assert.deepEqual(enc([t, t, t]), [0, 3]);
      assert.deepEqual(enc([f, t, f]), [1, 2]);
      assert.deepEqual((rm(enc([f, t, f]), neg, enc([t, t, t]))), [0, 1, 2, 3], "1");
      assert.deepEqual(dec(rm(enc([f, f, f]), neg, enc([t, t, t]))), [t, t, t]);
      assert.deepEqual(dec(rm(enc([t, t, t]), neg, enc([t, t, t]))), []);
      assert.deepEqual(dec(rm(enc([t, f, f]), neg, enc([t, t, t]))), [f, t, t]);
  
      assert.deepEqual(dec(rm(enc([f, f, f]), id, enc([t, t, f]))), [t, t]);
      assert.deepEqual(dec(rm(enc([t, t, t]), id, enc([t, t, f]))), [t, t]);
      assert.deepEqual(dec(rm(enc([t, f, f]), id, enc([t, t, f]))), [t, t]);
  
      assert.deepEqual(dec(rm(enc([f, f, f]), tt, enc([f, t, f]))), [f, t]);
      assert.deepEqual(dec(rm(enc([t, t, t]), tt, enc([f, t, f]))), [t, t, t]);
      assert.deepEqual(dec(rm(enc([t, f, f]), tt, enc([f, t, f]))), [t, t]);
  
      assert.deepEqual(dec(rm(enc([f, f, f]), ff, enc([t, t, t]))), [t, t, t]);
      assert.deepEqual(dec(rm(enc([t, t, t]), ff, enc([t, t, t]))), []);
      assert.deepEqual(dec(rm(enc([t, f, f]), ff, enc([t, t, t]))), [f, t, t]);
    });
  
    QUnit.test( "ipe_diff_tests", function( assert ) {
      var enc = ipe_encode, dec = ipe_decode, rm = ipe_diff;
      var f = false, t = true;
  
      assert.deepEqual(dec(rm(enc([f, f, f]), enc([t, t, t]))), [t, t, t]);
      assert.deepEqual(dec(rm(enc([t, t, t]), enc([t, t, t]))), []);
      assert.deepEqual(dec(rm(enc([t, f, f]), enc([t, t, t]))), [f, t, t]);
      assert.deepEqual(dec(rm(enc([t, t, t]), enc([f, t, f]))), [t, f, t]);
    });
    QUnit.test( "ipe_at", function( assert ) {
      assert.equal(ipe_at([], 0), false, "");
      assert.equal(ipe_at([], 3), false, "");
  
      assert.equal(ipe_at([1, 2, 3, 4], 0), false, "");
      assert.equal(ipe_at([1, 2, 3, 4], 1), true, "");
      assert.equal(ipe_at([1, 2, 3, 4], 2), false, "");
      assert.equal(ipe_at([1, 2, 3, 4], 3), true, "");
      assert.equal(ipe_at([1, 2, 3, 4], 4), false, "");
      assert.equal(ipe_at([1, 2, 3, 4], 5), false, "");
    });

    QUnit.test( "ipe_storage test", function( assert ) {
      var ops = new IpeStorage();
  
      function makeIpeOp (f, domain) {
        return { f: f, domain: domain };
      }
  
      assert.deepEqual(ops.selected(), [], "ipe_op_comp 1");
      ops.push(makeIpeOp(b => b, [2, 4]));
      assert.deepEqual(ops.selected(), []);
      ops.push(makeIpeOp(b => !b, [2, 4]));
      assert.deepEqual(ops.selected(), [2, 4]);
      assert.equal(ops.at(1), false);
      assert.equal(ops.at(2), true);
      assert.equal(ops.at(3), true);
      assert.equal(ops.at(4), false);
      assert.equal(ops.at(5), false);
      ops.push(makeIpeOp(b => true, [4, 6]));
      assert.deepEqual(ops.selected(), [2, 6]);
      ops.push(makeIpeOp(b => false, [3, 4]));
      assert.deepEqual(ops.selected(), [2, 3, 4, 6]);
  
      ops.pop();
      assert.deepEqual(ops.selected(), [2, 6]);
      ops.pop();
      assert.deepEqual(ops.selected(), [2, 4]);
      ops.pop();
      assert.deepEqual(ops.selected(), []);
      ops.pop();
      assert.deepEqual(ops.selected(), []);
      assert.equal(ops.size(), 0, "size test");
    });
  
    QUnit.test( "ipe_storage selection state test", function( assert ) {
      var ops = new IpeStorage();
      var sel = new multiselect.SelectionState(new IpeOrderedGeometry(10),
                                               undefined,
                                               false,
                                               10,
                                               new IpeStorage());
      sel.click(3);
      sel.shiftClick(6);
      assert.deepEqual(sel.selected(), [3, 7]);
      sel.cmdClick(1);
      assert.deepEqual(sel.selected(), [1, 2, 3, 7]);
      sel.cmdClick(5);
      assert.deepEqual(sel.selected(), [1, 2, 3, 5, 6, 7]);
      sel.shiftClick(4);
      assert.deepEqual(sel.selected(), [1, 2, 3, 4, 6, 7]);
    });
    
                                   
                                   

    QUnit.test( "ipe ordered geometry test", function( assert ) {
      var g = new IpeOrderedGeometry(10);
  
      assert.deepEqual(g.selectionDomain([3, 6]), [3, 7]);
      assert.deepEqual(g.selectionDomain([6, 3]), [3, 7]);
      assert.deepEqual(g.selectionDomain([6, 100, 22, 2, 3]), [3, 7]);
      assert.deepEqual(g.selectionDomain([]), []);
  
      assert.deepEqual(g.filter((i) => i == 7 || i == 8), [7, 9]);
    });
