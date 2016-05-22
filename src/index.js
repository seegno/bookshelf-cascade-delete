
/**
 * Module dependencies.
 */

import { mapSeries } from 'bluebird';
import { compact, flatten, reduce } from 'lodash';

/**
 * Export `bookshelf-cascade-delete` plugin.
 */

export default Bookshelf => {
  const Model = Bookshelf.Model.prototype;
  const client = Bookshelf.knex.client.config.client;

  Bookshelf.Model = Bookshelf.Model.extend({
    cascadeDelete(transaction, options) {
      return mapSeries(this.constructor.recursiveDeletes(this.get(this.idAttribute), options), query => query(transaction))
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
    dependencyMap() {
      if (!this.dependents) {
        return;
      }

      return reduce(this.dependents, (result, dependent) => {
        const { relatedData } = this.prototype[dependent]();

        return {
          ...result,
          [dependent]: {
            dependents: relatedData.target.dependencyMap(),
            key: relatedData.key('foreignKey'),
            model: relatedData.target
          }
        };
      }, {});
    },
    recursiveDeletes(parent) {
      // Stringify in case of parent being an instance of query.
      const parentValue = typeof parent === 'number' || typeof parent === 'string' ? `'${parent}'` : parent.toString();

      // Build delete queries for each dependent.
      const queries = reduce(this.dependencyMap(), (result, { key, model }) => {
        const { idAttribute, tableName } = model.prototype;
        const whereClause = `${client === 'postgres' ? `"${key}"` : key} IN (${parentValue})`;

        return [
          ...result,
          transaction => transaction(tableName).del().whereRaw(whereClause),
          model.recursiveDeletes(Bookshelf.knex(tableName).column(idAttribute).whereRaw(whereClause))
        ];
      }, []);

      return flatten(compact(queries)).reverse();
    }
  });
};
