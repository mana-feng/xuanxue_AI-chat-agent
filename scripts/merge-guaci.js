const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadContextFromFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const context = {};
  vm.createContext(context);
  try {
    // run file code in sandbox; files define const arrays like GUA_64, assistData, divineNameData
    vm.runInContext(code, context, { filename: filePath });
  } catch (err) {
    // ignore runtime errors that are unrelated to the const arrays (but log)
    // console.warn(`warning running ${filePath}:`, err.message);
  }
  return context;
}

function buildNameToGongMap(divineNameData) {
  const map = {};
  if (!Array.isArray(divineNameData)) return map;
  divineNameData.forEach((gong) => {
    const gongName = gong.gongName || gong.gongname || null;
    const values = gong.gongValue || gong.gongValue || [];
    values.forEach((item) => {
      if (item && item.name) {
        map[item.name] = gongName;
      }
    });
  });
  return map;
}

function mergeData(gua64, assistData, divineNameData) {
  const guaMap = {};
  if (Array.isArray(gua64)) {
    gua64.forEach((g) => {
      const key = g.name || g.zhuguaName || '';
      if (key) guaMap[key] = g;
    });
  }

  const assistMap = {};
  if (Array.isArray(assistData)) {
    assistData.forEach((a) => {
      const key = a.zhuguaName || a.name || '';
      if (key) assistMap[key] = a;
    });
  }

  const gongMap = buildNameToGongMap(divineNameData);

  const allNames = new Set([...Object.keys(guaMap), ...Object.keys(assistMap)]);
  const merged = [];
  allNames.forEach((name) => {
    const gua = guaMap[name] || {};
    const assist = assistMap[name] || {};
    const obj = {
      name: name,
      describe: gua.describe || assist.describe || '',
      code: gua.code || [],
      guaCi: gua.guaCi || [],
      guaci: assist.guaci || '',
      guaciDetailed: assist.guaciDetailed || [],
      yaoci: assist.yaoci || [],
      gongName: gongMap[name] || null,
    };
    merged.push(obj);
  });
  // sort by name to keep deterministic order
  merged.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return merged;
}

function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const guaciDir = path.join(repoRoot, 'guaci');
  const frontendJsonPath = path.join(repoRoot, 'frontend', 'src', 'features', 'liuyao', 'data', 'guaci.json');

  const filesToLoad = ['guaci.js', 'guaname.js', 'jieshi.js', 'yaoci.js', 'guaciMore.js']
    .map((f) => path.join(guaciDir, f))
    .filter((p) => fs.existsSync(p));

  const aggregateContext = {};
  filesToLoad.forEach((filePath) => {
    const ctx = loadContextFromFile(filePath);
    // copy known variables into aggregateContext if present
    ['GUA_64', 'divineNameData', 'assistData', 'yaociData', 'guaMore'].forEach((v) => {
      if (Object.prototype.hasOwnProperty.call(ctx, v)) {
        aggregateContext[v] = ctx[v];
      }
    });
  });

  const gua64 = aggregateContext.GUA_64 || aggregateContext.gua64 || null;
  const divineNameData = aggregateContext.divineNameData || aggregateContext.divineNamedata || null;
  const assistData = aggregateContext.assistData || aggregateContext.assistdata || null;

  if (!gua64 && !assistData) {
    console.error('没有在 guaci 目录中找到可用的数据 (期待 GUA_64 或 assistData)。');
    process.exit(2);
  }

  const merged = mergeData(gua64 || [], assistData || [], divineNameData || []);

  fs.mkdirSync(path.dirname(frontendJsonPath), { recursive: true });
  fs.writeFileSync(frontendJsonPath, JSON.stringify(merged, null, 2), 'utf8');
  console.log(`写入 ${frontendJsonPath}，包含 ${merged.length} 条合并记录。`);
}

if (require.main === module) {
  main();
}


