#!/bin/bash

# Complete Organization Fix Script
# Run this to fix all RLS issues once and for all

echo "🔧 Running Complete Organization Fix..."
echo "This will:"
echo "1. Disable RLS on all tables"
echo "2. Clean up mock data"
echo "3. Set up andres@mailvibes.io as admin"
echo "4. Create safe RPC functions"
echo "5. Re-enable RLS with simple policies"
echo ""

# Check if running the complete fix SQL
if [ -f "src/scripts/complete-organization-fix.sql" ]; then
    echo "✅ Found complete-organization-fix.sql"
    echo "Please run this in your Supabase SQL editor"
    echo ""
    echo "After running, the app should work without any RLS errors!"
else
    echo "❌ complete-organization-fix.sql not found!"
fi 