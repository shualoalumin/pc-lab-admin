let lockOverlay = null

function showLockScreen(message) {
  if (lockOverlay) return

  lockOverlay = document.createElement('div')
  lockOverlay.id = 'pc-lab-lock-overlay'
  lockOverlay.innerHTML = `
    <div style="
      position: fixed; inset: 0; z-index: 2147483647;
      background: rgba(0,0,0,0.95);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      font-family: system-ui, sans-serif; color: white;
    ">
      <div style="font-size: 48px; margin-bottom: 16px;">🔒</div>
      <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 8px;">PC 잠금</h1>
      <p style="font-size: 16px; color: #aaa;">${message}</p>
    </div>
  `
  document.body.appendChild(lockOverlay)
}

function removeLockScreen() {
  if (lockOverlay) {
    lockOverlay.remove()
    lockOverlay = null
  }
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'LOCK_SCREEN') {
    showLockScreen(msg.message || '관리자에 의해 잠겼습니다.')
  }
  if (msg.type === 'UNLOCK_SCREEN') {
    removeLockScreen()
  }
})
