'use client';

// This is needed for the browser environment
import { EventEmitter } from 'events';

export const errorEmitter = new EventEmitter();
