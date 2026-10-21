import { FilterSettings, CleanupStroke } from '../../types';
import { applyDocumentFilters } from './filters';

interface PendingJob {
  resolve: (data: ImageData) => void;
  reject: (err: any) => void;
  timeoutId: any;
}

class CVWorkerPool {
  private worker: Worker | null = null;
  private pendingJobs = new Map<string, PendingJob>();
  private isAvailable = false;
  private jobCounter = 0;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      this.isAvailable = false;
      return;
    }

    try {
      this.worker = new Worker(
        new URL('../../workers/cvWorker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (e: MessageEvent) => {
        const { id, success, imgData, error } = e.data;
        const job = this.pendingJobs.get(id);
        if (!job) return;

        clearTimeout(job.timeoutId);
        this.pendingJobs.delete(id);

        if (success && imgData) {
          job.resolve(imgData);
        } else {
          job.reject(new Error(error || 'Worker error'));
        }
      };

      this.worker.onerror = (err) => {
        console.warn('CV Worker error, falling back to main thread', err);
        this.isAvailable = false;
      };

      this.isAvailable = true;
    } catch (e) {
      console.warn('Web Worker creation failed, using main thread fallback', e);
      this.isAvailable = false;
    }
  }

  public async processImage(
    imgData: ImageData,
    settings: FilterSettings,
    cleanupStrokes?: CleanupStroke[]
  ): Promise<ImageData> {
    if (!this.isAvailable || !this.worker) {
      // Main-thread synchronous execution fallback
      return applyDocumentFilters(imgData, settings, cleanupStrokes);
    }

    const id = `job_${Date.now()}_${++this.jobCounter}`;

    return new Promise<ImageData>((resolve, reject) => {
      // 2-second timeout watchdog so UI never hangs if worker is busy
      const timeoutId = setTimeout(() => {
        if (this.pendingJobs.has(id)) {
          this.pendingJobs.delete(id);
          try {
            const fallback = applyDocumentFilters(imgData, settings, cleanupStrokes);
            resolve(fallback);
          } catch (err) {
            reject(err);
          }
        }
      }, 2000);

      this.pendingJobs.set(id, { resolve, reject, timeoutId });

      try {
        const copyData = new ImageData(
          new Uint8ClampedArray(imgData.data),
          imgData.width,
          imgData.height
        );

        this.worker!.postMessage(
          {
            id,
            imgData: copyData,
            settings,
            cleanupStrokes,
          },
          [copyData.data.buffer]
        );
      } catch (err) {
        clearTimeout(timeoutId);
        this.pendingJobs.delete(id);
        // Fallback to main thread
        try {
          const res = applyDocumentFilters(imgData, settings, cleanupStrokes);
          resolve(res);
        } catch (fbErr) {
          reject(fbErr);
        }
      }
    });
  }
}

export const cvWorkerPool = new CVWorkerPool();
