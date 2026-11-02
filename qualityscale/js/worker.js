/* QualityScale worker: analyses a file (or builds a demo run) off the main thread. */
importScripts('core.js?v=1', 'engine.js?v=1', 'demo.js?v=1');
onmessage = async (e) => {
  const m = e.data;
  try {
    let res;
    if (m.demo) { res = QS.analyzeText(QS.makeDemo(m.demo), QS.demoName(m.demo), m.opts); res.name = QS.demoName(m.demo); }
    else res = await QS.analyzeFile(m.file, Object.assign({}, m.opts, { onProgress: (p, n) => postMessage({ t: 'p', p, n }) }));
    postMessage({ t: 'done', res });
  } catch (err) { postMessage({ t: 'err', msg: err.message }); }
};
