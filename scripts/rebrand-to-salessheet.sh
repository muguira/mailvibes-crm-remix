#!/bin/bash

# Script to rebrand from MailVibes to SalesSheet.ai
# This script will search and replace all instances of MailVibes with SalesSheet.ai
# and remove Lovable references

echo "Starting rebranding process from MailVibes to SalesSheet.ai..."

# Define the directory to search
DIR="src"

# Replace in file content
echo "Replacing 'MailVibes' with 'SalesSheet.ai' in file content..."
find $DIR -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.html" -o -name "*.css" -o -name "*.md" | xargs sed -i '' 's/MailVibes/SalesSheet.ai/g'
find $DIR -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.html" -o -name "*.css" -o -name "*.md" | xargs sed -i '' 's/mailvibes/salessheet/g'

# Replace domain references
echo "Replacing domain references..."
find $DIR -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.html" -o -name "*.css" -o -name "*.md" | xargs sed -i '' 's/mailvibes\.io/salessheet\.ai/g'

# Remove Lovable references
echo "Removing Lovable references..."
find $DIR -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.html" -o -name "*.css" -o -name "*.md" | xargs sed -i '' 's/Lovable//g'
find $DIR -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.html" -o -name "*.css" -o -name "*.md" | xargs sed -i '' 's/lovable//g'

# Update package.json
echo "Updating package.json..."
sed -i '' 's/"name": "mailvibes-crm-remix"/"name": "salessheet-ai-crm"/g' package.json
sed -i '' 's/"description": ".*"/"description": "SalesSheet.ai - AI-Powered CRM"/g' package.json

# Update favicon and metadata in index.html
echo "Updating index.html..."
sed -i '' 's/<title>.*<\/title>/<title>SalesSheet.ai - AI-Powered CRM<\/title>/g' index.html
sed -i '' 's/<meta name="description" content=".*" \/>/<meta name="description" content="SalesSheet.ai - Customer Relationship Management Made Simple with AI" \/>/g' index.html
sed -i '' 's/<meta name="author" content=".*" \/>/<meta name="author" content="SalesSheet.ai" \/>/g' index.html

# Remove Lovable CDN
echo "Removing Lovable CDN script..."
sed -i '' '/cdn\.gpteng\.co\/gptengineer\.js/d' index.html

echo "Rebranding complete!"
echo "---------------------------------------------"
echo "Note: You still need to manually:"
echo "1. Replace the favicon.ico file with your $ icon"
echo "2. Update any image assets with SalesSheet.ai branding"
echo "3. Check for any remaining MailVibes/Lovable references"
echo "4. Consider renaming the project directory from 'mailvibes-crm-remix' to 'salessheet-ai-crm'"
echo "---------------------------------------------" 