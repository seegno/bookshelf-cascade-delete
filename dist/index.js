'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

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
  var knex = Bookshelf.knex;
  var client = knex.client.config.client;
  var quoteColumns = client === 'postgres' || client === 'postgresql' || client === 'pg';

  /**
   * Dependency map.
   */

  function dependencyMap() {
    var _this = this;

    var skipDependents = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

    if (skipDependents || !this.dependents) {
      return;
    }

    return (0, _lodash.reduce)(this.dependents, function (result, dependent) {
      var _prototype$dependent = _this.prototype[dependent](),
          relatedData = _prototype$dependent.relatedData;

      var skipDependents = relatedData.type === 'belongsToMany';

      return [].concat((0, _toConsumableArray3.default)(result), [{
        dependents: dependencyMap.call(relatedData.target, skipDependents),
        key: relatedData.key('foreignKey'),
        model: relatedData.target,
        skipDependents: skipDependents,
        tableName: skipDependents ? relatedData.joinTable() : relatedData.target.prototype.tableName
      }]);
    }, []);
  }

  /**
   * Recursive deletes.
   */

  function recursiveDeletes(parent) {
    // Stringify in case of parent being an instance of query.
    var parentValue = typeof parent === 'number' || typeof parent === 'string' ? '\'' + parent + '\'' : parent.toString();
    var dependencies = dependencyMap.call(this);

    // Build delete queries for each dependent.
    return (0, _lodash.reduce)(dependencies, function (result, _ref) {
      var tableName = _ref.tableName,
          key = _ref.key,
          model = _ref.model,
          skipDependents = _ref.skipDependents;

      var whereClause = (quoteColumns ? '"' + key + '"' : key) + ' IN (' + parentValue + ')';

      return [].concat((0, _toConsumableArray3.default)(result), [function (transaction) {
        return transaction(tableName).del().whereRaw(whereClause);
      }, skipDependents ? [] : recursiveDeletes.call(model, knex(tableName).column(model.prototype.idAttribute).whereRaw(whereClause))]);
    }, []);
  }

  /**
   * Cascade delete.
   */

  function cascadeDelete(transacting, options) {
    var _this2 = this;

    var id = this.get(this.idAttribute) || this._knex.column(this.idAttribute);
    var queries = recursiveDeletes.call(this.constructor, id);

    return (0, _bluebird.mapSeries)((0, _lodash.flattenDeep)(queries).reverse(), function (query) {
      return query(transacting);
    }).then(function () {
      return Model.destroy.call(_this2, (0, _extends3.default)({}, options, {
        transacting: transacting
      }));
    });
  }

  /**
   * Extend Model `destroy` method.
   */

  Bookshelf.Model = Bookshelf.Model.extend({
    destroy: function destroy(options) {
      var _this3 = this;

      options = options || {};

      if (options.cascadeDelete === false) {
        return Model.destroy.call(this, options);
      }

      if (options.transacting) {
        return cascadeDelete.call(this, options.transacting, options);
      }

      return Bookshelf.knex.transaction(function (transacting) {
        return cascadeDelete.call(_this3, transacting, options);
      });
    }
  });
};

module.exports = exports['default'];