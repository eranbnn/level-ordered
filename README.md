# level-ordered

A wrapper for [`level`][level] that keeps inserted items ordered.

[![npm](https://img.shields.io/npm/v/level-ordered.svg?label=&logo=npm)](https://www.npmjs.com/package/level-ordered)
[![npm](https://img.shields.io/npm/dm/level-ordered.svg?label=dl)](https://www.npmjs.com/package/level-ordered)

All items should be in JSON form.

(Supports up to 899,999,999,999 item insertions per collection)

## Usage
```js 
// create/access database
const testDB = await Database.access('dbName', 'collectionName');

// insert items
await testDB.insert({ val: 'one' }, { val: 'two' }, { val: 'three' });

// get all items
const allItems = await testDB.getAll();
allItems.map(({ val }) => val) // ['one', 'two', 'three']

// get last item
await testDB.getLastItem(); // { val: 'three' }

// delete item: { val: 'two' }
const filterFunc = ({ val }) => val === 'two';
await testDB.deleteBy(filterFunc);
await testDB.getAll(filterFunc) // []
```    
## API

### `getAll(filterFunc)`
Returns a promise for all items (+ keys as `_id` fields), filtered by a function if provided, in an array form.

### `getKey(key)`
Returns a promise for the item matching the key provided

### `getLastItem()`
Returns a promise for the last inserted item.

### `insert(...newItems)`
Asynchronously inserts items provided into the database.

### `update(key, updateObj)`
Asynchronously updates an item in the database with an object provided.

### `deleteKey(key)`
Asynchronously deletes an item according to key provided.

### `deleteBy(filterFunc)`
Asynchronously deletes items, filtered by a function if provided.

## License
[MIT](LICENSE.md)

[level]: https://github.com/Level/level