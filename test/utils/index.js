
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
      table.increments('id').primary();
    })
    .createTable('Account', table => {
      table.increments('id').primary();
      table.integer('authorId').unsigned().references('Author.id');
    })
    .createTable('Post', table => {
      table.increments('id').primary();
      table.integer('authorId').unsigned().references('Author.id');
    })
    .createTable('Comment', table => {
      table.increments('id').primary();
      table.integer('postId').unsigned().references('Post.id');
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
  const Account = repository.Model.extend({ tableName: 'Account' });
  const Comment = repository.Model.extend({ tableName: 'Comment' });

  const Post = repository.Model.extend({
    comments() {
      return this.hasMany(Comment, 'postId');
    },
    tableName: 'Post'
  }, {
    dependents: ['comments']
  });

  const Author = repository.Model.extend({
    account() {
      return this.hasOne(Account, 'authorId');
    },
    posts() {
      return this.hasMany(Post, 'authorId');
    },
    tableName: 'Author'
  }, {
    dependents: ['account', 'posts']
  });

  return { Account, Author, Comment, Post };
}
