# bookshelf-cascade-delete

This [Bookshelf.js](https://github.com/tgriesser/bookshelf) plugin provides cascade delete with a simple configuration on your models.

## Status

[![npm version][npm-image]][npm-url] [![build status][travis-image]][travis-url] [![coverage status][coveralls-image]][coveralls-url]

## Installation

Install the package via `npm`:

```sh
$ npm install --save bookshelf-cascade-delete
```

## Usage

Require and register the `bookshelf-cascade-delete` plugin:

```js
var bookshelf = require('bookshelf')(knex);
var cascadeDelete = require('bookshelf-cascade-delete');

bookshelf.plugin(cascadeDelete);
```

Define which relations depend on your model when it's destroyed with the `dependents` prototype property:

```js
var Post = bookshelf.Model.extend({
  tableName: 'Post'
});

var Author = bookshelf.Model.extend({
  tableName: 'Author',
  posts: function() {
    return this.hasMany(Post);
  }
}, {
  dependents: ['posts']
});
```

If you're using the ES6 class syntax, define `dependents` as static property:

```js
class Author extends bookshelf.Model {
  get tableName() {
    return 'Author';
  }

  posts() {
    return this.hasMany(Post);
  }

  static dependents = ['posts'];
}
```

Use `destroy` to delete your model:

```js
Author.forge({ id: 1 }).destroy();
```

A transaction is created and all the cascade queries executed:

```sql
DELETE FROM "Post" where "author_id" IN (1)
DELETE FROM "Author" where "id" IN (1)
```

You can pass an existing transaction as you would normally do:

```js
bookshelf.transaction(function(transaction) {
  return Author.forge({ id: 1 }).destroy({ transacting: transaction })
}).then(function() {
  return Author.forge({ id: 2 }).destroy({ transacting: transaction })
});
```

It's possible to disable the cascade delete with the `cascadeDelete` option:

```js
Author.forge({ id: 1 }).destroy({ cascadeDelete: false });
```

Since this plugin extends the `destroy` method, if you're extending or overriding it on your models make sure to call its prototype after your work is done:

```js
var Author = bookshelf.Model.extend({
  tableName: 'Author',
  posts: function() {
    return this.hasMany(Post);
  },
  destroy: function() {
    // Do some stuff.
    sendDeleteAccountEmail(this);

    // Call the destroy prototype method.
    bookshelf.Model.prototype.destroy.apply(this, arguments);
  }
}, {
  dependents: ['posts']
});
```

## Contributing

Contributions are welcome and greatly appreciated, so feel free to fork this repository and submit pull requests.  

**bookshelf-cascade-delete** supports PostgreSQL and MySQL. You can find test suites for each of these database engines in the *test/postgres* and *test/mysql* folders.

### Setting up

- Fork and clone the **bookshelf-cascade-delete** repository.
- Duplicate *test/postgres/knexfile.js.dist* and *test/mysql/knexfile.js.dist* files and update them to your needs.
- Make sure all the tests pass:

```sh
$ npm test
```

### Linting

**bookshelf-cascade-delete** enforces linting using [ESLint](http://eslint.org/) with the [Seegno-flavored ESLint config](https://github.com/seegno/eslint-config-seegno). We recommend you to install an eslint plugin in your editor of choice, although you can run the linter anytime with:

```sh
$ eslint src test
```

### Pull Request

Please follow these advices to simplify the pull request workflow:

- If you add or enhance functionality, an update of *README.md* usage section should be part of the PR.  
- If your PR fixes a bug you should include tests that at least fail before your code changes and pass after.  
- Keep your branch rebased and fix all conflicts before submitting.  
- Make sure Travis build status is ok.

## Credits

This plugin's code is heavily inspired on the [tkellen](https://github.com/tkellen) contribution for this [issue](https://github.com/tgriesser/bookshelf/issues/135), so cheers to him for making our job really easy!

## License

[MIT](https://opensource.org/licenses/MIT)

[coveralls-image]: https://img.shields.io/coveralls/seegno/bookshelf-cascade-delete/master.svg?style=flat-square
[coveralls-url]: https://coveralls.io/github/seegno/bookshelf-cascade-delete?branch=master
[npm-image]: https://img.shields.io/npm/v/bookshelf-cascade-delete.svg?style=flat-square
[npm-url]: https://npmjs.org/package/bookshelf-cascade-delete
[travis-image]: https://img.shields.io/travis/seegno/bookshelf-cascade-delete/master.svg?style=flat-square
[travis-url]: https://travis-ci.org/seegno/bookshelf-cascade-delete
