
/**
 * Module dependencies.
 */

import Promise from 'bluebird';
import { compact, flatten, reduce } from 'lodash';

/**
 * Export `bookshelf-cascade-delete` plugin.
 */

export default Bookshelf => {
  const Model = Bookshelf.Model.prototype;
  const client = Bookshelf.knex.client.config.client;

  Bookshelf.Model = Bookshelf.Model.extend({
    cascadeDelete(transaction, options) {
      return Promise.map(this.constructor.recursiveDeletes(this.get('id'), options), query => query(transaction))
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
        const relatedData = this.prototype[dependent]().relatedData;
        const target = relatedData.target;
        const foreignKey = relatedData.key('foreignKey');

        return {
          ...result,
          [dependent]: {
            dependents: target.dependencyMap(),
            key: foreignKey,
            model: target
          }
        };
      }, {});
    },
    recursiveDeletes(parent, options) {
      // Stringify in case of parent being an instance of query.
      const parentValue = typeof parent === 'number' || typeof parent === 'string' ? `'${parent}'` : parent.toString();

      // Build delete queries for each dependent.
      const queries = reduce(this.dependencyMap(), (result, dependent) => {
        const tableName = dependent.model.prototype.tableName;
        const dependentKey = client === 'postgres' ? `"${dependent.key}"` : dependent.key;
        const whereClause = `${dependentKey} IN (${parentValue})`;
        const selectQuery = Bookshelf.knex(tableName).column('id').whereRaw(whereClause);

        return [
          ...result,
          transaction => transaction(tableName).del().whereRaw(whereClause),
          dependent.model.recursiveDeletes(selectQuery, options)
        ];
      }, []);

      return flatten(compact(queries)).reverse();
    }
  });
};
