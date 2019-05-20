var mongoose = require('mongoose');
var ObjectId = require('mongodb').ObjectID;
var Schema = mongoose.Schema;

mongoose.Promise = global.Promise;

mongoose.connect(process.env.DB, {useNewUrlParser: true } );
mongoose.set('useCreateIndex', true);

var PropertySchema = new Schema({
    name: {type: String, required: true},
    address: {type: String, required: true},
    city: {type: String, required: true},
    state: {type: String, required: true},
    zip: {type: String, required: true},
    cleaner: {type: ObjectId, required: true},
    calendar: {type: String, required: true}
});


module.exports = mongoose.model('Property', PropertySchema);