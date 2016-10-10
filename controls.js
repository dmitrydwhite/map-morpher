var t = require('./terrain.js');
var $ = require('jquery');
var d3 = require('d3');

var WebControls = function () {

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
      WorkingMap = t.add(WorkingMap, t.slope(WorkingMap.mesh, t.randomVector(4)));
    },
    cone : function () {
      WorkingMap = t.add(WorkingMap, t.cone(WorkingMap.mesh, -0.5));
    },
    invert: function () {
      WorkingMap = t.add(WorkingMap, t.cone(WorkingMap.mesh, 0.5));
    },
    blobs : function () {
      var blobs = $('input.terr-blob-num').val();

      blobs = blobs < 25 && blobs > 0 ? blobs : 5;
      WorkingMap = t.add(WorkingMap, t.mountains(WorkingMap.mesh, blobs));
    },
    norm : function () {
      WorkingMap = t.normalize(WorkingMap);
    },
    round : function () {
      WorkingMap = t.peaky(WorkingMap);
    },
    relax : function () {
      WorkingMap = t.relax(WorkingMap);
    },
    seas : function () {
      WorkingMap = t.setSeaLevel(WorkingMap, 0.5);
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
    t.visualizeVoronoi(d3svg, WorkingMap, -1, 1);
    t.drawPaths(d3svg, 'coast', t.contour(WorkingMap, 0));
  }

  var drawLineMap = function () {
    PoliticalMap.terr = t.getTerritories(PoliticalMap);
    t.drawPaths(d3svg, 'coast', t.contour(PoliticalMap.h, 0));
    t.drawPaths(d3svg, 'river', t.getRivers(PoliticalMap.h, 0.01));
    t.drawPaths(d3svg, 'border', t.getBorders(PoliticalMap));
    t.visualizeSlopes(d3svg, PoliticalMap);
    t.visualizeCities(d3svg, PoliticalMap);
  };

  var drawMapOfSize = function (size) {
    WorkingMap = t.zero(t.generateGoodMesh(mapSizes[size]));
    drawWorkingMap();
  };

  var openMapInNewTabForPrinting = function () {
    var serializer = new XMLSerializer();
    var mapSvg = document.getElementsByClassName('map')[0];
    var doc = document.implementation.createHTMLDocument('Line Map');
    var stylesheet = document.createElement('link');
    var printBtn = document.createElement('button');
    var printScriptMin = 'javascript:var btnCont = document.getElementsByTagName("button")[0]; btnCont.remove(); window.print(); document.body.appendChild(btnCont);'

    var stylesheetAttrs = {
      'href': './styles/map.css',
      'rel': 'stylesheet',
      'type': 'text/css'
    };

    var newHtml, svgWin;

    for (var attrib in stylesheetAttrs) {
      if (stylesheetAttrs.hasOwnProperty(attrib)) {
        stylesheet.setAttribute(attrib, stylesheetAttrs[attrib]);
      }
    }

    printBtn.setAttribute('onClick', printScriptMin);
    printBtn.textContent = 'Print This Map';

    doc.body.appendChild(mapSvg);
    doc.body.appendChild(printBtn);
    doc.head.appendChild(stylesheet);
    newHtml = serializer.serializeToString(doc);
    svgWin = window.open('print_window');
    svgWin.document.write(newHtml);
    $('.mappane').append(mapSvg);
  };

  var setInteractions = function () {

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
        WorkingMap = t.doErosion(WorkingMap, 0.1);
      }
      
      // Set sea level to median
      WorkingMap = t.setSeaLevel(WorkingMap, 0.5);

      // Clean up the coastlines appropriately
      for (var j=0; j<=iters.cleans; j++) {
        WorkingMap = t.cleanCoast(WorkingMap, 1);
        WorkingMap = t.fillSinks(WorkingMap);
      }

      drawWorkingMap();
    });

    $('.terrain-controls').find('button.finalize-terrain').on('click', function () {

      $('.terrain-controls').find('button, input').not('[data-generate=true]').prop('disabled', true);
      $('.political-controls').find('button, input').not('.edit-labels').prop('disabled', false);

      PoliticalMap = {
        h: WorkingMap,
        params: t.defaultParams,
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

      t.placeCities(PoliticalMap);

      $('svg.map').empty();
      drawLineMap();
      $('button.edit-labels').prop('disabled', false);
    });

    $('button.edit-labels').on('click', function () {
      var labels;

      $('button.make-img').prop('disabled', false);

      t.drawMap(d3svg, PoliticalMap);

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
      openMapInNewTabForPrinting();
    });

    $('.attributions').on('click', function () {
      $('.credits-container').toggleClass('hidden');
    });
  };

  return { setInteractions: setInteractions };
};

module.exports = WebControls;

