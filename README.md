# Amit's Game Factory V3 🎮

גרסה חדשה ויציבה שמייצרת עד שני משחקים ביום, מפרסמת קודם ב-GitHub Pages, ואם פרסום Pages נכשל בזמן שה-Action עדיין רץ — מנסה לפרסם את אותו אתר ב-Netlify.

## מה השתנה ב-V3

- ה-AI כבר **לא כותב את כל קוד המשחק**. הוא יוצר רק נושא ועיצוב קצר ב-JSON.
- קוד המשחק עצמו נבנה מתבנית מקומית שנבדקה מראש, ולכן לא אמורה לחזור התקלה `No embedded JavaScript found`.
- שלושה סוגי משחק מתחלפים: `pulse`, `dash`, `tether`.
- בכל משחק: 8 שלבים, שדרוגים, בוס, שמירה, סאונד, מחשב ומובייל.
- אם Gemini לא זמין או נגמרת המכסה שלו, המפעל משתמש ברעיון מובנה וממשיך ליצור משחק.
- אין `npm install` ואין חבילות חיצוניות, ולכן לא אמורה לחזור תקלה של הורדת `nodemailer`.
- שליחת Gmail נעשית ישירות דרך SMTP עם סיסמת האפליקציה שכבר הגדרת.

## הסודות שצריכים להישאר ב-GitHub

ב-`Settings → Secrets and variables → Actions`:

- `GEMINI_API_KEY`
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `EMAIL_TO`
- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_SITE_ID`

`SITE_URL` כבר לא דרוש לגרסה הזאת, אבל מותר להשאיר אותו.

## איך להחליף את הגרסה הישנה

1. חלץ את קובץ ה-ZIP.
2. ב-GitHub פתח את המאגר `amit-daily-game-factory2`.
3. לחץ `Code → Add file → Upload files`.
4. גרור את **כל התוכן שבתוך התיקייה**, כולל:
   - `.github`
   - `public`
   - `scripts`
   - `templates`
   - `package.json`
   - `package-lock.json`
5. אשר החלפת קבצים קיימים ולחץ `Commit changes`.
6. חשוב במיוחד לוודא שהקובץ הבא הוחלף:
   `.github/workflows/daily-game.yml`

## הפעלה ראשונה

1. פתח `Actions` למעלה.
2. בחר `Amit Game Factory V3`.
3. לחץ `Run workflow` ואז שוב `Run workflow`.
4. המתן לסיום.

## זמני יצירה אוטומטיים

ה-Workflow מוגדר לשתי ריצות ביום לפי שעון ישראל:

- 09:17
- 18:43

ייתכן איחור קטן בהפעלה מתוזמנת.

## איך הגיבוי עובד

1. המשחק נוצר ונשמר במאגר.
2. GitHub Pages מנסה לפרסם אותו.
3. אם פרסום Pages נכשל אבל GitHub Actions עדיין פועל, המערכת יוצרת ZIP מלא ושולחת אותו ל-Netlify דרך ה-API.
4. המייל נשלח עם הקישור של השירות שבאמת הצליח.

### מגבלה חשובה

אם GitHub Actions **לא מתחיל בכלל** בגלל מכסה, חסימה או תקלה כללית של GitHub, קוד שרץ בתוך GitHub לא יכול לעבור ל-Netlify בעצמו. הגיבוי מטפל בכשל בפרסום GitHub Pages, לא במצב שבו כל ה-Action לא רץ.

## תצוגה מקומית

לחץ פעמיים על:

`START_PREVIEW.bat`

האתר ייפתח ב:

`http://localhost:3000`

## פתרון תקלות

- `GEMINI_API_KEY is not configured` — המשחק עדיין ייווצר מרעיון מובנה.
- `GitHub Pages failed, but Netlify fallback secrets are missing` — חסר טוקן או Site ID של Netlify.
- `SMTP returned 535` — המייל או סיסמת האפליקציה אינם מאותו חשבון.
- משחק לא מופיע — פתח את שלב `Validate the gallery and every game` ב-Actions.
