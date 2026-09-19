"use strict";

/*
    SmartCore360
    Smart Water Monitoring Dashboard
    Simulation-based prototype
*/

const state = {
    running: false,
    paused: false,
    pumpRunning: false,
    leakage: false,
    muted: false,

    alertActive: false,
    alertAcknowledged: false,

    // Prevents an alert from reopening immediately after closing.
    alertBlockedUntil: 0,

    values: {
        tank: 62,
        flow: 14.2,
        pressure: 2.4,
        ph: 7.1,
        turbidity: 0.9,
        temperature: 24.5
    },

    history: [],
    timer: null
};

const elements = {
    startBtn: document.getElementById("startBtn"),
    pauseBtn: document.getElementById("pauseBtn"),
    stopBtn: document.getElementById("stopBtn"),
    resetBtn: document.getElementById("resetBtn"),
    themeBtn: document.getElementById("themeBtn"),
    testAlertBtn: document.getElementById("testAlertBtn"),
    muteBtn: document.getElementById("muteBtn"),

    systemStatus: document.getElementById("systemStatus"),
    lastUpdate: document.getElementById("lastUpdate"),

    tankValue: document.getElementById("tankValue"),
    flowValue: document.getElementById("flowValue"),
    pressureValue: document.getElementById("pressureValue"),
    qualityValue: document.getElementById("qualityValue"),
    phValue: document.getElementById("phValue"),
    turbidityValue: document.getElementById("turbidityValue"),
    temperatureValue: document.getElementById("temperatureValue"),
    leakValue: document.getElementById("leakValue"),

    tankSlider: document.getElementById("tankSlider"),
    pressureSlider: document.getElementById("pressureSlider"),
    phSlider: document.getElementById("phSlider"),
    turbiditySlider: document.getElementById("turbiditySlider"),

    tankSliderText: document.getElementById("tankSliderText"),
    pressureSliderText: document.getElementById("pressureSliderText"),
    phSliderText: document.getElementById("phSliderText"),
    turbiditySliderText: document.getElementById("turbiditySliderText"),

    leakBtn: document.getElementById("leakBtn"),
    clearLeakBtn: document.getElementById("clearLeakBtn"),

    startPumpBtn: document.getElementById("startPumpBtn"),
    stopPumpBtn: document.getElementById("stopPumpBtn"),
    pumpStatus: document.getElementById("pumpStatus"),

    riskValue: document.getElementById("riskValue"),
    riskDescription: document.getElementById("riskDescription"),
    recommendation: document.getElementById("recommendation"),
    activityLog: document.getElementById("activityLog"),

    alertOverlay: document.getElementById("alertOverlay"),
    alertTitle: document.getElementById("alertTitle"),
    alertMessage: document.getElementById("alertMessage"),
    acknowledgeBtn: document.getElementById("acknowledgeBtn"),
    closeAlertBtn: document.getElementById("closeAlertBtn"),

    sensorChart: document.getElementById("sensorChart")
};

const chartContext = elements.sensorChart.getContext("2d");

/* ----------------------------- */
/* Utility functions              */
/* ----------------------------- */

function randomNumber(min, max) {
    return Math.random() * (max - min) + min;
}

function getTime() {
    return new Date().toLocaleTimeString();
}

function logActivity(message) {
    const item = document.createElement("li");
    item.textContent = `${getTime()} - ${message}`;

    elements.activityLog.prepend(item);

    while (elements.activityLog.children.length > 20) {
        elements.activityLog.removeChild(
            elements.activityLog.lastElementChild
        );
    }
}

function updateTime() {
    elements.lastUpdate.textContent = getTime();
}

function setSystemStatus(text, isOnline) {
    elements.systemStatus.textContent = text;
    elements.systemStatus.className = isOnline
        ? "status-text online"
        : "status-text offline";
}

/* ----------------------------- */
/* Display sensor values          */
/* ----------------------------- */

function updateDashboard() {
    const values = state.values;

    elements.tankValue.textContent = `${Math.round(values.tank)}%`;
    elements.flowValue.textContent = values.flow.toFixed(1);
    elements.pressureValue.textContent = values.pressure.toFixed(1);
    elements.phValue.textContent = values.ph.toFixed(1);
    elements.turbidityValue.textContent = values.turbidity.toFixed(1);
    elements.temperatureValue.textContent =
        `${values.temperature.toFixed(1)}°C`;

    const waterQualityIsGood =
        values.ph >= 6.5 &&
        values.ph <= 8.5 &&
        values.turbidity <= 5;

    elements.qualityValue.textContent = waterQualityIsGood
        ? "Good"
        : "Poor";

    elements.qualityValue.style.color = waterQualityIsGood
        ? "#16a34a"
        : "#dc2626";

    elements.leakValue.textContent = state.leakage
        ? "Leak Detected"
        : "No Leak";

    elements.leakValue.style.color = state.leakage
        ? "#dc2626"
        : "#16a34a";

    elements.pumpStatus.textContent = state.pumpRunning
        ? "Running"
        : "Stopped";

    elements.pumpStatus.className = state.pumpRunning
        ? "online"
        : "offline";

    elements.tankSliderText.textContent =
        `${Math.round(values.tank)}%`;

    elements.pressureSliderText.textContent =
        `${values.pressure.toFixed(1)} bar`;

    elements.phSliderText.textContent =
        values.ph.toFixed(1);

    elements.turbiditySliderText.textContent =
        `${values.turbidity.toFixed(1)} NTU`;

    updateRisk();
    updateRecommendation();
    drawChart();
}

/* ----------------------------- */
/* Sensor simulation              */
/* ----------------------------- */

function generateSensors() {
    if (!state.running || state.paused) {
        return;
    }

    /*
        Values are kept mostly safe during automatic simulation.
        Use the sliders to demonstrate warning conditions.
    */

    state.values.flow = randomNumber(12, 17);
    state.values.temperature = randomNumber(23, 27);

    if (!state.leakage) {
        state.values.tank = Math.max(
            0,
            Math.min(100, state.values.tank + randomNumber(-1, 1))
        );
    }

    state.history.push({
        tank: state.values.tank,
        pressure: state.values.pressure,
        ph: state.values.ph,
        time: getTime()
    });

    if (state.history.length > 30) {
        state.history.shift();
    }

    updateDashboard();
    updateTime();
    checkWarnings();
}

/* ----------------------------- */
/* Warning logic                 */
/* ----------------------------- */

function getWarningMessage() {
    const values = state.values;

    if (state.leakage) {
        return "Possible water leakage detected. Inspect pipes and valves immediately.";
    }

    if (values.tank < 30) {
        return "Water tank level is low. Check the water supply and consider starting the pump.";
    }

    if (values.tank > 70) {
        return "Water tank level is high. Check the pump and stop filling if necessary.";
    }

    if (values.pressure < 1 || values.pressure > 5) {
        return "Abnormal line pressure detected. Inspect the pipeline and pressure system.";
    }

    if (values.ph < 6.5 || values.ph > 8.5) {
        return "pH level is outside the normal range. Check water quality.";
    }

    if (values.turbidity > 5) {
        return "High turbidity detected. Inspect water quality and filtration.";
    }

    return "";
}

function checkWarnings() {
    /*
        Do not show another alert while one is already open.
    */
    if (state.alertActive) {
        return;
    }

    /*
        Do not reopen immediately after the user closes an alert.
    */
    if (Date.now() < state.alertBlockedUntil) {
        return;
    }

    const message = getWarningMessage();

    if (message !== "") {
        showAlert("System Warning", message);
    }
}

function showAlert(title, message) {
    if (state.alertActive) {
        return;
    }

    if (Date.now() < state.alertBlockedUntil) {
        return;
    }

    state.alertActive = true;
    state.alertAcknowledged = false;

    elements.alertTitle.textContent = title;
    elements.alertMessage.textContent = message;
    elements.alertOverlay.classList.add("show");

    logActivity(`Alert opened: ${message}`);

    if (!state.muted) {
        playAlertSound();
    }
}

function closeAlert() {
    /*
        Block new alerts for 5 seconds.
        This fixes the problem where the alert immediately appears again.
    */
    state.alertBlockedUntil = Date.now() + 5000;

    state.alertActive = false;
    state.alertAcknowledged = true;

    elements.alertOverlay.classList.remove("show");

    stopAlertSound();

    logActivity("Alert closed by operator.");

    updateRisk();
    updateRecommendation();
}

function acknowledgeAlert() {
    state.alertAcknowledged = true;
    state.alertActive = false;

    elements.alertOverlay.classList.remove("show");

    stopAlertSound();

    /*
        Also apply a short cooldown after acknowledgement.
    */
    state.alertBlockedUntil = Date.now() + 5000;

    logActivity("Alert acknowledged by operator.");

    updateRisk();
    updateRecommendation();
}

/* ----------------------------- */
/* Alert sound                   */
/* ----------------------------- */

let audioContext = null;
let soundTimer = null;

function playAlertSound() {
    try {
        if (!audioContext) {
            audioContext = new AudioContext();
        }

        stopAlertSound();

        soundTimer = setInterval(() => {
            if (!state.alertActive || state.muted) {
                return;
            }

            const oscillator = audioContext.createOscillator();
            const gain = audioContext.createGain();

            oscillator.frequency.value = 750;
            oscillator.type = "sine";

            gain.gain.setValueAtTime(
                0.08,
                audioContext.currentTime
            );

            oscillator.connect(gain);
            gain.connect(audioContext.destination);

            oscillator.start();

            oscillator.stop(audioContext.currentTime + 0.15);
        }, 700);
    } catch (error) {
        console.log("Audio is not available in this browser.");
    }
}

function stopAlertSound() {
    if (soundTimer !== null) {
        clearInterval(soundTimer);
        soundTimer = null;
    }
}

/* ----------------------------- */
/* Risk and recommendations       */
/* ----------------------------- */

function updateRisk() {
    const message = getWarningMessage();

    if (message === "") {
        elements.riskValue.textContent = "Low";
        elements.riskValue.className = "risk risk-low";
        elements.riskDescription.textContent =
            "All monitored values are within the safe range.";
        return;
    }

    if (state.leakage ||
        state.values.tank < 20 ||
        state.values.turbidity > 10) {
        elements.riskValue.textContent = "High";
        elements.riskValue.className = "risk risk-high";
        elements.riskDescription.textContent =
            "Immediate operator attention is required.";
        return;
    }

    elements.riskValue.textContent = "Medium";
    elements.riskValue.className = "risk risk-medium";
    elements.riskDescription.textContent =
        "One or more readings require attention.";
}

function updateRecommendation() {
    const message = getWarningMessage();

    elements.recommendation.textContent = message ||
        "Continue normal monitoring. All important readings are currently safe.";
}

/* ----------------------------- */
/* Graph                         */
/* ----------------------------- */

function drawChart() {
    const canvas = elements.sensorChart;
    const ctx = chartContext;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const isDark = document.body.classList.contains("dark");

    ctx.fillStyle = isDark ? "#111827" : "#f8fafc";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = isDark ? "#374151" : "#dbeafe";
    ctx.lineWidth = 1;

    for (let y = 30; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }

    if (state.history.length < 2) {
        ctx.fillStyle = isDark ? "#cbd5e1" : "#64748b";
        ctx.font = "16px Arial";
        ctx.fillText("Start simulation to view graph", 20, 35);
        return;
    }

    const maxValue = 100;
    const minValue = 0;

    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 3;
    ctx.beginPath();

    state.history.forEach((point, index) => {
        const x =
            (index / (state.history.length - 1)) *
            (width - 40) + 20;

        const y =
            height - 25 -
            ((point.tank - minValue) / (maxValue - minValue)) *
            (height - 50);

        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    ctx.stroke();

    ctx.fillStyle = isDark ? "#f9fafb" : "#172033";
    ctx.font = "14px Arial";
    ctx.fillText("Tank Level (%)", 20, 20);
}

/* ----------------------------- */
/* Main system controls          */
/* ----------------------------- */

function startSystem() {
    if (state.running && !state.paused) {
        logActivity("System is already running.");
        return;
    }

    state.running = true;
    state.paused = false;

    setSystemStatus("Running", true);
    logActivity("System started.");

    if (state.timer === null) {
        state.timer = setInterval(generateSensors, 1200);
    }

    updateDashboard();
}

function pauseSystem() {
    if (!state.running) {
        logActivity("System is not running.");
        return;
    }

    state.paused = true;

    setSystemStatus("Paused", true);
    logActivity("System paused.");
}

function stopSystem() {
    state.running = false;
    state.paused = false;

    if (state.timer !== null) {
        clearInterval(state.timer);
        state.timer = null;
    }

    setSystemStatus("Stopped", false);
    logActivity("System stopped.");
}

function resetSystem() {
    stopSystem();

    state.pumpRunning = false;
    state.leakage = false;
    state.alertActive = false;
    state.alertAcknowledged = false;
    state.alertBlockedUntil = 0;

    state.values = {
        tank: 62,
        flow: 14.2,
        pressure: 2.4,
        ph: 7.1,
        turbidity: 0.9,
        temperature: 24.5
    };

    state.history = [];

    elements.tankSlider.value = 62;
    elements.pressureSlider.value = 2.4;
    elements.phSlider.value = 7.1;
    elements.turbiditySlider.value = 0.9;

    elements.alertOverlay.classList.remove("show");

    stopAlertSound();
    updateDashboard();
    updateTime();

    logActivity("System reset to normal values.");
}

/* ----------------------------- */
/* Pump controls                 */
/* ----------------------------- */

function startPump() {
    state.pumpRunning = true;
    logActivity("Pump started.");
    updateDashboard();
}

function stopPump() {
    state.pumpRunning = false;
    logActivity("Pump stopped.");
    updateDashboard();
}

/* ----------------------------- */
/* Leakage controls               */
/* ----------------------------- */

function simulateLeakage() {
    state.leakage = true;
    logActivity("Leakage simulation activated.");
    updateDashboard();
    checkWarnings();
}

function clearLeakage() {
    state.leakage = false;
    logActivity("Leakage cleared.");
    updateDashboard();
}

/* ----------------------------- */
/* Slider controls                */
/* ----------------------------- */

elements.tankSlider.addEventListener("input", function () {
    state.values.tank = Number(this.value);
    updateDashboard();
    checkWarnings();
});

elements.pressureSlider.addEventListener("input", function () {
    state.values.pressure = Number(this.value);
    updateDashboard();
    checkWarnings();
});

elements.phSlider.addEventListener("input", function () {
    state.values.ph = Number(this.value);
    updateDashboard();
    checkWarnings();
});

elements.turbiditySlider.addEventListener("input", function () {
    state.values.turbidity = Number(this.value);
    updateDashboard();
    checkWarnings();
});

/* ----------------------------- */
/* Button events                 */
/* ----------------------------- */

elements.startBtn.addEventListener("click", startSystem);
elements.pauseBtn.addEventListener("click", pauseSystem);
elements.stopBtn.addEventListener("click", stopSystem);
elements.resetBtn.addEventListener("click", resetSystem);

elements.testAlertBtn.addEventListener("click", function () {
    showAlert(
        "Test Alert",
        "This is a demonstration alert from SmartCore360."
    );
});

elements.muteBtn.addEventListener("click", function () {
    state.muted = !state.muted;

    elements.muteBtn.textContent = state.muted
        ? "Unmute Sound"
        : "Mute Sound";

    if (state.muted) {
        stopAlertSound();
        logActivity("Alert sound muted.");
    } else {
        logActivity("Alert sound enabled.");
    }
});

elements.themeBtn.addEventListener("click", function () {
    document.body.classList.toggle("dark");

    const darkModeEnabled =
        document.body.classList.contains("dark");

    elements.themeBtn.textContent = darkModeEnabled
        ? "Light Mode"
        : "Dark Mode";

    drawChart();
});

elements.startPumpBtn.addEventListener("click", startPump);
elements.stopPumpBtn.addEventListener("click", stopPump);

elements.leakBtn.addEventListener("click", simulateLeakage);
elements.clearLeakBtn.addEventListener("click", clearLeakage);

elements.closeAlertBtn.addEventListener("click", closeAlert);
elements.acknowledgeBtn.addEventListener("click", acknowledgeAlert);

/* ----------------------------- */
/* Initial setup                 */
/* ----------------------------- */

function initializeApp() {
    updateDashboard();
    updateTime();

    setSystemStatus("Stopped", false);

    logActivity("SmartCore360 dashboard loaded.");
    logActivity("Simulation mode enabled.");

    drawChart();
}

initializeApp();
