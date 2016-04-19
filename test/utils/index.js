
/**
 * Module dependencies.
 */

import { repository } from '../fixtures/repository';

/**
 * Export `recreateTables`.
 */

export function recreateTables() {
  return repository.knex.schema
    .dropTableIfExists('Account')
    .dropTableIfExists('Comment')
    .dropTableIfExists('Post')
    .dropTableIfExists('Author')
    .createTable('Author', table => {
      table.increments('id').primary();
    })
    .createTable('Account', table => {
      table.increments('id').primary();
      table.integer('authorId').references('Author.id');
    })
    .createTable('Post', table => {
      table.increments('id').primary();
      table.integer('authorId').references('Author.id');
    })
    .createTable('Comment', table => {
      table.increments('id').primary();
      table.integer('postId').references('Post.id');
    });
}

/**
 * Export `clearTables`.
 */

export async function clearTables() {
  await repository.knex('Account').del();
  await repository.knex('Comment').del();
  await repository.knex('Post').del();
  await repository.knex('Author').del();
}

/**
 * Export `dropTables`.
 */

export function dropTables() {
  return repository.knex.schema
    .dropTable('Account')
    .dropTable('Comment')
    .dropTable('Post')
    .dropTable('Author');
}
