# Setup Guide

Follow these steps to set up and run the **Procurement & Co.** platform.

## 📋 Prerequisites

- **Node.js**: v18 or later (v20+ recommended)
- **Python**: v3.9 or later
- **MongoDB**: A running MongoDB instance (Local or Atlas)
- **Git**: For model installation and version control

---

## 🏗️ 1. Automatic Setup (Recommended)

We provide a script that automates the backend environment creation and launches both servers.

```bash
chmod +x start_app.sh
./start_app.sh
```

This script will:

1. Create a Python `venv`.
2. Install all backend dependencies.
3. Start the FastAPI backend on port `8000`.
4. Start the Vite development server on port `5173`.
5. Attempt to open the application in your default browser.

---

## 🔧 2. Manual Configuration

### A. Environment Variables

Create a file named `.env` in the `backend/` directory:

```text
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/procurement_db
MONGO_DB_NAME=procurement_db
```

### B. AI Model Weights

The platform requires specific weights for the vision models. Place them in the following locations:

1. **DocLayout-YOLO**:
   - **File**: `doclayout_yolo_docstructbench_imgsz1024.pt`
   - **Location**: `backend/`
   - **Download**: [Hugging Face Link](https://huggingface.co/juliozhao/DocLayout-YOLO-DocStructBench/resolve/main/doclayout_yolo_docstructbench_imgsz1024.pt)

2. **SAM (Segment Anything Model)**:
   - **File**: `sam_vit_h_4b8939.pth`
   - **Location**: `backend/services/room_analysis/`
   - **Download**: [Meta AI Link](https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth)

---

## ⌨️ 3. Manual Installation (Alternative)

If you prefer not to use the script, follow these manual steps:

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
npm install
npm run dev
```

---

## 🛠️ Troubleshooting

- **YOLO Load Error**: Ensure the `.pt` file is named exactly as expected and located in the `backend/` root.
- **SAM Load Error**: Check that the `.pth` file is in the `room_analysis` folder. If you move it, update the path in `backend/services/room_analysis/mask_generator.py`.
- **Database Connection**: Verify your `MONGO_URI` is correct and your IP is whitelisted in MongoDB Atlas.
- **Vite Port Conflict**: If port 5173 is in use, Vite will use the next available port (e.g., 5174). Check the terminal output for the correct URL.

---

## 📊 Useful Commands

- **Reset Database Connections**: Restart the backend server.
- **Clean Node Modules**: `rm -rf node_modules package-lock.json && npm install`
- **Reinstall Backend Deps**: `./venv/bin/pip install --force-reinstall -r backend/requirements.txt`
