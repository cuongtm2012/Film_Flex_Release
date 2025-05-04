#!/bin/bash

# Create reports directory if it doesn't exist
mkdir -p reports

# Run the profile image tests in demo mode
echo "Running profile image upload tests in demo mode..."
node scripts/test-profile-image.js

# Display report location
echo "Test execution complete. HTML report is available in reports/profile-image-test-report.html"