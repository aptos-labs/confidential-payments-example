// types.ts
interface AppleAuthConfig {
  clientId: string;
  teamId: string;
  keyId: string;
  privateKey: string;
  redirectUri: string;
}

interface AppleAuthTokens {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
}

interface AppleUserInfo {
  user: string;
  email: string | null;
  name: {
    namePrefix: string | null;
    givenName: string | null;
    middleName: string | null;
    familyName: string | null;
    nameSuffix: string | null;
    nickname: string | null;
  };
  realUserStatus: number;
}

import jwt from 'jsonwebtoken'

export class AppleAuthService {
  private config: AppleAuthConfig;

  constructor(config: AppleAuthConfig) {
    this.config = config;
  }

  generateClientSecret(): string {
    return jwt.sign(
      {
        iss: this.config.teamId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        aud: 'https://appleid.apple.com',
        sub: this.config.clientId
      },
      this.config.privateKey.replace(/\\n/g, ''),
      {
        algorithm: 'ES256',
        header: {
          kid: this.config.keyId,
          typ: 'JWT'
        }
      }
    );
  }

  async getAuthorizationUrl(): Promise<string> {
    const scope = 'name email';
    const state = Math.random().toString(36).substring(2, 15);
    const nonce = Math.random().toString(36).substring(2, 15);

    const url = new URL('https://appleid.apple.com/oauth2/v2.0/authorize');
    url.searchParams.append('client_id', this.config.clientId);
    url.searchParams.append('redirect_uri', this.config.redirectUri);
    url.searchParams.append('response_type', 'code');
    url.searchParams.append('scope', scope);
    url.searchParams.append('state', state);
    url.searchParams.append('nonce', nonce);

    return url.toString();
  }
}


const config: AppleAuthConfig = {
  clientId: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID!,
  teamId: process.env.APPLE_TEAM_ID!,
  keyId: process.env.APPLE_KEY_ID!,
  privateKey: process.env.APPLE_PRIVATE_KEY!,
  redirectUri: 'https://ca-web-demo.vercel.app/sign-in'
};

const appleAuth = new AppleAuthService(config);

console.log('\n\n\n')

const clientSecret = appleAuth.generateClientSecret();
console.log('Client Secret:\n', clientSecret);

console.log('\n\n\n')

// Get authorization URL
const authUrl = await appleAuth.getAuthorizationUrl();
console.log('Authorization URL:\n', authUrl);
