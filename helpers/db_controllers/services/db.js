const assert = require("assert");
const mongoose = require("mongoose");
const timestamps = require('mongoose-timestamp'); // TODO: consider using this for last update time data.
let versions_model, users_model;
let is_initialize = false;

let init_versions_schema = _ => {
    // Define versions schema
    let schema = mongoose.Schema({
        version: {
            type: String,
            required: true
        },
        prev_version: {
            type: String,
            required: true
        },
        details: String,
        downloader: String,
        release_date: {
            type: Date,
            default: Date.now
        },
        known_issues: String,
        properties: [
            {
                // _id is automatically generated by mongodb
                type: {
                    type: String,
                    enum: ['Feature', 'Fix Bug', 'Change', 'Deprecated'],
                    default: 'Feature',
                    required: true
                },
                description: {
                    type: String,
                    required: true
                },
                tests_scope: {
                    type: String,
                    enum: ['None', 'Partial', 'Large', 'Full'],
                    default: 'Partial',
                    required: true
                },
                tests_details: String,
                known_issues: String
            }
        ]
    });

    // Text search indexes
    schema.index({
        details: 'text',
        downloader: 'text',
        known_issues: 'text',
        "properties.type": 'text',
        "properties.description": 'text',
        "properties.known_issues": 'text'
    }, {
        weights: {
            details: 1,
            downloader: 1,
            known_issues: 1,
            "properties.type": 1,
            "properties.description": 1,
            "properties.known_issues": 1
        }
    });

    // Create versions model
    versions_model = mongoose.model('versions', schema);

    // Make sure the text search indexes are ready
    versions_model.on('index', error => { if (error) console.log(error) });
};

let init_users_schema = _ => {
    // Define users schema
    let schema = mongoose.Schema({
        id: {
            type: Number,
            required: true
        },
        username: {
            type: String,
            required: true
        },
        password: {
            type: String,
            required: true
        },
        role: {
            type: Number,
            // 4 -> Admin    -> Full access + Admin panel access.
            // 3 -> Manager  -> Create / Delete / Modify versions/properties access.
            // 2 -> User     -> Watch & Comment for issues in versions.
            // 1 -> Guest    -> Watch access.
            // 0 -> Banned   -> No access at all.
            //enum: ['Admin', 'Manager', 'User', 'Guest', 'Banned'],
            default: 1,
            required: true
        },
        register_date: {
            type: Date,
            default: Date.now
        }
    });

    // Text search indexes
    schema.index({
        username: 'text',
        role: 'text',
    }, {
        weights: {
            username: 1,
            role: 10,
        }
    });

    // Create versions model
    users_model = mongoose.model('users', schema);

    // Make sure the text search indexes are ready
    users_model.on('index', error => { if (error) console.log(error) });
};

let initDB = callback => {
    assert.ok(!is_initialize, "A try to initialize an initialized DB detected.");
    let db_new = mongoose.connect('mongodb://localhost/versions_track', {
        useNewUrlParser: true,
        useCreateIndex: true,
        useUnifiedTopology: true
    });

    console.log("Db connected successfully");

    init_versions_schema();
    init_users_schema();

    is_initialize = true;
    callback();
};

let db_use_pre_conditions = _ => {
    assert.ok(is_initialize, "Db has not been initialized. Please called init first.");
};

let getVersionsDBModel = _ => {
    db_use_pre_conditions();
    return versions_model;
};

let getUsersDBModel = _ => {
    db_use_pre_conditions();
    return users_model;
};

module.exports = {
    getDB: _ => {
        return {
            versions_model: getVersionsDBModel,
            users_model: getUsersDBModel
        }
    },
    initDB
};