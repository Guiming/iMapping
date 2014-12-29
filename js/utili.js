function query(){

	var queryLyr = wmslyr_obs; // default one
	queryLyr = wmslyr_sp;

	if(document.getElementById("efforts").checked){
    	queryEfforts = true;
    	queryObs = false;
    	queryLyr = wmslyr_efforts;
    }
    if(document.getElementById("sp").checked){
    	queryEfforts = false;
    	queryObs = true;
    	//queryLyr = wmslyr_obs;
    	queryLyr = wmslyr_sp;
    }

	var format = new OpenLayers.Format.CQL();
	var filter = null;
	try{
		filter = format.read(document.getElementById("cql").value);
	}catch(err){
		if(document.getElementById("cql").value == "all"){
			queryLyr.params['CQL_FILTER'] = null;
			queryLyr.redraw({force: true});
			document.getElementById("msg").style.color = "green";
			document.getElementById("msg").innerHTML = "Message: load all records.";
		}
		else{
			document.getElementById("msg").style.color = "red";
			document.getElementById("msg").innerHTML = "Message: input CQL filter is INCORRECT.";
		}
	}
	//var filter = document.getElementById("cql").value;
	if(filter){
		queryLyr.params['CQL_FILTER'] = filter;
		queryLyr.redraw({force: true});
		document.getElementById("msg").style.color = "green";
		document.getElementById("msg").innerHTML = "Message: input CQL filter is CORRECT. Running query...";
	}
}