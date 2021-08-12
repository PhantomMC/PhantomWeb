//load dependencies
const express = require('express');					//main express shiz
const path = require('path');						//for filesystem
const favicon = require('serve-favicon');			//serves favicon
const bodyParser = require('body-parser');			//parses http request information
const session = require('express-session');			//session middleware (uses cookies)
const passport = require('passport');				//for user sessions
const useragent = require('express-useragent');		//for info on connected users
const useFunctions = require('./useFunctions');		//Functions inside separate module for app.use
const log4js = require('log4js');					//for extensive logging functionality
require('colors');

//load .env variables
require('dotenv').config();

//log4js config
var log4jsConfig = {
	appenders: { out: { type: 'stdout', layout: {
		type: 'pattern',
		//Non-colored pattern layout (default)
		pattern: '[%x{tier}] [%p] %c.%x{funcName} - %m',
		tokens: {
			'tier': logEvent => {
				if (process.env.ALIAS) return process.env.ALIAS;
				else return 'LOCAL|' + process.env.TIER;
			},
			'funcName': logEvent => {
				if (logEvent.context && logEvent.context.funcName) {
					return logEvent.context.funcName;
				}
				else return '';
			},
		},
	} } },
	categories: { default: { appenders: ['out'], level: 'info' } }
};
if( process.env.COLORIZE_LOGS == 'true'){
	//Colored pattern layout
	log4jsConfig.appenders.out.layout.pattern = '%[[%d{hh:mm:ss}] [%x{tier}] [%p] %c.%x{funcName} - %]%m';
}
log4js.configure(log4jsConfig);

const logger = log4js.getLogger();
logger.level = 'debug';

const utilities = require('@firstteam102/scoutradioz-utilities');

utilities.config(require('./databases.json'), {
	cache: {
		enable: true,
		maxAge: 30,
	},
	debug: false,
});

//isDev is typically used as a locals var in view engine.
//debug is used for logging.
//production is used to cache pug views.
var isDev = false, debug = false, production = false;

/* Check process arguments.
	If -dev or --dev, isDev = true.
	If -debug or --debug, debug = true.
	If -d or --d, both = true.
*/
for(var i in process.argv){
	switch(process.argv[i]){
		case "-dev":
		case "--dev":
			console.log("Dev");
			isDev = true;
			break;
		case "-d":
		case "--d":
			console.log("Dev");
			isDev = true;
		case "-debug":
		case "--debug":
			console.log("Debug");
			debug = true;
			break;
		case "-production":
		case "--production":
			production = true;
	}
}

//PUG CACHING (if dev is NOT enabled or production IS enabled)
if(production){
	console.log("Production");
	process.env.NODE_ENV = "production";
}

//RAS EXPRESS FUNC
const app = express();

//Must be the very first app.use
app.use(utilities.refreshTier);

//set app's bools to these arguments
app.isDev = isDev; 
app.debug = debug; 

//Boilerplate setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

//Session
app.use(session({
	secret: 'marcus night',
	resave: false,
	saveUninitialized: true
}));
//User agent for logging
app.use(useragent.express());

//Passport setup (user authentication)
require('./passport-config');
app.use(passport.initialize());
app.use(passport.session());

app.use(function(req, res, next){
	//For logging
	req.requestTime = Date.now();
	//For user login
	req.passport = passport;
	
	next();
});
//View variables
app.use(useFunctions.userViewVars);
//Logging and timestamping
app.use(useFunctions.logger);
//adds logging to res.render function
app.use(useFunctions.renderLogger);

//USER ROUTES
const index = require('./routes/index');
const user = require('./routes/user');

//CONNECT URLS TO ROUTES
app.use('/', index);
app.use('/user', user);
// catch 404 and forward to error handler
app.use(useFunctions.notFoundHandler);
// error handler
app.use(useFunctions.errorHandler);

module.exports = app;