import type { Tx } from '@deffector/protocol';

/** The panel keeps the newest transactions only: older ones are dropped from the list and the index. */
const MAX_TRANSACTIONS = 5000;

/** Recorded transactions, oldest first, with a lookup by id. */
export class TransactionLog {
  list: Tx[] = [];

  private byId = new Map<number, Tx>();

  get(id: number): Tx | undefined {
    return this.byId.get(id);
  }

  /** Appends new transactions and replaces the ones the agent sent again (a settled effect, a note). */
  merge(incoming: readonly Tx[]) {
    for (const transaction of incoming) {
      if (this.byId.has(transaction.id)) {
        const index = this.list.findIndex((known) => known.id === transaction.id);
        if (index >= 0) this.list[index] = transaction;
      } else {
        this.list.push(transaction);
      }
      this.byId.set(transaction.id, transaction);
    }
    if (this.list.length > MAX_TRANSACTIONS) {
      const dropped = this.list.splice(0, this.list.length - MAX_TRANSACTIONS);
      for (const old of dropped) this.byId.delete(old.id);
    }
  }

  replace(transaction: Tx) {
    this.byId.set(transaction.id, transaction);
    this.list = this.list.map((known) => (known.id === transaction.id ? transaction : known));
  }

  clear() {
    this.list = [];
    this.byId.clear();
  }
}
