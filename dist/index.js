'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _defineProperty2 = require('babel-runtime/helpers/defineProperty');

var _defineProperty3 = _interopRequireDefault(_defineProperty2);

var _extends3 = require('babel-runtime/helpers/extends');

var _extends4 = _interopRequireDefault(_extends3);

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

      return (0, _bluebird.mapSeries)(this.constructor.recursiveDeletes(this.get(this.idAttribute), options), function (query) {
        return query(transaction);
      }).then(function () {
        return Model.destroy.call(_this, (0, _extends4.default)({}, options, {
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

      if (!this.dependents) {
        return;
      }

      return (0, _lodash.reduce)(this.dependents, function (result, dependent) {
        var _prototype$dependent = _this3.prototype[dependent]();

        var relatedData = _prototype$dependent.relatedData;


        return (0, _extends4.default)({}, result, (0, _defineProperty3.default)({}, dependent, {
          dependents: relatedData.target.dependencyMap(),
          key: relatedData.key('foreignKey'),
          model: relatedData.target
        }));
      }, {});
    },
    recursiveDeletes: function recursiveDeletes(parent) {
      // Stringify in case of parent being an instance of query.
      var parentValue = typeof parent === 'number' || typeof parent === 'string' ? '\'' + parent + '\'' : parent.toString();

      // Build delete queries for each dependent.
      var queries = (0, _lodash.reduce)(this.dependencyMap(), function (result, _ref) {
        var key = _ref.key;
        var model = _ref.model;
        var _model$prototype = model.prototype;
        var idAttribute = _model$prototype.idAttribute;
        var tableName = _model$prototype.tableName;

        var whereClause = (client === 'postgres' ? '"' + key + '"' : key) + ' IN (' + parentValue + ')';

        return [].concat((0, _toConsumableArray3.default)(result), [function (transaction) {
          return transaction(tableName).del().whereRaw(whereClause);
        }, model.recursiveDeletes(Bookshelf.knex(tableName).column(idAttribute).whereRaw(whereClause))]);
      }, []);

      return (0, _lodash.flatten)((0, _lodash.compact)(queries)).reverse();
    }
  });
};