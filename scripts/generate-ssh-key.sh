#!/bin/bash
# Generate SSH key for GitHub Actions deployment
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

KEY_NAME="filmflex_deploy_key"
KEY_PATH="${HOME}/.ssh/${KEY_NAME}"

echo -e "${GREEN}Generating SSH key for GitHub Actions CI/CD...${NC}"

# Generate SSH key if it doesn't exist
if [ ! -f "${KEY_PATH}" ]; then
  echo -e "${YELLOW}Generating new SSH key: ${KEY_PATH}${NC}"
  ssh-keygen -t ed25519 -f "${KEY_PATH}" -N "" -C "filmflex-deploy@github-actions"
else
  echo -e "${YELLOW}SSH key already exists at ${KEY_PATH}${NC}"
fi

# Display public key
echo -e "\n${GREEN}Public key (add this to your server's authorized_keys):${NC}"
cat "${KEY_PATH}.pub"

echo -e "\n${GREEN}Private key (add this as a GitHub secret named SSH_PRIVATE_KEY):${NC}"
cat "${KEY_PATH}"

echo -e "\n${YELLOW}Instructions:${NC}"
echo -e "1. Copy the public key to your server's authorized_keys file:"
echo -e "   ssh root@38.54.115.156 'mkdir -p ~/.ssh && touch ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo \"$(cat ${KEY_PATH}.pub)\" >> ~/.ssh/authorized_keys'"
echo -e "2. Add the private key as a GitHub secret named SSH_PRIVATE_KEY"
echo -e "3. Add these additional GitHub secrets:"
echo -e "   - SERVER_IP: 38.54.115.156"
echo -e "   - SSH_USER: root"
echo -e "\nDone! Your GitHub Actions workflows will now be able to deploy to your server."