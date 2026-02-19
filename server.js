<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>
  const telemetry = document.getElementById('telemetry');
  const form = document.getElementById('configForm');
  const ipInput = document.getElementById('ipInput');
  const speedDisplay = document.getElementById('speedDisplay');

  const pitLapEl = document.getElementById('pitLap');
  const rejoinPosEl = document.getElementById('rejoinPos');
  const tyreWearEl = document.getElementById('tyreWear');
  const avgLapTimeEl = document.getElementById('avgLapTime');
  const fastestLapEl = document.getElementById('fastestLap');
  const leaderPaceEl = document.getElementById('leaderPace');

  let socket;
  let chart;
  const labels = [];
  const speedData = [];
  const throttleData = [];
  const brakeData = [];

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const ip = ipInput.value;
    socket = new WebSocket(`ws://${ip}:3000`);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      telemetry.innerHTML = `
        Throttle: ${data.throttle}% | Freno: ${data.brake}%
      `;
      speedDisplay.textContent = `${data.speed} km/h`;

      // Aggiorna strategia
      pitLapEl.textContent = data.pitLap ?? '--';
      rejoinPosEl.textContent = data.rejoinPos ?? '--';
      tyreWearEl.textContent = data.tyreWear ?? '--';
      avgLapTimeEl.textContent = data.avgLapTime ?? '--';
      fastestLapEl.textContent = data.fastestLap ?? '--';
      leaderPaceEl.textContent = data.leaderPace ?? '--';

      const now = new Date().toLocaleTimeString();
      labels.push(now);
      speedData.push(data.speed);
      throttleData.push(data.throttle);
      brakeData.push(data.brake);

      if (labels.length > 30) {
        labels.shift();
        speedData.shift();
        throttleData.shift();
        brakeData.shift();
      }

      chart.update();
    };

    socket.onerror = () => {
      telemetry.innerHTML = "Errore nella connessione WebSocket.";
      speedDisplay.textContent = "-- km/h";
    };
  });

  const ctx = document.getElementById('chart').getContext('2d');
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        { label: 'Velocità (km/h)', data: speedData, borderColor: 'lime', fill: false },
        { label: 'Throttle (%)', data: throttleData, borderColor: 'cyan', fill: false },
        { label: 'Freno (%)', data: brakeData, borderColor: 'red', fill: false }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: 'white'
          }
        }
      },
      scales: {
        x: {
          ticks: { color: 'white' },
          grid: { color: '#444' }
        },
        y: {
          beginAtZero: true,
          max: 350,
          ticks: { color: 'white' },
          grid: { color: '#444' }
        }
      }
    }
  });
</script>

