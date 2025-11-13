// Admin password - Change this to your desired password
const ADMIN_PASSWORD = 'admin123'; // Change this!

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

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            closeLoginModal();
        }
    });

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

function handleLogin(e) {
    e.preventDefault();
    const password = passwordInput.value;
    
    if (password === ADMIN_PASSWORD) {
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
    
    // Sort by date (newest first)
    filteredPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    filteredPosts.forEach(post => {
        const postCard = createPostCard(post);
        postsContainer.appendChild(postCard);
    });
}

function createPostCard(post) {
    const card = document.createElement('div');
    card.className = 'post-card';
    
    const date = new Date(post.date);
    const formattedDate = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    card.innerHTML = `
        <span class="post-type ${post.type}">${post.type}</span>
        <h2 class="post-title">${escapeHtml(post.title)}</h2>
        <p class="post-content">${escapeHtml(post.content)}</p>
        <p class="post-date">${formattedDate}</p>
    `;
    
    return card;
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

