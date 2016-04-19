
/**
 * Module dependencies.
 */

import { repository } from './repository';
import { Account, Author, Comment, Post } from './models';

/**
 * Export `Accounts`.
 */

export const Accounts = repository.Collection.extend({ model: Account });

/**
 * Export `Authors`.
 */

export const Authors = repository.Collection.extend({ model: Author });

/**
 * Export `Comments`.
 */

export const Comments = repository.Collection.extend({ model: Comment });

/**
 * Export `Posts`.
 */

export const Posts = repository.Collection.extend({ model: Post });
