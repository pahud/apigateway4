var CryptoJS = require('crypto-js')
var url      = require('url')
var qs       = require('querystring')

var RequestSigner = function(requestOpts, credentials) {
    var AWS_SHA_256 = 'AWS4-HMAC-SHA256';
    var AWS4_REQUEST = 'aws4_request';
    var AWS4 = 'AWS4';
    var X_AMZ_DATE = 'X-Amz-Date';
    var X_AMZ_SECURITY_TOKEN = 'x-amz-security-token';
    var HOST = 'host';
    var AUTHORIZATION = 'Authorization';

    this.request = requestOpts
    if(!this.request.headers) this.request.headers = {}
    this.credentials = credentials
    this.service = 'execute-api'
    this.region = this.region ? this.region : 'us-west-2'
    
	this._request = {
		query: '',
		body: ''
	}
 
    this.hash = (value) => {
        return CryptoJS.SHA256(value);
    }

    this.hexEncode = (value) => {
        return value.toString(CryptoJS.enc.Hex);
    }

    this.hmac = (secret, value) => {
        return CryptoJS.HmacSHA256(value, secret, {asBytes: true});
    }

    this.buildCanonicalRequest = () => {
        return this.request.method + '\n' +
            this.buildCanonicalUri(this.request.path) + '\n' +
            this.buildCanonicalQueryString(this._request.query) + '\n' +
            this.buildCanonicalHeaders(this.request.headers) + '\n' +
            this.buildCanonicalSignedHeaders(this.request.headers) + '\n' +
            this.hexEncode(this.hash(this._request.body));
    }

    this.hashCanonicalRequest = (request) => {
        return this.hexEncode(this.hash(request));
    }

    this.buildCanonicalUri = (uri) => {
        return encodeURI(uri);
    }

    this.buildCanonicalQueryString = (queryParams) => {
        if (Object.keys(queryParams).length < 1) {
            return '';
        }

        var sortedQueryParams = [];
        for (var property in queryParams) {
            if (queryParams.hasOwnProperty(property)) {
                sortedQueryParams.push(property);
            }
        }
        sortedQueryParams.sort();

        var canonicalQueryString = '';
        for (var i = 0; i < sortedQueryParams.length; i++) {
            canonicalQueryString += sortedQueryParams[i] + '=' + encodeURIComponent(queryParams[sortedQueryParams[i]]) + '&';
        }
        return canonicalQueryString.substr(0, canonicalQueryString.length - 1);
    }

    this.buildCanonicalHeaders = (headers) => {
        var canonicalHeaders = '';
        var sortedKeys = [];
        for (var property in headers) {
            if (headers.hasOwnProperty(property)) {
                sortedKeys.push(property);
            }
        }
        sortedKeys.sort();

        for (var i = 0; i < sortedKeys.length; i++) {
            canonicalHeaders += sortedKeys[i].toLowerCase() + ':' + headers[sortedKeys[i]] + '\n';
        }
        return canonicalHeaders;
    }

    this.buildCanonicalSignedHeaders = (headers) => {
        var sortedKeys = [];
        for (var property in headers) {
            if (headers.hasOwnProperty(property)) {
                sortedKeys.push(property.toLowerCase());
            }
        }
        sortedKeys.sort();

        return sortedKeys.join(';');
    }

    this.buildCredentialScope = (datetime, region, service) => {
        return datetime.substr(0, 8) + '/' + region + '/' + service + '/' + AWS4_REQUEST
    }


    this.buildStringToSign = (datetime, credentialScope, hashedCanonicalRequest) => {
        return AWS_SHA_256 + '\n' +
            datetime + '\n' +
            credentialScope + '\n' +
            hashedCanonicalRequest;
    }

    this.credentialString = () => {
		return [
			this.getDate(),
			this.region,
			this.service,
			'aws4_request',
			].join('/')
    }


    this.calculateSigningKey = (secretKey, datetime, region, service) => {
        return this.hmac(this.hmac(this.hmac(this.hmac(AWS4 + secretKey, datetime.substr(0, 8)), region), service), AWS4_REQUEST);
    }

    this.calculateSignature = (key, stringToSign) => {
        return this.hexEncode(this.hmac(key, stringToSign));
    }

    this.buildAuthorizationHeader = (accessKey, credentialScope, headers, signature) => {
        return AWS_SHA_256 + ' Credential=' + accessKey + '/' + credentialScope + ', SignedHeaders=' + this.buildCanonicalSignedHeaders(headers) + ', Signature=' + signature;
    }

    this.parseUrl = () => {
    	var urlParts = url.parse(this.request.uri)
    	return urlParts
	}

	this.createHost = () => {
		this.request.hostname = this.request.hostname || this.request.headers.Host || this.parseUrl().host
		this.request.headers.Host = this.request.hostname
	}


	this.buildHeaders = () => {
		if(!this.request.headers.Host)
			this.request.headers.Host = this.request.Host
	}

	this.buildPath = () => {
		if(!this.request.path)
			this.request.path = this.parseUrl().pathname
	}

	this.completeReqOpts = () => {
    	this.createHost()
    	this.buildHeaders()
    	this.buildPath()
    	if((!this.request.method) && this.request.body) 
    		this.request.method = 'POST'
    	this.request.method = this.request.method ? this.request.method:'GET'
    	this._request.body = this.request.body || ''
    	this._request.query = qs.parse(url.parse(this.request.uri).query)
    
        var datetime = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/[:\-]|\.\d{3}/g, '');
        this.request.headers[X_AMZ_DATE] = datetime;

	}

	this.getDateTime = () => {
		this.datetime = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '')
		return this.datetime
	}

	this.getDate = () => {
		return this.getDateTime().substr(0, 8)
	}

	this.signedHeaders = () => {
		return Object.keys(this.request.headers)
		.map(function(key) { return key.toLowerCase() })
		.sort()
		.join(';')
	}


    this.sign = () => {
		this.getDateTime()
		this.completeReqOpts()
		this.canonicalRequest               = this.buildCanonicalRequest();
		this.hashedCanonicalRequest         = this.hashCanonicalRequest(this.canonicalRequest);
		this.credentialScope                = this.buildCredentialScope(this.datetime, this.region, this.service);
		this.stringToSign                   = this.buildStringToSign(this.datetime, this.credentialScope, this.hashedCanonicalRequest);
		this.signingKey                     = this.calculateSigningKey(this.credentials.secretAccessKey, this.datetime, this.region, this.service);
		this.signature                      = this.calculateSignature(this.signingKey, this.stringToSign);
		this.request.headers[AUTHORIZATION] = this.buildAuthorizationHeader(this.credentials.accessKeyId, this.credentialScope, this.request.headers, this.signature);
		
    	return this.request
    }
}


exports.BuildRequestSigner = RequestSigner


