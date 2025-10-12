# JTF Team Management Portal

A comprehensive web application for managing theater/improv group data with React frontend and Google Apps Script backend.

## Prerequisites

1. **Node.js** (version 14 or higher)
2. **Google Account** with access to Google Drive and Google Apps Script
3. **VS Code** (recommended editor)

## Step-by-Step Setup

### 1. Install Node.js and npm

Download and install Node.js from [nodejs.org](https://nodejs.org/)

### 2. Install Google Apps Script CLI (clasp)

```bash
npm install -g @google/clasp
```

### 3. Enable Google Apps Script API

1. Visit [Google Apps Script API Console](https://script.google.com/home/usersettings)
2. Turn ON "Google Apps Script API"

### 4. Authenticate with Google

```bash
clasp login
```

This will open a browser window for Google authentication.

### 5. Set Up the Project

#### Option A: Create New Project

1. **Create a new Google Apps Script project:**
   ```bash
   clasp create --type webapp --title "JTF Team Management Portal"
   ```

2. **Update .clasp.json** with the returned script ID

#### Option B: Use Existing Project

1. **Get your script ID** from the Google Apps Script URL (after `/d/` and before `/edit`)
2. **Update .clasp.json:**
   ```json
   {
     "scriptId": "YOUR_SCRIPT_ID_HERE",
     "rootDir": "./",
     "fileExtension": "js",
     "filePushOrder": ["Code.gs"]
   }
   ```

### 6. Create Google Spreadsheet

1. Create a new Google Spreadsheet
2. Rename it to "JTF Team Management Database"
3. Note the spreadsheet ID from the URL
4. Make sure the Apps Script project has access to this spreadsheet

### 7. Deploy to Google Apps Script

```bash
# Push all files to Google Apps Script
clasp push

# Deploy as web app
clasp deploy --description "JTF Team Management Portal v1.0"
```

### 8. Configure Permissions

1. Open the Apps Script project: `clasp open`
2. Go to **Deploy > Test deployments**
3. Click **Install** and authorize all permissions
4. Set execution as "User accessing the web app"
5. Set access to "Anyone with Google account" or "Anyone"

### 9. Initialize Sample Data (Optional)

In the Apps Script editor, run the `initializeSpreadsheetWithSampleData()` function to create sample lookup data.

## Project Structure

```
jtf-team-management-portal/
├── index.html              # Main HTML file
├── index.tsx               # React entry point
├── App.tsx                 # Main App component
├── types.ts                # TypeScript type definitions
├── Code.gs                 # Google Apps Script backend
├── package.json            # npm configuration
├── .clasp.json            # clasp configuration
├── appsscript.json        # Apps Script manifest
├── components/            # React components
│   ├── common/           # Shared components
│   ├── personnel/        # Personnel-related components
│   ├── classes/          # Class-related components
│   ├── shows/            # Show-related components
│   ├── inventory/        # Inventory components
│   └── layout/           # Layout components
├── pages/                # Page components
│   ├── Dashboard.tsx
│   ├── PersonnelDirectory.tsx
│   ├── ClassRegistration.tsx
│   ├── Shows.tsx
│   ├── Inventory.tsx
│   └── Scheduling.tsx
└── services/             # API services
    └── googleAppsScript.ts
```

## Development Workflow

### Making Changes

1. **Edit files** in VS Code
2. **Push changes** to Google Apps Script:
   ```bash
   clasp push
   ```
3. **Test** your changes in the web app
4. **Deploy** new version when ready:
   ```bash
   clasp deploy --description "Description of changes"
   ```

### Local Development

The app includes mock data for local development. You can:

1. Open `index.html` in a browser for frontend-only testing
2. Use the browser's developer tools to inspect the UI