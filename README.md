# Procurement & Co.

**Procurement & Co.** is an AI-powered budget management and architectural document processing platform. It automates the extraction of floorplan diagrams from PDFs, performs advanced room analysis using computer vision models, and synchronizes extracted data directly into professional budget registries.

![AI Processing](https://img.shields.io/badge/AI-YOLOv10%20%2B%20SAM-blue)
![Database](https://img.shields.io/badge/Database-MongoDB-green)
![Tech Stack](https://img.shields.io/badge/Stack-React%20%2B%20FastAPI-orange)

## 🚀 Key Features

- **Automated Floorplan Extraction**: Uses **DocLayout-YOLO** to intelligently identify and extract architectural diagrams from complex multi-page PDF documents.
- **Deep Room Analysis**: Leverages the **Segment Anything Model (SAM)** and YOLO to automatically segment rooms, identify objects, and generate high-fidelity masks.
- **Interactive Mask Editor**: A powerful Konva-based interface for manually adjusting, refinement, or creating new masks and polygons directly on extracted diagrams.
- **Dynamic Budget Generation**: Automatically generates preliminary budget items based on extracted room data, linking physical objects in diagrams to line items in the budget.
- **Project-Centric Organization**: Efficiently manage multiple projects, each with their own source documents, analyzed rooms, and financial registries.
- **Modern UI/UX**: Built with React 19 and Tailwind CSS v4 for a smooth, high-performance, and responsive user experience.

## 🛠️ Technology Stack

### Backend

- **Framework**: FastAPI (Python 3.9+)
- **Database**: MongoDB (via Motor async driver)
- **Computer Vision**:
  - **DocLayout-YOLO**: Page layout analysis and diagram detection.
  - **SAM (Segment Anything Model)**: High-precision mask generation.
  - **OpenCV & PyMuPDF**: Image processing and PDF rendering.

### Frontend

- **Framework**: React 19 (Vite)
- **State Management**: Redux Toolkit
- **Canvas/Graphics**: React-Konva
- **Styling**: Tailwind CSS v4
- **API Client**: Axios

## 📂 Project Structure

```text
├── backend/                # FastAPI Application
│   ├── routes/             # API Endpoints (Projects, PDF, Budget, Rooms)
│   ├── services/           # Computer Vision & Business Logic
│   ├── schemas/            # Pydantic (MongoDB) Models
│   ├── models/             # Legacy/Migration Helpers
│   ├── uploads/            # Temporary PDF Storage
│   └── local_file_db/      # Processed assets & analysis JSONs
├── src/                    # React Frontend
│   ├── components/         # Reusable UI Shared Components
│   ├── pages/              # Main Application Pages (Editor, Dashboard)
│   ├── redux/              # Global State Store
│   └── assets/             # Frontend Assets
└── start_app.sh           # Main execution script
```

## 🚥 Quick Start

1. **Prerequisites**: Ensure you have Node.js, Python 3.9+, and a MongoDB instance running.
2. **Environment**: Create a `.env` file in the `backend/` directory (see `SETUP.md` for details).
3. **Run Everything**:
   ```bash
   ./start_app.sh
   ```
   _This script will set up your Python virtual environment, install all dependencies, and launch both the frontend and backend servers._

## 📄 Documentation

For detailed installation steps, model weight locations, and environment configuration, please refer to:
👉 **[SETUP.md](./SETUP.md)**

## ⚖️ License

All rights reserved. Property of Procurement & Co.
