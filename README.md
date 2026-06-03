# 💰 BudgetIQ 🚀  

**BudgetIQ** is a **comprehensive AI-powered personal finance advisor** that combines various intelligent features including **chatbot capabilities, financial analysis, and much more**. Built with a **modern tech stack**, it features a **React frontend** and a **Python Flask backend**.  

## 📽️ Demo

<video width="640" height="360" controls>
  <source src="demo.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

---

## 🌟 Features  

✅ **AI-powered reAct agent** 🤖 with **LLM integration**  
📊 **Financial analysis & path planning** 📈  
🗣️ **Speech processing capabilities** 🎙️  
📰 **News aggregation & display** 🌍  
🔐 **Secure Google & Metamask login** 🔑  
📊 **Clean visual dashboard** to summarize all your financial data 📉  
📂 **MyData tab** to update your financial information ✏️  
💡 **Recommendations tab** for the best investment options 💰  
📚 **Money Matters** – Learn about finance 🏦  
🛣️ **Financial Path** – Plan your financial journey visually 🗺️  
🧮 **Money Calculator** – Predict your future finances 📅  
🧠 **AI Agent** – Get real-time financial insights using web & APIs 🌐  
🚀 **Money Plus** – Real-time financial news updates 📰  

---  

## 🛠️ Tech Stack  

### 🎨 Frontend  
⚛️ **React (TypeScript)**  
🎨 **Tailwind CSS** for styling  
⚡ **Vite** as the build tool  
✅ **ESLint** for code quality  

### 🖥️ Backend  
🐍 **Python Flask**  
🧠 **Google's Gemini AI**  
🤖 **AI/ML libraries**  
☁️ **Cloud services integration**  

---  

## 📋 Prerequisites  

🖥️ **Node.js** (v16 or higher)  
🐍 **Python** (3.8+)  
📦 **npm** or **yarn**  
🔑 **Required API keys** (Gemini, Cloudinary, etc.)  

---  

## 🔧 Installation  

### 🖥️ Backend Setup  
1️⃣ Navigate to the backend directory:  
   ```bash
   cd backend
   ```  
2️⃣ Create and activate a virtual environment (recommended):  
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```  
3️⃣ Install Python dependencies:  
   ```bash
   pip install -r requirements.txt
   ```  
4️⃣ Set up **environment variables**:  
   - Create a `.env` file in the backend directory  
   - Add **necessary API keys and configurations**  

### 🎨 Frontend Setup  
1️⃣ Navigate to the frontend directory:  
   ```bash
   cd frontend
   ```  
2️⃣ Install dependencies:  
   ```bash
   npm install
   # or
   yarn install
   ```  
3️⃣ Set up **environment variables**:  
   - Create a `.env` file in the frontend directory  
   - Add necessary **configuration variables**  

---  

## 🚀 Running the Application  

### 🖥️ Backend  
1️⃣ From the backend directory:  
   ```bash
   python app.py
   ```  
   ✅ The backend server will start on **http://localhost:5000**  

### 🎨 Frontend  
1️⃣ From the frontend directory:  
   ```bash
   npm run dev
   # or
   yarn dev
   ```  
   ✅ The frontend development server will start on **http://localhost:5173**  

---  

## 🔑 Environment Variables  

### ⚙️ Backend (`.env`)  
🔹 **GEMINI_API_KEY**  
🔹 **CLOUDINARY_CLOUD_NAME**  
🔹 **CLOUDINARY_API_KEY**  
🔹 **CLOUDINARY_API_SECRET**  
🔹 **Other service-specific API keys**  

### ⚙️ Frontend (`.env`)  
🔹 **VITE_SERVER_URL**  
🔹 **Other frontend-specific configurations**  

---  

## 📁 Project Structure  

```
BudgetIQ/
├── backend/
│   ├── app.py              # Main Flask application
│   ├── agent.py            # AI agent implementation
│   ├── gemini_fin_path.py  # Financial analysis module
│   ├── scheduler.py        # Task scheduling
│   └── tools/              # Utility functions and tools
├── frontend/
│   ├── src/               # React source files
│   ├── public/            # Static assets
│   └── package.json       # Frontend dependencies
```

---  

 

---  

## 🙏 Acknowledgments  

- 🧠 **Google Gemini AI**  
- 🤖 **OpenAI**  
- 🔗 **Other libraries & services used** in the project  

---

