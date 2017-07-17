
/**
 * Fixtures.
 */

export default Model => {
  const Account = Model.extend({
    idAttribute: 'account_id',
    tableName: 'Account'
  });

  const Commenter = Model.extend({
    idAttribute: 'commenter_id',
    tableName: 'Commenter'
  });

  const Comment = Model.extend({
    commenter() {
      return this.hasOne(Commenter, 'commentId');
    },
    idAttribute: 'comment_id',
    tableName: 'Comment'
  }, {
    dependents: ['commenter']
  });

  const Tag = Model.extend({
    idAttribute: 'tag_id',
    tableName: 'Tag'
  });

  const TagPost = Model.extend({
    idAttribute: null,
    tableName: 'TagPost'
  });

  const Post = Model.extend({
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

  const Author = Model.extend({
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
