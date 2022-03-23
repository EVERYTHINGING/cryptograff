import "ol/ol.css";
import Map from "ol/Map";
import { OSM, TileDebug } from "ol/source";
import TileLayer from "ol/layer/Tile";
import View from "ol/View";
import XYZ from "ol/source/XYZ";
import { transform } from "ol/proj";
import { getCenter } from "ol/extent";
import { easeOut } from "ol/easing";
import firebase from "firebase/app";
import "firebase/storage";
import Painterro from "painterro";

var paint = Painterro({
  defaultTool: "brush",
  how_to_paste_actions: ["replace_all"],
  saveHandler: function (image, done) {
    saveImage(image.asDataURL());
    done(true);
  }
});
// Your web app's Firebase configuration
var firebaseConfig = {
  apiKey: "AIzaSyDxO7_7EVDYAT840yK6mVau4XpESpkfbOk",
  authDomain: "cryptoquilt.firebaseapp.com",
  projectId: "cryptoquilt",
  storageBucket: "cryptoquilt.appspot.com",
  messagingSenderId: "1021300496054",
  appId: "1:1021300496054:web:7a140c22c2e510eef2b817"
};
// Initialize Firebase
if (firebase.apps.length <= 0) {
  firebase.initializeApp(firebaseConfig);
}
// Create a root reference
const storage = firebase.storage();

var key = "LUnIm55PLOCTftGgqPvt";
var attributions =
  '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> ' +
  '<a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>';

var imageRef, tileID;
var sourceXYZ = new XYZ({
  attributions: attributions,
  tileUrlFunction: function (coords, arg1, arg2) {
    var x = coords[1];
    var y = coords[2];
    var zoom = coords[0];
    var url =
      "https://api.maptiler.com/maps/outdoor/256/" +
      zoom +
      "/" +
      x +
      "/" +
      y +
      "@2x.png?key=" +
      key;
    return url;
  },
  //url: 'https://api.maptiler.com/maps/outdoor/256/{z}/{x}/{y}@2x.png?key=' +key,
  tilePixelRatio: 2 // THIS IS IMPORTANT
});

sourceXYZ.setTileLoadFunction(function (tile, src) {
  if (tile.getTileCoord()[0] >= view.getMaxZoom()) {
    tileID = tile.getTileCoord().join("-");
    imageRef = storage.ref().child(tileID + ".png");
    imageRef
      .getDownloadURL()
      .then((url) => {
        //console.log("using firebase image");
        tile.getImage().src = url;
      })
      .catch((error) => {
        //console.log("using map image");
        tile.getImage().src = src;
      });
  } else {
    tile.getImage().src = src;
  }
});

var view = new View({
  projection: "EPSG:3857",
  center: transform([-112.18688965, 36.057944835], "EPSG:4326", "EPSG:3857"),
  zoom: 8
});
view.setMaxZoom(8);

var map = new Map({
  target: "map",
  layers: [
    new TileLayer({
      source: new OSM()
    }),
    new TileLayer({
      source: sourceXYZ
    }),
    new TileLayer({
      source: new TileDebug()
    })
  ],
  view: view
});

const grid = sourceXYZ.getTileGrid();
var $drawingCanvas = document.getElementById("drawing-canvas");
var $drawingCanvasCTX = $drawingCanvas.getContext("2d");
var $drawingCanvasImage = new Image();
$drawingCanvasImage.crossOrigin = "anonymous";
var IS_EDITING = false;
var CURRENT_TILE = null;

function editImage() {
  IS_EDITING = true;
  console.log("editing image...");

  paint.show($drawingCanvasImage.src);
}

function saveImage(dataURL) {
  //var dataURL = image.toDataURL("image/png");
  var tileName = CURRENT_TILE.getTileCoord().join("-");
  CURRENT_TILE.getImage().src = dataURL;
  //$drawingCanvas.classList.remove("enable");
  IS_EDITING = false;
  sourceXYZ.changed();

  //upload to firebase for later download
  storage
    .ref()
    .child(tileName + ".png")
    .putString(dataURL, "data_url")
    .then((snapshot) => {
      console.log("uploaded image: " + tileName);
      //sourceXYZ.clear();
      //sourceXYZ.changed();
    });
}

$drawingCanvasImage.onload = function () {
  console.log("edit image loaded");
  if (!IS_EDITING) {
    editImage();
  }
};

$drawingCanvasImage.addEventListener(
  "progress",
  function (event) {
    console.log(event);
  },
  false
);

map.on("singleclick", function (event) {
  if (!view.getAnimating()) {
    const tileCoord = grid.getTileCoordForCoordAndZ(
      event.coordinate,
      view.getZoom()
    );

    if (tileCoord[0] >= view.getMaxZoom()) {
      CURRENT_TILE = sourceXYZ.getTile(
        tileCoord[0],
        tileCoord[1],
        tileCoord[2]
      );

      view.animate({
        center: getCenter(grid.getTileCoordExtent(tileCoord)),
        zoom: view.getMaxZoom(),
        duration: 150,
        easing: easeOut
      });

      //CURRENT_TILE.getImage().crossOrigin = "anonymous";
      $drawingCanvasImage.src = CURRENT_TILE.getImage().src;

      //console.log("image src: " + $drawingCanvasImage.src);
    } else {
      view.animate({
        center: event.coordinate,
        zoom: Math.round(view.getZoom()) + 1,
        duration: 150,
        easing: easeOut
      });
    }
  }
});

map.on("movestart", function (event) {
  if (IS_EDITING) {
    IS_EDITING = false;
    //$drawingCanvas.classList.remove("enabled");
    //saveImage();
  }
});
