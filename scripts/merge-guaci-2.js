const fs = require('fs');
const path = require('path');

function extractArrayLiteral(fileContent, varName) {
  const idx = fileContent.indexOf(varName);
  if (idx === -1) return null;
  const after = fileContent.slice(idx);
  const bracketStart = after.indexOf('[');
  if (bracketStart === -1) return null;
  let i = bracketStart;
  let depth = 0;
  let inString = false;
  let stringChar = null;
  let prevChar = null;
  for (; i < after.length; i++) {
    const ch = after[i];
    if (!inString && (ch === '"' || ch === "'" || ch === '`')) {
      inString = true;
      stringChar = ch;
    } else if (inString && ch === stringChar && prevChar !== '\\') {
      inString = false;
      stringChar = null;
    } else if (!inString) {
      if (ch === '[') depth++;
      else if (ch === ']') {
        depth--;
        if (depth === 0) {
          // include closing bracket
          return after.slice(bracketStart, i + 1);
        }
      }
    }
    prevChar = ch;
  }
  return null;
}

function evalLiteral(literal) {
  if (!literal) return null;
  try {
    // evaluate safely in Function scope
    return Function('"use strict"; return (' + literal + ');')();
  } catch (err) {
    return null;
  }
}

function readVarFromFile(filePath, varName) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf8');
  const literal = extractArrayLiteral(content, varName);
  if (!literal) return null;
  return evalLiteral(literal);
}

function buildNameToGongMap(divineNameData) {
  const map = {};
  if (!Array.isArray(divineNameData)) return map;
  divineNameData.forEach((gong) => {
    const gongName = gong.gongName || gong.gongname || null;
    const values = gong.gongValue || [];
    values.forEach((item) => {
      if (item && item.name) map[item.name] = gongName;
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
  merged.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return merged;
}

function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const guaciDir = path.join(repoRoot, 'guaci');
  const files = {
    guaFile: path.join(guaciDir, 'guaci.js'),
    assistFile: path.join(guaciDir, 'jieshi.js'),
    divineFile: path.join(guaciDir, 'guaname.js'),
    yaociFile: path.join(guaciDir, 'yaoci.js'),
  };

  const gua64 = readVarFromFile(files.guaFile, 'GUA_64') || readVarFromFile(files.guaFile, 'GUA64');
  const assistData = readVarFromFile(files.assistFile, 'assistData') || readVarFromFile(files.assistFile, 'assistdata');
  const divineNameData = readVarFromFile(files.divineFile, 'divineNameData') || readVarFromFile(files.divineFile, 'divineNamedata');
  // yaoci.js may define assistData too; try that if missing
  const assistFromYao = readVarFromFile(files.yaociFile, 'assistData') || readVarFromFile(files.yaociFile, 'assistdata') || readVarFromFile(files.yaociFile, 'yaociData');
  const finalAssist = assistData || assistFromYao;

  if ((!gua64 || gua64.length === 0) && (!finalAssist || finalAssist.length === 0)) {
    console.error('无法在 guaci 文件夹中解析到 GUA_64 或 assistData。');
    process.exit(2);
  }

  const merged = mergeData(gua64 || [], finalAssist || [], divineNameData || []);
  const outPath = path.join(repoRoot, 'frontend', 'src', 'features', 'liuyao', 'data', 'guaci.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(merged, null, 2), 'utf8');
  console.log(`写入 ${outPath}（${merged.length} 条记录）`);
}

if (require.main === module) main();


