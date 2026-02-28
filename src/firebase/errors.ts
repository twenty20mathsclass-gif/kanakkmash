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
    const contextString = JSON.stringify(context, null, 2);
    const causeString = options?.cause ? `\nCause: ${options.cause}` : '';
    
    const message = `Firestore Permission Denied: The request was denied by Firestore security rules. \nContext: ${contextString}${causeString}`;
    
    super(message, options);
    
    this.name = 'FirestorePermissionError';
    this.context = context;
    if (options?.cause) {
      this.cause = options.cause;
    }
    // This is required to correctly extend the built-in Error class.
    Object.setPrototypeOf(this, FirestorePermissionError.prototype);
  }
}
