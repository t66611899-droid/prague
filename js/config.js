// הגדרות ציבוריות בלבד. אין כאן מפתחות או סיסמאות.
// chatUrl = כתובת הפונקציה השרתית של הצ'אט (Cloudflare Worker). אפשר גם להגדיר אותה מהטלפון ב"הגדרות הצ'אט".
const CONFIG = {
  // false = האפליקציה לא פונה לשרת בכלל: Claude נפתח ב-claude.ai, אין התראות, והאירועים הם רק הקבועים.
  // כדי להפעיל בעתיד את הצ'אט הפנימי, חיפוש האירועים וההתראות: לשנות ל-true ולהגדיר את המפתחות ב-Cloudflare.
  server: false,
  chatUrl: "https://prague-chat.bloombarber.workers.dev",
  // מפתח ציבורי של Web Push (לא סוד)
  vapidPublic: "BL1wKzVNWdylek1wLHayfBEwohzmUqydt-HzwKBf94lTeNoJAcdvZpq93BiAj7Xex35SbxXVUfU4d0vlgErjONA"
};
