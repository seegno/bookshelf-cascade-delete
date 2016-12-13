
/**
 * Module dependencies.
 */

 import Bookshelf from 'bookshelf';
 import cascadeDelete from '../../src';
 import knex from 'knex';
 import knexfile from './knexfile';
 import should from 'should';
 import sinon from 'sinon';
 import { clearTables, dropTables, fixtures, recreateTables } from '../utils';

/**
 * Test `bookshelf-cascade-delete` plugin with PostgreSQL client.
 */

describe('with PostgreSQL client', () => {
  const repository = Bookshelf(knex(knexfile));
  const Model = repository.Model.prototype;

  repository.plugin(cascadeDelete);

  const {
    Account,
    Author,
    AuthorMetadata,
    Comment,
    Commenter,
    CommenterAccount,
    Locale,
    Post,
    PostMetadata,
    Tag,
    TagPost
  } = fixtures(repository);

  before(async () => {
    await recreateTables(repository);
  });

  beforeEach(async () => {
    await clearTables(repository);
  });

  after(async () => {
    await dropTables(repository);
  });

  it('should throw an error if model has no registered dependents', async () => {
    const author = await repository.Model.extend({ idAttribute: 'author_id', tableName: 'Author' }).forge().save();

    await Account.forge().save({ authorId: author.get('author_id') });

    try {
      await author.destroy();

      should.fail();
    } catch (e) {
      e.code.should.equal('23503');
    }
  });

  it('should throw an error if model has dependents and `cascadeDelete` option is given as `false`', async () => {
    const author = await Author.forge().save();

    await Account.forge().save({ authorId: author.get('author_id') });

    try {
      await author.destroy({ cascadeDelete: false });

      should.fail();
    } catch (e) {
      e.code.should.equal('23503');
    }
  });

  it('should not delete model and its dependents if an error is thrown on destroy', async () => {
    const author = await Author.forge().save({ name: 'foobar' });
    const post = await Post.forge().save({ authorId: author.get('author_id') });
    const comment = await Comment.forge().save({ postId: post.get('post_id') });

    await Account.forge().save({ authorId: author.get('author_id') });
    await Commenter.forge().save({ commentId: comment.get('comment_id') });

    sinon.stub(Model, 'destroy').throws(new Error('foobar'));

    try {
      await author.destroy();

      should.fail();
    } catch (e) {
      e.message.should.equal('foobar');
    }

    const accounts = await Account.fetchAll();
    const authors = await Author.fetchAll();
    const commenters = await Commenter.fetchAll();
    const comments = await Comment.fetchAll();
    const posts = await Post.fetchAll();

    accounts.length.should.equal(1);
    authors.length.should.equal(1);
    commenters.length.should.equal(1);
    comments.length.should.equal(1);
    posts.length.should.equal(1);

    sinon.restore(Model);
  });

  it('should throw an error if model is missing a relation parent id attribute', async () => {
    try {
      await Author.forge().destroy();

      should.fail();
    } catch (e) {
      e.message.should.equal('Missing relation parent id attribute "author_id" for cascade');
    }
  });

  it('should rollback any query on given `transaction` if an error is thrown on model destroy', async () => {
    sinon.stub(Model, 'destroy').throws(new Error('foobar'));

    try {
      await repository.knex.transaction(transaction => Author.forge().save(null, { transacting: transaction })
        .then(() => Author.forge().save({ name: 'foobar' }, { transacting: transaction }))
        .then(author => author.destroy({ transacting: transaction }))
      );

      should.fail();
    } catch (e) {
      e.message.should.equal('foobar');
    }

    const authors = await Author.fetchAll();

    authors.length.should.equal(0);

    sinon.restore(Model);
  });

  it('should delete model and all its dependents', async () => {
    const author = await Author.forge().save({ name: 'foobar' });
    const post1 = await Post.forge().save({ authorId: author.get('author_id'), title: 'qux' });
    const post2 = await Post.forge().save({ authorId: author.get('author_id'), title: 'qix' });
    const comment1 = await Comment.forge().save({ postId: post1.get('post_id') });
    const comment2 = await Comment.forge().save({ postId: post2.get('post_id') });
    const tag1 = await Tag.forge().save();
    const tag2 = await Tag.forge().save();

    await Account.forge().save({ authorId: author.get('author_id') });
    await AuthorMetadata.forge().save({ author: 'foobar' });
    await Commenter.forge().save({ commentId: comment1.get('comment_id'), name: 'foo' });
    await Commenter.forge().save({ commentId: comment2.get('comment_id'), name: 'bar' });
    await CommenterAccount.forge().save({ commenter: 'foo' });
    await CommenterAccount.forge().save({ commenter: 'bar' });
    await Locale.forge().save({ isoCode: 'biz' });
    await PostMetadata.forge().save({ code: 'biz', post: 'qux' });
    await PostMetadata.forge().save({ code: 'biz', post: 'qix' });
    await TagPost.forge().save({ postId: post1.get('post_id'), tagId: tag1.get('tag_id') });
    await TagPost.forge().save({ postId: post2.get('post_id'), tagId: tag2.get('tag_id') });

    await author.destroy();

    const accounts = await Account.fetchAll();
    const authors = await Author.fetchAll();
    const authorsMetadata = await AuthorMetadata.fetchAll();
    const commenterAccounts = await CommenterAccount.fetchAll();
    const commenters = await Commenter.fetchAll();
    const comments = await Comment.fetchAll();
    const locales = await Locale.fetchAll();
    const posts = await Post.fetchAll();
    const postsMetadata = await PostMetadata.fetchAll();
    const tagPosts = await TagPost.fetchAll();
    const tags = await Tag.fetchAll();

    accounts.length.should.equal(0);
    authors.length.should.equal(0);
    authorsMetadata.length.should.equal(0);
    commenterAccounts.length.should.equal(0);
    commenters.length.should.equal(0);
    comments.length.should.equal(0);
    posts.length.should.equal(0);
    postsMetadata.length.should.equal(0);
    tagPosts.length.should.equal(0);

    locales.length.should.equal(1);
    tags.length.should.equal(2);
  });

  it('should delete queried model and all its dependents', async () => {
    const author = await Author.forge().save({ name: 'foobar' });
    const post1 = await Post.forge().save({ authorId: author.get('author_id'), title: 'qux' });
    const post2 = await Post.forge().save({ authorId: author.get('author_id'), title: 'qix' });
    const comment1 = await Comment.forge().save({ postId: post1.get('post_id') });
    const comment2 = await Comment.forge().save({ postId: post2.get('post_id') });
    const tag1 = await Tag.forge().save();
    const tag2 = await Tag.forge().save();

    await Account.forge().save({ authorId: author.get('author_id') });
    await AuthorMetadata.forge().save({ author: 'foobar' });
    await Commenter.forge().save({ commentId: comment1.get('comment_id'), name: 'foo' });
    await Commenter.forge().save({ commentId: comment2.get('comment_id'), name: 'bar' });
    await CommenterAccount.forge().save({ commenter: 'foo' });
    await CommenterAccount.forge().save({ commenter: 'bar' });
    await Locale.forge().save({ isoCode: 'biz' });
    await PostMetadata.forge().save({ code: 'biz', post: 'qux' });
    await PostMetadata.forge().save({ code: 'biz', post: 'qix' });
    await TagPost.forge().save({ postId: post1.get('post_id'), tagId: tag1.get('tag_id') });
    await TagPost.forge().save({ postId: post2.get('post_id'), tagId: tag2.get('tag_id') });

    await Author.forge().where({ name: 'foobar' }).destroy();

    const accounts = await Account.fetchAll();
    const authors = await Author.fetchAll();
    const authorsMetadata = await AuthorMetadata.fetchAll();
    const commenterAccounts = await CommenterAccount.fetchAll();
    const commenters = await Commenter.fetchAll();
    const comments = await Comment.fetchAll();
    const locales = await Locale.fetchAll();
    const posts = await Post.fetchAll();
    const postsMetadata = await PostMetadata.fetchAll();
    const tagPosts = await TagPost.fetchAll();
    const tags = await Tag.fetchAll();

    accounts.length.should.equal(0);
    authors.length.should.equal(0);
    authorsMetadata.length.should.equal(0);
    commenterAccounts.length.should.equal(0);
    commenters.length.should.equal(0);
    comments.length.should.equal(0);
    posts.length.should.equal(0);
    postsMetadata.length.should.equal(0);
    tagPosts.length.should.equal(0);

    locales.length.should.equal(1);
    tags.length.should.equal(2);
  });

  it('should not delete models which are not dependent', async () => {
    const author1 = await Author.forge().save({ name: 'foo' });
    const author2 = await Author.forge().save({ name: 'bar' });
    const post1 = await Post.forge().save({ authorId: author1.get('author_id'), title: 'biz' });
    const post2 = await Post.forge().save({ authorId: author2.get('author_id'), title: 'baz' });
    const comment1 = await Comment.forge().save({ postId: post1.get('post_id') });
    const comment2 = await Comment.forge().save({ postId: post2.get('post_id') });
    const tag1 = await Tag.forge().save();
    const tag2 = await Tag.forge().save();

    await Account.forge().save({ authorId: author1.get('author_id') });
    await Account.forge().save({ authorId: author2.get('author_id') });
    await AuthorMetadata.forge().save({ author: 'foo' });
    await AuthorMetadata.forge().save({ author: 'bar' });
    await Commenter.forge().save({ commentId: comment1.get('comment_id'), name: 'qux' });
    await Commenter.forge().save({ commentId: comment2.get('comment_id'), name: 'qix' });
    await CommenterAccount.forge().save({ commenter: 'qux' });
    await CommenterAccount.forge().save({ commenter: 'qix' });
    await Locale.forge().save({ isoCode: 'buz' });
    await PostMetadata.forge().save({ code: 'buz', post: 'biz' });
    await PostMetadata.forge().save({ code: 'buz', post: 'baz' });
    await TagPost.forge().save({ postId: post1.get('post_id'), tagId: tag1.get('tag_id') });
    await TagPost.forge().save({ postId: post2.get('post_id'), tagId: tag2.get('tag_id') });

    await author1.destroy();

    const accounts = await Account.fetchAll();
    const authors = await Author.fetchAll();
    const authorsMetadata = await AuthorMetadata.fetchAll();
    const commenterAccounts = await CommenterAccount.fetchAll();
    const commenters = await Commenter.fetchAll();
    const comments = await Comment.fetchAll();
    const locales = await Locale.fetchAll();
    const posts = await Post.fetchAll();
    const postsMetadata = await PostMetadata.fetchAll();
    const tagPosts = await TagPost.fetchAll();
    const tags = await Tag.fetchAll();

    accounts.length.should.equal(1);
    authors.length.should.equal(1);
    authorsMetadata.length.should.equal(1);
    commenterAccounts.length.should.equal(1);
    commenters.length.should.equal(1);
    comments.length.should.equal(1);
    posts.length.should.equal(1);
    postsMetadata.length.should.equal(1);
    tagPosts.length.should.equal(1);

    locales.length.should.equal(1);
    tags.length.should.equal(2);
  });

  it('should call prototype method `destroy` with given `options`', async () => {
    sinon.spy(Model, 'destroy');

    const author = await Author.forge().save({ name: 'qux'});

    await author.destroy({ foo: 'bar' });

    Model.destroy.callCount.should.equal(1);
    Model.destroy.firstCall.args[0].should.have.properties({ foo: 'bar' });

    sinon.restore(Model);
  });
});
