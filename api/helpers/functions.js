const ical = require('ical');
var Cleaning = require('../controllers/Cleanings');
const ObjectId = require('mongoose').mongo.ObjectId;

const DEFAULT_WINDOW = 7;

Date.prototype.addDays = function(days){
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
};

function isEmpty(obj) {
    for(var key in obj) {
        if(obj.hasOwnProperty(key))
            return false;
    }
    return true;
}

// Once we have calendar data we create a list of stays
function get_stays_from_calendar(calendarData){
    let stays = [];
    for(let k in calendarData){
        // Get a list of all stays for this property
        if (calendarData.hasOwnProperty(k)) {
            let stay = calendarData[k];
            if(calendarData[k].type === 'VEVENT') {
                stays.push(stay);
            }
        }
    }
    return stays;
}

// From a list of generated stays create new cleanings for a property
function generate_cleanings_from_stays(property, stays){
    let cleanings = [];
    // For each stay
    for(let i = 0; i < stays.length; i++){
        // Get an event which is to say get a stay at the bnb
        let stay = stays[i];
        // Get the next event (stay at the bnb)
        let nextStay = stays[i+1];

        // The cleaning's start will be the end of the stay
        let start = stay.end;
        // The cleaning's end will be the start of the next stay or 7 days if no next stay
        let end = nextStay === undefined ? new Date(stay.end).addDays(DEFAULT_WINDOW) : nextStay.start;

        // Create and load the new cleaning
        let cleaning = new Cleaning();
        cleaning.start = new Date(start).toISOString();
        cleaning.end = new Date(end).toISOString();
        cleaning.property = ObjectId(property._id);
        cleaning.cleaner = ObjectId(property.cleaner);

        //console.log(cleaning);
        if(start.toISOString() >= new Date(Date.now()).toISOString()) {
            // Only push new cleanings
            cleanings.push(cleaning);
        }
    }
    return cleanings;
}

// Given a property parse through its calendar generate cleanings, delete cleanings from db, and add new cleanings from db.
function update_cleanings_for_property(property) {
    // First parse the ical file from the url into data.
    ical.fromURL(property.calendar, {}, function(err, data){
        // Now get all events from the data (these are stays at the bnb)
        let events = get_stays_from_calendar(data);
        // Now create a cleaning from each pair of events
        let cleanings = generate_cleanings_from_stays(property, events);
        // Finally update the database
        // todo: figure out new way to treat cleaings here
        Cleaning.deleteMany({'property': ObjectId(property._id).toHexString(), 'start': {$gte: new Date(Date.now()).toISOString()}}, function(err, doc){
            if(err) console.log(err);
            if(doc) {
                console.log('Deleting documents ');
                //console.log(doc)
            }
            Cleaning.insertMany(cleanings , function(err, docs){
                console.log('Updating Future documents');
                //console.log(docs);
            });
        });
    });
}

let cleaners_lookup = {
    $lookup: {
        from: 'cleaners',
        localField: 'cleaner',
        foreignField: '_id',
        as: 'cleaners'
    },
    $project: {
        _id: 1,
        name: 1,
        address: 1,
        city: 1,
        state: 1,
        zip: 1,
        calendar: 1,
        cleaner: {$arrayElemAt: ['$cleaners', 0]},
        cleanings: 1
      }
};

let cleanings_lookup = {
    $lookup: {
        from: 'cleanings',
        localField: '_id',
        foreignField: 'property',
        as: 'cleanings'
    }
};


module.exports = {
    isEmpty: isEmpty,
    update_cleanings_for_property: update_cleanings_for_property,
    cleaners_lookup: cleaners_lookup,
    cleanings_lookup: cleanings_lookup
};