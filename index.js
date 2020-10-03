const path = require('path');
const level = require('level');
const sub = require('subleveldown');

const filePool = {};
const MISSING_INPUT = 'missing input';
const JSON_ENCODING = { valueEncoding: 'json' };
const INITIAL = 100000000000; // TODO run a health check
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
        this._level = filePool[db] = filePool[db] || level(path.join(process.cwd(), 'db', db), JSON_ENCODING);
        this.db = sub(this._level, collection);
        return this.db.get('counter').then(value => (this.latestKey = +value)).catch((err) => {
            if (err.type === 'NotFoundError') {
                return this._updateCounter(INITIAL);
            }
            throw err;
        });
    }

    _updateCounter(newCounter) {
        return this.db.put('counter', this.latestKey = newCounter);
    }

    _updateLastItem() {
        return this.getAll().then(results => +results[results.length - 1]._id).then(this._updateCounter.bind(this));
    }

    getAll(filterFunc) {
        const result = [];
        return new Promise(resolve => this.db.createReadStream({ gt: '0', lt: 'a', ...JSON_ENCODING })
            .on('data', ({ key, value }) => (!filterFunc || filterFunc(value)) && result.push({ ...value, _id: key }))
            .on('error', (err) => { throw err; })
            .on('end', () => resolve(result)));
    }

    getKey(key) {
        return this.db.get(key, JSON_ENCODING);
    }

    getLastItem() {
        return this.latestKey === INITIAL ? undefined : this.db.get(this.latestKey, JSON_ENCODING);
    }

    async insert(...newItems) {
        const ops = newItems.map((value, index) => ({ type: 'put', key: this.latestKey + index + 1, value }));
        await this.db.batch(ops, JSON_ENCODING);
        await this._updateCounter(ops[ops.length - 1].key);
    }

    async update(key, updateObj) {
        const item = await this.getKey(key);
        return this.db.put(key, Object.assign(item, updateObj), JSON_ENCODING);
    }

    deleteKey(key) {
        return this.db.del(key).then(result => +key === this.latestKey ? this._updateLastItem() : result);
    }

    async deleteBy(filterFunc) {
        const itemToDelete = await this.getAll(filterFunc);
        const lastIDToDelete = itemToDelete[itemToDelete.length - 1]._id;
        return this.db.batch(itemToDelete.map(({ _id }) => ({ type: 'del', key: _id })))
            .then(result => +lastIDToDelete === this.latestKey ? this._updateLastItem() : result);
    }
}

module.exports = Database;
