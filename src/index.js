
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
  const knex = Bookshelf.knex;
  const client = knex.client.config.client;
  const quoteColumns = client === 'postgres' || client === 'postgresql' || client === 'pg';

  /**
   * Dependency map.
   */

  function dependencyMap() {
    if (!this.dependents) {
      return;
    }

    return reduce(this.dependents, (result, dependent) => {
      const { relatedData } = this.prototype[dependent]();
      const { foreignKeyTarget, parentIdAttribute, target, type } = relatedData;

      return [
        ...result, {
          key: type === 'belongsTo' && foreignKeyTarget ? foreignKeyTarget : relatedData.key('foreignKey'),
          parentIdAttribute,
          skipDependents: type === 'belongsToMany',
          tableName: type === 'belongsToMany' ? relatedData.joinTable() : target.prototype.tableName,
          target
        }
      ];
    }, []);
  }

  /**
   * Get parent value.
   */

  function getParentValue(parent, parentIdAttribute) {
    // Stringify in case of parent being an instance of query.
    if (parent instanceof Bookshelf.Model === false) {
      return parent.clone().column(parentIdAttribute).toString();
    }

    if (parent._knex) {
      // Add parent id attribute as select column for current parent query.
      return parent._knex.clone().column(parentIdAttribute).toString();
    }

    const parentId = parent.get(parentIdAttribute);

    if (!parentId) {
      throw new Error(`Missing relation parent id attribute "${parentIdAttribute}" for cascade`);
    }

    // Quote parent id attribute value.
    return `'${parent.get(parentIdAttribute)}'`;
  }

  /**
   * Recursive deletes.
   */

  function recursiveDeletes(parent) {
    // Build delete queries for each dependent.
    return reduce(dependencyMap.call(this), (result, dependent) => {
      const { key, parentIdAttribute, skipDependents, tableName, target } = dependent;
      const parentValue = getParentValue(parent, parentIdAttribute);
      const whereClause = `${quoteColumns ? `"${key}"` : key} IN (${parentValue})`;

      // Add dependent delete query.
      result.push(transaction => transaction(tableName).del().whereRaw(whereClause));

      // Add dependent's cascade delete queries.
      if (!skipDependents) {
        result.push(recursiveDeletes.call(target, knex(tableName).whereRaw(whereClause)));
      }

      return result;
    }, []);
  }

  /**
   * Cascade delete.
   */

  function cascadeDelete(transacting, options) {
    const queries = recursiveDeletes.call(this.constructor, this);

    return mapSeries(flattenDeep(queries).reverse(), query => query(transacting))
      .then(() => Model.destroy.call(this, {
        ...options,
        transacting
      }));
  }

  /**
   * Extend Model `destroy` method.
   */

  Bookshelf.Model = Bookshelf.Model.extend({
    destroy(options = {}) {
      if (options.cascadeDelete === false) {
        return Model.destroy.call(this, options);
      }

      if (options.transacting) {
        return cascadeDelete.call(this, options.transacting, options);
      }

      return Bookshelf.knex.transaction(transacting => cascadeDelete.call(this, transacting, options));
    }
  });
};
