// Example OpenFlow Controller written for Node.js
// Prototype to investiage eventing system handling of OF messages
// Author : Gary Berger, Cisco Systems, inc.
var net = require('net');
var sys = require('sys');
var util = require('util');
var Binary = require('binary');
var io = require('socket.io');
var EventEmitter = require('events').EventEmitter;

var ofmessage = require('./ofmessage.js');
var ofm = new ofmessage()

 function Server(address, port) {
    //Globals
    this.port = port || "6633"
    this.address = address || "10.8.3.119"
    // this.io = socket
}

Server.prototype.startServer = function startServer(io) {
    // console.log(OF_MESSAGE.type)
    var server = net.createServer(function(socket) {
        socket.on('connect',
        function(client) {
            util.log("Received Connect")
            io.emit('message', 'Connected');
            ofm.hello(socket)
            // setTimeout(function() {
            //             socket.write("close")
            //         },
            //         20000)
        })
        socket.on('data',
        function(data) {
            // save buffer
            var OF_MESSAGE_HEADER = Binary.parse(data)
            .word8('Version')
            .word8('type')
            .word16bu('length')
            // .tap(function(vars){
            // 			util.log("in-tap")
            // 		   console.dir(vars)
            // 			})
            .word32bu('xid')
            .vars
            ;


            // var buffer = new Buffer(data.length)
            console.dir(OF_MESSAGE_HEADER)


            // util.log("Data-LENGTH-after= " + data.length)
            // data.copy(OF_MESSAGE.version, 0, 0, 1);
            //      data.copy(OF_MESSAGE.type, 0, 1, 2)
            //
            var OF_TYPE = OF_MESSAGE_HEADER.type

            switch (OF_TYPE) {
            case 0x00:
                util.log("HELLO");
                io.emit('message', 'HELLO');
                ofm.hello(socket)
                ofm.feature_request(socket)
                break;
            case 0x01:
                // util.log("ERROR", OF_MESSAGE.toString('binary', 0, OF_MESSAGE.length));
                util.log("ERROR")
                break;
            case 0x02:
                util.log("ECHO_REQUEST");
                io.emit('message', 'ECHO_REQUEST');
                ofm.echo(socket)
                ofm.feature_request(socket)
                break;
            case 0x03:
                util.log("ECHO_REPLY");
                io.emit('message', 'ECHO_REPLY');
                break;
            case 0x04:
                util.log("VENDOR");
                break;
            case 0x05:
                util.log("FEATURES_REQUEST");
                io.emit('message', 'FEATURES_REQUEST');
                break;
            case 0x06:
                util.log("FEATURES_REPLY");
                io.emit('message', 'FEATURES_REPLY');
                break;
            case 0x07:
                util.log("7");
                break;
            case 0x08:
                util.log("8");
                break;
            case 0x09:
                util.log("9");
                break;
            case 0xA:
                util.log("PACKET_IN");
				//'!LHHBx')  4221
                var OF_MESSAGE_PACKET_IN = Binary.parse(data)
                var OF_MESSAGE_PACKET_IN = Binary.parse(data)
                .skip(8)
                .word32bu('bufferid')
                .word16bu('totalLength')
                .word16bu('inport')
				.word8('reason')
                .buffer('packet', OF_MESSAGE_HEADER.length - OF_MESSAGE_PACKET_IN.totalLength)
                .vars;

                // console.dir(util.inspect(OF_MESSAGE_PACKET_IN, true, null))
                var x = OF_MESSAGE_PACKET_IN.packet 
				debugger
                console.dir(x)
                io.emit('message', 'PACKET_IN' + " " + util.inspect(OF_MESSAGE_PACKET_IN, true, null))

                // var packbuf = new Buffer(OF_MESSAGE_PACKET_IN.buffer.length)
                //             console.log(packbuf)
                //           flow_mod(socket)
                break;
            default:
                console.log(OF_TYPE)
                debugger
                util.log("UNKNOWN OPCODE: ", OF_TYPE)
                break;
            }
        })
        //socket.on
    })
    //socket.on
    //
    console.log(this.address)
    // self.address = this.address
    server.listen(this.port)
    // function() {
    //         	 	console.log(address)
    //         	    console.log("opened server on %j", this.address);
    //
    //
    //             });
    //
    server.addListener("close",
    function(data) {
        sys.puts("Disconnected");
    });

}

module.exports = Server




//  ENUMS
// 	   HELLO               0
//     ERROR               1
//     ECHO_REQUEST        2
//     ECHO_REPLY          3
//     VENDOR              4
//     FEATURES_REQUEST    5
//     FEATURES_REPLY      6
//     GET_CONFIG_REQUEST  7
//     GET_CONFIG_REPLY    8
//     SET_CONFIG          9
//     PACKET_IN           10
//     FLOW_REMOVED        11
//     PORT_STATUS         12
//     PACKET_OUT          13
//     FLOW_MOD            14
//     PORT_MOD            15
//     STATS_REQUEST       16
//     STATS_REPLY         17
//     BARRIER_REQUEST     18
//     BARRIER_REPLY       19
//