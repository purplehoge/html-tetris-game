# GitHub Pages自動デプロイスクリプト
# PowerShell実行ポリシーが必要: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

param(
    [string]$CommitMessage = "update: ゲーム更新"
)

Write-Host "=== GitHub Pages自動デプロイスクリプト ===" -ForegroundColor Green

# 現在のディレクトリ確認
$currentDir = Get-Location
Write-Host "実行ディレクトリ: $currentDir" -ForegroundColor Yellow

# Gitリポジトリ確認
if (-not (Test-Path ".git")) {
    Write-Host "エラー: Gitリポジトリではありません" -ForegroundColor Red
    exit 1
}

# 必要ファイル確認
$requiredFiles = @("index.html", "README.md")
foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        Write-Host "エラー: 必須ファイル $file が見つかりません" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ 事前チェック完了" -ForegroundColor Green

# Git状態確認
Write-Host "`n=== Git状態確認 ===" -ForegroundColor Cyan
git status --porcelain
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "変更されたファイルが検出されました" -ForegroundColor Yellow
} else {
    Write-Host "変更されたファイルはありません" -ForegroundColor Green
    Write-Host "デプロイの必要がないため終了します" -ForegroundColor Yellow
    exit 0
}

# ファイル追加
Write-Host "`n=== ファイル追加 ===" -ForegroundColor Cyan
git add .
Write-Host "✅ すべてのファイルを追加しました" -ForegroundColor Green

# コミット作成
Write-Host "`n=== コミット作成 ===" -ForegroundColor Cyan
$fullCommitMessage = @"
$CommitMessage

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
"@

git commit -m $fullCommitMessage
if ($LASTEXITCODE -ne 0) {
    Write-Host "エラー: コミット作成に失敗しました" -ForegroundColor Red
    exit 1
}
Write-Host "✅ コミット作成完了" -ForegroundColor Green

# プッシュ実行
Write-Host "`n=== GitHub プッシュ ===" -ForegroundColor Cyan
git push
if ($LASTEXITCODE -ne 0) {
    Write-Host "エラー: プッシュに失敗しました" -ForegroundColor Red
    exit 1
}
Write-Host "✅ プッシュ完了" -ForegroundColor Green

# GitHub Actions確認
Write-Host "`n=== GitHub Actions確認 ===" -ForegroundColor Cyan
$repoUrl = git config --get remote.origin.url
if ($repoUrl -match "github.com[:/]([^/]+)/([^/]+?)(?:\.git)?$") {
    $owner = $matches[1]
    $repo = $matches[2]
    $actionsUrl = "https://github.com/$owner/$repo/actions"
    Write-Host "GitHub Actions URL: $actionsUrl" -ForegroundColor Yellow
    
    # GitHub Pagesデプロイ状況確認
    Write-Host "`nGitHub Pagesデプロイ状況を確認中..." -ForegroundColor Yellow
    try {
        $apiUrl = "https://api.github.com/repos/$owner/$repo/pages"
        $response = Invoke-RestMethod -Uri $apiUrl -ErrorAction Stop
        $pagesUrl = $response.html_url
        Write-Host "GitHub Pages URL: $pagesUrl" -ForegroundColor Green
    } catch {
        Write-Host "注意: GitHub Pages情報の取得に失敗しました" -ForegroundColor Yellow
        Write-Host "GitHub Pages URLは手動で確認してください" -ForegroundColor Yellow
    }
} else {
    Write-Host "警告: GitHubリポジトリURLの解析に失敗しました" -ForegroundColor Yellow
}

Write-Host "`n=== デプロイ完了 ===" -ForegroundColor Green
Write-Host "数分後にGitHub Pagesでの更新が反映されます" -ForegroundColor Yellow
Write-Host "GitHub Actionsのログで詳細な進行状況を確認できます" -ForegroundColor Yellow