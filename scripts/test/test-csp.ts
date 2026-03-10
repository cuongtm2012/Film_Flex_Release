import fetch from 'node-fetch';

async function testCSP() {
  console.log('🔒 Testing Content Security Policy\n');

  try {
    const response = await fetch('http://localhost:5000/');
    
    const csp = response.headers.get('content-security-policy');
    
    if (!csp) {
      console.log('❌ No CSP header found!');
      return;
    }

    console.log('✅ CSP Header found\n');
    console.log('📋 Frame-src directive:');
    console.log('─'.repeat(70));
    
    // Extract frame-src
    const frameSrcMatch = csp.match(/frame-src\s+([^;]+)/);
    
    if (frameSrcMatch) {
      const frameSrc = frameSrcMatch[1];
      const domains = frameSrc.split(/\s+/).filter(d => d);
      
      console.log('');
      domains.forEach((domain, idx) => {
        if (domain.includes('opstream')) {
          console.log(`  ${idx + 1}. ${domain} ✅ OPHIM CDN`);
        } else {
          console.log(`  ${idx + 1}. ${domain}`);
        }
      });
      
      console.log('\n' + '─'.repeat(70));
      
      // Check for Ophim domains
      const hasOpstream = frameSrc.includes('opstream');
      
      if (hasOpstream) {
        console.log('\n✅ Ophim video CDN domains found in CSP!');
        console.log('   Video playback from vip.opstream90.com should work now.');
      } else {
        console.log('\n❌ Ophim video CDN domains NOT found in CSP!');
        console.log('   Need to add https://vip.opstream90.com to frame-src');
      }

      console.log('\n📌 Allowed video sources:');
      const videoSources = domains.filter(d => 
        d.includes('youtube') || 
        d.includes('vimeo') || 
        d.includes('opstream')
      );
      videoSources.forEach(source => {
        console.log(`   - ${source}`);
      });
      
    } else {
      console.log('❌ frame-src directive not found in CSP');
    }

    console.log('\n🔍 Full CSP Header:');
    console.log('─'.repeat(70));
    console.log(csp.split('; ').join('\n'));
    console.log('─'.repeat(70));

  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

testCSP();
