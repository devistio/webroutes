var pageMod = require("sdk/page-mod");
var buttons = require('sdk/ui/button/action');
var tabs 	= require("sdk/tabs");
var wrkrs 	= require("sdk/page-worker");

// via: http://stackoverflow.com/a/21553982/1104148
function getLocation(href) {
	var match = href.match(/^(https?\:)\/\/(([^:\/?#]*)(?:\:([0-9]+))?)(\/[^?#]*)(\?[^#]*|)(#.*|)$/);
	return match && {
		protocol: match[1],
		host: match[2],
		hostname: match[3],
		port: match[4],
		pathname: match[5],
		search: match[6],
		hash: match[7]
	}
}


// ---------------------------------------------------------------------
// create browser addon icon/button ------------------------------------
// ---------------------------------------------------------------------

var button = buttons.ActionButton({
	id: "webroutes-addon",
	label: "WebRoutes",
	icon: {
		"32": "./icons/icon-32.png",
		"48": "./icons/icon-48.png",
		"64": "./icons/icon-64.png",
		"96": "./icons/icon-96.png"
	}
	// onClick: function(state){
	// 	tabs.open("http://www.mozilla.org/");
	// }
});


// ---------------------------------------------------------------------
// create background page worker  --------------------------------------
// ---------------------------------------------------------------------

var wrkr = wrkrs.Page({
	contentScriptWhen: "ready",
	contentScriptFile: ['./socket.io.js','./worker.js']
});

// when receive "new hop" from worker
wrkr.port.on("trace hop", function(hop){
	// update loader w/ hop info 
	//console.log(hop);
	// tabs.activeTab.attach({ 
	// 	contentScript: 
	// 	'document.getElementById("traceroute-info").innerHTML += "'+hop.hop+' : '+hop.ip+' <br>"' 
	// });
});

wrkr.port.on('browser hop', function(hop) {
	console.log('sending:')
	console.log(hop)
	tabs.activeTab.attach({ 
		contentScriptFile: 'browser-hop.js',
		contentScript:`onHopReceived(${JSON.stringify(hop)})` });
});

// when receive "trace complete" from worker
wrkr.port.on("trace complete", function(hops){
	// remove loader elements from current tab once trace is complete
	tabs.activeTab.attach({ 
		contentScript: 
		'document.getElementById("traceroute-blinds").parentNode.removeChild(document.getElementById("traceroute-blinds"))' 
	});
});

// when receive "trace error" from worker
wrkr.port.on("trace error", function(errz){
	// spit out the error...
	tabs.activeTab.attach({ contentScript: 'alert("trace error: "+"'+errz+'")' });
});

// when receive "woops" error from worker
wrkr.port.on("woops", function(errz){
	// spit out the error...
	// tabs.activeTab.attach({ contentScript: 'alert("socket connect_error: "+"'+errz.type +" : "+ errz.description+'")' });
});


// ---------------------------------------------------------------------
// when a new tab is opened / url entered  -----------------------------
// ---------------------------------------------------------------------

tabs.on("ready", function (t) {
	if( t.url.indexOf('http')==0 ){
		// create host string from current tab url
		var host = getLocation( t.url ).host;
		
		// inject loader into current page
		tabs.activeTab.attach({contentScriptFile: './loader.js'});
		pageMod.PageMod({include: '*', contentStyleFile: './loader.css'});
		
		// let worker know about new host so it can pass it along to the server
		wrkr.port.emit("new host", host );
	}
});
