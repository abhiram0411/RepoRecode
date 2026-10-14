// Deterministic, VM-local scheduler. No browser timers or host callbacks.
const queue = [];
export const unstable_ImmediatePriority = 1;
export const unstable_UserBlockingPriority = 2;
export const unstable_NormalPriority = 3;
export const unstable_LowPriority = 4;
export const unstable_IdlePriority = 5;
export const unstable_now = () => 0;
export const unstable_shouldYield = () => false;
export const unstable_requestPaint = () => {};
export const unstable_setDisableYieldValue = () => {};
export function unstable_scheduleCallback(priority, callback) {
  const task = { callback };
  queue.push(task);
  return task;
}
export function unstable_cancelCallback(task) {
  task.callback = null;
}
export function drain() {
  let count = 0;
  while (queue.length) {
    if (++count > 100) throw Error("Preview scheduled too much work.");
    const task = queue.shift();
    if (task.callback) {
      const next = task.callback(true);
      if (typeof next === "function") queue.push({ callback: next });
    }
  }
}
