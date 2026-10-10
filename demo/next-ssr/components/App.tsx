'use client';

import { BugsToCatch } from './BugsToCatch';
import { CounterCard } from './CounterCard';
import { SignupForm } from './SignupForm';

export function App() {
  return (
    <main>
      <h1>
        deffector demo <small>Next.js · App Router · @effector/next</small>
      </h1>
      <div className="grid">
        <SignupForm />
        <div>
          <CounterCard />
          <BugsToCatch />
        </div>
      </div>
    </main>
  );
}
