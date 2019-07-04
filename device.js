// IMPORTS
#require "WS2812.class.nut:3.0.0"

// 'GLOBALS'
i2c <- hardware.i2c89;
spi <- null;
led <- null;
doLog <- true;

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
    serverLog("Pin 5 changed - is now: " + hardware.pin5.read());
}
hardware.pin5.configure(DIGITAL_IN_PULLDOWN, pin5Changed);

function ledSet(color) {
    led.set(0, color).draw();
}

function ledOn() {
    ledSet([0,255,0]);
}

function ledOff() {
    ledSet([255,0,0]);
}

function loop() {
    local state = hardware.pin5.read();
    serverLog("Pin 5 read - is now: " + hardware.pin5.read());
    if (state == 1) {
        serverLog("On");
        ledOn();
    } else {
        serverLog("Off");
        ledOff();
    }
    
    // Trigger the loop function again in 1 second's time
    imp.wakeup(2.0, loop);
}

// Start the loop
loop();
ledSet([0,0,255]);
serverLog("Started...");
