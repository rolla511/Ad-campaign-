const leadElements = {
  inbox: document.getElementById('leadNotifications'),
  inboxStatus: document.getElementById('leadInboxStatus'),
  markRead: document.getElementById('markLeadsRead'),
  searches: document.getElementById('savedLeadSearches'),
  searchForm: document.getElementById('leadSearchForm'),
  searchStatus: document.getElementById('leadSearchStatus'),
  seekerForm: document.getElementById('seekerLeadForm'),
  seekerStatus: document.getElementById('seekerLeadStatus'),
  stopSeeking: document.getElementById('stopSeeking')
};
const leadReasonLabels = {
  same_city_and_state: 'Same city and state',
  within_travel_radius: 'Within travel radius',
  available_for_event: 'Available on the event dates',
  requested_service: 'Offers the requested service',
  starting_fee_within_budget: 'Starting fee is within budget',
  audience_interest_match: 'Audience interests match the event',
  preferred_event_genre: 'Matches your preferred event genre'
};
let leadThroughId;
let leadEvents = [];

function setLeadEvents(events) {
  leadEvents = events.filter(event => event.status === 'published' && new Date(event.end_date || event.start_date) > new Date());
  const select = leadElements.searchForm.elements.eventId;
  const selected = select.value;
  select.replaceChildren(new Option('Search without an event', ''));
  for (const event of leadEvents) select.add(new Option(event.title, event.id));
  select.value = selected;
}

function leadText(parent, tag, text) {
  const element = document.createElement(tag);
  element.textContent = text;
  parent.append(element);
  return element;
}

function renderLead(notification) {
  const card = document.createElement('article');
  card.className = 'lead-card';
  if (!notification.read_at) card.classList.add('unread');
  leadText(card, 'h3', notification.title);
  const { score, distanceKm, reasons, kind, quotedFee } = notification.details;
  const facts = (reasons || []).map(reason => leadReasonLabels[reason]).filter(Boolean);
  if (distanceKm != null) facts.unshift(`${Math.round(distanceKm / 1.609344 * 10) / 10} miles`);
  if (score != null) facts.push(`Fit score ${score}`);
  if (quotedFee != null) facts.push(`$ ${Number(quotedFee).toFixed(2)} for this event type`);
  if (facts.length) leadText(card, 'p', facts.join(' · '));
  const actions = leadText(card, 'div', '');
  actions.className = 'lead-actions';
  if (notification.event_id) leadText(actions, 'a', 'View event').href = `event-detail.html?id=${encodeURIComponent(notification.event_id)}`;
  if (notification.promoter_id && kind !== 'opportunity') {
    leadText(actions, 'a', 'View booster').href = `promoter-profile.html?id=${encodeURIComponent(notification.promoter_id)}`;
  }
  if (notification.event_id && notification.contact_user_id) {
    const params = new URLSearchParams({ tab: 'profile', eventId: notification.event_id, userId: notification.contact_user_id });
    leadText(actions, 'a', 'Message').href = `dashboard.html?${params}#profile-messages`;
  }
  leadText(actions, 'time', formatDate(notification.created_at)).dateTime = notification.created_at;
  return card;
}

async function loadLeadInbox() {
  try {
    const { notifications, unreadCount } = await Auth.api('/lead-notifications');
    updateLeadBadge(unreadCount);
    leadThroughId = notifications[0]?.id;
    leadElements.markRead.hidden = !unreadCount;
    leadElements.inbox.replaceChildren(...notifications.map(renderLead));
    leadElements.inboxStatus.textContent = notifications.length ? '' : 'New leads will appear here when they qualify.';
  } catch (error) {
    leadElements.inboxStatus.textContent = error.message;
  }
}

async function loadLeadSearches() {
  try {
    const searches = await Auth.api('/search');
    const cards = searches.map(search => {
      const card = document.createElement('article');
      card.className = 'lead-card';
      leadText(card, 'h3', search.search_name || 'Saved search');
      leadText(card, 'p', `${search.city || ''}, ${search.state || ''} · ${search.radius_miles} miles · ${search.status}`);
      if (search.status !== 'cancelled') {
        const button = leadText(card, 'button', search.status === 'active' ? 'Pause' : 'Resume');
        button.className = 'btn btn-outline';
        button.type = 'button';
        button.addEventListener('click', async () => {
          button.disabled = true;
          try {
            const status = search.status === 'active' ? 'paused' : 'active';
            await Auth.api(`/search/${search.id}`, { method: 'PUT', body: JSON.stringify({ status }) });
            await loadLeadSearches();
          } catch (error) {
            leadElements.searchStatus.textContent = error.message;
          } finally {
            button.disabled = false;
          }
        });
      }
      return card;
    });
    leadElements.searches.replaceChildren(...cards);
  } catch (error) {
    leadElements.searchStatus.textContent = error.message;
  }
}

function fillSeekerForm(profile) {
  const fields = leadElements.seekerForm.elements;
  fields.city.value = profile?.seeker_city || profile?.user_city || '';
  fields.state.value = profile?.seeker_state || profile?.user_state || '';
  fields.country.value = profile?.seeker_country || profile?.user_country || 'US';
  fields.latitude.value = profile?.seeker_latitude ?? '';
  fields.longitude.value = profile?.seeker_longitude ?? '';
  fields.radiusMiles.value = profile?.seeker_radius_miles ?? 100;
  fields.genreTags.value = profile?.seeker_genre_tags?.join(', ') || '';
  fields.until.value = profile?.seeker_until?.slice(0, 10) || '';
  leadElements.stopSeeking.hidden = !profile?.is_seeker;
  leadElements.seekerForm.querySelector('[type=submit]').disabled = !profile;
  leadElements.seekerStatus.textContent = !profile
    ? 'Save a promoter profile under My Profile to start seeking.'
    : profile.is_seeker ? 'Seeker alerts are active.' : '';
}

async function loadSeekerSettings() {
  try {
    fillSeekerForm(await Auth.api('/seekers/profile'));
  } catch (error) {
    leadElements.seekerStatus.textContent = error.message;
  }
}

function openLeads() {
  void loadLeadInbox();
  if (!document.getElementById('coordinatorLeadSettings').hidden) void loadLeadSearches();
  if (!document.getElementById('boosterLeadSettings').hidden) void loadSeekerSettings();
}

function leadFormData(form) {
  const data = {};
  for (const [name, value] of new FormData(form)) {
    if (value.trim()) {
      data[name] = name === 'genreTags' ? value.split(',').map(tag => tag.trim()).filter(Boolean) : value.trim();
    }
  }
  return data;
}

function startLeadDashboard() {
  leadElements.markRead.addEventListener('click', async () => {
    leadElements.markRead.disabled = true;
    try {
      await Auth.api('/lead-notifications/read', { method: 'PUT', body: JSON.stringify({ throughId: leadThroughId }) });
      await loadLeadInbox();
    } catch (error) {
      leadElements.inboxStatus.textContent = error.message;
    } finally {
      leadElements.markRead.disabled = false;
    }
  });

  const search = leadElements.searchForm.elements;
  search.eventId.addEventListener('change', () => {
    const event = leadEvents.find(item => String(item.id) === search.eventId.value);
    if (!event) return;
    for (const field of ['city', 'state', 'country', 'latitude', 'longitude']) {
      search[field].value = event[field] ?? '';
    }
    if (!search.searchName.value) search.searchName.value = event.title;
  });

  leadElements.searchForm.addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.submitter;
    button.disabled = true;
    leadElements.searchStatus.textContent = 'Saving search…';
    try {
      const { serviceType, ...data } = leadFormData(leadElements.searchForm);
      if (serviceType) data.serviceTypes = [serviceType];
      await Auth.api('/search', { method: 'POST', body: JSON.stringify(data) });
      leadElements.searchStatus.textContent = 'Search saved. Matching will continue in the background.';
      await loadLeadSearches();
    } catch (error) {
      leadElements.searchStatus.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });

  leadElements.seekerForm.addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.submitter;
    button.disabled = true;
    leadElements.seekerStatus.textContent = 'Saving preferences…';
    try {
      const data = leadFormData(leadElements.seekerForm);
      if (Boolean(data.latitude) !== Boolean(data.longitude)) throw new Error('Enter both coordinates or leave both blank.');
      fillSeekerForm(await Auth.api('/seekers/register', { method: 'POST', body: JSON.stringify(data) }));
    } catch (error) {
      leadElements.seekerStatus.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });

  leadElements.stopSeeking.addEventListener('click', async () => {
    const button = leadElements.stopSeeking;
    button.disabled = true;
    try {
      fillSeekerForm(await Auth.api('/seekers/register', { method: 'DELETE' }));
      leadElements.seekerStatus.textContent = 'Seeker alerts are paused.';
    } catch (error) {
      leadElements.seekerStatus.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });

  function refreshVisibleLeads() {
    if (!document.hidden && Auth.isAuthenticated() && document.getElementById('profileTab').style.display !== 'none') {
      void loadLeadInbox();
    }
  }
  document.addEventListener('visibilitychange', refreshVisibleLeads);
  navigator.serviceWorker?.addEventListener('message', refreshVisibleLeads);
  setInterval(refreshVisibleLeads, 60000);
}
