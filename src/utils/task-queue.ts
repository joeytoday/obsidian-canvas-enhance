export default class TaskQueue {
  private running = false
  private queue: ([
    () => void,
    () => Promise<void> | void
  ])[] = []
  private onFinished: () => void = () => {}

  async add(task: () => Promise<void> | void) {
    return new Promise<void>(resolve => {
      this.queue.push([resolve, task])
      if (!this.running) void this.run()
    })
  }

  setOnFinished(callback: () => void) {
    this.onFinished = callback
  }

  private async run() {
    this.running = true

    while (this.queue.length > 0) {
      const [resolver, task] = this.queue.shift() ?? [undefined, undefined]

      try {
        await task?.()
      } catch (e) {
        console.error('TaskQueue: task failed', e)
      }
      resolver?.()
    }

    this.running = false
    this.onFinished()
  }
}
