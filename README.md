This node was made to authenticate POST web requests in Node-RED.  Pass `msg.payload.u` as the username and `msg.payload.p` as the password to authenticate against an LDAP server.  It will return `msg.auth` as `true` (successful) or `false` (failure) and log failed attempts to the Node-RED log with requester's IP address.  This node can be used for any authentication request but if `msg.req.ip` is not defined it will be replaced with `localhost`.

## For an Active Directory setup

Server: Any domain controller.  Use FQDN if using LDAPS.

Bind Username: `cn=username,ou=Organizational Unit,DC=Domain,DC=com`

Filter: `(SAMAccountName={{username}})`

Search Base: `OU=Organizational Unit,DC=Domain,DC=com`

## LDAPS Notes

If using LDAPS the certificate Subject Name cannot be blank.  By default the Windows CA certificate templates leave this blank.  Node.js does not allow the Subject Name to be blank and will give the error `Hostname/IP doesn't match certificate's altnames: "Cert is empty"`  To set the Subject Name open the certificates template Console, right click on the template, click Properties, open the Subject Name tab, and set the Subject name format to DNS name.  Also set Include this information in alternate subject name to DNS.  Next export the CA certificate. Run certsrv.msc, right click the domain, click Properties, on the general tab select the certificate and click View Certificate, click the Details tab, click Copy to File..., then save the .crt file to the Node-RED server.  Once it's on the server convert it to a .pem file using the command:

`openssl x509 -inform der -in cert.cer -out cert.pem`

Test certs with this command:

`openssl s_client -connect domain.controller:636 -ca cert.pem`