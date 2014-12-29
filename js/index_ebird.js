
OpenLayers.ProxyHost = "/cgi-bin/proxy.cgi?url=";
 

/* global variables */
var map;
var wmslyr_srd;
var wmslyr_bbs;
var wmslyr_bbsrte;
var wmslyr_efforts;
var wmslyr_obs;
var wmslyr_sp;
var wfslyr;
var wmscql;
var format = new OpenLayers.Format.CQL();

var queryEfforts = true;
var queryObs = false;
var queryLyr;

var scale = "state";
//scale = "county";
//scale = "nation";

// State scale (WI)
var wmslyr_efforts_name = "geows:allsp_efforts_wi_2012";
var wmslyr_obs_name = "geows:obs_wi_2012";
var wmslyr_srd_name = "geows:srd_point_data_3km_wi";
var wmslyr_sp_name = "geows:redtailedhawk_wi_2012";

var wmslyr_bbs_name = "geows:bbs_routes";
var wmslyr_bbsrte_name = "geows:bbsrte_2012_alb_wi";

var zoomlevel = 7;
// make change to line 124 as well

if(scale == "county"){
	// County scale (Dane)
	wmslyr_efforts_name = "geows:allsp_efforts_dane";
	wmslyr_obs_name = "geows:allsp_obs_dane";
	wmslyr_srd_name = "geows:srd_point_data_3km_dane";
	wmslyr_sp_name = "geows:red_tailed_hawk_dane";
	zoomlevel = 10; 
	// make change to line 123 as well
}

if(scale == "nation"){
	// County scale (Dane)
	wmslyr_efforts_name = "geows:sampling_events_checklists_2012";
	wmslyr_sp_name = "geows:redtailedhawk_checklists_2012";
	zoomlevel = 5; 
	// make change to line 123 as well
}

var filter_bbs = "countrynum = 840 AND statenum = 91";
if(scale == "nation"){
	filter_bbs = "countrynum = 840";
}

var filter_efforts = null;
var filter_obs = null;
var filter_sp = null;
if(scale == "nation"){
	filter_efforts = "month > 4 and month < 9";
	filter_sp = "month > 4 and month < 9";
}

var popup;
var popup_on = false;
 
function init() {
	 
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
			//new OpenLayers.Control.LayerSwitcherGroups(), // will work on this later  
			//displays the mouse position's coordinates in a
			//<div> html element with id="coordinates"
			new OpenLayers.Control.MousePosition()   
		],
		//projection: WGS84_google_mercator,
		displayProjection: WGS84,
		units: 'm'
	} );
	 
	// map extent
	var mapextent =	new OpenLayers.Bounds(-89.81767, 42.84778, -89.07381, 43.29604).transform(WGS84, WGS84_google_mercator);
	
	var center;
	// by default, it's state level
	center = new OpenLayers.LonLat(-89.58414,44.75419).transform(WGS84, WGS84_google_mercator); // wisconsin
	if(scale == "county"){
		center = new OpenLayers.LonLat(-89.42896,43.07254).transform(WGS84, WGS84_google_mercator); // madison
	}
	if(scale == "nation"){
		center = new OpenLayers.LonLat(-98.5833,39.8333).transform(WGS84, WGS84_google_mercator); // madison
	}	
	
	//base layers
	var openstreetmap = new OpenLayers.Layer.OSM();
	var google_maps = new OpenLayers.Layer.Google(
		"Google Maps", {
		numZoomLevels: 20
		}
	);
	var google_terrain = new OpenLayers.Layer.Google(
		"Google Terrain", {
		type: google.maps.MapTypeId.TERRAIN,
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
            value: 100
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
            lowerBoundary: 100,
            upperBoundary: 1000
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
            value: 1000
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
	 
	//wfs layer (cluster)
	wfslyr = new OpenLayers.Layer.Vector("Red-tailed Hawk (WFS)", {
		maxScale: 20000,
		renderers: ['Canvas','SVG'],
		strategies: [
			new OpenLayers.Strategy.BBOX(), 
			//new OpenLayers.Strategy.Cluster(),
			//new OpenLayers.Strategy.Fixed(), 
			new OpenLayers.Strategy.AnimatedCluster({
	            distance: 45,
	            animationMethod: OpenLayers.Easing.Expo.easeOut,
	            animationDuration: 10
	        })
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
			featureType: wmslyr_sp_name.split(':')[1],
			// geometry column name
			geometryName: "geog",
			
			// it seems this does not impact at all
			schema: "http://localhost:8080/geoserver/wfs/DescribeFeatureType?version=1.1.0&;typename=geows:" + wmslyr_sp_name
		})
	});
	
	// wms layer (tiled)
	wmslyr_bbs = new OpenLayers.Layer.WMS("BBS Routes (starting stop)", 
		"http://localhost:8080/geoserver/geows/gwc/service/wms",
		//"http://localhost:8080/geoserver/geows/wms",
		{			
			"LAYERS": wmslyr_bbs_name,
			"STYLES": '',
			transparent: true,
			format: 'image/png',			
			cql_filter: filter_bbs
			
		},
		{
		   buffer: 0,
	       displayOutsideMaxExtent: true,
	       isBaseLayer: false,
	       yx : {'EPSG:4326' : true}		   
		}		
	);

	wmslyr_bbsrte = new OpenLayers.Layer.WMS("BBS Routes", 
		"http://localhost:8080/geoserver/geows/gwc/service/wms",
		//"http://localhost:8080/geoserver/geows/wms",
		{			
			"LAYERS": wmslyr_bbsrte_name,
			"STYLES": '',
			transparent: true,
			format: 'image/png'			
			//cql_filter: filter_bbsrte
			
		},
		{
		   buffer: 0,
	       displayOutsideMaxExtent: true,
	       isBaseLayer: false,
	       yx : {'EPSG:4326' : true}		   
		}		
	);

		// wms layer (tiled)
	wmslyr_srd = new OpenLayers.Layer.WMS("Stratified Random Design", 
		"http://localhost:8080/geoserver/geows/gwc/service/wms",
		//"http://localhost:8080/geoserver/geows/wms",
		{			
			"LAYERS": wmslyr_srd_name,
			"STYLES": '',
			transparent: true,
			format: 'image/png'
			//cql_filter: filter_srd
			
		},
		{
		   buffer: 0,
	       displayOutsideMaxExtent: true,
	       isBaseLayer: false,
	       yx : {'EPSG:4326' : true}		   
		}		
	);
	
	// wms layer (tiled)
	wmslyr_efforts = new OpenLayers.Layer.WMS("Sampling Events", 
		"http://localhost:8080/geoserver/geows/gwc/service/wms?tiled=true",
		//"http://localhost:8080/geoserver/geows/wms",
		{			
			"LAYERS": wmslyr_efforts_name,
			"STYLES": '',
			transparent: true,
			format: 'image/png',
			cql_filter: filter_efforts
		},
		{
		   //maxScale: 20000,
		   buffer: 0,
	       displayOutsideMaxExtent: true,
	       isBaseLayer: false,
	       yx : {'EPSG:4326' : true}		   
		}	
	);

		// wms layer (tiled)
	wmslyr_obs = new OpenLayers.Layer.WMS("Birds Records", 
		"http://localhost:8080/geoserver/geows/gwc/service/wms?tiled=true",
		//"http://localhost:8080/geoserver/geows/wms",
		{			
			"LAYERS": wmslyr_obs_name,
			"STYLES": '',
			transparent: true,
			format: 'image/png'
			//cql_filter: filter_obs
		},
		{
		   //maxScale: 20000,
		   buffer: 0,
	       displayOutsideMaxExtent: true,
	       isBaseLayer: false,
	       yx : {'EPSG:4326' : true}		   
		}		
	);

	wmslyr_sp = new OpenLayers.Layer.WMS("Red-tailed Hawk", 
		"http://localhost:8080/geoserver/geows/gwc/service/wms?tiled=true",
		//"http://localhost:8080/geoserver/geows/wms",
		{			
			"LAYERS": wmslyr_sp_name,
			"STYLES": '',
			transparent: true,
			format: 'image/png',
			cql_filter: filter_sp
		},
		{
		   //minScale: 20000,
		   buffer: 0,
	       displayOutsideMaxExtent: true,
	       isBaseLayer: false,
	       yx : {'EPSG:4326' : false}		   
		}	
	);

	// grouping does not seem to work
	var group = [google_maps, openstreetmap, google_satellite];
	for (var i=0; i < group.length; i++) { group[i].group = "Base Map"; }

	group = [wmslyr_srd];
	for (var i=0; i < group.length; i++) { group[i].group = 'SRD'; }
    
    group = [wmslyr_bbs, wmslyr_bbsrte];
	for (var i=0; i < group.length; i++) { group[i].group = 'BBS'; }

	group = [wmslyr_efforts, wmslyr_obs, wmslyr_sp, wfslyr];
	for (var i=0; i < group.length; i++) { group[i].group = 'eBird'; }
	/* add all layers once */
	//map.addLayers([google_maps, openstreetmap, google_satellite, wmslyr_srd, wmslyr_bbs, wmslyr_efforts, wmslyr_obs, wmslyr_sp]);

	///*
	map.addLayers([google_terrain, google_satellite, google_maps, openstreetmap]);

	if(scale == "county"){
		map.addLayer(wmslyr_srd);
	}
	map.addLayer(wmslyr_bbsrte);
	map.addLayer(wmslyr_bbs);
	map.addLayer(wmslyr_efforts);
	//map.addLayer(wmslyr_obs);	
	map.addLayer(wmslyr_sp);
	//map.addLayer(wfslyr);
	//*/
	

	map.setCenter(center, zoomlevel);

	 
	// add the custom editing toolbar
	var panel = new OpenLayers.Control.Panel(
		{displayClass: "customEditingToolbar"}
	);
	 
	var navigate = new OpenLayers.Control.Navigation({
		title: "Pan Map"
	});	

	 
	//panel.addControls([navigate, save, del, edit, draw]);
	panel.addControls([navigate]);
	panel.defaultControl = navigate;
	map.addControl(panel);

	// support GetFeatureInfo
    map.events.register('click', map, function (e) {
        //document.getElementById('nodelist').innerHTML = "Loading... please wait...";

        queryLyr = wmslyr_efforts; // default one
        var queryLyrName = wmslyr_efforts_name;
        if(document.getElementById("efforts").checked){
        	queryEfforts = true;
        	queryObs = false;
        	queryLyr = wmslyr_efforts;
        	queryLyrName = wmslyr_efforts_name;
        }
        if(document.getElementById("sp").checked){
        	queryEfforts = false;
        	queryObs = true;
        	//queryLyr = wmslyr_obs;
        	//queryLyrName = wmslyr_obs_name;
        	queryLyr = wmslyr_sp;
        	queryLyrName = wmslyr_sp_name;
        }

        var params = {
            REQUEST: "GetFeatureInfo",
            EXCEPTIONS: "application/vnd.ogc.se_xml",
            BBOX: map.getExtent().toBBOX(),
            SERVICE: "WMS",
            //INFO_FORMAT: 'text/html',
            INFO_FORMAT: 'application/json',
            QUERY_LAYERS: queryLyr.params.LAYERS,
            FEATURE_COUNT: 1,
            "Layers": queryLyrName,
            WIDTH: map.size.w,
            HEIGHT: map.size.h,
            format: 'image/png',
            styles: queryLyr.params.STYLES,
            srs: queryLyr.params.SRS};
        
        // handle the wms 1.3 vs wms 1.1 madness
        if(queryLyr.params.VERSION == "1.3.0") {
            params.version = "1.3.0";
            params.j = parseInt(e.xy.x);
            params.i = parseInt(e.xy.y);
        } else {
            params.version = "1.1.1";
            params.x = parseInt(e.xy.x);
            params.y = parseInt(e.xy.y);
        }
            
        // merge filters
        if(queryLyr.params.CQL_FILTER != null) {
            params.cql_filter = queryLyr.params.CQL_FILTER;
        } 
        if(queryLyr.params.FILTER != null) {
            params.filter = queryLyr.params.FILTER;
        }
        if(queryLyr.params.FEATUREID) {
            params.featureid = queryLyr.params.FEATUREID;
        }
        OpenLayers.loadURL("http://localhost:8080/geoserver/geows/wms", params, this, openPopup, null);
        OpenLayers.Event.stop(e);
    });

	function openPopup(response){  	
    	if(popup_on){
    		map.removePopup(popup); // it will destroy firstly added popup
			popup.destroy(); // the same thing
			popup_on = false;
    	}

    	var json = JSON.parse(response.responseText);
		if(queryLyr.visibility && json.features.length > 0){

			var popupHtml = "";
			var keys = Object.keys(json.features[0].properties);
			for(var key in keys){
			    popupHtml = popupHtml + "<b><i>" + keys[key].split("_").join(" ") + ":</i></b> " + json.features[0].properties[keys[key]] + "<br>";
			}

	    	popup = new OpenLayers.Popup.CSSFramedCloud("popup",
	                   map.getLonLatFromPixel(map.getControlsByClass("OpenLayers.Control.MousePosition")[0].lastXy),
	                   //new OpenLayers.Size(600,150),
	                   null,
	                   popupHtml, 
	                   null,
	                   true);

			map.addPopup(popup);
			popup_on = true;
		}
	};
}