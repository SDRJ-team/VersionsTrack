var moment = require('moment');
const assert = require('assert');
const Fuse = require('fuse.js');
let database = require('../helpers/db_controllers/services/db').getDB();
let requests_handler = require('../helpers/requests_handler');

// req["params"]["project_name"] // TODO
// req["params"]["version_id"]
// Return: true if exists, else: false
let is_version_exists = async (req, res, next) => {
    let projects_db_model = database.projects_model();
    try {
        let project_name = "UNNAMED"; // TODO
        let version_id = requests_handler.require_param(req, "route", "version_id");
        let db_res = await projects_db_model.find({name: project_name, "versions.version": version_id}, 'versions').exec();
        return db_res.length !== 0;
    } catch (e) {
        throw new Error(e)
    }
};

function splitMulti(str, tokens){
    var tempChar = tokens[0]; // We can use the first token as a temporary join character
    for(var i = 1; i < tokens.length; i++){
        str = str.split(tokens[i]).join(tempChar);
    }
    str = str.split(tempChar);
    return str;
}

/**
 * If ver1 is bigger => Returns 1
 * If ver2 is bigger => Returns -1
 * If the versions are equals => Returns 0
 *
 * Note: Working the same way with dates in format: yyyy-mm-dd
 *
 * @param ver1
 * @param ver2
 * @returns 1/-1/0
 */
let compare_two_versions = (ver1, ver2) => {
    let ver1_data = splitMulti(ver1, ['.', '-', 'T',':','Z']);
    let ver2_data = splitMulti(ver2, ['.', '-', 'T',':','Z']);
    let min_length = Math.min(ver1_data.length, ver2_data.length);
    let max_length = Math.max(ver1_data.length, ver2_data.length);
    let i;
    for (i = 0; i < min_length; i++) {
        if (Number(ver1_data[i]) > Number(ver2_data[i])) {
            return 1;
        } else if (Number(ver1_data[i]) < Number(ver2_data[i])) {
            return -1;
        }
    }

    if (min_length !== max_length) {
        let data_to_check;
        let suspect_sign;
        if (ver1_data.length === max_length) { data_to_check = ver1_data; suspect_sign = 1; }
        else { data_to_check = ver2_data; suspect_sign = -1; }
        for (i; i < max_length; i++) {
            if (Number(data_to_check[i]) !== 0) return suspect_sign;
        }
    }

    return 0;
};

exports.get = async (req, res, next) => {
    let projects_db_model = database.projects_model();

    // req.params.filter - if set defines lower or bigger then a parameter (version / version release date).
    // req.params.version_id - if specified check filter (optional)
    // req.params.download_date - if specified check filter (require)
    let target_version;
    let target_description;
    let target_version_rel_date;
    let filter;

    let project_name = "UNNAMED";
    target_version = requests_handler.optional_param(req, 'route','version_id');
    target_description = requests_handler.optional_param(req, 'route','description');
    target_version_rel_date = requests_handler.optional_param(req, 'route', 'download_date');
    if (target_version) filter = requests_handler.optional_param(req, 'route', 'filter');
    else if (target_version_rel_date) filter = requests_handler.require_param(req, 'route', 'filter');

    let selected_proj = await projects_db_model.find( { name: project_name } ).exec();
    if (!selected_proj.length)
        throw new Error("Project not found");
    selected_proj = selected_proj[0]._doc;

    let versions = [];
    try {
        if (target_version) {
            // Search versions by id

            switch (filter) {
                case "<":
                    selected_proj.versions.forEach((obj, idx, arr) => {
                        let compare_res = compare_two_versions(obj.version, target_version);
                        if (compare_res === -1 || compare_res === 0) {
                            versions.push(obj);
                        }
                    });
                    break;

                case ">":
                    selected_proj.versions.forEach((obj, idx, arr) => {
                        let compare_res = compare_two_versions(obj.version, target_version);
                        if (compare_res === 1 || compare_res === 0) {
                            versions.push(obj);
                        }
                    });
                    break;

                default:
                    versions = await projects_db_model.find( { name: project_name, "versions.version": target_version }, 'versions.$' ).exec();
                    if (versions.length)
                        versions = versions[0].versions;
                    else
                        versions = [];
                    break;
            }
        } else if (target_version_rel_date) {
            // Search versions by date

            target_version_rel_date = new Date(target_version_rel_date);
            /*
            * Examples for wrong formats:
            *   dd-mm-yyyy  (15-10-2016)
            *   yyyy-m-dd   (2010-6-15)
            *   yyyy-mm-d   (2010-10-5)
            *
            * Accepted formats:
            *   yyyy-mm-dd  (2010-10-06)
            *               (2010-03-19)
            *               (2016-12-31)
            */
            switch (filter) {
                case "<":
                    selected_proj.versions.forEach((obj, idx, arr) => {
                        let compare_res = compare_two_versions(obj.release_date.toISOString(), target_version_rel_date.toISOString());
                        if (compare_res === -1 || compare_res === 0) {
                            versions.push(obj);
                        }
                    });
                    break;

                case ">":
                    selected_proj.versions.forEach((obj, idx, arr) => {
                        let compare_res = compare_two_versions(obj.release_date.toISOString(), target_version_rel_date.toISOString());
                        if (compare_res === 1 || compare_res === 0) {
                            versions.push(obj);
                        }
                    });
                    break;

                default:
                    throw new Error("Unspecified sign for date filter.");
            }
        } else if (target_description) {
            // Search versions by description

            // Sort by version number ("-version")
            let sorted_versions = selected_proj.versions.sort((ver1, ver2) => {
                return -compare_two_versions(ver1.version, ver2.version)
            });

            // Fuse search
            let options = {
                shouldSort: true,
                //includeScore: true,
                threshold: 0.4,
                location: 0,
                distance: 1000,
                maxPatternLength: 32,
                minMatchCharLength: 1,
                keys: [{
                    name: "details",
                    weight: 0.7
                }, {
                    name: "downloader",
                    weight: 0.5
                }, {
                    name: "known_issues",
                    weight: 0.3
                }, {
                    name: "properties.type",
                    weight: 1
                }, {
                    name: "properties.description",
                    weight: 0.7
                }, {
                    name: "properties.known_issues",
                    weight: 0.5
                }]
            };
            let fuse = new Fuse(sorted_versions, options);
            versions = fuse.search(target_description);
        } else {
            // Get all versions
            versions = selected_proj.versions;
        }
    } catch (e) {
        throw new Error(e)
    }
    return versions;
};

exports.add_version = async (req, res, next) => {
    let versions_db_model = database.projects_model();
    try {
        let project_name = "UNNAMED";
        let version_id = requests_handler.require_param(req, "route", "version_id");
        let version_exists = await is_version_exists({ params: { version_id: version_id } });
        try {
            assert(!version_exists) // if exists, throw error
        } catch (e) {
            throw new Error("Version already exists");
        }

        let prev_version_id = requests_handler.require_param(req, "post", "prev_version_id");
        let is_beta = requests_handler.optional_param(req, "post", "is_beta");
        let details = requests_handler.optional_param(req, "post", "details");
        let downloader = requests_handler.optional_param(req, "post", "downloader");
        let release_date = requests_handler.require_param(req, "post", "release_date");
        release_date = moment(release_date).format('YYYY-MM-DD'); // Format date to match the DB format
        let known_issues = requests_handler.optional_param(req, "post", "known_issues");

        let filter = {name: project_name};
        let update = {
            $push:
                {
                    versions: {
                        version: version_id,
                        prev_version: prev_version_id,
                        is_beta: is_beta,
                        details: details,
                        downloader: downloader,
                        release_date: release_date,
                        known_issues: known_issues,
                        properties: []
                    }
                }
        };

        let new_version = await versions_db_model.findOneAndUpdate(filter, update, {
            new: true // Return the new object after the update is applied
        });
        return new_version;
    } catch (e) {
        throw new Error(e)
    }
};

exports.add_property = async (req, res, next) => {
    let versions_db_model = database.projects_model();
    try {
        let project_name = "UNNAMED";
        let version_id = requests_handler.require_param(req, "route", "version_id");
        let property_type = requests_handler.require_param(req, "post", "type");
        let description = requests_handler.require_param(req, "post", "description");
        let tests_scope = requests_handler.require_param(req, "post", "tests_scope");
        let tests_details = requests_handler.optional_param(req, "post", "tests_details");
        let known_issues = requests_handler.optional_param(req, "post", "known_issues");

        let filter = {name: project_name, "versions.version": version_id};
        let update = {
            $addToSet:
                {
                    "versions.$.properties": {
                        // _id is automatically generated by mongodb
                        type: property_type,
                        description: description,
                        tests_scope: tests_scope,
                        tests_details: tests_details,
                        known_issues: known_issues
                    }
                }
        };

        let new_version = await versions_db_model.findOneAndUpdate(filter, update, {
            new: true // Return the new object after the update is applied
        });

        if (!new_version) {
            throw new Error("Target version didn't found.");
        }

        return new_version;
    } catch (e) {
        throw new Error(e)
    }
};

exports.modify_version = async (req, res, next) => {
    let versions_db_model = database.projects_model();
    try {
        let project_name = "UNNAMED";
        let version_id = requests_handler.require_param(req, "route", "version_id");
        let new_version_id = requests_handler.optional_param(req, "post", "version_id");
        let new_prev_version = requests_handler.optional_param(req, "post", "prev_version");
        let is_beta = requests_handler.optional_param(req, "post", "is_beta");
        let details = requests_handler.optional_param(req, "post", "details");
        let downloader = requests_handler.optional_param(req, "post", "downloader");
        let release_date = requests_handler.require_param(req, "post", "release_date");
        release_date = new Date(release_date);
        let known_issues = requests_handler.optional_param(req, "post", "known_issues");

        let filter = {name: project_name, "versions.version": version_id};
        let update = {
            $set:
                {
                    'versions.$.version': new_version_id,
                    'versions.$.prev_version': new_prev_version,
                    'versions.$.is_beta': is_beta,
                    'versions.$.details': details,
                    'versions.$.downloader': downloader,
                    'versions.$.release_date': release_date,
                    'versions.$.known_issues': known_issues
                }
        };

        let new_version = await versions_db_model.updateOne(filter, update, {
            new: true // Return the new object after the update is applied
        }).exec();

        if (!new_version) {
            throw new Error("Target version didn't found.");
        }

        return new_version;
    } catch (e) {
        throw new Error(e)
    }
};

exports.modify_property = async (req, res, next) => {
    let versions_db_model = database.projects_model();
    try {
        let project_name = "UNNAMED";
        let version_id = requests_handler.require_param(req, "route", "version_id");
        let property_id = requests_handler.require_param(req, "route", "property_id");
        let property_type = requests_handler.require_param(req, "post", "type");
        let description = requests_handler.require_param(req, "post", "description");
        let tests_scope = requests_handler.require_param(req, "post", "tests_scope");
        let tests_details = requests_handler.optional_param(req, "post", "tests_details");
        let known_issues = requests_handler.optional_param(req, "post", "known_issues");

        let filter = {name: project_name};
        let update = {
            $set:
                {
                    'versions.$[ver].properties.$[prop].type': property_type,
                    'versions.$[ver].properties.$[prop].description': description,
                    'versions.$[ver].properties.$[prop].tests_scope': tests_scope,
                    'versions.$[ver].properties.$[prop].tests_details': tests_details,
                    'versions.$[ver].properties.$[prop].known_issues': known_issues
                }
        };
        let progress_filter = {
            arrayFilters: [
                {
                    "ver.version": version_id
                }, {
                    "prop._id": property_id
                }
            ],
            new: true
        };

        let new_version = await versions_db_model.updateOne(filter, update, progress_filter).exec();

        if (!new_version) {
            throw new Error("Target version didn't found.");
        }

        return new_version;
    } catch (e) {
        throw new Error(e)
    }
};

exports.remove_version = async (req, res, next) => {
    let project_name = "UNNAMED";
    let versions_db_model = database.projects_model();
    try {
        let version_id = requests_handler.require_param(req, "route", "version_id");

        let filter = {name: project_name};
        let update = {
            $pull:
                {
                    versions: {
                        version: version_id
                    }
                }
        };

        let new_version = await versions_db_model.updateOne(filter, update, {
            new: true // Return the new object after the update is applied
        }).exec();

        if (!new_version) {
            throw new Error("Target version didn't found.");
        }

        return new_version;
    } catch (e) {
        throw new Error(e)
    }
};

exports.remove_property = async (req, res, next) => {
    let versions_db_model = database.projects_model();
    try {
        let project_name = "UNNAMED";
        let version_id = requests_handler.require_param(req, "route", "version_id");
        let property_id = requests_handler.require_param(req, "route", "property_id");

        let filter = {name: project_name, "versions.version": version_id};
        let update = {
            $pull:
                {
                    "versions.$.properties": {
                        _id: property_id
                    }
                }
        };

        let new_version = await versions_db_model.updateOne(filter, update, {
            new: true // Return the new object after the update is applied
        }).exec();

        if (!new_version) {
            throw new Error("Target version didn't found.");
        }

        return new_version;
    } catch (e) {
        throw new Error(e)
    }
};

exports.is_version_exists = is_version_exists;