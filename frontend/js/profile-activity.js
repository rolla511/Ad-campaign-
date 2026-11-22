const profileActivity = {
  photo: document.getElementById('accountPhoto'),
  initial: document.getElementById('accountPhotoInitial'),
  photoForm: document.getElementById('photoForm'),
  photoFile: document.getElementById('profilePhotoFile'),
  removePhoto: document.getElementById('removeProfilePhoto'),
  photoStatus: document.getElementById('profilePhotoStatus'),
  pushButton: document.getElementById('toggleDeviceNotifications'),
  pushStatus: document.getElementById('deviceNotificationStatus'),
  threads: document.getElementById('messageThreads'),
  conversation: document.getElementById('conversation'),
  messageList: document.getElementById('messageList'),
  messageStatus: document.getElementById('messageStatus'),
  messageForm: document.getElementById('messageForm'),
  messageText: document.getElementById('messageText')
};

const bookingStatuses = {
  pending: 'Pending', booked: 'Booked', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled'
};
let profileOwner;
let activeConversation;
let pushRegistration;
let vapidKey;
let deviceSubscription;
let devicePushEnabled = false;
let refreshingMessages = false;

function renderProfilePhoto(url) {
  const validPath = /^\/api\/profile-photo\/[1-9]\d*$/.test(url);
  profileActivity.photo.hidden = !validPath;
  profileActivity.initial.hidden = validPath;
  profileActivity.removePhoto.hidden = !validPath;
  if (validPath) profileActivity.photo.src = url + '?v=' + Date.now();
  else profileActivity.photo.removeAttribute('src');
}

async function profileJpeg(file) {
  if (!file?.size || file.size > 12 * 1024 * 1024) throw new Error('Choose a photo under 12 MB.');
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const context = canvas.getContext('2d', { alpha: false });
    context.fillStyle = 'white';
    context.fillRect(0, 0, 512, 512);
    const size = Math.min(image.naturalWidth, image.naturalHeight);
    context.drawImage(image, (image.naturalWidth - size) / 2, (image.naturalHeight - size) / 2, size, size, 0, 0, 512, 512);
    return canvas.toDataURL('image/jpeg', 0.82).split(',')[1];
  } catch {
    throw new Error('This photo could not be opened. Try a JPEG or PNG.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

function updateDeviceControls(enabled) {
  const { pushButton, pushStatus } = profileActivity;
  devicePushEnabled = enabled;
  pushButton.textContent = enabled ? 'Turn off notifications' : 'Turn on notifications';
  pushButton.hidden = Notification.permission === 'denied';
  pushStatus.textContent = enabled ? 'Notifications are on for this device.' :
    pushButton.hidden ? 'Notifications are blocked in your browser settings.' : '';
}

async function prepareDevicePush() {
  const { pushStatus } = profileActivity;
  const appleMobile = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  if (appleMobile && !navigator.standalone && !matchMedia('(display-mode: standalone)').matches) {
    pushStatus.textContent = 'On iPhone or iPad, add Party Booster to your Home Screen, then open it there to turn on alerts.';
    return;
  }
  if (!('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window)) {
    pushStatus.textContent = 'Device alerts are unavailable in this browser. Your updates appear in your profile.';
    return;
  }
  try {
    const { publicKey } = await Auth.api('/push/key');
    if (!publicKey) {
      pushStatus.textContent = 'Device alerts are unavailable right now. Your updates appear in your profile.';
      return;
    }
    const base64 = publicKey.replace(/-/g, '+').replace(/_/g, '/');
    vapidKey = Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')), character => character.charCodeAt(0));
    await navigator.serviceWorker.register('/service-worker.js');
    pushRegistration = await navigator.serviceWorker.ready;
    deviceSubscription = await pushRegistration.pushManager.getSubscription();
    const device = savedDevicePush();
    updateDeviceControls(Boolean(deviceSubscription && device?.endpoint === deviceSubscription.endpoint &&
      device.userId === profileOwner.id && usesCurrentPushKey(deviceSubscription)));
  } catch {
    pushStatus.textContent = 'Device alerts are unavailable right now. Your updates appear in your profile.';
  }
}

function usesCurrentPushKey(subscription) {
  const key = new Uint8Array(subscription.options?.applicationServerKey || []);
  return !key.length || (key.length === vapidKey.length && vapidKey.every((byte, index) => byte === key[index]));
}

async function toggleDevicePush() {
  const { pushButton, pushStatus } = profileActivity;
  pushButton.disabled = true;
  try {
    if (devicePushEnabled) {
      if (!await disconnectDevicePush(profileOwner.id)) throw new Error('Could not update this device. Please try again.');
      deviceSubscription = null;
      updateDeviceControls(false);
      pushStatus.textContent = 'Notifications are off for this device.';
      return;
    }

    if (deviceSubscription && !usesCurrentPushKey(deviceSubscription)) {
      await deviceSubscription.unsubscribe();
      deviceSubscription = null;
    }
    // The browser can ask for permission directly from this button tap.
    deviceSubscription ??= await pushRegistration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKey });
    await Auth.api('/push/subscription', { method: 'PUT', body: JSON.stringify(deviceSubscription.toJSON()) });
    localStorage.setItem(DEVICE_PUSH_KEY, JSON.stringify({ userId: profileOwner.id, endpoint: deviceSubscription.endpoint }));
    updateDeviceControls(true);
  } catch (error) {
    if (Notification.permission === 'denied') updateDeviceControls(false);
    else pushStatus.textContent = error.name === 'NotAllowedError'
      ? 'Notifications are off. You can turn them on anytime.'
      : error.message || 'Could not update device notifications.';
  } finally {
    pushButton.disabled = false;
  }
}

function conversationDetails() {
  const params = new URLSearchParams(location.search);
  const ids = Object.fromEntries(['userId', 'eventId', 'bookingId'].map(key => [
    key, /^[1-9]\d{0,9}$/.test(params.get(key) || '') && Number(params.get(key)) <= 2147483647 ? params.get(key) : null
  ]));
  if (!ids.userId || !(ids.eventId || ids.bookingId)) return null;
  return Object.fromEntries(Object.entries(ids).filter(([, value]) => value));
}

function renderThreads(threads) {
  profileActivity.threads.replaceChildren(...threads.map(thread => {
    const item = document.createElement('li');
    const link = document.createElement('a');
    const params = new URLSearchParams({ tab: 'profile', userId: thread.peer_id, eventId: thread.event_id });
    if (thread.booking_id) params.set('bookingId', thread.booking_id);
    link.href = 'dashboard.html?' + params + '#profile-messages';
    link.textContent = '@' + thread.username + ' · ' + thread.event_title;
    const details = document.createElement('span');
    const labels = [];
    if (thread.booking_id) labels.push(bookingStatuses[thread.booking_status] || 'Booking');
    if (thread.unread_count) labels.push(thread.unread_count + ' unread');
    details.textContent = labels.join(' · ');
    item.append(link, details);
    return item;
  }));
}

async function openProfileMessages() {
  if (refreshingMessages) return;
  refreshingMessages = true;
  const { messageStatus, conversation, messageList } = profileActivity;
  try {
    if (!activeConversation) {
      const threads = await Auth.api('/messages/threads');
      renderThreads(threads);
      messageStatus.textContent = threads.length ? '' : 'Open a match in your lead inbox to start a conversation.';
      return;
    }

    const messages = await Auth.api('/messages/conversation?' + new URLSearchParams(activeConversation));
    const lastId = messages.at(-1)?.id ?? 'empty';
    if (String(lastId) !== messageList.dataset.lastId) {
      messageList.dataset.lastId = lastId;
      messageList.replaceChildren(...messages.map(message => {
        const card = document.createElement('article');
        card.className = 'lead-card';
        const sender = document.createElement('strong');
        sender.textContent = Number(message.sender_id) === Number(profileOwner.id) ? 'You' : '@' + message.sender_username;
        const text = document.createElement('p');
        text.textContent = message.message;
        card.append(sender, text);
        return card;
      }));
    }
    document.getElementById('conversationHeading').textContent = activeConversation.bookingId ? 'Booking conversation' : 'Match conversation';
    messageStatus.textContent = messages.length ? '' : 'Start the conversation to agree on booking details.';
    conversation.hidden = false;
    const unread = messages.filter(message => !message.is_read && Number(message.recipient_id) === Number(profileOwner.id))
      .slice(-100).map(message => message.id);
    if (unread.length) await Auth.api('/messages/read', { method: 'POST', body: JSON.stringify({ messageIds: unread }) });
  } catch (error) {
    messageStatus.textContent = error.message;
  } finally {
    refreshingMessages = false;
  }
}

function startProfileActivity(user) {
  profileOwner = user;
  activeConversation = conversationDetails();
  document.getElementById('profileUsername').textContent = '@' + user.username;
  profileActivity.initial.textContent = user.username.slice(0, 1).toUpperCase();
  void Auth.api('/auth/profile').then(({ avatar_url }) => renderProfilePhoto(avatar_url)).catch(error => {
    profileActivity.photoStatus.textContent = error.message;
  });

  profileActivity.photoForm.addEventListener('submit', async event => {
    event.preventDefault();
    const { photoFile, photoStatus, removePhoto } = profileActivity;
    event.submitter.disabled = removePhoto.disabled = true;
    try {
      const photo = await profileJpeg(photoFile.files[0]);
      const { avatarUrl } = await Auth.api('/profile-photo', { method: 'PUT', body: JSON.stringify({ photo }) });
      renderProfilePhoto(avatarUrl);
      photoFile.value = '';
      photoStatus.textContent = 'Profile photo saved.';
    } catch (error) {
      photoStatus.textContent = error.message;
    } finally {
      event.submitter.disabled = removePhoto.disabled = false;
    }
  });
  profileActivity.removePhoto.addEventListener('click', async () => {
    const { removePhoto, photoStatus, photoForm } = profileActivity;
    const submit = photoForm.querySelector('button[type=submit]');
    removePhoto.disabled = submit.disabled = true;
    try {
      await Auth.api('/profile-photo', { method: 'DELETE' });
      renderProfilePhoto(null);
      photoStatus.textContent = 'Profile photo removed.';
    } catch (error) {
      photoStatus.textContent = error.message;
    } finally {
      removePhoto.disabled = submit.disabled = false;
    }
  });

  profileActivity.pushButton.addEventListener('click', toggleDevicePush);
  void prepareDevicePush();
  profileActivity.messageForm.addEventListener('submit', async event => {
    event.preventDefault();
    const { messageText, messageStatus } = profileActivity;
    const message = messageText.value.trim();
    if (!message) return;
    event.submitter.disabled = true;
    try {
      const { userId, ...context } = activeConversation;
      await Auth.api('/messages', { method: 'POST', body: JSON.stringify({ ...context, recipientId: userId, message }) });
      messageText.value = '';
      await openProfileMessages();
    } catch (error) {
      messageStatus.textContent = error.message;
    } finally {
      event.submitter.disabled = false;
    }
  });

  function refreshVisibleProfile() {
    if (!document.hidden && document.getElementById('profileTab').style.display !== 'none' && Auth.isAuthenticated()) {
      void openProfileMessages();
    }
  }
  document.addEventListener('visibilitychange', refreshVisibleProfile);
  navigator.serviceWorker?.addEventListener('message', refreshVisibleProfile);
  setInterval(refreshVisibleProfile, 30000);
}
