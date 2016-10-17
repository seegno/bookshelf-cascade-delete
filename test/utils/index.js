
/**
 * Export `recreateTables`.
 */

export function recreateTables(repository) {
  return repository.knex.schema
    .dropTableIfExists('Account')
    .dropTableIfExists('CommenterAccount')
    .dropTableIfExists('Commenter')
    .dropTableIfExists('Comment')
    .dropTableIfExists('TagPost')
    .dropTableIfExists('PostMetadata')
    .dropTableIfExists('Post')
    .dropTableIfExists('Tag')
    .dropTableIfExists('Locale')
    .dropTableIfExists('AuthorMetadata')
    .dropTableIfExists('Author')
    .dropTableIfExists('Metadata')
    .createTable('Author', table => {
      table.increments('author_id').primary();
      table.string('name').unique();
    })
    .createTable('AuthorMetadata', table => {
      table.increments('id').primary();
      table.string('author').references('Author.name');
    })
    .createTable('Account', table => {
      table.increments('account_id').primary();
      table.integer('authorId').unsigned().references('Author.author_id');
    })
    .createTable('Locale', table => {
      table.string('isoCode').primary();
    })
    .createTable('Tag', table => {
      table.increments('tag_id').primary();
    })
    .createTable('Post', table => {
      table.increments('post_id').primary();
      table.integer('authorId').unsigned().references('Author.author_id');
      table.string('title').unique();
    })
    .createTable('PostMetadata', table => {
      table.string('post').references('Post.title');
      table.string('code').references('Locale.isoCode');
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
      table.string('name').unique();
    })
    .createTable('CommenterAccount', table => {
      table.string('commenter').primary().references('Commenter.name');
    })
    .createTable('Metadata', table => {
      table.increments('id').primary();
      table.string('type');
      table.integer('target').unsigned();
    });
}

/**
 * Export `clearTables`.
 */

export async function clearTables(repository) {
  await repository.knex('Account').del();
  await repository.knex('CommenterAccount').del();
  await repository.knex('Commenter').del();
  await repository.knex('Comment').del();
  await repository.knex('PostMetadata').del();
  await repository.knex('Locale').del();
  await repository.knex('TagPost').del();
  await repository.knex('Post').del();
  await repository.knex('Tag').del();
  await repository.knex('AuthorMetadata').del();
  await repository.knex('Author').del();
  await repository.knex('Metadata').del();
}

/**
 * Export `dropTables`.
 */

export function dropTables(repository) {
  return repository.knex.schema
    .dropTable('TagPost')
    .dropTable('Account')
    .dropTable('CommenterAccount')
    .dropTable('Commenter')
    .dropTable('Comment')
    .dropTable('PostMetadata')
    .dropTable('Locale')
    .dropTable('Post')
    .dropTable('Tag')
    .dropTable('AuthorMetadata')
    .dropTable('Author')
    .dropTable('Metadata');
}

/**
 * Export `fixtures`.
 */

export function fixtures(repository) {
  const Account = repository.Model.extend({
    idAttribute: 'account_id',
    tableName: 'Account'
  });

  const CommenterAccount = repository.Model.extend({
    idAttribute: 'commenter',
    tableName: 'CommenterAccount'
  });

  const CommenterMetadata = repository.Model.extend({
    tableName: 'Metadata'
  });

  const Commenter = repository.Model.extend({
    account() {
      return this.belongsTo(CommenterAccount, 'name', 'commenter');
    },
    idAttribute: 'commenter_id',
    metadata() {
      return this.hasMany(CommenterMetadata, 'target').query({ where: { type: 'commenter' } });
    },
    tableName: 'Commenter'
  }, {
    dependents: ['account', 'metadata']
  });

  const Locale = repository.Model.extend({
    idAttribute: 'isoCode',
    tableName: 'Locale'
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

  const PostMetadata = repository.Model.extend({
    idAttribute: null,
    tableName: 'PostMetadata'
  });

  const Post = repository.Model.extend({
    comments() {
      return this.hasMany(Comment, 'postId');
    },
    idAttribute: 'post_id',
    metadata() {
      return this.belongsToMany(Locale, 'PostMetadata', 'post', 'code', 'title', 'isoCode');
    },
    tableName: 'Post',
    tags() {
      return this.belongsToMany(Tag, 'TagPost', 'postId', 'tagId');
    }
  }, {
    dependents: ['comments', 'tags', 'metadata']
  });

  const AuthorMetadata = repository.Model.extend({
    tableName: 'AuthorMetadata'
  });

  const Author = repository.Model.extend({
    account() {
      return this.hasOne(Account, 'authorId');
    },
    idAttribute: 'author_id',
    metadata() {
      return this.hasOne(AuthorMetadata, 'author', 'name');
    },
    posts() {
      return this.hasMany(Post, 'authorId');
    },
    tableName: 'Author'
  }, {
    dependents: ['account', 'metadata', 'posts']
  });

  return {
    Account,
    Author,
    AuthorMetadata,
    Comment,
    Commenter,
    CommenterAccount,
    CommenterMetadata,
    Locale,
    Post,
    PostMetadata,
    Tag,
    TagPost
  };
}
