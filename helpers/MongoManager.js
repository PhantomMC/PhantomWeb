const { MongoClient, MongoError } = require("mongodb")



module.exports = class MongoManager {

	/**
	 * Create's a connection to mongodb based on the default: url setting
	 * loads specified database
	 * @param {any} options
	 */
	constructor(options) {
		this.url = options.default.url;
		this.connect()
	}

	/**
	 * Internal function used to try a connection 
	 */
	async connect() {
		this.client = new MongoClient(this.url);
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