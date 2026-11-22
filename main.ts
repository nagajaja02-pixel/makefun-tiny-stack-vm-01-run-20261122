const fs = require('node:fs');
const path = require('node:path');

// [immediate bytes, values required, net stack growth]
const rules = new Map();
function rule(ops, bytes, need, growth) {
  for (const op of ops) rules.set(op, [bytes, need, growth]);
}
rule([0, 0x34], 0, 0, 0);
rule([1], 1, 0, 1);
rule([2], 4, 0, 1);
rule([3, 0x50, 0x51, 0x53], 0, 1, -1);
rule([4], 0, 1, 1);
rule([5], 0, 2, 0);
rule([6], 0, 2, 1);
rule([7], 0, 3, 0);
rule([0x10,0x11,0x12,0x13,0x14,0x15,0x16,0x18,0x19,0x1a,
  0x1c,0x1d,0x1e,0x20,0x21,0x22], 0, 2, -1);
rule([0x17,0x1b,0x40], 0, 1, 0);
rule([0x30,0x33], 2, 0, 0);
rule([0x31,0x32], 2, 1, -1);
rule([0x41], 0, 2, -2);
rule([0x52], 0, 0, 1);

function run(program, input) {
  const stack = [], calls = [], memory = new Int32Array(256);
  const output = Buffer.alloc(65536);
  let pc = 0, steps = 0, cursor = 0, used = 0;
  const finish = code => [output.subarray(0, used), code];
  while (true) {
    if (steps === 1000000) return finish(10);
    if (pc < 0 || pc >= program.length) return finish(9);
    const op = program[pc], spec = rules.get(op);
    if (!spec) return finish(5);
    const [bytes, need, growth] = spec;
    if (pc + bytes >= program.length) return finish(9);
    if (stack.length < need) return finish(2);
    if (stack.length + growth > 256) return finish(3);
    steps++;
    const immediate = pc + 1;
    pc += 1 + bytes;
    const n = stack.length, a = stack[n - 2], b = stack[n - 1];
    let value;
    switch (op) {
      case 0: return finish(0);
      case 1: stack.push(program.readInt8(immediate)); break;
      case 2: stack.push(program.readInt32LE(immediate)); break;
      case 3: stack.pop(); break;
      case 4: stack.push(b); break;
      case 5: stack[n - 2] = b; stack[n - 1] = a; break;
      case 6: stack.push(a); break;
      case 7:
        value = stack[n - 3]; stack[n - 3] = a;
        stack[n - 2] = b; stack[n - 1] = value; break;
      case 0x17: stack[n - 1] = -b | 0; break;
      case 0x1b: stack[n - 1] = ~b; break;
      case 0x30: pc += program.readInt16LE(immediate); break;
      case 0x31: case 0x32:
        stack.pop();
        if ((b === 0) === (op === 0x31)) pc += program.readInt16LE(immediate);
        break;
      case 0x33:
        if (calls.length === 64) return finish(7);
        calls.push(pc); pc = program.readUInt16LE(immediate); break;
      case 0x34:
        if (!calls.length) return finish(8);
        pc = calls.pop(); break;
      case 0x40: case 0x41:
        if (b < 0 || b > 255) return finish(6);
        if (op === 0x40) stack[n - 1] = memory[b];
        else { memory[b] = a; stack.length -= 2; }
        break;
      case 0x50: case 0x51: {
        const text = op === 0x50 ? String(b) : '';
        const length = op === 0x50 ? text.length : 1;
        if (used + length > output.length) return finish(11);
        if (op === 0x50) output.write(text, used, length, 'ascii');
        else output[used] = b & 255;
        used += length; stack.pop(); break;
      }
      case 0x52: stack.push(cursor < input.length ? input[cursor++] : -1); break;
      case 0x53: return finish(b & 255);
      default:
        if (op >= 0x13 && op <= 0x16 && b === 0) return finish(4);
        switch (op) {
          case 0x10: value = a + b; break;
          case 0x11: value = a - b; break;
          case 0x12: value = Math.imul(a, b); break;
          case 0x13: value = a / b; break;
          case 0x14: value = a % b; break;
          case 0x15: value = (a >>> 0) / (b >>> 0); break;
          case 0x16: value = (a >>> 0) % (b >>> 0); break;
          case 0x18: value = a & b; break;
          case 0x19: value = a | b; break;
          case 0x1a: value = a ^ b; break;
          case 0x1c: value = a << b; break;
          case 0x1d: value = a >> b; break;
          case 0x1e: value = a >>> b; break;
          case 0x20: value = +(a === b); break;
          case 0x21: value = +(a < b); break;
          case 0x22: value = +((a >>> 0) < (b >>> 0)); break;
        }
        stack.pop(); stack[n - 2] = value | 0;
    }
  }
}
const env = process.env;
const source = env.MAKEFUN_INPUT_DIR || env.INPUT_DIR || '/input';
const target = env.MAKEFUN_OUTPUT_DIR || env.OUTPUT_DIR || '/output';
fs.mkdirSync(target, { recursive: true });
for (const entry of fs.readdirSync(source, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name))) {
  if (!entry.isDirectory()) continue;
  const from = path.join(source, entry.name), to = path.join(target, entry.name);
  const [stdout, code] = run(fs.readFileSync(path.join(from, 'program.bin')),
    fs.readFileSync(path.join(from, 'input.bin')));
  fs.mkdirSync(to, { recursive: true });
  fs.writeFileSync(path.join(to, 'stdout.bin'), stdout);
  fs.writeFileSync(path.join(to, 'exit.txt'), String(code) + '\n');
}
