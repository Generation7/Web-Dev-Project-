const REGISTRATION_STORAGE_KEY = 'knustEventHubRegistrations';

document.addEventListener('DOMContentLoaded', async () => {
    await loadLayoutPartials();
    setActiveNavigation();
    renderInitialLoadingState();

    const events = await fetchEvents();
    if (!events.length) {
        renderGlobalError('Unable to load events at the moment. Please try again later.');
        return;
    }

    renderHome(events);
    renderEventsPage(events);
    renderEventDetails(events);
    renderMyRegistrations(events);
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
        const response = await fetch('events.json', { cache: 'no-store' });
        if (!response.ok) throw new Error('Unable to fetch event data');
        const data = await response.json();
        return Array.isArray(data.events) ? data.events : [];
    } catch (error) {
        console.error('Error fetching events:', error);
        return [];
    }
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

function getSeatsLeft(event, registrationSet) {
    const baseRegistered = Number(event.registered || 0);
    const currentRegistered = registrationSet.has(Number(event.id)) ? baseRegistered + 1 : baseRegistered;
    return Math.max(Number(event.capacity || 0) - currentRegistered, 0);
}

function resolveImageSrc(event) {
    const base = event?.image || 'images/campus image.jpg';
    const cacheKey = `${event?.id || 'x'}-${String(event?.date || '')}`;
    return `${base}?v=${encodeURIComponent(cacheKey)}`;
}

function eventCardTemplate(event, registrationSet) {
    const seatsLeft = getSeatsLeft(event, registrationSet);
    const isFull = seatsLeft <= 0;
    const isRegistered = registrationSet.has(Number(event.id));

    return `
        <article class="event-card h-100 ${isRegistered ? 'is-registered' : ''}">
            <img src="${resolveImageSrc(event)}" class="event-card-image" alt="${event.title || 'Event image'}">
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
        registrationsContainer.innerHTML = `
            <div class="col-12">
                <div class="empty-state">
                    You have not registered for any event yet. Explore events to get started.
                </div>
            </div>
        `;
        return;
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

function renderEventsPage(events) {
    const eventsContainer = document.getElementById('events-container');
    if (!eventsContainer) return;

    const searchInput = document.getElementById('search-input');
    const dateFilter = document.getElementById('date-filter');
    const categoryFilter = document.getElementById('category-filter');
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
        const selectedSort = sortFilter?.value || 'soonest';

        let filtered = events.filter((event) => {
            const title = String(event.title || '').toLowerCase();
            const location = String(event.location || '').toLowerCase();
            const matchesSearch = title.includes(searchTerm) || location.includes(searchTerm);
            const eventDate = String(event.date).slice(0, 10);
            const matchesDate = !selectedDate || eventDate === selectedDate;
            const matchesCategory = selectedCategory === 'all' || event.category === selectedCategory;
            return matchesSearch && matchesDate && matchesCategory;
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

    [searchInput, dateFilter, categoryFilter, sortFilter].forEach((element) => {
        element?.addEventListener('input', applyFilters);
        element?.addEventListener('change', applyFilters);
    });

    clearFiltersButton?.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        if (dateFilter) dateFilter.value = '';
        if (categoryFilter) categoryFilter.value = 'all';
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
    const isRegistered = registrationSet.has(Number(event.id));
    const seatsLeft = getSeatsLeft(event, registrationSet);
    const isFull = seatsLeft <= 0;

    eventDetailsContainer.innerHTML = `
        <article class="event-detail-card">
            <img src="${resolveImageSrc(event)}" class="event-detail-image" alt="${event.title || 'Event image'}">
            <div class="event-detail-content">
                <div class="d-flex flex-wrap gap-2 mb-3">
                    <span class="pill">${event.category || 'General'}</span>
                    <span class="seat-status ${isFull ? 'full' : 'open'}">${isFull ? 'Full Capacity' : `${seatsLeft} seats left`}</span>
                </div>
                <h1 class="mb-3">${event.title}</h1>
                <p class="meta mb-2"><strong>Date:</strong> ${formatDate(event.date)}</p>
                <p class="meta mb-2"><strong>Location:</strong> ${event.location || 'Location TBA'}</p>
                <p class="meta mb-3"><strong>Organizer:</strong> ${event.organizer || 'KNUST Community'}</p>
                <p class="lead mb-3">${event.description || 'Details for this event will be updated soon.'}</p>
                <div class="d-flex flex-wrap gap-2 mb-4">
                    ${(event.tags || []).map((tag) => `<span class="tag">#${tag}</span>`).join('')}
                </div>

                <div class="d-flex flex-wrap gap-3">
                    <button id="register-button" class="btn ${isRegistered ? 'btn-outline-danger' : 'btn-brand'}" ${(!isRegistered && isFull) ? 'disabled' : ''}>
                        ${isRegistered ? 'Cancel Registration' : 'Register'}
                    </button>
                    <a href="events.html" class="btn btn-outline-brand">Back to Events</a>
                </div>
                <p id="registration-feedback" class="registration-feedback ${flashMessage?.type === 'error' ? 'text-danger' : flashMessage?.type === 'success' ? 'text-success' : ''} mt-3">${flashMessage?.text || ''}</p>
            </div>
        </article>
    `;

    const registerButton = document.getElementById('register-button');

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
