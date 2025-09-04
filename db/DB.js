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
        if (instances[dbName]) {
            return instances[dbName];
        }

        // this.validateSchema = validateSchema;

        if (!fs.existsSync(DB_PATH)) {
            fs.mkdirSync(DB_PATH, { recursive: true });
        }
        const dbPath = path.join(DB_PATH, dbName);

        // Check if database file exists and is readable
        if (fs.existsSync(dbPath)) {
            try {
                const stats = fs.statSync(dbPath);
                console.log(`📊 Database file ${dbName}: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
            } catch (error) {
                console.error(`❌ Error reading database file ${dbName}:`, error);
            }
        } else {
            console.log(`📝 Database file ${dbName} does not exist, will be created`);
        }

        this.db = new Datastore({ filename: dbPath, autoload: true });
        this.dbName = dbName.split('.')[0];
        this.queue = async.queue((task, callback) => {
            task(callback);
        }, 1);
        this.db.loadDatabase(err => {
            if (err) {
                console.error(`❌ Error loading database ${dbName}:`, err);
                console.error('Database path:', path.join(DB_PATH, dbName));
                console.error('Error details:', {
                    errorType: err.constructor.name,
                    message: err.message,
                    code: err.code
                });

                // Try to recover from corrupted database
                if (err.message.includes('corrupt') || err.message.includes('invalid')) {
                    console.warn(`⚠️ Database ${dbName} appears corrupted, attempting recovery...`);
                    // For now, just log the issue - in production you might want to backup and recreate
                } else if (err.message.includes('locked') || err.message.includes('busy')) {
                    console.warn(`⚠️ Database ${dbName} is locked or busy, retrying in 1 second...`);
                    setTimeout(() => {
                        this.db.loadDatabase((retryErr) => {
                            if (retryErr) {
                                console.error(`❌ Retry failed for database ${dbName}:`, retryErr);
                            } else {
                                console.log(`✅ Database ${dbName} loaded successfully on retry`);
                            }
                        });
                    }, 1000);
                }
            } else {
                console.log(`✅ Database ${dbName} loaded successfully`);
            }
        });
        this.db.insertAsync = util.promisify(this.db.insert);
        this.db.findAsync = util.promisify(this.db.find);
        this.db.findOneAsync = util.promisify(this.db.findOne);
        this.db.updateAsync = util.promisify(this.db.update);
        this.db.removeAsync = util.promisify(this.db.remove);

        // Test database connection with timeout
        const testTimeout = setTimeout(() => {
            console.warn(`⚠️ Database ${dbName} connection test timed out`);
        }, 5000);

        this.db.find({}).limit(1).exec((err) => {
            clearTimeout(testTimeout);
            if (err) {
                console.error(`❌ Database ${dbName} connection test failed:`, err);
                console.error('Error details:', {
                    errorType: err.constructor.name,
                    message: err.message,
                    code: err.code
                });
            } else {
                console.log(`✅ Database ${dbName} connection test passed`);
            }
        });

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
