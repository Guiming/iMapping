OpenLayers.ProxyHost = "/cgi-bin/proxy.cgi?url=";
 
//set up the modification tools
var DeleteFeature = OpenLayers.Class(OpenLayers.Control, {
initialize: function(layer, options) {
OpenLayers.Control.prototype.initialize.apply(this, [options]);
this.layer = layer;
this.handler = new OpenLayers.Handler.Feature(
this, layer, {click: this.clickFeature}
);
},
clickFeature: function(feature) {
// if feature doesn't have a fid, destroy it
if(feature.fid == undefined) {
this.layer.destroyFeatures([feature]);
} else {
feature.state = OpenLayers.State.DELETE;
this.layer.events.triggerEvent("afterfeaturemodified",
{feature: feature});
feature.renderIntent = "select";
this.layer.drawFeature(feature);
}
},
setMap: function(map) {
this.handler.setMap(map);
OpenLayers.Control.prototype.setMap.apply(this, arguments);
},
CLASS_NAME: "OpenLayers.Control.DeleteFeature"
});
 
function showMsg(szMessage) {
document.getElementById("nodelist").innerHTML = szMessage;
setTimeout(
"document.getElementById('nodelist').innerHTML = ''",2000);
}
 
function showSuccessMsg(){
showMsg("Transaction successfully completed");
};
 
function showFailureMsg(){
showMsg("An error occured while operating the transaction");
};
 
 
function init() {
//set up a save strategy
var saveStrategy = new OpenLayers.Strategy.Save();
saveStrategy.events.register("success", '', showSuccessMsg);
saveStrategy.events.register("failure", '', showFailureMsg);
 
//set up projections
// World Geodetic System 1984 projection
var WGS84 = new OpenLayers.Projection("EPSG:4326");   
// WGS84 Google Mercator projection
var WGS84_google_mercator = new OpenLayers.Projection("EPSG:900913");   
 
//Initialize the map
//creates a new openlayers map in the <div> html element with id="map"
var map = new OpenLayers.Map ("map", {   
controls:[
//allows the user pan ability
new OpenLayers.Control.Navigation(),
//displays the pan/zoom tools                   
new OpenLayers.Control.PanZoom(),
//displays a layer switcher
new OpenLayers.Control.LayerSwitcher(),   
//displays the mouse position's coordinates in a
//<div> html element with id="coordinates"
new OpenLayers.Control.MousePosition(
{div:document.getElementById("coordinates")})   
],
//projection: WGS84_google_mercator,
displayProjection: WGS84
} );
 
// map extent
var mapextent =
new OpenLayers.Bounds(-123.17341, 49.24343, -123.06183, 49.29899).transform(WGS84, WGS84_google_mercator);
 
//base layers
var openstreetmap = new OpenLayers.Layer.OSM();
var google_maps = new OpenLayers.Layer.Google(
"Google Maps", {
numZoomLevels: 20
}
);
var google_satellite = new OpenLayers.Layer.Google(
"Google Satellite", {
type: google.maps.MapTypeId.SATELLITE,
numZoomLevels: 20
}
);
 
//wfs-t editable overlay
var wfs_layer = new OpenLayers.Layer.Vector("Editable Features", {
strategies: [new OpenLayers.Strategy.BBOX(), saveStrategy],
projection: new OpenLayers.Projection("EPSG:26910"),
protocol: new OpenLayers.Protocol.WFS({
version: "1.1.0",
// loading data through localhost url path
url: "http://localhost:8080/geoserver/geows/wfs",
featureNS :  "http://www.geows.org",
//outputFormat: "application/json",
//readFormat: new OpenLayers.Format.GeoJSON(),
maxExtent: mapextent,
// layer name
featureType: "wfst_test",
// geometry column name
geometryName: "geom",
schema: "http://localhost:8080/geoserver/geows/wfs/DescribeFeatureType?version=1.1.0&;typename=geows:wfst_test"
})
});
/*
// setup tiled layer
var tiled = new OpenLayers.Layer.WMS(
	"cite:habitatsuitability - Tiled", "http://localhost:8080/geoserver/cite/wms",
	{
		"LAYERS": 'cite:habitatsuitability',
		transparent: true,
		"STYLES": '',
		format: 'image/png'
	},
	{
		buffer: 0,
		displayOutsideMaxExtent: true,
		isBaseLayer: false,
		yx : {'EPSG:900913' : false}
	} 
);
 */
map.addLayers([openstreetmap, google_maps, google_satellite, wfs_layer]);
//map.addLayers([wfs_layer, openstreetmap]);
//map.addLayer(google_maps);
//map.addLayer(tiled);
//map.addLayer(wfs_layer);

//mapextent =
//new OpenLayers.Bounds(99.2166, 26.2975, 99.2873, 26.3494).transform(WGS84, WGS84_google_mercator);

map.zoomToExtent(mapextent);
 
// add the custom editing toolbar
var panel = new OpenLayers.Control.Panel(
{'displayClass': 'customEditingToolbar'}
);
 
var navigate = new OpenLayers.Control.Navigation({
title: "Pan Map"
});
 
var draw = new OpenLayers.Control.DrawFeature(
wfs_layer, OpenLayers.Handler.Polygon,
{
title: "Draw Feature",
displayClass: "olControlDrawFeaturePolygon",
multi: true
}
);
 
var edit = new OpenLayers.Control.ModifyFeature(wfs_layer, {
title: "Modify Feature",
displayClass: "olControlModifyFeature"
});
 
var del = new DeleteFeature(wfs_layer, {title: "Delete Feature"});
 
var save = new OpenLayers.Control.Button({
title: "Save Changes",
trigger: function() {
if(edit.feature) {
edit.selectControl.unselectAll();
}
saveStrategy.save();
// alert('saved');
},
displayClass: "olControlSaveFeatures"
});
 
panel.addControls([navigate, save, del, edit, draw]);
panel.defaultControl = navigate;
map.addControl(panel);
}