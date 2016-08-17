// Include BLE files.
#include <SPI.h>
#include <boards.h>
#include <RBL_nRF8001.h>
#include <services.h>

// Define input/output pins
#define INPUT_PIN A0

// This function is called only once, at reset.
void setup() {
	// Enable serial debug.
	Serial.begin(9600);

	// Initialize BLE library.
	ble_begin();

	// Set a custom BLE name.
	ble_set_name("stabilizer");

	Serial.println("ble_begin done!");
}

// This function is called continuously, after setup() completes.
void loop() {
	
	// Read the analog input pin and send the data over BLE.
	short i = analogRead(INPUT_PIN);
	ble_write_bytes((byte*)&i, 2);

	// Process BLE events.
	ble_do_events();
}
