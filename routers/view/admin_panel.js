var express = require('express');
var router = express.Router();
const con_validator = require('../../middlewares/validate_connection');
const users_controller = require("../../controllers/users");
const admin_controller = require("../../controllers/admin");
const access_limitations = require('../../helpers/configurations/access_limitations');

// GET routes

router.get("/", (req, res) => res.redirect('/view/admin-panel/index'));

router.get("/:category_name", admin_controller.view_admin_panel);

router.get("/users-management/u:username", admin_controller.view_user_management_panel);

router.get("/users-management/new-user", admin_controller.view_user_management_panel);

module.exports = router;