"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = __importDefault(require("./prisma/client"));
async function main() {
    const settings = await client_1.default.systemSettings.findMany();
    console.log('--- ALL SYSTEM SETTINGS ---');
    console.log(JSON.stringify(settings, null, 2));
}
main().catch(console.error).finally(() => client_1.default.$disconnect());
