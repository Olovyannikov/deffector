import { BugsToCatch } from './BugsToCatch';
import { CounterCard } from './CounterCard';
import { SignupForm } from './SignupForm';

export function App() {
  return (
    <main>
      <h1>
        deffector demo <small>Solid</small>
      </h1>
      <div class="grid">
        <SignupForm />
        <div>
          <CounterCard />
          <BugsToCatch />
        </div>
      </div>
    </main>
  );
}
