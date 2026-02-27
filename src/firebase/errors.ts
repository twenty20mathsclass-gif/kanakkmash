'use client';

export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
  public readonly context: SecurityRuleContext;
  public readonly cause: any;

  constructor(context: SecurityRuleContext, options?: ErrorOptions) {
    const message = `Firestore Permission Denied: The request was denied by Firestore security rules. Context: ${JSON.stringify(
      context,
      null,
      2
    )}`;
    super(message, options);
    this.name = 'FirestorePermissionError';
    this.context = context;
    if (options?.cause) {
      this.cause = options.cause;
    }
  }
}
