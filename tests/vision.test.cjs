const test=require('node:test');
const assert=require('node:assert/strict');
const {generateKeyPairSync,createVerify}=require('node:crypto');
const {detectText}=require('../lib/vision.ts');
test('Vision REST signs scoped service-account OAuth, sends only image, and rejects provider errors',async()=>{
 const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
 const original=global.fetch, oldEmail=process.env.GOOGLE_CLIENT_EMAIL, oldKey=process.env.GOOGLE_PRIVATE_KEY;
 process.env.GOOGLE_CLIENT_EMAIL='test@example.invalid';process.env.GOOGLE_PRIVATE_KEY=privateKey.export({type:'pkcs8',format:'pem'});
 try {
  let calls=0;
  global.fetch=async(url,options)=>{
   calls++;
   if(calls===1){assert.equal(url,'https://oauth2.googleapis.com/token');const jwt=options.body.get('assertion');const [header,claims,signature]=jwt.split('.');const payload=JSON.parse(Buffer.from(claims,'base64url'));
    assert.equal(payload.iss,'test@example.invalid');assert.equal(payload.scope,'https://www.googleapis.com/auth/cloud-vision');assert.equal(payload.exp-payload.iat,3600);
    const verifier=createVerify('RSA-SHA256');verifier.update(header+'.'+claims);verifier.end();assert.ok(verifier.verify(publicKey,signature,'base64url'));
    return Response.json({access_token:'test-token'});
   }
   assert.equal(url,'https://vision.googleapis.com/v1/images:annotate');assert.equal(options.headers.Authorization,'Bearer test-token');
   assert.deepEqual(JSON.parse(options.body),{requests:[{image:{content:Buffer.from('synthetic').toString('base64')},features:[{type:'TEXT_DETECTION'}]}]});
   return Response.json({responses:[{textAnnotations:[{description:'架空'}]}]});
  };
  assert.deepEqual(await detectText(Buffer.from('synthetic')),{textAnnotations:[{description:'架空'}]});assert.equal(calls,2);
  global.fetch=async()=>Response.json({error:'private provider detail'},{status:401});await assert.rejects(()=>detectText(Buffer.from('synthetic')),/OCR authentication unavailable/);
 }finally{global.fetch=original;if(oldEmail===undefined)delete process.env.GOOGLE_CLIENT_EMAIL;else process.env.GOOGLE_CLIENT_EMAIL=oldEmail;if(oldKey===undefined)delete process.env.GOOGLE_PRIVATE_KEY;else process.env.GOOGLE_PRIVATE_KEY=oldKey;}
});
