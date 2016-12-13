
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
      const relation = this.prototype[dependent]();
      const { _knex, relatedData } = relation;
      const { foreignKeyTarget, parentIdAttribute, target, type } = relatedData;

      return [
        ...result, {
          key: type === 'belongsTo' && foreignKeyTarget ? foreignKeyTarget : relatedData.key('foreignKey'),
          parentIdAttribute,
          query: _knex,
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
      const { key, parentIdAttribute, query, skipDependents, tableName, target } = dependent;
      const parentValue = getParentValue(parent, parentIdAttribute);
      const queryBuilder = query ? query : knex(tableName)

      queryBuilder.whereRaw(`${quoteColumns ? `"${key}"` : key} IN (${parentValue})`);

      // Add dependent delete query.
      result.push(transaction => queryBuilder.clone().transacting(transaction).del());

      // Add dependent's cascade delete queries.
      if (!skipDependents) {
        result.push(recursiveDeletes.call(target, queryBuilder));
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
