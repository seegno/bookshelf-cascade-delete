'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _bluebird = require('bluebird');

var _lodash = require('lodash');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Export `bookshelf-cascade-delete` plugin.
 */

/**
 * Module dependencies.
 */

exports.default = function (Bookshelf) {
  var Model = Bookshelf.Model.prototype;
  var client = Bookshelf.knex.client.config.client;

  Bookshelf.Model = Bookshelf.Model.extend({
    cascadeDelete: function cascadeDelete(transaction, options) {
      var _this = this;

      var queries = this.constructor.recursiveDeletes(this.get(this.idAttribute) || this._knex.column(this.idAttribute), options);

      return (0, _bluebird.mapSeries)((0, _lodash.flattenDeep)(queries).reverse(), function (query) {
        return query(transaction);
      }).then(function () {
        return Model.destroy.call(_this, (0, _extends3.default)({}, options, {
          transacting: transaction
        }));
      });
    },
    destroy: function destroy(options) {
      var _this2 = this;

      options = options || {};

      if (options.cascadeDelete === false) {
        return Model.destroy.call(this, options);
      }

      if (options.transacting) {
        return this.cascadeDelete(options.transacting, options);
      }

      return Bookshelf.knex.transaction(function (transaction) {
        return _this2.cascadeDelete(transaction, options);
      });
    }
  }, {
    dependencyMap: function dependencyMap() {
      var _this3 = this;

      var skipDependents = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

      if (skipDependents || !this.dependents) {
        return;
      }

      return (0, _lodash.reduce)(this.dependents, function (result, dependent) {
        var _prototype$dependent = _this3.prototype[dependent]();

        var relatedData = _prototype$dependent.relatedData;

        var skipDependents = relatedData.type === 'belongsToMany';

        return [].concat((0, _toConsumableArray3.default)(result), [{
          dependents: relatedData.target.dependencyMap(skipDependents),
          key: relatedData.key('foreignKey'),
          model: relatedData.target,
          skipDependents: skipDependents,
          tableName: skipDependents ? relatedData.joinTable() : relatedData.target.prototype.tableName
        }]);
      }, []);
    },
    recursiveDeletes: function recursiveDeletes(parent) {
      // Stringify in case of parent being an instance of query.
      var parentValue = typeof parent === 'number' || typeof parent === 'string' ? '\'' + parent + '\'' : parent.toString();

      // Build delete queries for each dependent.
      return (0, _lodash.reduce)(this.dependencyMap(), function (result, _ref) {
        var tableName = _ref.tableName;
        var key = _ref.key;
        var model = _ref.model;
        var skipDependents = _ref.skipDependents;

        var whereClause = (client === 'postgres' ? '"' + key + '"' : key) + ' IN (' + parentValue + ')';

        return [].concat((0, _toConsumableArray3.default)(result), [function (transaction) {
          return transaction(tableName).del().whereRaw(whereClause);
        }, skipDependents ? [] : model.recursiveDeletes(Bookshelf.knex(tableName).column(model.prototype.idAttribute).whereRaw(whereClause))]);
      }, []);
    }
  });
};