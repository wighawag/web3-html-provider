"use strict";


var HtmlProvider = function (url, trustedHost) {
	
	this.loaded = false;
	this.counter = 0;
	this.callbacks = {};
	this.url = url || 'http://localhost:8545';
	this.trustedHost = trustedHost || this.url;
	this.queue = []
	this.currentPopup = null
	 
	var iframeId = "__htmlprovider__";
	var currentIframe = document.getElementById(iframeId);
	
	if(!currentIframe){	
		currentIframe = document.createElement('iframe');
		document.body.appendChild(currentIframe);
	}else{
		window.removeEventListener("message", currentIframe.htmlProvider); 
	}
	
	this.iframe = currentIframe;
	this.iframe.htmlProvider = this;
	this.iframe.id = iframeId; 
	this.iframe.style.display = "none";
	
	var self = this;

	this.handleEvent = function(event){
		if(event.type != "message"){
			return;
		}
		
		var data = event.data;
		if(data == "ready"){
			
		}else{
			var callback = self.callbacks[data.id];
			delete self.callbacks[data.id];
			callback(data.error, data.result);
		}
	}	
	
	//TODO IE check addEventListener
	window.addEventListener("message", this);
	
	
	this.iframe.onload = function(){
		self.loaded = true;
		var arrayLength = self.queue.length;
		for (var i = 0; i < arrayLength; i++) {
			var data = self.queue[i];
			self.sendAsync(data.payload,data.callback);
		}
		self.queue.length = 0;
	}
	this.iframe.src = this.trustedHost + "/authorization.html";
};


/**
 * @method send not supported
 */
HtmlProvider.prototype.send = function (payload) {
	throw "synchrnous call not supported"
};

/**
 * Should be used to make async request
 *
 * @method sendAsync
 * @param {Object} payload
 * @param {Function} callback triggered on end with (err, result)
 */
HtmlProvider.prototype.sendAsync = function (payload, callback) {
	
	if(payload.method == "eth_sendTransaction" || payload.method == "eth_sign"){
		
		
		var windowWidth = window.outerWidth || document.documentElement.clientWidth;
		var windowHeight = window.outerHeight || document.documentElement.clientHeight;
		var w = 600;
		var h = 250;
		var x = window.screenX + windowWidth/2 - w/2;
		var y = window.screenY + windowHeight/2 - h/2;
		//TODO reuse same windowId ?
		var windowId = "html-provider-window";
		//var windowId = null;
		var popupUrl = this.iframe.src;
		if(this.currentPopup && !this.currentPopup.closed){
			popupUrl = null;
		}
		var popup = window.open(popupUrl,windowId,"left="+x+",top="+y+",width="+w+",height="+h+",toolbar=0,menubar=0,location=1,personalbar=0,dependent=1,minimizable=0,resizable=0,scrollbars=0,chrome=1,dialog=1,modal=1,alwaysRaised=1,close=0");
		
		this.currentPopup = popup; 
		if(popup){
			var self = this;
			var counter = self.counter;
			self.callbacks[counter]=callback;
			self.counter++;
			popup.onload=function(){
				popup.postMessage({id:counter,payload:payload,url:self.url},self.trustedHost);
			}
			if(popupUrl == null){
				popup.postMessage({id:counter,payload:payload,url:self.url},self.trustedHost);
			}
			
			var interval = window.setInterval(function() {
				try {
					if(!self.callbacks[counter]){
						window.clearInterval(interval);
						//popup.close();
					}else if (popup == null || popup.closed) { //TODO check if closed work across browser, else fall back
						self.callbacks[counter]({message:"window closed"});
						delete self.callbacks[counter];
						window.clearInterval(interval);
					}
				}
				catch (e) {
				}
			}, 500);
		}else{
			var error = new Error('ERROR: Couldn\'t open window to provide authorization at '+ this.iframe.src);
			console.error(error);
			callback(error);
		}
		
		return;	
	}
	
	if(!this.loaded){
		this.queue.push({payload:payload,callback:callback});
		return;
	}
	
	try {
		this.callbacks[this.counter]=callback;
		this.iframe.contentWindow.postMessage({id:this.counter,payload:payload,url:this.url},this.trustedHost);
		this.counter++;
	} catch(e) {
		var error = new Error('ERROR: Couldn\'t postMessage to iframe at '+ this.iframe.location.href);
		console.error(error);
		callback(error);
	}
};

/**
 * @method isConnected not supported
 */
HtmlProvider.prototype.isConnected = function() {
	throw "synchrnous call not supported"
};
