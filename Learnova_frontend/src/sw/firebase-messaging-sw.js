importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            '%VITE_FIREBASE_API_KEY%',
  authDomain:        '%VITE_FIREBASE_AUTH_DOMAIN%',
  projectId:         '%VITE_FIREBASE_PROJECT_ID%',
  storageBucket:     '%VITE_FIREBASE_STORAGE_BUCKET%',
  messagingSenderId: '%VITE_FIREBASE_MESSAGING_SENDER_ID%',
  appId:             '%VITE_FIREBASE_APP_ID%',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? 'Learnova';
  const body  = payload.notification?.body  ?? '';
  const url   = payload.data?.url ?? '/';

  self.registration.showNotification(title, {
    body,
    icon:  '/icon-192.png',
    badge: '/badge-72.png',
    data:  { url },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const existing = clientList.find((c) => c.url.includes(self.location.origin));
      if (existing) { existing.focus(); existing.navigate(url); }
      else clients.openWindow(url);
    })
  );
});
