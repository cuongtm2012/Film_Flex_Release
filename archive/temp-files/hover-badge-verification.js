/**
 * Hover Badge Implementation Verification
 * 
 * This script verifies that all movie card components have proper hover-only status badges
 * and always-visible episode badges implementation.
 */

const fs = require('fs');
const path = require('path');

const componentFiles = [
  'client/src/components/MovieCard.tsx',
  'client/src/components/TvSeriesCard.tsx', 
  'client/src/components/MoviePosterCard.tsx',
  'client/src/components/RecommendedMovieCard.tsx'
];

console.log('🔍 Verifying hover badge implementation...\n');

componentFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.log(`❌ ${file} - File not found`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  
  console.log(`📁 Checking ${file}:`);
  
  // Check for group class on container
  const hasGroupClass = content.includes('className={cn(\n          "group ') || 
                       content.includes('className="group ') ||
                       content.includes('<div className="group');
  
  // Check for hover-only status badges
  const hasHoverStatusBadge = content.includes('opacity-0 group-hover:opacity-100 transition-opacity duration-300');
  
  // Check for always-visible episode badges (should NOT have opacity-0)
  const episodeBadgeLines = content.split('\n').filter(line => 
    line.includes('Episode Badge') || 
    (line.includes('Badge') && line.includes('ListVideo'))
  );
  
  const hasAlwaysVisibleEpisodeBadge = episodeBadgeLines.some(line => 
    !line.includes('opacity-0')
  );
  
  // Check for English badge text
  const hasEnglishEpisodeBadge = content.includes('`Ep ${') || content.includes('"Ep "');
  const hasEnglishStatusBadge = content.includes("'Completed'") && 
                               content.includes("'Ongoing'") && 
                               content.includes("'Upcoming'") && 
                               content.includes("'Canceled'");
  
  console.log(`  ✅ Group class: ${hasGroupClass ? '✓' : '❌'}`);
  console.log(`  ✅ Hover-only status badges: ${hasHoverStatusBadge ? '✓' : '❌'}`);
  console.log(`  ✅ Always-visible episode badges: ${hasAlwaysVisibleEpisodeBadge ? '✓' : '❌'}`);
  console.log(`  ✅ English episode badge text: ${hasEnglishEpisodeBadge ? '✓' : '❌'}`);
  console.log(`  ✅ English status badge text: ${hasEnglishStatusBadge ? '✓' : '❌'}`);
  
  const allChecks = hasGroupClass && hasHoverStatusBadge && hasAlwaysVisibleEpisodeBadge && 
                   hasEnglishEpisodeBadge && hasEnglishStatusBadge;
  
  console.log(`  ${allChecks ? '🎉 ALL CHECKS PASSED' : '⚠️  SOME CHECKS FAILED'}\n`);
});

console.log('✨ Hover badge verification complete!');
