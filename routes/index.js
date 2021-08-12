const router = require('express').Router();
const utilities = require('@firstteam102/scoutradioz-utilities');
const wrap = require('express-async-handler');

router.get('/', wrap(async (req, res) => {
	
	res.render('./index', {
		fulltitle: 'Phantom: A Minecraft Server Broadcasting Service'
	});
}));

router.get('/about', wrap(async (req, res) => {
	
	res.redirect(301, '/info');
}))

router.get('/info', wrap(async (req, res) => {
	
	res.render('./info', {
		title: 'Information'
	});
}))

module.exports = router;