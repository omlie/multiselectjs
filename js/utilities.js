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
