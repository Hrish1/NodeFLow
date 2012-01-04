var Hook = require('hook.io').Hook;
var util = require('util');
var decode = require('./decoder.js')


var NodeFlowClient = exports.NodeFlowClient = function(options) {
        var self = this

        Hook.call(this, options);

        self.on('hook::ready', function() {
            util.log("NodeFlow Switch Emulator started")
            self._startClient()
        })

    }

util.inherits(NodeFlowClient, Hook)


NodeFlowClient.prototype._startClient = function() {
    var self = this
    l2table = {}


    self.on("nodeflow::server::OFPT_PACKET_IN", function(obj) {

        var packet = decode.decodeethernet(obj.message.body.data, 0)

        self._do_l2_learning(obj, packet)
        self._forward_l2_packet(obj, packet)

    })


    self.on("nodeflow::server::OFPT_FEATURES_REPLY", function(msg) {

    })

}

NodeFlowClient.prototype._do_l2_learning = function(obj, packet) {
    self = this

    var dl_src = packet.shost
    var dl_dst = packet.dhost
    var inport = obj.message.body.in_port

    if (dl_src == 'ff:ff:ff:ff:ff:ff') {
        return
    }
   
    if (!l2table.hasOwnProperty(obj.dpid)) {
        l2table[obj.dpid] = new Object() //create object
    }
    if (l2table[obj.dpid].hasOwnProperty(dl_src)) {
        var dst = l2table[obj.dpid][dl_src]
        if (dst != inport) {
            util.log("MAC has moved from " + dst + " to " + inport)
        } else {
            return
        }

    } else {
        util.log("learned mac " + dl_src + " port : " + inport)
    }

    l2table[obj.dpid][dl_src] = inport

    console.dir(l2table)

};

NodeFlowClient.prototype._forward_l2_packet = function(obj, packet) {

    var dl_dst = packet.dhost
    var inport = obj.message.body.in_port

    if (dl_dst != 'ff:ff:ff:ff:ff:ff' && l2table[obj.dpid].hasOwnProperty(dl_dst)) {
        var prt = l2table[obj.dpid][dl_dst]
        if (prt == inport) {
            util.log("*warning* learned port = " + inport + ",system=nodeFlow")
            obj.packet = self._setOutFloodPacket(obj)
            self.emit("nodeflow::client::sendPacket", {
                "data": obj
            })
        } else {
            util.log("Installing flow for destination " + dl_dst + "  system=NodeFlow,  port = " + prt)
            obj.packet = self._setFlowModPacket(obj, packet)
            self.emit("nodeflow::client::installFlow", {
                "data": obj
            })

        }

    } else {
        util.log("Flooding Unknown id:" + obj.message.body.buffer_id)
        obj.packet = self._setOutFloodPacket(obj)
        self.emit("nodeflow::client::sendPacket", {
            "data": obj
        })


    }


}


NodeFlowClient.prototype._setOutFloodPacket = function(obj) {
    return {
       
            header: {
                type: 'OFPT_PACKET_OUT',
                xid: obj.message.header.xid
            },
            body: {
                buffer_id: obj.message.body.buffer_id,
                in_port: obj.message.body.in_port,
                actions: [{
                    header: {
                        type: 'OFPAT_OUTPUT'
                    },
                    body: {
                        port: 'OFPP_FLOOD'
                    },
                }]
            },
            version: 0x01
    }
}


NodeFlowClient.prototype._extractFlow = function(packet) {
    debugger
    var flow = {}

    flow.dl_src = packet.shost
    flow.dl_dst = packet.dhost
    flow.dl_type = packet.ethertype

    if (packet.hasOwnProperty('vlan')) {
        // TODO
        flow.dl_vlan = packet.vlan
        flow.dl_vlan_pcp = packet.priority
    } else {
        flow.dl_vlan = 0xffff
        flow.dl_vlan_pcp = 0
    }

    if (packet.hasOwnProperty('ip')) {
        flow.nw_src = packet.ip.saddr
        flow.nw_dst = packet.ip.daddr
        flow.nw_proto = packet.ip.protocol

        if (packet.ip.hasOwnProperty('udp' || 'tcp')) {
            flow.tp_src = packet.ip.saddr
            flow.tp_dst = packet.ip.daddr
        } 
        else {
            if (packet.ip.hasOwnProperty('icmp')) {
                flow.tp_src = packet.ip.icmp.type
                flow.tp_dst = packet.ip.icmp.code
            } else {
                flow.tp_src = '0.0.0.0'
                flow.tp_dst = '0.0.0.0'
            }
        }
    } else {
        flow.nw_src = '0.0.0.0'
        flow.nw_dst = '0.0.0.0'
        flow.nw_proto = 0
        flow.tp_src = '0.0.0.0'
        flow.tp_dst = '0.0.0.0'


    }
    return flow
}


NodeFlowClient.prototype._setFlowModPacket = function(obj, packet) {


    var flow = self._extractFlow(packet)

    var out_port = l2table[obj.dpid][flow.dl_dst]

    return {
       
            version: 0x01,
            header: {
                type: 'OFPT_FLOW_MOD',
                xid: obj.message.header.xid
            },
            body: {
                command: 'OFPFC_ADD',
                hard_timeout: 0,
                idle_timeout: 200,
                priority: 0x8000,
                buffer_id: obj.message.body.buffer_id,
                out_port: 'OFPP_NONE',
                flags: ['OFPFF_SEND_FLOW_REM'],
                match: {
                    header: {
                        type: 'OFPMT_STANDARD'
                    },
                    body: {
                        'wildcards'     : 0,
                        "in_port"       : obj.message.body.in_port,
                        "dl_src"        : flow.dl_src,
                        'dl_dst'        : flow.dl_dst,
                        'dl_vlan'       : flow.dl_vlan,
                        'dl_vlan_pcp'   : flow.dl_vlan_pcp,
                        'dl_type'       : flow.dl_type,
                        'nw_proto'      : flow.nw_proto,
                        'nw_src'        : flow.nw_src,
                        'nw_dst'        : flow.nw_dst,
                        'tp_src'        : flow.tp_src,
                        'tp_dst'        : flow.tp_dst,
                    },
                },
                actions: {
                    header: {
                        type: 'OFPAT_OUTPUT'
                    },
                    body: {
                        port: out_port
                    }
                }

            }

        
    }
}