"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectToDatabase = connectToDatabase;
exports.getMongoConnection = getMongoConnection;
exports.getMongooseInstance = getMongooseInstance;
exports.disconnectFromDatabase = disconnectFromDatabase;
exports.isDatabaseConnected = isDatabaseConnected;
const mongoose_1 = __importDefault(require("mongoose"));
let connectionPromise;
async function connectToDatabase(uri, options = {}) {
    if (connectionPromise) {
        return connectionPromise;
    }
    connectionPromise = mongoose_1.default
        .connect(uri, {
        autoIndex: false,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 30_000,
        ...options,
    })
        .catch((error) => {
        connectionPromise = undefined;
        throw error;
    });
    return connectionPromise;
}
function getMongoConnection() {
    return mongoose_1.default.connection;
}
function getMongooseInstance() {
    return mongoose_1.default;
}
async function disconnectFromDatabase() {
    if (!connectionPromise) {
        return;
    }
    await mongoose_1.default.disconnect();
    connectionPromise = undefined;
}
function isDatabaseConnected() {
    return mongoose_1.default.connection.readyState === 1;
}
