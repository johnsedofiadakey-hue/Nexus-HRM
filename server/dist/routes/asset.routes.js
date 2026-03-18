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
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const assetController = __importStar(require("../controllers/asset.controller"));
const router = (0, express_1.Router)();
// Get Inventory (Admin/IT/Supervisor)
router.get('/', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeMinimumRole)('MID_MANAGER'), assetController.getInventory);
// Create Asset (Admin/MD)
router.post('/', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeMinimumRole)('MANAGER'), assetController.createAsset);
// Assign Asset (Admin/MD/Supervisor)
router.post('/assign', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeMinimumRole)('MID_MANAGER'), assetController.assignAsset);
// Return Asset (Admin/MD/Supervisor)
router.post('/return', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeMinimumRole)('MID_MANAGER'), assetController.returnAsset);
exports.default = router;
