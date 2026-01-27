# Solar Site Survey Form - iOS PWA Setup Guide

A Progressive Web App (PWA) for conducting solar site surveys on iPhone and iPad devices.

## 🚀 Quick Setup

### Step 1: Generate Icons and Splash Screens

Before deploying, you need to generate the required icon and splash screen files:

1. **Generate Icons:**
   - Open `generate-icons.html` in your web browser
   - Click "Download All Icons"
   - Move the downloaded icon files to the project root directory

2. **Generate Splash Screens:**
   - Open `generate-splash-screens.html` in your web browser
   - Click "Download All Splash Screens"
   - Move the downloaded splash screen files to the project root directory

**Alternative (Node.js):** If you have Node.js installed:
```bash
npm install canvas
node generate-icons.js
```

### Step 2: Deploy to HTTPS Hosting

**⚠️ Important:** iOS requires HTTPS for PWA installation (except localhost during development).

#### Option A: Netlify (Recommended - Free & Easy)

1. Go to [netlify.com](https://netlify.com) and sign up (free)
2. Drag and drop your project folder onto Netlify's deploy area
3. Your app will be live at `https://your-app-name.netlify.app`
4. Share this URL with users

#### Option B: Vercel (Free & Fast)

1. Go to [vercel.com](https://vercel.com) and sign up (free)
2. Install Vercel CLI: `npm i -g vercel`
3. In your project folder, run: `vercel`
4. Follow the prompts to deploy
5. Your app will be live at `https://your-app-name.vercel.app`

#### Option C: GitHub Pages (Free)

1. Create a new GitHub repository
2. Upload all project files
3. Go to Settings → Pages
4. Select your branch and save
5. Your app will be live at `https://your-username.github.io/repo-name`

#### Option D: Your Own Web Server

1. Upload all files to your web server via FTP/SFTP
2. Ensure HTTPS is enabled (Let's Encrypt is free)
3. Access via your domain name

### Step 3: Install on iPhone/iPad

1. **Open Safari** on your iPhone/iPad (Chrome won't work for PWA installation)
2. **Navigate** to your deployed app URL (must be HTTPS)
3. **Tap the Share button** (square with arrow pointing up)
4. **Scroll down** and tap **"Add to Home Screen"**
5. **Customize the name** if desired (default: "Solar Survey")
6. **Tap "Add"** in the top right
7. The app icon will appear on your home screen!

## 📱 Local Development (Testing)

### Option 1: Local Network Server

1. **Start the server on your Windows computer:**
   - Double-click `start-server.bat`
   - Note the IP address shown (or run `ipconfig` in Command Prompt)

2. **On your iPhone:**
   - Make sure iPhone is on the same Wi-Fi network
   - Open Safari browser
   - Go to: `http://YOUR_COMPUTER_IP:8000`
     - Example: `http://192.168.1.100:8000`

3. **Install as App (PWA):**
   - Tap the Share button (square with arrow)
   - Scroll down and tap "Add to Home Screen"
   - The form will now work like a native app!

**Note:** Local HTTP works for testing, but production requires HTTPS for full PWA features.

## ✨ Features

- ✅ **Full iOS PWA Support** - Installable on iPhone/iPad home screen
- ✅ **Offline Functionality** - Works without internet after first load
- ✅ **Auto-save** - Form data automatically saved to browser storage
- ✅ **Mobile-optimized** - Touch-friendly interface
- ✅ **Camera Integration** - Take photos directly in the app
- ✅ **Export Options** - Export to Excel or CSV
- ✅ **Splash Screens** - Professional startup screens for all devices
- ✅ **Native Feel** - Runs in standalone mode (no browser UI)

## 📋 File Structure

```
Survey Solar/
├── index.html              # Main app file
├── manifest.json           # PWA manifest
├── service-worker.js       # Offline support
├── script.js              # App functionality
├── styles.css             # Styling
├── icon-192.png           # PWA icon (192x192)
├── icon-512.png           # PWA icon (512x512)
├── apple-touch-icon.png   # iOS icon (180x180)
├── apple-touch-icon-152x152.png  # iPad icon
├── apple-touch-icon-167x167.png  # iPad Pro icon
├── splash-*.png           # Splash screens (various sizes)
├── generate-icons.html    # Icon generator tool
└── generate-splash-screens.html  # Splash screen generator
```

## 🔧 Troubleshooting

### Can't Install on iOS

- **Using Safari?** Only Safari supports PWA installation on iOS
- **HTTPS Required?** Production deployment must use HTTPS (not HTTP)
- **Service Worker Error?** Clear Safari cache: Settings → Safari → Clear History and Website Data
- **Icon Not Showing?** Make sure all icon files are in the root directory

### Service Worker Not Working

- **File Protocol?** Service workers don't work with `file://` - use HTTP/HTTPS
- **Cache Issues?** Hard refresh: Hold Shift and tap Reload
- **Registration Failed?** Check browser console for errors

### Photos Not Working

- **Permissions?** Grant camera permissions in iOS Settings → Safari → Camera
- **HTTPS Required?** Camera API requires HTTPS in production

### Can't Access from iPhone (Local Network)

- **Same Wi-Fi?** Ensure both devices are on the same network
- **Firewall?** Check Windows Firewall allows port 8000
- **IP Address?** Verify the IP address with `ipconfig` in Command Prompt

### Export Not Working

- **iOS Safari?** File downloads work in Safari - check Downloads folder
- **Permissions?** Ensure Safari has download permissions enabled

## 🌐 Browser Compatibility

- **iOS Safari:** ✅ Full support (11.3+)
- **Chrome (iOS):** ⚠️ Limited (can't install PWA, but can use)
- **Android Chrome:** ✅ Full support
- **Desktop Browsers:** ✅ Works but optimized for mobile

## 📝 Notes

- **Data Storage:** All form data is stored locally in the browser
- **Offline Mode:** App works offline after first load
- **Updates:** Service worker caches the app - clear cache to get updates
- **File Size:** Large photos may take time to process
- **Excel Export:** Uses SheetJS library (loaded from CDN)

## 🔒 Security & Privacy

- All data is stored locally on the device
- No data is sent to external servers (unless you add backend)
- Photos are processed client-side
- Export files are generated locally

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Verify all icon and splash screen files are present
3. Ensure HTTPS is enabled for production use
4. Test in Safari (not Chrome) on iOS

---

**Ready to deploy?** Follow Step 2 above to get your app live on the web!



