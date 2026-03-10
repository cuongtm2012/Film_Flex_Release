#!/usr/bin/env node

// Episode Badge Fix Verification Script
// Testing the extractEpisodeInfo function with the problematic "dia-nguc-ngot-dang" case

function extractEpisodeInfo(episodeCurrent, episodeTotal) {
  if (!episodeCurrent) return { current: null, total: null, isCompleted: false };
  
  const totalEpisodes = episodeTotal ? parseInt(episodeTotal) : 0;
  
  // Handle "Full" or "Hoàn Tất" cases - these are completed series
  if (episodeCurrent.toLowerCase().includes('full') || episodeCurrent.toLowerCase().includes('hoàn tất')) {
    // For completed series, extract total from the string if available
    const completedMatch = episodeCurrent.match(/\((\d+)\/(\d+)\)/);
    if (completedMatch) {
      const current = parseInt(completedMatch[1]);
      const total = parseInt(completedMatch[2]);
      return { current, total, isCompleted: true };
    }
    // If no pattern match but we have episodeTotal, use that
    return { current: totalEpisodes, total: totalEpisodes, isCompleted: true };
  }
  
  // Extract number from formats like:
  // "Hoàn Tất (31/31)" -> 31
  // "Tập 12" -> 12  
  // "Episode 15" -> 15
  // "12" -> 12
  const patterns = [
    /\((\d+)\/\d+\)/,           // (31/31) format
    /tập\s*(\d+)/i,             // Tập 12 format
    /episode\s*(\d+)/i,         // Episode 15 format
    /^(\d+)$/                   // Plain number
  ];
  
  for (const pattern of patterns) {
    const match = episodeCurrent.match(pattern);
    if (match) {
      return { current: parseInt(match[1]), total: totalEpisodes, isCompleted: false };
    }
  }
  
  return { current: null, total: totalEpisodes, isCompleted: false };
}

function shouldShowEpisodeBadge(episodeInfo) {
  return episodeInfo.total && episodeInfo.total > 1;
}

function getBadgeText(episodeInfo) {
  if (episodeInfo.isCompleted) {
    return `${episodeInfo.total} tập`;
  } else if (episodeInfo.current && episodeInfo.total) {
    return `${episodeInfo.current}/${episodeInfo.total}`;
  } else if (episodeInfo.total) {
    return `${episodeInfo.total} tập`;
  }
  return '';
}

// Test Cases
console.log('=== Episode Badge Fix Verification ===\n');

// Test Case 1: dia-nguc-ngot-dang (the problematic case)
console.log('1. Test Case: dia-nguc-ngot-dang');
console.log('   episodeCurrent: "Hoàn Tất (17/17)"');
console.log('   episodeTotal: 17');
const episodeInfo1 = extractEpisodeInfo("Hoàn Tất (17/17)", "17");
console.log('   Result:', episodeInfo1);
console.log('   shouldShowEpisodeBadge:', shouldShowEpisodeBadge(episodeInfo1));
console.log('   getBadgeText:', getBadgeText(episodeInfo1));
console.log('   ✅ EXPECTED: Badge shows "17 tập"\n');

// Test Case 2: Ongoing series
console.log('2. Test Case: Ongoing Series');
console.log('   episodeCurrent: "Tập 12"');
console.log('   episodeTotal: 17');
const episodeInfo2 = extractEpisodeInfo("Tập 12", "17");
console.log('   Result:', episodeInfo2);
console.log('   shouldShowEpisodeBadge:', shouldShowEpisodeBadge(episodeInfo2));
console.log('   getBadgeText:', getBadgeText(episodeInfo2));
console.log('   ✅ EXPECTED: Badge shows "12/17"\n');

// Test Case 3: Movie (single episode)
console.log('3. Test Case: Movie');
console.log('   episodeCurrent: "Full"');
console.log('   episodeTotal: 1');
const episodeInfo3 = extractEpisodeInfo("Full", "1");
console.log('   Result:', episodeInfo3);
console.log('   shouldShowEpisodeBadge:', shouldShowEpisodeBadge(episodeInfo3));
console.log('   getBadgeText:', getBadgeText(episodeInfo3));
console.log('   ✅ EXPECTED: No badge (total = 1)\n');

// Test Case 4: Another completed series format
console.log('4. Test Case: Alternative Completed Format');
console.log('   episodeCurrent: "Full"');
console.log('   episodeTotal: 24');
const episodeInfo4 = extractEpisodeInfo("Full", "24");
console.log('   Result:', episodeInfo4);
console.log('   shouldShowEpisodeBadge:', shouldShowEpisodeBadge(episodeInfo4));
console.log('   getBadgeText:', getBadgeText(episodeInfo4));
console.log('   ✅ EXPECTED: Badge shows "24 tập"\n');

console.log('=== Verification Complete ===');
console.log('The episode badge fix should now correctly display badges for:');
console.log('- Completed series like "dia-nguc-ngot-dang" showing total episodes');
console.log('- Ongoing series showing current/total episodes');
console.log('- Movies (single episodes) will not show badges');
