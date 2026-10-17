'use strict';

// Попап: вход в профиль, баланс кредитов и выход. Регистрации нет, профили
// заводит продавец, поэтому здесь только форма входа.

const API = 'https://app.shumtuber.uz/dublaj';
const TOKEN_KEY = 'shumdublajAuthToken';
const $ = (selector) => document.querySelector(selector);
const states = ['loading', 'offline', 'auth', 'ready'];

function showState(id) {
  for (const state of states) $(`#${state}`).hidden = state !== id;
}

function getToken() {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get([TOKEN_KEY], (res) => resolve((res && res[TOKEN_KEY]) || ''));
    } catch {
      resolve('');
    }
  });
}

function setToken(token) {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.set({ [TOKEN_KEY]: token }, resolve);
    } catch {
      resolve();
    }
  });
}

function clearToken() {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.remove(TOKEN_KEY, resolve);
    } catch {
      resolve();
    }
  });
}

async function callApi(pathname, options = {}) {
  const response = await fetch(`${API}${pathname}`, { cache: 'no-store', ...options });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  return { ok: response.ok, status: response.status, body };
}

function renderProfile(user) {
  const login = user.login || user.email || '';
  $('#user-name').textContent = user.name || 'Foydalanuvchi';
  $('#user-login').textContent = login;
  $('#user-plan').textContent = String(user.plan || 'free').toUpperCase();
  $('#credits').textContent = String(user.credits ?? 0);
  $('#avatar').textContent = (user.name || login || 'S').trim().charAt(0).toUpperCase();

  const list = $('#capability-list');
  list.innerHTML = '';
  for (const item of user.capabilities || []) {
    const li = document.createElement('li');
    li.textContent = item.label;
    if (!item.enabled) li.className = 'disabled';
    list.appendChild(li);
  }
  showState('ready');
}

async function bootstrap() {
  showState('loading');
  let health;
  try {
    health = await callApi('/health');
    if (!health.ok || !health.body || !health.body.ok) throw new Error('server');
  } catch {
    showState('offline');
    return;
  }
  $('#server-state').textContent = 'server tayyor';

  const token = await getToken();
  if (!token) {
    showState('auth');
    return;
  }

  const me = await callApi('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
  if (me.ok && me.body && me.body.user) {
    renderProfile(me.body.user);
    return;
  }
  // Сессия истекла или профиль закрыт: токен больше не нужен
  await clearToken();
  $('#login-error').textContent = (me.body && me.body.error) || '';
  showState('auth');
}

$('#retry').addEventListener('click', bootstrap);

async function submitLogin() {
  const button = $('#login-submit');
  if (button.disabled) return;
  const login = $('#login-name').value.trim();
  const password = $('#login-password').value;
  $('#login-error').textContent = '';
  button.disabled = true;
  button.textContent = 'Kirilmoqda...';
  try {
    const result = await callApi('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password }),
    });
    if (!result.ok || !result.body || !result.body.token) {
      $('#login-error').textContent = (result.body && result.body.error) || "Kirib bo'lmadi";
      return;
    }
    await setToken(result.body.token);
    $('#login-password').value = '';
    renderProfile(result.body.user);
  } catch {
    $('#login-error').textContent = 'Server bilan aloqa yo‘q';
  } finally {
    button.disabled = false;
    button.textContent = 'Kirish';
  }
}

$('#login-submit').addEventListener('click', submitLogin);
for (const id of ['login-name', 'login-password']) {
  $(`#${id}`).addEventListener('keydown', (event) => {
    if (event.key === 'Enter') submitLogin();
  });
}

$('#logout').addEventListener('click', async () => {
  const token = await getToken();
  if (token) {
    try {
      await callApi('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Сервер мог не ответить: локально всё равно выходим
    }
  }
  await clearToken();
  $('#login-error').textContent = '';
  $('#login-password').value = '';
  showState('auth');
});

$('#open-youtube').addEventListener('click', async () => {
  await chrome.tabs.create({ url: 'https://www.youtube.com/' });
  window.close();
});

try {
  $('#version').textContent = chrome.runtime.getManifest().version;
} catch {}

bootstrap();
