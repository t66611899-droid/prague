/* poi-rules: איך הופכים רשומה של OpenStreetMap למקום ש"לאן?" מכיר. אותו קוד רץ בדפדפן (חיפוש חי) ובסקריפט שאופה את poi.json (אופליין).
   ההעדפות של עומר: בלי בשר. פיצה, פלאפל, צמחוני, פסטה, צ'יפס, מאפים וקפה. כספומט רק של בנק. אין כאן שום פרט אישי. */
var POI_RULES = (function () {
  var MINE = /pizza|falafel|vegetarian|vegan|italian|pasta|fries|friture|crepe|pancake|bagel|hummus/;
  var MEAT = /steak|burger|bbq|barbecue|grill|chicken|ribs|wings|meat|fish|seafood|sushi|kebab/, MEATNAME = /burger|steak|grill|bbq|ribs|kfc|mcdonald|chicken|kebab/i;
  var BANK = [[/čsob|csob|poštovní spořitelna/i, "ČSOB"], [/česká spořitelna|ceska sporitelna/i, "Česká spořitelna"], [/komerční|komercni|^kb$|\bkb\b/i, "KB"], [/raiffeisen/i, "Raiffeisen"], [/\bfio\b/i, "Fio"], [/unicredit/i, "UniCredit"], [/moneta/i, "Moneta"], [/air bank/i, "Air Bank"], [/mbank/i, "mBank"]];
  var yes = function (v) { return /yes|only/.test(v || ""); };
  /* רשומה: [קטגוריה, שם, lat, lng, שעות פתיחה, דגלים, מותג/מפעיל, רחוב]
     קטגוריות: f אוכל בשבילי · k קפה · y מאפייה · a כספומט · s סופר · w שירותים · b בר/פאב/מועדון · m חנות רשת / קניון
     דגלים: v יש צמחוני · V כולו צמחוני/טבעוני · p פיצה · l פלאפל · i איטלקי/פסטה · r צ'יפס · $ זול · T טרדלניק
             b כספומט של בנק · e Euronet · g רשת סופר גדולה · n מועדון · 0 חינם · 1 בתשלום */
  function rec(e) {
    var t = e.tags || {}, lat = e.lat != null ? e.lat : e.center && e.center.lat, lng = e.lon != null ? e.lon : e.center && e.center.lon; if (lat == null) return null;
    var name = t.name || t.brand || "", c = "", f = "", b = "", am = t.amenity || "", sh = t.shop || "", cu = (t.cuisine || "").toLowerCase();
    if (am === "atm" || (am === "bank" && t.atm === "yes")) { c = "a"; var op = t.operator || t.brand || t.name || "", hit = null; for (var i = 0; i < BANK.length; i++) if (BANK[i][0].test(op)) { hit = BANK[i][1]; break; }
      if (/euronet/i.test(op)) { f = "e"; b = "Euronet"; } else if (hit) { f = "b"; b = hit; } else b = op; name = b || ""; }
    else if (am === "toilets") { c = "w"; f = t.fee === "no" ? "0" : t.fee === "yes" ? "1" : ""; name = t.name || ""; }
    else if (sh === "supermarket" || sh === "convenience") { if (!name) return null; c = "s"; f = /albert|billa|lidl|tesco|penny|kaufland/i.test(name) ? "g" : ""; }
    else if (sh === "bakery" || sh === "pastry") { if (!name) return null; c = "y"; f = "$"; }
    else if (sh === "mall" || sh === "department_store" || ((sh === "clothes" || sh === "shoes") && t.brand)) { if (!name) return null; c = "m"; f = sh === "mall" ? "M" : ""; }
    else if (am === "bar" || am === "pub" || am === "nightclub") { if (!name) return null; c = "b"; f = am === "nightclub" ? "n" : ""; }
    else if (am === "restaurant" || am === "fast_food" || am === "cafe") {
      if (!name) return null; var veg = yes(t["diet:vegetarian"]) || yes(t["diet:vegan"]), all = /only/.test(t["diet:vegetarian"] || "") || /only/.test(t["diet:vegan"] || "") || /vegetarian|vegan/.test(cu), trd = /trdl|trdeln/i.test(name) || /trdeln/.test(cu);
      if (am === "cafe" && !MINE.test(cu) && !trd) { c = "k"; f = veg ? "v" : ""; }
      else { if (!(veg || MINE.test(cu) || trd)) return null; /* כל מה שלא ידוע שיש בו צמחוני: לא נכנס */
        if (!MINE.test(cu) && !all && (MEAT.test(cu) || MEATNAME.test(name))) return null; /* המבורגרים, סטייקים, עוף וקבב: לא, גם אם כתוב שיש מנה צמחונית */
        c = "f"; f = (all ? "V" : veg ? "v" : "") + (/pizza/.test(cu) ? "p" : "") + (/falafel|hummus/.test(cu) ? "l" : "") + (/italian|pasta/.test(cu) ? "i" : "") + (/fries|friture/.test(cu) ? "r" : "") + (am === "fast_food" ? "$" : "") + (trd ? "T" : ""); }
    } else return null;
    var st = [t["addr:street"], t["addr:housenumber"] || t["addr:streetnumber"]].filter(Boolean).join(" ");
    return [c, name, +lat.toFixed(5), +lng.toFixed(5), t.opening_hours || "", f, b, st];
  }
  /* a = מסנן האזור של Overpass, למשל (around:1500,50.08,14.42) */
  function query(a) { return "nwr" + a + "[amenity=atm];nwr" + a + "[amenity=bank][atm=yes];nwr" + a + "[amenity=toilets];nwr" + a + '[shop~"^(supermarket|convenience|bakery|pastry)$"];nwr' + a + '[amenity~"^(bar|pub|nightclub|cafe|restaurant|fast_food)$"];nwr' + a + '[shop~"^(mall|department_store)$"];nwr' + a + '[shop~"^(clothes|shoes)$"][brand];'; }
  return { rec: rec, query: query };
})();
if (typeof module !== "undefined") module.exports = POI_RULES;
