const mongoose = require('mongoose');

let Schema = mongoose.Schema;

let GenreSchema = new Schema({
  name: {type: String, required: true}
});

// Virtual for book's URL
GenreSchema
  .virtual('url')
  .get(function() {
    return '/catalog/genre/' + this._id;
  });

// Export model
module.exports = mongoose.model('Genre', GenreSchema);
