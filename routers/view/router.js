var express = require('express');
var router = express.Router();
const con_validator = require('../../middlewares/validate_connection');
const access_limitations = require('../../helpers/configurations/access_limitations');

// Get routs
let versions_routes = require('./versions');
let admin_panel_routes = require('./admin_panel');
let users_routes = require('./users');
let connections_routes = require('./connections');

router.get('/', (req, res) => res.redirect('/view/versions'));

router.use('/', connections_routes);

router.use('/admin-panel', con_validator.require_login, (req, res, next) => { // Required Admin
    req.required_level = access_limitations.min_access_required.view_admin_panel;
    req.action_on_reject = _ => {
        res.redirect('/404');
    };
    next();
}, con_validator.require_access_level, admin_panel_routes);

router.use('/versions', versions_routes);

router.use('/users', con_validator.require_login, users_routes);

module.exports = router;