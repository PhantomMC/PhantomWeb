const { MongoClient, MongoError } = require("mongodb")



module.exports = class MongoManager {
	/*
	 * default options
	 */
	url = "mongodb://localhost:27017";

	/**
	 * Create's a connection to mongodb based on the default: url setting
	 * loads specified database
	 * @param {any} opts
	 * @param {string} databaseName
	 */
	constructor(opts, databaseName) {
		this.databaseName = databaseName;
		try {
			this.url = opts.default.url;
			this.connect();
			return;
		} catch (exception) {
			if (excpetion instanceof MongoError) {
				this.url = opt.dev.url;
				this.connect();
			}
			else {
				throw exception;
			}
		}
	}

	/**
	 * Internal function used to try a connection 
	 */
	async connect() {
		this.client = MongoClient(this.url);
		await this.client.connect();
		this.db = this.client.db(this.databaseName);
		await this.db.command({ ping: 1 });
	}

	/**
	 * Close connection
	 */
	close() {
		this.client.close();
	}

	/**
	 * Get a mongodb collection, based oncollectionName
	 * @param {string} collectionName
	 */
	getCollection(collectionName) {
		return this.db.collection(collectionName);
	}
}