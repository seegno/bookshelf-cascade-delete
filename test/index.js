
/**
 * Module dependencies.
 */

import fixtures from './utils/fixtures';
import should from 'should';
import { clearTables, createTables, dropTables } from './utils/database';

/**
 * Test suite.
 */

export default ({ Model, knex }, assert) => {
  const { Account, Author, Comment, Commenter, Post, Tag, TagPost } = fixtures(Model);

  before(async () => {
    await dropTables(knex);
    await createTables(knex);
  });

  beforeEach(async () => {
    await clearTables(knex);
  });

  after(async () => {
    await dropTables(knex);
  });

  it('should throw an error if model has no registered dependents', async () => {
    const author = await Model.extend({ idAttribute: 'author_id', tableName: 'Author' }).forge().save();

    await Account.forge().save({ authorId: author.get('author_id') });

    try {
      await author.destroy();

      should.fail();
    } catch (e) {
      assert(e);
    }

    const accounts = await Account.fetchAll();
    const authors = await Author.fetchAll();

    accounts.length.should.equal(1);
    authors.length.should.equal(1);
  });

  it('should throw an error if model has dependents and `cascadeDelete` option is given as `false`', async () => {
    const author = await Author.forge().save();

    await Account.forge().save({ authorId: author.get('author_id') });

    try {
      await author.destroy({ cascadeDelete: false });

      should.fail();
    } catch (e) {
      assert(e);
    }

    const accounts = await Account.fetchAll();
    const authors = await Author.fetchAll();

    accounts.length.should.equal(1);
    authors.length.should.equal(1);
  });

  it('should rollback any query on given `transaction` if an error is thrown on model destroy', async () => {
    const author = await Model.extend({ idAttribute: 'author_id', tableName: 'Author' }).forge().save();

    try {
      await knex.transaction(transaction => {
        return Account.forge().save({ authorId: author.get('author_id') }, { transacting: transaction })
          .then(() => author.destroy({ transacting: transaction }));
      });

      should.fail();
    } catch (e) {
      assert(e);
    }

    const accounts = await Account.fetchAll();
    const authors = await Author.fetchAll();

    accounts.length.should.equal(0);
    authors.length.should.equal(1);
  });

  it('should not delete model and its dependents if an error is thrown on destroy', async () => {
    const Author = Model.extend({
      account() {
        return this.hasOne(Account, 'authorId');
      },
      idAttribute: 'author_id', tableName: 'Author'
    }, {
      dependents: ['account']
    });

    const author = await Author.forge().save();

    await Account.forge().save({ authorId: author.get('author_id') });
    await Post.forge().save({ authorId: author.get('author_id') });

    try {
      await author.destroy();

      should.fail();
    } catch (e) {
      assert(e);
    }

    const accounts = await Account.fetchAll();
    const authors = await Author.fetchAll();
    const posts = await Post.fetchAll();

    accounts.length.should.equal(1);
    authors.length.should.equal(1);
    posts.length.should.equal(1);
  });

  it('should delete model and all its dependents', async () => {
    const author = await Author.forge().save();
    const post1 = await Post.forge().save({ authorId: author.get('author_id') });
    const post2 = await Post.forge().save({ authorId: author.get('author_id') });
    const comment1 = await Comment.forge().save({ postId: post1.get('post_id') });
    const comment2 = await Comment.forge().save({ postId: post2.get('post_id') });
    const tag1 = await Tag.forge().save();
    const tag2 = await Tag.forge().save();

    await Account.forge().save({ authorId: author.get('author_id') });
    await Commenter.forge().save({ commentId: comment1.get('comment_id') });
    await Commenter.forge().save({ commentId: comment2.get('comment_id') });
    await TagPost.forge().save({ postId: post1.get('post_id'), tagId: tag1.get('tag_id') });
    await TagPost.forge().save({ postId: post2.get('post_id'), tagId: tag2.get('tag_id') });

    await author.destroy();

    const accounts = await Account.fetchAll();
    const authors = await Author.fetchAll();
    const commenters = await Commenter.fetchAll();
    const comments = await Comment.fetchAll();
    const posts = await Post.fetchAll();
    const tagPosts = await TagPost.fetchAll();
    const tags = await Tag.fetchAll();

    accounts.length.should.equal(0);
    authors.length.should.equal(0);
    commenters.length.should.equal(0);
    comments.length.should.equal(0);
    posts.length.should.equal(0);
    tagPosts.length.should.equal(0);
    tags.length.should.equal(2);
  });

  it('should delete queried model and all its dependents', async () => {
    const author = await Author.forge().save({ name: 'foobar' });
    const post1 = await Post.forge().save({ authorId: author.get('author_id') });
    const post2 = await Post.forge().save({ authorId: author.get('author_id') });
    const comment1 = await Comment.forge().save({ postId: post1.get('post_id') });
    const comment2 = await Comment.forge().save({ postId: post2.get('post_id') });
    const tag1 = await Tag.forge().save();
    const tag2 = await Tag.forge().save();

    await Account.forge().save({ authorId: author.get('author_id') });
    await Commenter.forge().save({ commentId: comment1.get('comment_id') });
    await Commenter.forge().save({ commentId: comment2.get('comment_id') });
    await TagPost.forge().save({ postId: post1.get('post_id'), tagId: tag1.get('tag_id') });
    await TagPost.forge().save({ postId: post2.get('post_id'), tagId: tag2.get('tag_id') });

    await Author.forge().where({ name: 'foobar' }).destroy();

    const accounts = await Account.fetchAll();
    const authors = await Author.fetchAll();
    const commenters = await Commenter.fetchAll();
    const comments = await Comment.fetchAll();
    const posts = await Post.fetchAll();
    const tagPosts = await TagPost.fetchAll();
    const tags = await Tag.fetchAll();

    accounts.length.should.equal(0);
    authors.length.should.equal(0);
    commenters.length.should.equal(0);
    comments.length.should.equal(0);
    posts.length.should.equal(0);
    tagPosts.length.should.equal(0);
    tags.length.should.equal(2);
  });

  it('should not delete models which are not dependent', async () => {
    const author1 = await Author.forge().save();
    const author2 = await Author.forge().save();
    const post1 = await Post.forge().save({ authorId: author1.get('author_id') });
    const post2 = await Post.forge().save({ authorId: author2.get('author_id') });
    const comment1 = await Comment.forge().save({ postId: post1.get('post_id') });
    const comment2 = await Comment.forge().save({ postId: post2.get('post_id') });
    const tag1 = await Tag.forge().save();
    const tag2 = await Tag.forge().save();

    await Account.forge().save({ authorId: author1.get('author_id') });
    await Account.forge().save({ authorId: author2.get('author_id') });
    await Commenter.forge().save({ commentId: comment1.get('comment_id') });
    await Commenter.forge().save({ commentId: comment2.get('comment_id') });
    await TagPost.forge().save({ postId: post1.get('post_id'), tagId: tag1.get('tag_id') });
    await TagPost.forge().save({ postId: post2.get('post_id'), tagId: tag2.get('tag_id') });

    await author1.destroy();

    const accounts = await Account.fetchAll();
    const authors = await Author.fetchAll();
    const commenters = await Commenter.fetchAll();
    const comments = await Comment.fetchAll();
    const posts = await Post.fetchAll();
    const tagPosts = await TagPost.fetchAll();
    const tags = await Tag.fetchAll();

    accounts.length.should.equal(1);
    authors.length.should.equal(1);
    commenters.length.should.equal(1);
    comments.length.should.equal(1);
    posts.length.should.equal(1);
    tagPosts.length.should.equal(1);
    tags.length.should.equal(2);
  });
};
