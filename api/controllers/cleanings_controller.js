'use strict';
/*
 'use strict' is not required but helpful for turning syntactical errors into true errors in the program flow
 http://www.w3schools.com/js/js_strict.asp
*/

/*
 Modules make it possible to import JavaScript files into your application.  Modules are imported
 using 'require' statements that give you a reference to the module.

  It is a good idea to list the modules that your application depends on in the package.json in the project root
 */
var Cleaning = require('./Cleanings');
var Property = require('./Properties');
var isEmpty = require('../helpers/functions').isEmpty;
var update = require('../helpers/functions').update_cleanings_for_property;
const ObjectId = require('mongoose').mongo.ObjectId;

/*
 Once you 'require' a module you can reference the things that it exports.  These are defined in module.exports.

 For a controller in a127 (which this is) you should export the functions referenced in your Swagger document by name.

 Either:
  - The HTTP Verb of the corresponding operation (get, put, post, delete, etc)
  - Or the operationId associated with the operation in your Swagger document

  In the starter/skeleton project the 'get' operation on the '/hello' path has an operationId named 'hello'.  Here,
  we specify that in the exports of this module that 'hello' maps to the function named 'hello'
 */
module.exports = {
    updatepropertiescleanings: updatepropertiescleanings, // Load cleanings for all properties
    updatecleaning: updatecleaning,  // Mark cleaning completed
    updatepropertycleanings: updatepropertycleanings, // Load cleanings for single property by id
    getcleanercleanings: getcleanercleanings, // Get list of all cleanings for a cleaner
    getpropertycleanings: getpropertycleanings, // Get list of all cleanings for a property
};

function updatecleaning(req, res) {
    var id = req.swagger.params.id.value;
    Cleaning.findById(id, function(err, cleaning) {
        if(err) {
            if(err.kind === "ObjectId") {
                res.status(404).json({
                    success: false,
                    message: `No cleaning with id: ${id} in the database!`
                }).send();
            } else {
                res.send(err);
            }
        } else {
            if(!req.swagger.params.done.value){
                res.status(400).json({
                    success: false,
                    message: `Pass String argument 'done' in query string.`
                }).send();
            } else{
                let status = req.swagger.params.done.value;
                cleaning.cleaned = status === "true" ? true : false
                cleaning.save(function (err){
                    if(err) res.send(err)

                    res.status(200).json({
                        success: true,
                        message: "Completion status updated.",
                        size: 1,
                        cleaning: [cleaning]
                    });
                });
            }
        }
    });
}

function updatepropertiescleanings(req, res){
    // Get all properties
    Property.find(function (err, properties) {
       // If we get an error send it as the response
        if(err) {
            res.send(err);
        }
        else {
            // Go through each property and update the cleanings
            for(let i in properties){
                update(properties[i]);
            }
            // Send a success message
            res.status(200).json({
                message: "Updated cleanings"
            });
        }
    });
}

function updatepropertycleanings(req, res) {
    var id = req.swagger.params.id.value;
    Property.findById(id, function (err, property) {
        if (err) {
            if (err.kind === "ObjectId") {
                // If the property is not in the database
                res.status(404).json({
                    success: false,
                    message: `No property with id: ${id} in the database!`
                }).send();
            } else {
                // Unknown error
                res.send(err);
            }
        } else {
            if (property === null) {
                // If for whatever reason the property comes back null
                res.status(404).json({
                    success: false,
                    message: `No property with id: ${id} in the database!`
                });
            } else {
                // Update the cleanings for the property
                update(property);
                res.status(200).json({
                    message: "Updated cleanings"
                });
            }
        }
    });
}

function getcleanercleanings (req, res) {
    let id = req.swagger.params.id.value;

    let match = { "$match": {}};
    let dates = {};
    match["$match"].cleaner = ObjectId(id);

    if (req.swagger.params.start.value !== undefined)
        dates.$gte = req.swagger.params.start.value;
    if (req.swagger.params.end.value !== undefined)
        dates.$lt = req.swagger.params.end.value;
    if (!isEmpty(dates)) 
        match["$match"].start = dates;
    
    Cleaning.aggregate([match,
        {
            '$sort': {
                'start': 1
            }
        }
    ], function (err, cleanings) {
        if (err) {
            res.status(404).json({
                success: false,
                message: `Error encountered while trying to find cleanings assigned to Cleaner id: ${id}!`
            });
        } else if (cleanings == []){
            res.status(200).json({
                success: true,
                message: `No cleanings for Cleaner id: ${id} within the date range specified.`,
                cleanings: []
            });
        } else {
            res.status(200).json({
                success: true,
                size: cleanings.length,
                cleanings: cleanings
            });
        }
    });
}

function getpropertycleanings (req, res) {
    let id = req.swagger.params.id.value;

    let match = { "$match": {}};
    let dates = {};
    match["$match"].property = ObjectId(id);

    if (req.swagger.params.start.value !== undefined)
        dates.$gte = req.swagger.params.start.value;
    if (req.swagger.params.end.value !== undefined)
        dates.$lt = req.swagger.params.end.value;
    if (!isEmpty(dates)) 
        match["$match"].start = dates;
    
    Cleaning.aggregate([match,
        {
            '$sort': {
                'start': 1
            }
        }
    ], function (err, cleanings) {
        if (err) {
            res.status(404).json({
                success: false,
                message: `Error encountered while trying to find cleanings assigned to property id: ${id}!`
            });
        } else if (cleanings.length === 0){
            res.status(200).json({
                success: true,
                message: `No cleanings for property id: ${id} within the date range specified.`,
                cleanings: []
            });
        } else {
            res.status(200).json({
                success: true,
                size: cleanings.length,
                cleanings: cleanings
            });
        }
    });
}