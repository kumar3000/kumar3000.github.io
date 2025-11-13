// Admin password hash - SHA-256 hash of your password
// Default password is 'admin123' - CHANGE THIS HASH!
const ADMIN_PASSWORD_HASH = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';

// Storage keys
const STORAGE_KEY_FILES = 'blog_files';
const STORAGE_KEY_ADMIN = 'admin_authenticated';

// DOM Elements
const fileManagerWindow = document.getElementById('fileManagerWindow');
const fileManagerIcon = document.getElementById('fileManagerIcon');
const fileList = document.getElementById('fileList');
const fileCount = document.getElementById('fileCount');
const fileViewerWindow = document.getElementById('fileViewerWindow');
const fileViewerContent = document.getElementById('fileViewerContent');
const adminPanel = document.getElementById('adminPanel');
const loginDialog = document.getElementById('loginDialog');
const loginForm = document.getElementById('loginForm');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('loginError');
const startBtn = document.getElementById('startBtn');
const taskbarTasks = document.getElementById('taskbarTasks');
const trayTime = document.getElementById('trayTime');

// Admin elements
const logoutBtn = document.getElementById('logoutBtn');
const newFileBtn = document.getElementById('newFileBtn');
const fileEditor = document.getElementById('fileEditor');
const fileForm = document.getElementById('fileForm');
const fileName = document.getElementById('fileName');
const fileContent = document.getElementById('fileContent');
const cancelFileBtn = document.getElementById('cancelFileBtn');
const deleteFileBtn = document.getElementById('deleteFileBtn');
const adminFilesContainer = document.getElementById('adminFilesContainer');
const editorTitle = document.getElementById('editorTitle');

// State
let isAdmin = false;
let editingFileId = null;
let openWindows = [];
let zIndexCounter = 100;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAdminStatus();
    setupEventListeners();
    initializeDesktopIcons();
    initializeWindows();
    loadFiles();
    updateClock();
    setInterval(updateClock, 1000);
    
    // Position file manager window
    positionWindow(fileManagerWindow, 100, 100);
    makeWindowDraggable(fileManagerWindow);
});

// Event Listeners
function setupEventListeners() {
    // Desktop icons
    fileManagerIcon.addEventListener('dblclick', () => openFileManager());
    
    // Start button handled below
    
    // File manager
    setupWindowControls(fileManagerWindow);
    
    // File viewer
    setupWindowControls(fileViewerWindow);
    
    // Admin panel
    setupWindowControls(adminPanel);
    
    // Login
    loginForm.addEventListener('submit', handleLogin);
    document.getElementById('cancelLoginBtn')?.addEventListener('click', () => {
        loginDialog.classList.add('hidden');
        passwordInput.value = '';
        loginError.textContent = '';
    });
    
    // Admin actions
    logoutBtn?.addEventListener('click', handleLogout);
    newFileBtn?.addEventListener('click', showNewFileEditor);
    fileForm?.addEventListener('submit', handleSaveFile);
    cancelFileBtn?.addEventListener('click', hideFileEditor);
    deleteFileBtn?.addEventListener('click', handleDeleteFile);
    
    // Click outside to close dialogs
    window.addEventListener('click', (e) => {
        if (e.target === loginDialog) {
            loginDialog.classList.add('hidden');
        }
    });
}

// Initialize Desktop Icons
function initializeDesktopIcons() {
    // Position desktop icons with saved positions or defaults
    const myComputerPos = getDesktopIconPosition('myComputer');
    const fileManagerPos = getDesktopIconPosition('fileManager');
    
    positionDesktopIcon(document.getElementById('myComputerIcon'), myComputerPos.x || 20, myComputerPos.y || 20);
    positionDesktopIcon(fileManagerIcon, fileManagerPos.x || 20, fileManagerPos.y || 100);
    
    // Make icons draggable
    makeDesktopIconDraggable(document.getElementById('myComputerIcon'), 'myComputer');
    makeDesktopIconDraggable(fileManagerIcon, 'fileManager');
}

function positionDesktopIcon(icon, x, y) {
    icon.style.left = `${x}px`;
    icon.style.top = `${y}px`;
}

// Make desktop icon draggable with grid snapping
function makeDesktopIconDraggable(icon, iconId) {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;
    let offsetX = 0;
    let offsetY = 0;
    let dragTimer = null;
    let hasMoved = false;
    const gridSize = 100; // Grid snap size
    const dragThreshold = 5; // Pixels to move before starting drag
    
    icon.addEventListener('mousedown', dragStart);
    
    function dragStart(e) {
        // Calculate offset from mouse position to icon's top-left corner
        const rect = icon.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        
        // Get current position from style
        initialLeft = parseFloat(icon.style.left) || 0;
        initialTop = parseFloat(icon.style.top) || 0;
        
        // Get mouse position relative to viewport
        startX = e.clientX;
        startY = e.clientY;
        hasMoved = false;
        
        // Set a timer to start dragging after a short delay
        // This allows double-click to work
        dragTimer = setTimeout(() => {
            if (!hasMoved) {
                isDragging = true;
                icon.style.zIndex = '1000';
                icon.style.cursor = 'grabbing';
                icon.classList.add('dragging');
            }
        }, 150); // Small delay to allow double-click
        
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);
        e.preventDefault();
        e.stopPropagation();
    }
    
    function drag(e) {
        const deltaX = Math.abs(e.clientX - startX);
        const deltaY = Math.abs(e.clientY - startY);
        
        // Check if mouse has moved enough to start dragging
        if (deltaX > dragThreshold || deltaY > dragThreshold) {
            hasMoved = true;
            if (dragTimer) {
                clearTimeout(dragTimer);
                dragTimer = null;
            }
            if (!isDragging) {
                isDragging = true;
                icon.style.zIndex = '1000';
                icon.style.cursor = 'grabbing';
                icon.classList.add('dragging');
            }
        }
        
        if (!isDragging) return;
        e.preventDefault();
        
        // Calculate new position keeping the offset constant
        // This ensures the cursor stays on the same spot of the icon
        const newX = e.clientX - offsetX;
        const newY = e.clientY - offsetY;
        
        // Keep within desktop bounds during drag
        const minX = 0;
        const minY = 0;
        const maxX = window.innerWidth - 80; // icon width
        const maxY = window.innerHeight - 80 - 30; // icon height + taskbar
        
        const constrainedX = Math.max(minX, Math.min(maxX, newX));
        const constrainedY = Math.max(minY, Math.min(maxY, newY));
        
        icon.style.left = `${constrainedX}px`;
        icon.style.top = `${constrainedY}px`;
    }
    
    function dragEnd(e) {
        if (dragTimer) {
            clearTimeout(dragTimer);
            dragTimer = null;
        }
        
        if (!isDragging) {
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('mouseup', dragEnd);
            return;
        }
        
        isDragging = false;
        icon.style.cursor = 'pointer';
        icon.classList.remove('dragging');
        
        // Get current position
        let finalX = parseFloat(icon.style.left) || 0;
        let finalY = parseFloat(icon.style.top) || 0;
        
        // Snap to grid only on release
        finalX = Math.round(finalX / gridSize) * gridSize;
        finalY = Math.round(finalY / gridSize) * gridSize;
        
        // Keep within bounds after snapping
        const minX = 0;
        const minY = 0;
        const maxX = window.innerWidth - 80;
        const maxY = window.innerHeight - 80 - 30;
        
        finalX = Math.max(minX, Math.min(maxX, finalX));
        finalY = Math.max(minY, Math.min(maxY, finalY));
        
        // Apply snapped position
        icon.style.left = `${finalX}px`;
        icon.style.top = `${finalY}px`;
        
        // Save snapped position
        saveDesktopIconPosition(iconId, {
            x: finalX,
            y: finalY
        });
        
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', dragEnd);
    }
}

// Save/restore desktop icon positions
function saveDesktopIconPosition(iconId, position) {
    localStorage.setItem(`desktop_icon_pos_${iconId}`, JSON.stringify(position));
}

function getDesktopIconPosition(iconId) {
    const saved = localStorage.getItem(`desktop_icon_pos_${iconId}`);
    return saved ? JSON.parse(saved) : { x: null, y: null };
}

// Window Management
function initializeWindows() {
    // Set initial window positions
    positionWindow(fileManagerWindow, 100, 100);
    positionWindow(fileViewerWindow, 150, 150);
    positionWindow(adminPanel, 200, 200);
}

function positionWindow(window, x, y) {
    window.style.left = `${x}px`;
    window.style.top = `${y}px`;
    window.style.width = '600px';
    window.style.height = '400px';
}

function setupWindowControls(window) {
    const titlebar = window.querySelector('.win95-window-titlebar');
    const minimizeBtn = window.querySelector('.win95-window-minimize');
    const maximizeBtn = window.querySelector('.win95-window-maximize');
    const closeBtn = window.querySelector('.win95-window-close');
    
    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', () => minimizeWindow(window));
    }
    
    if (maximizeBtn) {
        maximizeBtn.addEventListener('click', () => maximizeWindow(window));
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => closeWindow(window));
    }
}

function makeWindowDraggable(window) {
    const titlebar = window.querySelector('.win95-window-titlebar');
    if (!titlebar) return;
    
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;
    
    titlebar.addEventListener('mousedown', (e) => {
        // Don't drag if clicking on buttons
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
        
        isDragging = true;
        bringToFront(window);
        
        startX = e.clientX;
        startY = e.clientY;
        const rect = window.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
        
        document.addEventListener('mousemove', dragWindow);
        document.addEventListener('mouseup', stopDrag);
        e.preventDefault();
    });
    
    function dragWindow(e) {
        if (!isDragging) return;
        
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        window.style.left = `${initialLeft + deltaX}px`;
        window.style.top = `${initialTop + deltaY}px`;
    }
    
    function stopDrag() {
        isDragging = false;
        document.removeEventListener('mousemove', dragWindow);
        document.removeEventListener('mouseup', stopDrag);
    }
}

function bringToFront(window) {
    zIndexCounter++;
    window.style.zIndex = zIndexCounter;
    updateTaskbar();
}

function minimizeWindow(window) {
    window.classList.add('minimized');
    updateTaskbar();
}

function maximizeWindow(window) {
    if (window.classList.contains('maximized')) {
        window.classList.remove('maximized');
        positionWindow(window, 100, 100);
    } else {
        window.classList.add('maximized');
    }
    updateTaskbar();
}

function closeWindow(window) {
    window.classList.add('hidden');
    window.classList.remove('minimized', 'maximized');
    updateTaskbar();
}

function openWindow(window) {
    window.classList.remove('hidden', 'minimized');
    bringToFront(window);
    updateTaskbar();
}

function openFileManager() {
    openWindow(fileManagerWindow);
    loadFiles();
}

// File Management
function getFiles() {
    const filesJson = localStorage.getItem(STORAGE_KEY_FILES);
    return filesJson ? JSON.parse(filesJson) : [];
}

function saveFiles(files) {
    localStorage.setItem(STORAGE_KEY_FILES, JSON.stringify(files));
}

function loadFiles() {
    const files = getFiles();
    fileList.innerHTML = '';
    
    if (files.length === 0) {
        fileList.innerHTML = '<div style="padding: 20px; text-align: center; color: #808080;">No files found</div>';
        fileCount.textContent = '0 object(s)';
        return;
    }
    
    files.forEach(file => {
        const fileItem = createFileItem(file);
        fileList.appendChild(fileItem);
    });
    
    fileCount.textContent = `${files.length} object(s)`;
}

function createFileItem(file) {
    const item = document.createElement('div');
    item.className = 'file-item';
    item.dataset.fileId = file.id;
    
    const date = new Date(file.date);
    const formattedDate = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
    
    item.innerHTML = `
        <div class="file-item-icon">
            <div class="icon-folder"></div>
        </div>
        <div class="file-item-label">${escapeHtml(file.name)}</div>
    `;
    
    // Single click to select
    item.addEventListener('click', (e) => {
        if (e.detail === 1) {
            document.querySelectorAll('.file-item').forEach(f => f.classList.remove('selected'));
            item.classList.add('selected');
        }
    });
    
    // Double click to open
    item.addEventListener('dblclick', () => {
        openFile(file);
    });
    
    return item;
}

function openFile(file) {
    const date = new Date(file.date);
    const formattedDate = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    fileViewerContent.innerHTML = `
        <h1>${escapeHtml(file.name)}</h1>
        <div class="file-date">Created: ${formattedDate}</div>
        <div style="white-space: pre-wrap; line-height: 1.6;">${escapeHtml(file.content)}</div>
    `;
    
    openWindow(fileViewerWindow);
    makeWindowDraggable(fileViewerWindow);
}

// Admin Functions
function checkAdminStatus() {
    const isAuthenticated = localStorage.getItem(STORAGE_KEY_ADMIN) === 'true';
    if (isAuthenticated) {
        isAdmin = true;
        // Admin button would appear in start menu
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const password = passwordInput.value;
    
    const passwordHash = await hashPassword(password);
    
    if (passwordHash === ADMIN_PASSWORD_HASH) {
        localStorage.setItem(STORAGE_KEY_ADMIN, 'true');
        isAdmin = true;
        loginDialog.classList.add('hidden');
        passwordInput.value = '';
        loginError.textContent = '';
        openAdminPanel();
    } else {
        loginError.textContent = 'Invalid password';
        passwordInput.value = '';
    }
}

function handleLogout() {
    localStorage.removeItem(STORAGE_KEY_ADMIN);
    isAdmin = false;
    closeWindow(adminPanel);
    hideFileEditor();
}

function openAdminPanel() {
    openWindow(adminPanel);
    makeWindowDraggable(adminPanel);
    loadAdminFiles();
}

function showNewFileEditor() {
    editingFileId = null;
    editorTitle.textContent = 'Create New File';
    fileName.value = '';
    fileContent.value = '';
    deleteFileBtn.classList.add('hidden');
    fileEditor.classList.remove('hidden');
}

function hideFileEditor() {
    fileEditor.classList.add('hidden');
    editingFileId = null;
}

function handleSaveFile(e) {
    e.preventDefault();
    
    const name = fileName.value.trim();
    const content = fileContent.value.trim();
    
    if (!name || !content) {
        alert('Please fill in all fields');
        return;
    }
    
    const files = getFiles();
    
    if (editingFileId) {
        // Update existing file
        const index = files.findIndex(f => f.id === editingFileId);
        if (index !== -1) {
            files[index].name = name;
            files[index].content = content;
            files[index].date = new Date().toISOString();
        }
    } else {
        // Create new file
        const newFile = {
            id: Date.now().toString(),
            name: name,
            content: content,
            date: new Date().toISOString()
        };
        files.push(newFile);
    }
    
    saveFiles(files);
    loadFiles();
    loadAdminFiles();
    hideFileEditor();
}

function handleDeleteFile() {
    if (!editingFileId) return;
    
    if (confirm('Are you sure you want to delete this file?')) {
        const files = getFiles();
        const filteredFiles = files.filter(f => f.id !== editingFileId);
        saveFiles(filteredFiles);
        loadFiles();
        loadAdminFiles();
        hideFileEditor();
    }
}

function loadAdminFiles() {
    const files = getFiles();
    adminFilesContainer.innerHTML = '';
    
    if (files.length === 0) {
        adminFilesContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #808080;">No files</div>';
        return;
    }
    
    files.forEach(file => {
        const item = document.createElement('div');
        item.className = 'admin-file-item';
        
        const date = new Date(file.date);
        const formattedDate = date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
        
        item.innerHTML = `
            <div>
                <strong>${escapeHtml(file.name)}</strong>
                <div style="font-size: 10px; color: #808080;">${formattedDate}</div>
            </div>
            <div class="admin-file-actions">
                <button class="win95-btn" style="padding: 1px 8px; font-size: 10px; height: 20px;" onclick="editFile('${file.id}')">Edit</button>
            </div>
        `;
        
        adminFilesContainer.appendChild(item);
    });
}

function editFile(fileId) {
    const files = getFiles();
    const file = files.find(f => f.id === fileId);
    
    if (!file) return;
    
    editingFileId = fileId;
    editorTitle.textContent = 'Edit File';
    fileName.value = file.name;
    fileContent.value = file.content;
    deleteFileBtn.classList.remove('hidden');
    fileEditor.classList.remove('hidden');
}

// Password hashing
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// Utility Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateClock() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    trayTime.textContent = `${displayHours}:${displayMinutes} ${ampm}`;
}

function updateTaskbar() {
    taskbarTasks.innerHTML = '';
    
    const windows = [
        { window: fileManagerWindow, name: 'Files' },
        { window: fileViewerWindow, name: 'File Viewer' },
        { window: adminPanel, name: 'Administrator Panel' }
    ];
    
    const visibleWindows = windows.filter(({ window }) => 
        !window.classList.contains('hidden') && !window.classList.contains('minimized')
    );
    
    const maxZIndex = Math.max(...visibleWindows.map(({ window }) => 
        parseInt(window.style.zIndex) || 100
    ));
    
    visibleWindows.forEach(({ window, name }) => {
        const task = document.createElement('div');
        task.className = 'taskbar-task';
        const windowZIndex = parseInt(window.style.zIndex) || 100;
        if (windowZIndex === maxZIndex) {
            task.classList.add('active');
        }
        task.textContent = name;
        task.addEventListener('click', () => {
            if (window.classList.contains('minimized')) {
                window.classList.remove('minimized');
            }
            bringToFront(window);
        });
        taskbarTasks.appendChild(task);
    });
}

// Start button - open admin panel if admin, otherwise show login
startBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isAdmin) {
        if (adminPanel.classList.contains('hidden')) {
            openAdminPanel();
        } else {
            bringToFront(adminPanel);
        }
    } else {
        loginDialog.classList.remove('hidden');
        passwordInput.focus();
    }
});

// Make editFile globally accessible
window.editFile = editFile;
