
/**
 * Export `recreateTables`.
 */

export function recreateTables(repository) {
  return repository.knex.schema
    .dropTableIfExists('Account')
    .dropTableIfExists('Comment')
    .dropTableIfExists('Post')
    .dropTableIfExists('Author')
    .createTable('Author', table => {
      table.increments('author_id').primary();
    })
    .createTable('Account', table => {
      table.increments('account_id').primary();
      table.integer('authorId').unsigned().references('Author.author_id');
    })
    .createTable('Post', table => {
      table.increments('post_id').primary();
      table.integer('authorId').unsigned().references('Author.author_id');
    })
    .createTable('Comment', table => {
      table.increments('comment_id').primary();
      table.integer('postId').unsigned().references('Post.post_id');
    });
}

/**
 * Export `clearTables`.
 */

export async function clearTables(repository) {
  await repository.knex('Account').del();
  await repository.knex('Comment').del();
  await repository.knex('Post').del();
  await repository.knex('Author').del();
}

/**
 * Export `dropTables`.
 */

export function dropTables(repository) {
  return repository.knex.schema
    .dropTable('Account')
    .dropTable('Comment')
    .dropTable('Post')
    .dropTable('Author');
}

/**
 * Export `fixtures`.
 */

export function fixtures(repository) {
  const Account = repository.Model.extend({
    idAttribute: 'account_id',
    tableName: 'Account'
  });

  const Comment = repository.Model.extend({
    idAttribute: 'comment_id',
    tableName: 'Comment'
  });

  const Post = repository.Model.extend({
    comments() {
      return this.hasMany(Comment, 'postId');
    },
    idAttribute: 'post_id',
    tableName: 'Post'
  }, {
    dependents: ['comments']
  });

  const Author = repository.Model.extend({
    account() {
      return this.hasOne(Account, 'authorId');
    },
    idAttribute: 'author_id',
    posts() {
      return this.hasMany(Post, 'authorId');
    },
    tableName: 'Author'
  }, {
    dependents: ['account', 'posts']
  });

  return { Account, Author, Comment, Post };
}
