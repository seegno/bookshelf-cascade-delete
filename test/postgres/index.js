
/**
 * Module dependencies.
 */

import Bookshelf from 'bookshelf';
import cascadeDelete from '../../src';
import knex from 'knex';
import knexfile from './knexfile';
import test from '..';

/**
 * Test `bookshelf-cascade-delete` plugin with PostgreSQL client.
 */

describe('with PostgreSQL client', () => {
  test(Bookshelf(knex(knexfile)).plugin(cascadeDelete), e => {
    e.code.should.equal('23503');
  });
});
