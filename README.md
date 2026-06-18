# Amit Game Factory V4

גרסה יציבה שמחליפה את כל קבצי המפעל יחד, כדי שלא יהיו ערבובים בין גרסאות ישנות.

## מה היא עושה

- יוצרת משחק חדש פעמיים ביום.
- Gemini מציע רק נושא ושמות. מנוע המשחק עצמו מקומי ונבדק מראש.
- אם Gemini אינו זמין או שהמכסה נגמרה, נוצר משחק מנושא מובנה.
- מפרסמת קודם ב-GitHub Pages.
- אם שלב GitHub Pages נכשל בתוך הריצה, מנסה לפרסם ב-Netlify כגיבוי.
- שולחת את קישור המשחק במייל.
- אינה משתמשת ב-dotenv, nodemailer או חבילות npm חיצוניות.

## הסודות הנדרשים ב-GitHub

- `GEMINI_API_KEY`
- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_SITE_ID`
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `EMAIL_TO`

`SITE_URL` אינו נדרש ב-V4.

## העלאה

העלה ל-GitHub את כל מה שנמצא בתוך התיקייה `UPLOAD_TO_GITHUB`, כולל `.github`.
אל תעלה את קובץ ה-ZIP עצמו.

לאחר ההעלאה הפעל ריצה חדשה:

`Actions → Amit Game Factory V4 → Run workflow`

## הערה על הגיבוי

Netlify יכול לשמש גיבוי רק אם GitHub Actions התחיל לרוץ ושלב Pages נכשל. אם GitHub Actions עצמו אינו יכול להתחיל בגלל מכסה, הקוד שבתוך הריצה אינו יכול להפעיל שירות אחר.
