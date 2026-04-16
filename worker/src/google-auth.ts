const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";

interface JwkKey {
  kid: string;
  kty: string;
  alg: string;
  n: string;
  e: string;
  use: string;
}

interface JwtHeader {
  alg: string;
  kid: string;
  typ: string;
}

interface IdTokenPayload {
  iss: string;
  aud: string;
  exp: number;
  email: string;
  name?: string;
}

function base64urlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function decodeJwtPart<T>(part: string): T {
  const decoded = new TextDecoder().decode(base64urlDecode(part));
  return JSON.parse(decoded) as T;
}

async function fetchGooglePublicKeys(): Promise<JwkKey[]> {
  const res = await fetch(GOOGLE_JWKS_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch Google JWKS: ${res.status}`);
  }
  const data: { keys: JwkKey[] } = await res.json();
  return data.keys;
}

export async function verifyGoogleIdToken(
  idToken: string,
  clientId: string,
): Promise<{ email: string; name?: string }> {
  const parts = idToken.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT format");
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  const header = decodeJwtPart<JwtHeader>(headerB64);
  const payload = decodeJwtPart<IdTokenPayload>(payloadB64);

  // Validate claims before verifying signature (fast fail)
  if (payload.iss !== "https://accounts.google.com" && payload.iss !== "accounts.google.com") {
    throw new Error("Invalid token issuer");
  }
  if (payload.aud !== clientId) {
    throw new Error("Invalid token audience");
  }
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired");
  }
  if (!payload.email) {
    throw new Error("Token missing email claim");
  }

  // Fetch Google's public keys and find the matching one
  const keys = await fetchGooglePublicKeys();
  const key = keys.find((k) => k.kid === header.kid);
  if (!key) {
    throw new Error("No matching key found for kid: " + header.kid);
  }

  // Import public key and verify signature
  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    { kty: key.kty, n: key.n, e: key.e, alg: key.alg, ext: true },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const signatureBytes = base64urlDecode(signatureB64);
  const dataBytes = new TextEncoder().encode(`${headerB64}.${payloadB64}`);

  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", cryptoKey, signatureBytes, dataBytes);
  if (!valid) {
    throw new Error("Invalid token signature");
  }

  return { email: payload.email, name: payload.name };
}
