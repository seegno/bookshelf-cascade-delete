
/**
 * Clear tables.
 */

export async function clearTables(knex) {
  await knex('Account').del();
  await knex('Commenter').del();
  await knex('Comment').del();
  await knex('TagPost').del();
  await knex('Post').del();
  await knex('Tag').del();
  await knex('Author').del();
}

/**
 * Create tables.
 */

export function createTables(knex) {
  return knex.schema
    .createTable('Author', table => {
      table.increments('author_id').primary();
      table.string('name');
    })
    .createTable('Account', table => {
      table.increments('account_id').primary();
      table.integer('authorId').unsigned().references('Author.author_id');
    })
    .createTable('Tag', table => {
      table.increments('tag_id').primary();
    })
    .createTable('Post', table => {
      table.increments('post_id').primary();
      table.integer('authorId').unsigned().references('Author.author_id');
    })
    .createTable('TagPost', table => {
      table.integer('tagId').unsigned().references('Tag.tag_id');
      table.integer('postId').unsigned().references('Post.post_id');
    })
    .createTable('Comment', table => {
      table.increments('comment_id').primary();
      table.integer('postId').unsigned().references('Post.post_id');
    })
    .createTable('Commenter', table => {
      table.increments('commenter_id').primary();
      table.integer('commentId').unsigned().references('Comment.comment_id');
    });
}

/**
 * Drop tables.
 */

export function dropTables(knex) {
  return knex.schema
    .dropTableIfExists('TagPost')
    .dropTableIfExists('Account')
    .dropTableIfExists('Commenter')
    .dropTableIfExists('Comment')
    .dropTableIfExists('Post')
    .dropTableIfExists('Tag')
    .dropTableIfExists('Author');
}
