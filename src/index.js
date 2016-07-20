
/**
 * Module dependencies.
 */

import { mapSeries } from 'bluebird';
import { flattenDeep, reduce } from 'lodash';

/**
 * Export `bookshelf-cascade-delete` plugin.
 */

export default Bookshelf => {
  const Model = Bookshelf.Model.prototype;
  const client = Bookshelf.knex.client.config.client;

  Bookshelf.Model = Bookshelf.Model.extend({
    cascadeDelete(transaction, options) {
      const queries = this.constructor.recursiveDeletes(this.get(this.idAttribute) || this._knex.column(this.idAttribute), options);

      return mapSeries(flattenDeep(queries).reverse(), query => query(transaction))
        .then(() => Model.destroy.call(this, {
          ...options,
          transacting: transaction
        }));
    },
    destroy(options) {
      options = options || {};

      if (options.cascadeDelete === false) {
        return Model.destroy.call(this, options);
      }

      if (options.transacting) {
        return this.cascadeDelete(options.transacting, options);
      }

      return Bookshelf.knex.transaction(transaction => this.cascadeDelete(transaction, options));
    }
  }, {
    dependencyMap(skipDependents = false) {
      if (skipDependents || !this.dependents) {
        return;
      }

      return reduce(this.dependents, (result, dependent) => {
        const { relatedData } = this.prototype[dependent]();
        const skipDependents = relatedData.type === 'belongsToMany';

        return [
          ...result, {
          dependents: relatedData.target.dependencyMap(skipDependents),
          key: relatedData.key('foreignKey'),
          model: relatedData.target,
          skipDependents,
          tableName: skipDependents ? relatedData.joinTable() : relatedData.target.prototype.tableName
        }];
      }, []);
    },
    recursiveDeletes(parent) {
      // Stringify in case of parent being an instance of query.
      const parentValue = typeof parent === 'number' || typeof parent === 'string' ? `'${parent}'` : parent.toString();

      // Build delete queries for each dependent.
      return reduce(this.dependencyMap(), (result, { tableName, key, model, skipDependents }) => {
        const whereClause = `${client === 'postgres' ? `"${key}"` : key} IN (${parentValue})`;

        return [
          ...result,
          transaction => transaction(tableName).del().whereRaw(whereClause),
          skipDependents ? [] : model.recursiveDeletes(Bookshelf.knex(tableName).column(model.prototype.idAttribute).whereRaw(whereClause))
        ];
      }, []);
    }
  });
};
