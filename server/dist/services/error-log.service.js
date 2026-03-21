"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorLogger = void 0;
class ErrorLogger {
    constructor() {
        this.lastErrors = [];
        this.MAX_ERRORS = 20;
    }
    log(ctx, err) {
        const errorEntry = {
            timestamp: new Date().toISOString(),
            context: ctx,
            message: err.message || err,
            stack: err.stack,
            data: err.response?.data || err.data
        };
        this.lastErrors.unshift(errorEntry);
        if (this.lastErrors.length > this.MAX_ERRORS) {
            this.lastErrors.pop();
        }
        console.error(`[${ctx}]`, err);
    }
    getErrors() {
        return this.lastErrors;
    }
}
exports.errorLogger = new ErrorLogger();
