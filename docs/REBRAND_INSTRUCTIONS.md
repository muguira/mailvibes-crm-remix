# SalesSheet.ai Rebranding Instructions

This guide provides step-by-step instructions for rebranding the application from MailVibes to SalesSheet.ai.

## Step 1: Replace the Favicon

1. Save the $ icon you provided to `public/assets/favicon.ico`
2. Ensure the path is correctly referenced in the index.html file:
   ```html
   <link rel="icon" href="/assets/favicon.ico" type="image/x-icon" />
   ```

## Step 2: Run the Rebranding Script

The rebranding script will automatically replace most instances of MailVibes with SalesSheet.ai and remove Lovable references:

```bash
./scripts/rebrand-to-salessheet.sh
```

## Step 3: Manual Checks and Updates

Some aspects need manual verification:

1. **Verify Email Templates**: Check that all email templates use SalesSheet.ai branding
2. **Update Images**: Replace any logos or branded images
3. **Check Database References**: Update any database configuration that might reference the old name
4. **Update Environment Variables**: If there are environment variables with the old name, update them
5. **Update Documentation**: Ensure all documentation uses the new brand name

## Step 4: Project Directory Name (Optional)

For consistency, you may want to rename the project directory:

```bash
# From outside the project directory
mv mailvibes-crm-remix salessheet-ai-crm
cd salessheet-ai-crm
```

## Step 5: Testing

After completing the rebranding, thoroughly test the application to ensure:

1. The correct favicon appears in browser tabs
2. All pages reference SalesSheet.ai instead of MailVibes
3. All emails and notifications use the correct branding
4. No Lovable references remain
5. All functionality works as expected

## Troubleshooting

- If you find remaining references to MailVibes or Lovable, use the following command to locate them:
  ```bash
  find src -type f -exec grep -l "MailVibes\|mailvibes\|Lovable\|lovable" {} \;
  ```

- For binary files like images, manually check and replace as needed. 