# פראג

אפליקציית מסלול אישית (PWA) לטיול בפראג. קבצים סטטיים בלבד, בלי שלב build.

- `index.html`, `styles.css`, `js/` — האפליקציה
- `data.js` — הימים, התחנות והמקומות. `routes.js` — מסלולי הליכה מחושבים מראש
- `sw.js` — עבודה בלי אינטרנט
- `worker/` — Cloudflare Worker שמתווך ל-Claude API. הסודות מוגדרים רק ב-Cloudflare

אין בקוד מספרי הזמנה, קודים או פרטים אישיים. אלה נשמרים רק במכשיר, במסך "הפרטים שלי".

מפה: OpenFreeMap / OpenMapTiles / © OpenStreetMap contributors. ניתוב: OSRM (FOSSGIS). תמונות: Wikipedia.
