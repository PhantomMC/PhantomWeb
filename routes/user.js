const router = require('express').Router();
const utilities = require('@firstteam102/scoutradioz-utilities');
const logger = require('log4js').getLogger('user.js');
const bcrypt = require('bcryptjs');
const wrap = require('express-async-handler');
const e = require('@firstteam102/http-errors');
const saltRounds = 12;


var multer = require('multer');

router.all('/*', wrap(async (req, res, next) => {
	//Must remove from logger context to avoid unwanted persistent funcName.
	logger.removeContext('funcName');
	next();
}));

router.get('/', function(req, res, next) {
	res.send('respond with a resource');
});

router.get('/register', wrap(async (req, res) => {
	logger.addContext('funcName', 'register[get]');
	
	var redirectURL = req.query.redirectURL || undefined;
	
	res.render('./user/register', {
		title: 'Register',
		redirectURL: redirectURL,
	});
}));

router.post('/register', wrap(async (req, res) => {
	logger.addContext('funcName', 'register[post]');
	
	const username = req.body.username;
	const password1 = req.body.password1;
	const password2 = req.body.password2;
	
	if (!username || !password1) {
		return res.redirect('/user/register?alert=Please provide a username and password.&type=bad');
	}
	
	if (password1 !== password2) {
		return res.redirect('/user/register?alert=Please make sure both passwords match.&type=bad');
	}
	
	if (password1.length < 8) {
		return res.redirect('/user/register?alert=Please make sure your password is at least 8 characters. Other than that, go nuts.&type=bad');
	}
	
	const existingUser = await utilities.findOne('users', {username: username});
	
	if (existingUser) {
		return res.redirect(`/user/register?alert=Sorry, a user with the username *${username}* already exists.`);
	}
	
	logger.info(`Creating user with username ${username}`);
	
	const hash = await bcrypt.hash(password1, saltRounds);
	
	const writeResult = await utilities.insert('users', {
		username: username,
		password: hash,
	});
	
	logger.debug(`done, writeResult=${JSON.stringify(writeResult)}`);
	
	//now read it from db
	const user = await utilities.findOne('users', {username: username});
	
	if (!user) throw new e.InternalServerError('Brand-new user could not be found in db?');
	
	req.logIn(user, async function(err) {
		
		//Set redirect url depending on user's access level
		if (req.body.redirectURL) redirectURL = req.body.redirectURL;
		else redirectURL = '/';
		
		logger.info(`${user.display_name} has logged in and is redirected to ${redirectURL}`);
		
		//send success and redirect
		return res.redirect(redirectURL);
	});
	
	res.sendStatus(200);
}))

router.get('/login', async function(req, res) {
	logger.addContext('funcName', 'login[get]');
	
	var redirectURL = req.query.redirectURL || undefined;
	
	res.render('./user/login', {
		title: 'Login',
		redirectURL: redirectURL,
	});
	
});

router.post('/login', async function(req, res) {
	logger.addContext('funcName', 'login[post]');
	
	const username = req.body.username;
	const password = req.body.password;
	
	logger.info(`Login attempt for ${username}`);
	
	if (!username || !password) {
		return res.redirect('/user/login?alert=Please specify an username and password.&type=error');
	}
	
	var user = await utilities.findOne('users', {username: username});
	
	if (!user) {
		logger.info(`No user found for ${username}`);
		return res.redirect('/user/login?alert=Incorrect username or password.&type=error');
	}
	
	var comparison = await bcrypt.compare(password, user.password);
	
	if (comparison == true) {
		
		//log the user in
		
		logger.debug('Logging in');
		
		//If comparison succeeded, then log in user
		req.logIn(user, async function(err){
			
			//if password is temporary, then force them to change their password
			if (user.temporary_password == true) {
				return res.redirect('/user/newpassword');
			}
			
			//If error, then log and return an error
			if(err){ logger.error(err); return res.send({status: 500, alert: err}); }
						
			var redirectURL;
			
			//Set redirect url depending on user's access level
			if (req.body.redirectURL) redirectURL = req.body.redirectURL;
			else redirectURL = '/';
			
			logger.info(`${user.display_name} has logged in and is redirected to ${redirectURL}`);
			
			//send success and redirect
			return res.redirect(redirectURL);
		});
	}
	else {
		logger.info(`Incorrect password for ${username}`);
		return res.redirect('/user/login?alert=Incorrect username or password.&type=error');
	}
});


router.all('/profile', wrap(async (req, res, next) => {
	//require login for profile
	if (req.user) {
		next();
	}
}));

router.get('/profile', wrap(async (req, res) => {
	logger.addContext('funcName', 'profile[get]');
	logger.debug('Loading profile page');
	
	var user = req.user;
	
	res.render('./user/settings', {
		title: 'Currently hosted servers',
		user: user
	});
	
}));


router.post('/profile', async function (req, res) {
	logger.addContext('funcName', 'profile[post]');
});

router.all('/profile/newserver', wrap(async (req, res, next) => {
	//require login for creating new server
	if (req.user) {
		next();
	}
}));

router.get('/profile/newserver', wrap(async (req, res) => {
	logger.addContext('funcName', 'newserver[get]');
	logger.debug('Creating newserver page');

	var user = req.user;

	res.render('./user/newserver', {
		title: 'Create a new server',
		user: user
	});

}));


//create image limits (10MB max)
var limits = {
	files: 1, // allow only 1 file per request
	fileSize: 10 * 1024 * 1024, // 10 MB (max file size)
};

//file filter to guarantee filetype is image
var fileFilter = function (req, file, cb) {

	//supported image file mimetypes
	var allowedMimes = ['image/jpeg', 'image/pjpeg', 'image/png', 'image/gif'];

	if (_.includes(allowedMimes, file.mimetype)) {
		// allow supported image files
		cb(null, true);
	} else {
		// throw error for invalid files
		cb(new Error('Invalid file type. Only jpg, png and gif image files are allowed.'));
	}
};

//create basic multer function upload
var upload = multer().single("serverpicture");


router.post('/profile/newserver', async function (req, res) {
	logger.addContext('funcName', 'newserver[post]');
	logger.debug('ENTER');

	upload(req, res, function (error) {
		if (error) {
			logger.error(error)
        }
		logger.info("Loaded image")

		const encoded = req.file.buffer.toString('base64')

		logger.debug("image: " + encoded)
		res.redirect('/user/profile')
	});
});

router.all('/newpassword', wrap(async (req, res, next) => {
	//require login for newpassword
	if (req.user) {
		next();
	}
}));

router.get('/newpassword', wrap(async (req, res) => {
	logger.addContext('funcName', 'newpassword[get]');
	logger.debug('ENTER');
	
	res.render('./user/newpassword', {
		title: 'Set a New Password',
	});
	
}));

router.post('/newpassword', wrap(async (req, res) => {
	logger.addContext('funcName', 'newpassword[post]');
	logger.debug('ENTER');
	
	var user = req.user;
	
	if (user.temporary_password == false) {
		logger.info(`User ${user.username} was rejected`);
		return res.redirect('/user/profile?alert=Your account already has a password. You can update it here.&type=warn');
	}
	
	const pass1 = req.body.password;
	const pass2 = req.body.passwordconfirm;
	//compare passwords
	if (pass1 != pass2) return res.redirect('/user/newpassword?alert=Passwords must match.&type=error');
	//hash password
	const newHash = await bcrypt.hash(pass1, saltRounds);
	
	logger.info(`Updating password for ${user.username}`);
	
	//save
	const writeResult = await utilities.update('users', 
		{_id: user._id}, 
		{$set: {password: newHash, temporary_password: false}}
	);
	
	if (req.body.redirectURL) {
		return res.redirect(req.body.redirectURL + '/home?alert=Set password successfully.&type=good');
	}
	
	res.redirect('/home?alert=Set password successfully.');
	
}));


router.get('/logout', wrap(async (req, res) => {
	logger.addContext('funcName', 'logout[get]');
	
	// gotta wrap in an if so that i don't get a "cannot read property of undefined" error
	if (req.user) logger.trace(`Logging out ${req.user.display_name}`);
	
	//destroy session
	req.logout();
	
	req.session.destroy(async function (err) {
		if (err) return console.log(err);
		
		//now, redirect to index
		res.redirect('/home');
	});
	
}));

module.exports = router;
