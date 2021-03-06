const Book = require('../models/book');
const Author = require('../models/author');
const Genre = require('../models/genre');
const BookInstance = require('../models/bookinstance');
const { body, validationResult } = require('express-validator');

const async = require('async');

// GET /catalog
exports.index = function(req, res) {
  async.parallel(
    {
      book_count: function(callback) {
        Book.countDocuments({}, callback);
      },
      book_instance_count: function(callback) {
        BookInstance.countDocuments({}, callback);
      },
      book_instance_available_count: function(callback) {
        BookInstance.countDocuments({status: 'Available'}, callback);
      },
      author_count: function(callback) {
        Author.countDocuments({}, callback);
      },
      genre_count: function(callback) {
        Genre.countDocuments({}, callback);
      },
    }, function(err, results) {
      res.render('index', { title: 'Local Library Home', error: err, data: results });
    }
  );
};

// GET /catalog/books
// Display list of all books.
exports.book_list = function(req, res, next) {
  Book.find({}, 'title author')
    .populate('author')
    .exec(function(err, list_books) {
      if (err) throw err;
      // Successful so render
      res.render('book_list', {
        title: 'Book List',
        book_list: list_books
      });
    });
};

// GET /catalog/book/:id
// Display detail page for a specific book.
exports.book_detail = function(req, res) {
  async.parallel(
    {
      book: function(callback) {
        Book.findById(req.params.id)
          .populate('author')
          .populate('genre')
          .exec(callback)
      },
      book_instance: function(callback) {
        BookInstance.find({ 'book': req.params.id })
          .exec(callback);
      },
    }, function(err, results) {
      if (err) throw err;

      if (results.book == null) {
        var err = new Error('Book not found');
        err.status = 404;
        return next(err);
      }
      // successful, so render
      res.render('book_detail', {
        title: 'Title',
        book: results.book,
        book_instances: results.book_instance
      });
    }
  );
};

// GET /catalog/book/:id/create
// Display book create form on GET.
exports.book_create_get = function(req, res, next) {
  async.parallel(
    {
      authors: function(callback) {
        Author.find(callback);
      },
      genres: function(callback) {
        Genre.find(callback);
      }
    }, function(err, results) {
      if (err) throw err;

      res.render('book_form', {
        title: 'Create Book',
        authors: results.authors,
        genres: results.genres
      });
    }
  );
};

// POST /catalog/book/:id/create
// Handle book create on POST.
exports.book_create_post = new Array(
  // convert the genre to an array
  function(req, res, next) {
    if (!(req.body.genre instanceof Array)) {
      if (typeof req.body.genre == 'undefined')
        req.body.genre = [];
      else
        req.body.genre = new Array(req.body.genre);
    }
    next();
  },
  // validate and sanitise fields
  bookValidateAndSanitize(),
  // process request after validation and sanitization
  function(req, res, next) {
    // extract the validation errors from a request
    const errors = validationResult(req);

    // create a Book object with escaped and trimmed data
    var book = new Book({
      title: req.body.title,
      author: req.body.author,
      summary: req.body.summary,
      isbn: req.body.isbn,
      genre: req.body.genre
    });

    if (!errors.isEmpty()) {
      // there are errors. render from again with sanitized values/error messages
      // get all authors and genres for form
      async.parallel(
        {
          authors: function(callback) {
            Author.find(callback);
          },
          genres: function(callback) {
            Genre.find(callback);
          }
        }, function(err, results) {
          if (err) throw err;

          // mark our selected genres as checked
          results.genres.forEach(function(genre) {
            if (book.genre.indexOf(genre._id) > -1) {
              genre.checked = 'true';
            }
          });

          res.render('book_form', {
            title: 'Create Book',
            authors: results.authors,
            genres: results.genres,
            book: book,
            errors: errors.array()
          });
        }
      )
    } else {
      // data from form is valid. save book
      book.save(function(err) {
        if (err) throw err;
        // successful, redirect to new book record
        res.redirect(book.url);
      });
    }
  }
);

// GET /catalog/book/:id/delete
// Display book delete form on GET.
exports.book_delete_get = function(req, res) {
  async.parallel(
    {
      book: function(callback) {
        Book.findById(req.params.id)
          .exec(callback);
      },
    }, function(err, results) {
      if (err) throw err;

      // no results book
      if (results.book == null) {
        res.redirect('/catalog/books');
      }

      // successful, so render
      res.render('book_delete', {
        title: 'Delete Book',
        book: results.book
      });
    }
  );
};

// POST /catalog/book/:id/delete
// Handle book delete on POST.
exports.book_delete_post = function(req, res, next) {
  async.parallel(
    {
      book: function(callback) {
        Book.findById(req.params.id)
          .exec(callback);
      },
    }, function(err, results) {
      if (err) throw err;

      // delete object and redirect to the list of books
      Book.findByIdAndRemove(req.params.id, function(err) {
        if (err) next(err);
        // successful, go to book list
        res.redirect('/catalog/books');
      });
    }
  );
};

// GET /catalog/book/:id/update
// Display book update form on GET.
exports.book_update_get = function(req, res) {
  // get book, authos and genres for form
  async.parallel(
    {
      book: function(callback) {
        Book.findById(req.params.id).exec(callback);
      },
      authors: function(callback) {
        Author.find(callback);
      },
      genres: function(callback) {
        Genre.find(callback);
      },
    }, function(err, results) {
      if (err) throw err;

      if (results.book == null) {
        var err = new Error('Book not found');
        err.status = 404;
        return next(err);
      }

      // success. mark out selected genres as checked
      results.genres.forEach(function(genre) {
        results.book.genre.forEach(function(book_genre) {
          if (genre._id.toString() == book_genre._id.toString()) {
            genre.checked = 'true';
          }
        });
      });

      res.render('book_form', {
        title: 'Update Book',
        authors: results.authors,
        genres: results.genres,
        book: results.book,
      });
    }
  )
};

// POST /catalog/book/:id/delete
// Handle book update on POST.
exports.book_update_post = [
  // convert the genre to an array
  function(req, res, next) {
    if (!(req.body.genre instanceof Array)) {
      if (typeof req.body.genre == 'undefined')
        req.body.genre = [];
      else
        req.body.genre = new Array(req.body.genre);
    }
    next();
  },
  // validate and sanitise fields
  bookValidateAndSanitize(),
  // process request after validation and sanitization
  function(req, res, next) {
    // extract the validation errors from a request
    const errors = validationResult(req);
    // create a book object with escaped/trimmed data and old id
    var book = new Book({
      title: req.body.title,
      author: req.body.author,
      summary: req.body.summary,
      isbn: req.body.isbn,
      genre: (typeof req.body.genre == 'undefined') ? [] : req.body.genre,
      _id: req.params.id // this is required, or a new ID will be assigned!
    });

    if (!errors.isEmpty()) {
      // there are errors. render form again with sanitized values/error messages
      // get all authors and genres for form
      async.parallel(
        {
          authors: function(callback) {
            Author.find(callback);
          },
          genres: function(callback) {
            Genre.find(callback);
          },
        }, function(callback) {
          if (err) throw err;
          // success. mark out selected genres as checked
          results.genres.forEach(function(genre) {
            if (book.genre.indexOf(genre._id) > -1) {
              genre.checked = 'true';
            }
          });

          res.render('book_form', {
            title: 'Update Book',
            authors: results.authors,
            genres: results.genres,
            book: book,
            errors: errors.array()
          });
        }
      );
    } else {
      // data from is valid. update the record
      Book.findByIdAndUpdate(req.params.id, book, {}, function(err, theBook) {
        if (err) next(err);
        // successful, redirect to book detail page
        res.redirect(theBook.url);
      });
    }
  }
];

function bookValidateAndSanitize() {
  return [
    body('title', 'Title must not be empty')
      .trim()
      .isLength({ min: 1 })
      .escape(),
    body('author', 'Author must not be empty')
      .trim()
      .isLength({ min: 1 })
      .escape(),
    body('summary', 'Summary must not be empty')
      .trim()
      .isLength({ min: 1 })
      .escape(),
    body('isbn', 'ISBN must not be empty')
      .trim()
      .isLength({ min: 1 })
      .escape(),
    body('genre.*')
      .escape(),
  ];
}
