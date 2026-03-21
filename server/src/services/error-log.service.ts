
class ErrorLogger {
  private lastErrors: any[] = [];
  private readonly MAX_ERRORS = 20;

  log(ctx: string, err: any) {
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

export const errorLogger = new ErrorLogger();
