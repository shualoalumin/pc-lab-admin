const app = document.getElementById('app')

function renderSetup() {
  app.innerHTML = `
    <div class="setup-form">
      <div>
        <label>PC 번호</label>
        <input type="number" id="pcNumber" min="1" placeholder="예: 1" />
      </div>
      <div>
        <label>세션 ID (관리자에게 문의)</label>
        <input type="text" id="sessionId" placeholder="세션 ID 입력" />
      </div>
      <button class="btn btn-primary" id="saveBtn">설정 저장</button>
    </div>
  `

  document.getElementById('saveBtn').addEventListener('click', () => {
    const pcNumber = parseInt(document.getElementById('pcNumber').value)
    const sessionId = document.getElementById('sessionId').value.trim()

    if (!pcNumber || pcNumber < 1) {
      alert('올바른 PC 번호를 입력하세요.')
      return
    }

    chrome.runtime.sendMessage(
      { type: 'SET_CONFIG', pcNumber, sessionId },
      (response) => {
        if (response?.success) {
          loadStatus()
        }
      }
    )
  })
}

function renderStatus(status) {
  const statusClass = status.isLocked ? 'locked' : status.sessionId ? 'active' : 'disconnected'
  const statusText = status.isLocked ? '잠금' : status.sessionId ? '활성' : '미연결'

  app.innerHTML = `
    <div class="status-card ${statusClass}">
      <div class="status-label">상태</div>
      <div class="status-value">${statusText}</div>
    </div>
    <div class="grid">
      <div class="status-card">
        <div class="status-label">PC 번호</div>
        <div class="status-value">${status.pcNumber ? 'PC' + String(status.pcNumber).padStart(2, '0') : '-'}</div>
      </div>
      <div class="status-card">
        <div class="status-label">차단 도메인</div>
        <div class="status-value">${status.blockedDomainsCount}개</div>
      </div>
    </div>
    <div class="status-card">
      <div class="status-label">대기 중인 로그</div>
      <div class="status-value">${status.bufferedLogs}건</div>
    </div>
    <button class="btn btn-danger" id="resetBtn" style="margin-top:8px;">설정 초기화</button>
  `

  document.getElementById('resetBtn').addEventListener('click', () => {
    chrome.storage.local.clear(() => {
      renderSetup()
    })
  })
}

function loadStatus() {
  chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (status) => {
    if (status?.pcNumber) {
      renderStatus(status)
    } else {
      renderSetup()
    }
  })
}

loadStatus()
