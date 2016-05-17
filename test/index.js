
/**
 * Module dependencies.
 */

import knexfile from './knexfile.js';
import should from 'should';
import sinon from 'sinon';
import { Account, Author, Comment, Post } from './fixtures/models';
import { Accounts, Authors, Comments, Posts } from './fixtures/collections';
import { Model, repository } from './fixtures/repository';
import { clearTables, dropTables, recreateTables } from './utils';

const DB_TYPE = knexfile.client;
const ERR_CODE_FOREIGN_KEY_VIOLATION = DB_TYPE === 'postgres' ? '23503' : 'ER_ROW_IS_REFERENCED_2';

/**
 * Test `bookshelf-cascade-delete` plugin.
 */

describe('bookshelf-cascade-delete', () => {
  before(async () => {
    await recreateTables();
  });

  beforeEach(async () => {
    await clearTables();
  });

  after(async () => {
    await dropTables();
  });

  it('should throw an error if model has no registered dependents', async () => {
    const author = await repository.Model.extend({ tableName: 'Author' }).forge().save();

    await Account.forge().save({ authorId: author.get('id') });

    try {
      await author.destroy();

      should.fail();
    } catch(e) {
      e.code.should.equal(ERR_CODE_FOREIGN_KEY_VIOLATION);
    }
  });

  it('should throw an error if model has dependents and `cascadeDelete` option is given as `false`', async () => {
    const author = await Author.forge().save();

    await Account.forge().save({ authorId: author.get('id') });

    try {
      await author.destroy({ cascadeDelete: false });

      should.fail();
    } catch(e) {
      e.code.should.equal(ERR_CODE_FOREIGN_KEY_VIOLATION);
    }
  });

  it('should not delete model and its dependents if an error is thrown on destroy', async () => {
    const author = await Author.forge().save();
    const post = await Post.forge().save({ authorId: author.get('id') });

    await Account.forge().save({ authorId: author.get('id') });
    await Comment.forge().save({ postId: post.get('id') });

    sinon.stub(Model, 'destroy').throws(new Error('foobar'));

    try {
      await author.destroy();

      should.fail();
    } catch(e) {
      e.message.should.equal('foobar');
    }

    const accounts = await Accounts.query();
    const authors = await Authors.query();
    const comments = await Comments.query();
    const posts = await Posts.query();

    accounts.length.should.equal(1);
    authors.length.should.equal(1);
    comments.length.should.equal(1);
    posts.length.should.equal(1);

    sinon.restore(Model);
  });

  it('should rollback any query on given `transaction` if an error is thrown on model destroy', async () => {
    sinon.stub(Model, 'destroy').throws(new Error('foobar'));

    try {
      await repository.knex.transaction(transaction => Author.forge().save(null, { transacting: transaction })
        .then(() => Author.forge().save(null, { transacting: transaction }))
        .then(author => author.destroy({ transacting: transaction }))
      );

      should.fail();
    } catch(e) {
      e.message.should.equal('foobar');
    }

    const authors = await Authors.query();

    authors.length.should.equal(0);

    sinon.restore(Model);
  });

  it('should delete model and all its dependents', async () => {
    const author = await Author.forge().save();
    const post1 = await Post.forge().save({ authorId: author.get('id') });
    const post2 = await Post.forge().save({ authorId: author.get('id') });

    await Account.forge().save({ authorId: author.get('id') });
    await Comment.forge().save({ postId: post1.get('id') });
    await Comment.forge().save({ postId: post2.get('id') });

    await author.destroy();

    const accounts = await Accounts.query();
    const authors = await Authors.query();
    const comments = await Comments.query();
    const posts = await Posts.query();

    accounts.length.should.equal(0);
    authors.length.should.equal(0);
    comments.length.should.equal(0);
    posts.length.should.equal(0);
  });

  it('should not delete models which are not dependent', async () => {
    const author1 = await Author.forge().save();
    const author2 = await Author.forge().save();
    const post1 = await Post.forge().save({ authorId: author1.get('id') });
    const post2 = await Post.forge().save({ authorId: author2.get('id') });

    await Account.forge().save({ authorId: author1.get('id') });
    await Account.forge().save({ authorId: author2.get('id') });
    await Comment.forge().save({ postId: post1.get('id') });
    await Comment.forge().save({ postId: post2.get('id') });

    await author1.destroy();

    const accounts = await Accounts.query();
    const authors = await Authors.query();
    const comments = await Comments.query();
    const posts = await Posts.query();

    accounts.length.should.equal(1);
    authors.length.should.equal(1);
    comments.length.should.equal(1);
    posts.length.should.equal(1);
  });

  it('should call destroy prototype method with given `options`', async () => {
    sinon.spy(Model, 'destroy');

    const author = await Author.forge().save();

    await author.destroy({ foo: 'bar' });

    Model.destroy.callCount.should.equal(1);
    Model.destroy.firstCall.args[0].should.have.properties({ foo: 'bar' });

    sinon.restore(Model);
  });
});
