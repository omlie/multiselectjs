(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.multiselect_html_geometries = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var dg = require("./multiselect.js");
var util = require("./utilities.js");

//////////////////////////
// HTMLElementsGeometry //
//////////////////////////

// The selectable elements in are HTML elements, and all geometries need access to their location and extents information. The HTMLElementsGeometry
// provides this. All other geometries derive from HTMLElementsGeometry.

function HTMLElementsGeometry(parent, elements) {
  this.parent = parent;
  this.elements = elements;
}
HTMLElementsGeometry.prototype = Object.create(dg.DefaultGeometry.prototype);

// HTMLElementGeometry's filter function can be reused by other geometries. Iterating over all elements is the same for all geometries in this
// application.
HTMLElementsGeometry.prototype.filter = function (p) {
  var J = new Map();
  for (var i = 0; i < this.elements.length; ++i) if (p(i)) J.set(i, true);
  return J;
};
// For convenience, we assume drawIndicators is defined for all geometries. Geometries that do not draw indicator derive this default definition.
HTMLElementsGeometry.prototype.drawIndicators = function () {};

exports.HTMLElementsGeometry = HTMLElementsGeometry;

/////////////////////////
// RectangularGeometry //
/////////////////////////

function RectangularGeometry(parent, elements) {
  HTMLElementsGeometry.call(this, parent, elements);
}
RectangularGeometry.prototype = Object.create(HTMLElementsGeometry.prototype);

// Selection domain is those elements that intersect with the rectangle whose corners are the anchor and active end (the first and last elements of
// the path).
RectangularGeometry.prototype.selectionDomain = function (path) {
  var J = new Map();
  if (path.length === 0) return J;
  var r1 = util.mkRectangle(
    multiselect.anchor(path),
    multiselect.activeEnd(path)
  );
  for (var i = 0; i < this.elements.length; ++i) {
    var r2 = util.getOffsetRectangle(this.parent, this.elements[i]);
    // all coordinates are in relation to the parent element that contains the selectable elements
    if (util.rectangleIntersect(r1, r2)) J.set(i, true);
  }
  return J;
};

// Rectangular geometry shows the anchor as a small circle, and the rubber band as a green rectangle during a drag
RectangularGeometry.prototype.drawIndicators = function (
  selection,
  canvas,
  drawAnchor,
  drawCursor,
  drawRubber
) {
  util.clearCanvas(canvas);
  var ctx = canvas.getContext("2d");
  var anchor = multiselect.anchor(selection.selectionPath());

  if (drawAnchor && anchor !== undefined) {
    util.drawSmallCircle(ctx, anchor, "DarkRed");
  }
  if (drawRubber && anchor !== undefined) {
    var activeEnd = multiselect.activeEnd(selection.selectionPath());
    util.drawRectangle(ctx, util.mkRectangle(anchor, activeEnd), "green");
  }
};

exports.RectangularGeometry = RectangularGeometry;

/////////////////
// RowGeometry //
/////////////////

// Elements are totally ordered. Selection space coordinates are the indices of the elements array
var RowGeometry = function (parent, elements) {
  HTMLElementsGeometry.call(this, parent, elements);
};
RowGeometry.prototype = Object.create(HTMLElementsGeometry.prototype);

// Selection domain is the range of elements between the anchor and active end.
RowGeometry.prototype.selectionDomain = function (path) {
  var J = new Map();
  if (path.length === 0) return J;
  var a = multiselect.anchor(path);
  var b = multiselect.activeEnd(path);
  for (var i = Math.min(a, b); i <= Math.max(a, b); ++i) J.set(i, true);
  return J;
};

// Transforming the mouse coordinate to selection space involves finding the element whose extents include the mouse point. This coordinate system
// indicates that the point falls outside of any elements with the value null.
RowGeometry.prototype.m2v = function (mp) {
  for (var i = 0; i < this.elements.length; ++i) {
    var r = util.getOffsetRectangle(this.parent, this.elements[i]);
    if (util.pointInRectangle(mp, r)) return i;
  }
  return null;
};

// In this geometry, null coordinate has no effect on the path
RowGeometry.prototype.extendPath = function (path, p) {
  if (p === null) return null;
  return HTMLElementsGeometry.prototype.extendPath.call(this, path, p);
};

// Defining the step method enables keyboard selection. Moving the cursor to left and right is just incrementing and decrementing. Up and down
// requires finding the element above or below the current element.
RowGeometry.prototype.step = function (dir, p) {
  switch (dir) {
    case multiselect.LEFT:
      return Math.max(p - 1, 0);
    case multiselect.RIGHT:
      return Math.min(p + 1, this.elements.length - 1);
    case multiselect.UP:
      return util.findClosestP.call(
        this,
        this.parent,
        this.elements,
        p,
        isAbove
      );
    case multiselect.DOWN:
      return util.findClosestP.call(
        this,
        this.parent,
        this.elements,
        p,
        function (a, b) {
          return isAbove(b, a);
        }
      );
    default:
      return p;
  }
};

// When no keyboard cursor is selected, the default depends on which arrow key is pressed. Right and down start from the first element (top left
// corner), left and up from the last (bottorm right).
RowGeometry.prototype.defaultCursor = function (dir) {
  switch (dir) {
    case multiselect.RIGHT:
    case multiselect.DOWN:
      return 0;
    case multiselect.LEFT:
    case multiselect.UP:
      return this.elements.length - 1;
    default:
      return undefined;
  }
};

// Row geometry indicates the anchor and the cursor by framing elements. No rubber band.
RowGeometry.prototype.drawIndicators = function (
  selection,
  canvas,
  drawAnchor,
  drawCursor,
  drawRubber
) {
  util.clearCanvas(canvas);
  var ctx = canvas.getContext("2d");
  var anchor = multiselect.anchor(selection.selectionPath());
  var arect;
  if (anchor !== undefined)
    arect = util.getOffsetRectangle(
      canvas,
      selection.geometry().elements[anchor]
    );
  if (drawAnchor && anchor !== undefined) {
    util.drawRectangle(ctx, arect, "DarkRed");
  }
  if (drawCursor && selection.cursor() !== undefined) {
    var r = util.getOffsetRectangle(
      canvas,
      selection.geometry().elements[selection.cursor()]
    );
    util.drawRectangle(ctx, r, "blue");
  }
  if (drawRubber && anchor !== undefined) {
    util.drawLine(
      ctx,
      util.centerPoint(arect),
      util.centerPoint(
        util.getOffsetRectangle(
          canvas,
          selection.geometry().elements[
            multiselect.activeEnd(selection.selectionPath())
          ]
        )
      ),
      "green"
    );
  }
};

exports.RowGeometry = RowGeometry;

///////////////////
// SnakeGeometry //
///////////////////

// A drag in SnakeGeometry appends points to the path ("snake"). The active set is all elements whose bounding boxes touch the snake. The methods are
// a bit complex because the selectionDomain is optimized to only compute the effect of new points added to the snake, and because by ragging the
// mouse "backwards" on the snake, the user can remove points at the end of the path (in general, extendPath can be defined to modify the path in
// arbitrary ways).

var SnakeGeometry = function (parent, elements) {
  HTMLElementsGeometry.call(this, parent, elements);
};
SnakeGeometry.prototype = Object.create(HTMLElementsGeometry.prototype);

SnakeGeometry.prototype._initCacheIfEmpty = function (cache) {
  if (Object.keys(cache).length == 0) {
    cache.removing = false; // flag for indicating when shift-clicks are removing points
    cache.prevp = undefined; // previous attempted point to extend with
    cache.rcount = undefined; // refcounts of how many line segments select an index
    cache.pqueue = []; // queue of add and rem commands that extendPath generates and
    // selectionDomain executes
  }
  this._cache = cache; // store a reference to the cache so that drawIndicators can use it
};

// The basic functionality of extendPath is to append p to the end of the path. The geometry goes to "removing-mode" if the path turns more than 135
// degrees. It then removes nearby points (within 20 pixels), and remains in removing-mode until a new point again moves further away from the current
// last point. This is a crude heuristic, but it works sufficiently well for this demo, to show the flexibility of parameterization via selection
// geometries.
SnakeGeometry.prototype.extendPath = function (path, p, cache) {
  this._initCacheIfEmpty(cache);
  if (path.length == 0) cache.removing = false;
  if (cache.removing) {
    if (
      util.distance(p, path[path.length - 1]) >
      util.distance(cache.prevp, path[path.length - 1])
    )
      cache.removing = false;
  } else {
    if (
      path.length >= 2 &&
      util.angle(path[path.length - 2], path[path.length - 1], p) < Math.PI / 4
    )
      cache.removing = true;
  }

  if (cache.removing) {
    // remove points that are close
    cache.prevp = p;
    while (path.length >= 2 && util.distance(p, path[path.length - 1]) < 20) {
      cache.pqueue.push({
        cmd: "rem",
        p1: path[path.length - 2],
        p2: path[path.length - 1],
      });
      path.pop();
    }
  } else {
    var prev = path.length === 0 ? p : path[path.length - 1];
    cache.pqueue.push({ cmd: "add", p1: prev, p2: p });
    path.push(p);
  }
};

SnakeGeometry.prototype._forEachAffectedByLine = function (p1, p2, f) {
  for (var j = 0; j < this.elements.length; ++j) {
    if (
      util.lineRectIntersect(
        p1,
        p2,
        util.getOffsetRectangle(this.parent, this.elements[j])
      )
    )
      f(j);
  }
};

// Find the elements that intersect with the snake. J may contain the previous selection domain; path is not used, since we just apply commands that
// extendPath has queued
SnakeGeometry.prototype.selectionDomain = function (path, J, cache) {
  this._initCacheIfEmpty(cache);
  if (J === undefined) {
    J = new Map();
    cache.rcount = new Map();
  }

  for (var i = 0; i < cache.pqueue.length; ++i) {
    var p = cache.pqueue[i];
    if (p.cmd === "add") {
      this._forEachAffectedByLine(p.p1, p.p2, function (j) {
        J.set(j, true);
        cache.rcount.set(j, util.or_default(cache.rcount.get(j), 0) + 1);
      });
    }
    if (p.cmd === "rem") {
      this._forEachAffectedByLine(p.p1, p.p2, function (j) {
        cache.rcount.set(j, cache.rcount.get(j) - 1);
        if (cache.rcount.get(j) === 0) J.delete(j);
      });
    }
  }
  cache.pqueue = [];
  return J;
};

// Snake geometry shows the path as the rubber band.
SnakeGeometry.prototype.drawIndicators = function (
  selection,
  canvas,
  drawAnchor,
  drawCursor,
  drawRubber
) {
  util.clearCanvas(canvas);
  var ctx = canvas.getContext("2d");
  var path = selection.selectionPath();
  if (drawAnchor && path.length > 0) {
    util.drawSmallCircle(ctx, multiselect.anchor(path), "DarkRed");
  }
  if (drawRubber) {
    ctx.strokeStyle = "green";
    if (path.length > 0) {
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (var i = 1; i < path.length; ++i) ctx.lineTo(path[i].x, path[i].y);
      ctx.stroke();
    }
    if (this._cache.removing) {
      util.drawSmallCircle(ctx, this._cache.prevp, "DarkRed", 20);
    }
  }
};

exports.SnakeGeometry = SnakeGeometry;

///////////////////
// PointGeometry //
///////////////////

var PointGeometry = function (parent, elements) {
  HTMLElementsGeometry.call(this, parent, elements);
};
PointGeometry.prototype = Object.create(HTMLElementsGeometry.prototype);

PointGeometry.prototype.extendPath = function (path, p) {
  path.push(p);
};

// If J contains the previous selection domain, it suffices to compute from k onwards
PointGeometry.prototype.selectionDomain = function (path, J, cache) {
  if (J === undefined) {
    J = new Map();
    cache.k = 0;
  }
  for (var i = cache.k; i < path.length; ++i) {
    for (var j = 0; j < this.elements.length; ++j) {
      var r = util.getOffsetRectangle(this.parent, this.elements[j]);
      if (util.pointInRectangle(path[i], r)) J.set(j, true);
    }
  }
  cache.k = path.length;
  return J;
};

// Point geometry shows the selection path's points as small dots
PointGeometry.prototype.drawIndicators = function (
  selection,
  canvas,
  drawAnchor,
  drawCursor,
  drawRubber
) {
  util.clearCanvas(canvas);
  var ctx = canvas.getContext("2d");
  if (drawRubber) {
    var path = selection.selectionPath();
    for (var i = 0; i < path.length; ++i) util.drawDot(ctx, path[i], "green");
  }
};

exports.PointGeometry = PointGeometry;

///////////////////
// MixedGeometry //
///////////////////

// This geometry gives selection functionality where one can select elements rowise but also by specifying a rectangular region. If the click that
// establishes the anchor is on an element, selection is row-wise, otherwise rectangular. To achieve this, selection coordinates are structs that
// contain two fields: index for the index, and point for the mouse coordinate. This geometry specifies a selection feature very simlar to that in
// iPhoto.

var MixedGeometry = function (parent, elements) {
  HTMLElementsGeometry.call(this, parent, elements);
};
MixedGeometry.prototype = Object.create(HTMLElementsGeometry.prototype);

// If anchor has an index field that is not undefined, row-wise selection is applied, othewrise rectangular
MixedGeometry.prototype.selectionDomain = function (path, J) {
  var J = new Map();
  if (path.length === 0) return J;
  var a = multiselect.anchor(path);
  var b = multiselect.activeEnd(path);
  if (a.index !== undefined) {
    for (
      var i = Math.min(a.index, b.index);
      i <= Math.max(a.index, b.index);
      ++i
    )
      J.set(i, true);
  } else {
    var r1 = util.mkRectangle(a.point, b.point);
    for (var i = 0; i < this.elements.length; ++i) {
      var r2 = util.getOffsetRectangle(this.parent, this.elements[i]);
      if (util.rectangleIntersect(r1, r2)) J.set(i, true);
    }
  }
  return J;
};

// The selection space coordinate has no index field if the mouse point lands on no element; it always has teh point field.
MixedGeometry.prototype.m2v = function (mp) {
  for (var i = 0; i < this.elements.length; ++i) {
    var r = util.getOffsetRectangle(this.parent, this.elements[i]);
    if (util.pointInRectangle(mp, r)) return { index: i, point: mp };
  }
  return { point: mp };
};

// In row-wise seleciton, points that are outside any elements are ignored
MixedGeometry.prototype.extendPath = function (path, p) {
  var a = multiselect.anchor(path);
  if (a !== undefined && a.index !== undefined && p.index === undefined)
    return null;
  return HTMLElementsGeometry.prototype.extendPath.call(this, path, p);
};

// stepping is only possible in row-wise selection. After a step to some element i, the point member is set to the center point of the element i
MixedGeometry.prototype.step = function (dir, p) {
  if (p.index === undefined) return p;
  var ind = p.index;
  switch (dir) {
    case multiselect.LEFT:
      ind = Math.max(ind - 1, 0);
      break;
    case multiselect.RIGHT:
      ind = Math.min(ind + 1, this.elements.length - 1);
      break;
    case multiselect.UP:
      ind = util.findClosestP.call(
        this,
        this.parent,
        this.elements,
        ind,
        isAbove
      );
      break;
    case multiselect.DOWN:
      ind = util.findClosestP.call(
        this,
        this.parent,
        this.elements,
        ind,
        isBelow
      );
      break;
  }
  if (ind === p.index) return p;
  return {
    index: ind,
    point: util.centerPoint(
      util.getOffsetRectangle(this.parent, this.elements[ind])
    ),
  };
};

// Cursor defaults are as with row-wise geometry
MixedGeometry.prototype.defaultCursor = function (dir) {
  var ind;
  switch (dir) {
    case multiselect.RIGHT:
    case multiselect.DOWN:
      ind = 0;
      break;
    case multiselect.LEFT:
    case multiselect.UP:
      ind = this.elements.length - 1;
      break;
    default:
      return undefined;
  }
  return {
    index: ind,
    point: util.centerPoint(
      util.getOffsetRectangle(this.parent, this.elements[ind])
    ),
  };
};

// mixed geometry shows the anchor as a circle in rectangular selection mode, and frames the anchor element in row-wise mode. The cursor is shown as a
// framed element. Rubber band is only shown in rectangular selection mode.
MixedGeometry.prototype.drawIndicators = function (
  selection,
  canvas,
  drawAnchor,
  drawCursor,
  drawRubber
) {
  util.clearCanvas(canvas);
  var ctx = canvas.getContext("2d");
  var anchor = multiselect.anchor(selection.selectionPath());
  if (drawAnchor && anchor !== undefined) {
    if (anchor.index === undefined)
      util.drawSmallCircle(ctx, anchor.point, "DarkRed");
    else
      util.drawRectangle(
        ctx,
        util.getOffsetRectangle(
          canvas,
          selection.geometry().elements[anchor.index]
        ),
        "DarkRed"
      );
  }
  if (
    drawCursor &&
    selection.cursor() !== undefined &&
    selection.cursor().index !== undefined
  ) {
    util.drawRectangle(
      ctx,
      util.getOffsetRectangle(
        canvas,
        selection.geometry().elements[selection.cursor().index]
      ),
      "blue"
    );
  }
  if (drawRubber && anchor !== undefined && anchor.index === undefined) {
    var activeEnd = multiselect.activeEnd(selection.selectionPath());
    util.drawRectangle(
      ctx,
      util.mkRectangle(anchor.point, activeEnd.point),
      "green"
    );
  }
};

exports.MixedGeometry = MixedGeometry;

///////////////////
// LassoGeometry //
///////////////////

let LassoGeometry = function (parent, elements, ordered = false) {
  HTMLElementsGeometry.call(this, parent, elements);
};
LassoGeometry.prototype = Object.create(HTMLElementsGeometry.prototype);

LassoGeometry.prototype._initCacheIfEmpty = function (cache) {
  if (Object.keys(cache).length == 0) {
    cache.removing = false; // flag for indicating when shift-clicks are removing points
    cache.prevp = undefined; // previous attempted point to extend with
    cache.rcount = undefined; // refcounts of how many line segments select an index
    cache.subAreas = util.splitSelectableArea(this.parent, this.elements);
    cache.rectangles = [
      {
        left: Number.MAX_SAFE_INTEGER,
        right: Number.MIN_SAFE_INTEGER,
        top: Number.MAX_SAFE_INTEGER,
        bottom: Number.MIN_SAFE_INTEGER,
      },
    ];
    cache.pqueue = []; // queue of add and rem commands that extendPath generates and
    // selectionDomain executes
  }
  this._cache = cache; // store a reference to the cache so that drawIndicators can use it
};

// The basic functionality of extendPath is to append p to the end of the path. The geometry goes to "removing-mode" if the path turns more than 135
// degrees. It then removes nearby points (within 20 pixels), and remains in removing-mode until a new point again moves further away from the current
// last point. This is a crude heuristic, but it works sufficiently well for this demo, to show the flexibility of parameterization via selection
// geometries.
LassoGeometry.prototype.extendPath = function (path, p, cache) {
  this._initCacheIfEmpty(cache);
  if (path.length == 0) cache.removing = false;
  if (cache.removing) {
    if (
      util.distance(p, path[path.length - 1]) >
      util.distance(cache.prevp, path[path.length - 1])
    )
      cache.removing = false;
  } else {
    if (
      path.length >= 2 &&
      util.angle(path[path.length - 2], path[path.length - 1], p) < Math.PI / 4
    )
      cache.removing = true;
  }
  const prevRectangle = cache.rectangles[cache.rectangles.length - 1];

  if (cache.removing) {
    // remove points that are close
    cache.prevp = p;
    while (path.length >= 2 && util.distance(p, path[path.length - 1]) < 20) {
      path.pop();
      cache.rectangles.pop();

      const inspectableElements = util.getInspectableIndices(
        prevRectangle,
        cache.subAreas
      );

      cache.pqueue.push({
        rectangle: prevRectangle,
        inspectableElements,
        path,
      });
    }
  } else {
    const newRectangle = util.updateRectangle(p, prevRectangle);
    const inspectableElements = util.getInspectableIndices(
      newRectangle,
      cache.subAreas
    );

    path.push(p);
    cache.rectangles.push(newRectangle);
    cache.pqueue.push({
      rectangle: newRectangle,
      inspectableElements,
      path,
    });
  }
};

LassoGeometry.prototype._forEachAffectedByLine = function (
  rectangle,
  inspectableElements,
  path,
  select,
  remove
) {
  for (const index of inspectableElements) {
    const offsetRectangle = util.getOffsetRectangle(
      this.parent,
      this.elements[index]
    );
    if (util.rectangleIntersect(rectangle, offsetRectangle))
      util.rectangleInPolygon(path, offsetRectangle)
        ? select(index)
        : remove(index);
  }
};

// Find the elements that intersect with the lasso. J may contain the previous selection domain; path is not used, since we just apply commands that
// extendPath has queued
LassoGeometry.prototype.selectionDomain = function (spath, J, cache) {
  this._initCacheIfEmpty(cache);
  if (J === undefined) {
    J = new Map();
  }

  for (let i = 0; i < cache.pqueue.length; ++i) {
    let { rectangle, inspectableElements, path } = cache.pqueue[i];
    this._forEachAffectedByLine(
      rectangle,
      inspectableElements,
      path,
      function (j) {
        J.set(j, true);
      },
      function (j) {
        J.delete(j);
      }
    );
  }

  cache.pqueue = [];
  return J;
};

// Lasso selection geometry shows the path as the rubber band. A grey line from the active end to the anchor indicates the auto-closing state of the lasso
LassoGeometry.prototype.drawIndicators = function (
  selection,
  canvas,
  drawAnchor,
  drawCursor,
  drawRubber,
  drawPathToAnchor = true,
  drawBoundingBox = false
) {
  util.clearCanvas(canvas);
  let ctx = canvas.getContext("2d");
  let path = selection.selectionPath();
  if (drawAnchor && path.length > 0) {
    util.drawSmallCircle(ctx, multiselect.anchor(path), "DarkRed");
  }
  if (drawRubber) {
    ctx.strokeStyle = "green";
    if (path.length > 0) {
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; ++i) ctx.lineTo(path[i].x, path[i].y);
      ctx.stroke();
    }
    if (this._cache.removing) {
      util.drawSmallCircle(ctx, this._cache.prevp, "DarkRed", 20);
    }
  }

  if (drawCursor) {
    let p = selection.cursor();
    if (p !== undefined) util.drawSmallCircle(ctx, p, 4, "blue");
  }

  if (drawPathToAnchor) {
    let p1 = multiselect.activeEnd(selection.selectionPath());
    let p2 = multiselect.anchor(selection.selectionPath());
    if (p1 !== undefined && p2 !== undefined)
      util.drawLine(ctx, p1, p2, "grey");
  }

  if (drawBoundingBox) {
    util.drawRectangle(
      ctx,
      this._cache.rectangles[this._cache.rectangles.length - 1],
      "red"
    );
  }
};

exports.LassoGeometry = LassoGeometry;

//////////////////////////////
// IncrementalLassoGeometry //
//////////////////////////////

let IncrementalLassoGeometry = function (parent, elements) {
  HTMLElementsGeometry.call(this, parent, elements);
};

IncrementalLassoGeometry.prototype = Object.create(
  HTMLElementsGeometry.prototype
);

IncrementalLassoGeometry.prototype._initCacheIfEmpty = function (cache) {
  if (Object.keys(cache).length == 0) {
    cache.removing = false; // flag for indicating when shift-clicks are removing points
    cache.prevp = undefined; // previous attempted point to extend with
    cache.subAreas = util.splitSelectableArea(this.parent, this.elements);
    cache.rectangles = [
      {
        left: Number.MAX_SAFE_INTEGER,
        right: Number.MIN_SAFE_INTEGER,
        top: Number.MAX_SAFE_INTEGER,
        bottom: Number.MIN_SAFE_INTEGER,
      },
    ];
    cache.pqueue = []; // queue of add and rem commands that extendPath generates and
    // selectionDomain executes
  }
  this._cache = cache; // store a reference to the cache so that drawIndicators can use it
};

// The basic functionality of extendPath is to append p to the end of the path. The geometry goes to "removing-mode" if the path turns more than 135
// degrees. It then removes nearby points (within 20 pixels), and remains in removing-mode until a new point again moves further away from the current
// last point. This is a crude heuristic, but it works sufficiently well for this demo, to show the flexibility of parameterization via selection
// geometries.
IncrementalLassoGeometry.prototype.extendPath = function (path, p, cache) {
  this._initCacheIfEmpty(cache);
  if (path.length == 0) cache.removing = false;
  if (cache.removing) {
    if (
      util.distance(p, path[path.length - 1]) >
      util.distance(cache.prevp, path[path.length - 1])
    )
      cache.removing = false;
  } else {
    if (
      path.length >= 2 &&
      util.angle(path[path.length - 2], path[path.length - 1], p) < Math.PI / 4
    )
      cache.removing = true;
  }

  const prevPoint = path.length === 0 ? p : path[path.length - 1];
  const anchor = path.length === 0 ? p : path[0];

  if (cache.removing) {
    // remove points that are close
    cache.prevp = p;
    while (path.length >= 2 && util.distance(p, path[path.length - 1]) < 20) {
      path.pop();
      const prevRectangle = cache.rectangles.pop();
      const inspectableElements = util.getInspectableIndices(
        prevRectangle,
        cache.subAreas
      );

      cache.pqueue.push({
        triangle: [path[path.length - 1], prevPoint, anchor],
        rectangle: prevRectangle,
        inspectableElements,
        path,
      });
    }
  } else {
    const newRectangle = util.getRectangleOfPath([p, prevPoint, anchor]);
    const inspectableElements = util.getInspectableIndices(
      newRectangle,
      cache.subAreas
    );

    path.push(p);
    cache.rectangles.push(newRectangle);

    cache.pqueue.push({
      triangle: [prevPoint, p, anchor],
      rectangle: newRectangle,
      inspectableElements,
      path,
    });
  }
};

IncrementalLassoGeometry.prototype._forEachAffectedByLine = function (
  triangle,
  rectangle,
  inspectableElements,
  path,
  select,
  remove
) {
  for (const index of inspectableElements) {
    const offsetRectangle = util.getOffsetRectangle(
      this.parent,
      this.elements[index]
    );
    if (util.rectangleIntersect(rectangle, offsetRectangle))
      if (util.rectangleInPolygon(triangle, offsetRectangle))
        util.rectangleInPolygon(path, offsetRectangle)
          ? select(index)
          : remove(index);
  }
};

// Find the elements that intersect with the lasso. J may contain the previous selection domain; path is not used, since we just apply commands that
// extendPath has queued
IncrementalLassoGeometry.prototype.selectionDomain = function (
  spath,
  J,
  cache
) {
  this._initCacheIfEmpty(cache);
  if (J === undefined) {
    J = new Map();
  }

  for (let i = 0; i < cache.pqueue.length; ++i) {
    let { triangle, rectangle, inspectableElements, path } = cache.pqueue[i];
    this._forEachAffectedByLine(
      triangle,
      rectangle,
      inspectableElements,
      path,
      function (j) {
        J.set(j, true);
      },
      function (j) {
        J.delete(j);
      }
    );
  }

  cache.pqueue = [];
  return J;
};

// Lasso selection geometry shows the path as the rubber band. A grey line from the active end to the anchor indicates the auto-closing state of the lasso
IncrementalLassoGeometry.prototype.drawIndicators = function (
  selection,
  canvas,
  drawAnchor,
  drawCursor,
  drawRubber,
  drawPathToAnchor = true,
  drawBoundingBox = false
) {
  util.clearCanvas(canvas);
  let ctx = canvas.getContext("2d");
  let path = selection.selectionPath();
  if (drawAnchor && path.length > 0) {
    util.drawSmallCircle(ctx, multiselect.anchor(path), "DarkRed");
  }
  if (drawRubber) {
    ctx.strokeStyle = "green";
    if (path.length > 0) {
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; ++i) ctx.lineTo(path[i].x, path[i].y);
      ctx.stroke();
    }
    if (this._cache.removing) {
      util.drawSmallCircle(ctx, this._cache.prevp, "DarkRed", 20);
    }
  }

  if (drawCursor) {
    let p = selection.cursor();
    if (p !== undefined) util.drawSmallCircle(ctx, p, 4, "blue");
  }

  if (drawPathToAnchor) {
    let p1 = multiselect.activeEnd(selection.selectionPath());
    let p2 = multiselect.anchor(selection.selectionPath());
    if (p1 !== undefined && p2 !== undefined)
      util.drawLine(ctx, p1, p2, "grey");
  }

  if (drawBoundingBox) {
    util.drawRectangle(
      ctx,
      this._cache.rectangles[this._cache.rectangles.length - 1],
      "red"
    );
  }
};

exports.IncrementalLassoGeometry = IncrementalLassoGeometry;

},{"./multiselect.js":2,"./utilities.js":3}],2:[function(require,module,exports){
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

},{}],3:[function(require,module,exports){
////////////////////////////////////
// MultiselectJS demo application //
//                                //
// Author: Jaakko Järvi           //
//                                //
// Helper and utility functions   //
////////////////////////////////////

///////////////////////////////////////////////////////////////
// determine which modifier keys were held down during event //
///////////////////////////////////////////////////////////////

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

///////////////////////
// general utilities //
///////////////////////

function or_default(v, def) {
  return v === undefined ? def : v;
}

////////////////////////////////////////////////////////////
// helper functions to deal with points, rectangles, etc. //
////////////////////////////////////////////////////////////

function pointInRectangle(p, r) {
  return p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom;
}

function topLeftCorner(r) {
  return { x: r.left, y: r.top };
}

function bottomLeftCorner(r) {
  return { x: r.left, y: r.bottom };
}

function bottomRightCorner(r) {
  return { x: r.right, y: r.bottom };
}

function topRightCorner(r) {
  return { x: r.right, y: r.top };
}

function allCorners(r) {
  return [
    topLeftCorner(r),
    bottomLeftCorner(r),
    bottomRightCorner(r),
    topRightCorner(r),
  ];
}

function offsetRectangle(p, r) {
  return {
    left: r.left - p.x,
    top: r.top - p.y,
    right: r.right - p.x,
    bottom: r.bottom - p.y,
  };
}

// get elem's bounding rectangle relative to parent's top left corner
function getOffsetRectangle(parent, elem) {
  return offsetRectangle(
    topLeftCorner(parent.getBoundingClientRect()),
    elem.getBoundingClientRect()
  );
}

// get event position relative to parent's top left corner
function offsetMousePos(parent, evt) {
  var p = topLeftCorner(parent.getClientRects()[0]);
  return { x: evt.clientX - p.x, y: evt.clientY - p.y };
}

function rectangleIntersect(r1, r2) {
  return (
    r1.left <= r2.right &&
    r1.right >= r2.left &&
    r1.top <= r2.bottom &&
    r1.bottom >= r2.top
  );
}

function rectangleInclusion(r1, r2) {
  return (
    r1.left <= r2.left &&
    r1.right >= r2.right &&
    r1.top <= r2.top &&
    r1.bottom >= r2.bottom
  );
}

function centerPoint(r) {
  return { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 };
}

function isAbove(r1, r2) {
  return centerPoint(r1).y < r2.top;
}
function isBelow(r1, r2) {
  return centerPoint(r1).y > r2.bottom;
}

function distance(p1, p2) {
  var dx = p1.x - p2.x;
  var dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function findClosestP(parent, elements, j, pred) {
  var r = getOffsetRectangle(parent, elements[j]);
  var candidateIndex = null;
  var candidateDistance = Number.MAX_VALUE;

  for (var i = 0; i < elements.length; ++i) {
    var rc = getOffsetRectangle(parent, elements[i]);
    if (
      pred(rc, r) &&
      distance(centerPoint(r), centerPoint(rc)) < candidateDistance
    ) {
      candidateIndex = i;
      candidateDistance = distance(centerPoint(r), centerPoint(rc));
    }
  }
  if (candidateIndex === null) return j;
  else return candidateIndex;
}

function lineRectIntersect(p1, p2, r) {
  if (!rectangleIntersect(mkRectangle(p1, p2), r)) return false; // if bounding boxes do not overlap, cannot intersect
  if (pointEquals(p1, p2)) return pointInRectangle(p1, r);
  var p = {};
  if (
    lineIntersect(
      p1,
      p2,
      { x: r.left, y: r.top },
      { x: r.left, y: r.bottom },
      p
    ) === 1
  )
    return true;
  if (
    lineIntersect(
      p1,
      p2,
      { x: r.left, y: r.top },
      { x: r.right, y: r.top },
      p
    ) === 1
  )
    return true;
  if (
    lineIntersect(
      p1,
      p2,
      { x: r.right, y: r.bottom },
      { x: r.right, y: r.top },
      p
    ) === 1
  )
    return true;
  if (
    lineIntersect(
      p1,
      p2,
      { x: r.right, y: r.bottom },
      { x: r.left, y: r.bottom },
      p
    ) === 1
  )
    return true;
  return pointInRectangle(p1, r) || pointInRectangle(p2, r);
}

function pointEquals(p1, p2) {
  return p1.x === p2.x && p1.y === p2.y;
}

// 3-point angle
function angle(a, b, c) {
  var ab = Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
  var bc = Math.sqrt(Math.pow(b.x - c.x, 2) + Math.pow(b.y - c.y, 2));
  var ac = Math.sqrt(Math.pow(c.x - a.x, 2) + Math.pow(c.y - a.y, 2));
  return Math.acos((bc * bc + ab * ab - ac * ac) / (2 * bc * ab));
}

/* This is a bit more involved function, adapted from Prasad Mukesh's C-code "Intersection of Line Segments", ACM Transaction of Graphics' Graphics
   Gems II, p. 7--9, code: p. 473--476, xlines.c.

   lines_intersect:  AUTHOR: Mukesh Prasad

     This function computes whether two line segments, respectively joining the input points (x1,y1) -- (x2,y2) and the input points (x3,y3) --
     (x4,y4) intersect. If the lines intersect, the output variables x, y are set to coordinates of the point of intersection.

     All values are in integers.  The returned value is rounded to the nearest integer point.

     If non-integral grid points are relevant, the function can easily be transformed by substituting floating point calculations instead of integer
     calculations.

     Entry x1, y1,  x2, y2   Coordinates of endpoints of one segment. x3, y3,  x4, y4   Coordinates of endpoints of other segment.

     Exit x, y              Coordinates of intersection point.

     The value returned by the function is one of:

          DONT_INTERSECT    0
          DO_INTERSECT      1
          COLLINEAR         2

   Error conditions:

       Depending upon the possible ranges, and particularly on 16-bit
       computers, care should be taken to protect from overflow.

       In the following code, 'long' values have been used for this
       purpose, instead of 'int'.

 */

function sameSigns(a, b) {
  return (a >= 0 && b >= 0) || (a < 0 && b < 0);
}

function lineIntersect(
  p1 /* First line segment */,
  p2,
  p3 /* Second line segment */,
  p4,
  p5
  /* Output value: point of intersection */
) {
  const DONT_INTERSECT = 0;
  const DO_INTERSECT = 1;
  const COLLINEAR = 2;

  var a1, a2, b1, b2, c1, c2; /* Coefficients of line eqns. */
  var r1, r2, r3, r4; /* 'Sign' values */
  var denom, offset, num; /* Intermediate values */

  /* Compute a1, b1, c1, where line joining points 1 and 2 is "a1 x  +  b1 y  +  c1  =  0".
   */

  a1 = p2.y - p1.y;
  b1 = p1.x - p2.x;
  c1 = p2.x * p1.y - p1.x * p2.y;

  /* Compute r3 and r4.
   */
  r3 = a1 * p3.x + b1 * p3.y + c1;
  r4 = a1 * p4.x + b1 * p4.y + c1;

  /* Check signs of r3 and r4.  If both point 3 and point 4 lie on same side of line 1, the line segments do not intersect.
   */
  if (r3 != 0 && r4 != 0 && sameSigns(r3, r4)) return DONT_INTERSECT;

  /* Compute a2, b2, c2 */
  a2 = p4.y - p3.y;
  b2 = p3.x - p4.x;
  c2 = p4.x * p3.y - p3.x * p4.y;

  /* Compute r1 and r2 */
  r1 = a2 * p1.x + b2 * p1.y + c2;
  r2 = a2 * p2.x + b2 * p2.y + c2;

  /* Check signs of r1 and r2.  If both point 1 and point 2 lie on same side of second line segment, the line segments do not intersect.
   */
  if (r1 !== 0 && r2 !== 0 && sameSigns(r1, r2)) return DONT_INTERSECT;

  /* Line segments intersect: compute intersection point.
   */

  denom = a1 * b2 - a2 * b1;
  if (denom === 0) return COLLINEAR;
  // offset = denom < 0 ? - denom / 2 : denom / 2;

  // /* The denom/2 is to get rounding instead of truncating.  It
  //  * is added or subtracted to the numerator, depending upon the
  //  * sign of the numerator.
  //    */

  // num = b1 * c2 - b2 * c1; p5.x = ( num < 0 ? num - offset : num + offset ) / denom;

  // num = a2 * c1 - a1 * c2; p5.y = ( num < 0 ? num - offset : num + offset ) / denom;

  return DO_INTERSECT;
}

//////////////////////////////////////////////////////////
// Lasso utilities: computing bounding box of polygon, // buckets of elements, point in polygon algorithm     //
/////////////////////////////////////////////////////////

const getRectangleOfPath = (
  path,
  rectangle = {
    left: Number.MAX_SAFE_INTEGER,
    right: Number.MIN_SAFE_INTEGER,
    top: Number.MAX_SAFE_INTEGER,
    bottom: Number.MIN_SAFE_INTEGER,
  }
) => {
  for (point in path) {
    if (path[point].x < rectangle.left) rectangle.left = path[point].x;
    if (path[point].x > rectangle.right) rectangle.right = path[point].x;
    if (path[point].y < rectangle.top) rectangle.top = path[point].y;
    if (path[point].y > rectangle.bottom) rectangle.bottom = path[point].y;
  }

  return rectangle;
};

const updateRectangle = (point, rectangle) => {
  if (point.x < rectangle.left) rectangle.left = point.x;
  if (point.x > rectangle.right) rectangle.right = point.x;
  if (point.y < rectangle.top) rectangle.top = point.y;
  if (point.y > rectangle.bottom) rectangle.bottom = point.y;

  return rectangle;
};

const getClosestSubArea = (position, subAreas) => {
  const candidateArea = Math.ceil(position / 100) * 100;

  if (subAreas[candidateArea]) return candidateArea;
  const keys = Object.keys(subAreas);

  if (candidateArea < 0) return keys[0];

  for (let i = 0; i < keys.length; i++) {
    if (keys[i] < candidateArea) continue;
    else return keys[i];
  }

  return keys[keys.length - 1];
};

const splitSelectableArea = (parent, elements) => {
  let subAreas = {};

  for (let i = 0; i < elements.length; ++i) {
    const yTop =
      Math.ceil(
        topLeftCorner(getOffsetRectangle(parent, elements[i])).y / 100
      ) * 100;
    const yBottom =
      Math.ceil(
        bottomLeftCorner(getOffsetRectangle(parent, elements[i])).y / 100
      ) * 100;

    for (let area = yTop; area <= yBottom; area += 100)
      if (!subAreas[area]) subAreas[area] = [i];
      else if (!subAreas[area].includes(i)) subAreas[area].push(i);
  }

  return subAreas;
};

const getInspectableIndices = (rectangle, subAreas) => {
  const startingArea = Number(getClosestSubArea(rectangle.top, subAreas));
  const endingArea = Number(getClosestSubArea(rectangle.bottom, subAreas));

  let elements = [];

  for (let area = startingArea; area <= endingArea; area += 100)
    if (!!subAreas[area])
      elements = [...new Set([...elements, ...subAreas[area]])];

  return elements;
};

const rectangleInPolygon = (path, rectangle) => {
  let counter = 0;
  let p1 = path[0];
  const p = topLeftCorner(rectangle);
  for (let i = 1; i <= path.length; i++) {
    let p2 = path[i % path.length];

    if (p.y > Math.min(p1.y, p2.y)) {
      if (p.y <= Math.max(p1.y, p2.y)) {
        if (p.x <= Math.max(p1.x, p2.x)) {
          if (p1.y !== p2.y) {
            const xIntersect =
              ((p.y - p1.y) * (p2.x - p1.x)) / (p2.y - p1.y) + p1.x;
            if (p1.x === p2.x || p.x <= xIntersect) counter++;
          }
        }
      }
    }
    p1 = p2;
  }

  if (counter % 2 !== 0) return true;
  return pathRectIntersect(path, rectangle);
};

const pathRectIntersect = (path, rectangle) => {
  let p1 = path[0];
  for (let i = 1; i <= path.length; i++) {
    let p2 = path[i % path.length];
    if (lineRectIntersect(p1, p2, rectangle)) return true;
    p1 = p2;
  }
  return false;
};

////////////////////////////////////////////
// A canvas for drawing selection cursors //
////////////////////////////////////////////

// create canvas over parent, and track its size
function createCanvas(parent) {
  var canvas = document.createElement("canvas");
  canvas.style.position = "absolute";
  parent.insertBefore(canvas, parent.firstChild);

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  return canvas;

  function resizeCanvas() {
    var rect = parent.getBoundingClientRect();
    canvas.width = rect.right - rect.left;
    canvas.height = rect.bottom - rect.top;
  }
}

function clearCanvas(canvas) {
  canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
}

function drawSmallCircle(ctx, p, color, r) {
  if (r === undefined) r = 6;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2, true);
  ctx.stroke();
}

function drawDot(ctx, p, color) {
  ctx.beginPath();
  ctx.arc(p.x, p.y, 2, 0, Math.PI * 2, true);
  ctx.fillStyle = color;
  ctx.fill();
}

function drawRectangle(ctx, r, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(r.left, r.top, r.right - r.left, r.bottom - r.top);
}

function mkRectangle(p1, p2) {
  return {
    left: Math.min(p1.x, p2.x),
    top: Math.min(p1.y, p2.y),
    right: Math.max(p1.x, p2.x),
    bottom: Math.max(p1.y, p2.y),
  };
}

function drawLine(ctx, p1, p2, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
}

//////////////////////////
// Setup mouse handlers //
//////////////////////////

// MultiselectJS does not dictate how to recognize mouse events. Below is one example. Handler for mouse down registers handlers for mouse move and
// mouse up events, mouse up unregisters them. Each handlers invokes the current geometry's m2v function to translate the mouse coordinate to
// selection space, and then invokes the appropriate click function.

// The handlers also call the drawIndicators function to draw the anchor, rubber band, and the keyboard cursor indicators, according to what the
// geometry specifies. Mouse move and shift click may schedule their work for later, but the indicators are drawn immediately.

// Some applications support dragging the selected elements, which requires a bit more complex event handling logic. That feature is not implemented
// here.

function setupMouseEvents(parent, canvas, selection) {
  function mousedownHandler(evt) {
    var mousePos = selection
      .geometry()
      .m2v(multiselect_utilities.offsetMousePos(parent, evt));
    switch (multiselect.modifierKeys(evt)) {
      case multiselect.NONE:
        selection.click(mousePos);
        break;
      case multiselect.CMD:
        selection.cmdClick(mousePos);
        break;
      case multiselect.SHIFT:
        selection.shiftClick(mousePos);
        break;
      default:
        return;
    }

    selection.geometry().drawIndicators(selection, canvas, true, true, false);

    document.addEventListener("mousemove", mousemoveHandler, false);
    document.addEventListener("mouseup", mouseupHandler, false);
    evt.preventDefault();
    evt.stopPropagation();
  }

  function mousemoveHandler(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    var mousePos = selection
      .geometry()
      .m2v(multiselect_utilities.offsetMousePos(parent, evt));
    selection.shiftClick(mousePos);
    selection.geometry().drawIndicators(selection, canvas, true, true, true);
  }

  function mouseupHandler(evt) {
    document.removeEventListener("mousemove", mousemoveHandler, false);
    document.removeEventListener("mouseup", mouseupHandler, false);
    selection
      .geometry()
      .drawIndicators(selection, canvas, true, true, false, false);
  }

  parent.addEventListener("mousedown", mousedownHandler, false);
}

/////////////////////////////
// Setup keyboard handlers //
/////////////////////////////

function setupKeyboardEvents(parent, canvas, selection) {
  parent.addEventListener("keydown", keydownHandler, false);
  parent.addEventListener(
    "mousedown",
    function () {
      parent.focus();
    },
    false
  );

  function keydownHandler(evt) {
    var handled = false;
    var mk = multiselect.modifierKeys(evt);
    switch (evt.which) {
      case 37:
        handled = callArrow(mk, multiselect.LEFT);
        break;
      case 38:
        handled = callArrow(mk, multiselect.UP);
        break;
      case 39:
        handled = callArrow(mk, multiselect.RIGHT);
        break;
      case 40:
        handled = callArrow(mk, multiselect.DOWN);
        break;
      case 32:
        handled = callSpace(mk);
        break;
      case 90:
        handled = callUndoRedo(mk);
        break;
      default:
        return; // exit this handler for unrecognized keys
    }
    if (!handled) return;

    // event is recognized
    selection.geometry().drawIndicators(selection, canvas, true, true, false);
    evt.preventDefault();
    evt.stopPropagation();
  }

  function callUndoRedo(mk) {
    switch (mk) {
      case multiselect.OPT:
        selection.undo();
        break;
      case multiselect.SHIFT_OPT:
        selection.redo();
        break;
      default:
        return false;
    }
    return true;
  }

  function callArrow(mk, dir) {
    switch (mk) {
      case multiselect.NONE:
        selection.arrow(dir);
        break;
      case multiselect.CMD:
        selection.cmdArrow(dir);
        break;
      case multiselect.SHIFT:
        selection.shiftArrow(dir);
        break;
      default:
        return false;
    }
    return true;
  }

  function callSpace(mk) {
    switch (mk) {
      case multiselect.NONE:
        selection.space();
        break;
      case multiselect.CMD:
        selection.cmdSpace();
        break;
      case multiselect.SHIFT:
        selection.shiftSpace();
        break;
      default:
        return false;
    }
    return true;
  }
}

////////////////
//  EXPORTS   //
////////////////

exports.modifierKeys = modifierKeys;
exports.or_default = or_default;
exports.pointInRectangle = pointInRectangle;

exports.topLeftCorner = topLeftCorner;

exports.bottomLeftCorner = bottomLeftCorner;

exports.bottomRightCorner = bottomRightCorner;

exports.topRightCorner = topRightCorner;

exports.allCorners = allCorners;
exports.offsetRectangle = offsetRectangle;
exports.getOffsetRectangle = getOffsetRectangle;
exports.offsetMousePos = offsetMousePos;
exports.rectangleIntersect = rectangleIntersect;
exports.rectangleInclusion = rectangleInclusion;
exports.centerPoint = centerPoint;
exports.isAbove = isAbove;
exports.isBelow = isBelow;
exports.distance = distance;
exports.findClosestP = findClosestP;
exports.lineRectIntersect = lineRectIntersect;
exports.pointEquals = pointEquals;
exports.angle = angle;
exports.sameSigns = sameSigns;
exports.lineIntersect = lineIntersect;
exports.getRectangleOfPath = getRectangleOfPath;
exports.updateRectangle = updateRectangle;
exports.splitSelectableArea = splitSelectableArea;
exports.getClosestSubArea = getClosestSubArea;
exports.getInspectableIndices = getInspectableIndices;
exports.rectangleInPolygon = rectangleInPolygon;
exports.pathRectIntersect = pathRectIntersect;
exports.createCanvas = createCanvas;
exports.clearCanvas = clearCanvas;
exports.drawSmallCircle = drawSmallCircle;
exports.drawDot = drawDot;
exports.mkRectangle = mkRectangle;
exports.drawRectangle = drawRectangle;
exports.mkRectangle = mkRectangle;
exports.drawLine = drawLine;
exports.setupMouseEvents = setupMouseEvents;
exports.setupKeyboardEvents = setupKeyboardEvents;

},{}]},{},[1])(1)
});
