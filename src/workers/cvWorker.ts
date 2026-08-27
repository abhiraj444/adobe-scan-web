// Dedicated Web Worker for asynchronous image filtering and CV processing
import { FilterSettings, CleanupStroke } from '../types';
import { applyDocumentFilters } from '../lib/cv/filters';

export interface CVWorkerRequest {
  id: string;
  imgData: ImageData;
  settings: FilterSettings;
  cleanupStrokes?: CleanupStroke[];
}

export interface CVWorkerResponse {
  id: string;
  success: boolean;
  imgData?: ImageData;
  error?: string;
}

const ctx: Worker = self as any;

ctx.onmessage = (e: MessageEvent<CVWorkerRequest>) => {
  const { id, imgData, settings, cleanupStrokes } = e.data;
  try {
    const filtered = applyDocumentFilters(imgData, settings, cleanupStrokes);
    // Post back with transferable buffer for zero-copy high performance
    (ctx.postMessage as any)(
      {
        id,
        success: true,
        imgData: filtered,
      },
      [filtered.data.buffer]
    );
  } catch (err: any) {
    (ctx.postMessage as any)({
      id,
      success: false,
      error: err.message || 'Worker processing failed',
    });
  }
};
