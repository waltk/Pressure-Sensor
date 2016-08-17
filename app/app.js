/**
 * The BLE plugin is loaded asynchronously so the ble
 * variable is set in the onDeviceReady handler.
 */
var ble = null;

/**
 * Called when HTML page has been loaded.
 */
$(document).ready( function()
{
// Adjust canvas size when browser resizes
    $(window).resize(respondCanvas);

// Adjust the canvas size when the document has loaded.
    respondCanvas();

  });

/**
 * Adjust the canvas dimensions based on its container's dimensions.
 */
function respondCanvas()
{
    var canvas = $('#canvas');
    var container = $(canvas).parent();
    canvas.attr('width', $(container).width()); // Max width
    //canvas.attr('height', $(container).height() ); // Max height

    var barCanvas = $('#barCanvas');
    var barContainer = $(barCanvas).parent();
    barCanvas.attr('width', $(barContainer).width()); // Max width
    //barCanvas.attr('height', $(barContainer).height() ); // Max height
}

/**
 * Application object that holds data and functions used by the app.
 */
var app =
{
    // Discovered devices.
    knownDevices: {},

    // Reference to the device we are connecting to.
    connectee: null,

    // Handle to the connected device.
    deviceHandle: null,

    // Handles to characteristics and descriptor for reading and
    // writing data from/to the Arduino using the BLE shield.
    characteristicRead: null,
    characteristicWrite: null,
    descriptorNotification: null,

    // Data that is plotted on the canvas.
    dataPoints: [],
    linedataPoints: [],
    bardataPoints: [],

    //copied the data array to two seperated arrays. One for the line graph and one for the bar graph.
    slicer: function(dataPoints)
    {
        if (dataPoints.length > 1) {
        linedataPoints = dataPoints.slice();
        bardataPoints = dataPoints.slice();
        }
    },

    initialize: function()
    {
        document.addEventListener('deviceready', app.onDeviceReady, false);
    },

    // Called when device plugin functions are ready for use.
    onDeviceReady: function()
    {
        ble = evothings.ble; // Evothings BLE plugin

        app.startScan();
    },

    startScan: function()
    {
        console.log('Scanning...');
        evothings.ble.startScan(
            function(deviceInfo)
            {
                if (app.knownDevices[deviceInfo.address])
                {
                    return;
                }
                console.log('found device: ' + deviceInfo.name);
                app.knownDevices[deviceInfo.address] = deviceInfo;
                if (deviceInfo.name == 'stabilizer' && !app.connectee)
                {
                    console.log('Found stabilizer');
                    connectee = deviceInfo;
                    app.connect(deviceInfo.address);
                }
            },
            function(errorCode)
            {
                console.log('startScan error: ' + errorCode);
            });
    },

    connect: function(address)
    {
        evothings.ble.stopScan();
        console.log('Connecting...');
        evothings.ble.connect(
            address,
            function(connectInfo)
            {
                if (connectInfo.state == 2) // Connected
                {
                    console.log('Connected');
                    app.deviceHandle = connectInfo.deviceHandle;
                    app.getServices(connectInfo.deviceHandle);
                }
            },
            function(errorCode)
            {
                console.log('connect error: ' + errorCode);
            });
    },

    /**
     * 
    Not using this currently, but left it in here in case we need to toggle any digital pins down the road.

    on: function()
    {
        app.write(
            'writeCharacteristic',
            app.deviceHandle,
            app.characteristicWrite,
            new Uint8Array([1])); // 1 = on
    },

    off: function()
    {
        app.write(
            'writeCharacteristic',
            app.deviceHandle,
            app.characteristicWrite,
            new Uint8Array([0])); // 0 = off
    },
    */

    

    write: function(writeFunc, deviceHandle, handle, value)
    {
        if (handle)
        {
            ble[writeFunc](
                deviceHandle,
                handle,
                value,
                function()
                {
                    console.log(writeFunc + ': ' + handle + ' success.');
                },
                function(errorCode)
                {
                    console.log(writeFunc + ': ' + handle + ' error: ' + errorCode);
                });
        }
    },

    startReading: function(deviceHandle)
    {
        console.log('Enabling notifications');

        // Turn notifications on.
        app.write(
            'writeDescriptor',
            deviceHandle,
            app.descriptorNotification,
            new Uint8Array([1,0]));

        // Start reading notifications.
        evothings.ble.enableNotification(
            deviceHandle,
            app.characteristicRead,
            function(data)
            {
                app.drawLines([new DataView(data).getUint16(0, true)]);
                app.drawBars([new DataView(data).getUint16(0, true)]);

            },
            function(errorCode)
            {
                console.log('enableNotification error: ' + errorCode);
            });
    },


    drawLines: function(dataArray)
	{
		var canvas = document.getElementById('canvas');
		var context = canvas.getContext('2d');
		var dataPoints = app.linedataPoints;


		dataPoints.push(dataArray);
		
		document.getElementById("demo").innerHTML = dataArray.valueOf();

		if (dataPoints.length > canvas.width)
		{
			dataPoints.splice(0, (dataPoints.length - canvas.width));
		}

		var magnitude = 1024;

		function calcY(i)
		{
			return (i * canvas.height) / magnitude;
		}

		function drawLine(offset, color)
		{
			context.strokeStyle = color;
			context.beginPath();
			context.moveTo(0, calcY(dataPoints[dataPoints.length-1] - y));
			var x = 1;
			for (var i = dataPoints.length - 2; i >= 0; i--)
			{
				var y = calcY(dataPoints[i][offset]);
				context.lineTo(x, canvas.height - y);
				x++;
			}
			context.stroke();
		}

		context.clearRect(0, 0, canvas.width, canvas.height);
		drawLine(0, '#f00');
	},

    drawBars: function(bardataArray)
    {
        var barCanvas = document.getElementById('barCanvas');
        var barContext = barCanvas.getContext('2d');
        var bardataPoints = app.bardataPoints;


        bardataPoints.push(bardataArray);
        document.getElementById("demo2").innerHTML = bardataArray.valueOf();


        if (bardataPoints.length > barCanvas.height)
        {
            bardataPoints.splice(0, (bardataPoints.length - barCanvas.height));
        }

        var bmagnitude = 1024;

        function bcalcY(i)
        {
            return (i * barCanvas.height) / bmagnitude;
        }

        function drawBar(offset, color)
        {
            barContext.fillStyle = color;  // will add here to change color depending on value
            barContext.beginPath();
    //      barContext.moveTo(0, bcalcY(bardataPoints[bardataPoints.length-1][offset]));
            var bx = 1;
            for (var i = bardataPoints.length - 2; i >= 0; i--)
            {
                var by = bcalcY(bardataPoints[i][offset]);
                barContext.fillRect(bx, barCanvas.height - by, 100, 200);
                bx = bx + 1000;
            }
            barContext.stroke();

        }

        barContext.clearRect(0, 0, barCanvas.width, barCanvas.height);
        drawBar(0, '#f00');

    },




    getServices: function(deviceHandle)
    {
        console.log('Reading services...');

        evothings.ble.readAllServiceData(deviceHandle, function(services)
        {
            // Find handles for characteristics and descriptor needed.
            for (var si in services)
            {
                var service = services[si];

                for (var ci in service.characteristics)
                {
                    var characteristic = service.characteristics[ci];

                    if (characteristic.uuid == '713d0002-503e-4c75-ba94-3148f18d941e')
                    {
                        app.characteristicRead = characteristic.handle;
                    }
                    else if (characteristic.uuid == '713d0003-503e-4c75-ba94-3148f18d941e')
                    {
                        app.characteristicWrite = characteristic.handle;
                    }

                    for (var di in characteristic.descriptors)
                    {
                        var descriptor = characteristic.descriptors[di];

                        if (characteristic.uuid == '713d0002-503e-4c75-ba94-3148f18d941e' &&
                            descriptor.uuid == '00002902-0000-1000-8000-00805f9b34fb')
                        {
                            app.descriptorNotification = descriptor.handle;
                        }
                    }
                }
            }

            if (app.characteristicRead && app.characteristicWrite && app.descriptorNotification)
            {
                console.log('RX/TX services found.');
                app.startReading(deviceHandle);
            }
            else
            {
                console.log('ERROR: RX/TX services not found!');
            }
        },
        function(errorCode)
        {
            console.log('readAllServiceData error: ' + errorCode);
        });
    },

    openBrowser: function(url)
    {
        window.open(url, '_system', 'location=yes');
    }
};
// End of app object.

// Initialise app.
app.initialize();

