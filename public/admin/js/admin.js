// API Base URL
const API_BASE = '/api';

// State
let authToken = null;
let currentUser = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initKeyboardShortcut();
});

// Keyboard shortcut (Ctrl+Alt+A)
function initKeyboardShortcut() {
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.altKey && e.key === 'a') {
            e.preventDefault();
            if (!authToken) {
                document.getElementById('adminId').focus();
            }
        }
    });
}

// Check authentication
function checkAuth() {
    authToken = localStorage.getItem('adminToken');
    if (authToken) {
        verifyToken();
    } else {
        showLogin();
    }
}

// Verify token
async function verifyToken() {
    try {
        const response = await fetch(`${API_BASE}/admin-auth/verify`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            currentUser = { id: data.admin.id, role: data.admin.role };
            showDashboard();
        } else {
            localStorage.removeItem('adminToken');
            authToken = null;
            showLogin();
        }
    } catch (error) {
        console.error('Token verification error:', error);
        showLogin();
    }
}

// Replace global functions if they were defined here, or ensuring they use notification.js
// Note: notification.js already exposes window.showSuccess etc.

function showLogin() {
    const loginScreen = document.getElementById('loginScreen');
    const adminDashboard = document.getElementById('adminDashboard');

    if (loginScreen) loginScreen.style.display = 'flex';
    if (adminDashboard) adminDashboard.style.display = 'none';

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const id = document.getElementById('adminId').value;
    const password = document.getElementById('adminPassword').value;
    const errorDiv = document.getElementById('loginError');

    // Clear previous errors
    errorDiv.textContent = '';
    errorDiv.classList.remove('show');

    try {
        const response = await fetch(`${API_BASE}/admin-auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, password })
        });
        const data = await response.json();

        if (response.ok && data.success) {
            authToken = data.token;
            currentUser = data.admin;
            localStorage.setItem('adminToken', authToken);
            showDashboard();
            showSuccess('Welcome to Admin Panel');
        } else {
            errorDiv.textContent = data.error || 'Invalid credentials';
            errorDiv.classList.add('show');
        }
    } catch (error) {
        errorDiv.textContent = 'Network error. Please try again.';
        errorDiv.classList.add('show');
    }
}

// Show dashboard
function showDashboard() {
    try {
        const loginScreen = document.getElementById('loginScreen');
        const adminDashboard = document.getElementById('adminDashboard');

        if (loginScreen) loginScreen.style.display = 'none';
        if (adminDashboard) adminDashboard.style.display = 'grid';

        // Display user info
        document.getElementById('userInfo').textContent = `Admin: ${currentUser.id}`;

        // Initialize dashboard
        initNavigation();
        loadDashboardStats();
        loadRecentArticles();
        loadCategories();
        setDefaultStartDate();

        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    } catch (err) {
        console.error('Error while showing dashboard:', err);
        if (window.showError) {
            window.showError('Error loading dashboard: ' + (err.message || err));
        } else {
            alert('Error loading dashboard: ' + (err.message || err));
        }
    }
}

// Set default start date to today
function setDefaultStartDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    const startDateInput = document.getElementById('ad_start');
    if (startDateInput && !startDateInput.value) {
        startDateInput.value = dateString;
    }
}

// Initialize navigation
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();

            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Show corresponding section
            const sectionName = item.dataset.section;
            showSection(sectionName);
        });
    });
}

// Show section
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });

    // Show selected section
    const section = document.getElementById(`section-${sectionName}`);
    if (section) {
        section.classList.add('active');
    }

    // Update page title
    const titles = {
        'dashboard': 'Dashboard',
        'articles': 'All Articles',
        'create-article': 'Create Article',
        'categories': 'Categories',
        'ticker': 'News Ticker',
        'users': 'Users',
        'settings': 'Settings',
        'navigation': 'Navigation Management',
        'ads': 'Ad Management'
    };
    document.getElementById('pageTitle').textContent = titles[sectionName] || 'Admin Panel';

    // Load section data
    switch (sectionName) {
        case 'articles':
            loadAllArticles();
            break;
        case 'create-article':
            initCreateArticleForm();
            break;
        case 'categories':
            loadCategories();
            break;
        case 'ticker':
            loadTickerSettings();
            break;
        case 'users':
            loadUsers();
            break;
        case 'settings':
            loadSettings();
            break;
        case 'navigation':
            loadNavigation();
            break;
        case 'ads':
            loadAds();
            setupAdPreview();
            break;
    }
}

// Navigation Functions
async function loadNavigation() {
    try {
        const response = await fetch(`${API_BASE}/navigation/all`, { headers: { 'Authorization': `Bearer ${authToken}` } });
        const data = await response.json();
        const list = document.getElementById('navigationList');

        list.innerHTML = data.items.map(item => `
            <div class="article-item" style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong>${item.label}</strong> <small>(${item.url})</small><br>
                    <small>Order: ${item.display_order} | Enabled: ${item.is_enabled ? 'Yes' : 'No'}</small>
                </div>
                <div>
                    <button class="btn btn-sm btn-danger" onclick="deleteNavItem(${item.id})">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.error(e);
    }
}

function showAddNavForm() { document.getElementById('addNavForm').style.display = 'block'; }
function hideAddNavForm() { document.getElementById('addNavForm').style.display = 'none'; }

async function createNavItem() {
    const label = document.getElementById('nav_label').value;
    const url = document.getElementById('nav_url').value;
    const order = document.getElementById('nav_order').value;

    await fetch(`${API_BASE}/navigation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ label, url, display_order: parseInt(order) })
    });
    hideAddNavForm();
    loadNavigation();
}

async function deleteNavItem(id) {
    if (!confirm('Delete this item?')) return;
    try {
        const response = await fetch(`${API_BASE}/navigation/${id}`, { 
            method: 'DELETE', 
            headers: { 'Authorization': `Bearer ${authToken}` } 
        });
        
        if (response.ok) {
            showSuccess('Navigation item deleted successfully');
            loadNavigation();
        } else {
            const error = await response.json();
            showError('Error: ' + (error.error || 'Failed to delete'));
        }
    } catch (error) {
        showError('Error deleting navigation item: ' + error.message);
    }
}

// Ads Functions
async function loadAds() {
    try {
        const response = await fetch(`${API_BASE}/ads/all`, { headers: { 'Authorization': `Bearer ${authToken}` } });

        if (!response.ok) {
            const error = await response.json();
            showError('Error: ' + error.error);
            return;
        }

        const data = await response.json();
        const list = document.getElementById('adsList');

        if (!data.ads || data.ads.length === 0) {
            list.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No ads found</p>';
            return;
        }

        list.innerHTML = data.ads.map(ad => `
            <div class="article-item" style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display:flex; gap:10px; align-items:center;">
                    <img src="${ad.image_url}" style="height:50px; border-radius:4px;">
                    <div>
                        <strong>${ad.name}</strong> <small>(${ad.placement})</small><br>
                        <small>Size: ${ad.width}x${ad.height}px | Clicks: ${ad.click_count} | Impressions: ${ad.impression_count}</small>
                    </div>
                </div>
                <div>
                    <button class="btn btn-sm btn-danger" onclick="deleteAd(${ad.id})">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.error(e);
        showError('Error loading ads: ' + e.message);
    }
}

function showAddAdForm() { document.getElementById('addAdForm').style.display = 'block'; }
function hideAddAdForm() { document.getElementById('addAdForm').style.display = 'none'; }

// Preview image/video when file is selected or URL is pasted
function setupAdPreview() {
    const fileInput = document.getElementById('ad_image_file');
    const urlInput = document.getElementById('ad_image_url');
    const preview = document.getElementById('ad_preview');
    const videoPreview = document.getElementById('ad_video_preview');

    // File upload preview
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const src = event.target.result;
                    const isVideo = file.type.includes('video');
                    
                    if (isVideo) {
                        videoPreview.src = src;
                        videoPreview.style.display = 'block';
                        preview.style.display = 'none';
                    } else {
                        preview.src = src;
                        preview.style.display = 'block';
                        videoPreview.style.display = 'none';
                    }
                    urlInput.value = ''; // Clear URL input when file is selected
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // URL input preview
    if (urlInput) {
        urlInput.addEventListener('change', function(e) {
            const url = e.target.value;
            if (url) {
                if (url.endsWith('.mp4') || url.endsWith('.webm')) {
                    videoPreview.src = url;
                    videoPreview.style.display = 'block';
                    preview.style.display = 'none';
                } else {
                    preview.src = url;
                    preview.style.display = 'block';
                    videoPreview.style.display = 'none';
                }
                fileInput.value = ''; // Clear file input when URL is pasted
            }
        });
    }
}

async function createAd() {
    const title = document.getElementById('ad_title').value;
    const fileInput = document.getElementById('ad_image_file');
    const urlInput = document.getElementById('ad_image_url');
    const link_url = document.getElementById('ad_link').value;
    const placement = document.getElementById('ad_placement').value;
    const start_date = document.getElementById('ad_start').value;
    const end_date = document.getElementById('ad_end').value;

    if (!title || !link_url) {
        showWarning('Title and Link URL are required');
        return;
    }

    let image_url = '';

    // Check if file is selected
    if (fileInput && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        
        reader.onload = async function(event) {
            const base64Data = event.target.result;
            
            try {
                const uploadResponse = await fetch(`${API_BASE}/ads/upload`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}` 
                    },
                    body: JSON.stringify({
                        base64Data: base64Data,
                        filename: file.name
                    })
                });

                if (uploadResponse.ok) {
                    const uploadData = await uploadResponse.json();
                    image_url = uploadData.image_url;
                    
                    // Now create the ad with the uploaded image
                    await createAdWithImage(title, image_url, link_url, placement, start_date, end_date);
                } else {
                    showError('Error uploading image');
                }
            } catch (error) {
                showError('Error uploading file: ' + error.message);
            }
        };
        
        reader.readAsDataURL(file);
    } else if (urlInput && urlInput.value) {
        // Use URL if no file is selected
        image_url = urlInput.value;
        createAdWithImage(title, image_url, link_url, placement, start_date, end_date);
    } else {
        showWarning('Please upload an image/video or paste a URL');
    }
}

async function createAdWithImage(title, image_url, link_url, placement, start_date, end_date) {
    // Map ad sizes to dimensions
    const adSizes = {
        'header': { width: 728, height: 90 },
        'content_top': { width: 336, height: 280 },
        'content_bottom': { width: 300, height: 250 },
        'mobile_sticky': { width: 320, height: 50 }
    };

    const size = adSizes[placement] || { width: 300, height: 250 };

    try {
        const response = await fetch(`${API_BASE}/ads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
            body: JSON.stringify({
                name: title,
                image_url,
                link_url,
                placement,
                width: size.width,
                height: size.height,
                start_date: start_date || null,
                end_date: end_date || null
            })
        });

        if (response.ok) {
            showSuccess('Ad created successfully!');
            hideAddAdForm();
            document.getElementById('ad_title').value = '';
            document.getElementById('ad_image_file').value = '';
            document.getElementById('ad_image_url').value = '';
            document.getElementById('ad_link').value = '';
            document.getElementById('ad_start').value = '';
            document.getElementById('ad_end').value = '';
            document.getElementById('ad_preview').style.display = 'none';
            document.getElementById('ad_video_preview').style.display = 'none';
            loadAds();
        } else {
            const error = await response.json();
            showError('Error: ' + error.error);
        }
    } catch (error) {
        showError('Network error. Please try again.');
    }
}

async function deleteAd(id) {
    if (!confirm('Delete this ad?')) return;
    try {
        const response = await fetch(`${API_BASE}/ads/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            showSuccess('Ad deleted successfully');
            loadAds();
        } else {
            const error = await response.json();
            showError('Error: ' + error.error);
        }
    } catch (error) {
        showError('Error deleting ad');
    }
}

// Rich Text Editor Functions
function formatText(command) {
    const textarea = document.getElementById('body');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);

    if (!selectedText) {
        showWarning('Please select text first');
        return;
    }

    let formattedText = '';

    switch (command) {
        case 'bold':
            formattedText = `<strong>${selectedText}</strong>`;
            break;
        case 'italic':
            formattedText = `<em>${selectedText}</em>`;
            break;
        case 'underline':
            formattedText = `<u>${selectedText}</u>`;
            break;
        case 'h2':
            formattedText = `<h2>${selectedText}</h2>`;
            break;
        case 'h3':
            formattedText = `<h3>${selectedText}</h3>`;
            break;
        case 'ul':
            const ulItems = selectedText.split('\n').filter(line => line.trim());
            formattedText = '<ul>\n' + ulItems.map(item => `  <li>${item}</li>`).join('\n') + '\n</ul>';
            break;
        case 'ol':
            const olItems = selectedText.split('\n').filter(line => line.trim());
            formattedText = '<ol>\n' + olItems.map(item => `  <li>${item}</li>`).join('\n') + '\n</ol>';
            break;
    }

    textarea.value = textarea.value.substring(0, start) + formattedText + textarea.value.substring(end);
    textarea.focus();
}

function insertLink() {
    const textarea = document.getElementById('body');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);

    const url = prompt('Enter URL:', 'https://');
    if (!url) return;

    const linkText = selectedText || prompt('Enter link text:', 'Click here');
    const formattedText = `<a href="${url}">${linkText}</a>`;

    textarea.value = textarea.value.substring(0, start) + formattedText + textarea.value.substring(end);
    textarea.focus();
}

// Category Management Functions
function showAddCategoryForm() {
    document.getElementById('addCategoryForm').style.display = 'block';
}

function hideAddCategoryForm() {
    document.getElementById('addCategoryForm').style.display = 'none';
    document.getElementById('cat_name').value = '';
    document.getElementById('cat_slug').value = '';
    document.getElementById('cat_description').value = '';
}

async function createCategory() {
    const name = document.getElementById('cat_name').value;
    let slug = document.getElementById('cat_slug').value;
    const description = document.getElementById('cat_description').value;

    if (!name) {
        showWarning('Category name is required');
        return;
    }

    if (!slug) {
        slug = generateSlug(name);
    }

    try {
        const response = await fetch(`${API_BASE}/categories`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ name, slug, description })
        });

        if (response.ok) {
            showSuccess('Category created successfully!');
            hideAddCategoryForm();
            loadCategories();
        } else {
            const error = await response.json();
            showError('Error: ' + error.error);
        }
    } catch (error) {
        showError('Network error. Please try again.');
    }
}

async function deleteCategory(id, name) {
    if (!confirm(`Are you sure you want to delete category "${name}"?`)) return;

    try {
        const response = await fetch(`${API_BASE}/categories/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            showSuccess('Category deleted successfully');
            loadCategories();
        } else {
            const error = await response.json();
            showError('Error: ' + error.error);
        }
    } catch (error) {
        showError('Error deleting category');
    }
}

// News Ticker Management
async function loadTickerSettings() {
    try {
        const response = await fetch(`${API_BASE}/settings`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (data.settings) {
            const tickerEnabled = data.settings.find(s => s.key === 'ticker_enabled');
            const tickerText = data.settings.find(s => s.key === 'ticker_text');

            document.getElementById('ticker_enabled').checked = tickerEnabled?.value === 'true';
            document.getElementById('ticker_text').value = tickerText?.value || '';
        }
    } catch (error) {
        console.error('Error loading ticker settings:', error);
    }
}

async function updateTickerSettings() {
    const enabled = document.getElementById('ticker_enabled').checked;
    const text = document.getElementById('ticker_text').value;

    try {
        // Update ticker_enabled setting
        await fetch(`${API_BASE}/settings/ticker_enabled`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ value: enabled.toString() })
        });

        // Update ticker_text setting
        await fetch(`${API_BASE}/settings/ticker_text`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ value: text })
        });

        showSuccess('Ticker settings updated successfully!');
    } catch (error) {
        showError('Error updating ticker settings');
    }
}

// Load dashboard stats
async function loadDashboardStats() {
    try {
        console.log('Loading dashboard stats, authToken:', authToken ? 'present' : 'null');
        const response = await fetch(`${API_BASE}/dashboard/stats`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        console.log('Dashboard stats response status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Dashboard stats error:', errorData);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error}`);
        }

        const data = await response.json();
        console.log('Dashboard stats data received:', data);

        // Update stats
        let totalArticles = 0;
        let publishedArticles = 0;
        let pendingArticles = 0;

        if (data.articles && Array.isArray(data.articles)) {
            data.articles.forEach(stat => {
                totalArticles += stat.count;
                if (stat.status === 'published') publishedArticles = stat.count;
                if (stat.status === 'pending') pendingArticles = stat.count;
            });
        }

        console.log('Dashboard stats calculated:', { totalArticles, publishedArticles, pendingArticles });
        
        document.getElementById('totalArticles').textContent = totalArticles;
        document.getElementById('publishedArticles').textContent = publishedArticles;
        document.getElementById('pendingArticles').textContent = pendingArticles;
        document.getElementById('totalViews').textContent = data.totalViews || 0;

        // Render Chart
        if (data.articles) {
            renderDashboardChart(data);
        }

    } catch (error) {
        console.error('Error loading stats:', error);
        console.error('Error details:', error.message, error.stack);
        showError('Failed to load dashboard stats: ' + error.message);
    }
}

// Render Dashboard Chart
let dashboardChart = null;
function renderDashboardChart(data) {
    try {
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js is not loaded');
            return;
        }

        const ctx = document.getElementById('viewsChart');
        if (!ctx) {
            console.warn('Chart canvas not found');
            return;
        }

        if (!data || !data.articles || !Array.isArray(data.articles)) {
            console.warn('Invalid data for chart:', data);
            return;
        }

        if (dashboardChart) {
            dashboardChart.destroy();
        }

        // Extract counts with safety checks
        const labels = ['Published', 'Pending', 'Drafts'];
        const counts = [
            data.articles.find(s => s.status === 'published')?.count || 0,
            data.articles.find(s => s.status === 'pending')?.count || 0,
            data.articles.find(s => s.status === 'draft')?.count || 0,
        ];

        dashboardChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Article Count by Status',
                    data: counts,
                    backgroundColor: [
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(255, 206, 86, 0.6)',
                        'rgba(201, 203, 207, 0.6)'
                    ],
                    borderColor: [
                        'rgba(75, 192, 192, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(201, 203, 207, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
        }
        });
        console.log('Dashboard chart rendered successfully');
    } catch (error) {
        console.error('Error rendering chart:', error);
    }
}

// Load recent articles
async function loadRecentArticles() {
    try {
        const response = await fetch(`${API_BASE}/articles?limit=5`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();
        const container = document.getElementById('recentArticles');

        if (data.articles && data.articles.length > 0) {
            container.innerHTML = data.articles.map(article => `
                <div class="article-item">
                    <div class="article-info">
                        <h3>${article.headline}</h3>
                        <div class="article-meta">
                            <span class="status-badge status-${article.status}">${article.status}</span>
                            <span>By ${article.author_name || 'Unknown'}</span>
                        </div>
                    </div>
                    <div class="article-actions">
                        <button class="btn btn-sm btn-secondary" onclick="editArticle(${article.id})">Edit</button>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p>No articles yet</p>';
        }
    } catch (error) {
        console.error('Error loading recent articles:', error);
    }
}

// Load all articles
async function loadAllArticles() {
    try {
        const statusFilter = document.getElementById('statusFilter').value;
        let url = `${API_BASE}/articles?limit=50`;
        if (statusFilter) url += `&status=${statusFilter}`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();
        const container = document.getElementById('articlesList');

        if (data.articles && data.articles.length > 0) {
            container.innerHTML = data.articles.map(article => `
                <div class="article-item">
                    <div class="article-info">
                        <h3>${article.headline}</h3>
                        <div class="article-meta">
                            <span class="status-badge status-${article.status}">${article.status}</span>
                            <span>${article.category_name || 'Uncategorized'}</span>
                            <span>${new Date(article.created_at).toLocaleDateString()}</span>
                            <span style="background: #e0e0e0; color: #333; padding: 2px 8px; border-radius: 12px; font-size: 0.85em; font-weight: 600; margin-left: 8px;">ID: ${article.id}</span>
                        </div>
                    </div>
                    <div class="article-actions">
                        <button class="btn btn-sm btn-secondary article-edit-btn" data-article-id="${article.id}">Edit</button>
                        ${article.status === 'pending' ? `<button class="btn btn-sm btn-success article-approve-btn" data-article-id="${article.id}">Approve</button>` : ''}
                        <button class="btn btn-sm btn-danger article-delete-btn" data-article-id="${article.id}">Delete</button>
                    </div>
                </div>
            `).join('');

            // Attach event listeners using delegation
            attachArticleListeners(container);
        } else {
            container.innerHTML = '<p>No articles found</p>';
        }
    } catch (error) {
        console.error('Error loading articles:', error);
    }
}

// Initialize create article form
function initCreateArticleForm() {
    const form = document.getElementById('createArticleForm');

    // Load categories for dropdown
    loadCategoriesForForm();

    // Ensure button text is reset when form is shown
    document.querySelector('#createArticleForm button[type="submit"]').textContent = editingArticleId ? 'Update Article' : 'Create Article';

    // Initialize featured image upload
    initFeaturedImageUpload();

    // Handle form submission
    form.onsubmit = async (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        const articleData = {
            headline: formData.get('headline'),
            sub_headline: formData.get('sub_headline'),
            summary: formData.get('summary'),
            body: document.getElementById('body').innerHTML, // Read from contenteditable
            category_id: formData.get('category_id') || null,
            status: formData.get('status'),
            featured_image_url: formData.get('featured_image_url'),
            scheduled_publish_at: formData.get('scheduled_publish_at') || null,
            is_breaking: document.getElementById('is_breaking').checked ? 1 : 0,
            is_featured: document.getElementById('is_featured').checked ? 1 : 0,
        };

        if (!articleData.slug && !editingArticleId) {
            articleData.slug = generateSlug(articleData.headline);
        }

        try {
            const url = editingArticleId ? `${API_BASE}/articles/${editingArticleId}` : `${API_BASE}/articles`;
            const method = editingArticleId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(articleData)
            });

            if (response.ok) {
                showSuccess(editingArticleId ? 'Article updated successfully!' : 'Article created successfully!');
                resetForm();
                loadDashboardStats();
                showSection('articles');
                loadAllArticles();
            } else {
                const error = await response.json();
                showError('Error: ' + error.error);
            }
        } catch (error) {
            showError('Network error. Please try again.');
        }
    };
}

// Initialize featured image upload - with guard against multiple initializations
function initFeaturedImageUpload() {
    const featuredImageInput = document.getElementById('featuredImageInput');
    const featuredImageUrl = document.getElementById('featured_image_url');
    const featuredImagePreview = document.getElementById('featuredImagePreview');

    if (!featuredImageInput) {
        console.warn('Featured image input not found');
        return;
    }

    // Prevent duplicate initialization by removing previous listener if it exists
    if (featuredImageInput._uploadHandlerInitialized) {
        console.log('Featured image upload handler already initialized, skipping duplicate');
        return;
    }
    featuredImageInput._uploadHandlerInitialized = true;

    console.log('Initializing featured image upload handler');

    featuredImageInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) {
            console.log('No file selected');
            return;
        }

        console.log('File selected:', file.name, file.size, file.type);

        if (file.size > 10 * 1024 * 1024) {
            showError('File size exceeds 10MB limit');
            return;
        }

        const reader = new FileReader();
        reader.onerror = (error) => {
            console.error('FileReader error:', error);
            showError('Failed to read file');
        };
        
        reader.onload = async (event) => {
            const base64Data = event.target.result;
            console.log('Base64 data prepared, length:', base64Data.length);

            try {
                console.log('Uploading to /api/media/upload');
                const response = await fetch(`${API_BASE}/media/upload`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({
                        base64Data,
                        filename: file.name
                    })
                });

                console.log('Upload response status:', response.status);
                const data = await response.json();
                console.log('Upload response data:', data);

                if (!response.ok) {
                    showError('Upload failed: ' + (data.error || 'Unknown error'));
                    return;
                }

                if (data.url) {
                    console.log('Upload successful, URL:', data.url);
                    featuredImageUrl.value = data.url;
                    
                    // Show preview
                    featuredImagePreview.innerHTML = `
                        <img src="${data.url}" style="max-width: 100%; height: auto; border-radius: 4px; border: 1px solid #ddd;" onload="console.log('Preview image loaded')" onerror="console.error('Preview image failed to load')">
                        <p style="margin-top: 5px; font-size: 0.9em; color: #666;">Image uploaded successfully: ${data.filename}</p>
                    `;
                    
                    showSuccess('Featured image uploaded successfully');
                } else {
                    showError('Upload failed: No URL returned');
                }
            } catch (error) {
                console.error('Upload error:', error);
                showError('Failed to upload image: ' + error.message);
            }
        };
        reader.readAsDataURL(file);
    });
}


// Load categories for form
async function loadCategoriesForForm() {
    try {
        const response = await fetch(`${API_BASE}/categories`);
        const data = await response.json();

        const select = document.getElementById('category_id');
        if (data.categories) {
            data.categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = cat.name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Load categories
async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE}/categories`);
        const data = await response.json();

        const container = document.getElementById('categoriesList');
        if (data.categories && data.categories.length > 0) {
            container.innerHTML = data.categories.map(cat => `
                <div class="article-item">
                    <div class="article-info">
                        <h3>${cat.name}</h3>
                        <div class="article-meta">
                            <span>${cat.description || 'No description'}</span>
                            <span>Slug: ${cat.slug}</span>
                        </div>
                    </div>
                    <div class="article-actions">
                        <button class="btn btn-sm btn-danger" onclick="deleteCategory(${cat.id}, '${cat.name}')">Delete</button>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Load users
async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE}/users`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();
        const container = document.getElementById('usersList');

        if (data.users && data.users.length > 0) {
            container.innerHTML = data.users.map(user => `
                <div class="article-item">
                    <div class="article-info">
                        <h3>${user.full_name || user.username}</h3>
                        <div class="article-meta">
                            <span>${user.email}</span>
                            <span>${user.is_active ? 'Active' : 'Inactive'}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Load settings
async function loadSettings() {
    try {
        const response = await fetch(`${API_BASE}/settings`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();
        const container = document.getElementById('settingsList');

        if (data.settings && data.settings.length > 0) {
            container.innerHTML = `
                <div class="settings-grid">
                    ${data.settings.map(setting => `
                        <div class="setting-item">
                            <label for="setting_${setting.key}">${formatSettingKey(setting.key)}</label>
                            <div class="setting-input-group">
                                <input type="text" id="setting_${setting.key}" value="${setting.value || ''}" 
                                       ${setting.key === 'ticker_items' ? 'placeholder="Item 1 | Item 2"' : ''}>
                                <button class="btn btn-sm btn-primary" onclick="updateSetting('${setting.key}')">Save</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

function formatSettingKey(key) {
    return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

// Update Setting
window.updateSetting = async function (key) {
    const input = document.getElementById(`setting_${key}`);
    const value = input.value;

    try {
        const response = await fetch(`${API_BASE}/settings/${key}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ value })
        });

        if (response.ok) {
            showSuccess(`${formatSettingKey(key)} updated successfully`);
        } else {
            showError('Failed to update setting');
        }
    } catch (error) {
        showError('Error updating setting');
    }
};

// Rich Text Editor Functions - Exposed to Window
let editingArticleId = null;

// Rich Text Editor Functions - FIXED VERSION
window.formatText = function (command, value = null) {
    const editor = document.getElementById('body');
    if (!editor) {
        console.error('Editor not found');
        return;
    }

    // Focus editor BEFORE execCommand
    editor.focus();

    // Execute command
    const success = document.execCommand(command, false, value);

    if (!success) {
        console.warn('execCommand failed for:', command);
    }

    // Keep focus
    editor.focus();
};

window.insertLink = function () {
    const editor = document.getElementById('body');
    if (!editor) return;

    // Focus first
    editor.focus();

    const url = prompt('Enter URL:', 'https://');
    if (url && url.trim()) {
        document.execCommand('createLink', false, url);
        editor.focus();
    }
};

window.insertImage = function () {
    const editor = document.getElementById('body');
    if (!editor) return;

    // Focus first
    editor.focus();

    const url = prompt('Enter Image URL:', 'https://');
    if (url && url.trim()) {
        document.execCommand('insertImage', false, url);
        editor.focus();
    }
};

// Edit Article
window.editArticle = async function (id) {
    try {
        const response = await fetch(`${API_BASE}/articles/${id}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();

        if (response.ok) {
            const article = data.article;
            editingArticleId = article.id;

            // Switch to form
            showSection('create-article');
            document.querySelector('#section-create-article h2').textContent = 'Edit Article';

            // Populate form
            document.getElementById('headline').value = article.headline;
            document.getElementById('sub_headline').value = article.sub_headline || '';
            document.getElementById('summary').value = article.summary || '';
            document.getElementById('category_id').value = article.category_id || '';
            document.getElementById('status').value = article.status;
            document.getElementById('featured_image_url').value = article.featured_image_url || '';
            document.getElementById('is_breaking').checked = article.is_breaking;
            document.getElementById('is_featured').checked = article.is_featured;
            document.getElementById('scheduled_publish_at').value = article.scheduled_publish_at ? new Date(article.scheduled_publish_at).toISOString().slice(0, 16) : '';

            // Populate Editor
            document.getElementById('body').innerHTML = article.body;

            // Change submit button text
            const btn = document.querySelector('#createArticleForm button[type="submit"]');
            btn.textContent = 'Update Article';
            btn.onclick = (e) => {
                // Ensure the form submit handler uses this context or logic
                // Actually initCreateArticleForm handles onsubmit. We need to handle the state there.
            };
        }
    } catch (e) {
        console.error(e);
        showError('Error loading article');
    }
};

function resetForm() {
    document.getElementById('createArticleForm').reset();
    document.getElementById('body').innerHTML = '';
    document.getElementById('featuredImagePreview').innerHTML = '';
    document.getElementById('featuredImageInput').value = '';
    editingArticleId = null;
    document.querySelector('#section-create-article h2').textContent = 'Create New Article';
    document.querySelector('#createArticleForm button[type="submit"]').textContent = 'Create Article';
}

// Delete Article (exposed to window for event listeners)
window.deleteArticle = async function (id) {
    if (!confirm('Are you sure you want to delete this article?')) return;

    try {
        const response = await fetch(`${API_BASE}/articles/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            showSuccess('Article deleted successfully');
            loadAllArticles();
            loadRecentArticles();
            loadDashboardStats();
        } else {
            const error = await response.json();
            showError('Error: ' + error.error);
        }
    } catch (error) {
        showError('Error deleting article');
    }
};

// Approve Article
// Approve article (exposed to window for event listeners)
window.approveArticle = async function (id) {
    if (!confirm('Approve this article for publication?')) return;

    try {
        const response = await fetch(`${API_BASE}/articles/${id}/status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ status: 'published' })
        });

        if (response.ok) {
            showSuccess('Article approved and published!');
            loadAllArticles();
            loadRecentArticles();
            loadDashboardStats();
        } else {
            const error = await response.json();
            showError('Error: ' + error.error);
        }
    } catch (error) {
        showError('Error approving article');
    }
};

// Generate Slug with timestamp for uniqueness
function generateSlug(text) {
    const baseSlug = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

    // Add timestamp to ensure uniqueness
    const timestamp = Date.now().toString().slice(-6);
    return `${baseSlug}-${timestamp}`;
}

// Preview Article
function previewArticle() {
    const headline = document.getElementById('headline').value;
    const body = document.getElementById('body').innerHTML;
    const summary = document.getElementById('summary').value;

    if (!headline || !body) {
        showWarning('Please add a headline and body content before previewing');
        return;
    }

    try {
        const previewWindow = window.open('', 'ArticlePreview', 'width=800,height=600,scrollbars=yes');

        if (!previewWindow) {
            showError('Preview blocked by popup blocker. Please allow popups for this site and try again');
            return;
        }

        previewWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Preview: ${headline.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</title>
                <style>
                    body { 
                        font-family: 'Mukta', Arial, sans-serif; 
                        max-width: 800px; 
                        margin: 20px auto; 
                        padding: 20px; 
                        background: #f5f5f5;
                    }
                    .preview-container {
                        background: white;
                        padding: 30px;
                        border-radius: 8px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                    h1 { 
                        color: #D32F2F; 
                        margin-top: 0;
                        line-height: 1.3;
                    }
                    .summary { 
                        font-style: italic; 
                        color: #666; 
                        margin: 20px 0; 
                        padding: 15px;
                        background: #f9f9f9;
                        border-left: 4px solid #D32F2F;
                    }
                    .body { 
                        line-height: 1.8; 
                        color: #333;
                    }
                    .body img {
                        max-width: 100%;
                        height: auto;
                        margin: 20px 0;
                    }
                    .preview-badge {
                        background: #ff9800;
                        color: white;
                        padding: 5px 10px;
                        border-radius: 4px;
                        font-size: 12px;
                        display: inline-block;
                        margin-bottom: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="preview-container">
                    <div class="preview-badge">PREVIEW MODE</div>
                    <h1>${headline}</h1>
                    ${summary ? `<div class="summary">${summary}</div>` : ''}
                    <div class="body">${body}</div>
                </div>
            </body>
            </html>
        `);
        previewWindow.document.close();
    } catch (error) {
        console.error('Preview error:', error);
        showError('Error opening preview. Please check your browser settings.');
    }
}

// Logout
function handleLogout() {
    localStorage.removeItem('adminToken');
    authToken = null;
    currentUser = null;
    window.location.reload();
}
// Trending News Management
window.saveTrendingNews = async function () {
    const content = document.getElementById('trending_news').value;

    if (!content.trim()) {
        showWarning('Please enter trending article IDs');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/settings/trending_articles`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ value: content })
        });

        if (response.ok) {
            showSuccess('Trending news updated successfully');
        } else {
            showError('Failed to update trending news');
        }
    } catch (error) {
        showError('Error updating trending news');
    }
};

// Hot News Management
window.saveHotNews = async function () {
    const content = document.getElementById('hot_news').value;

    if (!content.trim()) {
        showWarning('Please enter hot news headlines');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/settings/hot_news`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ value: content })
        });

        if (response.ok) {
            showSuccess('Hot news updated successfully');
        } else {
            showError('Failed to update hot news');
        }
    } catch (error) {
        showError('Error updating hot news');
    }
};

// About Content Management
window.saveAboutContent = async function () {
    const content = document.getElementById('about_content').value;

    if (!content.trim()) {
        showWarning('Please enter about content');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/settings/about_content`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ value: content })
        });

        if (response.ok) {
            showSuccess('About section updated successfully');
        } else {
            showError('Failed to update about section');
        }
    } catch (error) {
        showError('Error updating about section');
    }
};

// Contact Content Management
window.saveContactContent = async function () {
    const content = document.getElementById('contact_content').value;

    if (!content.trim()) {
        showWarning('Please enter contact content');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/settings/contact_content`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ value: content })
        });

        if (response.ok) {
            showSuccess('Contact section updated successfully');
        } else {
            showError('Failed to update contact section');
        }
    } catch (error) {
        showError('Error updating contact section');
    }
};

// Update loadSettings to also load the new custom settings
const originalLoadSettings = loadSettings;
window.loadSettings = async function () {
    await originalLoadSettings();

    // Load custom settings
    try {
        const response = await fetch(`${API_BASE}/settings`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (data.settings) {
            const trendingNews = data.settings.find(s => s.key === 'trending_articles');
            const hotNews = data.settings.find(s => s.key === 'hot_news');
            const aboutContent = data.settings.find(s => s.key === 'about_content');
            const contactContent = data.settings.find(s => s.key === 'contact_content');

            if (trendingNews && trendingNews.value) {
                document.getElementById('trending_news').value = trendingNews.value;
            }
            if (hotNews && hotNews.value) {
                document.getElementById('hot_news').value = hotNews.value;
            }
            if (aboutContent && aboutContent.value) {
                document.getElementById('about_content').value = aboutContent.value;
            }
            if (contactContent && contactContent.value) {
                document.getElementById('contact_content').value = contactContent.value;
            }
        }
    } catch (error) {
        console.error('Error loading custom settings:', error);
    }
};