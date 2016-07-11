# apigateway4
SDK for AWS API Gateway request signing.



# About

apigateway4 is a simple SDK for AWS API Gateway request signing with the [Signature Version4 Signing Process](http://docs.aws.amazon.com/general/latest/gr/signature-version-4.html). 





# features

- support default API Gateway domain as well as the **[custom domain name](http://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-custom-domains.html)**
- support popular npm modules like [request](https://www.npmjs.com/package/request) and [request-promise](https://www.npmjs.com/package/request-promise)



## usage

```
var rp    = require('request-promise')
var agw4  = require('apigateway4')

var requestOpts = {
	uri: 'https://<apigateway_id>.execute-api.us-west-2.amazonaws.com/v1/auth?name=myname&foo=bar'
}

var signer = new agw4.BuildRequestSigner(requestOpts,credentials)

signer.sign()

rp(requestOpts)
 .then( (html)=> console.log(html))
 .catch( (e) => console.log(e))
```

see ***[example.js](https://github.com/pahud/apigateway4/blob/master/example.js)*** for more details