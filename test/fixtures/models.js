
/**
 * Module dependencies.
 */

import { repository } from './repository';

/**
 * Export `Account`.
 */

export const Account = repository.Model.extend({ tableName: 'Account' });

/**
 * Export `Comment`.
 */

export const Comment = repository.Model.extend({ tableName: 'Comment' });

/**
 * Export `Post`.
 */

export const Post = repository.Model.extend({
  comments() {
    return this.hasMany(Comment, 'postId');
  },
  tableName: 'Post'
}, {
  dependents: ['comments']
});

/**
 * Export `Author`.
 */

export const Author = repository.Model.extend({
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
