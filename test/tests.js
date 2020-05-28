var test = QUnit.test;

// including some private functions in the library so
// that they can be tested
  function tt(_)  { return true; };  tt.constant  = true;
  function ff(_)  { return false; }; ff.constant  = true;
  function id(b)  { return b; };     id.constant  = false;
  function not(b) { return !b; };    not.constant = false;
  function makeOp (f, domain) { return { f: f, domain: domain }; }
    function makeOpFunction (op) {
      if (op.f.constant) {
        return function (s) {
          return function (i) {
            return (op.domain.has(i)) ? op.f() : s(i);
          }
        }
      } else {
        return function (s) {
          return function (i) {
            return (op.domain.has(i)) ? op.f(s(i)) : s(i);
          }
        }
      }
    }

  function makeBaseSelectionMapping () {
    var s = new Set();

    var func = function (i) { return s.has(i); };

    func.set = function (i, v) {
      if (v === true) s.add(i); else s.delete(i); 
    }

    func.selectedIndices = function() { return s.keys(); } 

    func.bake = function (op) {
      var s2 = makeOpFunction(op)(func);
      op.domain.forEach(function(_, i) { func.set(i, s2(i)); });
    }

    return func;
  }

  function isEmpty(collection) { return collection.size === 0; }
  function isSingleton(collection) { return collection.size === 1; }

  function firstKey(collection) {  
    // The body should be:
    //   return collection.keys().next().value; 
    // but Safari 8 does not support .next, therefore the workarounds below

    if (typeof collection.keys().next === 'function') {
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
    function MapStorage () {
      this._ops = [];                
      this._baked = makeBaseSelectionMapping();

      this._domain = new Map(); 
      this._gen = 0;         
   }

   // member functions of func
     MapStorage.prototype.at = function(i) { 
       var self = this;
       return evaluate(this._domain.has(i) ? (this._ops.length-1) - (this._gen-this._domain.get(i)) : -1, i)(i); 
   
       // determine selection state of i but only access the elements 
       // of ops (staring from ind) that have i in their domain
       function evaluate(ind, i) {
          if (ind < 0) return self._baked; // i defined in the base selection mapping baked
          else {
            var op = self._ops[ind];
            return op.applyOp(function (j) { return evaluate(ind - op.domain.get(i), j)(i); });
            // the call to evaluate is wrapped to a lambda to make the call lazy.
            // op will only call the lambda if op.f.constant is false.
            // For explanation of applyOp, see the push function
          }
       } 
    }
     MapStorage.prototype.selected = function () {
       var J = new Map();
       for (var i of this._baked.selectedIndices()) if (this.at(i)) J.set(i, true);
       for (var i of this._domain.keys()) if (this.at(i)) J.set(i, true);
       return J;
     }
     MapStorage.prototype.push = function (op, changed) {
       if (changed !== undefined) 
         changed.value = diffOp(op, this, changed.value, false);
       this._ops.push(op);
       ++(this._gen);
       var self = this;
       op.domain.forEach(function(_, i) {
         op.domain.set(i, self._domain.has(i) ? self._gen - self._domain.get(i) : self._ops.length);
         self._domain.set(i, self._gen); 
       });
       op.applyOp = makeOpFunction(op);
     }
     MapStorage.prototype.pop = function (changed) {
       var n = this._ops.length;
       var op = this._ops.pop();
       --(this._gen);
       var self = this;
       // domain updated for those elements that are in op.domain
       op.domain.forEach(function (_, i) {
         if (op.domain.get(i) >= n) self._domain.delete(i); // no op defines i
         else self._domain.set(i, self._domain.get(i) - op.domain.get(i)); 
       });
       if (changed !== undefined) {
         changed.value = diffOp(op, self, changed.value, true);
       }
       return op;
     }
     MapStorage.prototype.top = function () { return this._ops[this._ops.length - 1]; }
     MapStorage.prototype.top2 = function () { return this._ops[this._ops.length - 2]; }
     MapStorage.prototype.size = function () { return this._ops.length; }
     MapStorage.prototype.bake = function () { return this._baked.bake(this._shift()); }          
   
     MapStorage.prototype._shift = function () {
       var op = this._ops.shift();
       var self = this;
       op.domain.forEach(function(_, i) {
         if (self._domain.get(i) - self._gen === self._ops.length) { self._domain.delete(i); }
         // if lastOp the only op that defines i, remove i from domain
       });
       return op;
     }
     MapStorage.prototype.onSelected = function (J) {
       return isSingleton(J) && this.at(firstKey(J));
     }
     MapStorage.prototype.modifyStorage = function (cmd) {
       if (cmd.remove !== true) return; // command not recognized
       var i = cmd.value;
       if (!this._domain.has(i)) return; // nothing to remove
   
       // find the first op in ops that defines i
       var j = (this._ops.length - 1) - (this._gen - this._domain.get(i));
   
       while (j >= 0) {
         var d = this._ops[j].domain.get(i);
         this._ops[j].domain.delete(i);
         j -= d;
       }
       this._domain.delete(i);
       this._baked.set(i, false);
     }
     MapStorage.prototype.equalDomains = function (J1, J2) { return equalKeys(J1, J2); }
     MapStorage.prototype.isEmpty = function (J) { return isEmpty(J); }

   // helper functions
         function diffOp(op, m, changed, flip) {
           if (changed === undefined) changed = new Map();
           op.domain.forEach(function(_, i) {
             var b = m.at(i);
             if (op.f(b) !== b) { 
               if (changed.has(i)) changed.delete(i); 
               else changed.set(i, flip ? b : op.f(b)); 
             }
           });
           return changed;
         }

  var DefaultGeometry = function () {};

  DefaultGeometry.prototype = {
    m2v : function (mp) { return mp; },
    extendPath : function (path, vp, cache, cursor) { path.push(vp); },
    step : function (dir, vp) { return vp; },
    selectionDomain : function(spath, J, cache) { 
      var m = new Map();
      for (var i of spath) m.set(i, true); 
      return m;
    },
    defaultCursor : function(dir) { return undefined; },
    filter : undefined
  };
      var UP = 1, DOWN = 2, LEFT = 3, RIGHT = 4, NO_DIRECTION = 0;
      function anchor(path) { 
         if (path.length === 0) return undefined; 
         return path[0]; 
      };
      function activeEnd(path) { 
         if (path.length === 0) return undefined; 
         return path[path.length - 1]; 
      };

  // generate a property map that maps the labels given as arguments to true
  function dom(args) {
    var d = new Map();
    for (var i in arguments) { d.set(arguments[i], true); }
    return d;
  }

  // shallow equality of arrays
  // precondition: a and b are arrays
  function arrayEquals(a, b) {
    if (a === b) return true;
    if (a.length !== b.length) return false;

    for (var i = 0; i < a.length; ++i) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  test("Utilities tests", function (t) {
    
    var s = new Set();
    var m = new Map();

    t.ok(isEmpty(s), "isEmpty 1");
    t.ok(isEmpty(m), "isEmpty 2");

    t.ok(!isSingleton(s), "isSingleton 1");
    t.ok(!isSingleton(m), "isSingleton 2");

    t.equal(firstKey(s), undefined, "firstKey 1");
    t.equal(firstKey(m), undefined, "firstKey 2");

    t.ok(equalKeys(s, m), "equalKeys 1");

    // add 1st elem to both
    s.add(1); m.set(1, true);

    t.ok(isSingleton(s), "isSingleton 3");
    t.ok(isSingleton(m), "isSingleton 4");

    t.ok(!isEmpty(s));
    t.ok(!isEmpty(m));

    t.equal(firstKey(s), 1, "firstKey 3");
    t.equal(firstKey(m), 1, "firstKey 4");

    // add 2nd elem to both
    s.add(2); m.set(2, true);
    t.ok(!isSingleton(s)), "not singleton 1";
    t.ok(!isSingleton(m)), "not singleton 2";

    t.equal(firstKey(s), 1, "firstKey 5");
    t.equal(firstKey(m), 1, "firstKey 6");
        
    t.ok(equalKeys(s, m), "equalKeys 2");

    // add 3rd to s
    s.add(3);
    t.ok(!equalKeys(s, m), "not equalKeys");
  });
  test("Baking tests", function (t) {

    var s = makeBaseSelectionMapping();
    var F = false, T = true;
    
    s.bake(makeOp(tt, dom())); // select no elements
    t.ok(arrayEquals([0, 1, 2, 3, 4].map(s),
                     [F, F, F, F, F]), "bake empty domain");
    
    s.bake(makeOp(tt, dom(1, 3))); // select 1 and 3
    t.ok(arrayEquals([0, 1, 2, 3, 4].map(s),
                     [F, T, F, T, F]), "bake 1 and 3 true");
    
    s.bake(makeOp(ff, dom(1, 2))); // deselect 1 and 2
    t.ok(arrayEquals([0, 1, 2, 3, 4].map(s), 
                     [F, F, F, T, F]), "bake 1 and 2 false");
    
    s.bake(makeOp(not, dom(1, 3))); // flip 1 and 3
    t.ok(arrayEquals([0, 1, 2, 3, 4].map(s), 
                     [F, T, F, F, F]), "negate 1 and 3");
  });
  test ("Primitive selection operation tests", function (t) {

    var F = false, T = true;
 
    var s = makeOpFunction(makeOp(tt, new Map()))(makeBaseSelectionMapping());
    t.ok(arrayEquals([0, 1, 2, 3].map(s), 
                     [F, F, F, F]), "empty domain");

    s = makeOpFunction(makeOp(tt, dom(1, 3)))(s);
    t.ok(arrayEquals([0, 1, 2, 3].map(s), 
                     [F, T, F, T]), "true function");

    s = makeOpFunction(makeOp(ff, dom(1, 3)))(s);
    t.ok(arrayEquals([0, 1, 2, 3].map(s), 
                     [F, F, F, F]), "false function");

    s = makeOpFunction(makeOp(not, dom(1, 3)))(s);
    t.ok(arrayEquals([0, 1, 2, 3].map(s), 
                     [F, T, F, T]), "negation function");

  });
        test ("Map storage modify storage tests", function (t) {
  
          var stor = new MapStorage();
          var comp = stor.at.bind(stor);
  
          stor.push(makeOp(tt, dom(0)));
          stor.push(makeOp(tt, dom(1)));
          stor.push(makeOp(ff, dom(0)));
          stor.push(makeOp(tt, dom(0, 1)));
          t.ok(arrayEquals([0, 1].map(comp), [true, true]), "removeIndex 1");
          stor.modifyStorage({remove: true, value: 1});
          t.ok(arrayEquals([0, 1].map(comp), [true, false]), "removeIndex 2");
          stor.modifyStorage({remove: true, value: 0});
          t.ok(arrayEquals([0, 1].map(comp), [false, false]), "removeIndex 3");
        });

  test ("Map storage tests", function (t) {

    var stor = new MapStorage();
    var comp = stor.at.bind(stor);

    var F = false, T = true;

    t.ok(arrayEquals([0, 1, 2].map(comp), [F, F, F]), "empty");
   
    stor.push(makeOp(tt, dom(1)));
    t.ok(arrayEquals([0, 1, 2].map(comp), [F, T, F]), "add 1");

    stor.push(makeOp(not, dom(0, 1, 2)));
    t.ok(arrayEquals([0, 1, 2].map(comp), [T, F, T]), "add 2");

    stor.push(makeOp(ff, dom(0, 1)));
    t.ok(arrayEquals([0, 1, 2].map(comp), [F, F, T]), "add 3");

    stor.pop();
    t.ok(arrayEquals([0, 1, 2].map(comp), [T, F, T]), "pop 1");

    stor.pop();
    t.ok(arrayEquals([0, 1, 2].map(comp), [F, T, F]), "pop 2");

    stor.pop();
    t.ok(arrayEquals([0, 1, 2].map(comp), [F, F, F]), "empty");

    // push three ops
    stor.push(makeOp(not, dom(0, 2)));
    stor.push(makeOp(tt,  dom(1, 2)));
    stor.push(makeOp(not, dom(0, 1)));
    t.ok(arrayEquals([0, 1, 2].map(comp), [F, F, T]), "add 3 again");

    stor._shift(); 
    t.ok(arrayEquals([0, 1, 2].map(comp), [T, F, T]), "shift 1");

    stor._shift(); 
    t.ok(arrayEquals([0, 1, 2].map(comp), [T, T, F]), "shift 2");

    stor._shift(); 
    t.ok(arrayEquals([0, 1, 2].map(comp), [F, F, F]), "shift 3");
   
  });
  test ("Selection state tests click", function (t) {

    var M = multiselect; 
    var G = multiselect_ordered_geometries;

    var s = new M.SelectionState(new G.OrderedGeometry(20), function () {}, false, 10);
    function cur(i) { return s.isSelected(i); }
    s.click(1);
    t.ok(s.isSelected(1), "click 0");
    t.ok(arrayEquals([0, 1, 2].map(cur), [false, true, false]), "click 1");
    s.click(2);
    t.ok(arrayEquals([0, 1, 2].map(cur), [false, false, true]), "click 2");
    s.click(1);
    t.ok(arrayEquals([0, 1, 2].map(cur), [false, true, false]), "click 3");    
  });

  test ("Selection state tests shiftClick", function (t) {

    var M = multiselect;
    var G = multiselect_ordered_geometries;

    var s = new M.SelectionState(new G.OrderedGeometry(20));
    function cur(i) { return s.isSelected(i); }

    s.shiftClick(1); 
    t.ok(arrayEquals([0, 1, 2].map(cur), [false, true, false]), "shiftClick 1");
    s.shiftClick(2); 
    t.ok(arrayEquals([0, 1, 2].map(cur), [false, true, true]), "shiftClick 2");
    s.shiftClick(1); 
    t.ok(arrayEquals([0, 1, 2].map(cur), [false, true, false]), "shiftClick 3");
    s.shiftClick(0); 
    t.ok(arrayEquals([0, 1, 2].map(cur), [true, true, false]), "shiftClick 4");

    s.click(null);
    s.shiftClick(1);
    s.shiftClick(2);
    s.shiftClick(1);
    s.shiftClick(0);
    s._flush();
    t.ok(arrayEquals([0, 1, 2].map(cur), [true, true, false]), "shiftClick 5");     
  });

  test ("Selection state tests cmdClick", function (t) {

    var M = multiselect;
    var G = multiselect_ordered_geometries;

    var s = new M.SelectionState(new G.OrderedGeometry(20));
    function cur(i) { return s.isSelected(i); }

    s.cmdClick(1);
    t.deepEqual([0, 1, 2].map(cur), [false, true, false], "cmdClick 1");
    s.cmdClick(2);
    t.deepEqual([0, 1, 2].map(cur), [false, true, true], "cmdClick 2");
    s.cmdClick(1);
    t.deepEqual([0, 1, 2].map(cur), [false, false, true], "cmdClick 3");
    s.cmdClick(0);
    t.deepEqual([0, 1, 2].map(cur), [true, false, true], "cmdClick 4");
  });

  test ("Repeat click tests", function (t) {

    var M = multiselect;
    var G = multiselect_ordered_geometries;

    var s = new M.SelectionState(new G.OrderedGeometry(20), function(){}, false, 20);
    function cur(i) { return s.isSelected(i); }

    t.equal(s._storage.size(), 0, "repeat cmdClick 0"); 
    s.cmdClick(1); // mode after is tt
    t.equal(s._storage.size(), 2, "repeat cmdClick 1"); 
    t.ok(cur(1));
    s.cmdClick(1); // mode after is ff
    t.equal(s._storage.size(), 4, "repeat cmdClick 2"); 
    t.ok(!cur(1));
    // clicks on negative coordinates give an empty J
    s.cmdClick(-1); // mode after is tt, since mode was ff, should push
    t.equal(s._storage.size(), 6, "repeat cmdClick 3");
    s.cmdClick(-1); // this now should not push
    t.equal(s._storage.size(), 6, "repeat cmdClick 4");
    s.cmdClick(-2); // nor this
    t.equal(s._storage.size(), 6, "repeat cmdClick 5");
    t.ok(!cur(1), "repeat cmdClick is 1 selected");
    s.shiftClick(1); 
    t.ok(cur(1), "repeat cmdClick is 1 selected");
    t.equal(s._storage.size(), 6, "repeat cmdClick 5b");
    s.cmdClick(-1);
    t.equal(s._storage.size(), 8, "repeat cmdClick 6a");
    // test that the topmost is tt function (a const true function)
    var func = s._storage.top().f;
    t.ok(func(true) && func(false), "repeat cmdClick 6b");
    s.shiftClick(10);
    s.shiftClick(-1); 
    s.cmdClick(-1); // should not push
    t.equal(s._storage.size(), 8, "repeat cmdClick 7");

    // reset s
    s = new M.SelectionState(new G.OrderedGeometry(20), function(){}, false, 20);
    s.cmdClick(1); 
    t.equal(s._storage.size(), 2, "repeat cmdClick 2 1");
    s.cmdClick(1); 
    t.equal(s._storage.size(), 4, "repeat cmdClick 2 2");
    s.cmdClick(-1); 
    t.equal(s._storage.size(), 6, "repeat cmdClick 2 3");

    // reset s
    s = new M.SelectionState(new G.OrderedGeometry(20), function(){}, false, 20);

    s.click(1); 
    t.equal(s._storage.size(), 2, "repeat click 1");
    s.click(1); 
    t.equal(s._storage.size(), 2, "repeat click 2");

    s.click(2); 
    t.equal(s._storage.size(), 4, "repeat click 3");
    s.click(-1); 
    t.equal(s._storage.size(), 6, "repeat click 4");
    s.click(-2); 
    t.equal(s._storage.size(), 6, "repeat click 5");

    s.cmdClick(1); 
    t.equal(s._storage.size(), 8, "repeat click 8");
    s.click(1); 
    t.equal(s._storage.size(), 10, "repeat click 9");
    s.cmdClick(1); 
    t.equal(s._storage.size(), 12, "repeat click 10");
    s.click(-1); 
    t.equal(s._storage.size(), 14, "repeat click 11");

    s = new M.SelectionState(new G.OrderedGeometry(20), function(){}, false, 20);

    t.equal(s._storage.size(), 0, "shift-click size 0");
    s.shiftClick(1); s._flush();
    t.equal(s._storage.size(), 2, "shift-click size 1");
    s.shiftClick(2); s._flush();
    t.equal(s._storage.size(), 2, "shift-click size 2");
  });


  test ("Selection state tests onSelected", function (t) {

    var M = multiselect;
    var G = multiselect_ordered_geometries;

    var s = new M.SelectionState(new G.OrderedGeometry(20), function () {}, false, 10);
    function cur(i) { return s.isSelected(i); }
    s.click(1);
    t.ok(s.onSelected(1), "onSelected 1");
    t.ok(!s.onSelected(0), "onSelected 2");
  });

  test ("Undo tests", function (t) {

    var M = multiselect;
    var G = multiselect_ordered_geometries;

    var s = new M.SelectionState(new G.OrderedGeometry(20));
    function cur(i) { return s.isSelected(i); }

    s.cmdClick(1);
    t.equal(s._storage.size(), 2);
    t.deepEqual([0, 1, 2].map(cur), [false, true, false], "undoable action 1");
    s.cmdClick(2);
    t.equal(s._storage.size(), 4);
    t.deepEqual([0, 1, 2].map(cur), [false, true, true], "undoable action 2");
    s.cmdClick(1);
    t.equal(s._storage.size(), 6);
    t.deepEqual([0, 1, 2].map(cur), [false, false, true], "undoable action 3");
    s.cmdClick(0);
    t.equal(s._storage.size(), 8);
    t.deepEqual([0, 1, 2].map(cur), [true, false, true], "undoable action 2");
    s.click(0);
    t.equal(s._storage.size(), 10);
    t.deepEqual([0, 1, 2].map(cur), [true, false, false], "undo 0");
    s.undo();
    t.equal(s._storage.size(), 8);
    t.deepEqual([0, 1, 2].map(cur), [true, false, true], "undo 1");
    s.undo();
    t.equal(s._storage.size(), 6);
    t.deepEqual([0, 1, 2].map(cur), [false, false, true], "undo 2");
    s.undo();
    t.equal(s._storage.size(), 4);
    t.deepEqual([0, 1, 2].map(cur), [false, true, true], "undo 3");
    s.undo();
    t.equal(s._storage.size(), 2);
    t.deepEqual([0, 1, 2].map(cur), [false, true, false], "undo 4");
    s.undo();
    t.equal(s._storage.size(), 0);
    t.deepEqual([0, 1, 2].map(cur), [false, false, false], "undo 5");
    s.undo();
    t.equal(s._storage.size(), 0);
    t.deepEqual([0, 1, 2].map(cur), [false, false, false], "undo 5 again");
    s.undo();
    t.equal(s._storage.size(), 0);

    function m2a(m) {
      var a = [false, false, false]; 
      for (var i = 0; i<3; ++i) if (m.get(i) === true) a[i] = true;
      return a;
    }
    var changed = null;
    s = new M.SelectionState(new G.OrderedGeometry(20),
                             function (m, smap) { changed = m2a(smap); }, true);
    s.cmdClick(1);
    t.deepEqual(changed, [false, true, false], "undoable action 1");
    s.cmdClick(2);
    t.equal(s._storage.size(), 4);
    t.deepEqual([0, 1, 2].map(cur), [false, true, true], "undoable action 2");
    s.cmdClick(1);
    t.equal(s._storage.size(), 6);
    t.deepEqual([0, 1, 2].map(cur), [false, false, true], "undoable action 3");
    s.cmdClick(0);
    t.equal(s._storage.size(), 8);
    t.deepEqual([0, 1, 2].map(cur), [true, false, true], "undoable action 2");
    s.click(0);
    t.equal(s._storage.size(), 10);
    t.deepEqual([0, 1, 2].map(cur), [true, false, false], "undo 0b");
    s.undo();
    t.equal(s._storage.size(), 8);
    t.deepEqual([0, 1, 2].map(cur), [true, false, true], "undo 1b");
    s.undo();
    t.equal(s._storage.size(), 6);
    t.deepEqual([0, 1, 2].map(cur), [false, false, true], "undo 2");
    s.undo();
    t.equal(s._storage.size(),  4);
    t.deepEqual([0, 1, 2].map(cur), [false, true, true], "undo 3");
    s.undo();
    t.equal(s._storage.size(), 2);
    t.deepEqual([0, 1, 2].map(cur), [false, true, false], "undo 4");
    s.undo();
    t.equal(s._storage.size(), 0);
    t.deepEqual([0, 1, 2].map(cur), [false, false, false], "undo 5");
    s.undo();
    t.equal(s._storage.size(), 0);
    t.deepEqual([0, 1, 2].map(cur), [false, false, false], "undo 5 again");
    s.undo();
    t.equal(s._storage.size(), 0);
  });

  test ("Redo tests", function (t) {

    var M = multiselect;
    var G = multiselect_ordered_geometries;

    var s = new M.SelectionState(new G.OrderedGeometry(20));
    function cur(i) { return s.isSelected(i); }

    s.cmdClick(1);
    t.deepEqual([0, 1, 2].map(cur), [false, true, false], "redo-init 1");    
    s.cmdClick(2);
    t.deepEqual([0, 1, 2].map(cur), [false, true, true], "redo-init 2");
    s.cmdClick(1);
    t.deepEqual([0, 1, 2].map(cur), [false, false, true], "redo-init 3");
    s.cmdClick(0);
    t.deepEqual([0, 1, 2].map(cur), [true, false, true], "redo-init 4");
    s.click(0);
    t.deepEqual([0, 1, 2].map(cur), [true, false, false], "redo-init 5");

    s.undo(); s.undo(); s.undo(); s.undo(); s.undo(); s.undo(); s.undo(); 
    // more undos the commands; last one(s) should have no effect
    t.deepEqual([0, 1, 2].map(cur), [false, false, false], "redo 0");
    s.redo();
    t.deepEqual([0, 1, 2].map(cur), [false, true, false], "redo 1");
    s.redo();
    t.deepEqual([0, 1, 2].map(cur), [false, true, true], "redo 2");
    s.redo();
    t.deepEqual([0, 1, 2].map(cur), [false, false, true], "redo 3");
    s.redo();
    t.deepEqual([0, 1, 2].map(cur), [true, false, true], "redo 4");
    s.redo();
    t.deepEqual([0, 1, 2].map(cur), [true, false, false], "redo 5");
    // redo stack should be empty
    s.redo();
    t.deepEqual([0, 1, 2].map(cur), [true, false, false], "redo 5 again");

    s = new M.SelectionState(new G.OrderedGeometry(20));
    s.shiftClick(1);
    t.deepEqual([0, 1, 2].map(cur), [false, true, false], "redo A1");
    s.cmdClick(2);
    t.deepEqual([0, 1, 2].map(cur), [false, true, true], "redo A2");
    s.undo();
    t.deepEqual([0, 1, 2].map(cur), [false, true, false], "redo A3");
    s.undo();
    t.deepEqual([0, 1, 2].map(cur), [false, false, false], "redo A4");
  });

  test ("Redo stack limit test", function (t) {

    var M = multiselect;
    var G = multiselect_ordered_geometries;

    var s = new M.SelectionState(new G.OrderedGeometry(20), function(){}, false, 1);
    function cur(i) { return s.isSelected(i); }
    s.redo();
    t.equal(s._storage.size(), 0, "");
    s.undo();
    t.equal(s._storage.size(), 0, "");
    s.redo();
    t.equal(s._storage.size(), 0, "");
    s.redo();
    t.equal(s._storage.size(), 0, "");
    s.cmdClick(1); 
    t.equal(s._storage.size(), 2, "min undo 0");
    t.deepEqual([0, 1, 2].map(cur), [false, true, false], "");
    s.undo();
    t.equal(s._storage.size(), 0, "min undo 1");
    t.deepEqual([0, 1, 2].map(cur), [false, false, false], "");
    s.redo();
    t.equal(s._storage.size(), 2, "min undo 2");
    t.deepEqual([0, 1, 2].map(cur), [false, true, false], "");
    s.redo();
    t.equal(s._storage.size(), 2, "min undo 2b");
    s.cmdClick(2); 
    t.equal(s._storage.size(), 2, "min undo 3");
    t.deepEqual([0, 1, 2].map(cur), [false, true, true], "");
    s.undo();
    t.equal(s._storage.size(), 0, "min undo 4");
    t.deepEqual([0, 1, 2].map(cur), [false, true, false], "");
    s.redo();
    t.equal(s._storage.size(), 2, "min undo 5");
    t.deepEqual([0, 1, 2].map(cur), [false, true, true], "");
    s.redo();
    t.equal(s._storage.size(), 2, "min undo 6");
    t.deepEqual([0, 1, 2].map(cur), [false, true, true], "");

    s = new M.SelectionState(new G.OrderedGeometry(20), function(){}, false, 3);
    s.cmdClick(1); 
    t.equal(s._storage.size(), 2, "redostack 1a");
    t.equal(s._redoStack.length, 0, "redostack 1b");
    s.undo();
    t.equal(s._storage.size(), 0, "redostack 2a");
    t.equal(s._redoStack.length, 2, "redostack 2b");
    s.cmdClick(2); 
    t.equal(s._storage.size(), 2, "redostack 3a");
    t.equal(s._redoStack.length, 2, "redostack 3b");
    s.undo(); 
    t.equal(s._storage.size(), 0, "redostack 4a");
    t.equal(s._redoStack.length, 4, "redostack 4b");
    s.cmdClick(3); 
    t.equal(s._storage.size(), 2, "redostack 5a"); 
    t.equal(s._redoStack.length, 4, "redostack 5b");
    s.cmdClick(4); 
    t.equal(s._storage.size(), 4, "redostack 6a");
    t.equal(s._redoStack.length, 4, "redostack 6b");
    s.cmdClick(5);     
    s.cmdClick(6); 
    t.equal(s._storage.size(), 6, "redostack 7a"); // should be 8, but we are at limit
    t.equal(s._redoStack.length, 4, "redostack 7b");
    s.undo();
    t.equal(s._storage.size(), 4, "redostack 8a"); 
    t.equal(s._redoStack.length, 6, "redostack 8b"); 
    s.undo();
    t.equal(s._storage.size(), 2, "redostack 9a");
    t.equal(s._redoStack.length, 6, "redostack 9b"); // at limit
    s.click(1);
    t.equal(s._storage.size(), 4, "redostack 10a"); 
    t.equal(s._redoStack.length, 6, "redostack 10b"); 
    s.redo();
    t.equal(s._storage.size(), 6, "redostack 11a"); 
    t.equal(s._redoStack.length, 4, "redostack 11b"); 
  });

  test ("Changed tracking tests", function (t) {

    var changed;
    var M = multiselect;
    var G = multiselect_ordered_geometries;

    var s = new M.SelectionState(new G.OrderedGeometry(20), 
                                 function(m, c) { changed = c; }, true);

    s.click(1);
    t.ok(equalKeys(changed, dom(1)), "tracking 1");
    t.equal(changed.get(1), true, "tracking 1b");
    changed = null;
    s.click(1); // should be a nop, so refresh not called
    t.equal(changed, null, "tracking 2");
    s.cmdClick(1);
    t.ok(equalKeys(changed, dom(1)), "tracking 3");
    t.equal(changed.get(1), false);
    s.click(2);
    t.ok(equalKeys(changed, dom(2)), "tracking 4");
    t.equal(changed.get(2), true);
    s.shiftClick(4); s._flush();
    t.ok(equalKeys(changed, dom(3, 4)), "tracking 5");
    t.equal(changed.get(3), true);
    t.equal(changed.get(4), true);
  });

  test ("Predicate selection tests", function (t) {

    var M = multiselect;
    var G = multiselect_ordered_geometries;

    var s = new M.SelectionState(new G.OrderedGeometry(20), function() {});
    function cur(i) { return s.isSelected(i); }

    s.predicateSelect(function (i) { return i === 1 || i === 3; });
    t.deepEqual([0, 1, 2, 3].map(cur), [false, true, false, true], "");
    s.predicateSelect(function (i) { return i === 1 || i === 2; });
    t.deepEqual([0, 1, 2, 3].map(cur), [false, true, true, false], "");
    s.predicateSelect(function (i) { return true; });
    t.deepEqual([0, 1, 2, 3].map(cur), [true, true, true, true], "");
    s.predicateSelect(function (i) { return i === 1 || i === 2; });
    s.commit();
    s.predicateSelect(function (i) { return i === 0; });
    t.deepEqual([0, 1, 2, 3].map(cur), [true, true, true, false], "");

    var changed;
    var s = new M.SelectionState(new G.OrderedGeometry(20), 
                                 function(m, c) { changed = c; }, true);
    s.predicateSelect(function (i) { return i === 1 || i === 3; }, true); // [1, 3] selected
    t.equal(changed.size, 2, "predicate-select with change tracking 1");
    t.ok(changed.get(1) === true && changed.get(3) === true);
    t.equal(cur(0), false, "a");
    t.equal(cur(1), true, "b");
    t.equal(cur(2), false, "c");
    t.equal(cur(3), true, "d");
    s.predicateSelect(function (i) { return i === 1 || i === 2; }, false); // [3] selected
    // this commits, since selection mode changes
    t.equal(cur(0), false, "a");
    t.equal(cur(1), false, "b");
    t.equal(cur(2), false, "c");
    t.equal(cur(3), true, "d");

    t.equal(changed.size, 1, "predicate-select with change tracking 2");
    t.equal(changed.get(0), undefined);
    t.equal(changed.get(1), false);
    t.equal(changed.get(2), undefined);
    t.equal(changed.get(3), undefined);
    s.predicateSelect(function (i) { return true; }, false); // [] selected
    t.equal(changed.size, 1); 
    t.equal(changed.get(3), false);
    // test commit:
    s.predicateSelect(function (i) { return i === 1 || i === 3; }, true); // [1, 3] selected
    t.equal(changed.size, 2, "commit tests");
    t.ok(changed.get(1) === true && changed.get(3) === true);    
    s.commit();
    s.predicateSelect(function (i) { return i === 1 || i === 2; }, true); // [1, 2, 3] selected
    t.equal(changed.size, 1);
    t.ok(changed.get(2) === true);    
  });

  test ("remove index tests", function (t) {

    var M = multiselect;
    var G = multiselect_ordered_geometries;

    var s = new M.SelectionState(new G.OrderedGeometry(20));
    function cur(i) { return s.isSelected(i); }

    s.cmdClick(1);
    s.cmdClick(3);
    s.cmdClick(4);
    t.deepEqual([0, 1, 2, 3, 4].map(cur), [false, true, false, true, true], "selection removeIndex 1");
    s.modifyStorage({remove: true, value: 1});
    t.deepEqual([0, 1, 2, 3, 4].map(cur), [false, false, false, true, true], "selection removeIndex 2");
  });
