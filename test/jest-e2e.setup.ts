import { execSync } from 'child_process';

// Dockerコンテナが実行中かチェックする
function checkDockerContainers() {
  try {
    // docker psコマンドを実行
    const output = execSync('docker ps', { encoding: 'utf-8' });

    // 必要なコンテナが実行中かチェック
    const requiredContainers = [
      'caddy-dev',
      'agent-dev',
      'pg-web-dev',
      'prism-node-dev',
      'db-agent-dev',
      'node-db-dev',
      'redis-dev',
      'vault-dev',
    ];

    const missingContainers = requiredContainers.filter(
      (container) => !output.includes(container),
    );

    if (missingContainers.length > 0) {
      console.error('必要なDockerコンテナが実行されていません:');
      missingContainers.forEach((container) =>
        console.error(` - ${container}`),
      );
      process.exit(1);
    } else {
      console.log('全てのDockerコンテナが実行中です ✓');
    }
  } catch (error) {
    console.error(
      'Dockerコマンドの実行に失敗しました。Dockerが実行されているか確認してください。',
    );
    console.error(error);
    process.exit(1);
  }
}

// テスト実行前にDockerコンテナをチェック（オフライン時はスキップ）
if (process.env.E2E_OFFLINE !== '1') {
  checkDockerContainers();
}
