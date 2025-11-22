# Yume TV Streaming Platform Deployment Guide

This document provides a comprehensive, step-by-step guide to deploying the Yume TV Angular application on a fresh Ubuntu 24 server. The setup includes configuring the Nginx web server to handle both the main user-facing site and a separate admin panel domain, securing it with SSL, and performing the initial application setup.

## 1. Application Architecture

The application is a modern Angular Single Page Application (SPA). It uses domain-based routing to serve two different experiences from the same codebase:
-   **Main Site (e.g., `yume.tv`)**: The public-facing streaming website where users can browse and watch content.
-   **Admin Panel (e.g., `panel.yume.tv`)**: A comprehensive dashboard for administrators to manage users, content, and site settings.

---

## 2. Server & Deployment Prerequisites

-   **Ubuntu 24 Server**: A clean installation of Ubuntu 24.
-   **Sudo Access**: A user account with `sudo` privileges.
-   **Two Domain Names**:
    *   One for the main site (e.g., `yume.tv`).
    *   One for the admin panel (e.g., `panel.yume.tv`).
-   **DNS Configuration**: Both domains (or subdomains) must have **A records** pointing to your server's public IP address.

---

## 3. Step-by-Step Deployment

### Step 3.1: Server Preparation

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

### Step 3.2: Get Application Code on the Server

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
# Ensure you exclude the node_modules directory to save time
rsync -avz --exclude 'node_modules' /path/to/your/local/project/ your_user@your_server_ip:/tmp/yume-tv-upload

# Then, on the server, move the files to the correct location
ssh your_user@your_server_ip
sudo mv /tmp/yume-tv-upload /var/www/yume-tv
```

### Step 3.3: Build the Application

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

**4. Set Permissions**
Ensure the Nginx web server user (`www-data`) can read the application files.
```bash
sudo chown -R www-data:www-data /var/www/yume-tv
```

### Step 3.4: Configure Nginx

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

### Step 3.5: Configure Firewall

Allow public web traffic through the server's firewall.

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### Step 3.6: Secure with SSL (Let's Encrypt)

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

## 4. Post-Deployment: Initial Application Setup

After deployment, the database (simulated via `localStorage`) is empty. Follow these steps to set up your site.

### Step 4.1: Create the Admin Account

The application is designed so that the **very first user to register automatically becomes an administrator.**

1.  Navigate to your main site (e.g., `https://yume.tv`).
2.  Click the **"Login"** button, then **"Register here"**.
3.  Complete the registration form. You will see a success message indicating you have been granted admin privileges.

### Step 4.2: Add Content

1.  Navigate to your admin panel domain (e.g., `https://panel.yume.tv`).
2.  Log in with the admin account you just created.
3.  You will be redirected to the Admin Panel. Use the **"Content Management"** tab to start adding movies and TV shows to your platform.

---

## 5. Managing the Application

### Updating the Application
To deploy updates to your code:
1.  Connect to your server via SSH.
2.  Navigate to the project directory: `cd /var/www/yume-tv`.
3.  Pull the latest changes: `sudo git pull origin main` (or your branch name).
4.  Install any new dependencies: `npm install`.
5.  Re-build the application: `npm run build`.
6.  Ensure permissions are correct: `sudo chown -R www-data:www-data /var/www/yume-tv`.

Nginx will automatically serve the new files from the `dist/` directory.

### File Locations
-   **Application Source Code**: `/var/www/yume-tv`
-   **Live Static Files (Web Root)**: `/var/www/yume-tv/dist`
-   **Nginx Configuration**: `/etc/nginx/sites-available/yume-tv`
