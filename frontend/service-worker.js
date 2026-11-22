self.addEventListener('push', event => {
  let message;
  try { message = event.data?.json(); }
  catch { message = null; }
  const notifications = {
    lead: ['You have a new Party Booster lead', 'A new match is waiting in your profile.'],
    booking: ['You have a new Party Booster booking', 'Open your profile to see the booking and start a conversation.'],
    message: ['A new Party Booster message', 'Open your profile to see the conversation.']
  };
  const kind = ['booking', 'message'].includes(message?.kind) ? message.kind : 'lead';
  const info = notifications[kind];
  event.waitUntil(Promise.all([
    self.registration.showNotification(info[0], {
      body: info[1], icon: '/icons/app-192.png', tag: 'party-booster-' + kind, data: { kind }
    }),
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) client.postMessage({ kind });
    })
  ]));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const section = event.notification.data?.kind === 'lead' ? 'profile-leads' : 'profile-messages';
  const destination = '/dashboard.html?tab=profile#' + section;
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const profile = clients.find(client => new URL(client.url).pathname === '/dashboard.html');
    if (profile) {
      try {
        const client = await profile.navigate(destination);
        if (client) return client.focus();
      } catch { /* Open a new window if the current one no longer exists. */ }
    }
    return self.clients.openWindow(destination);
  })());
});
