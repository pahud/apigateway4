var AWS   = require('aws-sdk');
var rp    = require('request-promise')
var agw4 = require('apigateway4')

var chain = new AWS.CredentialProviderChain();
var credentials

AWS.CredentialProviderChain.defaultProviders = [
  function () { return new AWS.EnvironmentCredentials('AWS'); },
  function () { return new AWS.EnvironmentCredentials('AMAZON'); },
  function () { return new AWS.SharedIniFileCredentials({profile: 'my_profile_name'}); },
  function () { return new AWS.EC2MetadataCredentials(); }
]

chain.resolve((err, cred)=>{
	AWS.config.credentials = credentials = cred;
});

AWS.config.update({region: 'us-west-2' });


var requestOpts = {
	uri: 'https://<apigateway_id>.execute-api.us-west-2.amazonaws.com/v1/auth?name=myname&foo=bar'
}

var signer = new agw4.BuildRequestSigner(requestOpts,credentials)

signer.sign()

rp(requestOpts)
 .then( (html)=> console.log(html))
 .catch( (e) => console.log(e))


