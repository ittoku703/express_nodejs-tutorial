const mongoose = require('mongoose');
const moment = require('moment');

let Schema = mongoose.Schema;

let AuthorSchema = new Schema({
  first_name: {type: String, required: true, maxLength: 100},
  family_name: {type: String, required: true, maxLength: 100},
  date_of_birth: {type: Date},
  date_of_death: {type: Date},
});

// Virtual for author's full name
AuthorSchema
  .virtual('name')
  .get(function() {
    return this.family_name + ', ' + this.first_name;
  });

// Virtual for author's lifespan
AuthorSchema
  .virtual('lifespan')
  .get(function() {
    return (this.date_of_death - this.date_of_birth).toString();
  });

// Virtual for author's URL
AuthorSchema
  .virtual('url')
  .get(function() {
    return '/catalog/author/' + this._id;
  });

// Virtual for author's formatted date_of_birth
AuthorSchema
  .virtual('date_of_birth_formatted')
  .get(function() {
    return this.date_of_birth ?
      moment(this.date_of_birth).format('YYYY-MM-DD') :
      '';
  });

// Virtual for author's formatted date_of_death
AuthorSchema
  .virtual('date_of_death_formatted')
  .get(function() {
    return this.date_of_death ?
      moment(this.date_of_death).format('YYYY-MM-DD') :
      '';
  });

AuthorSchema
  .virtual('due_back_formatted')
  .get(function() {
    return `${this.date_of_birth_formatted} - ${this.date_of_death_formatted}`;
  });

// Export model
module.exports = mongoose.model('Author', AuthorSchema);
