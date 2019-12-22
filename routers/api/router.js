var express = require('express');
var router = express.Router();

// Get routs
let versions = require('./versions');
let users = require('./users');
let connections = require('./connections');

// router.get('/', (req, res) => res.redirect('/api/versions'));

router.use('/', connections);

router.use('/versions', versions);

router.use('/users', users);

module.exports = router;