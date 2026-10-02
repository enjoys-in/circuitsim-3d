import { build, type Example, type PartSpec } from "./build";

// Wire a bus: pairs ["${a}:${pa}{i}", "${b}:${pb}{i}"] for i in 0..width-1.
function bus(a: string, pa: string, b: string, pb: string, width = 4): [string, string][] {
  return Array.from({ length: width }, (_, i): [string, string] => [`${a}:${pa}${i}`, `${b}:${pb}${i}`]);
}

function probes(idPrefix: string, x: number, y: number, width = 4): PartSpec[] {
  return Array.from({ length: width }, (_, i): PartSpec => [`${idPrefix}${i}`, "output", x, y + i * 56, {}]);
}

function probeWires(source: string, pin: string, idPrefix: string, width = 4): [string, string][] {
  return Array.from({ length: width }, (_, i): [string, string] => [`${source}:${pin}${i}`, `${idPrefix}${i}:in`]);
}

export const COMPUTING_EXAMPLES: Example[] = [
  {
    id: "reg4-store",
    title: "4-bit register",
    category: "Digital",
    description: "Flip EN and the switches, pulse the clock — the register latches a nibble and holds it",
    circuit: build(
      [
        ["D0", "input", 0, 0, { value: 1 }],
        ["D1", "input", 0, 60, { value: 0 }],
        ["D2", "input", 0, 120, { value: 1 }],
        ["D3", "input", 0, 180, { value: 1 }],
        ["EN", "input", 0, 260, { value: 1 }],
        ["CLK", "clock", 0, 340, { period: 4 }],
        ["REG", "register4", 240, 90],
        ...probes("Q", 470, 20),
      ],
      [
        ...Array.from({ length: 4 }, (_, i): [string, string] => [`D${i}:out`, `REG:d${i}`]),
        ["EN:out", "REG:en"],
        ["CLK:out", "REG:clk"],
        ...probeWires("REG", "q", "Q"),
      ],
    ),
    options: { ticks: 16 },
  },
  {
    id: "alu-accumulator",
    title: "ALU accumulator",
    category: "Digital",
    description: "The accumulator feeds ALU-A, switches feed B, and the sum latches back each clock",
    circuit: build(
      [
        ["B0", "input", 0, 0, { value: 1 }],
        ["B1", "input", 0, 60, { value: 0 }],
        ["B2", "input", 0, 120, { value: 0 }],
        ["B3", "input", 0, 180, { value: 0 }],
        ["ONE", "input", 0, 260, { value: 1 }],
        ["ZERO", "input", 0, 320, { value: 0 }],
        ["CLK", "clock", 0, 400, { period: 2 }],
        ["ALU", "alu4", 260, 60],
        ["ACC", "register4", 260, 300],
        ...probes("Q", 520, 40),
      ],
      [
        ...Array.from({ length: 4 }, (_, i): [string, string] => [`B${i}:out`, `ALU:b${i}`]),
        ...bus("ACC", "q", "ALU", "a"),
        ...bus("ALU", "y", "ACC", "d"),
        ["ONE:out", "ACC:en"],
        ["CLK:out", "ACC:clk"],
        ["ZERO:out", "ALU:op0"],
        ["ZERO:out", "ALU:op1"],
        ["ZERO:out", "ALU:op2"],
        ["ZERO:out", "ALU:cin"],
        ...probeWires("ACC", "q", "Q"),
      ],
    ),
    options: { ticks: 20 },
  },
  {
    id: "pc-rom",
    title: "Program counter + ROM",
    category: "Digital",
    description: "A clock drives the PC through ROM addresses — watch each stored word get fetched",
    circuit: build(
      [
        ["CLK", "clock", 0, 60, { period: 2 }],
        ["ZERO", "input", 0, 160, { value: 0 }],
        ["PC", "counter4", 220, 20],
        ["ROM", "rom16", 220, 180, { data: [3, 5, 6, 9, 10, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }],
        ...probes("PC", 470, 0),
        ...probes("D", 620, 0),
      ],
      [
        ["CLK:out", "PC:clk"],
        ["ZERO:out", "PC:reset"],
        ...bus("PC", "q", "ROM", "a"),
        ...probeWires("PC", "q", "PC"),
        ...probeWires("ROM", "d", "D"),
      ],
    ),
    options: { ticks: 24 },
  },
  {
    id: "accumulator-cpu",
    title: "4-bit accumulator CPU",
    category: "Digital",
    description: "A running datapath: PC fetches operands from ROM, the ALU adds them into the accumulator",
    circuit: build(
      [
        ["CLK", "clock", 0, 120, { period: 2 }],
        ["ONE", "input", 0, 260, { value: 1 }],
        ["ZERO", "input", 0, 320, { value: 0 }],
        ["PC", "counter4", 230, 0],
        ["ROM", "rom16", 230, 180, { data: [1, 2, 3, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }],
        ["ALU", "alu4", 490, 60],
        ["ACC", "register4", 490, 300],
        ...probes("PC", 730, -20),
        ...probes("ACC", 880, -20),
      ],
      [
        ["CLK:out", "PC:clk"],
        ["CLK:out", "ACC:clk"],
        ["ZERO:out", "PC:reset"],
        ...bus("PC", "q", "ROM", "a"),
        ...bus("ROM", "d", "ALU", "b"),
        ...bus("ACC", "q", "ALU", "a"),
        ...bus("ALU", "y", "ACC", "d"),
        ["ONE:out", "ACC:en"],
        ["ZERO:out", "ALU:op0"],
        ["ZERO:out", "ALU:op1"],
        ["ZERO:out", "ALU:op2"],
        ["ZERO:out", "ALU:cin"],
        ...probeWires("PC", "q", "PC"),
        ...probeWires("ACC", "q", "ACC"),
      ],
    ),
    options: { ticks: 24 },
  },
  {
    id: "stored-program-cpu",
    title: "Stored-program CPU",
    category: "Digital",
    description:
      "A real fetch-execute machine: the PC steps through program ROM, the opcode ROM decodes each " +
      "instruction into an ALU operation (ADD/SUB/AND/OR/SHL) and the accumulator holds the running result. " +
      "Program: ADD 3, ADD 5, SUB 2, SHL, AND 9, OR 1 → 9.",
    circuit: build(
      [
        ["CLK", "clock", 0, 140, { period: 2 }],
        ["ZERO", "input", 0, 260, { value: 0 }],
        ["ONE", "input", 0, 320, { value: 1 }],
        ["PC", "counter4", 220, 0],
        // Harvard program store: opcodes and operands share the PC address.
        ["ROP", "rom16", 220, 180, { data: [0, 0, 1, 6, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }],
        ["RARG", "rom16", 220, 380, { data: [3, 5, 2, 0, 9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }],
        ["ALU", "alu4", 480, 120],
        ["ACC", "register4", 480, 380],
        ...probes("PC", 740, -20),
        ...probes("ACC", 880, -20),
      ],
      [
        ["CLK:out", "PC:clk"],
        ["CLK:out", "ACC:clk"],
        ["ZERO:out", "PC:reset"],
        ...bus("PC", "q", "ROP", "a"),
        ...bus("PC", "q", "RARG", "a"),
        // opcode (3 bits) decodes the ALU operation
        ["ROP:d0", "ALU:op0"],
        ["ROP:d1", "ALU:op1"],
        ["ROP:d2", "ALU:op2"],
        ...bus("RARG", "d", "ALU", "b"),
        ...bus("ACC", "q", "ALU", "a"),
        ...bus("ALU", "y", "ACC", "d"),
        ["ONE:out", "ACC:en"],
        ["ZERO:out", "ALU:cin"],
        ...probeWires("PC", "q", "PC"),
        ...probeWires("ACC", "q", "ACC"),
      ],
    ),
    options: { ticks: 28 },
  },
  {
    id: "computer-cpu",
    title: "Computer (CPU block)",
    category: "Digital",
    description:
      "A whole computer in one block. The CPU runs its stored program \u2014 edit it in the " +
      "Inspector (one byte per step: high nibble = opcode, low nibble = operand; ops 0 ADD, 1 SUB, " +
      "2 AND, 3 OR, 4 XOR, 5 LOAD, 6 SHL, 7 HALT). Default: LOAD 3, ADD 5, SUB 2, SHL, AND 9, OR 1, " +
      "HALT \u2192 9. Watch the accumulator (q) and program counter (pc).",
    circuit: build(
      [
        ["CLK", "clock", 0, 120, { period: 2 }],
        ["RST", "input", 0, 240, { value: 0 }],
        ["CPU", "cpu", 240, 20],
        ...probes("ACC", 540, 0),
        ...probes("PC", 690, 0),
      ],
      [
        ["CLK:out", "CPU:clk"],
        ["RST:out", "CPU:reset"],
        ...probeWires("CPU", "q", "ACC"),
        ...probeWires("CPU", "pc", "PC"),
      ],
    ),
    options: { ticks: 28 },
  },
];
