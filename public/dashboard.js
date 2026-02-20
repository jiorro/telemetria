class F1TelemetryDashboard {
  constructor() {
    this.socket = null;
    this.chart = null;
    this.labels = [];
    this.speedData = [];
    this.throttleData = [];
    this.brakeData = [];
    this.init();
  }

  init() {
    this.cacheElements();
    this.setupChart();
    this.setupEvents();
    this.updateStatus('Pronto per connettersi', 'info');
  }

  cacheElements() {
    this.elements = {
      connectBtn: document.getElementById('connectBtn'),
      ipInput: document.getElementById('ipInput'),
      status: document.getElementById('status'),
      speedDisplay: document.getElementById('speedDisplay'),
      throttle: document.getElementById('throttle'),
      brake: document.getElementById('brake'),
      rpm: document.getElementById('rpm'),
      gear: document.getElementById('gear'),
      lap: document.getElementById('lap'),
      position: document.getElementById('position')
    };

    ['pitLap', 'rejoinPos', 'tyreWear', 'avgLapTime', 'fastestLap', 'leaderPace', 'gapToLeader'].forEach(key => {
      this.elements[key] = document.getElementById(key);
      this.elements[key + 'Scroll'] = document.getElementById(key + 'Scroll');
    });
  }

  setupChart() {
    const ctx = document.getElementById('telemetryChart').getContext('2d');
    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.labels,
        datasets: [
          {
            label: 'Velocità (km/h)',
            data: this.speedData,
            borderColor: '#00ff88',
            backgroundColor: 'rgba(0, 255, 136, 0.1)',
            tension: 0.4,
            yAxisID: 'y'
          },
          {
            label: 'Throttle (%)',
            data: this.throttleData,
            borderColor: '#00ccff',
            backgroundColor: 'rgba(0, 204, 255, 0.1)',
            tension: 0.4,
            yAxisID: 'y1'
          },
          {
            label: 'Brake (%)',
            data: this.brakeData,
            borderColor: '#ff4444',
            backgroundColor: 'rgba(255, 68, 68, 0.1)',
            tension: 0.4,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false },
        scales: {
          x: { ticks: { color: '#aaa' }, grid: { color: '#333' } },
          y: {
            type: 'linear',
            position: 'left',
            beginAtZero: true,
            max: 350,
            ticks: { color: '#00ff88' },
            grid: { color: '#333' }
          },
          y1: {
            type: 'linear',
            position: 'right',
            beginAtZero: true,
            max: 100,
            ticks: { color: '#00ccff' },
            grid: { color: 'transparent' }
          }
        },
        plugins: { legend: { labels: { color: '#fff' } } }
      }
    });
  }

  setupEvents() {
    this.elements.connectBtn.addEventListener('click', () => this.toggleConnection());
    this.elements.ipInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.toggleConnection();
    });
  }

  toggleConnection() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.disconnect();
    } else {
      this.connect();
    }
  }

  connect() {
    const ip = this.elements.ipInput.value.trim();
    if (!ip) return this.updateStatus('Inserisci indirizzo server', 'error');

    try {
      this.elements.connectBtn.textContent = '🔌 Disconnetti';
      this.elements.connectBtn.disabled = true;
      this.updateStatus('Connessione in corso...', 'connecting');

      this.socket = new WebSocket(`ws://${ip}`);

      this.socket.onopen = () => {
        this.elements.connectBtn.disabled = false;
        this.updateStatus('🟢 Connesso!', 'connected');
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.updateDisplay(data);
        } catch (e) {
          console.error('JSON parse error:', e);
        }
      };

      this.socket.onclose = () => this.disconnect();
      this.socket.onerror = (e) => {
        console.error('WebSocket error:', e);
        this.updateStatus('❌ Errore connessione', 'error');
        this.elements.connectBtn.disabled = false;
      };
    } catch (e) {
      this.updateStatus('❌ Errore: ' + e.message, 'error');
      this.elements.connectBtn.disabled = false;
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.elements.connectBtn.textContent = '🔌 Connetti';
    this.elements.connectBtn.disabled = false;
    this.updateStatus('Disconnesso', 'info');
    this.resetDisplay();
  }

  updateDisplay(data) {
    this.elements.speedDisplay.textContent = `${Math.round(data.speed || 0)} km/h`;
    this.elements.throttle.textContent = `${Math.round(data.throttle || 0)}%`;
    this.elements.brake.textContent = `${Math.round(data.brake || 0)}%`;
    this.elements.rpm.textContent = data.rpm ? `${Math.round(data.rpm).toLocaleString()}` : '--';
    this.elements.gear.textContent = data.gear || '--';
    this.elements.lap.textContent = data.lap || '--';
    this.elements.position.textContent = data.position || '--';

    ['pitLap', 'rejoinPos', 'tyreWear', 'avgLapTime', 'fastestLap', 'leaderPace', 'gapToLeader'].forEach(key => {
      const value = data[key] ?? '--';
      if (this.elements[key]) this.elements[key].textContent = value;
      if (this.elements[key + 'Scroll']) this.elements[key + 'Scroll'].textContent = value;
    });

    const now = new Date().toLocaleTimeString('it-IT', { hour12: false });
    this.labels.push(now);
    this.speedData.push(data.speed || 0);
    this.throttleData.push(data.throttle || 0);
    this.brakeData.push(data.brake || 0);

    if (this.labels.length > 50) {
      this.labels.shift();
      this.speedData.shift();
      this.throttleData.shift();
      this.brakeData.shift();
    }

    this.chart.update('none');
  }

  updateStatus(message, type) {
    const statusEl = this.elements.status;
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    statusEl.style.display = 'block';
  }

  resetDisplay() {
    Object.values(this.elements).forEach(el => {
      if (el && typeof el.textContent !== 'undefined') {
        el.textContent = el.id === 'speedDisplay' ? '-- km/h' : '--';
      }
    });
  }
}

new F1TelemetryDashboard();
