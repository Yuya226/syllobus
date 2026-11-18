import { createSign } from 'node:crypto';
export interface VisionAnnotation {
    description?: string | null;
    boundingPoly?: {vertices?: {x?:number|null;y?:number|null}[]|null}|null;
}
/** REST transport avoids protobuf dynamic code generation, prohibited by Workers. */
export async function detectText(image: Buffer): Promise<{textAnnotations?:VisionAnnotation[]}> {
    const email=process.env.GOOGLE_CLIENT_EMAIL;
    const key=(process.env.GOOGLE_PRIVATE_KEY??'').replace(/\\n/g,'\n').replace(/"/g,'');
    if(!email||!key)throw new Error('OCR credentials unavailable');
    const now=Math.floor(Date.now()/1000);
    const encode=(value:object)=>Buffer.from(JSON.stringify(value)).toString('base64url');
    const unsigned=encode({alg:'RS256',typ:'JWT'})+'.'+encode({iss:email,scope:'https://www.googleapis.com/auth/cloud-vision',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});
    const signer=createSign('RSA-SHA256');signer.update(unsigned);signer.end();
    const assertion=unsigned+'.'+signer.sign(key,'base64url');
    const auth=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}),signal:AbortSignal.timeout(15000)});
    if(!auth.ok)throw new Error('OCR authentication unavailable');
    const token=await auth.json() as {access_token?:string};
    if(!token.access_token)throw new Error('OCR authentication unavailable');
    const response=await fetch('https://vision.googleapis.com/v1/images:annotate',{method:'POST',headers:{Authorization:`Bearer ${token.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({requests:[{image:{content:image.toString('base64')},features:[{type:'TEXT_DETECTION'}]}]}),signal:AbortSignal.timeout(30000)});
    if(!response.ok)throw new Error('OCR service unavailable');
    const data=await response.json() as {responses?:{textAnnotations?:VisionAnnotation[];error?:unknown}[]};
    const result=data.responses?.[0];if(!result||result.error)throw new Error('OCR failed');
    return {textAnnotations:result.textAnnotations};
}
