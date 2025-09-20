import 'module-alias/register.js';
import Datastore from 'nedb';
import util from 'util';
import path from 'path';
// import validateSchema from './validateSchema.js';
// import schemas from './schemas.js';
import async from 'async';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), './data/');

// Ensure the data directory exists
if (!fs.existsSync(DB_PATH)) {
    try {
        fs.mkdirSync(DB_PATH, { recursive: true });
        console.log(`✅ Created data directory: ${DB_PATH}`);
    } catch (error) {
        console.error(`❌ Failed to create data directory: ${DB_PATH}`, error);
    }
}

let instances = {};

export default class DB {
    constructor(dbName) {
        // DEPRECATED: This database system should not be used anymore
        // All data has been migrated to MySQL via Prisma
        console.warn(`⚠️ DEPRECATED: Attempt to access old database file: ${dbName}`);
        console.warn(`⚠️ The /data directory contains backup files only and should not be accessed by the server`);
        console.warn(`⚠️ Please use the new Prisma-based repositories instead`);

        if (instances[dbName]) {
            return instances[dbName];
        }

        // Return a mock instance to prevent errors, but don't actually create database connections
        this.db = {
            find: () => Promise.resolve([]),
            findOne: () => Promise.resolve(null),
            insert: () => Promise.resolve({}),
            update: () => Promise.resolve({}),
            remove: () => Promise.resolve({})
        };
        this.dbName = dbName.split('.')[0];
        this.queue = async.queue((task, callback) => {
            // Mock queue that just calls callback
            callback();
        }, 1);
        this.db.insertAsync = util.promisify(this.db.insert);
        this.db.findAsync = util.promisify(this.db.find);
        this.db.findOneAsync = util.promisify(this.db.findOne);
        this.db.updateAsync = util.promisify(this.db.update);
        this.db.removeAsync = util.promisify(this.db.remove);

        // No connection testing for deprecated database system
        instances[dbName] = this;
    }

    find(query) {
        return new Promise((resolve, reject) => {
            // Add timeout to prevent hanging
            const timeout = setTimeout(() => {
                reject(new Error(`Database query timeout for ${this.dbName}`));
            }, 10000);

            this.queue.push(callback => {
                this._find(query)
                    .then(result => {
                        clearTimeout(timeout);
                        resolve(result);
                    })
                    .catch(error => {
                        clearTimeout(timeout);
                        reject(error);
                    })
                    .finally(callback);
            });
        });
    }

    async _find(query) {
        // Validate database connection
        if (!this.db || !this.db.find) {
            throw new Error('Database not properly initialized');
        }

        let sort = { timestamp: -1 };
        let limit = null;
        let projection = {};
        let page = 0;


        if (query.projection) {
            projection = JSON.parse(query.projection) || {};
            delete query.projection;
        }

        if (query.sort) {
            sort = query.sort;
            delete query.sort;
        }

        if (query.limit) {
            limit = Number(query.limit);
            delete query.limit;
        }

        if (!isNaN(query.page)) {
            page = Number(query.page) + 1;
            delete query.page;
        }

        let cursor = this.db.find(query, projection);

        if (sort) {
            cursor = cursor.sort(sort);
        }

        if (limit) {
            cursor = cursor.limit(limit);
        }

        if (page) {
            cursor = cursor.skip((page - 1) * limit).limit(limit);
        }

        try {
            const execAsync = util.promisify(cursor.exec.bind(cursor));
            const results = await execAsync();
            return results;
        } catch (error) {
            console.error(`❌ Database query execution failed:`, error);
            console.error('Query details:', { query, sort, limit, page });
            console.error('Error details:', {
                errorType: error.constructor.name,
                message: error.message,
                code: error.code,
                stack: error.stack
            });

            // Check for specific database errors
            if (error.message.includes('corrupt') || error.message.includes('invalid')) {
                console.error(`❌ Database ${this.dbName} appears corrupted`);
            } else if (error.message.includes('locked') || error.message.includes('busy')) {
                console.error(`❌ Database ${this.dbName} is locked or busy`);
            }

            throw error;
        }
    }

    async insert(rows) {
        if (Array.isArray(rows)) {
            rows.forEach(row => row.timestamp = new Date());
        } else {
            rows.timestamp = new Date();
        }

        if (typeof rows === 'string') {
            try {
                rows = JSON.parse(rows);
                return await this.db.insertAsync(row);
            } catch (e) {
                throw new Error('Invalid JSON string');
            }
        }

        //const schema = schemas[this.dbName];
        const isArrayOfStrings = Array.isArray(rows) && rows.every(item => typeof item === 'string');

        // Normalize input to always be an array
        const normalizedRows = isArrayOfStrings ? rows.map(str => ({ value: str })) : Array.isArray(rows) ? rows : [rows];

        // Validate schema and insert rows
        const insertPromises = normalizedRows.map(async row => {
            //if (!this.validateSchema(row, schema)) {
            //throw new Error('Invalid schema for one of the rows');
            //}
            return await this.db.insertAsync(row);
        });

        const results = await Promise.all(insertPromises);
        return Array.isArray(rows) ? results : results[0];

    }

    upsert(query, updateDoc) {
        return new Promise((resolve, reject) => {
            this.queue.push(callback => {
                this._upsert(query, updateDoc).then(resolve).catch(reject).finally(callback);
            });
        });
    }

    async _upsert(query, updateDoc) {
        //const schema = schemas[this.dbName];
        // if (!this.validateSchema(updateDoc, schema)) {
        //     throw new Error('Invalid schema');
        // }

        const result = await this.db.updateAsync(query, { $set: updateDoc }, { upsert: true });
        return result;
    }

    replace(query, updateDoc) {
        return new Promise((resolve, reject) => {
            this.queue.push(callback => {
                this._replace(query, updateDoc).then(resolve).catch(reject).finally(callback);
            });
        });
    }

    async _replace(query, updateDoc) {
        const findAsync = util.promisify(this.db.findOne.bind(this.db));
        const removeAsync = util.promisify(this.db.remove.bind(this.db));
        const insertAsync = util.promisify(this.db.insert.bind(this.db));

        const existingDoc = await findAsync(query);
        if (existingDoc) {
            await removeAsync(query);
        }

        const result = await insertAsync(updateDoc);
        return result;
    }

    update(query, update) {
        return new Promise((resolve, reject) => {
            this.queue.push(callback => {
                this._update(query, update).then(resolve).catch(reject).finally(callback);
            });
        });
    }

    async _update(query, update) {
        //const schema = schemas[this.dbName];
        //if (!this.validateSchema(update, schema)) {
        // throw new Error('Invalid schema');
        //}

        return await this.db.updateAsync(query, update, {});
    }

    findOne(query, options = {}) {
        return new Promise((resolve, reject) => {
            this.queue.push(callback => {
                this._findOne(query, options).then(resolve).catch(reject).finally(callback);
            });
        });
    }

    async _findOne(query, options = {}) {
        try {
            options.sort = { timestamp: -1 };
            const row = await this.db.findOneAsync(query, options);
            return row;
        } catch (err) {
            throw new Error(err);
        }
    }

    async remove(query) {
        try {
            let numRemoved = 0;
            let doc;
            while ((doc = await this.db.findOneAsync(query)) != null) {
                numRemoved += await this.db.removeAsync({ _id: doc._id }, {});
            }
            return numRemoved;
        } catch (err) {
            throw new Error(err);
        }
    }

    exists(key, value) {
        return new Promise((resolve, reject) => {
            const query = {};
            query[key] = value;
            this.db.count(query, (err, count) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(count > 0);
                }
            });
        });
    }

    async count(query) {
        const countAsync = util.promisify(this.db.count.bind(this.db));
        const count = await countAsync(query);
        return count;
    }
}
