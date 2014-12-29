
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

var map;
var popup;
var popup_on = false;
 
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
	map = new OpenLayers.Map ("map", {   
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
		displayProjection: WGS84,
		units: 'm'
	} );
	 
	// map extent
	var mapextent =	new OpenLayers.Bounds(-158.36984, 24.38723, -52.15247, 66.90247).transform(WGS84, WGS84_google_mercator);
	var center = new OpenLayers.LonLat(-98.18596,40.82880).transform(WGS84, WGS84_google_mercator);
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

	// Define three colors that will be used to style the cluster features
    // depending on the number of features they contain.
    var colors = {
        low: "rgb(181, 226, 140)", 
        middle: "rgb(241, 211, 87)", 
        high: "rgb(253, 156, 115)"
    };
    
    // Define three rules to style the cluster features.
    var lowRule = new OpenLayers.Rule({
        filter: new OpenLayers.Filter.Comparison({
            type: OpenLayers.Filter.Comparison.LESS_THAN,
            property: "count",
            value: 20
        }),
        symbolizer: {
            fillColor: colors.low,
            fillOpacity: 0.9, 
            strokeColor: colors.low,
            strokeOpacity: 0.5,
            strokeWidth: 12,
            pointRadius: 10,
            label: "${count}",
            labelOutlineWidth: 1,
            fontColor: "#ffffff",
            fontOpacity: 0.8,
            fontSize: "12px"
        }
    });
    var middleRule = new OpenLayers.Rule({
        filter: new OpenLayers.Filter.Comparison({
            type: OpenLayers.Filter.Comparison.BETWEEN,
            property: "count",
            lowerBoundary: 20,
            upperBoundary: 100
        }),
        symbolizer: {
            fillColor: colors.middle,
            fillOpacity: 0.9, 
            strokeColor: colors.middle,
            strokeOpacity: 0.5,
            strokeWidth: 12,
            pointRadius: 15,
            label: "${count}",
            labelOutlineWidth: 1,
            fontColor: "#ffffff",
            fontOpacity: 0.8,
            fontSize: "12px"
        }
    });
    var highRule = new OpenLayers.Rule({
        filter: new OpenLayers.Filter.Comparison({
            type: OpenLayers.Filter.Comparison.GREATER_THAN,
            property: "count",
            value: 100
        }),
        symbolizer: {
            fillColor: colors.high,
            fillOpacity: 0.9, 
            strokeColor: colors.high,
            strokeOpacity: 0.5,
            strokeWidth: 12,
            pointRadius: 20,
            label: "${count}",
            labelOutlineWidth: 1,
            fontColor: "#ffffff",
            fontOpacity: 0.8,
            fontSize: "12px"
        }
    });
    
    // Create a Style that uses the three previous rules
    var style = new OpenLayers.Style(null, {
        rules: [lowRule, middleRule, highRule]
    });
	 
	//wfs-t editable overlay
	var wfslyr = new OpenLayers.Layer.Vector("BBS Routes (WFS)", {
		maxScale: 8000000,
		renderers: ['Canvas','SVG'],
		strategies: [
			//new OpenLayers.Strategy.BBOX(), 
			//new OpenLayers.Strategy.Cluster(),
			new OpenLayers.Strategy.Fixed(), 
			new OpenLayers.Strategy.AnimatedCluster({
	            distance: 45,
	            animationMethod: OpenLayers.Easing.Expo.easeOut,
	            animationDuration: 10
	        }),
			saveStrategy
		],
		styleMap:  new OpenLayers.StyleMap(style),
		//projection: new OpenLayers.Projection("EPSG:26910"),
		protocol: new OpenLayers.Protocol.WFS({
			version: "1.1.0",
			// loading data through localhost url path
			url: "http://localhost:8080/geoserver/geows/wfs",
			featureNS :  "http://www.geows.org",
			maxExtent: mapextent,
			// layer name
			featureType: "bbs_routes",
			// geometry column name
			geometryName: "geog_wgs84",
			
			// it seems this does not impact at all
			schema: "http://localhost:8080/geoserver/wfs/DescribeFeatureType?version=1.1.0&;typename=geows:bbs_routes"
		})
	});

	// wms layer (tiled)
	var wmslyr = new OpenLayers.Layer.WMS("BBS Routes (WMS)", 
		"http://localhost:8080/geoserver/geows/gwc/service/wms",
		//"http://localhost:8080/geoserver/geows/wms",
		{			
			"LAYERS": 'geows:bbs_routes',
			"STYLES": '',
			transparent: true,
			format: 'image/png'
		},
		{
		   minScale: 8000000,
		   buffer: 0,
	       displayOutsideMaxExtent: true,
	       isBaseLayer: false,
	       yx : {'EPSG:4326' : true}		   
		}		
	);

	// heat map lyr
	/*
	var heatmaplyr = new OpenLayers.Layer.Vector.HeatMap("HeatMap", {
        rendererOptions: {
            // a radius of 20px looks good at this zoom-level
            pointSize: 20
            //heatMapWebWorkerPath: "../lib/heatmap-js/heatmap-webworker.js"
            
        }
    });
    heatmaplyr.addFeatures(wfslyr.features);
    */
	map.addLayer(wmslyr);
	map.addLayers([google_maps, google_satellite, openstreetmap]);
	map.addLayer(wfslyr);
	//map.addLayer(wmslyr);
	//map.addLayer(heatmaplyr);


	map.setCenter(center, 4);
	//map.zoomToExtent(mapextent);
	 
	// add the custom editing toolbar
	var panel = new OpenLayers.Control.Panel(
		{displayClass: "customEditingToolbar"}
	);
	 
	var navigate = new OpenLayers.Control.Navigation({
		title: "Pan Map"
	});
	 
	var draw = new OpenLayers.Control.DrawFeature(
		wfslyr, OpenLayers.Handler.Polygon,
		{
			title: "Draw Feature",
			displayClass: "olControlDrawFeaturePolygon",
			multi: true
		}
	);
	 
	var edit = new OpenLayers.Control.ModifyFeature(wfslyr, {
		title: "Modify Feature",
		displayClass: "olControlModifyFeature"
	});
	 
	var del = new DeleteFeature(wfslyr, {title: "Delete Feature"});
	 
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

	// support GetFeatureInfo
    map.events.register('click', map, function (e) {

    	//ex = e.xy.x;
    	//ey = e.xy.y;

        document.getElementById('nodelist').innerHTML = "Loading... please wait...";
        var params = {
            REQUEST: "GetFeatureInfo",
            EXCEPTIONS: "application/vnd.ogc.se_xml",
            BBOX: map.getExtent().toBBOX(),
            SERVICE: "WMS",
            INFO_FORMAT: 'text/html',
            //INFO_FORMAT: 'application/json',
            QUERY_LAYERS: map.layers[0].params.LAYERS,
            FEATURE_COUNT: 1,
            "Layers": 'geows:bbs_routes',
            WIDTH: map.size.w,
            HEIGHT: map.size.h,
            format: 'image/png',
            styles: map.layers[0].params.STYLES,
            srs: map.layers[0].params.SRS};
        
        // handle the wms 1.3 vs wms 1.1 madness
        if(map.layers[0].params.VERSION == "1.3.0") {
            params.version = "1.3.0";
            params.j = parseInt(e.xy.x);
            params.i = parseInt(e.xy.y);
        } else {
            params.version = "1.1.1";
            params.x = parseInt(e.xy.x);
            params.y = parseInt(e.xy.y);
        }
            
        // merge filters
        if(map.layers[0].params.CQL_FILTER != null) {
            params.cql_filter = map.layers[0].params.CQL_FILTER;
        } 
        if(map.layers[0].params.FILTER != null) {
            params.filter = map.layers[0].params.FILTER;
        }
        if(map.layers[0].params.FEATUREID) {
            params.featureid = map.layers[0].params.FEATUREID;
        }
        OpenLayers.loadURL("http://localhost:8080/geoserver/geows/wms", params, this, openPopup, openPopup);
        OpenLayers.Event.stop(e);
    });

	// sets the HTML provided into the nodelist element
	function openPopup(response){
    	//document.getElementById('nodelist').innerHTML = response.responseText;

    	if(popup_on){
    		map.removePopup(popup); // it will destroy firstly added popup
			popup.destroy(); // the same thing
			popup_on = false;
    	}

    	popup = new OpenLayers.Popup("chicken",
                   map.getLonLatFromPixel(map.getControlsByClass("OpenLayers.Control.MousePosition")[0].lastXy),
                   new OpenLayers.Size(400,120),
                   response.responseText,
                   true);

		map.addPopup(popup);
		//map.popups[0].show();
		popup_on = true;
	};
}