
/**
 * Export `recreateTables`.
 */

export function recreateTables(repository) {
  return repository.knex.schema
    .dropTableIfExists('Account')
    .dropTableIfExists('Comment')
    .dropTableIfExists('TagPost')
    .dropTableIfExists('Post')
    .dropTableIfExists('Tag')
    .dropTableIfExists('Author')
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
 * Export `clearTables`.
 */

export async function clearTables(repository) {
  await repository.knex('Account').del();
  await repository.knex('Commenter').del();
  await repository.knex('Comment').del();
  await repository.knex('TagPost').del();
  await repository.knex('Post').del();
  await repository.knex('Tag').del();
  await repository.knex('Author').del();
}

/**
 * Export `dropTables`.
 */

export function dropTables(repository) {
  return repository.knex.schema
    .dropTable('TagPost')
    .dropTable('Account')
    .dropTable('Commenter')
    .dropTable('Comment')
    .dropTable('Post')
    .dropTable('Tag')
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

  const Commenter = repository.Model.extend({
    idAttribute: 'commenter_id',
    tableName: 'Commenter'
  });

  const Comment = repository.Model.extend({
    commenter() {
      return this.hasOne(Commenter, 'commentId');
    },
    idAttribute: 'comment_id',
    tableName: 'Comment'
  }, {
    dependents: ['commenter']
  });

  const Tag = repository.Model.extend({
    idAttribute: 'tag_id',
    tableName: 'Tag'
  });

  const TagPost = repository.Model.extend({
    idAttribute: null,
    tableName: 'TagPost'
  });

  const Post = repository.Model.extend({
    comments() {
      return this.hasMany(Comment, 'postId');
    },
    tags() {
      return this.belongsToMany(Tag, 'TagPost', 'postId', 'tagId');
    },
    idAttribute: 'post_id',
    tableName: 'Post'
  }, {
    dependents: ['comments', 'tags']
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

  return { Account, Author, Comment, Commenter, Post, Tag, TagPost };
}
