// Admin password hash - This is the SHA-256 hash of your password
// To change password: Use an online SHA-256 generator with your desired password
// Default password is 'admin123' - CHANGE THIS HASH!
const ADMIN_PASSWORD_HASH = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';

// Storage keys
const STORAGE_KEY_POSTS = 'blog_posts';
const STORAGE_KEY_ADMIN = 'admin_authenticated';

// DOM Elements
const adminBtn = document.getElementById('adminBtn');
const loginModal = document.getElementById('loginModal');
const loginForm = document.getElementById('loginForm');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('loginError');
const closeModal = document.querySelector('.close');
const adminPanel = document.getElementById('adminPanel');
const logoutBtn = document.getElementById('logoutBtn');
const newPostBtn = document.getElementById('newPostBtn');
const postEditor = document.getElementById('postEditor');
const postForm = document.getElementById('postForm');
const postsContainer = document.getElementById('postsContainer');
const adminPostsContainer = document.getElementById('adminPostsContainer');
const emptyState = document.getElementById('emptyState');
const filterTabs = document.querySelectorAll('.tab-btn');
const editorTitle = document.getElementById('editorTitle');
const deletePostBtn = document.getElementById('deletePostBtn');
const blogViewerModal = document.getElementById('blogViewerModal');
const blogViewerContent = document.getElementById('blogViewerContent');
const closeBlogModal = document.querySelector('.close-blog');

// State
let currentFilter = 'all';
let editingPostId = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAdminStatus();
    loadPosts();
    setupEventListeners();
    initializeSamplePosts();
});

// Event Listeners
function setupEventListeners() {
    adminBtn.addEventListener('click', openLoginModal);
    closeModal.addEventListener('click', closeLoginModal);
    loginForm.addEventListener('submit', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    newPostBtn.addEventListener('click', showNewPostEditor);
    postForm.addEventListener('submit', handleSavePost);
    cancelPostBtn.addEventListener('click', hidePostEditor);
    deletePostBtn.addEventListener('click', handleDeletePost);
    
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.filter;
            loadPosts();
        });
    });

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            closeLoginModal();
        }
        if (e.target === blogViewerModal) {
            closeBlogViewer();
        }
    });
    
    if (closeBlogModal) {
        closeBlogModal.addEventListener('click', closeBlogViewer);
    }

    // Event delegation for admin post actions - set up after DOM is ready
    if (adminPostsContainer) {
        adminPostsContainer.addEventListener('click', handleAdminPostAction);
    }
}

// Handle clicks on admin post action buttons
function handleAdminPostAction(e) {
    // Check if the clicked element or its parent is a button with data-action
    const button = e.target.closest('button[data-action]');
    if (!button) return;
    
    const postId = button.getAttribute('data-post-id');
    const action = button.getAttribute('data-action');
    
    if (!postId || !action) {
        return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    if (action === 'edit') {
        editPost(postId);
    } else if (action === 'delete') {
        deletePostDirectly(postId);
    }
}

// Admin Functions
function checkAdminStatus() {
    const isAuthenticated = localStorage.getItem(STORAGE_KEY_ADMIN) === 'true';
    if (isAuthenticated) {
        showAdminPanel();
    }
}

function openLoginModal() {
    loginModal.style.display = 'block';
    passwordInput.focus();
    loginError.textContent = '';
}

function closeLoginModal() {
    loginModal.style.display = 'none';
    passwordInput.value = '';
    loginError.textContent = '';
}

// Hash function for password verification
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

async function handleLogin(e) {
    e.preventDefault();
    const password = passwordInput.value;
    
    const passwordHash = await hashPassword(password);
    
    if (passwordHash === ADMIN_PASSWORD_HASH) {
        localStorage.setItem(STORAGE_KEY_ADMIN, 'true');
        closeLoginModal();
        showAdminPanel();
        loadAdminPosts();
    } else {
        loginError.textContent = 'ACCESS DENIED. INCORRECT PASSWORD.';
        passwordInput.value = '';
    }
}

function handleLogout() {
    localStorage.removeItem(STORAGE_KEY_ADMIN);
    hideAdminPanel();
    hidePostEditor();
}

function showAdminPanel() {
    adminPanel.classList.remove('hidden');
    loadAdminPosts();
}

function hideAdminPanel() {
    adminPanel.classList.add('hidden');
}

// Post Management
function getPosts() {
    const postsJson = localStorage.getItem(STORAGE_KEY_POSTS);
    return postsJson ? JSON.parse(postsJson) : [];
}

function savePosts(posts) {
    localStorage.setItem(STORAGE_KEY_POSTS, JSON.stringify(posts));
}

function loadPosts() {
    const posts = getPosts();
    const filteredPosts = currentFilter === 'all' 
        ? posts 
        : posts.filter(post => post.type === currentFilter);
    
    postsContainer.innerHTML = '';
    
    if (filteredPosts.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    
    // Separate posts and blogs
    const shortPosts = filteredPosts.filter(p => p.type === 'post');
    const blogPosts = filteredPosts.filter(p => p.type === 'blog');
    
    // Sort by date (newest first)
    shortPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
    blogPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Add sticky notes (absolute positioned)
    shortPosts.forEach(post => {
        const postCard = createPostCard(post);
        postsContainer.appendChild(postCard);
    });
    
    // Add file icons directly to posts container (absolute positioned)
    blogPosts.forEach(post => {
        const postCard = createPostCard(post);
        postsContainer.appendChild(postCard);
    });
}

function createPostCard(post) {
    const date = new Date(post.date);
    const formattedDate = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    if (post.type === 'post') {
        // Sticky note style for short posts - draggable and closable
        const card = document.createElement('div');
        card.className = 'sticky-note';
        card.dataset.postId = post.id;
        card.style.position = 'absolute';
        
        // Restore saved position if exists, otherwise use random
        const savedPos = getStickyNotePosition(post.id);
        if (savedPos) {
            card.style.left = `${savedPos.x}px`;
            card.style.top = `${savedPos.y}px`;
            card.style.transform = `rotate(${savedPos.rotation}deg)`;
        } else {
            // Random initial position
            const randomX = Math.random() * (window.innerWidth - 300) + 50;
            const randomY = Math.random() * (window.innerHeight - 300) + 100;
            card.style.left = `${randomX}px`;
            card.style.top = `${randomY}px`;
            card.style.transform = `rotate(${(Math.random() * 6 - 3)}deg)`;
        }
        
        card.innerHTML = `
            <button class="sticky-close" data-post-id="${post.id}">&times;</button>
            <h3 class="sticky-title">${escapeHtml(post.title)}</h3>
            <p class="sticky-content">${escapeHtml(post.content)}</p>
            <span class="sticky-date">${formattedDate}</span>
        `;
        
        // Make draggable
        makeStickyNoteDraggable(card, post.id);
        
        // Add close button handler
        const closeBtn = card.querySelector('.sticky-close');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeStickyNote(post.id);
        });
        
        return card;
    } else {
        // Windows 95/98 style file icon for blog posts - draggable desktop icon
        const card = document.createElement('div');
        card.className = 'win95-file';
        card.dataset.postId = post.id;
        card.style.position = 'absolute';
        card.style.cursor = 'pointer';
        
        // Show full title - no truncation
        const displayTitle = post.title;
        
        // Grid size for snapping (120px columns, 120px rows)
        const gridSize = 120;
        
        // Restore saved position or use default grid position
        const savedPos = getBlogFilePosition(post.id);
        if (savedPos) {
            card.style.left = `${savedPos.x}px`;
            card.style.top = `${savedPos.y}px`;
        } else {
            // Default grid position based on index
            const blogPosts = getPosts().filter(p => p.type === 'blog');
            const index = blogPosts.findIndex(p => p.id === post.id);
            const cols = Math.floor((window.innerWidth - 200) / gridSize);
            const col = index % cols;
            const row = Math.floor(index / cols);
            card.style.left = `${50 + col * gridSize}px`;
            card.style.top = `${150 + row * gridSize}px`;
        }
        
        card.innerHTML = `
            <div class="win95-icon">
                <div class="win95-icon-image">
                    <div class="win95-doc-icon"></div>
                </div>
                <div class="win95-icon-label">${escapeHtml(displayTitle)}</div>
            </div>
        `;
        
        // Make draggable with grid snapping
        makeBlogFileDraggable(card, post.id);
        
        // Single click to select, double click to open
        let clickTimer = null;
        card.addEventListener('click', (e) => {
            if (clickTimer === null) {
                clickTimer = setTimeout(() => {
                    clickTimer = null;
                    // Single click - just select (visual feedback)
                    document.querySelectorAll('.win95-file').forEach(f => f.classList.remove('selected'));
                    card.classList.add('selected');
                }, 300);
            }
        });
        
        card.addEventListener('dblclick', (e) => {
            if (clickTimer) {
                clearTimeout(clickTimer);
                clickTimer = null;
            }
            openBlogViewer(post);
        });
        
        return card;
    }
}

// Draggable functionality for sticky notes
function makeStickyNoteDraggable(element, postId) {
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;
    
    // Extract rotation from transform
    const match = element.style.transform.match(/rotate\(([^)]+)\)/);
    const rotation = match ? parseFloat(match[1]) : 0;
    
    element.addEventListener('mousedown', dragStart);
    
    function dragStart(e) {
        if (e.target.classList.contains('sticky-close')) return;
        
        const rect = element.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        
        if (e.target === element || element.contains(e.target)) {
            isDragging = true;
            element.style.zIndex = '1000';
            element.style.cursor = 'grabbing';
            
            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', dragEnd);
        }
    }
    
    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            const newX = e.clientX - offsetX;
            const newY = e.clientY - offsetY;
            
            element.style.left = `${newX}px`;
            element.style.top = `${newY}px`;
            element.style.transform = `rotate(${rotation}deg)`;
        }
    }
    
    function dragEnd(e) {
        if (isDragging) {
            isDragging = false;
            element.style.cursor = 'grab';
            
            // Save position
            const rect = element.getBoundingClientRect();
            saveStickyNotePosition(postId, {
                x: rect.left,
                y: rect.top,
                rotation: rotation
            });
            
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('mouseup', dragEnd);
        }
    }
}

function getStickyNotePosition(postId) {
    const saved = localStorage.getItem(`sticky_pos_${postId}`);
    return saved ? JSON.parse(saved) : null;
}

function saveStickyNotePosition(postId, position) {
    localStorage.setItem(`sticky_pos_${postId}`, JSON.stringify(position));
}

function closeStickyNote(postId) {
    if (confirm('DELETE THIS NOTE?')) {
        const posts = getPosts();
        const filteredPosts = posts.filter(p => p.id !== postId);
        savePosts(filteredPosts);
        localStorage.removeItem(`sticky_pos_${postId}`);
        loadPosts();
        loadAdminPosts();
    }
}

// Draggable functionality for blog files with grid snapping
function makeBlogFileDraggable(element, postId) {
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;
    const gridSize = 120; // Grid snap size
    
    element.addEventListener('mousedown', dragStart);
    
    function dragStart(e) {
        // Don't start drag on label clicks (allow text selection)
        if (e.target.classList.contains('win95-icon-label')) {
            return;
        }
        
        const rect = element.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        
        isDragging = true;
        element.style.zIndex = '1000';
        element.style.cursor = 'grabbing';
        element.classList.add('dragging');
        
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);
        e.preventDefault();
    }
    
    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            let newX = e.clientX - offsetX;
            let newY = e.clientY - offsetY;
            
            // Snap to grid
            newX = Math.round(newX / gridSize) * gridSize;
            newY = Math.round(newY / gridSize) * gridSize;
            
            // Keep within bounds
            const minX = 20;
            const minY = 20;
            const maxX = window.innerWidth - 120;
            const maxY = window.innerHeight - 120;
            
            newX = Math.max(minX, Math.min(maxX, newX));
            newY = Math.max(minY, Math.min(maxY, newY));
            
            element.style.left = `${newX}px`;
            element.style.top = `${newY}px`;
        }
    }
    
    function dragEnd(e) {
        if (isDragging) {
            isDragging = false;
            element.style.cursor = 'pointer';
            element.classList.remove('dragging');
            
            // Save position
            const rect = element.getBoundingClientRect();
            saveBlogFilePosition(postId, {
                x: rect.left,
                y: rect.top
            });
            
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('mouseup', dragEnd);
        }
    }
}

function getBlogFilePosition(postId) {
    const saved = localStorage.getItem(`blog_file_pos_${postId}`);
    return saved ? JSON.parse(saved) : null;
}

function saveBlogFilePosition(postId, position) {
    localStorage.setItem(`blog_file_pos_${postId}`, JSON.stringify(position));
}

function loadAdminPosts() {
    const posts = getPosts();
    if (!adminPostsContainer) return;
    
    adminPostsContainer.innerHTML = '';
    
    if (posts.length === 0) {
        adminPostsContainer.innerHTML = '<p style="color: var(--text-muted); text-transform: uppercase;">NO ENTRIES FOUND. CREATE YOUR FIRST ENTRY.</p>';
        return;
    }
    
    // Sort by date (newest first)
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    posts.forEach(post => {
        const postItem = document.createElement('div');
        postItem.className = 'admin-post-item';
        
        const date = new Date(post.date);
        const formattedDate = date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        // Use post ID directly (it should be safe, but we'll ensure it's a string)
        const postIdStr = String(post.id);
        
        postItem.innerHTML = `
            <div class="admin-post-content">
                <h4>${escapeHtml(post.title)}</h4>
                <p><span class="post-type ${post.type}">${post.type}</span></p>
                <p style="font-size: 0.75rem; color: var(--text-light);">${formattedDate}</p>
            </div>
            <div class="admin-post-actions">
                <button class="edit-btn" data-post-id="${postIdStr}" data-action="edit" type="button">EDIT</button>
                <button class="delete-btn-small" data-post-id="${postIdStr}" data-action="delete" type="button">DELETE</button>
            </div>
        `;
        
        // Add click handler for the card (but not for buttons)
        postItem.addEventListener('click', (e) => {
            // Don't trigger edit if clicking on action buttons
            if (!e.target.closest('.admin-post-actions')) {
                editPost(post.id);
            }
        });
        
        adminPostsContainer.appendChild(postItem);
    });
    
    // Ensure event listener is attached (in case it wasn't set up initially)
    if (!adminPostsContainer.hasAttribute('data-listener-attached')) {
        adminPostsContainer.addEventListener('click', handleAdminPostAction);
        adminPostsContainer.setAttribute('data-listener-attached', 'true');
    }
}

function showNewPostEditor() {
    editingPostId = null;
    editorTitle.textContent = 'CREATE NEW ENTRY';
    document.getElementById('postTitle').value = '';
    document.getElementById('postContent').value = '';
    document.getElementById('postType').value = 'post';
    deletePostBtn.classList.add('hidden');
    postEditor.classList.remove('hidden');
    postEditor.scrollIntoView({ behavior: 'smooth' });
}

function hidePostEditor() {
    postEditor.classList.add('hidden');
    editingPostId = null;
}

function editPost(postId) {
    const posts = getPosts();
    const post = posts.find(p => p.id === postId);
    
    if (!post) return;
    
    editingPostId = postId;
    editorTitle.textContent = 'EDIT ENTRY';
    document.getElementById('postTitle').value = post.title;
    document.getElementById('postContent').value = post.content;
    document.getElementById('postType').value = post.type;
    deletePostBtn.classList.remove('hidden');
    postEditor.classList.remove('hidden');
    postEditor.scrollIntoView({ behavior: 'smooth' });
}

function handleSavePost(e) {
    e.preventDefault();
    
    const title = document.getElementById('postTitle').value.trim();
    const content = document.getElementById('postContent').value.trim();
    const type = document.getElementById('postType').value;
    
    if (!title || !content) {
        alert('ERROR: TITLE AND CONTENT REQUIRED.');
        return;
    }
    
    const posts = getPosts();
    
    if (editingPostId) {
        // Update existing post
        const index = posts.findIndex(p => p.id === editingPostId);
        if (index !== -1) {
            posts[index] = {
                ...posts[index],
                title,
                content,
                type,
                date: posts[index].date // Keep original date
            };
        }
    } else {
        // Create new post
        const newPost = {
            id: Date.now().toString(),
            title,
            content,
            type,
            date: new Date().toISOString()
        };
        posts.push(newPost);
    }
    
    savePosts(posts);
    loadPosts();
    loadAdminPosts();
    hidePostEditor();
}

function handleDeletePost() {
    if (!editingPostId) return;
    
    if (!confirm('DELETE ENTRY? This action cannot be undone.')) {
        return;
    }
    
    const posts = getPosts();
    const filteredPosts = posts.filter(p => p.id !== editingPostId);
    savePosts(filteredPosts);
    loadPosts();
    loadAdminPosts();
    hidePostEditor();
}

function deletePostDirectly(postId) {
    if (!postId) {
        alert('ERROR: No post ID provided.');
        return;
    }
    
    // Convert to string for comparison
    const postIdStr = String(postId);
    
    if (!confirm('DELETE ENTRY? This action cannot be undone.')) {
        return;
    }
    
    const posts = getPosts();
    // Compare as strings to ensure we match correctly
    const filteredPosts = posts.filter(p => String(p.id) !== postIdStr);
    
    if (filteredPosts.length === posts.length) {
        // No post was removed, meaning the ID didn't match
        alert('ERROR: Post not found. It may have already been deleted.');
        loadAdminPosts(); // Refresh the list
        return;
    }
    
    savePosts(filteredPosts);
    loadPosts();
    loadAdminPosts();
    
    // If we were editing this post, hide the editor
    if (String(editingPostId) === postIdStr) {
        hidePostEditor();
    }
}

// Blog Viewer Functions
function openBlogViewer(post) {
    const date = new Date(post.date);
    const formattedDate = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    blogViewerContent.innerHTML = `
        <h2 class="blog-viewer-title">${escapeHtml(post.title)}</h2>
        <p class="blog-viewer-date">${formattedDate}</p>
        <div class="blog-viewer-content">${escapeHtml(post.content).replace(/\n/g, '<br>')}</div>
    `;
    
    blogViewerModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeBlogViewer() {
    blogViewerModal.style.display = 'none';
    document.body.style.overflow = '';
}

// Utility Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize with sample posts (only if no posts exist)
function initializeSamplePosts() {
    const posts = getPosts();
    if (posts.length === 0) {
        const samplePosts = [
            {
                id: '1',
                title: 'ENTRY APPROVED',
                content: 'Welcome to the border checkpoint. All entries are subject to review. Glory to Arstotzka.',
                type: 'blog',
                date: new Date().toISOString()
            },
            {
                id: '2',
                title: 'DOCUMENTATION REQUIRED',
                content: 'Please ensure all entries are properly documented. Incomplete entries will be rejected.',
                type: 'post',
                date: new Date(Date.now() - 86400000).toISOString() // Yesterday
            }
        ];
        savePosts(samplePosts);
        loadPosts();
    }
}

