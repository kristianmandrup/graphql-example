import test from 'ava';
import {Graph} from '../../dist';
import {
  connectToMongo,
  ObjectId
} from '../../dist/lib/mongodb';
import * as config from '../../dist/config';

/*
* Initialization and test hooks.
*/

const graph = new Graph(config);

test.before(async (t) => {
  graph.mongo = await connectToMongo(`${config.mongoUrl}`);
});

test.after(async (t) => {
  graph.mongo.close();
});

/*
* Graph tests.
*/

test('query `getUser` should return a paginated list of users', async (t) => {
  await graph.mongo.collection('users').remove({});
  await graph.mongo.collection('users').insert([
    {_id: new ObjectId('582f4c7e2d25676224e08f9c'), name: 'Foo'},
    {_id: new ObjectId('582f4d220260a6625228564f'), name: 'Bar'},
    {_id: new ObjectId('582f4d5da7489e626d5db9c6'), name: 'Baz'},
  ]);

  let query = `
    query ($skip: Int, $limit: Int) {
      users: getUsers(skip: $skip, limit: $limit) {
        id
        name
      }
    }
  `;
  let res = await graph.exec({query, vars: {
    skip: 1,
    limit: 1
  }});

  t.deepEqual(res, {
    data: {
      users: [
        {
          id: '582f4d220260a6625228564f',
          name: 'Bar'
        }
      ]
    }
  });
});

test('mutation `createUser` should validate model and create a new user', async (t) => {
  await graph.mongo.collection('users').remove({});

  let query = `
    mutation ($name: String) {
    	user: createUser(name: $name) {
    		id
        errors {
          path
          errors {
          	validator
          	message
          	code
          }
        }
      }
    }
  `;
  let res = await graph.exec({query});

  t.deepEqual(res, {
    data: {
      user: {
        id: null,
        errors: [
          {
            path: ['name'],
            errors: [
              {
                validator: 'presence',
                message: 'is required',
                code: 422
              }
            ]
          }
        ]
      }
    }
  });
});

test('mutation `createUser` should create a new user', async (t) => {
  await graph.mongo.collection('users').remove({});

  let query = `
    mutation ($name: String) {
    	user: createUser(name: $name) {
    		id
        name
        errors {
          path
        }
      }
    }
  `;
  let res = await graph.exec({query, vars: {
    name: 'Foo'
  }});

  t.deepEqual(res, {
    data: {
      user: {
        id: res.data.user.id,
        name: 'Foo',
        errors: []
      }
    }
  });
});
