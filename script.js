// Global variables
let allTokens = [];
let filteredTokens = [];
let currentSort = 'name';
let sortDirection = 'asc';
let availableTags = new Set();

// DOM elements
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const tokenGrid = document.getElementById('tokenGrid');
const searchInput = document.getElementById('searchInput');
const clearSearch = document.getElementById('clearSearch');
const tagFilter = document.getElementById('tagFilter');
const sortBtn = document.getElementById('sortBtn');
const resultsInfo = document.getElementById('resultsInfo');
const resultsCount = document.getElementById('resultsCount');
const totalTokens = document.getElementById('totalTokens');
const retryBtn = document.getElementById('retryBtn');

// Modal elements
const tokenModal = document.getElementById('tokenModal');
const closeModal = document.getElementById('closeModal');
const modalTokenName = document.getElementById('modalTokenName');
const modalTokenLogo = document.getElementById('modalTokenLogo');
const modalTokenSymbol = document.getElementById('modalTokenSymbol');
const modalTokenAddress = document.getElementById('modalTokenAddress');
const modalTokenDecimals = document.getElementById('modalTokenDecimals');
const modalTokenChainId = document.getElementById('modalTokenChainId');
const modalTokenTags = document.getElementById('modalTokenTags');
const modalTokenTagsContainer = document.getElementById('modalTokenTagsContainer');
const copyAddress = document.getElementById('copyAddress');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    loadTokens();
    setupEventListeners();
});

// Load token data from the JSON file
async function loadTokens() {
    try {
        showLoading();
        const response = await fetch('./src/tokens/solana.tokenlist.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        allTokens = data.tokens || [];
        
        // Extract tags for filter dropdown
        extractTags(data.tags || {});
        
        // Initialize the UI
        populateTagFilter();
        filteredTokens = [...allTokens];
        updateDisplay();
        hideLoading();
        
    } catch (error) {
        console.error('Error loading tokens:', error);
        showError();
    }
}

// Extract available tags from token data
function extractTags(tagDefinitions) {
    // Add predefined tags
    Object.keys(tagDefinitions).forEach(tag => {
        availableTags.add(tag);
    });
    
    // Add tags from tokens
    allTokens.forEach(token => {
        if (token.tags) {
            token.tags.forEach(tag => availableTags.add(tag));
        }
    });
}

// Populate the tag filter dropdown
function populateTagFilter() {
    // Clear existing options except "All Categories"
    tagFilter.innerHTML = '<option value="">All Categories</option>';
    
    // Sort tags alphabetically and add to dropdown
    const sortedTags = Array.from(availableTags).sort();
    sortedTags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = formatTagName(tag);
        tagFilter.appendChild(option);
    });
}

// Format tag name for display
function formatTagName(tag) {
    return tag.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

// Setup event listeners
function setupEventListeners() {
    // Search functionality
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    clearSearch.addEventListener('click', clearSearchInput);
    
    // Filter and sort
    tagFilter.addEventListener('change', handleTagFilter);
    sortBtn.addEventListener('click', toggleSort);
    
    // Modal controls
    closeModal.addEventListener('click', hideModal);
    tokenModal.addEventListener('click', (e) => {
        if (e.target === tokenModal) hideModal();
    });
    copyAddress.addEventListener('click', copyTokenAddress);
    
    // Retry button
    retryBtn.addEventListener('click', loadTokens);
    
    // Escape key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') hideModal();
    });
}

// Debounce function for search input
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Handle search input
function handleSearch() {
    const query = searchInput.value.trim();
    
    if (query) {
        clearSearch.style.display = 'block';
    } else {
        clearSearch.style.display = 'none';
    }
    
    filterTokens();
}

// Clear search input
function clearSearchInput() {
    searchInput.value = '';
    clearSearch.style.display = 'none';
    filterTokens();
}

// Handle tag filter change
function handleTagFilter() {
    filterTokens();
}

// Filter tokens based on search and tag filter
function filterTokens() {
    const searchQuery = searchInput.value.toLowerCase().trim();
    const selectedTag = tagFilter.value;
    
    filteredTokens = allTokens.filter(token => {
        // Search filter
        const matchesSearch = !searchQuery || 
            token.name.toLowerCase().includes(searchQuery) ||
            token.symbol.toLowerCase().includes(searchQuery) ||
            token.address.toLowerCase().includes(searchQuery);
        
        // Tag filter
        const matchesTag = !selectedTag || 
            (token.tags && token.tags.includes(selectedTag));
        
        return matchesSearch && matchesTag;
    });
    
    sortTokens();
    updateDisplay();
}

// Toggle sort order
function toggleSort() {
    if (currentSort === 'name') {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort = 'name';
        sortDirection = 'asc';
    }
    
    updateSortButton();
    sortTokens();
    updateDisplay();
}

// Update sort button text
function updateSortButton() {
    const icon = sortDirection === 'asc' ? 'fa-sort-alpha-down' : 'fa-sort-alpha-up';
    const text = sortDirection === 'asc' ? 'A → Z' : 'Z → A';
    sortBtn.innerHTML = `<i class="fas ${icon}"></i> ${text}`;
}

// Sort tokens
function sortTokens() {
    filteredTokens.sort((a, b) => {
        let compareA = a[currentSort];
        let compareB = b[currentSort];
        
        if (typeof compareA === 'string') {
            compareA = compareA.toLowerCase();
            compareB = compareB.toLowerCase();
        }
        
        if (sortDirection === 'asc') {
            return compareA < compareB ? -1 : compareA > compareB ? 1 : 0;
        } else {
            return compareA > compareB ? -1 : compareA < compareB ? 1 : 0;
        }
    });
}

// Update the display
function updateDisplay() {
    updateStats();
    renderTokens();
    updateResultsInfo();
}

// Update statistics
function updateStats() {
    totalTokens.textContent = allTokens.length.toLocaleString();
}

// Update results info
function updateResultsInfo() {
    const count = filteredTokens.length;
    resultsCount.textContent = `${count.toLocaleString()} token${count !== 1 ? 's' : ''} found`;
    resultsInfo.style.display = 'block';
}

// Render tokens in the grid
function renderTokens() {
    if (filteredTokens.length === 0) {
        tokenGrid.innerHTML = `
            <div class="no-results">
                <div class="error-icon">
                    <i class="fas fa-search"></i>
                </div>
                <h3>No tokens found</h3>
                <p>Try adjusting your search criteria or filters.</p>
            </div>
        `;
        return;
    }
    
    const tokenCards = filteredTokens.map(token => createTokenCard(token)).join('');
    tokenGrid.innerHTML = tokenCards;
    
    // Add click listeners to token cards
    tokenGrid.querySelectorAll('.token-card').forEach(card => {
        card.addEventListener('click', () => {
            const address = card.dataset.address;
            const token = allTokens.find(t => t.address === address);
            if (token) showTokenModal(token);
        });
    });
}

// Create a token card HTML
function createTokenCard(token) {
    const logoElement = token.logoURI 
        ? `<img src="${token.logoURI}" alt="${token.name}" class="token-logo" onerror="this.style.display='none'">`
        : `<div class="token-logo placeholder">${token.symbol.charAt(0)}</div>`;
    
    const tags = token.tags ? token.tags.slice(0, 3).map(tag => 
        `<span class="tag ${tag}">${formatTagName(tag)}</span>`
    ).join('') : '';
    
    const moreTagsIndicator = token.tags && token.tags.length > 3 
        ? `<span class="tag">+${token.tags.length - 3} more</span>` 
        : '';
    
    return `
        <div class="token-card" data-address="${token.address}">
            <div class="token-header">
                ${logoElement}
                <div class="token-info">
                    <h3>${escapeHtml(token.name)}</h3>
                    <div class="token-symbol">${escapeHtml(token.symbol)}</div>
                </div>
            </div>
            <div class="token-details">
                <div class="token-detail">
                    <label>Address:</label>
                    <span class="token-address">${truncateAddress(token.address)}</span>
                </div>
                <div class="token-detail">
                    <label>Decimals:</label>
                    <span>${token.decimals}</span>
                </div>
                <div class="token-detail">
                    <label>Chain ID:</label>
                    <span>${token.chainId}</span>
                </div>
            </div>
            ${tags || moreTagsIndicator ? `
                <div class="token-tags">
                    ${tags}
                    ${moreTagsIndicator}
                </div>
            ` : ''}
        </div>
    `;
}

// Show token details modal
function showTokenModal(token) {
    modalTokenName.textContent = token.name;
    modalTokenSymbol.textContent = token.symbol;
    modalTokenAddress.textContent = token.address;
    modalTokenDecimals.textContent = token.decimals;
    modalTokenChainId.textContent = token.chainId;
    
    // Set logo
    if (token.logoURI) {
        modalTokenLogo.src = token.logoURI;
        modalTokenLogo.style.display = 'block';
        modalTokenLogo.onerror = () => {
            modalTokenLogo.style.display = 'none';
        };
    } else {
        modalTokenLogo.style.display = 'none';
    }
    
    // Set tags
    if (token.tags && token.tags.length > 0) {
        modalTokenTags.innerHTML = token.tags.map(tag =>
            `<span class="tag ${tag}">${formatTagName(tag)}</span>`
        ).join('');
        modalTokenTagsContainer.style.display = 'block';
    } else {
        modalTokenTagsContainer.style.display = 'none';
    }
    
    // Store address for copying
    copyAddress.dataset.address = token.address;
    
    // Show modal
    tokenModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Hide token modal
function hideModal() {
    tokenModal.style.display = 'none';
    document.body.style.overflow = '';
}

// Copy token address to clipboard
async function copyTokenAddress() {
    const address = copyAddress.dataset.address;
    
    try {
        await navigator.clipboard.writeText(address);
        
        // Show success feedback
        const originalIcon = copyAddress.innerHTML;
        copyAddress.innerHTML = '<i class="fas fa-check"></i>';
        copyAddress.style.background = 'var(--success-color)';
        
        setTimeout(() => {
            copyAddress.innerHTML = originalIcon;
            copyAddress.style.background = 'var(--primary-color)';
        }, 2000);
        
    } catch (err) {
        console.error('Failed to copy address:', err);
        
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = address;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        // Show feedback
        const originalIcon = copyAddress.innerHTML;
        copyAddress.innerHTML = '<i class="fas fa-check"></i>';
        copyAddress.style.background = 'var(--success-color)';
        
        setTimeout(() => {
            copyAddress.innerHTML = originalIcon;
            copyAddress.style.background = 'var(--primary-color)';
        }, 2000);
    }
}

// Utility functions
function truncateAddress(address) {
    if (address.length <= 16) return address;
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showLoading() {
    loadingState.style.display = 'block';
    errorState.style.display = 'none';
    resultsInfo.style.display = 'none';
    tokenGrid.innerHTML = '';
}

function hideLoading() {
    loadingState.style.display = 'none';
}

function showError() {
    loadingState.style.display = 'none';
    errorState.style.display = 'block';
    resultsInfo.style.display = 'none';
    tokenGrid.innerHTML = '';
}

// Performance optimization: Intersection Observer for lazy loading
const observeTokenCards = () => {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target.querySelector('img');
                if (img && img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    observer.unobserve(entry.target);
                }
            }
        });
    });
    
    document.querySelectorAll('.token-card').forEach(card => {
        observer.observe(card);
    });
};

// Call lazy loading observer after rendering tokens
const originalRenderTokens = renderTokens;
renderTokens = function() {
    originalRenderTokens.call(this);
    setTimeout(observeTokenCards, 100);
};