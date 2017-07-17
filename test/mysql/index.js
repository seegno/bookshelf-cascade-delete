
/**
 * Module dependencies.
 */

import Bookshelf from 'bookshelf';
import cascadeDelete from '../../src';
import knex from 'knex';
import knexfile from './knexfile';
import test from '..';

/**
 * Test `bookshelf-cascade-delete` plugin with MySQL client.
 */

describe('with MySQL client', () => {
  test(Bookshelf(knex(knexfile)).plugin(cascadeDelete), e => {
    e.errno.should.equal(1451);
  });
});
