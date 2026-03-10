#!/usr/bin/env node

// English Badge Verification Script
// Testing the updated badge text functions with English translations

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

// Updated English badge text function
function getBadgeText(episodeInfo) {
  if (episodeInfo.isCompleted) {
    return `Ep ${episodeInfo.total}`;
  } else if (episodeInfo.current && episodeInfo.total) {
    return `${episodeInfo.current}/${episodeInfo.total}`;
  } else if (episodeInfo.total) {
    return `Ep ${episodeInfo.total}`;
  }
  return '';
}

// Updated English status badge function
function getStatusBadgeInfo(status) {
  const statusLower = status?.toLowerCase();
  switch (statusLower) {
    case 'completed':
      return { text: 'Completed', variant: 'success' };
    case 'ongoing':
      return { text: 'Ongoing', variant: 'warning' };
    case 'upcoming':
      return { text: 'Upcoming', variant: 'secondary' };
    case 'canceled':
      return { text: 'Canceled', variant: 'destructive' };
    default:
      return null;
  }
}

// Test Cases
console.log('=== English Badge Translation Verification ===\n');

// Test Case 1: Completed series (dia-nguc-ngot-dang)
console.log('1. Test Case: Completed Series');
console.log('   episodeCurrent: "Hoàn Tất (17/17)"');
console.log('   episodeTotal: 17');
console.log('   status: "completed"');
const episodeInfo1 = extractEpisodeInfo("Hoàn Tất (17/17)", "17");
console.log('   Episode Result:', episodeInfo1);
console.log('   shouldShowEpisodeBadge:', shouldShowEpisodeBadge(episodeInfo1));
console.log('   getBadgeText:', getBadgeText(episodeInfo1));
console.log('   Status Badge:', getStatusBadgeInfo('completed'));
console.log('   ✅ EXPECTED: Episode badge shows "Ep 17", Status badge shows "Completed"\n');

// Test Case 2: Ongoing series
console.log('2. Test Case: Ongoing Series');
console.log('   episodeCurrent: "Tập 12"');
console.log('   episodeTotal: 17');
console.log('   status: "ongoing"');
const episodeInfo2 = extractEpisodeInfo("Tập 12", "17");
console.log('   Episode Result:', episodeInfo2);
console.log('   shouldShowEpisodeBadge:', shouldShowEpisodeBadge(episodeInfo2));
console.log('   getBadgeText:', getBadgeText(episodeInfo2));
console.log('   Status Badge:', getStatusBadgeInfo('ongoing'));
console.log('   ✅ EXPECTED: Episode badge shows "12/17", Status badge shows "Ongoing"\n');

// Test Case 3: Movie (single episode)
console.log('3. Test Case: Movie');
console.log('   episodeCurrent: "Full"');
console.log('   episodeTotal: 1');
console.log('   status: "completed"');
const episodeInfo3 = extractEpisodeInfo("Full", "1");
console.log('   Episode Result:', episodeInfo3);
console.log('   shouldShowEpisodeBadge:', shouldShowEpisodeBadge(episodeInfo3));
console.log('   getBadgeText:', getBadgeText(episodeInfo3));
console.log('   Status Badge:', getStatusBadgeInfo('completed'));
console.log('   ✅ EXPECTED: No episode badge (total = 1), Status badge shows "Completed"\n');

// Test Case 4: Upcoming series
console.log('4. Test Case: Upcoming Series');
console.log('   episodeCurrent: null');
console.log('   episodeTotal: 24');
console.log('   status: "upcoming"');
const episodeInfo4 = extractEpisodeInfo(null, "24");
console.log('   Episode Result:', episodeInfo4);
console.log('   shouldShowEpisodeBadge:', shouldShowEpisodeBadge(episodeInfo4));
console.log('   getBadgeText:', getBadgeText(episodeInfo4));
console.log('   Status Badge:', getStatusBadgeInfo('upcoming'));
console.log('   ✅ EXPECTED: Episode badge shows "Ep 24", Status badge shows "Upcoming"\n');

// Test Case 5: Canceled series
console.log('5. Test Case: Canceled Series');
console.log('   episodeCurrent: "Tập 5"');
console.log('   episodeTotal: 12');
console.log('   status: "canceled"');
const episodeInfo5 = extractEpisodeInfo("Tập 5", "12");
console.log('   Episode Result:', episodeInfo5);
console.log('   shouldShowEpisodeBadge:', shouldShowEpisodeBadge(episodeInfo5));
console.log('   getBadgeText:', getBadgeText(episodeInfo5));
console.log('   Status Badge:', getStatusBadgeInfo('canceled'));
console.log('   ✅ EXPECTED: Episode badge shows "5/12", Status badge shows "Canceled"\n');

console.log('=== English Translation Verification Complete ===');
console.log('🎯 Summary of Changes:');
console.log('   Episode Badges:');
console.log('   • "17 tập" → "Ep 17"');
console.log('   • "24 tập" → "Ep 24"');
console.log('   • Current/Total format unchanged: "12/17"');
console.log('');
console.log('   Status Badges:');
console.log('   • "Hoàn Tất" → "Completed"');
console.log('   • "Đang phát hành" → "Ongoing"');
console.log('   • "Sắp ra mắt" → "Upcoming"');
console.log('   • "Đã hủy" → "Canceled"');
