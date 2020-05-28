////////////////////////////////////
// MultiselectJS demo application //
////////////////////////////////////
////////////////////////
// Selectable content //
////////////////////////

document.addEventListener("DOMContentLoaded", function () {
  var selectableArea = document.getElementById("selectable_area");
  for (var i = 0; i < 400; ++i) {
    var e = document.createElement("span");
    e.setAttribute("class", "selectable");
    e.textContent = i;
    selectableArea.appendChild(e);
  }

  // The elements that can be selected are objects representing HTML spans.
  var selectables = selectableArea.getElementsByClassName("selectable");

  // The callback function that will show the selection state of the elements is called after every selection command with a map of the changed
  // elements
  var refresh = function (sm, changed) {
    changed.forEach(function (value, i) {
      selectables[i].classList.toggle("selected", value);
    });
  };

  // Create five different geometries
  var rectangularGeometry = new multiselect_html_geometries.RectangularGeometry(
    selectableArea,
    selectables
  );
  var rowGeometry = new multiselect_html_geometries.RowGeometry(
    selectableArea,
    selectables
  );
  var snakeGeometry = new multiselect_html_geometries.SnakeGeometry(
    selectableArea,
    selectables
  );
  var pointGeometry = new multiselect_html_geometries.PointGeometry(
    selectableArea,
    selectables
  );
  var mixedGeometry = new multiselect_html_geometries.MixedGeometry(
    selectableArea,
    selectables
  );
  var lassoGeometry = new multiselect_html_geometries.LassoGeometry(
    selectableArea,
    selectables
  );
  var incrementalLassoGeometry = new multiselect_html_geometries.IncrementalLassoGeometry(
    selectableArea,
    selectables
  );

  // Create a selection object
  var selection = new multiselect.SelectionState(
    rectangularGeometry,
    refresh,
    true
  );

  // canvas will accept mouse and keyboard events and display the anchor, cursor, and rubber band indicators
  var canvas = multiselect_utilities.createCanvas(selectableArea);

  multiselect_utilities.setupMouseEvents(selectableArea, canvas, selection);
  multiselect_utilities.setupKeyboardEvents(selectableArea, canvas, selection);

  // The logic for changing a geometry based on radio buttons
  var radios = document.getElementsByName("geometry");
  for (var i = 0; i < radios.length; ++i) {
    radios[i].onchange = function () {
      multiselect_utilities.clearCanvas(canvas);
      switch (this.value) {
        case "rectangular":
          selection.setGeometry(rectangularGeometry);
          break;
        case "rowwise":
          selection.setGeometry(rowGeometry);
          selectableArea.focus();
          break;
        case "snake":
          selection.setGeometry(snakeGeometry);
          break;
        case "pointwise":
          selection.setGeometry(pointGeometry);
          break;
        case "mixed":
          selection.setGeometry(mixedGeometry);
          selectableArea.focus();
          break;
        case "lasso":
          selection.setGeometry(lassoGeometry);
          break;
        case "incrementalLasso":
          selection.setGeometry(incrementalLassoGeometry);
          break;
      }
    };
  }

  // Handling predicate selection and select/deselect-all events. All of them are implemented as a call to the selection.predicateSelect() function.
  document.getElementById("pattern").addEventListener("keyup", function () {
    var str = this.value;
    selection.predicateSelect(function (i) {
      return (
        str !== "" &&
        selection.geometry().elements[i].innerHTML.indexOf(str) > -1
      );
    });
  });
  document
    .getElementById("commit_pattern")
    .addEventListener("click", function () {
      selection.commit();
    });

  document.getElementById("select_all").addEventListener("click", function () {
    selection.predicateSelect(function (i) {
      return true;
    });
  });
  document
    .getElementById("deselect_all")
    .addEventListener("click", function () {
      selection.predicateSelect(function (i) {
        return true;
      }, false);
    });
});
