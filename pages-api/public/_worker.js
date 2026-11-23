// מעביר את הבקשה כמו שהיא ל-Worker של הטיול (כולל Origin, כדי שבדיקת ה-CORS שם תעבוד)
export default { fetch: (req, env) => env.API.fetch(req) };
