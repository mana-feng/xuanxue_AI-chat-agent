import json
import pickle
from pathlib import Path


def main():
  # 项目根目录下的路径
  pkl_file = Path('najia/data/guaci.pkl')
  out_file = Path('uni-app/data/guaci.json')

  if not pkl_file.exists():
    raise SystemExit(f'找不到文件: {pkl_file}')

  data = pickle.loads(pkl_file.read_bytes())

  # 确保输出目录存在
  out_file.parent.mkdir(parents=True, exist_ok=True)

  # 以 UTF-8 写入 JSON，保留中文
  out_file.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')

  print(f'导出完成: {out_file}')


if __name__ == '__main__':
  main()


