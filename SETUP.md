# BudgetIQ - Complete Setup Guide

## 🎯 Project Overview
BudgetIQ is an AI-powered financial management platform focused on Indian markets. It features JWT-based authentication, a React frontend, and a Flask backend with PostgreSQL database.

## ✅ What's Fixed
- **Authentication Flow**: JWT tokens properly implemented with secure logout
- **Sign In/Sign Up**: Fully functional with password hashing and validation
- **Portfolio Page**: Protected routes ensure only authenticated users can access
- **Token Management**: Automatic cleanup on logout and token expiry
- **Backend Routes**: Duplicate endpoints removed, consistent API structure

---

## 🚀 Prerequisites

### Backend Requirements
- Python 3.8+
- PostgreSQL database
- pip (Python package manager)

### Frontend Requirements  
- Node.js 16+ and npm/yarn
- Modern web browser

---

## 📋 Backend Setup

### 1. Install Python Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Create a `.env` file in the `backend` directory:

```env
# Database Configuration (PostgreSQL)
DATABASE_URL=postgresql://username:password@localhost:5432/budgetiq

# Security
SECRET_KEY=your-super-secret-key-change-this-in-production

# Google Generative AI (Optional - for AI features)
GEMINI_API_KEY=your_gemini_api_key_here

# Cloudinary (Optional - for file uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 3. Create PostgreSQL Database
```bash
# Using psql or PostgreSQL admin tool
CREATE DATABASE budgetiq;
```

### 4. Initialize Database
The database will initialize automatically when you run the Flask app for the first time.

### 5. Run Flask Server
```bash
python app.py
```

The backend will start on `http://localhost:5000`

---

## 🎨 Frontend Setup

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the `frontend` directory:

```env
VITE_SERVER_URL=http://127.0.0.1:5000
VITE_GNEWS_API_KEY=your_gnews_api_key_here
```

### 3. Run Development Server
```bash
npm run dev
```

The frontend will start on `http://localhost:5173`

### 4. Build for Production
```bash
npm run build
```

---

## 🔐 Authentication Flow

### Sign Up
1. User navigates to `/sign-up`
2. Fills in name, email, and password (minimum 6 characters)
3. Backend hashes password using bcrypt
4. User record created in PostgreSQL
5. JWT token automatically generated and stored in localStorage
6. User redirected to `/portfolio`

### Sign In
1. User navigates to `/sign-in`
2. Enters email and password
3. Backend verifies password against hash
4. JWT token generated
5. Token stored in localStorage
6. User redirected to `/portfolio`

### Protected Routes
- All `/portfolio/*` routes require valid JWT token
- Token sent in Authorization header: `Bearer <token>`
- Token expires in 7 days
- Expired tokens are automatically cleared on 401 response

### Logout
1. User clicks Logout button
2. Token cleared from localStorage
3. User redirected to home page
4. All protected routes redirect to sign-in

---

## 🛣️ API Endpoints

### Authentication
- `POST /auth/signup` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/logout` - Logout user
- `GET /auth/me` - Get current user (requires auth)

### Portfolio Data
- `GET /user/data` - Get complete portfolio data (requires auth)
- `GET /portfolio` - Get portfolio summary (requires auth)
- `GET /portfolio/monthly` - Get monthly data (requires auth)
- `GET /portfolio/assets` - Get asset allocation (requires auth)

### User Data
- `GET /income` - Get income streams
- `POST /income` - Update income streams
- `GET /expenses` - Get expenses
- `POST /expenses` - Update expenses
- `GET /goals` - Get investment goals
- `POST /goals` - Update goals
- `GET /liabilities` - Get liabilities
- `POST /liabilities` - Update liabilities

---

## 🧪 Testing the Application

### Test Sign Up Flow
1. Go to http://localhost:5173/sign-up
2. Fill in: Name, Email, Password (6+ chars)
3. Click "Sign Up"
4. Should redirect to `/portfolio`

### Test Sign In Flow
1. Go to http://localhost:5173/sign-in
2. Enter email and password from previous signup
3. Click "Sign In"
4. Should redirect to `/portfolio`

### Test Portfolio Page
1. Make sure you're logged in
2. Visit http://localhost:5173/portfolio
3. Should display portfolio dashboard with mock data
4. Click "Take a Tour" to see the dashboard guide

### Test Logout
1. Click "Logout" button in navbar
2. Should redirect to home page
3. Try visiting `/portfolio` - should redirect to `/sign-in`

---

## 🐛 Troubleshooting

### Backend Issues

**"Failed to connect to database"**
- Check DATABASE_URL is correct
- Ensure PostgreSQL is running
- Verify database exists

**"Secret key is not set"**
- Create `.env` file with SECRET_KEY
- Restart Flask server

**"Port 5000 already in use"**
- Kill existing process: `lsof -ti:5000 | xargs kill -9` (Mac/Linux)
- Or change port: `flask run --port 5001`

### Frontend Issues

**"Cannot GET /user/data" or 401 errors**
- Ensure backend is running on localhost:5000
- Check that token is stored in localStorage
- Open DevTools > Application > Local Storage to verify

**"CORS errors"**
- Backend has CORS enabled for all origins
- Check browser console for specific error
- Ensure Authorization header is being sent

**"Page shows loading spinner forever"**
- Check Network tab in DevTools
- Verify backend API calls are succeeding
- Check console for JavaScript errors

---

## 📱 Key Features

### Dashboard
- Portfolio overview with total wealth
- Asset allocation pie chart
- Monthly performance data
- Recent activity feed
- Risk metrics and health score

### Authentication
- Secure password hashing with bcrypt
- JWT token-based auth
- Automatic token refresh on valid session
- Protected routes with automatic redirect

### Portfolio Management
- View assets, liabilities, goals
- Track income streams and expenses
- Monitor investment progress
- Rebalance portfolio

### Learning Resources
- Educational content on Indian markets
- Market analysis tools
- Financial literacy guides

---

## 📚 Database Schema

### Users Table
```
- id (Serial Primary Key)
- email (VARCHAR, UNIQUE)
- password_hash (VARCHAR)
- name (VARCHAR)
- google_id (VARCHAR, Optional)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Portfolio Data Table
```
- id (Serial Primary Key)
- user_id (Foreign Key → users)
- portfolio (JSONB)
- monthly_data (JSONB)
- asset_allocation (JSONB)
- income_streams (JSONB)
- expense_categories (JSONB)
- investment_goals (JSONB)
- liabilities (JSONB)
- risk_tolerance (VARCHAR)
- last_updated (TIMESTAMP)
```

---

## 🚢 Deployment

### Frontend (Vercel)
1. Push code to GitHub
2. Import the repo in Vercel
3. Set the project root to `frontend` if required
4. Configure `VITE_SERVER_URL` with your backend URL
5. Deploy

### Backend (Render/Railway/Heroku)
1. Use the root `Procfile` (`web: gunicorn wsgi:app`)
2. Use the root `requirements.txt`
3. Set `DATABASE_URL`, `SECRET_KEY`, and any optional API keys
4. Deploy

---

## 🔑 Environment Variables Checklist

**Backend (.env)**
- [ ] DATABASE_URL
- [ ] SECRET_KEY
- [ ] GEMINI_API_KEY (Optional)
- [ ] CLOUDINARY credentials (Optional)

**Frontend (.env.local)**
- [ ] VITE_SERVER_URL
- [ ] VITE_GNEWS_API_KEY (Optional)

---

## 📞 Support

For issues or questions:
1. Check the Troubleshooting section
2. Review API endpoint documentation
3. Check browser DevTools > Console for errors
4. Verify all environment variables are set

---

## 📝 Notes

- All passwords are hashed using bcrypt
- JWT tokens expire in 7 days
- API uses JSON request/response format
- CORS is enabled for development (restrict in production)
- SQLAlchemy ORM for database operations
- Framer Motion for UI animations

---

**Happy budgeting! 🎉**
