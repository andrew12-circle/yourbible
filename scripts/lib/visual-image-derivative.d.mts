import type { OutputInfo } from 'sharp';
export function boundedVisualDerivative(bytes: Buffer | Uint8Array, options: { size: number; quality: number }, maxBytes?: number): Promise<{ data: Buffer; info: OutputInfo }>;
