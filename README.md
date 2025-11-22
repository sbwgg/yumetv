# Yume TV Streaming Platform Deployment Guide

This document provides a comprehensive, step-by-step guide to deploying the Yume TV Angular application on a fresh Ubuntu 24 server. The setup includes configuring the Nginx web server to handle both the main user-facing site and a separate admin panel domain, securing it with SSL, and performing the initial application setup.

## 1. Application Architecture

The application is a modern Angular Single Page Application (SPA). It uses domain-based routing to serve two different experiences from the same codebase:
-   **Main Site (e.g., `yume.tv`)**: The public-facing streaming website where users can browse and watch content.
-   **Admin Panel (e.g., `panel.yume.tv`)**: A comprehensive dashboard for administrators to manage users, content, and site settings.

---

## 2. Production Configuration (CRITICAL)

For security and functionality, critical configuration is managed through a runtime configuration file. Before deploying, you **must** create an `env.js` file in the project's root directory (the same directory as `index.html`).

This file provides your admin credentials and email API key to the application **without** exposing them in the main source code.

### Step 2.1: Create the `env.js` File

In your project root, create a new file named `env.js`.

### Step 2.2: Add Configuration

Copy and paste the following content into your new `env.js` file. **You must fill in the placeholder values.**

```javascript
// /env.js

// This file provides runtime configuration to the Yume TV application.
// Fill in the values below for your production environment.
// IMPORTANT: DO NOT commit this file to a public repository.

window.YUME_TV_CONFIG = {
  // Credentials for the site administrator.
  // This account is separate from the user database for enhanced security.
  ADMIN_USER: "your_admin_username",
  ADMIN_PASSWORD: "your_strong_admin_password",

  // API Key for the Resend email service (https://resend.com)
  // This is REQUIRED for sending user verification emails.
  RESEND_API_KEY: "re_xxxxxxxxxxxxxxxxxxxx",

  // The "From" email address for sending verification emails.
  // This MUST be an address verified with your Resend account.
  RESEND_FROM_EMAIL: "noreply@yourdomain.com"
};
```

---

## 3. Server & Deployment Prerequisites

-   **Ubuntu 24 Server**: A clean installation of Ubuntu 24.
-   **Sudo Access**: A user account with `sudo` privileges.
-   **Two Domain Names**:
    *   One for the main site (e.g., `yume.tv`).
    *   One for the admin panel (e.g., `panel.yume.tv`).
-   **DNS Configuration**: Both domains (or subdomains) must have **A records** pointing to your server's public IP address.

---

## 4. Step-by-Step Deployment

### Step 4.1: Server Preparation

First, connect to your server via SSH and prepare it by installing all necessary dependencies.

**1. Update System Packages**
```bash
sudo apt update && sudo apt upgrade -y
```

**2. Install Nginx, Git, and cURL**
```bash
sudo apt install nginx git curl -y
```

**3. Install Node.js and npm via NVM**
Node Version Manager (nvm) is the recommended way to install and manage Node.js versions.
```bash
# Download and run the nvm installation script
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Load nvm into your current shell session
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install the latest Long-Term Support (LTS) version of Node.js
nvm install --lts
```

### Step 4.2: Get Application Code on the Server

Choose one of the following methods to transfer your application files to the server.

#### Method A: Using Git (Recommended)
This is the best method if your code is hosted in a Git repository.

```bash
# Clone the project into the standard web directory
sudo git clone <your-repository-url> /var/www/yume-tv
```

#### Method B: Using SCP/Rsync (For Local Files)
Use this method if your project files are on your local machine. From your **local terminal**, run:
```bash
# Ensure you exclude node_modules. Include your env.js file.
rsync -avz --exclude 'node_modules' /path/to/your/local/project/ your_user@your_server_ip:/tmp/yume-tv-upload

# Then, on the server, move the files to the correct location
ssh your_user@your_server_ip
sudo mv /tmp/yume-tv-upload /var/www/yume-tv
```

### Step 4.3: Build the Application

Now, we will install the project's dependencies and build it for production.

**1. Navigate to Project Directory**
```bash
cd /var/www/yume-tv
```

**2. Install Dependencies**
```bash
npm install
```

**3. Build for Production**
This command compiles the Angular app into static files located in the `dist/` directory.
```bash
npm run build
```

**4. Copy Configuration File**
The `env.js` file needs to be in the final `dist` directory to be served.
```bash
# Copy your env.js from the project root into the dist folder
sudo cp /var/www/yume-tv/env.js /var/www/yume-tv/dist/env.js
```

**5. Set Permissions**
Ensure the Nginx web server user (`www-data`) can read the application files.
```bash
sudo chown -R www-data:www-data /var/www/yume-tv
```

### Step 4.4: Configure Nginx

This configuration will serve your application on both of your domains.

**1. Create Nginx Configuration File**
```bash
sudo nano /etc/nginx/sites-available/yume-tv
```

**2. Add the Server Configuration**
Copy and paste the following, **replacing `yume.tv` and `panel.yume.tv` with your actual domain names.**

```nginx
server {
    listen 80;
    listen [::]:80;

    # Replace with your main site and admin panel domains
    server_name yume.tv panel.yume.tv;

    # Path to the built Angular application
    root /var/www/yume-tv/dist;
    index index.html;

    location / {
        # This rule is essential for Single Page Applications.
        # It ensures that all navigation requests are handled by Angular's router.
        try_files $uri $uri/ /index.html;
    }
}
```
Save the file and exit (`CTRL + X`, `Y`, `Enter`).

**3. Enable the Site**
```bash
sudo ln -s /etc/nginx/sites-available/yume-tv /etc/nginx/sites-enabled/
```

**4. Test and Restart Nginx**
```bash
sudo nginx -t
sudo systemctl restart nginx
```

### Step 4.5: Configure Firewall

Allow public web traffic through the server's firewall.

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### Step 4.6: Secure with SSL (Let's Encrypt)

Serve your site over HTTPS using free SSL certificates from Let's Encrypt.

**1. Install Certbot**
```bash
sudo apt install certbot python3-certbot-nginx -y
```

**2. Obtain SSL Certificates**
This command automatically detects your domains, obtains certificates, and updates Nginx.
```bash
# Replace with your actual domains
sudo certbot --nginx -d yume.tv -d panel.yume.tv
```
When prompted, choose to redirect all HTTP traffic to HTTPS. Certbot will also set up automatic renewal.

---

## 5. Post-Deployment: Initial Setup

1.  **Log in as Administrator**: Navigate to your admin panel domain (e.g., `https://panel.yume.tv/login`) and log in using the `ADMIN_USER` and `ADMIN_PASSWORD` you defined in `env.js`. Use the **"Content Management"** tab to add media.
2.  **User Registration**: Regular users can register on the main site (e.g., `https://yume.tv`). They will receive a verification email from Resend to activate their account.

---

## 6. Production Data Persistence

This application has been architected to provide a persistent, database-like experience that works across all browsers and sessions, a feature essential for a production environment.

### Current Strategy: Simulated Cloud Database

-   To achieve data persistence without a traditional backend, the application uses a **centralized cloud JSON store** (`jsonstorage.net`) as its database.
-   A new central `DatabaseService` manages all application data (users, media, posts, settings). It fetches the entire state when the app loads and saves it back whenever changes are made.
-   This approach ensures that any data created or modified by a user in one browser is immediately available on any other browser or device that accesses the application.

### **IMPORTANT: Production Security Warning**

The current implementation uses a **public, anonymous JSON store**. This is an excellent solution for demonstration and prototyping, as it perfectly simulates a real database. However, it is **NOT secure for a real production application that handles sensitive user data** because the database URL is publicly accessible in the frontend code.

### Path to a Real Backend

For a true production deployment, you should replace the simulated database with a secure backend API. The application's service-based architecture is designed to make this transition straightforward.

**Migration Steps:**

1.  **Build a Secure Backend API**: Create a server application (e.g., using Node.js/Express, Python/Django) with a private database (e.g., PostgreSQL, MongoDB). This API must have secure, authenticated endpoints for all data operations (e.g., `POST /api/users`, `GET /api/media`).
2.  **Replace `DatabaseService` Logic**: Modify the `DatabaseService` to communicate with your new secure API instead of the public JSON store.
3.  **Example: Updating `DatabaseService` `loadState` method**:
    ```typescript
    // Before (current implementation)
    private loadState(): void {
        this.http.get<AppState>(this.PUBLIC_DB_URL).subscribe(...);
    }

    // After (with a real backend)
    private loadState(): void {
        // Assume you have endpoints for each data type
        forkJoin({
            users: this.http.get<User[]>('/api/users'),
            media: this.http.get<Media[]>('/api/media'),
            // ... other data types
        }).subscribe(initialState => {
            this.state.set(initialState);
        });
    }
    ```
4.  Update the save logic to call specific, authenticated API endpoints (e.g., `this.http.post('/api/media', newMediaItem)`).

This phased approach allows you to scale your application's backend capabilities without requiring a complete rewrite of the frontend logic.