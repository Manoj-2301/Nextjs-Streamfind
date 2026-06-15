try {
  importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

  firebase.initializeApp({
    apiKey: "AIzaSyAX8JaeA9oYWdcwrpm32qq-Q7U9cy0vijI",
    authDomain: "moviefind-3424f.firebaseapp.com",
    projectId: "moviefind-3424f",
    storageBucket: "moviefind-3424f.firebasestorage.app",
    messagingSenderId: "679342590470",
    appId: "1:679342590470:web:b36564a8dec0d177e01187",
    measurementId: "G-1XGPKFPD41"
  });

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification?.title || 'New Notification';
    const notificationOptions = {
      body: payload.notification?.body || '',
      icon: '/favicon.ico'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (error) {
  console.log('Firebase messaging failed to initialize in service worker:', error);
}
