import { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";

// ─── CONSTANTS ─────────────────────────────────────────────────────────────
const ALGORITHMS = [
  { id: "bubble",   label: "Bubble Sort",   category: "sort",  icon: "🫧" },
  { id: "merge",    label: "Merge Sort",    category: "sort",  icon: "🔀" },
  { id: "quick",    label: "Quick Sort",    category: "sort",  icon: "⚡" },
  { id: "bfs",      label: "BFS",           category: "graph", icon: "🌊" },
  { id: "dfs",      label: "DFS",           category: "graph", icon: "🌿" },
  { id: "dijkstra", label: "Dijkstra",      category: "graph", icon: "🗺️" },
];

const DESCRIPTIONS = {
  bubble:   { title: "Bubble Sort", complexity: "O(n²)", space: "O(1)", desc: "Repeatedly swaps adjacent elements if they are in the wrong order. Simple but inefficient for large datasets." },
  merge:    { title: "Merge Sort",  complexity: "O(n log n)", space: "O(n)", desc: "Divides the array in half, recursively sorts each half, then merges them back together." },
  quick:    { title: "Quick Sort",  complexity: "O(n log n) avg", space: "O(log n)", desc: "Picks a pivot, partitions elements around it, then recursively sorts sub-arrays." },
  bfs:      { title: "Breadth-First Search", complexity: "O(V + E)", space: "O(V)", desc: "Explores all neighbors at the current depth before moving to next level. Uses a queue." },
  dfs:      { title: "Depth-First Search",   complexity: "O(V + E)", space: "O(V)", desc: "Explores as far as possible along each branch before backtracking. Uses a stack." },
  dijkstra: { title: "Dijkstra's Algorithm", complexity: "O(V² or E log V)", space: "O(V)", desc: "Finds the shortest path from a source to all other vertices in a weighted graph." },
};

// ─── GRAPH DATA ─────────────────────────────────────────────────────────────
const GRAPH_NODES = [
  { id: 0, x: 180, y: 80,  label: "A" },
  { id: 1, x: 340, y: 50,  label: "B" },
  { id: 2, x: 480, y: 130, label: "C" },
  { id: 3, x: 100, y: 220, label: "D" },
  { id: 4, x: 280, y: 200, label: "E" },
  { id: 5, x: 440, y: 260, label: "F" },
  { id: 6, x: 200, y: 330, label: "G" },
  { id: 7, x: 380, y: 350, label: "H" },
];
const GRAPH_EDGES = [
  { from: 0, to: 1, w: 4 }, { from: 0, to: 3, w: 2 },
  { from: 1, to: 2, w: 5 }, { from: 1, to: 4, w: 3 },
  { from: 2, to: 5, w: 2 }, { from: 3, to: 4, w: 6 },
  { from: 3, to: 6, w: 3 }, { from: 4, to: 5, w: 1 },
  { from: 4, to: 7, w: 4 }, { from: 5, to: 7, w: 2 },
  { from: 6, to: 7, w: 5 },
];

// ─── SORTING GENERATORS ─────────────────────────────────────────────────────
function* bubbleSortGen(arr) {
  const a = [...arr];
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < a.length - i - 1; j++) {
      yield { array: [...a], comparing: [j, j + 1], sorted: Array.from({ length: i }, (_, k) => a.length - 1 - k) };
      if (a[j] > a[j + 1]) { [a[j], a[j + 1]] = [a[j + 1], a[j]]; }
    }
  }
  yield { array: [...a], comparing: [], sorted: a.map((_, i) => i) };
}

function* mergeSortGen(arr) {
  const a = [...arr];
  const steps = [];
  function mergeSort(arr, start) {
    if (arr.length <= 1) return arr;
    const mid = Math.floor(arr.length / 2);
    const left = mergeSort(arr.slice(0, mid), start);
    const right = mergeSort(arr.slice(mid), start + mid);
    const merged = [];
    let i = 0, j = 0;
    while (i < left.length && j < right.length) {
      steps.push({ comparing: [start + i, start + mid + j] });
      if (left[i] <= right[j]) merged.push(left[i++]);
      else merged.push(right[j++]);
    }
    while (i < left.length) merged.push(left[i++]);
    while (j < right.length) merged.push(right[j++]);
    for (let k = 0; k < merged.length; k++) a[start + k] = merged[k];
    steps.push({ array: [...a], comparing: [] });
    return merged;
  }
  mergeSort([...arr], 0);
  for (const s of steps) yield { array: s.array || [...a], comparing: s.comparing || [], sorted: [] };
  yield { array: [...a], comparing: [], sorted: a.map((_, i) => i) };
}

function* quickSortGen(arr) {
  const a = [...arr];
  const steps = [];
  function qs(lo, hi) {
    if (lo >= hi) return;
    const pivot = a[hi];
    let p = lo;
    for (let k = lo; k < hi; k++) {
      steps.push({ array: [...a], comparing: [k, hi], pivot: hi });
      if (a[k] < pivot) { [a[k], a[p]] = [a[p], a[k]]; p++; }
    }
    [a[p], a[hi]] = [a[hi], a[p]];
    steps.push({ array: [...a], comparing: [], pivot: p });
    qs(lo, p - 1);
    qs(p + 1, hi);
  }
  qs(0, a.length - 1);
  for (const s of steps) yield s;
  yield { array: [...a], comparing: [], sorted: a.map((_, i) => i) };
}

// ─── GRAPH GENERATORS ───────────────────────────────────────────────────────
function buildAdj() {
  const adj = Array.from({ length: 8 }, () => []);
  for (const e of GRAPH_EDGES) { adj[e.from].push({ to: e.to, w: e.w }); adj[e.to].push({ to: e.from, w: e.w }); }
  return adj;
}

function* bfsGen(start = 0) {
  const adj = buildAdj();
  const visited = new Set([start]);
  const queue = [start];
  const visitedArr = [start];
  yield { visited: [...visitedArr], current: start, queue: [...queue] };
  while (queue.length) {
    const u = queue.shift();
    for (const { to } of adj[u]) {
      if (!visited.has(to)) {
        visited.add(to); queue.push(to); visitedArr.push(to);
        yield { visited: [...visitedArr], current: to, queue: [...queue] };
      }
    }
  }
  yield { visited: [...visitedArr], current: -1, queue: [], done: true };
}

function* dfsGen(start = 0) {
  const adj = buildAdj();
  const visited = new Set();
  const stack = [];
  function* dfsStep(u) {
    visited.add(u); stack.push(u);
    yield { visited: [...visited], current: u, stack: [...stack] };
    for (const { to } of adj[u]) {
      if (!visited.has(to)) yield* dfsStep(to);
    }
    stack.pop();
  }
  yield* dfsStep(start);
  yield { visited: [...visited], current: -1, stack: [], done: true };
}

function* dijkstraGen(start = 0) {
  const adj = buildAdj();
  const dist = Array(8).fill(Infinity); dist[start] = 0;
  const prev = Array(8).fill(-1);
  const unvisited = new Set(Array.from({ length: 8 }, (_, i) => i));
  while (unvisited.size) {
    let u = -1;
    for (const v of unvisited) if (u === -1 || dist[v] < dist[u]) u = v;
    if (dist[u] === Infinity) break;
    unvisited.delete(u);
    yield { dist: [...dist], current: u, prev: [...prev], visited: Array.from({ length: 8 }, (_, i) => !unvisited.has(i)) };
    for (const { to, w } of adj[u]) {
      if (dist[u] + w < dist[to]) { dist[to] = dist[u] + w; prev[to] = u; }
    }
  }
  yield { dist: [...dist], current: -1, prev: [...prev], visited: Array(8).fill(true), done: true };
}

// ─── HELPERS ────────────────────────────────────────────────────────────────
function randomArray(n = 20) {
  return Array.from({ length: n }, () => Math.floor(Math.random() * 90) + 10);
}

function getPath(prev, to) {
  const path = [];
  let cur = to;
  while (cur !== -1) { path.unshift(cur); cur = prev[cur]; }
  return path;
}

// ─── COMPONENTS ─────────────────────────────────────────────────────────────

function SortViz({ algoId }) {
  const [array, setArray] = useState(() => randomArray());
  const [state, setState] = useState({ array: randomArray(), comparing: [], sorted: [], pivot: null });
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(80);
  const genRef = useRef(null);
  const timerRef = useRef(null);

  const reset = useCallback(() => {
    clearInterval(timerRef.current);
    setRunning(false);
    const a = randomArray();
    setArray(a);
    setState({ array: a, comparing: [], sorted: [], pivot: null });
    genRef.current = null;
  }, []);

  useEffect(() => { reset(); }, [algoId]);

  const step = useCallback(() => {
    if (!genRef.current) {
      const gens = { bubble: bubbleSortGen, merge: mergeSortGen, quick: quickSortGen };
      genRef.current = gens[algoId](array);
    }
    const { value, done } = genRef.current.next();
    if (done || !value) { clearInterval(timerRef.current); setRunning(false); return; }
    setState(value);
    if (value.sorted?.length === array.length) { clearInterval(timerRef.current); setRunning(false); }
  }, [algoId, array]);

  const play = () => {
    if (running) { clearInterval(timerRef.current); setRunning(false); return; }
    setRunning(true);
    timerRef.current = setInterval(step, 400 - speed * 3.5);
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  const { array: arr, comparing, sorted, pivot } = state;
  const maxVal = Math.max(...arr);

  return (
    <div className="viz-area">
      <div className="bar-chart">
        {arr.map((v, i) => {
          let cls = "bar";
          if (sorted?.includes(i)) cls += " bar-sorted";
          else if (comparing?.includes(i)) cls += " bar-compare";
          else if (pivot === i) cls += " bar-pivot";
          return (
            <div key={i} className={cls} style={{ height: `${(v / maxVal) * 100}%` }}>
              <span className="bar-val">{arr.length <= 15 ? v : ""}</span>
            </div>
          );
        })}
      </div>
      <div className="controls">
        <button className="btn" onClick={reset}>↺ Reset</button>
        <button className="btn btn-primary" onClick={play}>{running ? "⏸ Pause" : "▶ Play"}</button>
        <button className="btn" onClick={step} disabled={running}>Step →</button>
        <label className="speed-label">
          Speed
          <input type="range" min="1" max="100" value={speed} onChange={e => setSpeed(+e.target.value)} />
        </label>
      </div>
    </div>
  );
}

function GraphViz({ algoId }) {
  const [state, setState] = useState({ visited: [], current: -1, queue: [], stack: [], dist: Array(8).fill(Infinity), prev: Array(8).fill(-1), done: false });
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(60);
  const [startNode, setStartNode] = useState(0);
  const genRef = useRef(null);
  const timerRef = useRef(null);

  const reset = useCallback(() => {
    clearInterval(timerRef.current);
    setRunning(false);
    const init = Array(8).fill(Infinity);
    init[startNode] = algoId === "dijkstra" ? 0 : Infinity;
    setState({ visited: [], current: -1, queue: [], stack: [], dist: init, prev: Array(8).fill(-1), done: false });
    genRef.current = null;
  }, [algoId, startNode]);

  useEffect(() => { reset(); }, [algoId, startNode]);

  const step = useCallback(() => {
    if (!genRef.current) {
      const gens = { bfs: bfsGen, dfs: dfsGen, dijkstra: dijkstraGen };
      genRef.current = gens[algoId](startNode);
    }
    const { value, done } = genRef.current.next();
    if (done || !value) { clearInterval(timerRef.current); setRunning(false); return; }
    setState(s => ({ ...s, ...value }));
    if (value.done) { clearInterval(timerRef.current); setRunning(false); }
  }, [algoId, startNode]);

  const play = () => {
    if (running) { clearInterval(timerRef.current); setRunning(false); return; }
    setRunning(true);
    timerRef.current = setInterval(step, 800 - speed * 7);
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  const { visited, current, dist, prev, done } = state;
  const shortestPath = algoId === "dijkstra" && done ? getPath(prev, 7) : [];

  const edgeColor = (e) => {
    if (algoId === "dijkstra" && shortestPath.length > 1) {
      for (let i = 0; i < shortestPath.length - 1; i++) {
        if ((shortestPath[i] === e.from && shortestPath[i + 1] === e.to) ||
            (shortestPath[i] === e.to   && shortestPath[i + 1] === e.from)) return "edge-path";
      }
    }
    return "edge";
  };

  const nodeClass = (id) => {
    if (id === current) return "gnode gnode-current";
    if (done && shortestPath.includes(id)) return "gnode gnode-path";
    if (visited.includes(id)) return "gnode gnode-visited";
    return "gnode";
  };

  return (
    <div className="viz-area">
      <svg className="graph-svg" viewBox="0 0 580 420">
        {GRAPH_EDGES.map((e, i) => {
          const a = GRAPH_NODES[e.from], b = GRAPH_NODES[e.to];
          const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
          return (
            <g key={i}>
              <line className={edgeColor(e)} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
              {algoId === "dijkstra" && (
                <text className="edge-weight" x={mx} y={my - 6}>{e.w}</text>
              )}
            </g>
          );
        })}
        {GRAPH_NODES.map(n => (
          <g key={n.id} className={nodeClass(n.id)} onClick={() => { if (!running) setStartNode(n.id); }}>
            <circle cx={n.x} cy={n.y} r={22} />
            <text className="node-label" x={n.x} y={n.y + 1}>{n.label}</text>
            {algoId === "dijkstra" && dist[n.id] !== Infinity && (
              <text className="node-dist" x={n.x} y={n.y + 36}>{dist[n.id]}</text>
            )}
          </g>
        ))}
      </svg>
      <div className="controls">
        <button className="btn" onClick={reset}>↺ Reset</button>
        <button className="btn btn-primary" onClick={play}>{running ? "⏸ Pause" : "▶ Play"}</button>
        <button className="btn" onClick={step} disabled={running}>Step →</button>
        <label className="speed-label">
          Speed
          <input type="range" min="1" max="100" value={speed} onChange={e => setSpeed(+e.target.value)} />
        </label>
      </div>
      <p className="graph-hint">Click any node to change start node</p>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function App() {
  const [selected, setSelected] = useState("bubble");
  const info = DESCRIPTIONS[selected];
  const algo = ALGORITHMS.find(a => a.id === selected);
  const isSort = algo.category === "sort";

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">⬡</span>
            <span className="logo-text">DSA<span className="logo-accent">viz</span></span>
          </div>
          <p className="header-sub">Interactive Algorithm Visualizer</p>
        </div>
      </header>

      <main className="main">
        <nav className="algo-nav">
          <div className="nav-group">
            <span className="nav-label">Sorting</span>
            <div className="nav-pills">
              {ALGORITHMS.filter(a => a.category === "sort").map(a => (
                <button key={a.id} className={`pill ${selected === a.id ? "pill-active" : ""}`} onClick={() => setSelected(a.id)}>
                  <span>{a.icon}</span> {a.label}
                </button>
              ))}
            </div>
          </div>
          <div className="nav-divider" />
          <div className="nav-group">
            <span className="nav-label">Graph</span>
            <div className="nav-pills">
              {ALGORITHMS.filter(a => a.category === "graph").map(a => (
                <button key={a.id} className={`pill ${selected === a.id ? "pill-active" : ""}`} onClick={() => setSelected(a.id)}>
                  <span>{a.icon}</span> {a.label}
                </button>
              ))}
            </div>
          </div>
        </nav>

        <div className="content">
          <div className="viz-card">
            <div className="viz-header">
              <h2>{algo.icon} {info.title}</h2>
              <div className="badges">
                <span className="badge badge-time">⏱ {info.complexity}</span>
                <span className="badge badge-space">💾 {info.space}</span>
              </div>
            </div>
            <p className="algo-desc">{info.desc}</p>
            {isSort
              ? <SortViz key={selected} algoId={selected} />
              : <GraphViz key={selected} algoId={selected} />
            }
          </div>

          <div className="legend-card">
            <h3>Legend</h3>
            {isSort ? (
              <div className="legend-items">
                <div className="legend-item"><div className="legend-dot dot-default" /><span>Unsorted</span></div>
                <div className="legend-item"><div className="legend-dot dot-compare" /><span>Comparing</span></div>
                <div className="legend-item"><div className="legend-dot dot-pivot" /><span>Pivot</span></div>
                <div className="legend-item"><div className="legend-dot dot-sorted" /><span>Sorted</span></div>
              </div>
            ) : (
              <div className="legend-items">
                <div className="legend-item"><div className="legend-dot gnode-legend" style={{ background: "var(--clr-node)" }} /><span>Unvisited</span></div>
                <div className="legend-item"><div className="legend-dot gnode-legend" style={{ background: "var(--clr-visited)" }} /><span>Visited</span></div>
                <div className="legend-item"><div className="legend-dot gnode-legend" style={{ background: "var(--clr-current)" }} /><span>Current</span></div>
                {selected === "dijkstra" && <div className="legend-item"><div className="legend-dot gnode-legend" style={{ background: "var(--clr-path)" }} /><span>Shortest path</span></div>}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="footer">
        <span>Built by Mahalaxmi(using React)· Visualizing algorithms beautifully</span>
      </footer>
    </div>
  );
}
