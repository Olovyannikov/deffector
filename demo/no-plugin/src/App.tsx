import { BugsToCatch } from './BugsToCatch';
import { CounterCard } from './CounterCard';
import { SignupForm } from './SignupForm';

export function App() {
  return (
    <main>
      <h1>
        deffector demo <small>React · without the effector babel/swc plugin</small>
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
