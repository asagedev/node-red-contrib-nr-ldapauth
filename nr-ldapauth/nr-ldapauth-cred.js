module.exports = function(RED) {
    function nrldapauthcred(n) {
        RED.nodes.createNode(this,n);
        this.host = n.host;
		this.port = n.port;
		this.ldaps = n.ldaps;
		this.certificatepath = n.certificatepath;
        this.bindusername = n.bindusername;
		this.bindpassword = n.bindpassword;
    }

	RED.nodes.registerType("node-red-contrib-nr-ldapauth-cred", nrldapauthcred,{
		credentials: {
			bindusername: {type:"text"},
			bindpassword: {type:"password"}
		}
	});
};