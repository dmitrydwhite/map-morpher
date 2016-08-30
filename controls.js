var WorkingMap;
var totalCities = 0;

var d3svg = d3.select('svg.map')
  .attr("height", 800)
  .attr("width", 800)
  .attr("viewBox", "-500 -500 1000 1000");

var mapSizes = {
  small: 4096,
  medium: 8192,
  large: 16384
};

var terrainOperations = {
  slope : function () {
    WorkingMap = add(WorkingMap, slope(WorkingMap.mesh, randomVector(4)));
  },
  cone : function () {
    WorkingMap = add(WorkingMap, cone(WorkingMap.mesh, -0.5));
  },
  invert: function () {
    WorkingMap = add(WorkingMap, cone(WorkingMap.mesh, 0.5));
  },
  blobs : function () {
    var blobs = $('input.terr-blob-num').val();

    blobs = blobs < 25 && blobs > 0 ? blobs : 5;
    WorkingMap = add(WorkingMap, mountains(WorkingMap.mesh, blobs));
  },
  norm : function () {
    WorkingMap = normalize(WorkingMap);
  },
  round : function () {
    WorkingMap = peaky(WorkingMap);
  },
  relax : function () {
    WorkingMap = relax(WorkingMap);
  },
  seas : function () {
    WorkingMap = setSeaLevel(WorkingMap, 0.5);
  }
};

var landscapeAges = {
  young: {
    erosions: 1,
    cleans: 1
  },
  medium: {
    erosions: 2,
    cleans: 1
  },
  old: {
    erosions: 3,
    cleans: 2
  },
  ancient: {
    erosions: 5,
    cleans: 3
  }
};

var drawWorkingMap = function () {
  visualizeVoronoi(d3svg, WorkingMap, -1, 1);
  drawPaths(d3svg, 'coast', contour(WorkingMap, 0));
}

var drawLineMap = function () {
  PoliticalMap.terr = getTerritories(PoliticalMap);
  drawPaths(d3svg, 'coast', contour(PoliticalMap.h, 0));
  drawPaths(d3svg, 'river', getRivers(PoliticalMap.h, 0.01));
  drawPaths(d3svg, 'border', getBorders(PoliticalMap));
  visualizeSlopes(d3svg, PoliticalMap);
  visualizeCities(d3svg, PoliticalMap);
};

var drawMapOfSize = function (size) {
  WorkingMap = zero(generateGoodMesh(mapSizes[size]));
  drawWorkingMap();
};

$('.terrain-controls').find('button, input').not('[data-generate=true]').prop('disabled', true);
$('.political-controls').find('button, input').prop('disabled', true);

$('.create-map').find('button').on('click', function (evt) {
  $('svg.map').empty();
  var $btn = $(evt.target);
  var size = $btn.data('size');

  drawMapOfSize(size);
  $('.terrain-controls').find('button, input').prop('disabled', false);
});

$('.make-terrain').find('button').on('click', function (evt) {
  var $btn = $(evt.target);
  var operation = $btn.data('operation');

  terrainOperations[operation]();
  drawWorkingMap();
});

$('.erode-terrain').find('button').on('click', function (evt) {
  var $btn = $(evt.target);
  var age = $btn.data('terrainAge');
  var iters = landscapeAges[age];

  // Erode the number of times for the age
  for (var i=0; i<=iters.erosions; i++) {
    WorkingMap = doErosion(WorkingMap, 0.1);
  }
  
  // Set sea level to median
  WorkingMap = setSeaLevel(WorkingMap, 0.5);

  // Clean up the coastlines appropriately
  for (var j=0; j<=iters.cleans; j++) {
    WorkingMap = cleanCoast(WorkingMap, 1);
    WorkingMap = fillSinks(WorkingMap);
  }

  drawWorkingMap();
});

$('.terrain-controls').find('button.finalize-terrain').on('click', function () {

  $('.terrain-controls').find('button, input').not('[data-generate=true]').prop('disabled', true);
  $('.political-controls').find('button, input').not('.edit-labels').prop('disabled', false);

  PoliticalMap = {
    h: WorkingMap,
    params: defaultParams,
    cities: []
  };

  $('svg.map').empty();
  drawLineMap();
});

$('.political-controls').find('button.civic-make').on('click', function () {
  var majors = $('input[name=major-cities]').val();
  var minors = $('input[name=minor-cities]').val();
  var total = parseInt(majors) + parseInt(minors);

  // Clean out any old editing inputs
  $('.label-input').remove();

  total = total < 25 ? total : 24;

  PoliticalMap.cities = [];

  PoliticalMap.params.nterrs = parseInt(majors);
  PoliticalMap.params.ncities = total;

  placeCities(PoliticalMap);

  $('svg.map').empty();
  drawLineMap();
  $('button.edit-labels').prop('disabled', false);
});

$('button.edit-labels').on('click', function () {
  var labels;

  drawMap(d3svg, PoliticalMap);

  labels = $('svg.map').find('text');

  for (var k=0; k<labels.length; k++) {
    var refString = 'text_correl_' + k;
    var $textRef = $(labels[k]);
    var $currentInput = $('<input class="label-input" data-text-relative="' + refString +'" />');

    $textRef.addClass(refString);

    $currentInput.val($textRef.text());

    $('.political-controls').append($currentInput);
  }

  $('.label-input').on('keyup', function () {
    var reference = $(this).data('textRelative');
    var $editedText = $('text.' + reference);

    $editedText.text($(this).val());
  });
});

$('button.make-img').on('click', function () {
  $('svg.map').toImage();
});

$('.attributions').on('click', function () {
  $('.credits-container').toggleClass('hidden');
});