# 📄 Adobe Scan - Web & Document Scanner

A fast, professional, and full-featured document scanner web application styled after **Adobe Scan**. Built with React 19, TypeScript, Tailwind CSS, and an asynchronous Web Worker computer vision pipeline for silky-smooth 60 FPS performance.

---

## ✨ Features

- **📸 Adobe Camera Scanner**:
  - Real-time animated glowing document boundary frame.
  - Continuous multi-page capture mode (snap pages rapidly in sequence).
  - Live thumbnail stack counter with one-tap review.
  - Flash/Torch toggle, Camera flip, Grid overlay, and Document Mode selector (*Document*, *ID Card*, *Whiteboard*, *Book*).

- **📐 8-Point Boundary Crop & Perspective Rectification**:
  - 4 magnetic corner handles + 4 midpoint edge handles.
  - 2.5x circular loupe with red target crosshair for pixel-precise corner positioning.
  - Instant **Auto Detect** edge detection algorithm and **Full Page** toggle.

- **🎨 Adobe Scan Filter Suite**:
  - **Magic Color**: Stark clean white background division with rich stamp, signature, and marker preservation.
  - **Auto Color**: Balanced illumination normalization and shadow reduction.
  - **Whiteboard / Notes**: Enhanced ink contrast for handwritten notes and boards.
  - **Photocopy (B&W)**: Crisp 1-bit binary thresholding with Sauvola local adaptation.
  - **Grayscale** & **Original Photo**.

- **🖌️ Clean Up & Retouch Eraser**:
  - Paint over punch holes, stains, finger shadows, or redactions with variable brush radius (4px to 60px) and smart paper background inpainting.

- **📑 Multi-Page Filmstrip & Reorder Grid**:
  - Docked mini-filmstrip carousel for 1-tap switching across multiple pages.
  - Full-screen reorder grid with drag-and-drop, duplicate, rotate, and delete tools.

- **📏 Paper Size Standards**:
  - Standard document formats: **A4**, **US Letter**, **A5**, **US Legal**, **ID Card**, **Business Card**, and **Auto-Fit**.

- **⚡ Asynchronous Web Worker Architecture**:
  - Dedicated Web Worker (`cvWorker.ts`) offloads heavy homography warping, 2D convolution filters, and Sauvola thresholding off the UI thread.
  - Zero UI freezing or lag during slider adjustments.

- **📥 Export Options**:
  - Multi-page vectorized PDF export via `jsPDF`.
  - Individual high-res JPG/PNG downloads.
  - Direct print support and Web Share API.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/abhiraj444/adobe-scan-web.git

# Navigate to project directory
cd adobe-scan-web

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build for Production
```bash
npm run build
```

---

## 🛠️ Tech Stack
- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4
- **Computer Vision**: Custom deterministic CV pipeline (Inverse Homography, Canny edge detection, Sauvola adaptive binarization, Surface division illumination normalization)
- **Concurrency**: Web Worker async processing pool
- **PDF Engine**: `jspdf` + `pdfjs-dist`
- **Icons**: `lucide-react`

---

## 📄 License
MIT License
