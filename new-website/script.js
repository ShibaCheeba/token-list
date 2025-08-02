// Mobile Navigation
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('nav-menu');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Close mobile menu when clicking on a link
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Navbar background on scroll
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.background = 'rgba(255, 255, 255, 0.98)';
        navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
    } else {
        navbar.style.background = 'rgba(255, 255, 255, 0.95)';
        navbar.style.boxShadow = 'none';
    }
});

// API Configuration
const API_BASE = window.location.origin.includes('localhost') ? 'http://localhost:3000' : window.location.origin;

// Authentication state
let currentUser = null;
let authToken = localStorage.getItem('authToken');

// Initialize authentication
if (authToken) {
    // Verify token is still valid
    fetch(`${API_BASE}/api/verify-token`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    }).then(response => {
        if (!response.ok) {
            localStorage.removeItem('authToken');
            authToken = null;
        }
    }).catch(() => {
        localStorage.removeItem('authToken');
        authToken = null;
    });
}

// Contact form handling
const contactForm = document.querySelector('.contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form data
        const formData = new FormData(this);
        const name = formData.get('name');
        const email = formData.get('email');
        const subject = formData.get('subject');
        const message = formData.get('message');
        
        // Basic validation
        if (!name || !email || !subject || !message) {
            showNotification('Please fill in all fields', 'error');
            return;
        }
        
        if (!isValidEmail(email)) {
            showNotification('Please enter a valid email address', 'error');
            return;
        }
        
        // Simulate form submission
        showNotification('Message sent successfully! We\'ll get back to you soon.', 'success');
        this.reset();
    });
}

// Client login form handling
const clientLoginForm = document.getElementById('client-login');
if (clientLoginForm) {
    clientLoginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const email = formData.get('email');
        const accessCode = formData.get('accessCode');
        
        if (!email || !accessCode) {
            showNotification('Please fill in all fields', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE}/api/client/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, accessCode })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                localStorage.setItem('authToken', data.token);
                currentUser = { ...data.client, type: 'client' };
                showNotification('Login successful! Redirecting to your portal...', 'success');
                
                setTimeout(() => {
                    showClientPortal();
                }, 1500);
            } else {
                showNotification(data.error || 'Login failed', 'error');
            }
        } catch (error) {
            showNotification('Connection error. Please try again.', 'error');
        }
    });
}

// Lawyer login form handling
const lawyerLoginForm = document.getElementById('lawyer-login');
if (lawyerLoginForm) {
    lawyerLoginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const email = formData.get('email');
        const password = formData.get('password');
        
        if (!email || !password) {
            showNotification('Please fill in all fields', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE}/api/lawyer/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                localStorage.setItem('authToken', data.token);
                currentUser = { ...data.lawyer, type: 'lawyer' };
                showNotification('Login successful! Loading dashboard...', 'success');
                
                setTimeout(() => {
                    showLawyerDashboard();
                }, 1500);
            } else {
                showNotification(data.error || 'Login failed', 'error');
            }
        } catch (error) {
            showNotification('Connection error. Please try again.', 'error');
        }
    });
}

// Email validation
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 400px;
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Close button functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }, 5000);
}

// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe elements for animations
document.querySelectorAll('.service-card, .portfolio-item, .about-text, .about-image').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// Counter animation for stats
const animateCounters = () => {
    const counters = document.querySelectorAll('.stat h4');
    
    counters.forEach(counter => {
        const target = parseInt(counter.textContent.replace('+', ''));
        const duration = 2000; // 2 seconds
        const step = target / (duration / 16); // 60fps
        let current = 0;
        
        const updateCounter = () => {
            current += step;
            if (current < target) {
                counter.textContent = Math.floor(current) + '+';
                requestAnimationFrame(updateCounter);
            } else {
                counter.textContent = target + '+';
            }
        };
        
        updateCounter();
    });
};

// Trigger counter animation when stats section is visible
const statsSection = document.querySelector('.about-stats');
if (statsSection) {
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounters();
                statsObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    statsObserver.observe(statsSection);
}

// Parallax effect for hero section
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const heroSection = document.querySelector('.hero');
    if (heroSection) {
        heroSection.style.transform = `translateY(${scrolled * 0.5}px)`;
    }
});

// Service card hover effects
document.querySelectorAll('.service-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-15px) scale(1.02)';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0) scale(1)';
    });
});

// Portfolio item hover effects
document.querySelectorAll('.portfolio-item').forEach(item => {
    item.addEventListener('mouseenter', function() {
        const image = this.querySelector('.portfolio-placeholder');
        if (image) {
            image.style.transform = 'scale(1.1)';
        }
    });
    
    item.addEventListener('mouseleave', function() {
        const image = this.querySelector('.portfolio-placeholder');
        if (image) {
            image.style.transform = 'scale(1)';
        }
    });
});

// Add transition styles to portfolio placeholders
document.querySelectorAll('.portfolio-placeholder').forEach(placeholder => {
    placeholder.style.transition = 'transform 0.3s ease';
});

// Button hover effects
document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-3px)';
    });
    
    btn.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
    });
});

// Loading animation
window.addEventListener('load', () => {
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.5s ease';
        document.body.style.opacity = '1';
    }, 100);
});

// Scroll to top functionality
const createScrollToTopButton = () => {
    const scrollBtn = document.createElement('button');
    scrollBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
    scrollBtn.className = 'scroll-to-top';
    scrollBtn.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        width: 50px;
        height: 50px;
        background: #2563eb;
        color: white;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        font-size: 1.2rem;
        display: none;
        z-index: 1000;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
    `;
    
    scrollBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    scrollBtn.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-3px)';
        this.style.boxShadow = '0 8px 20px rgba(37, 99, 235, 0.4)';
    });
    
    scrollBtn.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.3)';
    });
    
    document.body.appendChild(scrollBtn);
    
    // Show/hide scroll button based on scroll position
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            scrollBtn.style.display = 'block';
        } else {
            scrollBtn.style.display = 'none';
        }
    });
};

// Initialize scroll to top button
createScrollToTopButton();

// Lazy loading for images (if you add real images later)
const lazyLoad = () => {
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
};

// Initialize lazy loading
lazyLoad();

// Show client portal interface
function showClientPortal() {
    const portalHTML = `
        <div class="client-portal-app" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: white; z-index: 10000; overflow-y: auto;">
            <div class="portal-header" style="background: #1f2937; color: white; padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center;">
                <h2>Estate Planning Portal</h2>
                <button onclick="closePortal()" style="background: transparent; border: 1px solid white; color: white; padding: 0.5rem 1rem; border-radius: 5px; cursor: pointer;">Close</button>
            </div>
            <div class="portal-content" style="padding: 2rem; max-width: 800px; margin: 0 auto;">
                <div class="welcome-section" style="margin-bottom: 3rem; text-align: center;">
                    <h3>Welcome, ${currentUser.firstName || 'Client'}!</h3>
                    <p>Please complete your estate planning information below. All data is securely encrypted.</p>
                </div>
                
                <form id="estate-planning-form" style="display: grid; gap: 2rem;">
                    <div class="form-section">
                        <h4>Personal Information</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                            <input type="text" name="firstName" placeholder="First Name" required>
                            <input type="text" name="lastName" placeholder="Last Name" required>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
                            <input type="tel" name="phone" placeholder="Phone Number">
                            <input type="text" name="address" placeholder="Address">
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <h4>Marital Status</h4>
                        <select name="maritalStatus" required>
                            <option value="">Select Status</option>
                            <option value="single">Single</option>
                            <option value="married">Married</option>
                            <option value="divorced">Divorced</option>
                            <option value="widowed">Widowed</option>
                        </select>
                        <input type="text" name="spouseName" placeholder="Spouse Name (if married)" style="margin-top: 1rem;">
                    </div>
                    
                    <div class="form-section">
                        <h4>Children & Beneficiaries</h4>
                        <textarea name="children" placeholder="List children (names, ages, relationships)" rows="3"></textarea>
                        <textarea name="beneficiaries" placeholder="Primary and secondary beneficiaries" rows="3" style="margin-top: 1rem;"></textarea>
                    </div>
                    
                    <div class="form-section">
                        <h4>Assets</h4>
                        <textarea name="assets" placeholder="Real estate, bank accounts, investments, personal property..." rows="4"></textarea>
                    </div>
                    
                    <div class="form-section">
                        <h4>Healthcare Preferences</h4>
                        <textarea name="healthcarePreferences" placeholder="Healthcare directives, life support preferences, organ donation..." rows="3"></textarea>
                    </div>
                    
                    <div class="form-section">
                        <h4>Executor Preferences</h4>
                        <textarea name="executorPreferences" placeholder="Who would you like to manage your estate?" rows="2"></textarea>
                    </div>
                    
                    <div class="form-section">
                        <h4>Special Instructions</h4>
                        <textarea name="specialInstructions" placeholder="Any special requests or instructions..." rows="3"></textarea>
                    </div>
                    
                    <button type="submit" style="background: #2563eb; color: white; padding: 1rem 2rem; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer;">
                        Save Estate Planning Information
                    </button>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', portalHTML);
    
    // Handle form submission
    document.getElementById('estate-planning-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const estateData = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            phone: formData.get('phone'),
            address: formData.get('address'),
            maritalStatus: formData.get('maritalStatus'),
            spouseName: formData.get('spouseName'),
            children: formData.get('children'),
            beneficiaries: formData.get('beneficiaries'),
            assets: formData.get('assets'),
            healthcarePreferences: formData.get('healthcarePreferences'),
            executorPreferences: formData.get('executorPreferences'),
            specialInstructions: formData.get('specialInstructions')
        };
        
        try {
            const response = await fetch(`${API_BASE}/api/client/estate-data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(estateData)
            });
            
            if (response.ok) {
                showNotification('Your estate planning information has been saved successfully!', 'success');
                setTimeout(() => {
                    closePortal();
                }, 2000);
            } else {
                const error = await response.json();
                showNotification(error.error || 'Failed to save information', 'error');
            }
        } catch (error) {
            showNotification('Connection error. Please try again.', 'error');
        }
    });
}

// Show lawyer dashboard
function showLawyerDashboard() {
    const dashboardHTML = `
        <div class="lawyer-dashboard-app" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: white; z-index: 10000; overflow-y: auto;">
            <div class="dashboard-header" style="background: #1f2937; color: white; padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center;">
                <h2>Lawyer Dashboard</h2>
                <div>
                    <button onclick="showInviteClientModal()" style="background: #2563eb; border: none; color: white; padding: 0.5rem 1rem; border-radius: 5px; cursor: pointer; margin-right: 1rem;">Invite Client</button>
                    <button onclick="closeDashboard()" style="background: transparent; border: 1px solid white; color: white; padding: 0.5rem 1rem; border-radius: 5px; cursor: pointer;">Close</button>
                </div>
            </div>
            <div class="dashboard-content" style="padding: 2rem;">
                <div id="dashboard-stats" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 2rem; margin-bottom: 3rem;">
                    <!-- Stats will be loaded here -->
                </div>
                <div class="clients-section">
                    <h3>Your Clients</h3>
                    <div id="clients-list" style="margin-top: 2rem;">
                        <!-- Clients will be loaded here -->
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', dashboardHTML);
    loadDashboardData();
}

// Load dashboard data
async function loadDashboardData() {
    try {
        const response = await fetch(`${API_BASE}/api/lawyer/dashboard`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayDashboardStats(data.statistics);
            displayClientsList(data.clients);
        } else {
            showNotification('Failed to load dashboard data', 'error');
        }
    } catch (error) {
        showNotification('Connection error loading dashboard', 'error');
    }
}

// Display dashboard statistics
function displayDashboardStats(stats) {
    const statsContainer = document.getElementById('dashboard-stats');
    statsContainer.innerHTML = `
        <div style="background: #f9fafb; padding: 2rem; border-radius: 10px; text-align: center;">
            <h4 style="color: #2563eb; font-size: 2rem; margin-bottom: 0.5rem;">${stats.total_invitations || 0}</h4>
            <p>Total Invitations Sent</p>
        </div>
        <div style="background: #f9fafb; padding: 2rem; border-radius: 10px; text-align: center;">
            <h4 style="color: #10b981; font-size: 2rem; margin-bottom: 0.5rem;">${stats.downloads || 0}</h4>
            <p>App Downloads</p>
        </div>
    `;
}

// Display clients list
function displayClientsList(clients) {
    const clientsContainer = document.getElementById('clients-list');
    
    if (clients.length === 0) {
        clientsContainer.innerHTML = '<p style="color: #6b7280; text-align: center; padding: 2rem;">No clients yet. Start by inviting your first client!</p>';
        return;
    }
    
    clientsContainer.innerHTML = clients.map(client => `
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 10px; padding: 1.5rem; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <h4>${client.first_name || client.email}</h4>
                <p style="color: #6b7280; margin: 0.5rem 0;">Email: ${client.email}</p>
                <p style="color: #6b7280; margin: 0;">Status: ${client.profile_completed ? '✅ Profile Complete' : '⏳ Pending'}</p>
            </div>
            <div>
                <span style="background: ${client.estate_completed ? '#10b981' : '#f59e0b'}; color: white; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.875rem;">
                    ${client.estate_completed ? 'Estate Complete' : 'In Progress'}
                </span>
            </div>
        </div>
    `).join('');
}

// Show invite client modal
function showInviteClientModal() {
    const modalHTML = `
        <div class="invite-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10001; display: flex; align-items: center; justify-content: center;">
            <div style="background: white; padding: 2rem; border-radius: 15px; width: 90%; max-width: 500px;">
                <h3>Invite New Client</h3>
                <form id="invite-client-form" style="margin-top: 1.5rem;">
                    <div style="margin-bottom: 1rem;">
                        <input type="text" name="clientName" placeholder="Client Name" required style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 5px;">
                    </div>
                    <div style="margin-bottom: 1.5rem;">
                        <input type="email" name="clientEmail" placeholder="Client Email" required style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 5px;">
                    </div>
                    <div style="display: flex; gap: 1rem;">
                        <button type="submit" style="flex: 1; background: #2563eb; color: white; padding: 0.75rem; border: none; border-radius: 5px; cursor: pointer;">Send Invitation</button>
                        <button type="button" onclick="closeInviteModal()" style="flex: 1; background: #6b7280; color: white; padding: 0.75rem; border: none; border-radius: 5px; cursor: pointer;">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    document.getElementById('invite-client-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const clientData = {
            clientName: formData.get('clientName'),
            clientEmail: formData.get('clientEmail')
        };
        
        try {
            const response = await fetch(`${API_BASE}/api/lawyer/invite-client`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(clientData)
            });
            
            if (response.ok) {
                const result = await response.json();
                showNotification(`Invitation sent successfully! Access code: ${result.accessCode}`, 'success');
                closeInviteModal();
                loadDashboardData(); // Refresh the dashboard
            } else {
                const error = await response.json();
                showNotification(error.error || 'Failed to send invitation', 'error');
            }
        } catch (error) {
            showNotification('Connection error. Please try again.', 'error');
        }
    });
}

// Close functions
function closePortal() {
    const portal = document.querySelector('.client-portal-app');
    if (portal) portal.remove();
}

function closeDashboard() {
    const dashboard = document.querySelector('.lawyer-dashboard-app');
    if (dashboard) dashboard.remove();
}

function closeInviteModal() {
    const modal = document.querySelector('.invite-modal');
    if (modal) modal.remove();
}

console.log('🚀 Legal Estate Pro platform loaded successfully!');