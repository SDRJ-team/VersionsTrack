var express = require('express');
var router = express.Router();
const con_validator = require('../../middlewares/validate_connection');
const users_controller = require("../../controllers/users");
const access_limitations = require('../../helpers/configurations/access_limitations');

// GET routes

router.get("/profile", (req, res, next) => { // View self user profile
    req.required_level = access_limitations.min_access_required.view_profile;
    req.action_on_reject = _ => {
        res.redirect('/');
    };
    next();
}, con_validator.require_access_level, users_controller.view_profile);

module.exports = router;