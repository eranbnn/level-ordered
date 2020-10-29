const path = require('path');
const level = require('level');
const sub = require('subleveldown');
const lexint = require('lexicographic-integer-encoding')('hex', { strict: true });

const DB_OPTIONS = { valueEncoding: 'json', keyEncoding: lexint };
const MISSING_INPUT = 'missing input';
const INITIAL = 0;
const COUNTER_KEY = INITIAL;
const filePool = {};
class Database {
    static getActiveDBs() {
        return Object.keys(filePool);
    }

    static closeAllDBs() {
        return Promise.all(Database.getActiveDBs().map(async db => {
            await filePool[db].close();
            filePool[db] = null;
        }));
    }

    static async access(db, collection) {
        if (!db || !collection) {
          throw MISSING_INPUT;
        }
        const instance = new Database();
        await instance._init(db, collection);
        return instance;
    }

    async _init(db, collection) {
        this._level = filePool[db] = filePool[db] || level(path.join(process.cwd(), 'db', db), DB_OPTIONS);
        this.db = sub(this._level, collection);
        return this.db.get(COUNTER_KEY, DB_OPTIONS).then(({val}) => (this.latestKey = val)).catch((err) => {
            if (err.type === 'NotFoundError') {
                return this._updateCounter(INITIAL);
            }
            throw err;
        });
    }

    _updateCounter(newCounter) {
        return this.db.put(COUNTER_KEY, {val: this.latestKey = newCounter}, DB_OPTIONS);
    }

    async _updateLastItem() {
        const allItems = await this.getAll();
        const newCount = allItems.length ? allItems[allItems.length - 1]._id : INITIAL;
        return this._updateCounter(newCount);
    }

    getAll(filterFunc) {
        const result = [];
        return new Promise(resolve => this.db.createReadStream({ gt: COUNTER_KEY, ...DB_OPTIONS })
            .on('data', ({ key, value }) => (!filterFunc || filterFunc(value)) && result.push({ ...value, _id: key }))
            .on('error', (err) => { throw err; })
            .on('end', () => resolve(result)));
    }

    getKey(key) {
        return this.db.get(key, DB_OPTIONS);
    }

    getLastItem() {
        return this.latestKey === INITIAL ? undefined : this.db.get(this.latestKey, DB_OPTIONS);
    }

    async insert(...newItems) {
        if (newItems.length) {
            const ops = newItems.map((value, index) => ({type: 'put', key: this.latestKey + index + 1, value}));
            await this.db.batch(ops, DB_OPTIONS);
            await this._updateCounter(ops[ops.length - 1].key);
        }
        return newItems.length;
    }

    async update(key, updateObj) {
        const item = await this.getKey(key);
        return this.db.put(key, Object.assign(item, updateObj), DB_OPTIONS);
    }

    deleteKey(key) {
        return this.db.del(key, DB_OPTIONS).then(result => key === this.latestKey ? this._updateLastItem() : result);
    }

    async deleteBy(filterFunc) {
        const itemsToDelete = await this.getAll(filterFunc);
        if (itemsToDelete.length) {
            const lastIDToDelete = itemsToDelete[itemsToDelete.length - 1]._id;
            await this.db.batch(itemsToDelete.map(({_id}) => ({type: 'del', key: _id})), DB_OPTIONS)
            if (lastIDToDelete === this.latestKey) {
                await this._updateLastItem();
            }
        }
        return itemsToDelete.length;
    }
}

module.exports = Database;
