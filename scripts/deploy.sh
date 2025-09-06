#!/bin/bash

# GitHub Pages自動デプロイスクリプト
# 実行権限付与: chmod +x scripts/deploy.sh

COMMIT_MESSAGE=${1:-"update: ゲーム更新"}

echo "=== GitHub Pages自動デプロイスクリプト ==="

# 現在のディレクトリ確認
echo "実行ディレクトリ: $(pwd)"

# Gitリポジトリ確認
if [ ! -d ".git" ]; then
    echo "エラー: Gitリポジトリではありません"
    exit 1
fi

# 必要ファイル確認
required_files=("index.html" "README.md")
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "エラー: 必須ファイル $file が見つかりません"
        exit 1
    fi
done

echo "✅ 事前チェック完了"

# Git状態確認
echo -e "\n=== Git状態確認 ==="
git_status=$(git status --porcelain)
if [ -n "$git_status" ]; then
    echo "変更されたファイルが検出されました"
    git status --porcelain
else
    echo "変更されたファイルはありません"
    echo "デプロイの必要がないため終了します"
    exit 0
fi

# ファイル追加
echo -e "\n=== ファイル追加 ==="
git add .
echo "✅ すべてのファイルを追加しました"

# コミット作成
echo -e "\n=== コミット作成 ==="
full_commit_message="$COMMIT_MESSAGE

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

git commit -m "$full_commit_message"
if [ $? -ne 0 ]; then
    echo "エラー: コミット作成に失敗しました"
    exit 1
fi
echo "✅ コミット作成完了"

# プッシュ実行
echo -e "\n=== GitHub プッシュ ==="
git push
if [ $? -ne 0 ]; then
    echo "エラー: プッシュに失敗しました"
    exit 1
fi
echo "✅ プッシュ完了"

# GitHub Actions確認
echo -e "\n=== GitHub Actions確認 ==="
repo_url=$(git config --get remote.origin.url)
if [[ $repo_url =~ github\.com[:/]([^/]+)/([^/]+?)(\.git)?$ ]]; then
    owner="${BASH_REMATCH[1]}"
    repo="${BASH_REMATCH[2]}"
    actions_url="https://github.com/$owner/$repo/actions"
    echo "GitHub Actions URL: $actions_url"
    
    # GitHub Pagesデプロイ状況確認
    echo -e "\nGitHub Pagesデプロイ状況を確認中..."
    api_url="https://api.github.com/repos/$owner/$repo/pages"
    pages_response=$(curl -s "$api_url" 2>/dev/null)
    if [ $? -eq 0 ] && [ -n "$pages_response" ]; then
        pages_url=$(echo "$pages_response" | grep -o '"html_url":"[^"]*' | cut -d'"' -f4)
        if [ -n "$pages_url" ]; then
            echo "GitHub Pages URL: $pages_url"
        else
            echo "注意: GitHub Pages URL の取得に失敗しました"
        fi
    else
        echo "注意: GitHub Pages情報の取得に失敗しました"
        echo "GitHub Pages URLは手動で確認してください"
    fi
else
    echo "警告: GitHubリポジトリURLの解析に失敗しました"
fi

echo -e "\n=== デプロイ完了 ==="
echo "数分後にGitHub Pagesでの更新が反映されます"
echo "GitHub Actionsのログで詳細な進行状況を確認できます"