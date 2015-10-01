(function(exports) {

    var that = null;
    var mmodel = Backbone.Model.extend({
        defaults:
        {
            default_speed_mm:100,
            default_speed_in:0.1,
            jog_speed: 10,
            jog_mode: 'con',
        }
    });

    function Machine()
    {
        this.ctrlPort = null;
        this.dataPort = null;
        this.ctrlConnection = false;
        this.dataConnection = false;
        this.running = false;
        this.serialPortSpeed = 115200;
        this.serialQueue = [];
        this.responseBuffer = "";
        this.queueAvailable = 28;

        this.data = new mmodel();

/*
        this.data.on('change:unit', function(d) {
          if(d.attributes.unit == 1 && d.attributes.jog_mode == 'jog')
            d.set({jog_speed:d.attributes.zvf});
        })
*/
        that = this;

        chrome.serial.onReceive.addListener(this.processResponse);
        chrome.serial.onReceiveError.addListener(this.onConnectionError);
    }

    Machine.prototype.get = function(e)
    {
        return this.data.get(e);
    };

    Machine.prototype.set = function(e)
    {
        return that.data.set(e);
    };

    Machine.prototype.trigger = function(e)
    {
        that.data.trigger(e);
    }

    Machine.prototype.onConnectionError = function(e)
    {
        that.connected = false;
        channel.trigger('connection.error', e);
    }

    Machine.prototype.command = function(data, cb) {
        if (!cb)
            cb = function() {};

        var lines = data.split('\n');

        //console.info(lines)

        _.each(lines, function(l) {
          this.push(l);
        }, this.serialQueue);

        if (!this.running)
          this.sendNextLine();
    }

    Machine.prototype.homeAxis = function(axis)
    {
        that.command('{"gc": "G28.2 _AXIS_0"}'.replace("_AXIS_", axis));
    }

    Machine.prototype.getStatusReport = function()
    {
        that.command('{"sr":""}');
    }

    Machine.prototype.sendNextLine = function()
    {
        if (!this.connected) return;

        if (this.serialQueue.length == 0) {
          this.running = false;
          return;
        }


        if (this.queueAvailable > 18) {
          var l = this.serialQueue.shift().trim() + '\n';
          //console.info("------->",l);
          chrome.serial.send(this.dataConnection.connectionId, str2ab(l), function(e) {
            if (chrome.runtime.lastError) {
                console.info(chrome.runtime.lastError)
            }
          });
          this.running = this.serialQueue.length > 0;
        }

    }

    Machine.prototype.autoconnect = function(cb)
    {
        var that = this;

        chrome.runtime.getPlatformInfo(onGetPlatform);

        function onGetPlatform(p) {
          that.platform = p.os;
          chrome.serial.getDevices(onGetDevices);
        }

        function onGetDevices(devices) {
            console.info(devices);

            // reference: https://github.com/synthetos/g2/wiki/Connecting-to-TinyG
            // if os is mac, port is going to be something like
            // ctrl: /dev/cu.usbmodem14311
            // data: /dev/cu.usbmodem14313

            if (that.platform == 'mac') {
              _.each(devices, function(d) {
                  if (d.path.search('cu.usbmodem') != -1) {
                    if (that.ctrlPort == null)
                      that.ctrlPort = d.path;
                    else {
                      that.dataPort = d.path;
                    }
                  }
              })

              if (that.ctrlPort && that.dataPort) {
                console.info("found port, now try to connect");
                openPorts();
              } else {
                channel.trigger('connection.error');
              }
            }
            else if (that.platform == 'linux') {
              // on linux, ports should be /dev/ttyACM0 and /dev/ttyACM1
              that.ctrlPort = '/dev/ttyACM0';
              that.dataPort ='/dev/ttyACM1';
            }
            else if (that.platform == 'win') {
              // TODO
            }

            function openPorts()
            {
                chrome.serial.connect(that.ctrlPort, {bitrate: that.serialPortSpeed, bufferSize: 409600 }, function(o) {
                  if (!chrome.runtime.lastError) {
                      that.ctrlConnection = o;
                      verifyConnection();
                  } else {
                      debugger
                      channel.trigger('connection.error');
                  }
                });

                chrome.serial.connect(that.dataPort, {bitrate: that.serialPortSpeed, bufferSize: 409600 }, function(o) {
                  if (!chrome.runtime.lastError) {
                      that.dataConnection = o;
                      verifyConnection();
                  } else {
                    debugger
                      channel.trigger('connection.error');
                  }
                });
            }

            function verifyConnection()
            {
                if (that.ctrlConnection && that.dataConnection) {
                  that.connected = true;
                  that.serialQueue.push("{sr:{line:t,posx:t,posy:t,posz:t,unit:t,coor:t,dist:t,xfr:t,yfr:t,zfr:t,stat:t}}");
                  that.serialQueue.push("{qv:2}");
                  that.serialQueue.push("{x:n}");
                  that.serialQueue.push("{y:n}");
                  that.serialQueue.push("{z:n}");
                  that.sendNextLine();
                  channel.trigger('connection.success');
                }
            }
        }
    }

    Machine.prototype.execute = function(cmd)
    {
      var l = cmd.trim() + "\n";
      chrome.serial.send(this.ctrlConnection.connectionId, str2ab(l), function(e) {
        if (chrome.runtime.lastError) {
            console.info(chrome.runtime.lastError)
        } else {
          //debugger;
        }
      });
    }

    Machine.prototype.processResponse = function(r)
    {
      //var res =  ab2str(r.data).trim().split("\n");
      var str =  ab2str(r.data);
      var lb = str.indexOf('\n');
      // if there is a line break, try to interpret the response as json

      if (lb !== -1) {
        that.responseBuffer += str.substring(0, lb);
        var strr =  str.substring(lb);
        //console.info(that.responseBuffer);
        try {
            var _r = JSON.parse(that.responseBuffer);
        } catch (err) {
            // not valid json
            console.info(that.responseBuffer);
            //console.info(err);
            channel.trigger("machine.response", {}, that.responseBuffer);
            that.responseBuffer = strr;
            return;
        }
        channel.trigger('machine.response', _r, that.responseBuffer);
        //console.info(that.responseBuffer);
        that.responseBuffer = strr;
      } else {
        that.responseBuffer += str;
      }
      that.sendNextLine();
    }

    Machine.prototype.zeroMachine = function(axis)
    {
        that.command('{"gc": "G28.3 _AXIS_0"}'.replace('_AXIS_', axis));
        that.command('{"sr":""}');
    },

    Machine.prototype.pauseAndFlush = function()
    {
      that.execute("!\n%\~");
    }

    Machine.prototype.updateFromReport = function(sr)
    {
        this.data.set(sr);
    }

    Machine.prototype.setUnits = function(unit)
    {
        if (unit == 'mm')
          that.command('{"gc": "G21"}');
        else
          that.command('{"gc": "G20"}');

        that.command('{"sr":""}')
    }

    window.ab2str = function(buf)
    {
        var bufView = new Uint8Array(buf);
        var encodedString = String.fromCharCode.apply(null, bufView);
        return decodeURIComponent(escape(encodedString));
    }

    window.str2ab = function(str)
    {
        var encodedString = unescape(encodeURIComponent(str));
        var bytes = new Uint8Array(encodedString.length);
        for (var i = 0; i < encodedString.length; ++i) {
            bytes[i] = encodedString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    exports.Machine = Machine;


})(window);
