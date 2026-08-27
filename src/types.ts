export interface Point {
  x: number;
  y: number;
}

export interface Quadrilateral {
  tl: Point;
  tr: Point;
  br: Point;
  bl: Point;
}

export type PresetMode = 
  | 'auto_color'
  | 'magic_color' 
  | 'notes' 
  | 'book' 
  | 'certificate' 
  | 'photocopy' 
  | 'receipt' 
  | 'color_doc' 
  | 'custom';

export type ColorMode = 'color' | 'grayscale' | 'binary' | 'vibrant_color';

export interface FilterSettings {
  brightness: number; // 0 to 200, default 100
  contrast: number; // 0 to 200, default 100
  sharpness: number; // 0 to 100, default 40
  backgroundWhitening: number; // 0 to 100, default 75 (shadow removal aggressiveness)
  noiseReduction: number; // 0 to 100, default 20 (despeckle)
  inkEnhancement: number; // 0 to 100, default 50 (deepen dark strokes)
  colorMode: ColorMode;
  threshold: number; // 0 to 255 for binary / photocopy
  sauvolaSensitivity: number; // 0 to 100
  qualityScale: number; // 0.5 to 1.0 (preview/export scale)
  rotation: number; // 0, 90, 180, 270
}

export interface CleanupStroke {
  id: string;
  points: Point[];
  radius: number;
  color?: string; // If undefined, dynamically sample document paper background
}

export type PaperSize = 'original' | 'a4' | 'letter' | 'a5' | 'legal' | 'id_card' | 'business_card';

export interface PageItem {
  id: string;
  name: string;
  originalImage: HTMLImageElement;
  originalDataUrl: string;
  originalWidth: number;
  originalHeight: number;
  corners: Quadrilateral;
  autoCorners: Quadrilateral;
  settings: FilterSettings;
  mode: PresetMode;
  cleanupStrokes?: CleanupStroke[];
  paperSize?: PaperSize;
  isPdfPage?: boolean;
  sourceType?: 'image' | 'pdf' | 'camera';
  processedCanvas?: HTMLCanvasElement;
  processedDataUrl?: string;
  thumbnailUrl?: string;
  status: 'idle' | 'processing' | 'ready' | 'error';
  errorMessage?: string;
}

export type ViewMode = 'split' | 'processed' | 'original' | 'corners';

export interface ExportOptions {
  format: 'pdf' | 'zip' | 'jpg' | 'png';
  pageSize: PaperSize;
  orientation: 'portrait' | 'landscape' | 'auto';
  dpi: 150 | 300 | 600;
  quality: number; // 0.5 to 1.0
  marginMm: number;
  fileName?: string;
}

export type AdobeTool = 
  | 'none'
  | 'add' 
  | 'reorder' 
  | 'crop' 
  | 'rotate' 
  | 'filters' 
  | 'cleanup' 
  | 'adjust' 
  | 'resize' 
  | 'delete';
