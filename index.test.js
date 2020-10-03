const Database = require("./index");

const dbName = 'test';
const collectionName = 'new';
const items = ['one', 'two', 'three'].map(val => ({val}));
describe(`Database '${dbName}'`, () => {
    it('should create and access db', async () => {
        await Database.access(dbName, collectionName);
    });

    it('should be able to access db again', async () => {
        await Database.access(dbName, collectionName);
    });

    it('should list active databases', () => {
        expect(Database.getActiveDBs()).toEqual([dbName]);
    });

    it('should insert items in order', async () => {
        const testDB = await Database.access(dbName, collectionName);
        await testDB.insert(...items);
        const allItems = await testDB.getAll();
        expect(allItems.map(({val}) => val)).toEqual(items.map(({val}) => val));
    });

    it('should get last item', async () => {
        const testDB = await Database.access(dbName, collectionName);
        const {val} = await testDB.getLastItem();
        expect(val).toEqual(items[items.length - 1].val);
    });

    it(`should update item: ${JSON.stringify(items[0])}`, async () => {
        const testDB = await Database.access(dbName, collectionName);
        const filterFunc = ({val}) => val === items[0].val;
        const [{_id: keyOfItem}] = await testDB.getAll(filterFunc);

        const update = 'newVal';
        await testDB.update(keyOfItem, {update});

        const newVar = await testDB.getKey(keyOfItem);
        const {update: result} = newVar;
        expect(result).toEqual(update);
    });

    it(`should access an existing db and add an item`, async () => {
        await Database.closeAllDBs();
        const testDB = await Database.access(dbName, collectionName);

        const newItem = {val: 'four'};
        await testDB.insert(newItem);

        const allItems = await testDB.getAll();
        expect(allItems.map(({val}) => val)).toEqual(items.concat([newItem]).map(({val}) => val));
        const {val} = await testDB.getLastItem();
        expect(val).toEqual(newItem.val);
    });

    it(`should delete item: ${JSON.stringify(items[1])}`, async () => {
        const testDB = await Database.access(dbName, collectionName);
        const filterFunc = ({val}) => val === items[1].val;
        await testDB.deleteBy(filterFunc);
        expect(await testDB.getAll(filterFunc)).toHaveLength(0);
    });

    it(`should delete last item and have a new last item`, async () => {
        const testDB = await Database.access(dbName, collectionName);
        await testDB.deleteKey(testDB.latestKey);
        expect(await testDB.getLastItem()).toBeDefined();
    });

    it('should keep different collections separate', async () => {
        const testDB1 = await Database.access(dbName, collectionName + 1);
        const testDB2 = await Database.access(dbName, collectionName + 2);

        await testDB1.insert(items[0]);
        await testDB2.insert(items[0]);

        const allItems1 = await testDB1.getAll();
        const allItems2 = await testDB2.getAll();
        expect(allItems1).toHaveLength(1);
        expect(allItems2).toHaveLength(1);
        expect(allItems1[0]._id).toEqual(allItems2[0]._id)
    });

    afterAll(async () => {
        (await Database.access(dbName, collectionName))._level.clear();
    });
});
