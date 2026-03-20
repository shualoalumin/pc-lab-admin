import { supabaseSelect, supabaseInsert, supabaseUpdate } from './supabase-client.js'
import {
  LOG_BATCH_INTERVAL_MS,
  BLOCKED_DOMAINS_SYNC_INTERVAL_MIN,
  VIOLATION_REDIRECT_URL,
} from './config.js'

let pcNumber = null
let sessionId = null
let blockedDomains = []
let activityBuffer = []
let isLocked = false

async function init() {
  const stored = await chrome.storage.local.get(['pcNumber', 'sessionId'])
  pcNumber = stored.pcNumber ?? null
  sessionId = stored.sessionId ?? null

  if (pcNumber) {
    await syncBlockedDomains()
    startMonitoring()
  }
}

async function syncBlockedDomains() {
  try {
    const domains = await supabaseSelect('blocked_domains', 'select=domain')
    blockedDomains = domains.map((d) => d.domain.toLowerCase())
    await chrome.storage.local.set({ blockedDomains })
  } catch (e) {
    console.error('Failed to sync blocked domains:', e)
    const cached = await chrome.storage.local.get('blockedDomains')
    blockedDomains = cached.blockedDomains ?? []
  }
}

function isDomainBlocked(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    return blockedDomains.some(
      (blocked) => hostname === blocked || hostname.endsWith('.' + blocked)
    )
  } catch {
    return false
  }
}

function startMonitoring() {
  chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    if (changeInfo.url || changeInfo.title) {
      handleTabActivity(tab)
    }
  })

  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await chrome.tabs.get(activeInfo.tabId)
    handleTabActivity(tab)
  })

  chrome.alarms.create('flush-logs', { periodInMinutes: LOG_BATCH_INTERVAL_MS / 60000 })
  chrome.alarms.create('sync-domains', { periodInMinutes: BLOCKED_DOMAINS_SYNC_INTERVAL_MIN })
  chrome.alarms.create('check-pc-status', { periodInMinutes: 0.1 })

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'flush-logs') flushActivityBuffer()
    if (alarm.name === 'sync-domains') syncBlockedDomains()
    if (alarm.name === 'check-pc-status') checkPcStatus()
  })
}

async function handleTabActivity(tab) {
  if (!pcNumber || !sessionId || !tab.url) return
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return

  if (isDomainBlocked(tab.url)) {
    await handleViolation(tab)
    return
  }

  activityBuffer.push({
    session_id: sessionId,
    pc_number: pcNumber,
    url: tab.url,
    page_title: tab.title || '',
  })
}

async function handleViolation(tab) {
  try {
    await supabaseInsert('violation_events', {
      session_id: sessionId,
      pc_number: pcNumber,
      url: tab.url,
      activity_description: `차단된 사이트 접근: ${tab.title || tab.url}`,
    })

    await supabaseUpdate('pc_seats', { pc_number: pcNumber }, { status: 'LOCKED' })

    chrome.tabs.update(tab.id, { url: VIOLATION_REDIRECT_URL })

    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: '접근 차단',
      message: '허용되지 않은 사이트입니다. 관리자에게 알림이 전송되었습니다.',
    })

    isLocked = true
  } catch (e) {
    console.error('Violation handling failed:', e)
  }
}

async function flushActivityBuffer() {
  if (activityBuffer.length === 0) return

  const batch = [...activityBuffer]
  activityBuffer = []

  try {
    await supabaseInsert('activity_logs', batch)
  } catch (e) {
    console.error('Failed to flush activity logs:', e)
    activityBuffer.unshift(...batch)
  }
}

async function checkPcStatus() {
  if (!pcNumber) return

  try {
    const seats = await supabaseSelect(
      'pc_seats',
      `pc_number=eq.${pcNumber}&select=status,current_student_name`
    )
    if (seats.length === 0) return

    const seat = seats[0]

    if (seat.status === 'LOCKED' && !isLocked) {
      isLocked = true
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'PC 잠금',
        message: '관리자에 의해 PC가 잠겼습니다.',
      })
    } else if (seat.status === 'ACTIVE' && isLocked) {
      isLocked = false
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'PC 잠금 해제',
        message: 'PC 잠금이 해제되었습니다.',
      })
    }
  } catch (e) {
    console.error('PC status check failed:', e)
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'SET_CONFIG') {
    pcNumber = msg.pcNumber
    sessionId = msg.sessionId
    chrome.storage.local.set({ pcNumber, sessionId })
    syncBlockedDomains().then(() => {
      startMonitoring()
      sendResponse({ success: true })
    })
    return true
  }

  if (msg.type === 'GET_STATUS') {
    sendResponse({
      pcNumber,
      sessionId,
      isLocked,
      blockedDomainsCount: blockedDomains.length,
      bufferedLogs: activityBuffer.length,
    })
    return false
  }
})

init()
