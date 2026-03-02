const REGISTRATION_STORAGE_KEY = 'knustEventHubRegistrations';
const AUTH_STORAGE_KEY = 'knustEventHubAuthUser';
const WAITLIST_STORAGE_KEY = 'knustEventHubWaitlist';
const EVENTS_STORAGE_KEY = 'knustEventHubEventsStore';
const USERS_STORAGE_KEY = 'knustEventHubUsers';

document.addEventListener('DOMContentLoaded', async () => {
    await loadLayoutPartials();
    updateAuthNavigation();
    setActiveNavigation();
    initLoginPage();
    renderInitialLoadingState();

    let events = await fetchEvents();
    if (!events.length) {
        renderGlobalError('Unable to load events at the moment. Please try again later.');
        return;
    }

    renderHome(events);
    renderEventsPage(events);
    renderEventDetails(events);
    renderMyRegistrations(events);
    renderAdminPage(events);
});

async function loadLayoutPartials() {
    const headerPlaceholder = document.getElementById('header-placeholder');
    const footerPlaceholder = document.getElementById('footer-placeholder');

    try {
        if (headerPlaceholder) {
            const headerResponse = await fetch('components/header.html', { cache: 'no-store' });
            headerPlaceholder.innerHTML = await headerResponse.text();
        }

        if (footerPlaceholder) {
            const footerResponse = await fetch('components/footer.html', { cache: 'no-store' });
            footerPlaceholder.innerHTML = await footerResponse.text();
        }
    } catch (error) {
        console.error('Error loading reusable layout components:', error);
    }
}

function setActiveNavigation() {
    const currentPage = document.body.dataset.page;
    if (!currentPage) return;

    document.querySelectorAll('.nav-link[data-page]').forEach((link) => {
        if (link.dataset.page === currentPage) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
        }
    });
}

async function fetchEvents() {
    try {
        const cachedEvents = localStorage.getItem(EVENTS_STORAGE_KEY);
        if (cachedEvents) {
            const parsed = JSON.parse(cachedEvents);
            if (Array.isArray(parsed) && parsed.length) return parsed;
        }

        const response = await fetch('events.json', { cache: 'no-store' });
        if (!response.ok) throw new Error('Unable to fetch event data');
        const data = await response.json();
        const events = Array.isArray(data.events) ? data.events : [];
        saveEventsStore(events);
        return events;
    } catch (error) {
        console.error('Error fetching events:', error);
        return [];
    }
}

function saveEventsStore(events) {
    localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
}

function renderInitialLoadingState() {
    const targets = [
        document.getElementById('upcoming-events-container'),
        document.getElementById('events-container'),
        document.getElementById('event-details-container'),
        document.getElementById('my-registrations-container')
    ].filter(Boolean);

    targets.forEach((element) => {
        element.innerHTML = '<div class="loading-state" role="status" aria-live="polite">Loading events...</div>';
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'Date TBA';

    return date.toLocaleString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getRegistrationSet() {
    try {
        const raw = localStorage.getItem(REGISTRATION_STORAGE_KEY);
        const ids = raw ? JSON.parse(raw) : [];
        return new Set(ids.map(Number));
    } catch {
        return new Set();
    }
}

function saveRegistrationSet(set) {
    localStorage.setItem(REGISTRATION_STORAGE_KEY, JSON.stringify([...set]));
}

function getCurrentUser() {
    try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function setCurrentUser(user) {
    if (!user) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        return;
    }
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
}

function getStoredUsers() {
    try {
        const raw = localStorage.getItem(USERS_STORAGE_KEY);
        const users = raw ? JSON.parse(raw) : [];
        return Array.isArray(users) ? users : [];
    } catch {
        return [];
    }
}

function saveStoredUsers(users) {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

function getWaitlistMap() {
    try {
        const raw = localStorage.getItem(WAITLIST_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function saveWaitlistMap(waitlist) {
    localStorage.setItem(WAITLIST_STORAGE_KEY, JSON.stringify(waitlist));
}

function getUserIdentifier() {
    const user = getCurrentUser();
    return user?.email || null;
}

function updateAuthNavigation() {
    const loginLink = document.querySelector('.nav-link[data-page="login"]');
    const adminLink = document.querySelector('.nav-link[data-page="admin"]');
    const user = getCurrentUser();

    if (adminLink?.parentElement) {
        adminLink.parentElement.style.display = user?.role === 'admin' ? '' : 'none';
    }

    if (!loginLink) return;

    if (user) {
        loginLink.textContent = `Logout (${user.name})`;
        loginLink.href = '#';
        loginLink.onclick = (event) => {
            event.preventDefault();
            setCurrentUser(null);
            showToast('Logged out successfully.', 'success');
            window.location.href = 'index.html';
        };
    } else {
        loginLink.textContent = 'Login';
        loginLink.href = 'login.html';
        loginLink.onclick = null;
    }
}

function initLoginPage() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const loginStatus = document.getElementById('login-status');
    const loginPanel = document.getElementById('login-panel');
    const signupPanel = document.getElementById('signup-panel');
    const showLoginButton = document.getElementById('show-login');
    const showSignupButton = document.getElementById('show-signup');

    if (!loginForm) return;

    const activateTab = (tab) => {
        const loginActive = tab === 'login';
        if (loginPanel) loginPanel.classList.toggle('d-none', !loginActive);
        if (signupPanel) signupPanel.classList.toggle('d-none', loginActive);

        if (showLoginButton) {
            showLoginButton.classList.toggle('btn-brand', loginActive);
            showLoginButton.classList.toggle('btn-outline-brand', !loginActive);
            showLoginButton.classList.toggle('active', loginActive);
            showLoginButton.setAttribute('aria-selected', String(loginActive));
        }

        if (showSignupButton) {
            showSignupButton.classList.toggle('btn-brand', !loginActive);
            showSignupButton.classList.toggle('btn-outline-brand', loginActive);
            showSignupButton.classList.toggle('active', !loginActive);
            showSignupButton.setAttribute('aria-selected', String(!loginActive));
        }
    };

    showLoginButton?.addEventListener('click', () => activateTab('login'));
    showSignupButton?.addEventListener('click', () => activateTab('signup'));
    activateTab('login');

    const existingUser = getCurrentUser();
    if (existingUser && loginStatus) {
        loginStatus.textContent = `Signed in as ${existingUser.name} (${existingUser.role}).`;
    }

    loginForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const email = document.getElementById('login-email')?.value.trim().toLowerCase();
        const password = document.getElementById('login-password')?.value;
        const role = document.getElementById('login-role')?.value || 'student';
        const users = getStoredUsers();
        const account = users.find((user) => user.email === email && user.role === role);

        if (!email || !password) {
            if (loginStatus) loginStatus.textContent = 'Please fill in all fields.';
            return;
        }

        if (!account || account.password !== password) {
            if (loginStatus) loginStatus.textContent = 'Invalid credentials. Please check your details or sign up first.';
            showToast('Login failed. Invalid credentials.', 'error');
            return;
        }

        setCurrentUser({ name: account.name, email: account.email, role: account.role });
        updateAuthNavigation();
        showToast('Login successful.', 'success');

        if (loginStatus) loginStatus.textContent = `Welcome ${account.name}! Redirecting...`;
        setTimeout(() => {
            window.location.href = role === 'admin' ? 'admin.html' : 'index.html';
        }, 700);
    });

    signupForm?.addEventListener('submit', (event) => {
        event.preventDefault();
        const name = document.getElementById('signup-name')?.value.trim();
        const email = document.getElementById('signup-email')?.value.trim().toLowerCase();
        const password = document.getElementById('signup-password')?.value;
        const role = document.getElementById('signup-role')?.value || 'student';

        if (!name || !email || !password) {
            if (loginStatus) loginStatus.textContent = 'Please complete all signup fields.';
            return;
        }

        if (password.length < 6) {
            if (loginStatus) loginStatus.textContent = 'Password must be at least 6 characters.';
            showToast('Use a stronger password (minimum 6 characters).', 'error');
            return;
        }

        const users = getStoredUsers();
        const exists = users.some((user) => user.email === email && user.role === role);

        if (exists) {
            if (loginStatus) loginStatus.textContent = 'An account with this email and role already exists.';
            showToast('Account already exists. Please login.', 'error');
            return;
        }

        users.push({ name, email, password, role, createdAt: new Date().toISOString() });
        saveStoredUsers(users);
        setCurrentUser({ name, email, role });
        updateAuthNavigation();
        showToast('Signup successful. You are now logged in.', 'success');

        if (loginStatus) loginStatus.textContent = `Account created for ${name}. Redirecting...`;
        signupForm.reset();

        setTimeout(() => {
            window.location.href = role === 'admin' ? 'admin.html' : 'index.html';
        }, 700);
    });
}

function ensureToastContainer() {
    let toastRegion = document.getElementById('app-toast-region');
    if (!toastRegion) {
        toastRegion = document.createElement('div');
        toastRegion.id = 'app-toast-region';
        toastRegion.className = 'app-toast-region';
        toastRegion.setAttribute('aria-live', 'polite');
        toastRegion.setAttribute('aria-atomic', 'true');
        document.body.appendChild(toastRegion);
    }
    return toastRegion;
}

function showToast(message, type = 'success') {
    if (!message) return;
    const toastRegion = ensureToastContainer();
    const toast = document.createElement('div');
    toast.className = `app-toast ${type === 'error' ? 'error' : 'success'}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.textContent = message;

    toastRegion.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    const removeToast = () => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 220);
    };

    setTimeout(removeToast, 2800);
}

function getSeatsLeft(event, registrationSet) {
    const baseRegistered = Number(event.registered || 0);
    const currentRegistered = registrationSet.has(Number(event.id)) ? baseRegistered + 1 : baseRegistered;
    return Math.max(Number(event.capacity || 0) - currentRegistered, 0);
}

function resolveImageSrc(event) {
    const base = event?.image || 'images/campus image.jpg';
    return encodeURI(base);
}

function eventCardTemplate(event, registrationSet) {
    const seatsLeft = getSeatsLeft(event, registrationSet);
    const isFull = seatsLeft <= 0;
    const isRegistered = registrationSet.has(Number(event.id));

    return `
        <article class="event-card h-100 ${isRegistered ? 'is-registered' : ''}">
            <img src="${resolveImageSrc(event)}" class="event-card-image" alt="${event.title || 'Event image'}" loading="lazy" onerror="this.onerror=null;this.src='images/campus image.jpg';">
            <div class="event-card-body">
                <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
                    <span class="pill">${event.category || 'General'}</span>
                    <span class="seat-status ${isFull ? 'full' : 'open'}">${isFull ? 'Full' : `${seatsLeft} seats left`}</span>
                </div>
                ${isRegistered ? '<p class="registered-indicator mb-2">✓ Registered</p>' : ''}
                <h3 class="h5 mb-2">${event.title || 'Untitled Event'}</h3>
                <p class="meta mb-1"><strong>Date:</strong> ${formatDate(event.date)}</p>
                <p class="meta mb-1"><strong>Location:</strong> ${event.location || 'Location TBA'}</p>
                <p class="meta mb-3"><strong>Organizer:</strong> ${event.organizer || 'KNUST Community'}</p>
                <div class="d-flex flex-wrap gap-2 mb-3">
                    ${(event.tags || []).slice(0, 3).map(tag => `<span class="tag">#${tag}</span>`).join('')}
                </div>
                <a href="eventdetails.html?id=${event.id}" class="btn btn-brand w-100">View Details</a>
            </div>
        </article>
    `;
}

function renderHome(events) {
    const upcomingContainer = document.getElementById('upcoming-events-container');
    if (!upcomingContainer) return;

    const registrationSet = getRegistrationSet();
    const sorted = [...events].sort((a, b) => new Date(a.date) - new Date(b.date));
    const featured = sorted.slice(0, 3);

    if (!featured.length) {
        upcomingContainer.innerHTML = '<div class="col-12"><div class="empty-state">No upcoming events available right now.</div></div>';
    } else {
        upcomingContainer.innerHTML = featured.map((event) => `
            <div class="col-md-6 col-lg-4">
                ${eventCardTemplate(event, registrationSet)}
            </div>
        `).join('');
    }

    const totalEvents = events.length;
    const openEvents = events.filter((event) => getSeatsLeft(event, registrationSet) > 0).length;
    const totalSeats = events.reduce((sum, event) => sum + getSeatsLeft(event, registrationSet), 0);

    const totalElement = document.getElementById('stat-total');
    const openElement = document.getElementById('stat-open');
    const seatsElement = document.getElementById('stat-seats');

    if (totalElement) totalElement.textContent = totalEvents;
    if (openElement) openElement.textContent = openEvents;
    if (seatsElement) seatsElement.textContent = totalSeats;
}

function renderMyRegistrations(events) {
    const registrationsContainer = document.getElementById('my-registrations-container');
    if (!registrationsContainer) return;

    const registrationSet = getRegistrationSet();
    const registeredEvents = events
        .filter((event) => registrationSet.has(Number(event.id)))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (!registeredEvents.length) {
        updateRegistrationSummary([], events, registrationSet);
        registrationsContainer.innerHTML = `
            <div class="col-12">
                <div class="empty-state">
                    You have not registered for any event yet. Explore events to get started.
                </div>
            </div>
        `;
        return;
    }

    updateRegistrationSummary(registeredEvents, events, registrationSet);

    const clearButton = document.getElementById('clear-registrations-btn');
    if (clearButton) {
        clearButton.onclick = () => {
            localStorage.removeItem(REGISTRATION_STORAGE_KEY);
            showToast('All registrations cleared.', 'success');
            renderMyRegistrations(events);
        };
    }

    registrationsContainer.innerHTML = registeredEvents.map((event) => `
        <div class="col-md-6">
            <article class="registration-item h-100">
                <h3 class="h6 mb-1">${event.title || 'Untitled Event'}</h3>
                <p class="meta mb-1"><strong>Date:</strong> ${formatDate(event.date)}</p>
                <p class="meta mb-3"><strong>Location:</strong> ${event.location || 'Location TBA'}</p>
                <a href="eventdetails.html?id=${event.id}" class="btn btn-sm btn-outline-brand">Manage Registration</a>
            </article>
        </div>
    `).join('');
}

function renderAdminPage(events) {
    const adminList = document.getElementById('admin-events-list');
    const adminForm = document.getElementById('admin-event-form');
    if (!adminList || !adminForm) return;

    const user = getCurrentUser();
    if (!user || user.role !== 'admin') {
        adminList.innerHTML = `
            <div class="empty-state">
                Admin access required. Please <a href="login.html">login as admin</a>.
            </div>
        `;
        adminForm.querySelectorAll('input, textarea, select, button').forEach((el) => (el.disabled = true));
        return;
    }

    const renderAdminList = () => {
        adminList.innerHTML = events
            .slice()
            .sort((a, b) => Number(a.id) - Number(b.id))
            .map(
                (event) => `
            <article class="registration-item mb-3">
                <div class="d-flex justify-content-between flex-wrap gap-2 align-items-start">
                    <div>
                        <h3 class="h6 mb-1">${event.title}</h3>
                        <p class="meta mb-1"><strong>ID:</strong> ${event.id} | <strong>Date:</strong> ${formatDate(event.date)}</p>
                        <p class="meta mb-0"><strong>Category:</strong> ${event.category || 'General'} | <strong>Capacity:</strong> ${event.capacity || 0}</p>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-brand admin-edit-btn" data-id="${event.id}">Edit</button>
                        <button class="btn btn-sm btn-outline-danger admin-delete-btn" data-id="${event.id}">Delete</button>
                    </div>
                </div>
            </article>
        `
            )
            .join('');
    };

    renderAdminList();

    adminForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const editId = Number(document.getElementById('admin-event-id')?.value || 0);
        const formData = {
            id: editId || Math.max(0, ...events.map((e) => Number(e.id) || 0)) + 1,
            title: document.getElementById('admin-title')?.value.trim(),
            date: document.getElementById('admin-date')?.value,
            location: document.getElementById('admin-location')?.value.trim(),
            category: document.getElementById('admin-category')?.value.trim(),
            organizer: document.getElementById('admin-organizer')?.value.trim(),
            capacity: Number(document.getElementById('admin-capacity')?.value || 0),
            registered: Number(document.getElementById('admin-registered')?.value || 0),
            description: document.getElementById('admin-description')?.value.trim(),
            tags: (document.getElementById('admin-tags')?.value || '')
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean),
            image: document.getElementById('admin-image')?.value.trim() || 'images/campus image.jpg'
        };

        if (!formData.title || !formData.date || !formData.location) {
            showToast('Title, date, and location are required.', 'error');
            return;
        }

        const index = events.findIndex((item) => Number(item.id) === Number(formData.id));
        if (index >= 0) {
            events[index] = formData;
            showToast('Event updated successfully.', 'success');
        } else {
            events.push(formData);
            showToast('Event created successfully.', 'success');
        }

        saveEventsStore(events);
        adminForm.reset();
        const idField = document.getElementById('admin-event-id');
        if (idField) idField.value = '';
        renderAdminList();
    });

    document.getElementById('admin-cancel-edit')?.addEventListener('click', () => {
        adminForm.reset();
        const idField = document.getElementById('admin-event-id');
        if (idField) idField.value = '';
    });

    adminList.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        if (target.classList.contains('admin-delete-btn')) {
            const id = Number(target.dataset.id);
            const nextEvents = events.filter((item) => Number(item.id) !== id);
            events.splice(0, events.length, ...nextEvents);
            saveEventsStore(events);
            showToast('Event deleted.', 'success');
            renderAdminList();
            return;
        }

        if (target.classList.contains('admin-edit-btn')) {
            const id = Number(target.dataset.id);
            const item = events.find((eventItem) => Number(eventItem.id) === id);
            if (!item) return;

            document.getElementById('admin-event-id').value = item.id;
            document.getElementById('admin-title').value = item.title || '';
            document.getElementById('admin-date').value = String(item.date || '').slice(0, 16);
            document.getElementById('admin-location').value = item.location || '';
            document.getElementById('admin-category').value = item.category || '';
            document.getElementById('admin-organizer').value = item.organizer || '';
            document.getElementById('admin-capacity').value = item.capacity || 0;
            document.getElementById('admin-registered').value = item.registered || 0;
            document.getElementById('admin-description').value = item.description || '';
            document.getElementById('admin-tags').value = (item.tags || []).join(', ');
            document.getElementById('admin-image').value = item.image || '';
            showToast('Edit mode enabled for selected event.', 'success');
        }
    });
}

function updateRegistrationSummary(registeredEvents, allEvents, registrationSet) {
    const regCount = document.getElementById('reg-count');
    const upcomingCount = document.getElementById('reg-upcoming-count');
    const openCount = document.getElementById('reg-open-count');

    if (!regCount && !upcomingCount && !openCount) return;

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const upcomingThisMonth = registeredEvents.filter((event) => {
        const d = new Date(event.date);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear && d >= now;
    }).length;

    const openRegistrations = allEvents.filter((event) => getSeatsLeft(event, registrationSet) > 0).length;

    if (regCount) regCount.textContent = String(registeredEvents.length);
    if (upcomingCount) upcomingCount.textContent = String(upcomingThisMonth);
    if (openCount) openCount.textContent = String(openRegistrations);
}

function renderEventsPage(events) {
    const eventsContainer = document.getElementById('events-container');
    if (!eventsContainer) return;

    const searchInput = document.getElementById('search-input');
    const dateFilter = document.getElementById('date-filter');
    const categoryFilter = document.getElementById('category-filter');
    const registrationFilter = document.getElementById('registration-filter');
    const sortFilter = document.getElementById('sort-filter');
    const clearFiltersButton = document.getElementById('clear-filters');
    const resultsCount = document.getElementById('results-count');

    const categories = [...new Set(events.map((event) => event.category).filter(Boolean))];
    categories.forEach((category) => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter?.appendChild(option);
    });

    const applyFilters = () => {
        const registrationSet = getRegistrationSet();
        const searchTerm = (searchInput?.value || '').trim().toLowerCase();
        const selectedDate = dateFilter?.value;
        const selectedCategory = categoryFilter?.value || 'all';
        const selectedRegistration = registrationFilter?.value || 'all';
        const selectedSort = sortFilter?.value || 'soonest';

        let filtered = events.filter((event) => {
            const title = String(event.title || '').toLowerCase();
            const location = String(event.location || '').toLowerCase();
            const matchesSearch = title.includes(searchTerm) || location.includes(searchTerm);
            const eventDate = String(event.date).slice(0, 10);
            const matchesDate = !selectedDate || eventDate === selectedDate;
            const matchesCategory = selectedCategory === 'all' || event.category === selectedCategory;
            const isRegistered = registrationSet.has(Number(event.id));
            const matchesRegistration =
                selectedRegistration === 'all' ||
                (selectedRegistration === 'registered' && isRegistered) ||
                (selectedRegistration === 'not-registered' && !isRegistered);

            return matchesSearch && matchesDate && matchesCategory && matchesRegistration;
        });

        filtered.sort((a, b) => {
            if (selectedSort === 'latest') return new Date(b.date) - new Date(a.date);
            if (selectedSort === 'availability') return getSeatsLeft(b, registrationSet) - getSeatsLeft(a, registrationSet);
            return new Date(a.date) - new Date(b.date);
        });

        if (resultsCount) {
            resultsCount.textContent = `${filtered.length} event${filtered.length === 1 ? '' : 's'}`;
        }

        if (!filtered.length) {
            eventsContainer.innerHTML = '<div class="col-12"><div class="empty-state">No events match your filters. Try adjusting your search criteria.</div></div>';
            return;
        }

        eventsContainer.innerHTML = filtered.map((event) => `
            <div class="col-md-6 col-xl-4">
                ${eventCardTemplate(event, registrationSet)}
            </div>
        `).join('');
    };

    [searchInput, dateFilter, categoryFilter, registrationFilter, sortFilter].forEach((element) => {
        element?.addEventListener('input', applyFilters);
        element?.addEventListener('change', applyFilters);
    });

    clearFiltersButton?.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        if (dateFilter) dateFilter.value = '';
        if (categoryFilter) categoryFilter.value = 'all';
        if (registrationFilter) registrationFilter.value = 'all';
        if (sortFilter) sortFilter.value = 'soonest';
        applyFilters();
    });

    applyFilters();
}

function renderEventDetails(events, flashMessage = null) {
    const eventDetailsContainer = document.getElementById('event-details-container');
    if (!eventDetailsContainer) return;

    const params = new URLSearchParams(window.location.search);
    const eventId = Number(params.get('id'));

    if (!Number.isFinite(eventId)) {
        eventDetailsContainer.innerHTML = `
            <div class="content-card text-center">
                <h1 class="h3">No event selected</h1>
                <p>Please choose an event from the events page to view details.</p>
                <a href="events.html" class="btn btn-brand">Go to Events</a>
            </div>
        `;
        return;
    }

    const event = events.find((item) => Number(item.id) === eventId);

    if (!event) {
        eventDetailsContainer.innerHTML = `
            <div class="content-card text-center">
                <h1 class="h3">Event not found</h1>
                <p>The event you are looking for does not exist or has been removed.</p>
                <a href="events.html" class="btn btn-brand">Back to Events</a>
            </div>
        `;
        return;
    }

    const registrationSet = getRegistrationSet();
    const waitlistMap = getWaitlistMap();
    const userId = getUserIdentifier();
    const isRegistered = registrationSet.has(Number(event.id));
    const seatsLeft = getSeatsLeft(event, registrationSet);
    const isFull = seatsLeft <= 0;
    const waitlistUsers = waitlistMap[String(event.id)] || [];
    const inWaitlist = userId ? waitlistUsers.includes(userId) : false;

    eventDetailsContainer.innerHTML = `
        <article class="event-detail-card">
            <img src="${resolveImageSrc(event)}" class="event-detail-image" alt="${event.title || 'Event image'}" onerror="this.onerror=null;this.src='images/campus image.jpg';">
            <div class="event-detail-content">
                <div class="d-flex flex-wrap gap-2 mb-3">
                    <span class="pill">${event.category || 'General'}</span>
                    <span class="seat-status ${isFull ? 'full' : 'open'}">${isFull ? 'Full Capacity' : `${seatsLeft} seats left`}</span>
                </div>
                <h1 class="mb-3">${event.title}</h1>
                <p class="meta mb-2"><strong>Date:</strong> ${formatDate(event.date)}</p>
                <p class="meta mb-2"><strong>Location:</strong> ${event.location || 'Location TBA'}</p>
                <p class="meta mb-3"><strong>Organizer:</strong> ${event.organizer || 'KNUST Community'}</p>
                <p class="meta mb-3"><strong>Waitlist:</strong> ${waitlistUsers.length} student(s)</p>
                <p class="lead mb-3">${event.description || 'Details for this event will be updated soon.'}</p>
                <div class="d-flex flex-wrap gap-2 mb-4">
                    ${(event.tags || []).map((tag) => `<span class="tag">#${tag}</span>`).join('')}
                </div>

                <div class="d-flex flex-wrap gap-3">
                    <button id="register-button" class="btn ${isRegistered ? 'btn-outline-danger' : 'btn-brand'}" ${(!isRegistered && isFull) ? 'disabled' : ''}>
                        ${isRegistered ? 'Cancel Registration' : 'Register'}
                    </button>
                    ${isFull && !isRegistered ? `<button id="waitlist-button" class="btn ${inWaitlist ? 'btn-outline-danger' : 'btn-outline-brand'}">${inWaitlist ? 'Leave Waitlist' : 'Join Waitlist'}</button>` : ''}
                    <a href="events.html" class="btn btn-outline-brand">Back to Events</a>
                </div>
                <p id="registration-feedback" class="registration-feedback ${flashMessage?.type === 'error' ? 'text-danger' : flashMessage?.type === 'success' ? 'text-success' : ''} mt-3">${flashMessage?.text || ''}</p>
            </div>
        </article>
    `;

    const registerButton = document.getElementById('register-button');
    const waitlistButton = document.getElementById('waitlist-button');

    if (flashMessage?.text) {
        showToast(flashMessage.text, flashMessage.type === 'error' ? 'error' : 'success');
    }

    registerButton?.addEventListener('click', () => {
        const registrations = getRegistrationSet();

        if (registrations.has(Number(event.id))) {
            registrations.delete(Number(event.id));
            saveRegistrationSet(registrations);
            renderEventDetails(events, {
                type: 'error',
                text: 'Registration cancelled successfully.'
            });
        } else {
            const latestSeatsLeft = getSeatsLeft(event, registrations);
            if (latestSeatsLeft <= 0) {
                renderEventDetails(events, {
                    type: 'error',
                    text: 'Sorry, this event is already full.'
                });
                return;
            }

            registrations.add(Number(event.id));
            saveRegistrationSet(registrations);
            renderEventDetails(events, {
                type: 'success',
                text: 'You are registered! A confirmation has been saved locally.'
            });
        }
    });

    waitlistButton?.addEventListener('click', () => {
        const currentUserId = getUserIdentifier();
        if (!currentUserId) {
            showToast('Please login first to join the waitlist.', 'error');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 600);
            return;
        }

        const latestWaitlist = getWaitlistMap();
        const key = String(event.id);
        const users = new Set(latestWaitlist[key] || []);

        if (users.has(currentUserId)) {
            users.delete(currentUserId);
            latestWaitlist[key] = [...users];
            saveWaitlistMap(latestWaitlist);
            renderEventDetails(events, { type: 'success', text: 'You left the waitlist.' });
        } else {
            users.add(currentUserId);
            latestWaitlist[key] = [...users];
            saveWaitlistMap(latestWaitlist);
            renderEventDetails(events, { type: 'success', text: 'You joined the waitlist successfully.' });
        }
    });
}

function renderGlobalError(message) {
    const targets = [
        document.getElementById('upcoming-events-container'),
        document.getElementById('events-container'),
        document.getElementById('event-details-container'),
        document.getElementById('my-registrations-container')
    ].filter(Boolean);

    targets.forEach((element) => {
        element.innerHTML = `<div class="empty-state" role="alert">${message}</div>`;
    });
}
