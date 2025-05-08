#!/bin/bash

# FilmFlex GitHub Push Script
# This script commits and pushes all new scripts to GitHub

# Define colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print banner
echo -e "${BLUE}"
echo "========================================"
echo "    FilmFlex GitHub Push"
echo "========================================"
echo -e "${NC}"

# Check if we're in a git repository
if [ ! -d ".git" ]; then
  echo -e "${RED}Error: Not in a git repository${NC}"
  echo "Please run this script from the root of your git repository."
  exit 1
fi

# Get the current directory name
REPO_NAME=$(basename $(pwd))
echo -e "${BLUE}Repository: ${REPO_NAME}${NC}"

# Ask if the user wants to add all changes or just the new scripts
echo -e "${YELLOW}Do you want to add all changes or just the new scripts?${NC}"
echo "1) Add all changes"
echo "2) Add only new scripts"
read -p "Enter your choice (1 or 2): " CHOICE

if [ "$CHOICE" == "1" ]; then
  # Add all changes
  echo -e "${BLUE}Adding all changes...${NC}"
  git add .
elif [ "$CHOICE" == "2" ]; then
  # Add only the new scripts
  echo -e "${BLUE}Adding only new scripts...${NC}"
  git add scripts/deployment/fix-database.js
  git add scripts/deployment/run-fix-database.sh
  git add scripts/deployment/sync-environments.sh
  git add scripts/deployment/improved-import.js
  git add scripts/deployment/run-improved-import.sh
  git add scripts/deployment/adaptive-import.js
  git add scripts/deployment/run-adaptive-import.sh
  git add scripts/deployment/direct-import.js
  git add scripts/deployment/run-direct-import.sh
  git add scripts/deployment/push-to-github.sh
else
  echo -e "${RED}Invalid choice. Exiting.${NC}"
  exit 1
fi

# Ask for a commit message
echo -e "${YELLOW}Enter a commit message:${NC}"
read -p "> " COMMIT_MESSAGE

if [ -z "$COMMIT_MESSAGE" ]; then
  COMMIT_MESSAGE="Add database fix scripts and import improvements"
fi

# Commit the changes
echo -e "${BLUE}Committing changes with message: ${COMMIT_MESSAGE}${NC}"
git commit -m "$COMMIT_MESSAGE"

# Ask if the user wants to push to GitHub
echo -e "${YELLOW}Do you want to push to GitHub? (y/n)${NC}"
read -p "> " PUSH_CHOICE

if [[ "$PUSH_CHOICE" =~ ^[Yy] ]]; then
  # Ask which branch to push to
  echo -e "${YELLOW}Enter the branch name to push to (e.g., main, master):${NC}"
  read -p "> " BRANCH_NAME

  if [ -z "$BRANCH_NAME" ]; then
    BRANCH_NAME="main"
  fi

  # Push to GitHub
  echo -e "${BLUE}Pushing to ${BRANCH_NAME}...${NC}"
  git push origin "$BRANCH_NAME"

  # Check if push was successful
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Successfully pushed to GitHub!${NC}"
  else
    echo -e "${RED}Failed to push to GitHub. Please check your credentials or repository access.${NC}"
  fi
else
  echo -e "${BLUE}Changes committed but not pushed to GitHub.${NC}"
  echo -e "${BLUE}You can push manually with 'git push origin <branch-name>'${NC}"
fi

echo ""
echo "To run the database fix on your production server, use:"
echo "cd ~/Film_Flex_Release"
echo "chmod +x scripts/deployment/run-fix-database.sh"
echo "sudo ./scripts/deployment/run-fix-database.sh"