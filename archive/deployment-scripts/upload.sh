#!/bin/bash

# FilmFlex Simple Upload Script for Windows Users
# Upload files from Windows to Ubuntu server using WSL, Git Bash, or PowerShell with OpenSSH
# Usage: ./upload.sh

echo "🚀 FilmFlex Upload Script"
echo "========================"
echo ""

# Configuration - Updated for new VPS instance
SERVER="38.54.14.154"
USERNAME="root"
REMOTE_PATH="/root/Film_Flex_Release"

# Check if we have SSH/SCP available
if ! command -v scp >/dev/null 2>&1; then
    echo "❌ Error: scp command not found"
    echo ""
    echo "Please install one of the following:"
    echo "1. WSL (Windows Subsystem for Linux)"
    echo "2. Git for Windows (includes Git Bash)"
    echo "3. OpenSSH for Windows"
    echo ""
    exit 1
fi

echo "📋 Uploading files to Ubuntu server..."
echo "Server: $SERVER"
echo "Path: $REMOTE_PATH"
echo ""

# List of files to upload
files_to_upload=(
    "server/index.ts"
    ".env"
    "package.json"
    "filmflex-deploy.sh"
    "ecosystem.config.cjs"
)

# Upload each file
upload_count=0
failed_count=0

for file in "${files_to_upload[@]}"; do
    if [ -f "$file" ]; then
        echo "📤 Uploading: $file"
        if scp "$file" "$USERNAME@$SERVER:$REMOTE_PATH/$file" 2>/dev/null; then
            echo "✅ Success: $file"
            ((upload_count++))
        else
            echo "❌ Failed: $file"
            ((failed_count++))
        fi
    else
        echo "⚠️ Not found: $file"
        ((failed_count++))
    fi
done

# Make deployment script executable
echo ""
echo "🔧 Setting permissions on server..."
if ssh "$USERNAME@$SERVER" "chmod +x $REMOTE_PATH/filmflex-deploy.sh" 2>/dev/null; then
    echo "✅ Deployment script is now executable"
else
    echo "⚠️ Could not set script permissions"
fi

# Summary
echo ""
echo "📊 Upload Summary:"
echo "=================="
echo "✅ Uploaded: $upload_count files"
echo "❌ Failed: $failed_count files"
echo ""

if [ $upload_count -gt 0 ]; then
    echo "🎉 Upload completed successfully!"
    echo ""
    echo "🚀 Next steps:"
    echo "1. SSH to server: ssh $USERNAME@$SERVER"
    echo "2. Navigate to project: cd $REMOTE_PATH"
    echo "3. Deploy application: ./filmflex-deploy.sh deploy quick"
    echo "4. Check status: ./filmflex-deploy.sh status"
    echo ""
    echo "💡 Quick deploy command:"
    echo "ssh $USERNAME@$SERVER 'cd $REMOTE_PATH && ./filmflex-deploy.sh deploy quick'"
else
    echo "❌ Upload failed. Please check your network connection and credentials."
fi
