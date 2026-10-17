'use strict';

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== 'SHUMDUBLAJ_OPEN_ACCOUNT') return;
  if (chrome.action?.openPopup) chrome.action.openPopup().catch(() => {});
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeBackgroundColor({ color: '#F2C14E' });
});
