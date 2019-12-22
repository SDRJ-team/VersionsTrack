const hash = require('../helpers/hash').get_hash_code;
var moment = require('moment');
const assert = require('assert');

let database = require('../helpers/db_controllers/services/db').getDB();
let requests_handler = require('../helpers/requests_handler');
const access_limitations = require('../helpers/configurations/access_limitations');

// req["params"]["username"]
// Return: true if exists, else: false
let is_user_exists = async (req, res, next) => {
    let users_db_model = database.users_model();
    try {
        let username = requests_handler.require_param(req, "route", "username");
        return (await users_db_model.find({username: username}).exec()).length !== 0;
    } catch (e) {
        throw new Error(e)
    }
};

/**
 * @description The function validate that the modify or deletion won't cause the lost of admin permission in the system.
 * False - Role modification / User deletion is allowed.
 * True - Don't modify the role, and don't delete this last admin user.

 * @param username - The user name to apply the action on
 * @param action - ["Delete", "Update"]
 * @param new_role - In case of "Update" action, the new target role.
 *
 * @note This function doesn't check for user existence.
 *
 * @returns {Promise<boolean>}
 */
let last_admin_user_validation = async (username, action, new_role) => {
    let ans = false;
    let admin_role_number = 4; // TODO place it in generic place
    if (action.toLowerCase() === "delete" || Number(new_role) !== admin_role_number) { // Not admin
        let users_db_model = database.users_model();
        let query, res;

        // Check current user role.
        query = {
            username: username
        };
        res = await users_db_model.find(query, 'role').exec();
        if (res[0]._doc.role === admin_role_number) {
            query = {
                role: admin_role_number
            };
            res = await users_db_model.find(query, 'username').exec();
            if (res.length === 1) { // This is the last admin in the system
                ans = true;
            }
        }
    }
    return ans;
};

exports.get = async (req, res, next) => {
    let users_db_model = database.users_model();
    try {
        let res;
        let username = requests_handler.optional_param(req, "route", "username");
        if (req.user && req.user.role < access_limitations.min_access_required.view_users_details && req.user.username !== username) {
            throw new Error("You have no permission to watch this user.");
        }
        if (username) { // Get specific user by id
            let query = {
                username: username
            };
            let password;
            if (!req.user) { // If not logged in already or the current user is not an admin, require password
                password = requests_handler.require_param(req, "get", "password");
                query.password = hash(password);
            }
            res = users_db_model.find(query).exec();
        } else { // Get all users
            res = users_db_model.find({}, '-password').exec();
        }
        return res;
    } catch (e) {
        throw new Error(e)
    }
};

exports.add = async (req, res, next) => {
    let users_db_model = database.users_model();
    try {
        let username = requests_handler.require_param(req, "post", "username");
        let password = requests_handler.require_param(req, "post", "password");
        let role = requests_handler.optional_param(req, "post", "role");

        let user_exists = await is_user_exists({ params: { username: username } });
        try {
            assert(!user_exists); // If exists, throw error
        } catch (e) {
            throw new Error("User already exists");
        }

        let new_user;
        if (req.user && req.user.role >= access_limitations.min_access_required.create_new_user_with_specific_role && role) {
            new_user = new users_db_model({
                username: username,
                password: hash(password),
                role: role
            });
        } else {
            new_user = new users_db_model({
                username: username,
                password: hash(password)
            });
        }

        new_user = await new_user.save();
        return new_user;
    } catch (e) {
        throw new Error(e)
    }
};

// TODO assert username == 'admin'
exports.modify = async (req, res, next) => {
    let users_db_model = database.users_model();
    try {
        let username = requests_handler.require_param(req, "route", "username");
        let current_password = requests_handler.optional_param(req, "post", "current_password");
        let new_username = requests_handler.optional_param(req, "post", "username");
        let new_password = requests_handler.optional_param(req, "post", "password");
        let new_role = requests_handler.optional_param(req, "post", "role");

        let update_struct = {};
        if (new_username)
            update_struct.username = new_username;
        if (new_password)
            update_struct.password = hash(new_password);
        if (new_role)
            update_struct.role = new_role;

        let filter = {username: username};
        let update = { $set: update_struct };
        if (current_password) {
            filter.password = hash(current_password);
            delete update.$set.role;
        }

        let user_exists = await is_user_exists({ params: filter });
        try {
            assert(user_exists); // If not exists, throw error
        } catch (e) {
            throw new Error("User not found");
        }

        let last_admin_validation = await last_admin_user_validation(username, "Modify", new_role);
        try {
            assert(!last_admin_validation); // If last admin will be lost, throw error
        } catch (e) {
            throw new Error("Attention! This is the last admin user. You can't modify it's role or you won't be able to access as admin anymore.");
        }

        return users_db_model.updateOne(filter, update, {
            new: true // Return the new object after the update is applied
        }).exec();
    } catch (e) {
        throw new Error(e)
    }
};

// TODO assert username == 'admin'
exports.remove = async (req, res, next) => {
    let users_db_model = database.users_model();
    try {
        let username = requests_handler.require_param(req, "route", "username");

        let user_exists = await is_user_exists({ params: { username: username} });
        try {
            assert(user_exists); // If not exists, throw error
        } catch (e) {
            throw new Error("User not found");
        }

        let last_admin_validation = await last_admin_user_validation(username, "Delete");
        try {
            assert(!last_admin_validation); // If last admin will be lost, throw error
        } catch (e) {
            throw new Error("Attention! This is the last admin user. You can't delete this user or you won't be able to access as admin anymore.");
        }

        return users_db_model.remove({username: username}).exec();
    } catch (e) {
        throw new Error(e)
    }
};

exports.validate_username = is_user_exists;