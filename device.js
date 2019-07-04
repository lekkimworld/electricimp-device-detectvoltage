// IMPORTS
#require "WS2812.class.nut:3.0.0"

// constants
const ACTIVITY_SAMPLE_DELAY = 2.0;
const SAMPLES_ALLOW_OPPOSITE = 10;
const ACTIVITY_PERIOD_SECONDS = 3;

// 'GLOBALS'
i2c <- hardware.i2c89;
spi <- null;
led <- null;
doLog <- true;
backend <- true;
motion <- true; // true means detect movement and false means detect no-movement
samplesMotion <- 0;
samplesNoMotion <- 0;
firstMotionDetection <- motion;
firstNoMotionDetection <- !motion;

// configure onboard LED
spi = hardware.spi257;
spi.configure(MSB_FIRST, 7500);
hardware.pin1.configure(DIGITAL_OUT, 1);
led = WS2812(spi, 1);

// log
function serverLog(msg) {
    if (doLog) server.log(msg);
}

// configure pin
function pin5Changed() {
    //serverLog("Pin 5 changed - is now: " + hardware.pin5.read());
}
hardware.pin5.configure(DIGITAL_IN_PULLDOWN, pin5Changed);

function checkIfFirstDetection(detectMotion, detectNoMotion, data) {
    local sendToBackend = false;
    if (detectMotion && firstMotionDetection) {
        server.log("This was first motion detected after NO motion");
        firstMotionDetection = false;
        firstNoMotionDetection = true;
        sendToBackend = true;
    }
    if (detectNoMotion && firstNoMotionDetection) {
        server.log("This was first NO motion detected after motion");
        firstMotionDetection = true;
        firstNoMotionDetection = false;
        sendToBackend = true;
    }
    
    // abort if we should not send to backend
    if (!sendToBackend || !backend) return;
    
    // log and turn on led
    server.log("Backend communication is enabled - flash LED and send to agent");
    if (detectMotion) {
        ledRunning();
    } else {
        ledStopped();
    }
    
    // message agent
    local accelData = {
        "movement": detectMotion
    }
    agent.send("motion", accelData);
}

function ledSet(color) {
    led.set(0, color).draw();
}

function ledRunning() {
    ledSet([0,255,0]);
}

function ledStopped() {
    ledSet([255,0,0]);
}

function setBackend(state) {
    backend = state;
    ledSet([0,0,255]);
}
function setMotion(state) {
    motion = state;
    if (motion) {
        ledRunning();    
    } else {
        ledStopped();    
    }
    
}

function readMotorInput() {
    serverLog("Pin 5 read - is now: " + hardware.pin5.read());
    local detectMotion = hardware.pin5.read() == 1;
    local detectNoMotion = !detectMotion;
    local samplesForActivity = ACTIVITY_PERIOD_SECONDS / ACTIVITY_SAMPLE_DELAY;
    local data = {
        "movement": detectMotion
    }
    
    if (detectMotion) {
            samplesMotion++;
            if (samplesMotion > SAMPLES_ALLOW_OPPOSITE) samplesNoMotion = 0;
        }
        if (detectNoMotion) {
            samplesNoMotion++;
            if (samplesNoMotion > SAMPLES_ALLOW_OPPOSITE) samplesMotion = 0;
        }
        if (samplesMotion >= samplesForActivity) {
            server.log(format("We had motion for %i seconds", ACTIVITY_PERIOD_SECONDS));
            samplesMotion = 0;
            
            // check if first detection
            checkIfFirstDetection(detectMotion, detectNoMotion, data);
        }
        if (samplesNoMotion >= samplesForActivity) {
            server.log(format("We had NO motion for %i seconds", ACTIVITY_PERIOD_SECONDS));
            samplesNoMotion = 0;
            
            // check if first detection
            checkIfFirstDetection(detectMotion, detectNoMotion, data);
        }
    
    // add trigger
    imp.wakeup(ACTIVITY_SAMPLE_DELAY, readMotorInput);
}

// listen for messages from agent
agent.on("set.backend", setBackend);
agent.on("set.motion", setMotion);

// Start the loop
readMotorInput();
ledSet([0,0,255]);
serverLog("Started...");
