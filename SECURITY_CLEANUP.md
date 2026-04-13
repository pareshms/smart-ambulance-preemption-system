# SECURITY CLEANUP Instructions

## 1. Remove `firebase-applet-config.json` from Git History

### Using `git filter-branch`

1. Open your terminal and navigate to the repository directory.
2. Run the following command to filter the branch:
   ```bash
   git filter-branch --force --index-filter \
   'git rm --cached --ignore-unmatch firebase-applet-config.json' \
   --prune-empty --tag-name-filter cat -- --all
   ```
3. Clean up the backup refs:
   ```bash
   rm -rf .git/refs/original/
   ```
4. Force push the changes to the remote repository:
   ```bash
   git push origin --force --all
   git push origin --force --tags
   ```

### Using BFG Repo-Cleaner

1. Download BFG Repo-Cleaner from the [official site](https://rtyley.github.io/bfg-repo-cleaner/).
2. Run the following command:
   ```bash
   java -jar bfg.jar --delete-files firebase-applet-config.json
   ```
3. Clean up unnecessary files and optimize the repository:
   ```bash
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   ```
4. Force push the changes to the remote repository:
   ```bash
   git push origin --force --all
   git push origin --force --tags
   ```

## 2. Rotate Firebase API Keys

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Select your project.
3. Navigate to the **Project Settings**.
4. Under the **Service Accounts** tab, click on **Manage service accounts**.
5. Generate new keys for the services you are using and replace the old ones in your application.

## 3. Verify Cleanup Completion

1. Check your repository history to ensure `firebase-applet-config.json` is no longer present.
   ```bash
   git log -- firebase-applet-config.json
   ```
   If the file is not found, the cleanup is successful.
2. Ensure that your application is functioning with the new Firebase API keys.