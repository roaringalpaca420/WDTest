# Push these files to WDTest (fix 404)

Do this in **GitHub Desktop** so your live site has the website files.

---

## Step 1: Add this folder in GitHub Desktop

1. Open **GitHub Desktop**.
2. **File** → **Add local repository**.
3. Click **Choose...** and pick **this folder**:
   ```
   C:\Users\Bumble Bee\Documents\Cursor\Watchdog Animated
   ```
4. If it says **"This directory does not appear to be a Git repository"** → click the blue link **"create a repository"** in that same box.
5. In the **Name** field, type: `Watchdog-Animated` (or leave as is). **Do not** check "Initialize with README."
6. Click **Create Repository**.

---

## Step 2: Point this repo to WDTest on GitHub

1. **Repository** (top menu) → **Repository settings**.
2. Under **Primary remote repository**:
   - **Remote URL** should be: `https://github.com/roaringalpaca420/WDTest.git`  
   - If it says something else (e.g. a different repo), change it to that URL.
3. Click **Save**.

---

## Step 3: Commit and push

1. On the **left**, you should see all your files (index.html, css, js, Watchdog Avatar, etc.).
2. At the **bottom left**:
   - **Summary:** type `Add website files`
   - Click **Commit to main**.
3. At the **top right**, click **Push origin**.

---

## Step 4: Check the live site

After 1–2 minutes, open:

**https://roaringalpaca420.github.io/WDTest/**

You should see the Watchdog Avatar app (not 404).

---

**If you don’t see "create a repository":** Use **File** → **New repository**, set **Local path** to this same folder, then do Step 2 and Step 3.
