
/**
 * Module dependencies.
 */

import Bookshelf from 'bookshelf';
import cascadeDelete from '../../src';
import knex from 'knex';
import knexfile from '../knexfile';

/**
 * Export `repository`.
 */

export const repository = Bookshelf(knex(knexfile));

/**
 * Export `Model`.
 */

export const Model = repository.Model.prototype;

/**
 * Register `bookshelf-cascade-delete` plugin.
 */

repository.plugin(cascadeDelete);
