# Smart Waste Management System

A full-stack project for managing waste bins, schedules, and issue reports in a smart city environment.

---

## Table of Contents
- [Features](#features)
- [Installation & Setup](#installation--setup)
- [Running the Project](#running-the-project)
- [Frontend Code Overview](#frontend-code-overview)
- [Frontend Screenshot](#frontend-screenshot)
- [Backend SQL Schema & Queries](#backend-sql-schema--queries)

---

## Features
- User authentication (citizen, collector, admin)
- Bin management and monitoring
- Scheduling waste collection
- Reporting and tracking issues
- Admin dashboard and analytics

---

## Installation & Setup

### Prerequisites
- Node.js (v18+ recommended)
- MySQL Server

### 1. Clone the repository
```bash
# Clone the project
https://github.com/your-username/smart-waste-management.git
cd smart-waste-management
```

### 2. Setup the Database
- Open MySQL and run the SQL script in `database/schema.sql` to create all tables and sample data:
```sql
-- In MySQL CLI or a tool like phpMyAdmin:
SOURCE /path/to/database/schema.sql;
```

- Update `backend/.env` with your MySQL credentials if needed.

### 3. Install Backend Dependencies
```bash
cd backend
npm install
```

### 4. Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

---

## Running the Project

### Start the Backend
```bash
cd backend
npm start
```

### Start the Frontend
```bash
cd frontend
npm start
```

- The backend runs on [http://localhost:5000](http://localhost:5000)
- The frontend runs on [http://localhost:3000](http://localhost:3000)

---

## Frontend Code Overview

  - `Dashboard.jsx` — Admin dashboard
  - `Bins.jsx` — Bin management
  - `Reports.jsx` — Issue reporting and tracking
  - `Schedules.jsx` — Collection schedules
  - `Login.jsx`, `Register.jsx`, `Profile.jsx` — Auth and user profile
## Frontend Screenshot

<img src="https://github.com/Mohnish27-dev/SmartWasteManagementSystem/blob/main/assets/Screenshot%20(173).png" height="800" width="400" alt="Homepage">
<img src="https://github.com/Mohnish27-dev/SmartWasteManagementSystem/blob/main/assets/Screenshot%20(174).png" height="800" width="400" alt="Homepage">
<img src="https://github.com/Mohnish27-dev/SmartWasteManagementSystem/blob/main/assets/Screenshot%20(175).png" height="800" width="400" alt="Homepage">
<img src="https://github.com/Mohnish27-dev/SmartWasteManagementSystem/blob/main/assets/Screenshot%20(176).png" height="800" width="400" alt="Homepage">
<img src="https://github.com/Mohnish27-dev/SmartWasteManagementSystem/blob/main/assets/Screenshot%20(177).png" height="800" width="400" alt="Homepage">


---


## Backend SQL Schema & Queries


### Main Tables

```sql
-- Users

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,

  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,

  password VARCHAR(255) NOT NULL,

  address TEXT,
  role ENUM('citizen', 'collector', 'admin') DEFAULT 'citizen',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Bins
CREATE TABLE IF NOT EXISTS bins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  location VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  type ENUM('general', 'recyclable', 'organic', 'hazardous') DEFAULT 'general',
  capacity INT DEFAULT 100,
  fill_level INT DEFAULT 0,
  status ENUM('active', 'inactive', 'maintenance') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Schedules
CREATE TABLE IF NOT EXISTS schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bin_id INT NOT NULL,
  collector_id INT,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME DEFAULT '09:00:00',
  status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
  route TEXT,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Reports
CREATE TABLE IF NOT EXISTS reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bin_id INT NOT NULL,
  user_id INT NOT NULL,
  issue_type ENUM('overflow', 'damage', 'missing', 'odor', 'other') NOT NULL,
  description TEXT NOT NULL,
  priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
  status ENUM('pending', 'in_progress', 'resolved', 'rejected') DEFAULT 'pending',
  resolution_notes TEXT,
  resolved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('info', 'warning', 'alert', 'success') DEFAULT 'info',
  related_entity_type VARCHAR(50),
  related_entity_id INT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Sample Queries
```sql
-- Get all bins
SELECT * FROM bins;

-- Get all reports for a bin
SELECT * FROM reports WHERE bin_id = 1;

-- Get all schedules for a collector
SELECT * FROM schedules WHERE collector_id = 2;

-- Get all notifications for a user
SELECT * FROM notifications WHERE user_id = 1;
```

---


