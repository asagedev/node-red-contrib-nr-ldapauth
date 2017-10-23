module.exports = function(RED) {
    "use strict";
	const LdapAuth = require('ldapauth-fork');
	const util = require('util');
	const fs = require('fs');

    function nrldapauth(n) {
		function ldapconnect(config){
			var ldapconnection = new LdapAuth({
				url: config.ldap.url,
				bindDN: config.ldap.adminDn,
				bindCredentials: config.ldap.adminPassword,
				searchBase: config.ldap.searchBase,
				searchFilter: config.ldap.searchFilter,
				timeout: config.ldap.timeout,
				tlsOptions: config.ldap.tlsOptions,
				idleTimeout: config.ldap.idleTimeout
			});
			
			return ldapconnection;
		}
		function ldapconntimeout(){
			/*Time out after 30 seconds and disconnect to avoid connection reset errors*/
			var timeout = setTimeout(function(){
				node.ldapconnected = false;
				
				node.ldap.close();
			}, 30000);
			
			return timeout;
		}
		
		RED.nodes.createNode(this,n);
		this.server = RED.nodes.getNode(n.server);
		
		if (this.server) {
            var server = this.server.host;
			var port = this.server.port;
			var protocol;
			var certificatepath = this.server.certificatepath;
			var bindusername = this.server.credentials.bindusername;
			var bindpassword = this.server.credentials.bindpassword;
			if (this.server.ldaps){
				protocol = "ldaps://";
			}
			else{
				protocol = "ldap://";
			}
        }
		
		var node = this;
		var searchbase = n.searchbase;
		var filter = n.filter;
		const config = {
			ldap: {
				url: protocol + server + ":" + port,
				adminDn: bindusername,
				adminPassword: bindpassword,
				searchBase: searchbase,
				searchFilter: filter,
				timeout: 2000, /*Doesn't seem to do anything*/
				idleTimeout: 30000, /*Doesn't seem to do anything*/
				tlsOptions: {ca: [ fs.readFileSync(certificatepath) ]},
				reconnect: false /*Doesn't seem to do anything*/
			}
		};
		
		node.ldapconnected = false;

		this.on('input', function (msg) {
			node.status({fill:"blue",shape:"dot",text:" "});
			
			if (typeof( ((msg || {}).payload || {}).u ) !== 'undefined' && typeof( ((msg || {}).payload || {}).p ) !== 'undefined'){
				var username = msg.payload.u;
				var password = msg.payload.p;
				var ip;
				
				if( typeof( ((msg || {}).req || {}).ip ) === 'undefined') {
					node.warn("msg.req.ip is not defined, changing to \"localhost\"");
					node.status({fill:"yellow",shape:"dot",text:"msg.req.ip is not defined, changing to \"localhost\""});
					ip = "localhost";
				}
				else{
					if(msg.req.ip == "127.0.0.1" && typeof( (((msg || {}).req || {}).headers || {})["x-real-ip"] ) !== 'undefined'){ //support for NGINX proxy
						ip = msg.req.headers["x-real-ip"];
					}
					else{
						ip = msg.req.ip;
					}
				}
				
				/*If we're not connected connect again*/
				if (!node.ldapconnected){
					node.ldap = ldapconnect(config);
					node.ldaptimeout = ldapconntimeout();
					node.ldapconnected = true;
					
					/*Set up error trap for connection resets - shouldn't occur with timeout of 30 seconds*/
					node.ldap.on('error', function(err) {
						var errstr = util.format("LDAP error %s", err);
						node.ldapconnected = false;
						
						node.warn(errstr);
						
						clearTimeout(node.ldaptimeout);
						if (err != "Error: read ECONNRESET"){/*Get's lots of "Error: This socket is closed" mesages in the log if a RST is recieved when using TLS - might want to disable closing completely*/
							node.ldap.close();
						}
					});
				}
				else{
					clearTimeout(node.ldaptimeout);
					node.ldaptimeout = ldapconntimeout();
				}

				node.ldap.authenticate(username, password, function(err, user) {
					if (err) {
						msg.auth = false;
						var errstr = util.format("IP: " + ip + " User: " + username + " LDAP auth error: %s", err);
						
						node.status({fill:"red",shape:"dot",text:"Authentication failed"});
						node.warn(errstr);
						node.send(msg);
					}
					else{
						msg.auth = true;
						
						if (ip != "localhost"){
							node.status({});
						}
						node.send(msg);
					}
				});
			}
			else{
				var username;
				var password;
				var errstr;
				if (typeof( ((msg || {}).payload || {}).u ) === 'undefined'){
					username = 'undefined'
				}
				else{
					username = msg.payload.u
				}
				if (typeof( ((msg || {}).payload || {}).p ) === 'undefined'){
					password = 'undefined'
				}
				else{
					password = msg.payload.p
				}
				errstr = "Username or Password not passed in on msg.payload.u/msg.payload.p Username: " + username + " Password: " + password;
				node.error(errstr, msg);
				node.status({fill:"red",shape:"dot",text:"msg.payload.u and/or msg.payload.p undefined"});
				msg.auth = false;
			}
		});
		this.on('close',function() {
			if (node.ldapconnected === true){
				clearTimeout(node.ldaptimeout);
				node.ldap.close();
			}
			node.ldapconnected = false;
			
            node.status({});
        });
	};
	RED.nodes.registerType("node-red-contrib-nr-ldapauth",nrldapauth);
};