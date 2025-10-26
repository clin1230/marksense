// Service Worker for MarkSense AI
// No network calls - 100% offline processing

console.log('MarkSense AI Service Worker loaded');

/**
 * Handle extension installation/update
 * Runs when extension is first installed, updated, or Chrome is updated
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);
  // Can initialize default settings, create context menus, etc.
});

/**
 * Handle keyboard command shortcuts
 * Commands defined in manifest.json: mark_important, mark_confused, translate_block
 */
chrome.commands.onCommand.addListener(async (command) => {
  console.log('Command triggered:', command);
  
  try {
    // Get the active tab in the current window
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.id) {
      console.warn('No active tab found');
      return;
    }
    
    // Send command message to the content script in the active tab
    await chrome.tabs.sendMessage(tab.id, {
      type: 'COMMAND',
      command: command
    });
    
    console.log(`Command "${command}" sent to tab ${tab.id}`);
    
  } catch (error) {
    console.error('Failed to send command to tab:', error);
  }
});

/**
 * Handle messages from content scripts and side panel
 * Used for bidirectional communication between extension components
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);
  
  // Add custom message handling logic here
  // Example: storage operations, tab queries, etc.
  
  sendResponse({ status: 'received' });
  return true; // Keep channel open for async response
});

/**
 * Handle extension icon click to open side panel
 * Side panel provides the main UI for the extension
 */
chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.sidePanel.open({ windowId: tab.windowId });
    console.log('Side panel opened for window:', tab.windowId);
  } catch (error) {
    console.error('Failed to open side panel:', error);
  }
});

