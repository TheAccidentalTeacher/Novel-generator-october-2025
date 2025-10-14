"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runInMongoTransaction = runInMongoTransaction;
const connection_1 = require("./connection");
const DEFAULT_TRANSACTION_OPTIONS = {
    readConcern: { level: 'snapshot' },
    writeConcern: { w: 'majority' },
};
async function runInMongoTransaction(work, options = DEFAULT_TRANSACTION_OPTIONS) {
    const mongoose = (0, connection_1.getMongooseInstance)();
    const session = await mongoose.startSession();
    try {
        let result;
        await session.withTransaction(async () => {
            result = await work(session);
        }, options);
        if (typeof result === 'undefined') {
            throw new Error('Mongo transaction completed without returning a result.');
        }
        return result;
    }
    finally {
        await session.endSession();
    }
}
