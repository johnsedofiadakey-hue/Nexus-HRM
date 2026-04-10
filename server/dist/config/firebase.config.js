"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBucket = void 0;
const admin = __importStar(require("firebase-admin"));
let isInitialized = false;
const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined;
const config = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
};
if (!admin.apps.length) {
    if (!config.projectId || !config.clientEmail || !config.privateKey) {
        console.warn('[Firebase] Warning: Firebase environment variables are missing. Cloud storage will be disabled.');
    }
    else {
        try {
            admin.initializeApp({
                credential: admin.credential.cert(config),
                storageBucket: `${config.projectId}.firebasestorage.app`,
            });
            isInitialized = true;
            console.log('[Firebase] Admin SDK Initialized Successfully');
        }
        catch (error) {
            console.error('[Firebase] Admin SDK Initialization Failed:', error);
        }
    }
}
else {
    isInitialized = true;
}
const getBucket = () => {
    if (!isInitialized) {
        console.error('[Firebase] Attempted to access bucket without initialization.');
        return null;
    }
    return admin.storage().bucket();
};
exports.getBucket = getBucket;
exports.default = admin;
