/** Runs only inside QuickJS. Type-tagged keys avoid lossy JSON comparisons. */
export const outputCodec = `
function __rrEncodeOutput(value) {
  const seen = new WeakSet();
  let budget = 250;
  function encode(v, depth) {
    if (--budget < 0 || depth > 10) throw Error('Unsupported output: value is too deeply nested or large.');
    if (v === null) return { value: null, key: ['null'] };
    const type = typeof v;
    if (type === 'undefined') return { value: undefined, key: ['undefined'] };
    if (type === 'string' || type === 'boolean') return { value: v, key: [type, v] };
    if (type === 'number') return { value: Number.isFinite(v) ? v : {nonfinite:String(v)}, key: ['number',String(v)] };
    if (type !== 'object') throw Error('Unsupported output: functions, symbols and bigints cannot be compared.');
    if (seen.has(v)) throw Error('Unsupported output: cyclic values cannot be compared.');
    const array = Array.isArray(v), proto = Object.getPrototypeOf(v);
    if (!array && proto !== Object.prototype && proto !== null) throw Error('Unsupported output: only plain objects and arrays are supported.');
    if (Object.getOwnPropertySymbols(v).length) throw Error('Unsupported output: symbol properties cannot be compared.');
    seen.add(v);
    const display = array ? [] : Object.create(null), entries = [];
    const keys = Object.keys(v).sort();
    if (array) {
      if (v.length > 250 || keys.some(k => !/^(0|[1-9][0-9]*)$/.test(k) || Number(k) >= v.length))
        throw Error('Unsupported output: array has extra properties or exceeds the limit.');
      for (let i=0; i<v.length; i++) {
        const d = Object.getOwnPropertyDescriptor(v, String(i));
        if (!d) { display.push(null); entries.push(['hole']); continue; }
        if (!('value' in d)) throw Error('Unsupported output: accessors cannot be compared.');
        const item = encode(d.value, depth+1); display.push(item.value); entries.push(item.key);
      }
    } else for (const k of keys) {
      const d = Object.getOwnPropertyDescriptor(v, k);
      if (!d || !('value' in d)) throw Error('Unsupported output: accessors cannot be compared.');
      const item = encode(d.value, depth+1); display[k] = item.value; entries.push([k,item.key]);
    }
    seen.delete(v);
    return { value: display, key: [array ? 'array' : 'object',entries] };
  }
  const out = encode(value,0);
  return JSON.stringify({ display: {value:out.value,type:typeof value}, key:out.key });
}
`;
