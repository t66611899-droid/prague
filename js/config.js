// הגדרות ציבוריות בלבד. אין כאן מפתחות או סיסמאות.
// chatUrl = כתובת הפונקציה השרתית של הצ'אט (Cloudflare Worker). אפשר גם להגדיר אותה מהטלפון ב"הגדרות הצ'אט".
const CONFIG = {
  // false = האפליקציה לא פונה לשרת בכלל: Claude נפתח ב-claude.ai, אין התראות, והאירועים הם רק הקבועים.
  // כדי להפעיל בעתיד את הצ'אט הפנימי, חיפוש האירועים וההתראות: לשנות ל-true ולהגדיר את המפתחות ב-Cloudflare.
  server: false,
  // פיד התקלות הציבורי של התחבורה בפראג (PID). עובר דרך השרת רק כי לפיד עצמו אין CORS. בלי מפתח ובלי סודות.
  // הכתובת היא pages.dev ולא workers.dev: חלק מהספקים הסלולריים בישראל לא פותרים *.workers.dev.
  // prague-api.pages.dev רק מעביר כל בקשה ל-Worker (prague-chat), אז הקוד, האחסון והסודות נשארים במקום אחד.
  pidUrl: "https://prague-api.pages.dev/pid",
  chatUrl: "https://prague-api.pages.dev",
  // מפתח ציבורי של Web Push (לא סוד)
  vapidPublic: "BL1wKzVNWdylek1wLHayfBEwohzmUqydt-HzwKBf94lTeNoJAcdvZpq93BiAj7Xex35SbxXVUfU4d0vlgErjONA"
};
