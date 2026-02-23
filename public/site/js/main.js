// API Base URL
const API_BASE = '/api';

// State
let currentPage = 0;
const pageSize = 12;
const mainPageSize = 200; // load many articles for central feed (shows all released news)
let lastFetchCount = 0; // number of articles returned by last fetch
let totalLoaded = 0; // total articles loaded into feed

// Image optimization helper
function optimizeImageUrl(url, width = 1200, quality = 'high') {
    if (!url) return '';
    // Add quality parameters if it's an external image service
    if (url.includes('images.unsplash.com') || url.includes('picsum.photos')) {
        return url + (url.includes('?') ? '&' : '?') + `w=${width}&q=95&fit=crop`;
    }
    // For local uploads, ensure HD quality
    return url;
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadDate();
    loadNavigation();
    loadNewsTicker();
    loadCategoriesForMenu();
    loadInfoSettings();
    setupModals();
    initMobileMenuListeners(); // Initialize mobile menu listeners

    // Check if we're on a category page
    const pathArray = window.location.pathname.split('/');
    const isCategoryPage = pathArray[1] === 'category' && pathArray[2];
    
    // Content Loading
    if (isCategoryPage) {
        // Load articles for specific category
        const categorySlug = pathArray[2];
        loadCategoryArticles(categorySlug);
    } else if (window.innerWidth <= 768) {
        // Mobile: Show mobile layout and hide grid layout
        const mobileLayout = document.querySelector('.mobile-layout');
        const gridLayout = document.querySelector('.news-grid-layout');
        if (mobileLayout) mobileLayout.style.display = 'block';
        if (gridLayout) gridLayout.style.display = 'none';
        loadMobileLayout(); // Mobile layout
    } else {
        // Desktop: Show grid layout and hide mobile layout
        const mobileLayout = document.querySelector('.mobile-layout');
        const gridLayout = document.querySelector('.news-grid-layout');
        if (mobileLayout) mobileLayout.style.display = 'none';
        if (gridLayout) gridLayout.style.display = 'grid';
        loadFeedArticles(); // Middle (Desktop)
        loadFeaturedHeadlines(); // Right news feed
        loadHotNews(); // Right
        loadTrending(); // Right Widget
        
        // Initialize scroll detection for desktop columns
        initDesktopColumnScrollDetection();
    }
    
    // Load ads after main content (deferred for performance)
    requestIdleCallback ? requestIdleCallback(() => loadAds()) : setTimeout(() => loadAds(), 1500);
});

function renderFeedMeta(article) {
    return `
        <span class="meta-date">${timeAgo(article.published_at, article.created_at)}</span>
        ${article.author ? `<span class="meta-author"> • ${article.author}</span>` : ''}
    `;
}

function toggleMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenu.style.display === 'block') {
        mobileMenu.style.display = 'none';
        document.body.style.overflow = 'auto';
    } else {
        mobileMenu.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function closeMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    mobileMenu.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Desktop Column Scroll Detection - Hide header/ad when scrolling in columns, keep ticker at top
function initDesktopColumnScrollDetection() {
    const topBar = document.querySelector('.top-bar');
    const mainHeader = document.querySelector('.main-header');
    const headerAdWrapper = document.querySelector('.header-ad-wrapper');
    const body = document.body;
    const colLeft = document.querySelector('.col-left');
    const colMiddle = document.querySelector('.col-middle');
    const colRight = document.querySelector('.col-right');
    const mainContainer = document.querySelector('.main-container');
    
    if (!colLeft || !colMiddle || !colRight) return;
    
    let headerHidden = false;
    
    const hideHeader = () => {
        if (!headerHidden) {
            topBar?.classList.add('hidden');
            mainHeader?.classList.add('hidden');
            headerAdWrapper?.classList.add('hidden');
            body.style.paddingTop = '0';
            if (mainContainer) {
                mainContainer.style.paddingTop = '50px'; // Ticker height
            }
            headerHidden = true;
        }
    };
    
    const showHeader = () => {
        if (headerHidden) {
            topBar?.classList.remove('hidden');
            mainHeader?.classList.remove('hidden');
            headerAdWrapper?.classList.remove('hidden');
            body.style.paddingTop = '';
            if (mainContainer) {
                mainContainer.style.paddingTop = '50px'; // Always 50px for ticker
            }
            headerHidden = false;
        }
    };
    
    // Listen to scroll on left column (News Feed)
    colLeft.addEventListener('scroll', () => {
        if (colLeft.scrollTop > 20) {
            hideHeader();
        } else {
            showHeader();
        }
    });
    
    // Listen to scroll on middle column (Main content)
    colMiddle.addEventListener('scroll', () => {
        if (colMiddle.scrollTop > 20) {
            hideHeader();
        } else {
            showHeader();
        }
    });
    
    // Listen to scroll on right column (Trending)
    colRight.addEventListener('scroll', () => {
        if (colRight.scrollTop > 20) {
            hideHeader();
        } else {
            showHeader();
        }
    });
}

// Load articles for a specific category
async function loadCategoryArticles(categorySlug) {
    try {
        // First, get the category by slug to get its ID
        const categoriesResponse = await fetch(`${API_BASE}/categories`);
        const categoriesData = await categoriesResponse.json();
        const category = categoriesData.categories?.find(c => c.slug === categorySlug);
        
        if (!category) {
            const container = document.getElementById('styles-social-feed');
            if (container) {
                container.innerHTML = '<p style="padding:20px; text-align:center; color:var(--text-muted);">Category not found.</p>';
            }
            return;
        }
        
        // Now fetch articles for this category
        const response = await fetch(`${API_BASE}/articles?category=${category.id}&status=published&limit=50`);
        const data = await response.json();
        
        // Determine layout
        if (window.innerWidth <= 768) {
            // Mobile layout - use the mobile-layout container
            const mobileLayout = document.querySelector('.mobile-layout');
            const gridLayout = document.querySelector('.news-grid-layout');
            
            if (mobileLayout) {
                mobileLayout.style.display = 'block';
                if (gridLayout) gridLayout.style.display = 'none';
                
                // Clear mobile layout
                mobileLayout.innerHTML = '';
                
                // Display category title at the top
                const categoryTitle = document.createElement('div');
                categoryTitle.style.padding = '15px 10px';
                categoryTitle.style.borderBottom = '2px solid var(--primary)';
                categoryTitle.style.marginBottom = '15px';
                categoryTitle.innerHTML = `<h2 style="margin: 0; color: var(--primary); font-size: 1.2em;">${category.name}</h2>`;
                mobileLayout.appendChild(categoryTitle);
                
                // Create articles container
                const articlesContainer = document.createElement('section');
                articlesContainer.id = 'mobileArticlesList';
                articlesContainer.style.margin = '0';
                mobileLayout.appendChild(articlesContainer);
                
                // Load articles
                if (data.articles && data.articles.length > 0) {
                    loadMobileCategoryPageArticles(data.articles, articlesContainer);
                } else {
                    articlesContainer.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:20px;">यस वर्गमा कुनै समाचार उपलब्ध छैन</p>';
                }
            } else {
                console.error('mobile-layout container not found');
            }
        } else {
            // Desktop layout
            const mobileLayout = document.querySelector('.mobile-layout');
            const gridLayout = document.querySelector('.news-grid-layout');
            if (mobileLayout) mobileLayout.style.display = 'none';
            if (gridLayout) gridLayout.style.display = 'grid';
            
            // Add category title to top
            const container = document.querySelector('.col-middle');
            if (container) {
                const categoryTitle = document.createElement('div');
                categoryTitle.style.padding = '15px 0';
                categoryTitle.style.borderBottom = '2px solid var(--primary)';
                categoryTitle.style.marginBottom = '20px';
                categoryTitle.innerHTML = `<h2 style="margin: 0; color: var(--primary);">${category.name}</h2>`;
                container.insertBefore(categoryTitle, container.firstChild);
            }
            
            // Load desktop articles
            if (data.articles && data.articles.length > 0) {
                const feedContainer = document.getElementById('styles-social-feed');
                if (feedContainer) {
                    feedContainer.innerHTML = renderArticlesHtml(data.articles);
                }
            } else {
                document.getElementById('styles-social-feed').innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:20px;">यस वर्गमा कुनै समाचार उपलब्ध छैन</p>';
            }
        }
    } catch (e) {
        console.error('Error loading category articles:', e);
        const container = document.getElementById('styles-social-feed');
        if (container) {
            container.innerHTML = '<p style="text-align:center; color:var(--text-danger,#b00020); padding:20px;">Error loading category articles. Please try again later.</p>';
        }
    }
}

// Close menu when clicking on links
function initMobileMenuListeners() {
    const mobileMenu = document.getElementById('mobileMenu');
    if (!mobileMenu) return;
    
    // Close menu when clicking on any link inside
    const links = mobileMenu.querySelectorAll('a');
    links.forEach(link => {
        link.addEventListener('click', closeMenu);
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        const menuToggleBtn = document.getElementById('menuToggleBtn');
        if (mobileMenu.style.display === 'block' && 
            !mobileMenu.contains(e.target) && 
            !menuToggleBtn.contains(e.target)) {
            closeMenu();
        }
    });
}

// Utility: Relative time formatter
// Utility: Relative time formatter
function timeAgo(dateString, createdDateString) {
    // If dateString (published_at) is missing or from 1970 (Unix epoch start), try created_at
    let date = new Date(dateString);
    const now = new Date();

    // Check if date is invalid or evidently default Unix epoch (often 1970-01-01 when null/0)
    // 1970 check: if year is 1970, it's likely a default value for null
    if (!dateString || isNaN(date.getTime()) || date.getFullYear() === 1970) {
        if (createdDateString) {
            date = new Date(createdDateString);
        } else {
            return '';
        }
    }

    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'just now';

    const intervals = [
        { label: 'year', seconds: 31536000 },
        { label: 'month', seconds: 2592000 },
        { label: 'day', seconds: 86400 },
        { label: 'hour', seconds: 3600 },
        { label: 'minute', seconds: 60 }
    ];

    for (const interval of intervals) {
        const count = Math.floor(seconds / interval.seconds);
        if (count >= 1) {
            return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
        }
    }
    return 'just now';
}

// Enhanced header/footer scroll logic
function initHeaderScroll() {
    let lastScrollY = window.scrollY;
    const topBar = document.querySelector('.top-bar');
    const mainHeader = document.querySelector('.main-header');
    const headerAdWrapper = document.querySelector('.header-ad-wrapper');
    const tickerWrap = document.querySelector('.ticker-wrap');
    const newsGridLayout = document.querySelector('.news-grid-layout');

    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;

        // Hide immediately on scroll down (if scrolled more than 10px to avoid jitter)
        if (currentScrollY > lastScrollY && currentScrollY > 10) {
            topBar.classList.add('hidden');
            mainHeader.classList.add('hidden');
            if (headerAdWrapper) headerAdWrapper.style.display = 'none';
            // Adjust ticker to stick at top when header is hidden
            if (tickerWrap) {
                tickerWrap.style.position = 'fixed';
                tickerWrap.style.top = '0';
                tickerWrap.style.zIndex = '999';
            }
            // Adjust grid layout to stick below ticker when headers are hidden
            if (newsGridLayout) {
                newsGridLayout.style.top = 'calc(50px + 24px)';
            }
        } else {
            // Show on scroll up
            topBar.classList.remove('hidden');
            mainHeader.classList.remove('hidden');
            if (headerAdWrapper) headerAdWrapper.style.display = 'flex';
            // Reset ticker to sticky positioning
            if (tickerWrap) {
                tickerWrap.style.position = 'sticky';
                tickerWrap.style.top = 'var(--topbar-height)';
            }
            // Reset grid layout positioning
            if (newsGridLayout) {
                newsGridLayout.style.top = 'calc(var(--topbar-height) + var(--main-header-height) + 50px)';
            }
        }
        lastScrollY = currentScrollY;
    });
}
// Initialize scroll logic
initHeaderScroll();

// Mobile Header Ad Scroll Hide Effect
function initMobileHeaderAdScroll() {
    const mobileHeaderAdContainer = document.getElementById('mobileHeaderAdContainer');
    if (!mobileHeaderAdContainer || window.innerWidth > 768) return;

    let lastScrollY = window.scrollY;

    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;

        // Hide on scroll down (scrolled more than 20px)
        if (currentScrollY > lastScrollY && currentScrollY > 20) {
            mobileHeaderAdContainer.classList.add('hidden-scroll');
        } else {
            // Show on scroll up or near top
            mobileHeaderAdContainer.classList.remove('hidden-scroll');
        }
        lastScrollY = currentScrollY;
    });
}

// Initialize mobile header ad scroll after a short delay
setTimeout(() => initMobileHeaderAdScroll(), 500);

// Theme
function initTheme() {
    const toggle = document.getElementById('themeToggle');
    const mobileToggle = document.getElementById('mobileThemeToggle');
    let currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    const updateToggleText = () => {
        const text = currentTheme === 'dark' ? 'Light Mode' : 'Dark Mode';
        if (toggle) toggle.textContent = text;
        if (mobileToggle) {
            mobileToggle.innerHTML = `
                <svg class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    ${currentTheme === 'dark' 
                        ? '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>'
                        : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>'
                    }
                </svg>
                <span>${text}</span>
            `;
        }
    };
    updateToggleText();

    const handleThemeChange = () => {
        currentTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', currentTheme);
        localStorage.setItem('theme', currentTheme);
        updateToggleText();
    };

    toggle?.addEventListener('click', handleThemeChange);
    mobileToggle?.addEventListener('click', handleThemeChange);
}

// Date
function loadDate() {
    // Use Bikram Sambat calendar for Nepal
    if (typeof BikramSambat !== 'undefined') {
        const bsDate = BikramSambat.today('long');
        const tickerDateElement = document.getElementById('tickerDate');
        if (tickerDateElement) {
            tickerDateElement.textContent = bsDate;
        }
    } else {
        // Fallback to Gregorian if BikramSambat not available
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateText = new Date().toLocaleDateString('ne-NP', dateOptions);
        const tickerDateElement = document.getElementById('tickerDate');
        if (tickerDateElement) {
            tickerDateElement.textContent = dateText;
        }
    }
}

// Navigation
async function loadNavigation() {
    try {
        const response = await fetch(`${API_BASE}/navigation`);
        const data = await response.json();

        const topNavList = document.getElementById('topNavList');
        const mobileNav = document.getElementById('mobileNavList');

        const createLink = (item) => `<li><a href="${item.url}">${item.label}</a></li>`;

        const html = data.items.map(createLink).join('');
        const homeLink = `<li><a href="/">Home</a></li>`;

        // Base links
        let fullNavHtml = homeLink + html;

        // Categories in top nav
        try {
            const catResponse = await fetch(`${API_BASE}/categories?limit=5`);
            const catData = await catResponse.json();
            if (catData.categories && catData.categories.length > 0) {
                const catHtml = catData.categories.map(cat =>
                    `<li><a href="/category/${cat.slug}">${cat.name}</a></li>`
                ).join('');
                fullNavHtml += catHtml;
            }
        } catch (e) { console.error('Categories in nav error', e); }

        // Add About and Contact
        fullNavHtml += `
            <li><a href="#" onclick="openModal('aboutModal'); return false;">About</a></li>
            <li><a href="#" onclick="openModal('contactModal'); return false;">Contact</a></li>
        `;

        topNavList.innerHTML = fullNavHtml;
        mobileNav.innerHTML = fullNavHtml;

    } catch (e) {
        console.error('Nav error', e);
    }
}

// Load Categories for Mobile Menu and new Nav logic
async function loadCategoriesForMenu() {
    try {
        const response = await fetch(`${API_BASE}/categories`);
        const data = await response.json();
        // Only for mobile menu if needed, or if we decide to put categories differently
        const mobileCatList = document.getElementById('mobileCatList');
        // Left category list is GONE in new design, so we don't need to populate #categoryList

        if (data.categories && data.categories.length > 0) {
            const html = data.categories.map(cat =>
                `<li style="margin-bottom: 8px;"><a href="/category/${cat.slug}" style="text-decoration: none; color: var(--primary); font-weight: 500;">${cat.name}</a></li>`
            ).join('');

            if (mobileCatList) mobileCatList.innerHTML = html;
        }
    } catch (e) {
        console.error('Categories error:', e);
    }
}

// Modal Logic
function setupModals() {
    const aboutModal = document.getElementById('aboutModal');
    const contactModal = document.getElementById('contactModal');
    const closeBtns = document.querySelectorAll('.close-modal');

    closeBtns.forEach(btn => {
        btn.onclick = function () {
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).style.display = "none";
        }
    });

    window.onclick = function (event) {
        if (event.target == aboutModal) {
            aboutModal.style.display = "none";
        }
        if (event.target == contactModal) {
            contactModal.style.display = "none";
        }
    }
}

function openModal(modalId) {
    document.getElementById(modalId).style.display = "block";
}

// Load About and Contact Info
async function loadInfoSettings() {
    try {
        const response = await fetch(`${API_BASE}/settings/public`);
        const data = await response.json();

        const aboutText = data.settings?.find(s => s.key === 'about_content')?.value || data.settings?.find(s => s.key === 'about_info')?.value || 'Routine of Dhulikhel News';
        const contactText = data.settings?.find(s => s.key === 'contact_content')?.value || data.settings?.find(s => s.key === 'contact_info')?.value || 'rodb.dhulikhel@gmail.com';

        const mobileAbout = document.getElementById('mobileAbout');
        const mobileContact = document.getElementById('mobileContact');

        if (mobileAbout) mobileAbout.textContent = aboutText;
        if (mobileContact) mobileContact.textContent = contactText;

        // Populate Modals
        const aboutModalContent = document.getElementById('aboutModalContent');
        const contactModalContent = document.getElementById('contactModalContent');
        if (aboutModalContent) aboutModalContent.innerHTML = `<p>${aboutText}</p>`;
        if (contactModalContent) contactModalContent.innerHTML = `<p>${contactText}</p>`;
    } catch (e) {
        console.error('Settings error:', e);
    }
}

// Ticker
async function loadNewsTicker() {
    try {
        // Load from journalist API public endpoint (live ticker items only)
        let items = [];
        try {
            const response = await fetch(`/api/journalist/news-ticker/public/active`);
            if (response.ok) {
                const data = await response.json();
                items = data.items?.map(i => ({
                    text: i.title,
                    link: i.link_url
                })) || [];
            }
        } catch (e) {
            console.log('Ticker API not available');
        }

        const tickerElement = document.getElementById('newsTicker');
        
        if (items.length > 0) {
            // Create scrolling ticker HTML with links
            const html = items.map((item, idx) => 
                `<span class="ticker-item" onclick="${item.link ? `window.location.href='${item.link}'` : ''};" style="${item.link ? 'cursor:pointer;' : ''}">
                    ${item.text}
                </span>`
            ).join(' • ');
            
            const tickerItemsContainer = document.getElementById('tickerItems');
            // Add items multiple times for seamless loop effect
            tickerItemsContainer.innerHTML = html + ' • ' + html + ' • ' + html;

            // Show ticker with visible class
            tickerElement.classList.add('visible');
        } else {
            // Hide ticker if no items
            tickerElement.classList.remove('visible');
        }

    } catch (e) {
        console.error('Ticker error:', e);
        const tickerElement = document.getElementById('newsTicker');
        if (tickerElement) {
            tickerElement.classList.remove('visible');
        }
    }
}

// Ads
// Helper function to render ad creative (supports photo, GIF, and video)
function renderAdCreative(ad, isMobile = false) {
    const isVideo = ad.image_url && (ad.image_url.endsWith('.mp4') || ad.image_url.endsWith('.webm'));
    const isGif = ad.image_url && ad.image_url.endsWith('.gif');
    
    let creative = '';
    
    if (isVideo) {
        // Muted autoplay video
        creative = `
            <video 
                style="max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; display: block; border-radius: 6px;"
                autoplay 
                muted 
                loop
                playsinline
                controls="false">
                <source src="${ad.image_url}" type="video/mp4">
            </video>
        `;
    } else {
        // Photo or GIF (GIF will animate automatically)
        creative = `
            <img 
                src="${ad.image_url}" 
                style="max-width: 100%; max-height: 100%; width: auto; height: auto; display: block; border-radius: 6px; object-fit: contain;" 
                alt="${ad.name}"
                loading="lazy">
        `;
    }
    
    return creative;
}

// Close ad function
function closeAd(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'none';
    }
}

// Track ad impression
async function trackAdImpression(adId) {
    try {
        await fetch(`${API_BASE}/ads/${adId}/impression`, { method: 'POST' });
    } catch (e) {
        console.error('Failed to track impression:', e);
    }
}

// Track ad click
async function trackAdClick(adId, url) {
    try {
        await fetch(`${API_BASE}/ads/${adId}/click`, { method: 'POST' });
        window.open(url, '_blank');
    } catch (e) {
        console.error('Failed to track click:', e);
        window.open(url, '_blank');
    }
}

async function loadAds() {
    try {
        const response = await fetch(`${API_BASE}/ads`);
        const data = await response.json();

        if (!data.ads || data.ads.length === 0) {
            console.log('No ads available');
            return;
        }

        // Group ads by placement
        const adsByPlacement = {
            'header': [],
            'content_top': [],
            'content_bottom': [],
            'mobile_sticky': []
        };

        data.ads.forEach(ad => {
            if (adsByPlacement[ad.placement]) {
                adsByPlacement[ad.placement].push(ad);
            }
        });

        // Function to get random ad from array
        const getRandomAd = (ads) => {
            if (!ads || ads.length === 0) return null;
            return ads[Math.floor(Math.random() * ads.length)];
        };

        const isMobile = window.innerWidth <= 768;

        // ===== DESKTOP ADS =====
        if (!isMobile) {
            // Header Ad - 728x90 (Leaderboard) or 970x90
            const headerAd = getRandomAd(adsByPlacement.header);
            if (headerAd) {
                const container = document.getElementById('ad_header');
                if (container) {
                    container.innerHTML = `
                        <div style="position: relative; display: flex; justify-content: center; align-items: center; width: 100%; height: 64px; max-height: 64px; background: transparent; border-radius: 0; padding: 0; cursor: pointer; transition: all 0.3s ease; overflow: hidden;" 
                             onclick="trackAdClick('${headerAd.id}', '${headerAd.link_url}'); return false;">
                            ${renderAdCreative(headerAd, false)}
                            <button style="position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,0.6); color: white; border: none; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; padding: 0; z-index: 10;" onclick="event.stopPropagation(); closeAd('ad_header');">×</button>
                        </div>
                    `;
                    trackAdImpression(headerAd.id);
                }
            }

            // Left Sidebar Ad - 300x250 or 336x280
            const leftAd = getRandomAd(adsByPlacement.content_top);
            if (leftAd) {
                const container = document.getElementById('ad_left');
                if (container) {
                    container.innerHTML = `
                        <div style="position: relative; background: var(--bg-body); border-radius: 6px; padding: 8px; cursor: pointer; transition: all 0.3s ease; overflow: hidden; max-height: 400px; display: flex; align-items: center; justify-content: center;" 
                             onclick="trackAdClick('${leftAd.id}', '${leftAd.link_url}'); return false;">
                            ${renderAdCreative(leftAd, false)}
                            <button style="position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,0.6); color: white; border: none; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; padding: 0;" onclick="event.stopPropagation(); closeAd('ad_left');">×</button>
                        </div>
                    `;
                    trackAdImpression(leftAd.id);
                }
            }

            // Right Sidebar Ad - 300x250
            // Note: Only load top-right ad (ad_right_before_trending) to avoid duplicate content_bottom placements
            // ad_right slot remains empty since we only have 2 content placements


            // Right Ad Before Trending - 300x250
            const rightAdBeforeTrending = getRandomAd(adsByPlacement.content_bottom);
            if (rightAdBeforeTrending) {
                const container = document.getElementById('ad_right_before_trending');
                if (container) {
                    container.innerHTML = `
                        <div style="position: relative; background: var(--bg-body); border-radius: 6px; padding: 8px; cursor: pointer; transition: all 0.3s ease; overflow: hidden; max-height: 400px; display: flex; align-items: center; justify-content: center;" 
                             onclick="trackAdClick('${rightAdBeforeTrending.id}', '${rightAdBeforeTrending.link_url}'); return false;">
                            ${renderAdCreative(rightAdBeforeTrending, false)}
                            <button style="position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,0.6); color: white; border: none; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; padding: 0;" onclick="event.stopPropagation(); closeAd('ad_right_before_trending');">×</button>
                        </div>
                    `;
                    trackAdImpression(rightAdBeforeTrending.id);
                }
            }
        } else {
            // ===== MOBILE ADS =====
            // Hide desktop ads on mobile
            const adHeader = document.getElementById('ad_header');
            const adLeft = document.getElementById('ad_left');
            const adRight = document.getElementById('ad_right');
            const adRightBeforeTrending = document.getElementById('ad_right_before_trending');
            
            if (adHeader) adHeader.style.display = 'none';
            if (adLeft) adLeft.style.display = 'none';
            if (adRight) adRight.style.display = 'none';
            if (adRightBeforeTrending) adRightBeforeTrending.style.display = 'none';

            // Load mobile home page ads
            loadMobileHomePageAds();
        }

    } catch (e) {
        console.error('Ads error', e);
    }
}

// Load Middle Feed (Social Style with Image Overlay)
async function loadFeedArticles() {
    try {
        // Load full set of released/published articles into center feed
        // Fetch center feed: request articles sorted by published_at descending
        const response = await fetch(`${API_BASE}/articles?limit=${mainPageSize}&offset=${currentPage * mainPageSize}&status=published`);
        const data = await response.json();
        const container = document.getElementById('styles-social-feed');

        if (!container) {
            console.error('Middle feed container #styles-social-feed not found in DOM');
            return;
        }

        if (!data || !data.articles || data.articles.length === 0) {
            // record fetch count
            lastFetchCount = 0;
            if (currentPage === 0) {
                container.innerHTML = '<p style="padding:20px; text-align:center; color:var(--text-muted);">No articles available right now.</p>';
            }
            return;
        }

        // track counts for Load More behavior
        lastFetchCount = data.articles.length;
        totalLoaded += data.articles.length;

        // Render logic with mobile interleaving
        let html = '';
        const isMobile = window.innerWidth <= 768;

        if (isMobile && currentPage === 0) {
            // First 2 articles
            const firstBatch = data.articles.slice(0, 2);
            const restBatch = data.articles.slice(2);

            html += renderArticlesHtml(firstBatch);

            // Inject placeholder for Trending News (will be populated by loadTrending)
            html += `<div id="mobile-trending-placeholder" class="mobile-trending-container" style="margin: 20px 0; padding: 15px; background: var(--bg-card); border-top: 2px solid var(--primary); border-bottom: 2px solid var(--primary);">
                        <h3 style="margin-top: 0; margin-bottom: 15px; color: var(--primary);">Trending Now</h3>
                        <div id="mobileTrendingList"></div>
                     </div>`;

            // Rest of the articles split into batches with ads interspersed
            const batchSize = 4;
            for (let i = 0; i < restBatch.length; i += batchSize) {
                const batch = restBatch.slice(i, i + batchSize);
                html += renderArticlesHtml(batch);
                
                // Add ad after every 4 articles (except at the end)
                if (i + batchSize < restBatch.length) {
                    const adNum = Math.floor(i / batchSize) + 1;
                    html += `<div id="mobile-middle-ad-${adNum}" class="mobile-middle-ad" style="margin: 20px 0; padding: 8px; text-align: center; min-height: 300px; background: var(--bg-body); display: none; align-items: center; justify-content: center; border-radius: 6px; position: relative;"></div>`;
                }
            }

            // Trigger loading content
            setTimeout(() => {
                loadTrendingForMobile();
                loadMobileFeedAds();
            }, 100);

        } else if (!isMobile && currentPage === 0) {
            // Desktop: render all articles with ads interspersed in the middle feed
            const articles = data.articles;
            const batchSize = 5;
            
            for (let i = 0; i < articles.length; i += batchSize) {
                const batch = articles.slice(i, i + batchSize);
                html += renderArticlesHtml(batch);
                
                // Add ad after every 5 articles (except at the end)
                if (i + batchSize < articles.length) {
                    const adNum = Math.floor(i / batchSize) + 1;
                    html += `<div id="middle-feed-ad-${adNum}" class="middle-feed-ad" style="margin: 30px 0; padding: 8px; text-align: center; min-height: 280px; background: var(--bg-body); display: none; align-items: center; justify-content: center; border-radius: 6px; position: relative;"></div>`;
                }
            }
            
            // Trigger loading ads for middle feed
            setTimeout(() => {
                loadMiddleFeedAds();
            }, 100);
        } else {
            // Subsequent pages: render all normally with ads
            const articles = data.articles;
            const batchSize = 5;
            
            for (let i = 0; i < articles.length; i += batchSize) {
                const batch = articles.slice(i, i + batchSize);
                html += renderArticlesHtml(batch);
                
                if (i + batchSize < articles.length) {
                    const adNum = Math.floor(i / batchSize) + 1;
                    html += `<div id="middle-feed-ad-page${currentPage}-${adNum}" class="middle-feed-ad" style="margin: 30px 0; padding: 8px; text-align: center; min-height: 280px; background: var(--bg-body); display: none; align-items: center; justify-content: center; border-radius: 6px; position: relative;"></div>`;
                }
            }
            
            setTimeout(() => {
                if (window.innerWidth <= 768) {
                    loadMobileFeedAds();
                } else {
                    loadMiddleFeedAds();
                }
            }, 100);
        }

        if (currentPage === 0) container.innerHTML = html;
        else container.insertAdjacentHTML('beforeend', html);

    } catch (e) {
        console.error('Error loading feed:', e);
        const container = document.getElementById('styles-social-feed');
        if (container) container.innerHTML = '<div class="feed-error" style="padding:20px; text-align:center; color:var(--text-danger,#b00020);">Failed to load articles. Please try again later.</div>';
    }
}

// Helper to render articles HTML
function renderArticlesHtml(articles) {
    return articles.map(article => {
        // Check if it's a data URL (base64)
        const isDataUrl = article.featured_image_url && article.featured_image_url.startsWith('data:');
        const imageUrl = isDataUrl ? article.featured_image_url : optimizeImageUrl(article.featured_image_url, 1200);
        
        // Safe summary extraction
        let summaryText = '';
        if (article.summary) {
            summaryText = article.summary;
        } else if (typeof article.body === 'string') {
            summaryText = article.body.substring(0, 120).replace(/<[^>]*>/g, '') + '...';
        }
        
        return `
        <div class="feed-item-wrapper">
            <a href="/article.html?slug=${article.slug}" class="feed-card" style="text-decoration: none; color: inherit;">
                ${article.featured_image_url ?
                `<div class="feed-card-image-container">
                    <img src="${imageUrl}" 
                         ${!isDataUrl ? `srcset="${optimizeImageUrl(article.featured_image_url, 600)} 600w, ${optimizeImageUrl(article.featured_image_url, 1200)} 1200w"` : ''}
                         alt="${article.headline}" 
                         loading="lazy"
                         style="width: 100%; height: 100%; object-fit: contain;">
                    <div class="feed-card-overlay">
                        <h2 style="margin: 0; color: white;">
                            ${article.headline}
                        </h2>
                        <div class="feed-summary" style="color: rgba(255,255,255,0.95);">
                            ${summaryText}
                        </div>
                    </div>
                </div>` :
                `<div style="height: 300px; background: linear-gradient(135deg, var(--primary), var(--primary-dark)); display: flex; align-items: center; justify-content: center; padding: 20px; border-radius: 4px;">
                    <div style="text-align: center; color: white;">
                        <h3 style="margin: 0 0 10px 0; font-size: 1.1em; font-weight: 700; line-height: 1.4;">
                            ${article.headline}
                        </h3>
                        <div style="font-size: 0.9em; line-height: 1.45; opacity: 0.95;">
                            ${summaryText}
                        </div>
                    </div>
                </div>`}
                
                <div class="feed-content">
                    <h3 class="feed-title">${article.headline}</h3>
                    <div class="feed-meta">
                        ${timeAgo(article.published_at, article.created_at)}
                    </div>
                </div>
            </a>
        </div>`;
    }).join('');
}

// Special function to load trending into mobile placeholder
async function loadTrendingForMobile() {
    const mobileContainer = document.getElementById('mobileTrendingList');
    if (!mobileContainer) return;

    try {
        // First try to load from admin settings (same as desktop)
        const settingsResponse = await fetch(`${API_BASE}/settings/public`);
        const settingsData = await settingsResponse.json();
        const trendingSetting = settingsData.settings?.find(s => s.key === 'trending_articles');

        if (trendingSetting && trendingSetting.value && trendingSetting.value.trim()) {
            // Load specific articles from IDs - show all configured trending articles
            const articleIds = trendingSetting.value.split('\n').map(id => id.trim()).filter(Boolean);
            if (articleIds.length > 0) {
                const articles = [];
                const seenIds = new Set();
                for (const id of articleIds) {
                    if (seenIds.has(id)) continue;
                    try {
                        const response = await fetch(`${API_BASE}/articles/${id}`);
                        const data = await response.json();
                        if (data.article && data.article.status === 'published') {
                            articles.push(data.article);
                            seenIds.add(id);
                        }
                    } catch (e) {
                        console.error('Error loading article for mobile trending:', id, e);
                    }
                }

                if (articles.length > 0) {
                    const html = articles.map((article, idx) => `
                        <div class="trending-item" style="border-bottom: 1px solid var(--border); padding: 10px 0; display: flex; gap: 10px; align-items: flex-start;">
                            <div style="font-weight: bold; color: var(--primary); font-size: 1.1em; min-width: 20px;">▸</div>
                            <div class="trending-item-content">
                                <a href="/article.html?slug=${article.slug}" style="text-decoration: none; color: inherit;">
                                    <div class="trending-item-title" style="font-weight: 500;">${article.headline}</div>
                                </a>
                            </div>
                        </div>
                    `).join('');
                    mobileContainer.innerHTML = html;
                    return;
                }
            }
        }

        // No articles configured - show message instead of fallback
        mobileContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 10px;">No trending articles configured</p>';
    } catch (e) {
        console.error('Mobile trending error', e);
    }
}

// Load random ad for mobile feed
async function loadMobileFeedAd() {
    try {
        const response = await fetch(`${API_BASE}/ads`);
        const data = await response.json();
        if (data.ads && data.ads.length > 0) {
            // Get random ad
            const ad = data.ads[Math.floor(Math.random() * data.ads.length)];
            const container = document.getElementById('mobile-ad-placeholder');
            if (container) {
                container.innerHTML = `
                    <a href="${ad.link_url}" target="_blank" style="display: block; width: 100%;" onclick="fetch('${API_BASE}/ads/${ad.id}/click', {method: 'POST'})">
                        <img src="${ad.image_url}" style="width: 100%; height: auto; max-width: 100%; object-fit: contain; border-radius: 6px;" alt="${ad.name}">
                    </a>
                `;
                // Track impression
                fetch(`${API_BASE}/ads/${ad.id}/impression`, { method: 'POST' });
            }
        }
    } catch (e) {
        console.error('Ad load error', e);
    }
}

// Load multiple ads for mobile middle feed (300x250)
async function loadMobileFeedAds() {
    try {
        const response = await fetch(`${API_BASE}/ads`);
        const data = await response.json();
        
        if (!data.ads || data.ads.length === 0) return;

        // Get ads from content_top and content_bottom placements
        const adsByPlacement = {
            'content_top': [],
            'content_bottom': []
        };

        data.ads.forEach(ad => {
            if (adsByPlacement[ad.placement]) {
                adsByPlacement[ad.placement].push(ad);
            }
        });

        const allAds = [...adsByPlacement.content_top, ...adsByPlacement.content_bottom];
        if (allAds.length === 0) return;

        // Fill all mobile-middle-ad containers
        document.querySelectorAll('[id^="mobile-middle-ad-"]').forEach((container, index) => {
            const ad = allAds[index % allAds.length];
            if (ad) {
                container.style.display = 'flex'; // Show container only if ad exists
                container.innerHTML = `
                    <span style="position: absolute; top: 8px; left: 8px; background: var(--primary); color: white; padding: 2px 6px; font-size: 0.7em; font-weight: bold; border-radius: 3px;">AD</span>
                    <div style="position: relative; display: flex; justify-content: center; align-items: center; width: 100%; height: 100%; cursor: pointer;" onclick="trackAdClick('${ad.id}', '${ad.link_url}'); return false;">
                        ${renderAdCreative(ad, true)}
                        <button style="position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.6); color: white; border: none; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; padding: 0;" onclick="event.stopPropagation(); this.closest('[id^=mobile-middle-ad]').style.display='none';">×</button>
                    </div>
                `;
                trackAdImpression(ad.id);
            }
        });
    } catch (e) {
        console.error('Mobile feed ads error:', e);
    }
}

// Load ads for desktop middle feed (336x280 or similar)
async function loadMiddleFeedAds() {
    try {
        const response = await fetch(`${API_BASE}/ads`);
        const data = await response.json();
        
        if (!data.ads || data.ads.length === 0) return;

        // Get ads from content_top and content_bottom placements
        const adsByPlacement = {
            'content_top': [],
            'content_bottom': []
        };

        data.ads.forEach(ad => {
            if (adsByPlacement[ad.placement]) {
                adsByPlacement[ad.placement].push(ad);
            }
        });

        const allAds = [...adsByPlacement.content_top, ...adsByPlacement.content_bottom];
        if (allAds.length === 0) return;

        // Fill all middle-feed-ad containers
        document.querySelectorAll('[id^="middle-feed-ad"]').forEach((container, index) => {
            const ad = allAds[index % allAds.length];
            if (ad) {
                container.style.display = 'flex'; // Show container only if ad exists
                container.innerHTML = `
                    <span style="position: absolute; top: 8px; left: 8px; background: var(--primary); color: white; padding: 2px 6px; font-size: 0.7em; font-weight: bold; border-radius: 3px;">AD</span>
                    <div style="position: relative; display: flex; justify-content: center; align-items: center; width: 100%; height: 100%; max-height: 350px; cursor: pointer; border-radius: 6px; overflow: hidden; background: var(--bg-body);" onclick="trackAdClick('${ad.id}', '${ad.link_url}'); return false;">
                        ${renderAdCreative(ad, false)}
                        <button style="position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.6); color: white; border: none; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; padding: 0; z-index: 10;" onclick="event.stopPropagation(); this.closest('[id^=middle-feed-ad]').style.display='none';">×</button>
                    </div>
                `;
                trackAdImpression(ad.id);
            }
        });
    } catch (e) {
        console.error('Middle feed ads error:', e);
    }
}

// Load ads for mobile home page (above trending news and after hot news)
async function loadMobileHomePageAds() {
    try {
        const response = await fetch(`${API_BASE}/ads`);
        const data = await response.json();
        
        if (!data.ads || data.ads.length === 0) return;

        // Get ads from all placements
        const adsByPlacement = {
            'header': [],
            'content_top': [],
            'content_bottom': [],
            'mobile_sticky': []
        };

        data.ads.forEach(ad => {
            if (adsByPlacement[ad.placement]) {
                adsByPlacement[ad.placement].push(ad);
            }
        });

        // Get random ads
        const getRandomAd = (ads) => {
            if (!ads || ads.length === 0) return null;
            return ads[Math.floor(Math.random() * ads.length)];
        };

        // Mobile Sticky Bottom Ad (320x50px mobile sticky)
        const stickyAd = getRandomAd(adsByPlacement.mobile_sticky);
        if (stickyAd && window.innerWidth <= 768) {
            let stickyContainer = document.getElementById('mobile-sticky-ad-container');
            if (!stickyContainer) {
                stickyContainer = document.createElement('div');
                stickyContainer.id = 'mobile-sticky-ad-container';
                stickyContainer.className = 'mobile-sticky-ad';
                document.body.appendChild(stickyContainer);
            }
            stickyContainer.onclick = () => trackAdClick(stickyAd.id, stickyAd.link_url);
            stickyContainer.style.cssText = 'position: fixed; bottom: 0; left: 0; right: 0; z-index: 100; max-height: 100px; background: var(--bg-body); border-top: 1px solid var(--border); padding: 8px; overflow: hidden; cursor: pointer;';
            stickyContainer.innerHTML = `
                <div style="position: relative; display: flex; align-items: center; justify-content: center; height: 100%;">
                    ${renderAdCreative(stickyAd, true)}
                    <button style="position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.6); color: white; border: none; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; padding: 0;" onclick="event.stopPropagation(); document.getElementById('mobile-sticky-ad-container').style.display='none';">×</button>
                </div>
            `;
            trackAdImpression(stickyAd.id);
        }

        // Ad before trending
        const adBeforeTrending = getRandomAd([...adsByPlacement.content_top, ...adsByPlacement.content_bottom]);
        if (adBeforeTrending) {
            const container = document.getElementById('mobile-ad-before-trending');
            if (container) {
                container.style.display = 'flex'; // Show container only if ad exists
                container.innerHTML = `
                    <span style="position: absolute; top: 8px; left: 8px; background: var(--primary); color: white; padding: 2px 6px; font-size: 0.7em; font-weight: bold; border-radius: 3px;">AD</span>
                    <div style="position: relative; display: flex; justify-content: center; align-items: center; width: 100%; height: 100%; cursor: pointer; border-radius: 6px; overflow: hidden;" onclick="trackAdClick('${adBeforeTrending.id}', '${adBeforeTrending.link_url}'); return false;">
                        ${renderAdCreative(adBeforeTrending, true)}
                        <button style="position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.6); color: white; border: none; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; padding: 0; z-index: 10;" onclick="event.stopPropagation(); document.getElementById('mobile-ad-before-trending').style.display='none';">×</button>
                    </div>
                `;
                trackAdImpression(adBeforeTrending.id);
            }
        }

        // Ad after hot news
        const adAfterHotNews = getRandomAd([...adsByPlacement.content_top, ...adsByPlacement.content_bottom]);
        if (adAfterHotNews) {
            const container = document.getElementById('mobile-ad-after-hotnews');
            if (container) {
                container.style.display = 'flex'; // Show container only if ad exists
                container.innerHTML = `
                    <span style="position: absolute; top: 8px; left: 8px; background: var(--primary); color: white; padding: 2px 6px; font-size: 0.7em; font-weight: bold; border-radius: 3px;">AD</span>
                    <div style="position: relative; display: flex; justify-content: center; align-items: center; width: 100%; height: 100%; cursor: pointer; border-radius: 6px; overflow: hidden;" onclick="trackAdClick('${adAfterHotNews.id}', '${adAfterHotNews.link_url}'); return false;">
                        ${renderAdCreative(adAfterHotNews, true)}
                        <button style="position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.6); color: white; border: none; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; padding: 0; z-index: 10;" onclick="event.stopPropagation(); document.getElementById('mobile-ad-after-hotnews').style.display='none';">×</button>
                    </div>
                `;
                trackAdImpression(adAfterHotNews.id);
            }
        }
    } catch (e) {
        console.error('Mobile home page ads error:', e);
    }
}

document.getElementById('loadMore')?.addEventListener('click', async () => {
    const btn = document.getElementById('loadMore');
    if (btn) {
        btn.disabled = true;
        btn.classList.remove('visible');
    }
    currentPage++;
    await loadFeedArticles();
    if (btn) {
        btn.disabled = false;
    }
    // Update scroll-related visibility
    window.dispatchEvent(new Event('scroll'));
});

// Load Left Headlines (Featured) - News Feed with Left Image, Right Content
async function loadFeaturedHeadlines() {
    try {
        const response = await fetch(`${API_BASE}/articles?featured=false&limit=12&status=published`);
        const data = await response.json();
        // Now populate the left-side feed container (previously right)
        const container = document.getElementById('leftNewsFeed'); // Changed ID

        if (!container) return;

        container.innerHTML = data.articles.map(article => {
            // Safe summary extraction
            let summary = '';
            if (article.summary) {
                summary = article.summary;
            } else if (typeof article.body === 'string') {
                summary = article.body.substring(0, 100).replace(/<[^>]*>/g, '') + '...';
            }
            // Bold summary as requested
            const displaySummary = summary.length > 80 ? summary.substring(0, 80) + '...' : summary;
            const isDataUrl = article.featured_image_url && article.featured_image_url.startsWith('data:');
            const imageUrl = isDataUrl ? article.featured_image_url : optimizeImageUrl(article.featured_image_url, 200);

            return `
                <div class="news-feed-item" onclick="window.location.href='/article.html?slug=${article.slug}'">
                    ${article.featured_image_url ?
                    `<img src="${imageUrl}" 
                         alt="${article.headline}" 
                         class="news-feed-item-image" 
                         loading="lazy">` :
                    `<div style="width: 80px; height: 60px; background: var(--bg-body); border-radius:4px; flex-shrink:0;"></div>`}
                    <div class="news-feed-item-content">
                        <!-- Summary is bold and visible, acting as main text -->
                        <p class="news-feed-item-title">${displaySummary}</p>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) { console.error(e); }
}

// Load Right Hot News (from admin settings or breaking news)
async function loadHotNews() {
    try {
        // First try to load from admin settings
        const settingsResponse = await fetch(`${API_BASE}/settings/public`);
        const settingsData = await settingsResponse.json();
        const hotNewsSetting = settingsData.settings?.find(s => s.key === 'hot_news');

        const container = document.getElementById('hotNewsList');

        if (hotNewsSetting && hotNewsSetting.value) {
            // Load from admin setting
            const items = hotNewsSetting.value.split('\n').filter(item => item.trim());
            container.innerHTML = items.map(item => `
                <li style="list-style: none; margin: 0; padding: 0;">
                    <div style="padding: 10px; background: var(--bg-body); border-left: 4px solid var(--primary); border-radius: 3px;">
                        <strong style="color: var(--primary); font-size: 1.05em; display: block; line-height: 1.3;">
                            ${item}
                        </strong>
                    </div>
                </li>
            `).join('');
        } else {
            // Fallback to breaking news articles
            const response = await fetch(`${API_BASE}/articles?breaking=true&limit=8&status=published`);
            const data = await response.json();

            container.innerHTML = data.articles.map(article => `
                <li style="list-style: none; margin: 0; padding: 0;">
                    <a href="/article.html?slug=${article.slug}" style="text-decoration: none; display: block;">
                        <div style="padding: 10px; background: var(--bg-body); border-left: 4px solid var(--primary); border-radius: 3px; transition: all 0.3s ease; cursor: pointer;">
                            <strong style="color: var(--primary); font-size: 1.05em; display: block; line-height: 1.3; margin-bottom: 3px;">
                                ${article.headline}
                            </strong>
                            <small style="color: var(--text-muted); display: block; font-size: 0.75em;">
                                ${timeAgo(article.published_at, article.created_at)}
                            </small>
                        </div>
                    </a>
                </li>
            `).join('');
        }
    } catch (e) { console.error(e); }
}

// Trending - Load from admin settings or top viewed articles
async function loadTrending() {
    try {
        // First try to load from admin settings
        const settingsResponse = await fetch(`${API_BASE}/settings/public`);
        const settingsData = await settingsResponse.json();
        const trendingSetting = settingsData.settings?.find(s => s.key === 'trending_articles');

        const container = document.getElementById('trendingList');
        if (!container) return;

        // STRICT check: must have value AND it must not be empty after trim
        if (!trendingSetting || !trendingSetting.value || !trendingSetting.value.trim()) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-muted);">No trending articles configured.</p>';
            return;
        }
        
        // Parse article IDs
        const articleIds = trendingSetting.value.split('\n').map(id => id.trim()).filter(Boolean).slice(0, 20);
        
        if (articleIds.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-muted);">No trending articles configured.</p>';
            return;
        }

        // Fetch a batch of published articles and filter locally (much faster than sequential calls)
        const articlesResponse = await fetch(`${API_BASE}/articles?limit=100&status=published`);
        const articlesData = await articlesResponse.json();
        const allArticles = articlesData.articles || [];

        // Create a map for quick lookup
        const articleMap = new Map(allArticles.map(a => [String(a.id), a]));
        
        // Preserve the order specified in admin settings
        const articles = [];
        for (const id of articleIds) {
            const article = articleMap.get(String(id));
            if (article) {
                articles.push(article);
            }
        }
        
        if (articles.length > 0) {
            container.innerHTML = '<div class="trending-items">' + articles.map((article, idx) => `
                <div class="trending-item">
                    <div class="trending-item-content">
                        <a href="/article.html?slug=${article.slug}" style="text-decoration: none; color: inherit;">
                            <div class="trending-item-title">${article.headline}</div>
                            <div style="font-size: 0.85em; color: var(--text-muted); margin-top: 5px; line-height: 1.4;">
                                ${article.summary || article.body.substring(0, 100).replace(/<[^>]*>/g, '') + '...'}
                            </div>
                        </a>
                    </div>
                </div>
            `).join('') + '</div>';
        } else {
            container.innerHTML = '<p style="text-align: center; color: var(--text-muted);">No valid trending articles configured. Please update the trending articles in admin settings.</p>';
        }
    } catch (e) {
        console.error('Trending error:', e);
        const container = document.getElementById('trendingList');
        if (container) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Error loading trending articles.</p>';
        }
    }
}

// Show warning notification for trending section
function showTrendingWarning(message) {
    let warn = document.getElementById('trending-warning');
    if (!warn) {
        warn = document.createElement('div');
        warn.id = 'trending-warning';
        warn.style.position = 'fixed';
        warn.style.top = '20px';
        warn.style.right = '20px';
        warn.style.background = 'rgba(255, 0, 0, 0.9)';
        warn.style.color = 'white';
        warn.style.padding = '12px 20px';
        warn.style.borderRadius = '6px';
        warn.style.zIndex = 9999;
        warn.style.fontSize = '1em';
        warn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        document.body.appendChild(warn);
    }
    warn.textContent = message;
    warn.style.display = 'block';
    setTimeout(() => { warn.style.display = 'none'; }, 5000);
}

// Mobile Layout Functions
// Load mobile ads (in-feed and sticky)
async function loadMobileAds() {
    try {
        const response = await fetch(`${API_BASE}/ads`);
        const data = await response.json();

        if (!data.ads || data.ads.length === 0) return;

        // Group ads by placement
        const adsByPlacement = {
            'content_top': [],
            'content_bottom': [],
            'mobile_sticky': []
        };

        data.ads.forEach(ad => {
            if (adsByPlacement[ad.placement]) {
                adsByPlacement[ad.placement].push(ad);
            }
        });

        // Get random ad
        const getRandomAd = (ads) => {
            if (!ads || ads.length === 0) return null;
            return ads[Math.floor(Math.random() * ads.length)];
        };

        // In-feed ad (between articles)
        const contentAd = getRandomAd([...adsByPlacement.content_top, ...adsByPlacement.content_bottom]);
        if (contentAd) {
            const container = document.getElementById('mobileArticlesList');
            if (container) {
                const adDiv = document.createElement('div');
                adDiv.id = 'mobile-content-ad';
                adDiv.style.cssText = 'position: relative; margin: 20px 0; padding: 8px; background: var(--bg-body); border-radius: 6px; cursor: pointer; text-align: center;';
                adDiv.onclick = () => trackAdClick(contentAd.id, contentAd.link_url);
                adDiv.innerHTML = `
                    ${renderAdCreative(contentAd, true)}
                    <button style="position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.6); color: white; border: none; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; padding: 0;" onclick="event.stopPropagation(); document.getElementById('mobile-content-ad').style.display='none';">×</button>
                `;
                container.insertBefore(adDiv, container.firstChild);
                trackAdImpression(contentAd.id);
            }
        }

        // Sticky bottom ad
        const stickyAd = getRandomAd(adsByPlacement.mobile_sticky);
        if (stickyAd) {
            let stickyContainer = document.getElementById('mobile-sticky-ad-container');
            if (!stickyContainer) {
                stickyContainer = document.createElement('div');
                stickyContainer.id = 'mobile-sticky-ad-container';
                stickyContainer.className = 'mobile-sticky-ad';
                document.body.appendChild(stickyContainer);
            }
            stickyContainer.onclick = () => trackAdClick(stickyAd.id, stickyAd.link_url);
            stickyContainer.style.cssText = 'position: fixed; bottom: 0; left: 0; right: 0; z-index: 100; max-height: 100px; background: var(--bg-body); border-top: 1px solid var(--border); padding: 8px; overflow: hidden; cursor: pointer;';
            stickyContainer.innerHTML = `
                <div style="position: relative; display: flex; align-items: center; justify-content: center; height: 100%;">
                    ${renderAdCreative(stickyAd, true)}
                    <button style="position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.6); color: white; border: none; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; padding: 0;" onclick="event.stopPropagation(); document.getElementById('mobile-sticky-ad-container').style.display='none';">×</button>
                </div>
            `;
            trackAdImpression(stickyAd.id);
        }
    } catch (e) {
        console.error('Mobile ads error:', e);
    }
}

// Load category sections for mobile layout
async function loadMobileCategorySections() {
    const container = document.getElementById('mobileCategorySections');
    if (!container || window.innerWidth > 768) return;

    try {
        // Fetch all categories
        const categoriesResponse = await fetch(`${API_BASE}/categories`);
        const categoriesData = await categoriesResponse.json();
        
        if (!categoriesData.categories || categoriesData.categories.length === 0) {
            container.innerHTML = '';
            return;
        }

        // Limit to 3 categories for mobile view
        const categories = categoriesData.categories.slice(0, 3);
        let categoryHTML = '';

        // Fetch articles for each category
        for (const category of categories) {
            try {
                // Fetch more articles to check if we have more than 4
                const articlesResponse = await fetch(`${API_BASE}/articles?category=${category.id}&limit=100&status=published`);
                const articlesData = await articlesResponse.json();
                const articles = articlesData.articles || [];

                if (articles.length === 0) continue;

                categoryHTML += `
                    <div class="mobile-category-panel">
                        <div class="mobile-category-header">
                            <span>${category.name}</span>
                            <a href="/category/${category.slug}">देख्नुहोस्</a>
                        </div>
                        <div class="mobile-category-articles">
                `;

                // If more than 3 articles, show latest in big format
                if (articles.length > 3) {
                    const latestArticle = articles[0];
                    const imageUrl = latestArticle.featured_image_url ? 
                        (latestArticle.featured_image_url.startsWith('data:') ? 
                            latestArticle.featured_image_url : 
                            optimizeImageUrl(latestArticle.featured_image_url, 500)) 
                        : '';
                    
                    const summary = latestArticle.summary || (latestArticle.content ? latestArticle.content.substring(0, 150) + '...' : 'No summary available');
                    
                    categoryHTML += `
                        <a href="/article.html?slug=${latestArticle.slug}" class="mobile-category-article-featured">
                            ${imageUrl ? 
                                `<img src="${imageUrl}" alt="${latestArticle.headline}" class="mobile-category-article-featured-image">` :
                                `<div class="mobile-category-article-featured-image" style="background: linear-gradient(135deg, var(--primary), var(--primary-dark)); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; text-align: center; padding: 15px; font-size: 1em; line-height: 1.35;">${latestArticle.headline.substring(0, 60)}</div>`
                            }
                            <div class="mobile-category-article-featured-content">
                                <h4 class="mobile-category-article-featured-title">${latestArticle.headline}</h4>
                                <div class="mobile-category-article-featured-summary">${summary}</div>
                                <div class="mobile-category-article-featured-meta">${timeAgo(latestArticle.published_at, latestArticle.created_at)}</div>
                            </div>
                        </a>
                    `;

                    // Show remaining articles (up to 3 more) in small format
                    const remainingArticles = articles.slice(1, 4);
                    for (const article of remainingArticles) {
                        const imageUrl = article.featured_image_url ? 
                            (article.featured_image_url.startsWith('data:') ? 
                                article.featured_image_url : 
                                optimizeImageUrl(article.featured_image_url, 300)) 
                            : '';
                        
                        const summary = article.summary || (article.content ? article.content.substring(0, 80) : 'No summary');
                        
                        categoryHTML += `
                            <a href="/article.html?slug=${article.slug}" class="mobile-category-article-small">
                                ${imageUrl ? 
                                    `<img src="${imageUrl}" alt="${article.headline}" class="mobile-category-article-small-image">` :
                                    `<div class="mobile-category-article-small-image" style="background: linear-gradient(135deg, var(--primary), var(--primary-dark)); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; text-align: center; padding: 8px; font-size: 0.75em; line-height: 1.2;">${article.headline.substring(0, 45)}</div>`
                                }
                                <div class="mobile-category-article-small-content">
                                    <h5 class="mobile-category-article-small-title">${article.headline}</h5>
                                    <p class="mobile-category-article-small-summary">${summary}</p>
                                    <div class="mobile-category-article-small-meta">${timeAgo(article.published_at, article.created_at)}</div>
                                </div>
                            </a>
                        `;
                    }

                    // Show "View More" button if more than 4 articles
                    if (articles.length > 4) {
                        const categoryId = category.id;
                        const categoryName = category.name;
                        categoryHTML += `
                            <button class="mobile-category-view-more" onclick="openCategoryModal('${categoryId}', '${categoryName}', ${articles.length})">
                                देख्नुहोस् (${articles.length - 1} अन्य)
                            </button>
                        `;
                    }
                } else {
                    // If 3 or fewer articles, show all in small format
                    for (const article of articles) {
                        const imageUrl = article.featured_image_url ? 
                            (article.featured_image_url.startsWith('data:') ? 
                                article.featured_image_url : 
                                optimizeImageUrl(article.featured_image_url, 300)) 
                            : '';
                        
                        const summary = article.summary || (article.content ? article.content.substring(0, 80) : 'No summary');
                        
                        categoryHTML += `
                            <a href="/article.html?slug=${article.slug}" class="mobile-category-article-small">
                                ${imageUrl ? 
                                    `<img src="${imageUrl}" alt="${article.headline}" class="mobile-category-article-small-image">` :
                                    `<div class="mobile-category-article-small-image" style="background: linear-gradient(135deg, var(--primary), var(--primary-dark)); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; text-align: center; padding: 8px; font-size: 0.75em; line-height: 1.2;">${article.headline.substring(0, 45)}</div>`
                                }
                                <div class="mobile-category-article-small-content">
                                    <h5 class="mobile-category-article-small-title">${article.headline}</h5>
                                    <p class="mobile-category-article-small-summary">${summary}</p>
                                    <div class="mobile-category-article-small-meta">${timeAgo(article.published_at, article.created_at)}</div>
                                </div>
                            </a>
                        `;
                    }
                }

                categoryHTML += `
                        </div>
                    </div>
                `;
            } catch (e) {
                console.error(`Error loading category ${category.name}:`, e);
            }
        }

        container.innerHTML = categoryHTML;
    } catch (e) {
        console.error('Mobile category sections error:', e);
    }
}

// Open category modal with all articles
async function openCategoryModal(categoryId, categoryName, totalCount) {
    try {
        // Fetch all articles for this category
        const response = await fetch(`${API_BASE}/articles?category=${categoryId}&limit=100&status=published`);
        const data = await response.json();
        const articles = data.articles || [];

        // Create modal
        let modalHTML = `
            <div id="categoryModal" class="modal" style="display: flex;">
                <div class="modal-content" style="max-width: 90%; max-height: 90vh; overflow-y: auto;">
                    <span class="close-modal" onclick="document.getElementById('categoryModal').remove();">&times;</span>
                    <h2 style="color: var(--primary); margin-bottom: 20px;">${categoryName}</h2>
                    <div class="category-modal-articles">
        `;

        // Add all articles
        for (const article of articles) {
            const imageUrl = article.featured_image_url ? 
                (article.featured_image_url.startsWith('data:') ? 
                    article.featured_image_url : 
                    optimizeImageUrl(article.featured_image_url, 300)) 
                : '';
            
            const summary = article.summary || (article.content ? article.content.substring(0, 100) : 'No summary');
            
            modalHTML += `
                <a href="/article.html?slug=${article.slug}" class="mobile-feed-card" style="text-decoration: none; color: inherit;">
                    ${imageUrl ? 
                        `<img src="${imageUrl}" alt="${article.headline}" class="mobile-feed-card-image">` :
                        `<div class="mobile-feed-card-image" style="background: linear-gradient(135deg, var(--primary), var(--primary-dark)); display: flex; align-items: center; justify-content: center; padding: 12px; color: white; font-weight: 700; font-size: 0.85em; text-align: center; line-height: 1.35;">${article.headline.substring(0, 60)}</div>`
                    }
                    <div class="mobile-feed-card-content">
                        <h4 class="mobile-feed-card-title">${article.headline}</h4>
                        <p class="mobile-feed-card-summary">${summary}</p>
                        <div class="mobile-feed-card-meta">${timeAgo(article.published_at, article.created_at)}</div>
                    </div>
                </a>
            `;
        }

        modalHTML += `
                    </div>
                </div>
            </div>
        `;

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Close modal on background click
        const modal = document.getElementById('categoryModal');
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    } catch (e) {
        console.error('Error opening category modal:', e);
    }
}

async function loadMobileLayout() {
    if (window.innerWidth > 768) return; // Only for mobile
    
    try {
        // Load articles - fetch all available articles
        const response = await fetch(`${API_BASE}/articles?limit=500&status=published`);
        const data = await response.json();
        
        if (!data.articles || data.articles.length === 0) return;
        
        const articles = data.articles;
        
        // Load top 2 articles
        loadMobileTopArticles(articles.slice(0, 2));
        
        // Load trending from admin settings (not just first 4 articles)
        loadMobileTrendingFromSettings();
        
        // Load category sections
        loadMobileCategorySections();
        
        // Load hot news for mobile
        loadMobileHotNews();
        
        // Load mobile ads (in-feed and sticky)
        loadMobileAds();
        
        // Load ALL remaining articles as news feed with pagination (starting from index 2)
        // Store articles globally for pagination
        window.mobileNewsFeedArticles = articles.slice(2);
        window.mobileNewsFeedPage = 0;
        loadMobileNewsFeedPage();
        
    } catch (e) {
        console.error('Error loading mobile layout:', e);
    }
}

function loadMobileTopArticles(articles) {
    const container = document.getElementById('mobileTopArticles');
    if (!container) return;
    
    const html = articles.map(article => {
        const isDataUrl = article.featured_image_url && article.featured_image_url.startsWith('data:');
        const imageUrl = isDataUrl ? article.featured_image_url : optimizeImageUrl(article.featured_image_url, 600);
        const summary = article.summary || (article.content ? article.content.substring(0, 150) + '...' : '');
        
        return `
        <a href="/article.html?slug=${article.slug}" class="mobile-top-article" style="text-decoration: none; color: inherit;">
            ${article.featured_image_url ? 
                `<img src="${imageUrl}" alt="${article.headline}" class="mobile-top-article-image">` :
                `<div class="mobile-top-article-image" style="background: linear-gradient(135deg, var(--primary), var(--primary-dark)); display: flex; align-items: center; justify-content: center; padding: 15px; color: white; font-weight: 700; font-size: 1em; text-align: center; line-height: 1.4;">${article.headline.substring(0, 60)}</div>`
            }
            <div class="mobile-top-article-content">
                <h3 class="mobile-top-article-title">${article.headline}</h3>
                ${summary ? `<div style="font-size: 0.85em; color: var(--text-muted); line-height: 1.4; margin: 4px 0;">${summary}</div>` : ''}
                <div class="mobile-top-article-meta">${timeAgo(article.published_at, article.created_at)}</div>
            </div>
        </a>
    `}).join('');
    
    container.innerHTML = html;
}

function loadMobileTrendingCards(articles) {
    const container = document.getElementById('mobileTrendingCards');
    if (!container) return;
    
    const html = articles.map((article) => {
        let summaryText = '';
        if (article.summary) {
            summaryText = article.summary;
        } else if (typeof article.body === 'string') {
            summaryText = article.body.substring(0, 100).replace(/<[^>]*>/g, '');
        }
        return `
            <a href="/article.html?slug=${article.slug}" class="trending-card" style="text-decoration: none; color: inherit;">
                <div style="display: flex; justify-content: space-between; align-items: start; gap: 8px;">
                    <div style="flex: 1;">
                        <h4 class="trending-card-title">${article.headline}</h4>
                        <p class="trending-card-summary">${summaryText}</p>
                    </div>
                </div>
            </a>
        `;
    }).join('');
    
    container.innerHTML = html;
}

// Load trending articles for mobile from admin settings
async function loadMobileTrendingFromSettings() {
    const container = document.getElementById('mobileTrendingCards');
    if (!container) return;

    try {
        // Fetch trending articles from admin settings
        const settingsResponse = await fetch(`${API_BASE}/settings/public`);
        const settingsData = await settingsResponse.json();
        const trendingSetting = settingsData.settings?.find(s => s.key === 'trending_articles');

        // If no trending setting, show message
        if (!trendingSetting || !trendingSetting.value || !trendingSetting.value.trim()) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-muted);">ट्रेन्डिङ समाचार सेट गरिएको छैन</p>';
            return;
        }

        const articleIds = trendingSetting.value.split('\n').map(id => id.trim()).filter(Boolean);
        if (articleIds.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-muted);">トレンドニュースが設定されていません</p>';
            return;
        }

        const articles = [];
        const seenIds = new Set();

        // Fetch each trending article
        for (const id of articleIds) {
            if (seenIds.has(id)) continue;
            try {
                const response = await fetch(`${API_BASE}/articles/${id}`);
                const data = await response.json();
                if (data.article && data.article.status === 'published') {
                    articles.push(data.article);
                    seenIds.add(id);
                }
            } catch (e) {
                console.error('Error loading trending article for mobile:', id, e);
            }
        }

        // Display trending articles
        if (articles.length > 0) {
            loadMobileTrendingCards(articles);
        } else {
            container.innerHTML = '<p style="text-align: center; color: var(--text-muted);">有効なトレンドニュースが見つかりません</p>';
        }
    } catch (e) {
        console.error('Error loading mobile trending from settings:', e);
    }
}

// Convert number to Nepali script
function toNepaliNumber(num) {
    const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
    return String(num).split('').map(digit => nepaliDigits[parseInt(digit)]).join('');
}

function loadMobileNewsFeedPage() {
    const ARTICLES_TO_SHOW = 5;
    const feedContainer = document.getElementById('mobileNewsFeed');
    const viewAllContainer = document.getElementById('mobileNewsFeedViewAll');
    
    if (!feedContainer) return;
    
    // Show only the first 5 articles
    const articlesToShow = window.mobileNewsFeedArticles.slice(0, ARTICLES_TO_SHOW);
    
    // Generate HTML for articles
    const html = articlesToShow.map(article => {
        const isDataUrl = article.featured_image_url && article.featured_image_url.startsWith('data:');
        const imageUrl = isDataUrl ? article.featured_image_url : optimizeImageUrl(article.featured_image_url, 300);
        const summary = article.summary || (article.body ? article.body.substring(0, 100).replace(/<[^>]*>/g, '') : article.headline.substring(0, 100));
        
        return `
        <a href="/article.html?slug=${article.slug}" class="mobile-feed-card" style="text-decoration: none; color: inherit;">
            ${article.featured_image_url ? 
                `<img src="${imageUrl}" alt="${article.headline}" class="mobile-feed-card-image">` :
                `<div class="mobile-feed-card-image" style="background: linear-gradient(135deg, var(--primary), var(--primary-dark)); display: flex; align-items: center; justify-content: center; padding: 12px; color: white; font-weight: 700; font-size: 0.85em; text-align: center; line-height: 1.35;">${article.headline.substring(0, 60)}</div>`
            }
            <div class="mobile-feed-card-content">
                <h4 class="mobile-feed-card-title">${article.headline}</h4>
                <p class="mobile-feed-card-summary">${summary}</p>
                <div class="mobile-feed-card-meta">${timeAgo(article.published_at, article.created_at)}</div>
            </div>
        </a>
    `}).join('');
    
    feedContainer.innerHTML = html;
    
    // Show "View All" button if there are more than 5 articles
    if (window.mobileNewsFeedArticles.length >= 5 && viewAllContainer) {
        viewAllContainer.style.display = 'block';
        const viewAllBtn = document.getElementById('viewAllNewsBtn');
        if (viewAllBtn) {
            viewAllBtn.onclick = loadAllMobileNews;
        }
    } else if (viewAllContainer) {
        viewAllContainer.style.display = 'none';
    }
}

// Load all news articles
function loadAllMobileNews() {
    const feedContainer = document.getElementById('mobileNewsFeed');
    const viewAllContainer = document.getElementById('mobileNewsFeedViewAll');
    
    if (!feedContainer) return;
    
    // Generate HTML for all articles
    const html = window.mobileNewsFeedArticles.map(article => {
        const isDataUrl = article.featured_image_url && article.featured_image_url.startsWith('data:');
        const imageUrl = isDataUrl ? article.featured_image_url : optimizeImageUrl(article.featured_image_url, 300);
        const summary = article.summary || (article.body ? article.body.substring(0, 100).replace(/<[^>]*>/g, '') : article.headline.substring(0, 100));
        
        return `
        <a href="/article.html?slug=${article.slug}" class="mobile-feed-card" style="text-decoration: none; color: inherit;">
            ${article.featured_image_url ? 
                `<img src="${imageUrl}" alt="${article.headline}" class="mobile-feed-card-image">` :
                `<div class="mobile-feed-card-image" style="background: linear-gradient(135deg, var(--primary), var(--primary-dark)); display: flex; align-items: center; justify-content: center; padding: 12px; color: white; font-weight: 700; font-size: 0.85em; text-align: center; line-height: 1.35;">${article.headline.substring(0, 60)}</div>`
            }
            <div class="mobile-feed-card-content">
                <h4 class="mobile-feed-card-title">${article.headline}</h4>
                <p class="mobile-feed-card-summary">${summary}</p>
                <div class="mobile-feed-card-meta">${timeAgo(article.published_at, article.created_at)}</div>
            </div>
        </a>
    `}).join('');
    
    feedContainer.innerHTML = html;
    
    // Hide "View All" button and show "Show Less" button
    if (viewAllContainer) {
        viewAllContainer.innerHTML = `<button id="showLessNewsBtn" class="view-all-btn show-less-btn">कम देखाउनुहोस्</button>`;
        const showLessBtn = document.getElementById('showLessNewsBtn');
        if (showLessBtn) {
            showLessBtn.onclick = () => {
                window.mobileNewsFeedArticles = window.mobileNewsFeedArticles; // Keep articles loaded
                loadMobileNewsFeedPage();
            };
        }
    }
    
    // Scroll to top of feed
    feedContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function loadMobileNewsFeedCards(articles, container = null) {
    const feedContainer = container || document.getElementById('mobileNewsFeed');
    if (!feedContainer) return;
    
    const html = articles.map(article => {
        const isDataUrl = article.featured_image_url && article.featured_image_url.startsWith('data:');
        const imageUrl = isDataUrl ? article.featured_image_url : optimizeImageUrl(article.featured_image_url, 300);
        const summary = article.summary || (article.body ? article.body.substring(0, 100).replace(/<[^>]*>/g, '') : article.headline.substring(0, 100));
        
        return `
        <a href="/article.html?slug=${article.slug}" class="mobile-feed-card" style="text-decoration: none; color: inherit;">
            ${article.featured_image_url ? 
                `<img src="${imageUrl}" alt="${article.headline}" class="mobile-feed-card-image">` :
                `<div class="mobile-feed-card-image" style="background: linear-gradient(135deg, var(--primary), var(--primary-dark)); display: flex; align-items: center; justify-content: center; padding: 12px; color: white; font-weight: 700; font-size: 0.85em; text-align: center; line-height: 1.35;">${article.headline.substring(0, 60)}</div>`
            }
            <div class="mobile-feed-card-content">
                <h4 class="mobile-feed-card-title">${article.headline}</h4>
                <p class="mobile-feed-card-summary">${summary}</p>
                <div class="mobile-feed-card-meta">${timeAgo(article.published_at, article.created_at)}</div>
            </div>
        </a>
    `}).join('');
    
    feedContainer.innerHTML = html;
}

// Load articles for category page on mobile (Latest in big format, rest in small)
function loadMobileCategoryPageArticles(articles, container) {
    if (!container || articles.length === 0) return;
    
    let html = '';
    
    // Show latest article in featured large format
    const latestArticle = articles[0];
    const latestImageUrl = latestArticle.featured_image_url ? 
        (latestArticle.featured_image_url.startsWith('data:') ? 
            latestArticle.featured_image_url : 
            optimizeImageUrl(latestArticle.featured_image_url, 500)) 
        : '';
    
    const latestSummary = latestArticle.summary || (latestArticle.content ? latestArticle.content.substring(0, 150) + '...' : 'No summary available');
    
    html += `
        <a href="/article.html?slug=${latestArticle.slug}" class="mobile-category-article-featured" style="text-decoration: none; color: inherit;">
            ${latestImageUrl ? 
                `<img src="${latestImageUrl}" alt="${latestArticle.headline}" class="mobile-category-article-featured-image">` :
                `<div class="mobile-category-article-featured-image" style="background: linear-gradient(135deg, var(--primary), var(--primary-dark)); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; text-align: center; padding: 15px; font-size: 1em; line-height: 1.35;">${latestArticle.headline.substring(0, 60)}</div>`
            }
            <div class="mobile-category-article-featured-content">
                <h4 class="mobile-category-article-featured-title">${latestArticle.headline}</h4>
                <div class="mobile-category-article-featured-summary">${latestSummary}</div>
                <div class="mobile-category-article-featured-meta">${timeAgo(latestArticle.published_at, latestArticle.created_at)}</div>
            </div>
        </a>
    `;
    
    // Show remaining articles in small format
    const remainingArticles = articles.slice(1);
    for (const article of remainingArticles) {
        const imageUrl = article.featured_image_url ? 
            (article.featured_image_url.startsWith('data:') ? 
                article.featured_image_url : 
                optimizeImageUrl(article.featured_image_url, 300)) 
            : '';
        
        const summary = article.summary || (article.content ? article.content.substring(0, 80) : 'No summary');
        
        html += `
            <a href="/article.html?slug=${article.slug}" class="mobile-category-article-small" style="text-decoration: none; color: inherit;">
                ${imageUrl ? 
                    `<img src="${imageUrl}" alt="${article.headline}" class="mobile-category-article-small-image">` :
                    `<div class="mobile-category-article-small-image" style="background: linear-gradient(135deg, var(--primary), var(--primary-dark)); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; text-align: center; padding: 8px; font-size: 0.75em; line-height: 1.2;">${article.headline.substring(0, 45)}</div>`
                }
                <div class="mobile-category-article-small-content">
                    <h5 class="mobile-category-article-small-title">${article.headline}</h5>
                    <p class="mobile-category-article-small-summary">${summary}</p>
                    <div class="mobile-category-article-small-meta">${timeAgo(article.published_at, article.created_at)}</div>
                </div>
            </a>
        `;
    }
    
    container.innerHTML = html;
}

// Load hot news for mobile layout
async function loadMobileHotNews() {
    try {
        const settingsResponse = await fetch(`${API_BASE}/settings/public`);
        const settingsData = await settingsResponse.json();
        const hotNewsSetting = settingsData.settings?.find(s => s.key === 'hot_news');
        
        const container = document.getElementById('mobileHotNews');
        if (!container) return;
        
        if (hotNewsSetting && hotNewsSetting.value) {
            const items = hotNewsSetting.value.split('\n').filter(item => item.trim());
            container.innerHTML = `
                <div class="mobile-hot-news-wrapper" style="padding: 0 10px; margin-bottom: 20px;">
                    <div class="section-title">
                        <h3 style="margin: 0; font-size: 0.95em; color: var(--primary); border-bottom: 2px solid var(--primary); padding-bottom: 8px;">Hot News</h3>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 12px;">
                        ${items.map(item => `
                            <div style="padding: 8px; background: var(--bg-body); border-left: 3px solid var(--primary); border-radius: 3px;">
                                <strong style="color: var(--primary); font-size: 0.9em; display: block; line-height: 1.3; word-wrap: break-word; overflow-wrap: break-word; word-break: break-word; white-space: normal;">${item}</strong>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else {
            const response = await fetch(`${API_BASE}/articles?breaking=true&limit=5&status=published`);
            const data = await response.json();
            
            if (data.articles && data.articles.length > 0) {
                container.innerHTML = `
                    <div class="mobile-hot-news-wrapper" style="padding: 0 10px; margin-bottom: 20px;">
                        <div class="section-title">
                            <h3 style="margin: 0; font-size: 0.95em; color: var(--primary); border-bottom: 2px solid var(--primary); padding-bottom: 8px;">Hot News</h3>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 12px;">
                            ${data.articles.map(article => `
                                <a href="/article.html?slug=${article.slug}" style="text-decoration: none; display: block;">
                                    <div style="padding: 8px; background: var(--bg-body); border-left: 3px solid var(--primary); border-radius: 3px; cursor: pointer; transition: all 0.3s ease;">
                                        <strong style="color: var(--primary); font-size: 0.9em; display: block; line-height: 1.3; word-wrap: break-word; overflow-wrap: break-word; word-break: break-word; white-space: normal;">${article.headline}</strong>
                                        <small style="color: var(--text-muted); display: block; font-size: 0.75em;">${timeAgo(article.published_at, article.created_at)}</small>
                                    </div>
                                </a>
                            `).join('')}
                        </div>
                    </div>
                `;
            }
        }
    } catch (e) {
        console.error('Mobile hot news error:', e);
    }
}

// Search functionality
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const mobileSearchInput = document.getElementById('mobileSearchInput');
    const mobileSearchBtn = document.getElementById('mobileSearchBtn');


    const performSearch = async (query) => {
        const container = document.getElementById('styles-social-feed');
        if (!query.trim()) {
            loadFeedArticles();
            return;
        }
        try {
            // Search for articles matching the query
            const response = await fetch(`${API_BASE}/articles?search=${encodeURIComponent(query)}&status=published&limit=1`);
            const data = await response.json();
            let foundArticles = data.articles || [];

            // Always fetch more articles to suggest
            const suggestRes = await fetch(`${API_BASE}/articles?status=published&limit=10`);
            const suggestData = await suggestRes.json();
            let suggestions = suggestData.articles || [];

            // Remove any duplicate (already found) articles from suggestions
            if (foundArticles.length > 0) {
                const foundIds = new Set(foundArticles.map(a => a.id));
                suggestions = suggestions.filter(a => !foundIds.has(a.id));
            }

            let html = '';
            if (foundArticles.length === 0) {
                html += '<p style="padding: 20px; text-align: center; color: var(--text-muted);">No articles found matching your search.</p>';
                if (suggestions.length > 0) {
                    html += '<div style="padding: 10px 0 0 0; text-align: center; color: var(--text-primary);">Other articles you may like:</div>';
                    html += suggestions.map(article => `
                        <a href="/article.html?slug=${article.slug}" class="feed-card" style="text-decoration: none; color: inherit;">
                            ${article.featured_image_url ?
                            `<div class="feed-card-image-container">
                                <img src="${optimizeImageUrl(article.featured_image_url, 1200)}" 
                                     alt="${article.headline}" 
                                     loading="lazy"
                                     style="width: 100%; height: 100%; object-fit: contain;">
                                <div class="feed-card-overlay">
                                    <h2 style="margin: 0; color: white;">
                                        ${article.headline}
                                    </h2>
                                </div>
                            </div>` :
                            `<div style="height: 300px; background: linear-gradient(135deg, var(--primary), var(--primary-dark)); display: flex; align-items: center; justify-content: center; padding: 20px; border-radius: 4px;"><div style="text-align: center; color: white;"><h3 style="margin: 0; font-size: 1.1em; font-weight: 700; line-height: 1.4;">${article.headline}</h3></div></div>`}
                            <div class="feed-content">
                                <div class="feed-meta">
                                    ${timeAgo(article.published_at, article.created_at)}
                                </div>
                            </div>
                        </a>
                    `).join('');
                }
            } else {
                // Show searched article first, then suggestions
                html += foundArticles.map(article => `
                    <a href="/article.html?slug=${article.slug}" class="feed-card" style="text-decoration: none; color: inherit;">
                        ${article.featured_image_url ?
                        `<div class="feed-card-image-container">
                            <img src="${optimizeImageUrl(article.featured_image_url, 1200)}" 
                                 alt="${article.headline}" 
                                 loading="lazy"
                                 style="width: 100%; height: 100%; object-fit: contain;">
                            <div class="feed-card-overlay">
                                <h2 style="margin: 0; color: white;">
                                    ${article.headline}
                                </h2>
                            </div>
                        </div>` :
                        `<div style="height: 300px; background: linear-gradient(135deg, var(--primary), var(--primary-dark)); display: flex; align-items: center; justify-content: center; padding: 20px; border-radius: 4px;"><div style="text-align: center; color: white;"><h3 style="margin: 0; font-size: 1.1em; font-weight: 700; line-height: 1.4;">${article.headline}</h3></div></div>`}
                        <div class="feed-content">
                            <div class="feed-meta">
                                ${timeAgo(article.published_at, article.created_at)}
                            </div>
                        </div>
                    </a>
                `).join('');
                if (suggestions.length > 0) {
                    html += '<div style="padding: 10px 0 0 0; text-align: center; color: var(--text-primary);">Other articles you may like:</div>';
                    html += suggestions.map(article => `
                        <a href="/article.html?slug=${article.slug}" class="feed-card" style="text-decoration: none; color: inherit;">
                            ${article.featured_image_url ?
                            `<div class="feed-card-image-container">
                                <img src="${optimizeImageUrl(article.featured_image_url, 1200)}" 
                                     alt="${article.headline}" 
                                     loading="lazy"
                                     style="width: 100%; height: 100%; object-fit: contain;">
                                <div class="feed-card-overlay">
                                    <h2 style="margin: 0; color: white;">
                                        ${article.headline}
                                    </h2>
                                </div>
                            </div>` :
                            `<div style="height: 300px; background: linear-gradient(135deg, var(--primary), var(--primary-dark)); display: flex; align-items: center; justify-content: center; padding: 20px; border-radius: 4px;"><div style="text-align: center; color: white;"><h3 style="margin: 0; font-size: 1.1em; font-weight: 700; line-height: 1.4;">${article.headline}</h3></div></div>`}
                            <div class="feed-content">
                                <div class="feed-meta">
                                    ${timeAgo(article.published_at, article.created_at)}
                                </div>
                            </div>
                        </a>
                    `).join('');
                }
            }
            container.innerHTML = html;
        } catch (e) {
            console.error('Search error:', e);
        }
    };

    // Search on button click (desktop)
    searchBtn?.addEventListener('click', () => {
        performSearch(searchInput.value);
    });

    // Search on Enter key (desktop)
    searchInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch(searchInput.value);
        }
    });

    // Search on button click (mobile)
    mobileSearchBtn?.addEventListener('click', () => {
        performSearch(mobileSearchInput.value);
    });

    // Search on Enter key (mobile)
    mobileSearchInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch(mobileSearchInput.value);
        }
    });
});

/* ===== SOCIAL SHARING FUNCTIONALITY ===== */

function generateShareButtons(article) {
    const headline = (article.headline || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const summary = (article.summary || article.body?.substring(0, 100).replace(/<[^>]*>/g, '') || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const url = window.location.origin + '/article.html?slug=' + article.slug;
    const image = article.featured_image_url || '';
    
    return `
    <div class="share-section">
        <div class="share-buttons">
            <button class="share-btn facebook" onclick="shareOnFacebook('${headline}', '${summary}', '${url}', '${image}')" title="Share on Facebook">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
            </button>
            <button class="share-btn x" onclick="shareOnX('${headline}', '${url}')" title="Share on X">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.6l-5.165-6.752-5.938 6.752h-3.308l7.733-8.835L.692 2.25h6.602l4.7 6.217 5.45-6.217zM17.002 18.807h1.844L6.803 3.992H4.85z"/>
                </svg>
            </button>
            <button class="share-btn whatsapp" onclick="shareOnWhatsApp('${headline}', '${summary}', '${url}')" title="Share on WhatsApp">
                <svg viewBox="0 0 24 24" fill="white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-9.746 9.861c0 2.718.738 5.33 2.14 7.66l-2.35 7.34 7.494-2.976a9.9 9.9 0 004.738 1.2h.006c5.318 0 9.75-4.445 9.75-9.903 0-2.699-.719-5.206-2.078-7.38A9.865 9.865 0 0012.051 6.979"/>
                </svg>
            </button>
            <button class="share-btn linkedin" onclick="shareOnLinkedIn('${headline}', '${summary}', '${url}')" title="Share on LinkedIn">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.475-2.236-1.986-2.236-1.081 0-1.722.722-2.004 1.418-.103.25-.13.599-.13.948v5.439h-3.554s.05-8.81 0-9.728h3.554v1.375c.427-.659 1.191-1.597 2.905-1.597 2.12 0 3.71 1.386 3.71 4.365v5.585zM5.337 8.855c-1.144 0-1.915-.759-1.915-1.71 0-.951.77-1.71 1.954-1.71 1.184 0 1.915.759 1.915 1.71 0 .951-.73 1.71-1.954 1.71zm1.6 11.597H3.738V9.579h3.199v10.873zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"/>
                </svg>
            </button>
            <button class="share-btn copy-link" onclick="copyShareLink('${url}')" title="Copy Link">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                </svg>
            </button>
        </div>
    </div>
    `;
}

function shareOnFacebook(headline, summary, url, image) {
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(headline + ' - ' + summary)}`;
    window.open(shareUrl, 'facebook-share-dialog', 'width=800,height=600');
}

function shareOnX(headline, url) {
    const text = `${headline}\n\n${url}`;
    const shareUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&via=rodb_news`;
    window.open(shareUrl, 'x-share', 'width=550,height=420');
}

function shareOnWhatsApp(headline, summary, url) {
    const text = `📰 *${headline}*\n\n${summary}\n\n${url}`;
    const shareUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank');
}

function shareOnLinkedIn(headline, summary, url) {
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    window.open(shareUrl, 'linkedin-share', 'width=550,height=420');
}

function copyShareLink(url) {
    navigator.clipboard.writeText(url).then(() => {
        showCopyNotification('Link copied to clipboard!');
    }).catch(() => {
        alert('Failed to copy link');
    });
}

function showCopyNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #25D366;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 3000;
        animation: slideInRight 0.3s ease;
        font-weight: 500;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}