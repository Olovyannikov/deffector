/** Fake backend with random latency, so out-of-order responses happen naturally. */
const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

export interface SignupParams {
  email: string;
  password: string;
  name: string;
}
export interface User {
  id: string;
  email: string;
  name: string;
}

export async function signupRequest(params: SignupParams): Promise<User> {
  await wait(300 + Math.random() * 500);
  if (params.email.includes('taken')) throw new Error('Email is already taken');
  const id = `u_${Math.random().toString(36).slice(2, 8)}`;
  return { id, email: params.email, name: params.name };
}

const DOMAINS = ['gmail.com', 'yandex.ru', 'mail.ru', 'proton.me', 'outlook.com'];

export async function suggestRequest(email: string): Promise<string[]> {
  // the shorter the query, the slower: a stale response can land last
  await wait(Math.max(80, 700 - email.length * 90));
  const [user, host = ''] = email.split('@');
  if (!user) return [];
  return DOMAINS.filter((domain) => domain.startsWith(host)).map((domain) => `${user}@${domain}`);
}
