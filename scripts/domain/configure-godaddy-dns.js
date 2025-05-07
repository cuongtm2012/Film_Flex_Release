#!/usr/bin/env node

/**
 * FilmFlex GoDaddy DNS Configuration Script
 * 
 * This script helps configure DNS settings for a domain on GoDaddy
 * using their API.
 * 
 * Prerequisites:
 * - GoDaddy API key and secret (get from https://developer.godaddy.com/)
 * - Node.js installed
 * 
 * Usage:
 * - node configure-godaddy-dns.js <domain> <server-ip>
 */

const axios = require('axios');
const readline = require('readline');

// Create interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Get command line arguments
const domain = process.argv[2];
const serverIp = process.argv[3];

// Validate input
if (!domain || !serverIp) {
  console.log('\x1b[31mError: Missing required arguments\x1b[0m');
  console.log('Usage: node configure-godaddy-dns.js <domain> <server-ip>');
  console.log('Example: node configure-godaddy-dns.js phimgg.com 38.54.115.156');
  rl.close();
  process.exit(1);
}

// Prompt for API key and secret
console.log('\x1b[34m========================================\x1b[0m');
console.log('\x1b[34m    FilmFlex GoDaddy DNS Configuration\x1b[0m');
console.log('\x1b[34m========================================\x1b[0m');
console.log('\x1b[33mYou need a GoDaddy API key to use this script\x1b[0m');
console.log('\x1b[33mGet one at https://developer.godaddy.com/\x1b[0m');
console.log('');

// Function to configure DNS
async function configureDns(apiKey, apiSecret) {
  try {
    const baseUrl = 'https://api.godaddy.com/v1';
    const headers = {
      'Authorization': `sso-key ${apiKey}:${apiSecret}`,
      'Content-Type': 'application/json'
    };

    console.log('\x1b[34mConnecting to GoDaddy API...\x1b[0m');

    // First check if domain exists in account
    try {
      const domainCheck = await axios.get(`${baseUrl}/domains/${domain}`, { headers });
      console.log(`\x1b[32mDomain ${domain} found in your GoDaddy account\x1b[0m`);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log(`\x1b[31mError: Domain ${domain} not found in your GoDaddy account\x1b[0m`);
        return false;
      } else {
        throw error;
      }
    }

    // Configure A record for root domain
    console.log(`\x1b[34mConfiguring A record for ${domain} pointing to ${serverIp}...\x1b[0m`);
    await axios.put(`${baseUrl}/domains/${domain}/records/A/@`, [
      {
        data: serverIp,
        ttl: 3600,
        name: "@"
      }
    ], { headers });
    
    // Configure CNAME record for www subdomain
    console.log(`\x1b[34mConfiguring CNAME record for www.${domain}...\x1b[0m`);
    await axios.put(`${baseUrl}/domains/${domain}/records/CNAME/www`, [
      {
        data: domain,
        ttl: 3600,
        name: "www"
      }
    ], { headers });

    console.log('\x1b[32mDNS configuration completed successfully!\x1b[0m');
    console.log('\x1b[33mPlease allow 24-48 hours for DNS changes to propagate globally\x1b[0m');
    return true;
  } catch (error) {
    console.log('\x1b[31mError configuring DNS:\x1b[0m');
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log(error.message);
    }
    return false;
  }
}

// Main function
async function main() {
  rl.question('Enter your GoDaddy API Key: ', (apiKey) => {
    if (!apiKey) {
      console.log('\x1b[31mAPI Key is required\x1b[0m');
      rl.close();
      return;
    }

    rl.question('Enter your GoDaddy API Secret: ', async (apiSecret) => {
      if (!apiSecret) {
        console.log('\x1b[31mAPI Secret is required\x1b[0m');
        rl.close();
        return;
      }

      console.log('\x1b[33m');
      console.log('About to configure the following DNS records:');
      console.log(`- A record: ${domain} -> ${serverIp}`);
      console.log(`- CNAME record: www.${domain} -> ${domain}`);
      console.log('\x1b[0m');

      rl.question('Continue? (yes/no): ', async (answer) => {
        if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
          const success = await configureDns(apiKey, apiSecret);
          
          if (success) {
            console.log('\x1b[32m');
            console.log('What to do next:');
            console.log('1. Wait 24-48 hours for DNS propagation');
            console.log('2. Run the SSL setup script:');
            console.log(`   sudo bash scripts/domain/check-dns-setup-ssl.sh ${domain}`);
            console.log('\x1b[0m');
          }
        } else {
          console.log('\x1b[31mConfiguration cancelled\x1b[0m');
        }
        
        rl.close();
      });
    });
  });
}

// Run the main function
main();