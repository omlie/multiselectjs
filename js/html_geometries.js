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
