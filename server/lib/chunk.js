class ChunkProcessor {
  constructor(options = {}) {
    this.chunkSize = options.chunkSize || 8;
    this.concurrency = options.concurrency || 4;
    this.jobs = [];
    this.results = [];
    this.running = false;
    this.listeners = { progress: [], done: [], error: [] };
  }
  on(ev, fn) { if (this.listeners[ev]) this.listeners[ev].push(fn); return this; }
  emit(ev, data) { for (const fn of this.listeners[ev] || []) fn(data); }
  enqueue(items) { this.jobs.push(...items); return this; }
  async run(worker) {
    this.running = true;
    this.results = [];
    const queue = [...this.jobs];
    let done = 0;
    const total = queue.length;
    const runOne = async (job) => {
      try {
        const r = await worker(job);
        this.results.push({ ok: true, job, result: r });
      } catch (e) {
        this.results.push({ ok: false, job, error: e.message || String(e) });
        this.emit('error', { job, error: e.message });
      }
      done++;
      this.emit('progress', { done, total, pct: total ? Math.round((done / total) * 100) : 100 });
    };
    while (queue.length) {
      const chunk = queue.splice(0, this.chunkSize);
      for (let i = 0; i < chunk.length; i += this.concurrency) {
        await Promise.all(chunk.slice(i, i + this.concurrency).map(runOne));
      }
    }
    this.running = false;
    this.emit('done', { results: this.results });
    return this.results;
  }
  clear() { this.jobs = []; this.results = []; }
}
module.exports = { ChunkProcessor };
