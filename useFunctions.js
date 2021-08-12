var colors = require("colors");

var functions = module.exports = {};
//View engine locals variables
functions.userViewVars = function(req, res, next){
	
	res.locals.alert = req.query.alert;
	res.locals.alertType = req.query.type;
	
	if(req.user)
		res.locals.user = req.user;
		
	else if(req.app.isDev == true){
		
		//2019-07-04 JL: app.isDev no longer modifies req.user. This is for change in checkAuthentication.
		//req.user = {username: '[Dev]', role: 'admin'};
		res.locals.user = {username: '[Dev]', role: 'admin'};
	}
	next();
}

/**
 * logger for res.log
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
functions.logger = function(req, res, next){
	
	res.log = function(message, param2, param3){
		var color, override = false;
		if(typeof(param2) == "boolean")
			override = param2;
		if(typeof(param2) == "string")
			color = param2;
		if(typeof(param3) == "boolean")
			override = param3;
		if(typeof(param3) == "string")
			color = param3;
		
		//res.debug is set to app.debug inside app.js
		if(req.app.debug || override){
			if(typeof(message) == "string" && color != undefined)
				console.log(message[color]);
			else
				console.log(message);
		}
	}
		
	//Sets variables accessible to any page from req (request) object
	//req.requestTime = Date.now(); req.requestTime IS NOW SET INSIDE APP.JS
	
	//formatted request time for logging
	let d = new Date(req.requestTime),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear(),
		hours = d.getHours(),
		minutes = d.getMinutes(),
		seconds = d.getSeconds();
	month = month.length<2? '0'+month : month;
	day = day.length<2? '0'+day : day;
	let formattedReqTime = (
		[year, month, day, [hours, minutes, seconds].join(':')].join('-')
	)
	
	//user agent
	req.shortagent = {
		ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
		device: req.useragent.isMobile ? "mobile" : req.useragent.isDesktop ? "desktop" : (req.useragent.isiPad || req.useragent.isAndroidTablet) ? "tablet" : req.useragent.isBot ? "bot" : "other",
		os: req.useragent.os,
		browser: req.useragent.browser
	}
	//logs request
	console.log( (req.method).red 
		+ " Request from " 
		+ req.shortagent.ip
		+ " on " 
		+ req.shortagent.device 
		+ "|"
		+ req.shortagent.os
		+ "|"
		+ req.shortagent.browser
		+ " to "
		+ (req.url).cyan
		+ " at "
		+ formattedReqTime
		+ " ("
		+ (req.hostname).cyan
		+ ")");
	
	next();
	}

/**
 * Logs when res.render is called
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
functions.renderLogger = function(req, res, next){
	
	//Changes res.render
	res.render = (function(link, param){
		var cached_function = res.render;
		
		return function(link, param){
			
			//stores pre-render post-request time
			let beforeRenderTime = Date.now() - req.requestTime;
			
			//applies render function
			let result = cached_function.apply(this, arguments);
			
			//stores post-render time
			let renderTime = Date.now() - req.requestTime - beforeRenderTime;
			
			//logs if debug
			this.log("Completed route in "
				+ (beforeRenderTime).toString().yellow
				+ " ms; Rendered page in " 
				+ (renderTime).toString().yellow
				+ " ms");
			
			return result;
		}
	}());
	next();
}
 
/**
 * Handles 404 errors
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
functions.notFoundHandler = function(req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
};

/**
 * Handles other errors
 * @param {} err 
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
functions.errorHandler = function(err, req, res, next) {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};
  
	// render the error page
	res.status(err.status || 500);
	res.render('error');
}